import { runWithFallback, GenerationResult, parseJsonLoose } from './aiEngine';

export interface GeneratedScene {
  sceneText: string;
  visualPrompt: string;
  durationSec: number;
  transition: 'fade' | 'zoom' | 'glitch' | 'wipe';
}

export interface GeneratedScript {
  hook: string;
  scenes: GeneratedScene[];
  suggestedTitles: string[];
  description: string;
  hashtags: string[];
}

export interface ScriptRequest {
  topic: string;
  language?: 'ENGLISH' | 'HINDI' | 'HINGLISH';
  durationSec?: number;
  tone?: string;
  preferredProviderId?: string;
}

const TRANSITIONS: GeneratedScene['transition'][] = ['zoom', 'glitch', 'fade', 'wipe'];

function buildSystemPrompt(): string {
  return `You are a world-class viral video director and copywriter.
You always answer with STRICT JSON and nothing else. No markdown, no code fences, no commentary.`;
}

function buildUserPrompt(req: Required<Pick<ScriptRequest, 'topic' | 'language' | 'durationSec' | 'tone'>>): string {
  const sceneCount = Math.max(3, Math.min(6, Math.round(req.durationSec / 10)));
  return `Create a high-retention video script breakdown for a ${req.durationSec} second video.
Topic: "${req.topic}"
Language: ${req.language}
Tone: ${req.tone}

Return JSON with exactly this shape:
{
  "hook": "Spoken opening hook under 10 words, in ${req.language}",
  "suggestedTitles": ["title 1", "title 2", "title 3"],
  "description": "Engaging YouTube/TikTok SEO description with a call to action, in ${req.language}",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "scenes": [
    {
      "sceneText": "Exact spoken narration for this scene, in ${req.language}",
      "visualPrompt": "Detailed photorealistic visual prompt for AI image generation, cinematic lighting",
      "durationSec": ${Math.round(req.durationSec / sceneCount)},
      "transition": "fade"
    }
  ]
}
Use exactly ${sceneCount} scenes. Durations must sum to about ${req.durationSec} seconds.
Allowed transition values: fade, zoom, glitch, wipe.`;
}

function normalize(raw: any, durationSec: number): GeneratedScript {
  const scenes: GeneratedScene[] = Array.isArray(raw?.scenes) ? raw.scenes : [];
  if (!scenes.length) throw new Error('Provider returned no scenes');

  const total = scenes.reduce((sum, s) => sum + (Number(s?.durationSec) || 0), 0) || durationSec;
  const scale = durationSec / total;

  return {
    hook: String(raw?.hook || '').trim() || `Did you know this about ${durationSec}s of video?`,
    scenes: scenes.map((s, index) => ({
      sceneText: String(s?.sceneText || '').trim(),
      visualPrompt: String(s?.visualPrompt || '').trim(),
      durationSec: Math.max(1, Math.round((Number(s?.durationSec) || 1) * scale)),
      transition: TRANSITIONS.includes(s?.transition) ? s.transition : TRANSITIONS[index % TRANSITIONS.length]
    })),
    suggestedTitles: Array.isArray(raw?.suggestedTitles)
      ? raw.suggestedTitles.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 5)
      : [],
    description: String(raw?.description || '').trim(),
    hashtags: Array.isArray(raw?.hashtags)
      ? raw.hashtags.map((h: any) => String(h).trim()).filter(Boolean).slice(0, 12)
      : []
  };
}

/**
 * Deterministic, non-placeholder script used only when every configured
 * provider fails. Keeps the editor usable offline.
 */
export function buildOfflineScript(req: Required<Pick<ScriptRequest, 'topic' | 'language' | 'durationSec' | 'tone'>>): GeneratedScript {
  const { topic, language, durationSec } = req;
  const isHindi = language === 'HINDI';
  const isHinglish = language === 'HINGLISH';
  const sceneCount = Math.max(3, Math.min(6, Math.round(durationSec / 10)));

  const hook = isHindi
    ? `क्या आप जानते हैं कि ${topic} दुनिया को कैसे बदल रहा है?`
    : isHinglish
      ? `Agar aapko lagta hai ${topic} simple hai, toh yeh ${durationSec} seconds aapki soch badal denge!`
      : `Did you know this shocking reality about ${topic}?`;

  const bodies = isHindi
    ? [
        `${topic} के बुनियादी सिद्धांतों को गहराई से समझना आज के समय में बेहद जरूरी हो गया है।`,
        'विशेषज्ञों के अनुसार, आने वाले कुछ ही सालों में इसके प्रभाव हर क्षेत्र में दिखेंगे।',
        'यही कारण है कि दुनिया भर के इनोवेटर्स अब इस दिशा में तेज़ी से आगे बढ़ रहे हैं।'
      ]
    : isHinglish
      ? [
          `Sabse pehla step hai ${topic} ke core principles ko master karna jo 99% creators miss kar dete hain.`,
          'Industry leaders is methodology ko automate karke 10x output generate kar rahe hain.',
          'Agar aap abhi se action lenge, toh next 6 months me exponential growth guaranteed hai.'
        ]
      : [
          `The exponential rise of ${topic} is fundamentally redefining what is possible across global industries.`,
          'Cutting-edge automated architectures process complex multi-modal inputs in milliseconds.',
          'Those who adapt today will command the leading edge of tomorrow’s creator economy.'
        ];

  return {
    hook,
    scenes: Array.from({ length: sceneCount }, (_, index) => ({
      sceneText: bodies[index % bodies.length],
      visualPrompt: `Cinematic 8k visualization representing ${topic}, shot ${index + 1}, volumetric neon violet and cyan rim lighting`,
      durationSec: Math.round(durationSec / sceneCount),
      transition: TRANSITIONS[index % TRANSITIONS.length]
    })),
    suggestedTitles: [
      `The Untold Truth About ${topic}`,
      `Mastering ${topic} in ${durationSec} Seconds`,
      `Why Everyone Is Talking About ${topic}`
    ],
    description: `Deep-dive exploration of ${topic}. Subscribe for daily high-leverage insights.`,
    hashtags: ['#AI', '#TechInnovation', '#CreatorEconomy', '#ViralShorts']
  };
}

export async function generateScript(req: ScriptRequest): Promise<GenerationResult<GeneratedScript>> {
  const full = {
    topic: req.topic.trim(),
    language: req.language || 'ENGLISH',
    durationSec: req.durationSec || 60,
    tone: req.tone || 'Cinematic'
  };

  try {
    return await runWithFallback<GeneratedScript>(
      [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(full) }
      ],
      (raw) => normalize(parseJsonLoose(raw), full.durationSec),
      { jsonMode: true, temperature: 0.7, maxTokens: 3000, preferredProviderId: req.preferredProviderId }
    );
  } catch (err: any) {
    return {
      data: buildOfflineScript(full),
      provider: 'Offline Deterministic Engine',
      model: 'local-fallback',
      attempts: err?.attempts || [],
      degraded: true
    };
  }
}

export interface NarrationRequest {
  topic: string;
  durationSec?: number;
  tone?: string;
  preferredProviderId?: string;
}

/**
 * Free-form narration script (no JSON contract) for Hindi/Hinglish voiceovers.
 */
export async function generateNarration(req: NarrationRequest): Promise<GenerationResult<string>> {
  const durationSec = req.durationSec || 45;
  const system = `You are an elite YouTube Shorts copywriter. Write a natural, high-retention ${durationSec}-second
voiceover script in Hindi (Devanagari script). No camera directions, no music cues, no timestamps, no speaker tags.
Structure: arresting hook -> core insight -> climax -> call to action.`;

  const user = `Topic: "${req.topic.trim()}". Tone: ${req.tone || 'Cinematic'}. Write the complete script.`;

  try {
    return await runWithFallback<string>(
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      (raw) => raw.trim(),
      { temperature: 0.7, maxTokens: 700, preferredProviderId: req.preferredProviderId }
    );
  } catch (err: any) {
    const offline = `क्या आप जानते हैं कि ${req.topic.trim()} को लेकर दुनिया भर में कितनी बड़ी हलचल मची हुई है?
इंटरनेट पर इसके बारे में बहुत सी अधूरी बातें फैलाई जा रही हैं, लेकिन असली सच कुछ और ही है।
अगले कुछ ही सालों में यह हमारी रोज़मर्रा की ज़िंदगी और काम करने के तरीके को पूरी तरह बदल देगा।
तो इस बारे में आपकी क्या राय है? कमेंट्स में ज़रूर बताएं और सब्सक्राइब करें!`;
    return {
      data: offline,
      provider: 'Offline Deterministic Engine',
      model: 'local-fallback',
      attempts: err?.attempts || [],
      degraded: true
    };
  }
}
