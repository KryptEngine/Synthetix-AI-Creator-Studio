import { Scene, SupportedLanguage } from '../types';
import { generateScript, GeneratedScriptResponse } from './api';

export interface GeneratedAIResponse {
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
  meta: GeneratedScriptResponse['meta'];
  images: GeneratedScriptResponse['images'];
}

/**
 * Script generation runs on the backend so provider credentials never reach
 * the browser. The backend walks the free-provider registry until one serves
 * the request.
 */
export async function generateCreatorScript(
  topic: string,
  language: SupportedLanguage = 'ENGLISH',
  durationSec: number = 60,
  tone: string = 'Cinematic',
  preferredProviderId?: string
): Promise<GeneratedAIResponse> {
  const result = await generateScript({
    topic,
    language,
    durationSec,
    tone,
    preferredProviderId,
    withImages: true
  });

  return {
    hook: result.hook,
    scenes: result.scenes,
    suggestedTitles: result.suggestedTitles,
    description: result.description,
    hashtags: result.hashtags,
    meta: result.meta,
    images: result.images
  };
}

export function convertGeneratedToScenes(
  generatedScenes: GeneratedAIResponse['scenes'],
  availableImageAssets: string[],
  generatedImages: GeneratedAIResponse['images'] = []
): Scene[] {
  return generatedScenes.map((s, index) => {
    const generated = generatedImages[index]?.url;
    const fallbackImage =
      generated || availableImageAssets[index % availableImageAssets.length] || '/assets/cyber_city_scene_1792602671674.jpg';
    return {
      id: `scene-gen-${Date.now()}-${index}`,
      sequenceOrder: index + 1,
      sceneText: s.sceneText,
      visualPrompt: s.visualPrompt,
      imageUrl: fallbackImage,
      audioDurationSec: s.durationSec,
      transitionEffect: s.transition,
      wordTimestamps: s.sceneText.split(' ').slice(0, 8).map((word, wIdx) => ({
        word,
        start: Number((wIdx * 0.4).toFixed(1)),
        end: Number(((wIdx + 1) * 0.4).toFixed(1))
      }))
    };
  });
}
