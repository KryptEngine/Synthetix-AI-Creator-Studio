import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { UserProfile } from '../src/types/index.ts';
import type {
  ApiKeyItem,
  LedgerEntry,
  MarketplaceItem,
  PaymentOrder,
  PayoutRequest,
  Project,
  ScheduledPost
} from '../src/types/index.ts';
import {
  INITIAL_API_KEYS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_MARKETPLACE,
  INITIAL_PROJECTS,
  INITIAL_SCHEDULE,
  INITIAL_USER_PROFILE
} from './seedData';
import { LLM_PROVIDERS } from './providers';

const ALGORITHM = 'aes-256-gcm';
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), '.data');
const KEY_FILE = path.join(DATA_DIR, 'provider-keys.enc.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const STATE_FILE = path.join(DATA_DIR, 'studio-state.json');

const MASTER_KEY = Buffer.from(
  process.env.ENCRYPTION_MASTER_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'hex'
);

export interface RegisteredKey {
  id: string;
  name: string;
  providerId: string;
  encrypted: { cipherText: string; iv: string; authTag: string };
  createdAt: string;
}

export function encryptSecret(plainText: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { cipherText: encrypted, iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}

export function decryptSecret(payload: { cipherText: string; iv: string; authTag: string }): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(payload.iv, 'hex'));
  let decrypted = decipher.update(payload.cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  return decrypted;
}

/**
 * In-memory state for the studio. Seeded from the demo dataset and mutated by
 * the REST layer; provider secrets live encrypted on disk.
 */
class Store {
  projects: Project[] = structuredClone(INITIAL_PROJECTS);
  apiKeys: ApiKeyItem[] = structuredClone(INITIAL_API_KEYS);
  ledger: LedgerEntry[] = structuredClone(INITIAL_LEDGER_ENTRIES);
  marketplace: MarketplaceItem[] = structuredClone(INITIAL_MARKETPLACE);
  schedule: ScheduledPost[] = structuredClone(INITIAL_SCHEDULE);
  orders: PaymentOrder[] = [];
  payouts: PayoutRequest[] = [];
  registeredKeys: RegisteredKey[] = [];
  runtimeSecrets = new Map<string, string>();
  user: UserProfile = structuredClone(INITIAL_USER_PROFILE);

  constructor() {
    this.loadRegisteredKeys();
    this.loadProfile();
    this.loadState();
  }

  /**
   * Restores the mutable studio collections from disk. Anything missing or
   * malformed falls back to the seed so the app always boots with content.
   */
  private loadState() {
    try {
      if (!fs.existsSync(STATE_FILE)) return;
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as Partial<{
        projects: Project[];
        apiKeys: ApiKeyItem[];
        ledger: LedgerEntry[];
        marketplace: MarketplaceItem[];
        schedule: ScheduledPost[];
        orders: PaymentOrder[];
        payouts: PayoutRequest[];
      }>;
      if (Array.isArray(saved.projects)) this.projects = saved.projects;
      if (Array.isArray(saved.apiKeys)) this.apiKeys = saved.apiKeys;
      if (Array.isArray(saved.ledger)) this.ledger = saved.ledger;
      if (Array.isArray(saved.marketplace)) this.marketplace = saved.marketplace;
      if (Array.isArray(saved.schedule)) this.schedule = saved.schedule;
      if (Array.isArray(saved.orders)) this.orders = saved.orders;
      if (Array.isArray(saved.payouts)) this.payouts = saved.payouts;
    } catch {
      // Corrupt state file must not take the server down.
    }
  }

  private persistState() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(
          {
            projects: this.projects,
            apiKeys: this.apiKeys,
            ledger: this.ledger,
            marketplace: this.marketplace,
            schedule: this.schedule,
            orders: this.orders,
            payouts: this.payouts
          },
          null,
          2
        ),
        { mode: 0o600 }
      );
    } catch {
      // Persistence is best-effort; the in-memory copy still works.
    }
  }

  private loadProfile() {
    try {
      if (!fs.existsSync(PROFILE_FILE)) return;
      const saved = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8')) as Partial<UserProfile>;
      this.user = { ...this.user, ...saved };
    } catch {
      // A corrupt profile file must not stop the server from booting.
    }
  }

  updateUser(patch: Partial<UserProfile>): UserProfile {
    this.user = { ...this.user, ...patch };
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(this.user, null, 2), { mode: 0o600 });
    } catch {
      // Persistence is best-effort; the in-memory copy still works.
    }
    return this.user;
  }

  private loadRegisteredKeys() {
    try {
      if (!fs.existsSync(KEY_FILE)) return;
      const raw = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')) as RegisteredKey[];
      this.registeredKeys = raw;
      for (const key of raw) {
        try {
          this.runtimeSecrets.set(key.providerId, decryptSecret(key.encrypted));
        } catch {
          // Secret was encrypted with a different master key — ignore it.
        }
      }
    } catch {
      // Corrupt key file must not take the server down.
    }
  }

  private persistRegisteredKeys() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(KEY_FILE, JSON.stringify(this.registeredKeys, null, 2), { mode: 0o600 });
    } catch {
      // Persistence is best-effort; the in-memory copy still works.
    }
  }

  registerKey(name: string, providerId: string, secret: string): RegisteredKey {
    const record: RegisteredKey = {
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim().toUpperCase(),
      providerId,
      encrypted: encryptSecret(secret),
      createdAt: new Date().toISOString()
    };
    this.registeredKeys = [...this.registeredKeys.filter((k) => k.providerId !== providerId), record];
    this.runtimeSecrets.set(providerId, secret);
    this.persistRegisteredKeys();
    return record;
  }

  removeKey(id: string): boolean {
    const target = this.registeredKeys.find((k) => k.id === id);
    if (!target) return false;
    this.registeredKeys = this.registeredKeys.filter((k) => k.id !== id);
    this.runtimeSecrets.delete(target.providerId);
    this.persistRegisteredKeys();
    return true;
  }

  walletBalance(): number {
    return this.ledger.length ? this.ledger[0].postBalance : 0;
  }

  addProject(project: Project): Project {
    this.projects = [project, ...this.projects];
    this.persistState();
    return project;
  }

  updateProject(updated: Project): Project {
    this.projects = this.projects.map((p) => (p.id === updated.id ? updated : p));
    this.persistState();
    return updated;
  }

  addSchedule(post: ScheduledPost): ScheduledPost {
    this.schedule = [post, ...this.schedule];
    this.persistState();
    return post;
  }

  /** Replaces the apiKeys array wholesale — used by the key-rotation routes. */
  replaceApiKeys(keys: ApiKeyItem[]): void {
    this.apiKeys = keys;
    this.persistState();
  }

  addOrder(order: PaymentOrder): PaymentOrder {
    this.orders = [order, ...this.orders];
    this.persistState();
    return order;
  }

  updateOrder(updated: PaymentOrder): PaymentOrder {
    this.orders = this.orders.map((o) => (o.razorpayOrderId === updated.razorpayOrderId ? updated : o));
    this.persistState();
    return updated;
  }

  findOrder(razorpayOrderId: string): PaymentOrder | undefined {
    return this.orders.find((o) => o.razorpayOrderId === razorpayOrderId);
  }

  addPayout(payout: PayoutRequest): PayoutRequest {
    this.payouts = [payout, ...this.payouts];
    this.persistState();
    return payout;
  }

  updatePayout(updated: PayoutRequest): PayoutRequest {
    this.payouts = this.payouts.map((p) => (p.id === updated.id ? updated : p));
    this.persistState();
    return updated;
  }

  /** Starts a fresh quota window for a key and clears any rate-limit hold. */
  resetKeyUsage(id: string): ApiKeyItem | undefined {
    const key = this.apiKeys.find((k) => k.id === id);
    if (!key) return undefined;
    key.usedThisMonth = 0;
    key.activeRequests = 0;
    key.status = 'ACTIVE';
    key.rateLimitResetSeconds = undefined;
    key.lastUsed = 'Just now';
    this.persistState();
    return key;
  }

  /** Restores every collection to its seeded starting point. */
  resetToSeed(): void {
    this.projects = structuredClone(INITIAL_PROJECTS);
    this.apiKeys = structuredClone(INITIAL_API_KEYS);
    this.ledger = structuredClone(INITIAL_LEDGER_ENTRIES);
    this.marketplace = structuredClone(INITIAL_MARKETPLACE);
    this.schedule = structuredClone(INITIAL_SCHEDULE);
    this.orders = [];
    this.payouts = [];
    this.persistState();
  }

  /**
   * Records a real provider invocation against the matching dashboard key
   * (looked up by providerId) so the admin dashboard reflects actual usage
   * instead of sitting on fabricated demo counters.
   */
  recordProviderCall(providerId: string, opts: { ok: boolean; latencyMs: number }): void {
    const target = this.apiKeys.find((k) => k.providerId === providerId);
    if (!target) return;
    target.lastUsed = 'Just now';
    if (opts.ok) {
      target.usedThisMonth += 1;
      target.costTotal = Number(((target.costTotal || 0) + 0.0006).toFixed(2));
      if (target.usedThisMonth >= target.monthlyQuota) target.status = 'EXHAUSTED';
    } else {
      target.status = 'RATE_LIMITED';
      target.rateLimitResetSeconds = 30;
    }
    this.persistState();
  }

  /**
   * Atomically hands out capacity for a given provider, or returns null when no
   * active key under quota is available. Mirrors the old keyStore lease pool so
   * `/api/keys/lease` and `/api/keys/release` both update the same rows.
   */
  leaseKey(providerId?: string): ApiKeyItem | null {
    const candidate =
      this.apiKeys.find(
        (k) =>
          (!providerId || k.providerId === providerId) &&
          k.status === 'ACTIVE' &&
          k.usedThisMonth < k.monthlyQuota
      ) || null;
    if (!candidate) return null;
    candidate.activeRequests += 1;
    this.persistState();
    return candidate;
  }

  releaseKey(id: string, tokensUsed = 0): ApiKeyItem | undefined {
    const key = this.apiKeys.find((k) => k.id === id);
    if (!key) return undefined;
    key.activeRequests = Math.max(0, (key.activeRequests || 0) - 1);
    key.usedThisMonth += tokensUsed;
    key.costTotal = Number(((key.costTotal || 0) + 0.0006 * tokensUsed).toFixed(2));
    key.lastUsed = 'Just now';
    if (key.usedThisMonth >= key.monthlyQuota) key.status = 'EXHAUSTED';
    else if (key.status === 'RATE_LIMITED') key.status = 'ACTIVE';
    this.persistState();
    return key;
  }

  /** Aggregated usage metrics surfaced by the admin dashboard. */
  metrics() {
    const activeConnections = this.apiKeys
      .filter((k) => k.status === 'ACTIVE')
      .reduce((sum, k) => sum + (k.activeRequests || 0), 0);
    const avgUsage =
      this.apiKeys.length > 0
        ? this.apiKeys.reduce((s, k) => s + (k.usedThisMonth / (k.monthlyQuota || 1)), 0) / this.apiKeys.length
        : 0;

    const recentProjects = this.projects.slice(-7).reverse();
    const apiSpend = Number(this.apiKeys.reduce((s, k) => s + (k.costTotal || 0), 0).toFixed(2));
    const apiBudget = this.apiKeys.reduce((s, k) => s + (k.monthlyQuota || 0), 0);

    // Per-provider usage, summed across every key registered for that provider
    // so the chart shows one series per provider rather than one per key.
    const providerUsage = Array.from(
      this.apiKeys.reduce((acc, k) => {
        const entry = acc.get(k.provider) ?? { users: 0, quota: 0 };
        entry.users += k.usedThisMonth;
        entry.quota += k.monthlyQuota || 0;
        acc.set(k.provider, entry);
        return acc;
      }, new Map<string, { users: number; quota: number }>())
    ).map(([name, v]) => ({
      name,
      users: v.users,
      load: Math.round((v.users / (v.quota || 1)) * 100)
    }));

    return {
      activeConnections,
      avgUsagePct: Number(avgUsage.toFixed(3)),
      providersCount: LLM_PROVIDERS.length,
      totalProjects: this.projects.length,
      recentProjectsCount: recentProjects.length,
      apiSpend,
      apiBudget,
      providerUsage
    };
  }

  addLedgerEntry(entry: LedgerEntry): LedgerEntry {
    this.ledger = [entry, ...this.ledger];
    this.persistState();
    return entry;
  }
}

export const store = new Store();
