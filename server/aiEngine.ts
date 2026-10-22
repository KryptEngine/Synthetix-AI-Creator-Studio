import { LlmProvider, LLM_PROVIDERS, resolveApiKey, providerHasKey } from './providers';
import { store } from './store';

export interface ProviderAttempt {
  providerId: string;
  providerName: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface GenerationResult<T> {
  data: T;
  provider: string;
  model: string;
  attempts: ProviderAttempt[];
  degraded: boolean;
}

const REQUEST_TIMEOUT_MS = 45_000;

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

function authHeaders(provider: LlmProvider, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.authStyle === 'bearer' && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function buildOpenAIUrl(provider: LlmProvider, apiKey: string): string {
  const url = new URL(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`);
  if (provider.authStyle === 'query') url.searchParams.set('key', apiKey);
  return url.toString();
}

async function callOpenAICompatible(
  provider: LlmProvider,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: ChatOptions
): Promise<string> {
  const model = options.model || provider.defaultModel;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1400
  };
  if (options.jsonMode) body.response_format = { type: 'json_object' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(buildOpenAIUrl(provider, apiKey), {
      method: 'POST',
      headers: authHeaders(provider, apiKey),
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 220)}`);
    }

    const data: any = await response.json();
    const message = data?.choices?.[0]?.message;
    // Reasoning models (Minimax, Nemotron, Qwen thinking) can spend the whole
    // budget on internal reasoning and leave `content` empty.
    return (
      message?.content?.trim() ||
      message?.reasoning_content?.trim() ||
      message?.reasoning?.trim() ||
      ''
    );
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  provider: LlmProvider,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: ChatOptions
): Promise<string> {
  const model = options.model || provider.defaultModel;
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const prompt = messages
    .filter((m) => m.role !== 'system')
    .map((m) => m.content)
    .join('\n\n');

  const url = new URL(
    `${provider.baseUrl.replace(/\/$/, '')}/models/${model}:generateContent`
  );
  url.searchParams.set('key', apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1400,
          responseMimeType: options.jsonMode ? 'application/json' : undefined
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 220)}`);
    }

    const data: any = await response.json();
    return (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || '')
      .join('')
      .trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function callProvider(
  provider: LlmProvider,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: ChatOptions = {}
): Promise<string> {
  if (provider.id === 'gemini') {
    return callGemini(provider, apiKey, messages, options);
  }
  return callOpenAICompatible(provider, apiKey, messages, options);
}

function stripCodeFence(text: string): string {
  return text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
}

export function parseJsonLoose(text: string): any {
  const cleaned = stripCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Response was not valid JSON');
  }
}

/**
 * Runs a prompt through every configured provider, in priority order, until one
 * returns a usable answer. Providers without credentials are skipped.
 */
export async function runWithFallback<T>(
  promptMessages: Array<{ role: string; content: string }>,
  parse: (raw: string) => T,
  options: ChatOptions & { preferredProviderId?: string } = {}
): Promise<GenerationResult<T>> {
  const attempts: ProviderAttempt[] = [];

  const ordered = [...LLM_PROVIDERS].sort((a, b) => a.priority - b.priority);
  if (options.preferredProviderId) {
    const preferred = ordered.find((p) => p.id === options.preferredProviderId);
    if (preferred) {
      ordered.splice(ordered.indexOf(preferred), 1);
      ordered.unshift(preferred);
    }
  }

  for (const provider of ordered) {
    if (!providerHasKey(provider)) continue;

    const apiKey = resolveApiKey(provider);
    const started = Date.now();
    try {
      const raw = await callProvider(provider, apiKey, promptMessages, options);
      const latencyMs = Date.now() - started;
      if (!raw) throw new Error('Empty response');
      const data = parse(raw);
      store.recordProviderCall(provider.id, { ok: true, latencyMs });
      attempts.push({
        providerId: provider.id,
        providerName: provider.name,
        model: options.model || provider.defaultModel,
        ok: true,
        latencyMs
      });
      return {
        data,
        provider: provider.name,
        model: options.model || provider.defaultModel,
        attempts,
        degraded: false
      };
    } catch (err: any) {
      store.recordProviderCall(provider.id, { ok: false, latencyMs: Date.now() - started });
      attempts.push({
        providerId: provider.id,
        providerName: provider.name,
        model: options.model || provider.defaultModel,
        ok: false,
        latencyMs: Date.now() - started,
        error: err?.message || String(err)
      });
    }
  }

  throw Object.assign(
    new Error('No configured provider could serve the request.'),
    { attempts }
  );
}
