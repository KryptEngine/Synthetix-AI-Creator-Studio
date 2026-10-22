import express, { Request, Response } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { LLM_PROVIDERS, MEDIA_PROVIDERS, resolveApiKey, providerHasKey, setRuntimeKey, clearRuntimeKey, getProvider } from './server/providers';
import { callProvider } from './server/aiEngine';
import { generateScript, generateNarration } from './server/scriptService';
import { generateSceneImages, FALLBACK_ASSETS } from './server/imageService';
import { store, encryptSecret, decryptSecret } from './server/store';
import { buildSourceZip } from './server/sourceZip';
import {
  auth, requireAuth, requireRole, optionalAuth, currentUser,
  setSessionCookie, clearSessionCookie, readSessionToken
} from './server/auth';
import {
  securityHeaders, corsAllowlist, rateLimit, jsonErrorHandler, apiNotFound
} from './server/security';
import {
  razorpayConfig, razorpayConfigured, razorpayPayoutConfigured,
  createOrder, createPayout, verifyCheckoutSignature, verifyWebhookSignature
} from './server/razorpay';
import type { ApiKeyItem, LedgerEntry, PaymentOrder, PayoutRequest, Project, ScheduledPost, UserRole } from './src/types/index.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.disable('x-powered-by');
app.set('trust proxy', 1);

/** Strips credential material before a user record leaves the server. */
function publicUser(user: {
  id: string; email: string; name: string; handle: string; avatarUrl: string; role: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    role: user.role
  };
}

app.use(securityHeaders);
app.use(corsAllowlist);
app.use(
  express.json({
    limit: '2mb',
    // Payment webhooks must be verified against the exact bytes Razorpay sent.
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    }
  })
);


// Broad backstop so a runaway client cannot hammer the API.
app.use('/api', rateLimit({ windowMs: 60_000, max: 120, message: 'Too many requests. Slow down.' }));

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 8,
  message: 'Too many sign-in attempts. Wait a minute and try again.'
});

app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Email and password are required.' });
  }

  const user = auth.findByEmail(email);
  if (!user || !auth.verifyPassword(user, password)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
  }

  const token = auth.issueSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = readSessionToken(req);
  if (token) auth.destroySession(token);
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/session', optionalAuth, (req: Request, res: Response) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.post('/api/auth/register', loginLimiter, (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const name = String(req.body?.name || '').trim();

  if (!email || !name || password.length < 8) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Name, email and a password of at least 8 characters are required.'
    });
  }
  if (auth.findByEmail(email)) {
    return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'That email is already registered.' });
  }

  const user = auth.createUser({ email, name, role: 'USER' });
  auth.setPassword(user.id, password);
  const token = auth.issueSession(user.id);
  setSessionCookie(res, token);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/change-password', requireAuth, (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');

  if (!auth.verifyPassword(user, current)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' });
  }
  if (next.length < 8) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Password must be at least 8 characters.' });
  }
  auth.setPassword(user.id, next);
  res.json({ success: true });
});

// Directory of accounts, plus role assignment for super admins.
app.get('/api/users', requireAuth, requireRole('SUPER_ADMIN'), (_req: Request, res: Response) => {
  res.json({
    users: auth.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      handle: u.handle,
      role: u.role,
      createdAt: u.createdAt
    }))
  });
});

app.patch('/api/users/:id/role', requireAuth, requireRole('SUPER_ADMIN'), (req: Request, res: Response) => {
  const role = String(req.body?.role || '') as UserRole;
  const allowed: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: `role must be one of ${allowed.join(', ')}` });
  }
  const actor = currentUser(req)!;
  if (req.params.id === actor.id && role !== 'SUPER_ADMIN') {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'You cannot remove your own super admin role.' });
  }
  const updated = auth.setRole(String(req.params.id), role);
  if (!updated) return res.status(404).json({ error: 'UNKNOWN_USER', message: 'No such user.' });
  res.json({ user: publicUser(updated) });
});

// ---------------------------------------------------------------------------
// Core routes
// ---------------------------------------------------------------------------

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'Synthetix AI Creator Studio Core API',
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Single call the frontend uses to hydrate every screen. The client holds no
 * hardcoded business data anymore.
 */
app.get('/api/bootstrap', requireAuth, (req: Request, res: Response) => {
  const session = currentUser(req)!;
  res.json({
    projects: store.projects,
    apiKeys: store.apiKeys,
    ledger: store.ledger,
    marketplace: store.marketplace,
    schedule: store.schedule,
    walletBalance: store.walletBalance(),
    assets: FALLBACK_ASSETS,
    providers: LLM_PROVIDERS.map((p) => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      signupUrl: p.signupUrl,
      apiKeyEnv: p.apiKeyEnv,
      authStyle: p.authStyle,
      freeTier: p.freeTier,
      creditCardRequired: p.creditCardRequired,
      defaultModel: p.defaultModel,
      models: p.models,
      maxContextTokens: p.maxContextTokens,
      modalities: p.modalities,
      configured: providerHasKey(p)
    })),
    mediaProviders: MEDIA_PROVIDERS,
    user: { ...store.user, name: session.name, handle: session.handle, avatarUrl: session.avatarUrl }
  });
});

// ---------------------------------------------------------------------------
// Creator profile
// ---------------------------------------------------------------------------

app.get('/api/user', requireAuth, (req: Request, res: Response) => {
  const session = currentUser(req)!;
  res.json({ user: { ...store.user, name: session.name, handle: session.handle, avatarUrl: session.avatarUrl } });
});

app.get('/api/metrics', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  res.json(store.metrics());
});

app.put('/api/user', requireAuth, (req: Request, res: Response) => {
  const { name, handle, avatarUrl, upiId, bio, connectedAccounts } = req.body || {};

  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'name cannot be empty' });
  }
  if (connectedAccounts !== undefined && !Array.isArray(connectedAccounts)) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'connectedAccounts must be an array' });
  }

  const patch: Partial<typeof store.user> = {};
  if (name !== undefined) patch.name = String(name).trim();
  if (handle !== undefined) patch.handle = String(handle).trim();
  if (avatarUrl !== undefined) patch.avatarUrl = String(avatarUrl).trim();
  if (upiId !== undefined) patch.upiId = String(upiId).trim();
  if (bio !== undefined) patch.bio = String(bio).trim();
  if (connectedAccounts !== undefined) {
    patch.connectedAccounts = connectedAccounts.map((account: any) => ({
      platform: String(account?.platform ?? '').trim(),
      handle: String(account?.handle ?? '').trim(),
      followersCount: Math.max(0, Number(account?.followersCount) || 0),
      connectedAt: String(account?.connectedAt ?? new Date().toISOString().slice(0, 10))
    }));
  }

  const session = currentUser(req)!;
  const updated = store.updateUser(patch);

  // A profile edit also renames the signed-in account.
  if (patch.name || patch.handle || patch.avatarUrl) {
    auth.updateIdentity(session.id, {
      name: patch.name,
      handle: patch.handle,
      avatarUrl: patch.avatarUrl
    });
  }

  res.json({ user: { ...updated, name: session.name, handle: session.handle, avatarUrl: session.avatarUrl } });
});

// ---------------------------------------------------------------------------
// Provider management
// ---------------------------------------------------------------------------

app.get('/api/ai/providers', requireAuth, (req: Request, res: Response) => {
  res.json(
    LLM_PROVIDERS.map((p) => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      signupUrl: p.signupUrl,
      apiKeyEnv: p.apiKeyEnv,
      freeTier: p.freeTier,
      creditCardRequired: p.creditCardRequired,
      defaultModel: p.defaultModel,
      models: p.models,
      maxContextTokens: p.maxContextTokens,
      modalities: p.modalities,
      configured: providerHasKey(p)
    }))
  );
});

app.post('/api/ai/providers/:id/test', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  const provider = getProvider(req.params.id);
  if (!provider) return res.status(404).json({ error: 'UNKNOWN_PROVIDER' });

  const apiKey = resolveApiKey(provider);
  if (!apiKey && provider.authStyle !== 'none') {
    return res.status(400).json({
      error: 'MISSING_CREDENTIALS',
      message: `No API key configured for ${provider.name}. Set ${provider.apiKeyEnv} or register a key in the admin dashboard.`
    });
  }

  const started = Date.now();
  try {
    const text = await callProvider(
      provider,
      apiKey,
      [{ role: 'user', content: 'Reply with the single word: OK' }],
      { maxTokens: 16, temperature: 0 }
    );
    res.json({
      ok: true,
      provider: provider.name,
      model: provider.defaultModel,
      latencyMs: Date.now() - started,
      sample: text.slice(0, 120)
    });
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      provider: provider.name,
      latencyMs: Date.now() - started,
      error: err?.message || String(err)
    });
  }
});

app.post('/api/ai/generate/script', requireAuth, async (req: Request, res: Response) => {
  const { topic, language, durationSec, tone, preferredProviderId, withImages } = req.body || {};
  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'topic is required' });
  }

  try {
    const result = await generateScript({
      topic: String(topic),
      language,
      durationSec,
      tone,
      preferredProviderId
    });

    let images: Array<{ url: string; provider: string; degraded: boolean }> = [];
    if (withImages !== false) {
      images = await generateSceneImages(result.data.scenes.map((s) => s.visualPrompt));
    }

    res.json({
      ...result.data,
      meta: {
        provider: result.provider,
        model: result.model,
        degraded: result.degraded,
        attempts: result.attempts
      },
      images
    });
  } catch (err: any) {
    res.status(500).json({ error: 'GENERATION_FAILED', message: err?.message || String(err) });
  }
});

app.post('/api/ai/generate/narration', requireAuth, async (req: Request, res: Response) => {
  const { topic, durationSec, tone, preferredProviderId } = req.body || {};
  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'topic is required' });
  }

  try {
    const result = await generateNarration({ topic: String(topic), durationSec, tone, preferredProviderId });
    const wordCount = result.data.split(/\s+/).filter(Boolean).length;
    res.json({
      script: result.data,
      wordCount,
      estimatedDurationSec: Math.max(15, Math.round(wordCount / 2.5)),
      meta: { provider: result.provider, model: result.model, degraded: result.degraded, attempts: result.attempts }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'GENERATION_FAILED', message: err?.message || String(err) });
  }
});

app.post('/api/ai/images/generate', requireAuth, async (req: Request, res: Response) => {
  const { prompts } = req.body || {};
  if (!Array.isArray(prompts) || !prompts.length) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'prompts[] is required' });
  }
  const images = await generateSceneImages(prompts.map(String));
  res.json({ images });
});

// ---------------------------------------------------------------------------
// Key registry
// ---------------------------------------------------------------------------

app.get('/api/keys', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  res.json({
    keys: store.apiKeys,
    registered: store.registeredKeys.map((k) => ({
      id: k.id,
      name: k.name,
      providerId: k.providerId,
      createdAt: k.createdAt
    }))
  });
});

app.post('/api/keys', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  const { name, providerId, secret } = req.body || {};
  if (!name || !providerId || !secret) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'name, providerId and secret are required' });
  }
  if (!getProvider(providerId)) {
    return res.status(400).json({ error: 'UNKNOWN_PROVIDER', message: `Provider ${providerId} is not in the registry` });
  }

  const record = store.registerKey(String(name), String(providerId), String(secret));
  setRuntimeKey(String(providerId), String(secret));

  const provider = getProvider(String(providerId))!;
  const item: ApiKeyItem = {
    id: record.id,
    name: record.name,
    provider: provider.name.toUpperCase(),
    providerId: String(providerId),
    status: 'ACTIVE',
    monthlyQuota: provider.freeTier === 'LOCAL' ? 1_000_000 : 10_000,
    usedThisMonth: 0,
    activeRequests: 0,
    concurrencyLimit: 5,
    costTotal: 0,
    lastUsed: 'Just now'
  };
  store.replaceApiKeys([item, ...store.apiKeys.filter((k) => k.providerId !== providerId)]);

  res.status(201).json({ key: item, encryptedSecret: record.encrypted.cipherText.slice(0, 12) + '…' });
});

app.delete('/api/keys/:id', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  const id = String(req.params.id);
  const dashboardKey = store.apiKeys.find((k) => k.id === id);
  const target = store.registeredKeys.find((k) => k.id === id);

  // Drop the credential so the provider stops counting as configured.
  if (target) clearRuntimeKey(target.providerId);
  else if (dashboardKey) clearRuntimeKey(dashboardKey.providerId);

  store.removeKey(id);
  store.replaceApiKeys(store.apiKeys.filter((k) => k.id !== id));
  res.json({ success: true });
});

// Starts a fresh quota window for a key.
app.post('/api/keys/:id/reset', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  const key = store.resetKeyUsage(String(req.params.id));
  if (!key) return res.status(404).json({ error: 'UNKNOWN_KEY', message: 'No such key' });
  res.json({ key });
});

// Real connectivity sweep: calls every provider that actually holds a
// credential and records the outcome against the matching dashboard key.
app.post('/api/keys/pulse', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), async (_req: Request, res: Response) => {
  const configured = LLM_PROVIDERS.filter((p) => resolveApiKey(p) !== '');
  const results: Array<{ providerId: string; provider: string; ok: boolean; latencyMs: number; error?: string }> = [];

  for (const provider of configured) {
    const started = Date.now();
    try {
      const text = await callProvider(
        provider,
        resolveApiKey(provider),
        [{ role: 'user', content: 'Reply with the single word: OK' }],
        { maxTokens: 16, temperature: 0 }
      );
      const latencyMs = Date.now() - started;
      store.recordProviderCall(provider.id, { ok: Boolean(text), latencyMs });
      results.push({
        providerId: provider.id,
        provider: provider.name,
        ok: Boolean(text),
        latencyMs,
        error: text ? undefined : 'Empty response'
      });
    } catch (err: any) {
      const latencyMs = Date.now() - started;
      store.recordProviderCall(provider.id, { ok: false, latencyMs });
      results.push({
        providerId: provider.id,
        provider: provider.name,
        ok: false,
        latencyMs,
        error: err?.message || String(err)
      });
    }
  }

  res.json({ results, keys: store.apiKeys, tested: results.length });
});

// Restores the studio dataset to its seeded starting point.
app.post('/api/seed/reset', requireAuth, requireRole('SUPER_ADMIN'), (_req: Request, res: Response) => {
  store.resetToSeed();
  res.json({ success: true, keys: store.apiKeys, projects: store.projects.length });
});

// Atomic capacity leases across the provider fleet.
app.post('/api/keys/lease', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  const { provider } = req.body || {};
  const candidate = store.leaseKey(provider ? String(provider) : undefined);

  if (!candidate) {
    return res.status(429).json({
      error: 'CIRCUIT_BREAKER_TRIPPED',
      message: 'All API keys for this provider are currently rate-limited or exhausted.'
    });
  }

  res.json({
    apiKeyId: candidate.id,
    name: candidate.name,
    provider: candidate.provider,
    leasedAt: new Date().toISOString()
  });
});

app.post('/api/keys/release', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  const { apiKeyId, tokensUsed = 0 } = req.body || {};
  const key = store.releaseKey(String(apiKeyId || ''), Number(tokensUsed) || 0);
  res.json({ success: Boolean(key), updatedKey: key });
});

// ---------------------------------------------------------------------------
// Projects, ledger, marketplace, schedule
// ---------------------------------------------------------------------------

app.get('/api/projects', requireAuth, (req: Request, res: Response) => res.json({ projects: store.projects }));

app.post('/api/projects', requireAuth, (req: Request, res: Response) => {
  const project = req.body as Project;
  if (!project?.id || !project?.title) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'id and title are required' });
  }
  res.status(201).json({ project: store.addProject(project) });
});

app.put('/api/projects/:id', requireAuth, (req: Request, res: Response) => {
  const updated = req.body as Project;
  if (!updated?.id) return res.status(400).json({ error: 'INVALID_REQUEST', message: 'id is required' });
  res.json({ project: store.updateProject(updated) });
});

app.get('/api/wallet/balance', requireAuth, (req: Request, res: Response) => {
  res.json({
    balance: store.walletBalance(),
    pendingBalance: 0.0,
    currency: 'USD',
    lifetimeEarnings: store.ledger.reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
  });
});

app.get('/api/ledger', requireAuth, (req: Request, res: Response) => res.json({ entries: store.ledger }));

app.post('/api/ledger', requireAuth, (req: Request, res: Response) => {
  const entry = req.body as LedgerEntry;
  if (!entry?.id) return res.status(400).json({ error: 'INVALID_REQUEST', message: 'id is required' });
  res.status(201).json({ entry: store.addLedgerEntry(entry) });
});

app.get('/api/marketplace', requireAuth, (req: Request, res: Response) => res.json({ items: store.marketplace }));

app.get('/api/schedule', requireAuth, (req: Request, res: Response) => res.json({ posts: store.schedule }));

app.post('/api/schedule', requireAuth, (req: Request, res: Response) => {
  const post = req.body as ScheduledPost;
  if (!post?.id) return res.status(400).json({ error: 'INVALID_REQUEST', message: 'id is required' });
  res.status(201).json({ post: store.addSchedule(post) });
});

// ---------------------------------------------------------------------------
// Payouts (RazorpayX)
// ---------------------------------------------------------------------------

app.get('/api/payouts', requireAuth, (req: Request, res: Response) => {
  res.json({ payouts: store.payouts });
});

app.post('/api/payouts', requireAuth, async (req: Request, res: Response) => {
  const amount = Number(req.body?.amount);
  const upiId = String(req.body?.upiId || '').trim();
  const accountHolder = String(req.body?.accountHolder || '').trim();
  const ifscCode = String(req.body?.ifscCode || '').trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Enter a valid withdrawal amount.' });
  }
  if (!upiId) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'A UPI ID is required.' });
  }
  if (amount > store.walletBalance()) {
    return res.status(400).json({ error: 'INSUFFICIENT_BALANCE', message: 'The amount exceeds your available balance.' });
  }

  const payout: PayoutRequest = {
    id: `pay_${Date.now().toString(36)}`,
    amount: Number(amount.toFixed(2)),
    upiId,
    accountHolder: accountHolder || 'Creator',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  store.addPayout(payout);

  // The amount leaves the wallet now and waits in escrow until the payout
  // settles; a failed payout puts it straight back.
  const balance = store.walletBalance();
  store.addLedgerEntry({
    id: `led-${Date.now()}`,
    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    type: 'WITHDRAWAL_REQUEST',
    amount: -payout.amount,
    postBalance: Number((balance - payout.amount).toFixed(2)),
    description: `Withdrawal request to UPI ${upiId}`,
    referenceId: payout.id
  });

  if (!razorpayPayoutConfigured()) {
    const queued = store.updatePayout({
      ...payout,
      status: 'PENDING',
      failureReason: 'RazorpayX is not configured — queued for manual settlement.'
    });
    return res.status(202).json({
      payout: queued,
      walletBalance: store.walletBalance(),
      message: 'Payout recorded and held in escrow. RazorpayX is not configured, so it is queued for manual settlement.'
    });
  }

  try {
    const result = await createPayout({
      accountNumber: upiId,
      ifscCode: ifscCode || undefined,
      vpa: upiId,
      name: payout.accountHolder,
      amountPaise: Math.round(payout.amount * 100),
      referenceId: payout.id
    });

    const updated = store.updatePayout({
      ...payout,
      status: result.status === 'processed' || result.status === 'processing' ? 'PROCESSING' : 'PENDING',
      razorpayPayoutId: result.id
    });

    res.json({ payout: updated, walletBalance: store.walletBalance() });
  } catch (err: any) {
    const failed = store.updatePayout({
      ...payout,
      status: 'FAILED',
      failureReason: err?.message || String(err)
    });

    // Release the escrowed amount back to the wallet.
    const after = store.walletBalance();
    store.addLedgerEntry({
      id: `led-${Date.now()}-refund`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'WITHDRAWAL_SETTLED',
      amount: payout.amount,
      postBalance: Number((after + payout.amount).toFixed(2)),
      description: `Withdrawal to ${upiId} failed — amount returned to wallet`,
      referenceId: payout.id
    });

    res.status(502).json({
      error: 'PAYOUT_FAILED',
      message: err?.message || 'The payout could not be created.',
      payout: failed,
      walletBalance: store.walletBalance()
    });
  }
});

// ---------------------------------------------------------------------------
// Payments (Razorpay)
// ---------------------------------------------------------------------------

const PLATFORM_FEE_RATE = 0.2;

/**
 * Marks an order paid and credits the creator's wallet with the net proceeds.
 * Called only after a signature has been verified, so it is safe to re-run.
 */
function fulfillOrder(order: PaymentOrder, paymentId: string): string {
  if (order.status === 'PAID' && order.licenseKey) return order.licenseKey;

  const sellerProceeds = Number((order.amount * (1 - PLATFORM_FEE_RATE)).toFixed(2));
  const licenseKey = `LIC-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

  store.updateOrder({
    ...order,
    status: 'PAID',
    paymentId,
    paidAt: new Date().toISOString(),
    licenseKey
  });

  const balance = store.walletBalance();
  store.addLedgerEntry({
    id: `led-${Date.now()}`,
    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    type: 'MARKETPLACE_SALE_PROCEEDS',
    amount: sellerProceeds,
    postBalance: Number((balance + sellerProceeds).toFixed(2)),
    description: `Marketplace purchase proceeds for "${order.itemTitle}" (80% net proceeds)`,
    referenceId: licenseKey
  });

  return licenseKey;
}

app.get('/api/payments/config', requireAuth, (_req: Request, res: Response) => {
  res.json({
    configured: razorpayConfigured(),
    keyId: razorpayConfigured() ? razorpayConfig().keyId : '',
    payoutEnabled: razorpayPayoutConfigured(),
    currency: 'INR',
    platformFeeRate: PLATFORM_FEE_RATE
  });
});

app.post('/api/payments/orders', requireAuth, async (req: Request, res: Response) => {
  if (!razorpayConfigured()) {
    return res.status(503).json({
      error: 'PAYMENTS_NOT_CONFIGURED',
      message: 'Razorpay keys are not set on the server yet.'
    });
  }

  const itemId = String(req.body?.itemId || '');
  const item = store.marketplace.find((m) => m.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'UNKNOWN_ITEM', message: 'That marketplace item does not exist.' });
  }

  const session = currentUser(req)!;
  const receipt = `ord_${Date.now().toString(36)}`;

  try {
    const order = await createOrder({
      amountPaise: Math.round(item.price * 100),
      receipt,
      notes: { itemId: item.id, userId: session.id }
    });

    store.addOrder({
      id: receipt,
      razorpayOrderId: order.id,
      itemId: item.id,
      itemTitle: item.title,
      amount: item.price,
      currency: 'INR',
      status: 'CREATED',
      userId: session.id,
      createdAt: new Date().toISOString()
    });

    res.json({
      order,
      keyId: razorpayConfig().keyId,
      item: { id: item.id, title: item.title, price: item.price }
    });
  } catch (err: any) {
    res.status(502).json({ error: 'ORDER_FAILED', message: err?.message || 'Could not create the payment order.' });
  }
});

app.post('/api/payments/verify', requireAuth, (req: Request, res: Response) => {
  const orderId = String(req.body?.razorpay_order_id || req.body?.orderId || '');
  const paymentId = String(req.body?.razorpay_payment_id || req.body?.paymentId || '');
  const signature = String(req.body?.razorpay_signature || req.body?.signature || '');

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Missing payment verification fields.' });
  }
  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Payment signature could not be verified.' });
  }

  const order = store.findOrder(orderId);
  if (!order) {
    return res.status(404).json({ error: 'UNKNOWN_ORDER', message: 'No such order.' });
  }
  if (order.userId !== currentUser(req)!.id) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'This order belongs to another account.' });
  }

  const licenseKey = fulfillOrder(order, paymentId);
  res.json({
    success: true,
    licenseKey,
    order: store.findOrder(orderId),
    walletBalance: store.walletBalance()
  });
});

app.get('/api/payments/orders', requireAuth, (req: Request, res: Response) => {
  const userId = currentUser(req)!.id;
  res.json({ orders: store.orders.filter((o) => o.userId === userId) });
});

// The webhook is public but its payload is only trusted once the signature
// over the raw body checks out.
app.post('/api/webhooks/razorpay', (req: Request, res: Response) => {
  if (!razorpayConfigured()) {
    return res.status(503).json({ error: 'PAYMENTS_NOT_CONFIGURED', message: 'Razorpay is not configured.' });
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = String(req.headers['x-razorpay-signature'] || '');
  if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature could not be verified.' });
  }

  const event = String(req.body?.event || '');
  const entity = req.body?.payload?.payment?.entity || {};

  if (event === 'payment.captured' || event === 'order.paid') {
    const order = store.findOrder(String(entity.order_id || ''));
    if (order) fulfillOrder(order, String(entity.id || ''));
  }

  res.json({ status: 'PROCESSED', event });
});

app.post('/api/webhooks/stripe', (req: Request, res: Response) => {
  res.status(200).json({ received: true });
});

// ---------------------------------------------------------------------------
// Source code archive
// ---------------------------------------------------------------------------

const ZIP_FILE_NAME = 'AI_Creator_Studio_Complete_Source.zip';

const sendSourceZip = (req: Request, res: Response) => {
  try {
    const { buffer, fileCount } = buildSourceZip(__dirname);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${ZIP_FILE_NAME}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('X-Source-File-Count', String(fileCount));
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: 'ZIP_FAILED', message: err?.message || String(err) });
  }
};

app.get('/api/source-zip', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), sendSourceZip);
app.get(`/${ZIP_FILE_NAME}`, requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), sendSourceZip);

// Unmatched API routes must answer with JSON, never an HTML error page.
app.use('/api', apiNotFound);

// ---------------------------------------------------------------------------
// Static hosting for the built frontend
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir));
  
}

// Any error thrown inside a route must still answer with JSON.
app.use(jsonErrorHandler);

if (import.meta.url === `file://${process.argv[1]}`) {
  

// Serve static files from the React app
app.use(express.static(path.join(process.cwd(), 'dist')));

// SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.indexOf('/api') !== 0) {
    return res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
  next();
});

app.listen(PORT, () => {
    console.log(`Synthetix AI Creator Studio Core API listening on port ${PORT}`);
    console.log(`Configured LLM providers: ${LLM_PROVIDERS.filter(providerHasKey).map((p) => p.name).join(', ') || 'none'}`);
  });
}

export { encryptSecret, decryptSecret };
export default app;
