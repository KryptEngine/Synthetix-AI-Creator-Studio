/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Script Generator Service
 * Delegates to the backend AI gateway, which rotates across the configured
 * free LLM providers and falls back to the deterministic engine server-side.
 */

import { generateNarration } from './api';

/**
 * Generates a short YouTube video script in Hindi based on the provided topic.
 *
 * @param topic The subject matter for the short YouTube video
 * @returns Promise<string> The generated Hindi script text
 */
export async function generateHindiScript(topic: string): Promise<string> {
  if (!topic || !topic.trim()) {
    throw new Error('Topic must not be empty.');
  }

  const result = await generateNarration({
    topic: topic.trim(),
    durationSec: 45
  });

  console.group('%c🎬 [Script Generator] Hindi narration ready', 'color: #15DDF5; font-weight: bold;');
  console.log(result.script);
  console.log(
    `Provider: ${result.meta.provider} · Model: ${result.meta.model} · ~${result.estimatedDurationSec}s`
  );
  console.groupEnd();

  return result.script;
}

/**
 * Compatible wrapper for component consumers
 */
export async function generateHindiYouTubeScript(request: {
  topic: string;
  durationSec?: number;
  tone?: string;
  apiKey?: string;
  preferredProviderId?: string;
}) {
  const result = await generateNarration({
    topic: request.topic,
    durationSec: request.durationSec,
    tone: request.tone,
    preferredProviderId: request.preferredProviderId
  });

  return {
    topic: request.topic,
    language: 'Hindi (Devanagari)',
    model: result.meta.model,
    script: result.script,
    characterCount: result.script.length,
    wordCount: result.wordCount,
    estimatedDurationSec: result.estimatedDurationSec,
    provider: result.meta.provider,
    generatedAt: new Date().toISOString()
  };
}

export default generateHindiScript;
