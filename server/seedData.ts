import { Project, ApiKeyItem, LedgerEntry, MarketplaceItem, ScheduledPost, UserProfile } from '../src/types/index.ts';

export const INITIAL_USER_PROFILE: UserProfile = {
  id: 'user-1',
  name: 'Alex Reed (Synthetix)',
  handle: '@alexreed',
  avatarUrl: '/assets/avatar_alex_reed_1792602672415.jpg',
  upiId: 'alex.reed@okhdfcbank',
  bio: 'AI Creator & Studio Director',
  connectedAccounts: [
    { platform: 'YouTube', handle: '@FutureVisionAI', followersCount: 42000, connectedAt: '2023-06-15' },
    { platform: 'Instagram', handle: '@synthetix.ai', followersCount: 9400, connectedAt: '2023-07-01' },
    { platform: 'Facebook', handle: 'Synthetix Page', followersCount: 18000, connectedAt: '2023-06-20' }
  ]
};

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-01',
    title: 'Cybernetic Future & Neural Cities',
    topic: 'How autonomous cybernetic systems and AI infrastructure will reshape megacities by 2050',
    language: 'ENGLISH',
    aspectRatio: '16:9',
    durationSec: 105,
    tone: 'Cinematic & Futuristic',
    status: 'COMPLETED',
    renderProgress: 100,
    thumbnailUrl: '/assets/cyber_city_scene_1792602671674.jpg',
    finalVideoUrl: '/assets/cyber_city_scene_1792602671674.jpg',
    createdAt: '2026-10-21',
    scheduledFor: '2026-10-24T10:00:00.000Z',
    views: 48920,
    revenueEst: 840.50,
    scenes: [
      {
        id: 'scene-1',
        sequenceOrder: 1,
        sceneText: 'By 2050, the concept of a static city will cease to exist. Every skyscraper will think and adapt.',
        visualPrompt: 'Futuristic neo-cyberpunk cityscape at dusk, glowing holographic billboards, cinematic 8k render',
        imageUrl: '/assets/cyber_city_scene_1792602671674.jpg',
        audioDurationSec: 5.5,
        transitionEffect: 'zoom',
        wordTimestamps: [
          { word: 'By', start: 0.1, end: 0.4 },
          { word: '2050,', start: 0.4, end: 0.9 },
          { word: 'cities', start: 0.9, end: 1.5 },
          { word: 'will', start: 1.5, end: 1.8 },
          { word: 'think.', start: 1.8, end: 2.4 }
        ]
      },
      {
        id: 'scene-2',
        sequenceOrder: 2,
        sceneText: 'Autonomous synthetic minds orchestrate energy grids, high-speed transit, and atmospheric balances in real time.',
        visualPrompt: 'Hyperrealistic generative android cyborg silhouette with illuminated blue optical circuits, cinematic rim lighting',
        imageUrl: '/assets/android_ai_scene_1792602672297.jpg',
        audioDurationSec: 6.2,
        transitionEffect: 'glitch',
        wordTimestamps: [
          { word: 'Autonomous', start: 0.2, end: 0.8 },
          { word: 'synthetic', start: 0.8, end: 1.3 },
          { word: 'minds', start: 1.3, end: 1.7 },
          { word: 'balance', start: 1.7, end: 2.2 },
          { word: 'megacities.', start: 2.2, end: 3.1 }
        ]
      },
      {
        id: 'scene-3',
        sequenceOrder: 3,
        sceneText: 'What was once science fiction is now the blueprint of tomorrow.',
        visualPrompt: 'High-altitude panoramic view of illuminated vertical skybridges and quantum data streams',
        imageUrl: '/assets/cyber_city_scene_1792602671674.jpg',
        audioDurationSec: 4.8,
        transitionEffect: 'fade',
        wordTimestamps: [
          { word: 'Tomorrow', start: 0.1, end: 0.6 },
          { word: 'is', start: 0.6, end: 0.9 },
          { word: 'already', start: 0.9, end: 1.4 },
          { word: 'here.', start: 1.4, end: 2.0 }
        ]
      }
    ]
  },
  {
    id: 'proj-02',
    title: 'Finance 101: Market Trends & Alpha',
    topic: 'Demystifying algorithmic order flow and macroeconomic liquidity in under 60 seconds',
    language: 'ENGLISH',
    aspectRatio: '9:16',
    durationSec: 58,
    tone: 'High Energy & Urgent',
    status: 'COMPLETED',
    renderProgress: 100,
    thumbnailUrl: '/assets/finance_shorts_scene_1792602672698.jpg',
    finalVideoUrl: '/assets/finance_shorts_scene_1792602672698.jpg',
    createdAt: '2026-10-20',
    scheduledFor: '2026-10-23T15:30:00.000Z',
    views: 31200,
    revenueEst: 512.20,
    scenes: [
      {
        id: 'scene-201',
        sequenceOrder: 1,
        sceneText: '90% of retail investors look at price charts wrong. Here is how institutional algorithms trade.',
        visualPrompt: 'Modern sleek financial market analytics visualization, vertical mobile format, 3d glowing abstract economic charts',
        imageUrl: '/assets/finance_shorts_scene_1792602672698.jpg',
        audioDurationSec: 5.0,
        transitionEffect: 'zoom'
      }
    ]
  },
  {
    id: 'proj-03',
    title: 'AI Productivity Secrets for Creators',
    topic: 'How top YouTubers produce 10x shorts using multi-agent scripting and automated rendering',
    language: 'HINGLISH',
    aspectRatio: '9:16',
    durationSec: 62,
    tone: 'Actionable & Fast-Paced',
    status: 'COMPLETED',
    renderProgress: 100,
    thumbnailUrl: '/assets/android_ai_scene_1792602672297.jpg',
    createdAt: '2026-10-19',
    views: 64200,
    revenueEst: 1120.00,
    scenes: [
      {
        id: 'scene-301',
        sequenceOrder: 1,
        sceneText: 'Agar aap daily shorts nahi bana rahe, toh aap thousands of subscribers miss kar rahe ho.',
        visualPrompt: 'Dynamic workflow studio showing automated AI video rendering monitors',
        imageUrl: '/assets/android_ai_scene_1792602672297.jpg',
        audioDurationSec: 5.4,
        transitionEffect: 'wipe'
      }
    ]
  },
  {
    id: 'proj-04',
    title: 'Space Mysteries: Black Hole Soundwaves',
    topic: 'Sonification of gravitational ripples from Sagittarius A*',
    language: 'ENGLISH',
    aspectRatio: '16:9',
    durationSec: 90,
    tone: 'Curious & Awe-Inspiring',
    status: 'RENDERING',
    renderProgress: 65,
    thumbnailUrl: '/assets/cyber_city_scene_1792602671674.jpg',
    createdAt: '2026-10-21',
    scenes: []
  }
];

export const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: 'key-1',
    name: 'PROD_V3_KEY',
    provider: 'GROQ_LLAMA3',
    providerId: 'groq',
    status: 'ACTIVE',
    monthlyQuota: 10000,
    usedThisMonth: 8451,
    activeRequests: 2,
    concurrencyLimit: 10,
    costTotal: 18.42,
    lastUsed: 'Just now'
  },
  {
    id: 'key-2',
    name: 'STAGING_DEV_1',
    provider: 'OPENROUTER',
    providerId: 'openrouter',
    status: 'ACTIVE',
    monthlyQuota: 5000,
    usedThisMonth: 212,
    activeRequests: 0,
    concurrencyLimit: 5,
    costTotal: 4.15,
    lastUsed: '12m ago'
  },
  {
    id: 'key-3',
    name: 'IMAGE_POLLINATIONS',
    provider: 'POLLINATIONS',
    providerId: 'pollinations',
    status: 'EXHAUSTED',
    monthlyQuota: 15000,
    usedThisMonth: 15000,
    activeRequests: 0,
    concurrencyLimit: 8,
    costTotal: 0.00,
    lastUsed: '1h ago'
  },
  {
    id: 'key-4',
    name: 'VOICE_EDGE_CLUSTER',
    provider: 'EDGE_TTS',
    providerId: 'edge-tts',
    status: 'ACTIVE',
    monthlyQuota: 50000,
    usedThisMonth: 34120,
    activeRequests: 3,
    concurrencyLimit: 15,
    costTotal: 0.00,
    lastUsed: '3s ago'
  },
  {
    id: 'key-5',
    name: 'BACKUP_FAILOVER_KEY',
    provider: 'GROQ_LLAMA3',
    providerId: 'groq',
    status: 'RATE_LIMITED',
    monthlyQuota: 10000,
    usedThisMonth: 9800,
    activeRequests: 0,
    concurrencyLimit: 5,
    rateLimitResetSeconds: 42,
    costTotal: 14.80,
    lastUsed: '18s ago'
  }
];

export const INITIAL_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'led-1',
    date: '2026-10-21 09:14',
    type: 'MARKETPLACE_SALE_PROCEEDS',
    amount: 144.00,
    postBalance: 4850.70,
    description: 'Sale proceeds for "Cybernetic Future" template (80% net proceeds)',
    referenceId: 'ORD-9821'
  },
  {
    id: 'led-2',
    date: '2026-10-20 18:30',
    type: 'AFFILIATE_PAYOUT',
    amount: 82.50,
    postBalance: 4706.70,
    description: 'Affiliate commission credit (Amazon Tech Gear referral bundle)',
    referenceId: 'AFF-3319'
  },
  {
    id: 'led-3',
    date: '2026-10-18 11:00',
    type: 'WITHDRAWAL_SETTLED',
    amount: -1200.00,
    postBalance: 4624.20,
    description: 'Direct UPI Settlement to alex.reed@okhdfcbank',
    referenceId: 'PAY-11029'
  },
  {
    id: 'led-4',
    date: '2026-10-17 14:22',
    type: 'MARKETPLACE_SALE_PROCEEDS',
    amount: 220.00,
    postBalance: 5824.20,
    description: 'Sale proceeds for "Finance 101" viral template package',
    referenceId: 'ORD-8940'
  }
];

export const INITIAL_MARKETPLACE: MarketplaceItem[] = [
  {
    id: 'mkt-1',
    title: 'Cybernetic Future 8K Shorts Kit',
    category: 'Technology & AI',
    price: 49.00,
    creator: 'Alex Reed (Synthetix)',
    viewsEstimate: '250K+ avg',
    thumbnailUrl: '/assets/cyber_city_scene_1792602671674.jpg',
    previewUrl: '/assets/cyber_city_scene_1792602671674.jpg',
    salesCount: 142
  },
  {
    id: 'mkt-2',
    title: 'Crypto & Forex Micro-Breakdown Pack',
    category: 'Finance & Wealth',
    price: 39.00,
    creator: 'Quantum Capital',
    viewsEstimate: '180K+ avg',
    thumbnailUrl: '/assets/finance_shorts_scene_1792602672698.jpg',
    previewUrl: '/assets/finance_shorts_scene_1792602672698.jpg',
    salesCount: 89
  },
  {
    id: 'mkt-3',
    title: 'Android & Robotics Future Blueprint',
    category: 'Science & Robotics',
    price: 59.00,
    creator: 'Nexus Lab',
    viewsEstimate: '420K+ avg',
    thumbnailUrl: '/assets/android_ai_scene_1792602672297.jpg',
    previewUrl: '/assets/android_ai_scene_1792602672297.jpg',
    salesCount: 215
  }
];

export const INITIAL_SCHEDULE: ScheduledPost[] = [
  {
    id: 'sch-1',
    projectTitle: 'Cybernetic Future & Neural Cities',
    platform: 'YOUTUBE',
    scheduledTime: '10:00 AM (IST)',
    dateDay: 24,
    dateMonth: 'OCT',
    status: 'QUEUED'
  },
  {
    id: 'sch-2',
    projectTitle: 'Cybernetic Future & Neural Cities',
    platform: 'FACEBOOK',
    scheduledTime: '11:30 AM (IST)',
    dateDay: 24,
    dateMonth: 'OCT',
    status: 'QUEUED'
  },
  {
    id: 'sch-3',
    projectTitle: 'Finance 101: Market Trends & Alpha',
    platform: 'INSTAGRAM',
    scheduledTime: '06:00 PM (IST)',
    dateDay: 23,
    dateMonth: 'OCT',
    status: 'PROCESSING'
  },
  {
    id: 'sch-4',
    projectTitle: 'AI Productivity Secrets for Creators',
    platform: 'YOUTUBE',
    scheduledTime: '09:00 AM (IST)',
    dateDay: 21,
    dateMonth: 'OCT',
    status: 'PUBLISHED'
  }
];
