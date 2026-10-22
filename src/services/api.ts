import type { ApiKeyItem, BootstrapPayload, LedgerEntry, ProviderInfo, PayoutRequest, StudioMetrics, UserProfile, UserRole } from '../types';

/**
 * All API traffic goes through the Express backend. In dev, Vite proxies /api
 * to the backend; in production the same origin serves both.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body?.message || body?.error || `Request failed with ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarUrl: string;
  role: UserRole;
}

export function fetchSession(): Promise<{ user: SessionUser | null }> {
  return request<{ user: SessionUser | null }>('/api/auth/session');
}

export function login(email: string, password: string): Promise<{ user: SessionUser }> {
  return request<{ user: SessionUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function registerUser(payload: { name: string; email: string; password: string }): Promise<{ user: SessionUser }> {
  return request<{ user: SessionUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function logout(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
}

export function fetchBootstrap(): Promise<BootstrapPayload> {
  return request<BootstrapPayload>('/api/bootstrap');
}

export function fetchProviders(): Promise<ProviderInfo[]> {
  return request<ProviderInfo[]>('/api/ai/providers');
}

export function testProvider(providerId: string) {
  return request<{ ok: boolean; provider: string; model: string; latencyMs: number; sample?: string; error?: string }>(
    `/api/ai/providers/${providerId}/test`,
    { method: 'POST' }
  );
}

export interface PulseResult {
  providerId: string;
  provider: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export function pulseProviderKeys(): Promise<{ results: PulseResult[]; keys: ApiKeyItem[]; tested: number }> {
  return request('/api/keys/pulse', { method: 'POST' });
}

export interface GeneratedScriptResponse {
  hook: string;
  scenes: Array<{
    sceneText: string;
    visualPrompt: string;
    durationSec: number;
    transition: 'fade' | 'zoom' | 'glitch' | 'wipe';
  }>;
  suggestedTitles: string[];
  description: string;
  hashtags: string[];
  meta: {
    provider: string;
    model: string;
    degraded: boolean;
    attempts: Array<{ providerId: string; ok: boolean; error?: string; latencyMs: number }>;
  };
  images: Array<{ url: string; provider: string; degraded: boolean }>;
}

export function generateScript(payload: {
  topic: string;
  language: string;
  durationSec: number;
  tone: string;
  preferredProviderId?: string;
  withImages?: boolean;
}) {
  return request<GeneratedScriptResponse>('/api/ai/generate/script', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function generateNarration(payload: {
  topic: string;
  durationSec?: number;
  tone?: string;
  preferredProviderId?: string;
}) {
  return request<{ script: string; wordCount: number; estimatedDurationSec: number; meta: { provider: string; model: string; degraded: boolean } }>(
    '/api/ai/generate/narration',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export function registerProviderKey(payload: { name: string; providerId: string; secret: string }) {
  return request('/api/keys', { method: 'POST', body: JSON.stringify(payload) });
}

export function deleteProviderKey(id: string) {
  return request(`/api/keys/${id}`, { method: 'DELETE' });
}

export function resetProviderKey(id: string): Promise<{ key: ApiKeyItem }> {
  return request(`/api/keys/${id}/reset`, { method: 'POST' });
}

export function resetStudioData(): Promise<{ success: boolean; keys: ApiKeyItem[]; projects: number }> {
  return request('/api/seed/reset', { method: 'POST' });
}

export interface PaymentConfig {
  configured: boolean;
  keyId: string;
  payoutEnabled: boolean;
  currency: string;
  platformFeeRate: number;
}

export function fetchPaymentConfig(): Promise<PaymentConfig> {
  return request<PaymentConfig>('/api/payments/config');
}

export function createPaymentOrder(itemId: string) {
  return request<{
    order: { id: string; amount: number; currency: string; receipt: string; status: string };
    keyId: string;
    item: { id: string; title: string; price: number };
  }>('/api/payments/orders', { method: 'POST', body: JSON.stringify({ itemId }) });
}

export function verifyPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return request<{ success: boolean; licenseKey: string; walletBalance: number }>('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function requestPayout(payload: { amount: number; upiId: string; accountHolder: string }) {
  return request<{ payout: PayoutRequest; walletBalance: number; message?: string }>('/api/payouts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchPayouts(): Promise<{ payouts: PayoutRequest[] }> {
  return request<{ payouts: PayoutRequest[] }>('/api/payouts');
}

export function fetchLedger(): Promise<{ entries: LedgerEntry[] }> {
  return request<{ entries: LedgerEntry[] }>('/api/ledger');
}

export function saveProject(project: unknown) {
  return request('/api/projects', { method: 'POST', body: JSON.stringify(project) });
}

export function updateProject(project: unknown) {
  return request(`/api/projects/${(project as { id: string }).id}`, {
    method: 'PUT',
    body: JSON.stringify(project)
  });
}

export function saveSchedulePost(post: unknown) {
  return request('/api/schedule', { method: 'POST', body: JSON.stringify(post) });
}

export function updateUserProfile(profile: Partial<UserProfile>) {
  return request<{ user: UserProfile }>('/api/user', {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
}

export function fetchMetrics(): Promise<StudioMetrics> {
  return request<StudioMetrics>('/api/metrics');
}
