/**
 * Free LLM provider registry.
 *
 * Sources: https://github.com/open-free-llm-apis/awesome-freellm-apis
 * Every provider below exposes a free tier. Most speak the OpenAI
 * chat-completions protocol, so a single client covers them all.
 */

export type FreeTierKind = 'PERMANENT' | 'RENEWABLE' | 'LOCAL';
export type AuthStyle = 'bearer' | 'query' | 'none';

export interface LlmProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  signupUrl: string;
  authStyle: AuthStyle;
  freeTier: FreeTierKind;
  creditCardRequired: boolean;
  defaultModel: string;
  models: string[];
  maxContextTokens: number;
  modalities: string[];
  priority: number;
}

export const LLM_PROVIDERS: LlmProvider[] = [
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    signupUrl: 'https://console.groq.com/keys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b'],
    maxContextTokens: 262144,
    modalities: ['text', 'vision', 'audio'],
    priority: 10
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    signupUrl: 'https://cloud.cerebras.ai/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'llama-3.3-70b',
    models: ['llama-3.3-70b', 'llama3.1-8b', 'qwen-3-32b'],
    maxContextTokens: 131072,
    modalities: ['text', 'reasoning'],
    priority: 20
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_API_KEY',
    signupUrl: 'https://build.nvidia.com/settings/api-keys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: ['meta/llama-3.3-70b-instruct', 'z-ai/glm-5.2', 'moonshotai/kimi-k2.6'],
    maxContextTokens: 1048576,
    modalities: ['text', 'vision', 'embedding', 'image', 'video'],
    priority: 30
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    signupUrl: 'https://openrouter.ai/workspaces/default/keys',
    authStyle: 'bearer',
    freeTier: 'RENEWABLE',
    creditCardRequired: false,
    defaultModel: 'minimax/minimax-m3.1-flash:free',
    models: [
      'minimax/minimax-m3.1-flash:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-31b-it:free',
      'thinkingmachines/inkling-small:free'
    ],
    maxContextTokens: 1048576,
    modalities: ['text', 'vision', 'image', 'audio'],
    priority: 40
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    baseUrl: 'https://router.huggingface.co/v1',
    apiKeyEnv: 'HF_TOKEN',
    signupUrl: 'https://huggingface.co/settings/tokens',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'meta-llama/Llama-3.1-8B-Instruct',
    models: ['meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-R1'],
    maxContextTokens: 131072,
    modalities: ['text', 'code', 'image'],
    priority: 50
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    signupUrl: 'https://console.mistral.ai/api-keys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'mistral-small-latest',
    models: ['mistral-small-latest', 'ministral-8b-latest', 'open-mistral-nemo'],
    maxContextTokens: 262144,
    modalities: ['text', 'code', 'image'],
    priority: 60
  },
  {
    id: 'llm7',
    name: 'LLM7.io',
    baseUrl: 'https://api.llm7.io/v1',
    apiKeyEnv: 'LLM7_API_KEY',
    signupUrl: 'https://token.llm7.io',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'gpt-5-mini',
    models: ['gpt-5-mini', 'gpt-4.1-mini', 'deepseek-r1'],
    maxContextTokens: 1048576,
    modalities: ['text', 'code', 'vision', 'image', 'audio'],
    priority: 70
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
    signupUrl: 'https://cloud.siliconflow.cn/account/ak',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3'],
    maxContextTokens: 131072,
    modalities: ['text', 'reasoning'],
    priority: 80
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    signupUrl: 'https://cloud.sambanova.ai/apis',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    models: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-R1-Distill-Llama-70B'],
    maxContextTokens: 131072,
    modalities: ['text', 'reasoning'],
    priority: 90
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    signupUrl: 'https://platform.deepseek.com/api_keys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    maxContextTokens: 131072,
    modalities: ['text', 'reasoning'],
    priority: 100
  },
  {
    id: 'xai',
    name: 'xAI / Grok',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnv: 'XAI_API_KEY',
    signupUrl: 'https://console.x.ai',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'grok-2-latest',
    models: ['grok-2-latest', 'grok-3-mini'],
    maxContextTokens: 2097152,
    modalities: ['text'],
    priority: 110
  },
  {
    id: 'ai21',
    name: 'AI21 Labs',
    baseUrl: 'https://api.ai21.com/studio/v1',
    apiKeyEnv: 'AI21_API_KEY',
    signupUrl: 'https://studio.ai21.com/account/api-key',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'jamba-mini',
    models: ['jamba-mini', 'jamba-large'],
    maxContextTokens: 262144,
    modalities: ['text'],
    priority: 120
  },
  {
    id: 'chutes',
    name: 'Chutes.ai',
    baseUrl: 'https://api.chutes.ai/v1',
    apiKeyEnv: 'CHUTES_API_KEY',
    signupUrl: 'https://chutes.ai/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'chutes-vllm-3.3-70b',
    models: ['chutes-vllm-3.3-70b', 'chutes-vllm-3.1-8b'],
    maxContextTokens: 131072,
    modalities: ['text', 'reasoning'],
    priority: 130
  },
  {
    id: 'nebius',
    name: 'Nebius',
    baseUrl: 'https://api.studio.nebius.com/v1',
    apiKeyEnv: 'NEBIUS_API_KEY',
    signupUrl: 'https://studio.nebius.com/settings/keys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'meta-llama/Llama-3.1-8B-Instruct',
    models: ['meta-llama/Llama-3.1-8B-Instruct'],
    maxContextTokens: 131072,
    modalities: ['text'],
    priority: 140
  },
  {
    id: 'nscale',
    name: 'Nscale',
    baseUrl: 'https://inference.api.nscale.com/v1',
    apiKeyEnv: 'NSCALE_API_KEY',
    signupUrl: 'https://console.nscale.com/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'Meta-Llama-3.1-8B-Instruct',
    models: ['Meta-Llama-3.1-8B-Instruct'],
    maxContextTokens: 131072,
    modalities: ['text'],
    priority: 150
  },
  {
    id: 'glhf',
    name: 'Glhf.chat',
    baseUrl: 'https://glhf.chat/api/openai/v1',
    apiKeyEnv: 'GLHF_API_KEY',
    signupUrl: 'https://glhf.chat/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'gpt-oss-120b',
    models: ['gpt-oss-120b', 'qwen3-235b'],
    maxContextTokens: 131072,
    modalities: ['text'],
    priority: 160
  },
  {
    id: 'modelscope',
    name: 'ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    apiKeyEnv: 'MODELSCOPE_API_KEY',
    signupUrl: 'https://modelscope.cn/my/myaccesstoken',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'Qwen/Qwen3.5-27B',
    models: ['Qwen/Qwen3.5-27B', 'Qwen/Qwen3.5-35B-A3B', 'MiniMax/MiniMax-M2.5'],
    maxContextTokens: 262144,
    modalities: ['text', 'vision', 'image'],
    priority: 170
  },
  {
    id: 'opencode',
    name: 'OpenCode Zen',
    baseUrl: 'https://opencode.ai/zen/v1',
    apiKeyEnv: 'OPENCODE_API_KEY',
    signupUrl: 'https://opencode.ai/auth',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'big-pickle',
    models: ['big-pickle', 'deepseek-v4-flash-free', 'mimo-v2.5-free'],
    maxContextTokens: 1048576,
    modalities: ['text', 'reasoning', 'vision'],
    priority: 180
  },
  {
    id: 'kilo',
    name: 'Kilo Code',
    baseUrl: 'https://api.kilo.ai/api/gateway',
    apiKeyEnv: 'KILO_API_KEY',
    signupUrl: 'https://app.kilo.ai/profile',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'kilo-auto/free',
    models: ['kilo-auto/free'],
    maxContextTokens: 1048576,
    modalities: ['text', 'code', 'image'],
    priority: 190
  },
  {
    id: 'ovh',
    name: 'OVHcloud AI Endpoints',
    baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
    apiKeyEnv: 'OVH_API_KEY',
    signupUrl: 'https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    models: ['Meta-Llama-3.3-70B-Instruct'],
    maxContextTokens: 262144,
    modalities: ['text', 'code', 'image', 'video'],
    priority: 200
  },
  {
    id: 'zhipu',
    name: 'Z AI (Zhipu)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyEnv: 'ZHIPU_API_KEY',
    signupUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus'],
    maxContextTokens: 204800,
    modalities: ['text', 'reasoning', 'image'],
    priority: 210
  },
  {
    id: 'aionlabs',
    name: 'Aion Labs',
    baseUrl: 'https://api.aionlabs.ai/v1',
    apiKeyEnv: 'AION_API_KEY',
    signupUrl: 'https://www.aionlabs.ai/app/api-keys/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'aion-1.0-large',
    models: ['aion-1.0-large', 'aion-1.0-mini'],
    maxContextTokens: 131072,
    modalities: ['text', 'reasoning'],
    priority: 220
  },
  {
    id: 'alibaba',
    name: 'Alibaba Model Studio',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    signupUrl: 'https://bailian.console.alibabacloud.com/',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: true,
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    maxContextTokens: 131072,
    modalities: ['text', 'code', 'image'],
    priority: 230
  },
  {
    id: 'agnes',
    name: 'Agnes AI',
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    apiKeyEnv: 'AGNES_API_KEY',
    signupUrl: 'https://platform.agnes-ai.com/settings/apiKeys',
    authStyle: 'bearer',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'agnes-1.0',
    models: ['agnes-1.0', 'agnes-1.0-pro'],
    maxContextTokens: 262144,
    modalities: ['text', 'reasoning', 'vision', 'image'],
    priority: 240
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    authStyle: 'query',
    freeTier: 'PERMANENT',
    creditCardRequired: false,
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    maxContextTokens: 1048576,
    modalities: ['text', 'vision', 'audio', 'image', 'video', 'pdf'],
    priority: 5
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
    apiKeyEnv: 'OLLAMA_API_KEY',
    signupUrl: 'https://ollama.com/download',
    authStyle: 'none',
    freeTier: 'LOCAL',
    creditCardRequired: false,
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'gemma3'],
    maxContextTokens: 131072,
    modalities: ['text', 'vision'],
    priority: 900
  }
];

export interface MediaProvider {
  id: string;
  name: string;
  kind: 'IMAGE' | 'TTS';
  endpoint: string;
  apiKeyEnv: string;
  signupUrl: string;
  requiresKey: boolean;
  free: boolean;
}

export const MEDIA_PROVIDERS: MediaProvider[] = [
  {
    id: 'pollinations',
    name: 'Pollinations AI',
    kind: 'IMAGE',
    endpoint: 'https://image.pollinations.ai/prompt/{prompt}',
    apiKeyEnv: 'POLLINATIONS_API_KEY',
    signupUrl: 'https://pollinations.ai/',
    requiresKey: false,
    free: true
  },
  {
    id: 'gemini-image',
    name: 'Google Gemini (Imagen)',
    kind: 'IMAGE',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict',
    apiKeyEnv: 'GEMINI_API_KEY',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    requiresKey: true,
    free: true
  },
  {
    id: 'edge-tts',
    name: 'Microsoft Edge Neural TTS',
    kind: 'TTS',
    endpoint: 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
    apiKeyEnv: '',
    signupUrl: 'https://learn.microsoft.com/azure/ai-services/speech-service/',
    requiresKey: false,
    free: true
  }
];

/**
 * Secrets registered at runtime through the admin dashboard, keyed by provider id.
 */
const runtimeKeys = new Map<string, string>();

export function setRuntimeKey(providerId: string, secret: string) {
  runtimeKeys.set(providerId, secret);
}

export function clearRuntimeKey(providerId: string) {
  runtimeKeys.delete(providerId);
}

export function getProvider(id: string): LlmProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

export function resolveApiKey(provider: LlmProvider): string {
  const runtime = runtimeKeys.get(provider.id);
  if (runtime) return runtime;
  const fromEnv = process.env[provider.apiKeyEnv];
  if (fromEnv && !fromEnv.includes('MY_') && fromEnv.length > 8) return fromEnv;
  return '';
}

export function providerHasKey(provider: LlmProvider): boolean {
  if (provider.authStyle === 'none') return true;
  return resolveApiKey(provider) !== '';
}
