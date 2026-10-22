export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export type ProjectStatus = 
  | 'DRAFT' 
  | 'GENERATING_SCRIPT' 
  | 'QUEUED' 
  | 'RENDERING' 
  | 'COMPLETED' 
  | 'PUBLISHED' 
  | 'FAILED';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type SupportedLanguage = 'ENGLISH' | 'HINDI' | 'HINGLISH';

export type KeyStatus = 'ACTIVE' | 'RATE_LIMITED' | 'TEMPORARILY_UNAVAILABLE' | 'EXHAUSTED' | 'DISABLED';

export interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  signupUrl: string;
  apiKeyEnv: string;
  freeTier: 'PERMANENT' | 'RENEWABLE' | 'LOCAL';
  creditCardRequired: boolean;
  defaultModel: string;
  models: string[];
  maxContextTokens: number;
  modalities: string[];
  configured: boolean;
}

export interface MediaProviderInfo {
  id: string;
  name: string;
  kind: 'IMAGE' | 'TTS';
  endpoint: string;
  apiKeyEnv: string;
  signupUrl: string;
  requiresKey: boolean;
  free: boolean;
}

export interface ConnectedAccount {
  platform: string;
  handle: string;
  followersCount: number;
  connectedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  upiId: string;
  walletAddress?: string;
  bio?: string;
  connectedAccounts: ConnectedAccount[];
}

export interface StudioMetrics {
  activeConnections: number;
  avgUsagePct: number;
  providersCount: number;
  totalProjects: number;
  recentProjectsCount: number;
  apiSpend: number;
  apiBudget: number;
  providerUsage: Array<{ name: string; users: number; load: number }>;
}

export interface BootstrapPayload {
  projects: Project[];
  apiKeys: ApiKeyItem[];
  ledger: LedgerEntry[];
  marketplace: MarketplaceItem[];
  schedule: ScheduledPost[];
  walletBalance: number;
  assets: string[];
  providers: ProviderInfo[];
  mediaProviders: MediaProviderInfo[];
  user: UserProfile;
}


export interface Scene {
  id: string;
  sequenceOrder: number;
  sceneText: string;
  visualPrompt: string;
  imageUrl: string;
  audioDurationSec: number;
  transitionEffect: 'fade' | 'zoom' | 'glitch' | 'wipe';
  wordTimestamps?: Array<{ word: string; start: number; end: number }>;
}

export interface Project {
  id: string;
  title: string;
  topic: string;
  language: SupportedLanguage;
  aspectRatio: AspectRatio;
  durationSec: number;
  tone: string;
  status: ProjectStatus;
  renderProgress: number;
  scenes: Scene[];
  finalVideoUrl?: string;
  thumbnailUrl: string;
  createdAt: string;
  scheduledFor?: string;
  views?: number;
  revenueEst?: number;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  status: KeyStatus;
  monthlyQuota: number;
  usedThisMonth: number;
  activeRequests: number;
  concurrencyLimit: number;
  rateLimitResetSeconds?: number;
  costTotal: number;
  lastUsed: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'MARKETPLACE_SALE_PROCEEDS' | 'AFFILIATE_PAYOUT' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_SETTLED' | 'PLATFORM_FEE';
  amount: number;
  postBalance: number;
  description: string;
  referenceId: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  category: string;
  price: number;
  creator: string;
  viewsEstimate: string;
  thumbnailUrl: string;
  previewUrl: string;
  salesCount: number;
}

export interface ScheduledPost {
  id: string;
  projectTitle: string;
  platform: 'YOUTUBE' | 'FACEBOOK' | 'INSTAGRAM';
  scheduledTime: string;
  dateDay: number;
  dateMonth: string;
  status: 'QUEUED' | 'PUBLISHED' | 'PROCESSING';
}

export interface PaymentOrder {
  id: string;
  razorpayOrderId: string;
  itemId: string;
  itemTitle: string;
  amount: number;
  currency: 'INR';
  status: 'CREATED' | 'PAID' | 'FAILED';
  userId: string;
  createdAt: string;
  paidAt?: string;
  paymentId?: string;
  licenseKey?: string;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  upiId: string;
  accountHolder: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  razorpayPayoutId?: string;
  failureReason?: string;
  createdAt: string;
}
