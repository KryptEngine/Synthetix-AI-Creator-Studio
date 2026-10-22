import React, { useState } from 'react';
import { X, Sparkles, Wand2, Clock, Globe, Film, Layers, Check } from 'lucide-react';
import { SupportedLanguage, AspectRatio, Project } from '../types';
import { generateCreatorScript, convertGeneratedToScenes } from '../services/aiGenerator';
import { generateHindiYouTubeScript } from '../services/scriptGenerator';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (newProject: Project) => void;
}

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [topic, setTopic] = useState('Quantum Computing Breakthroughs in 2026');
  const [language, setLanguage] = useState<SupportedLanguage>('ENGLISH');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [durationSec, setDurationSec] = useState<number>(60);
  const [tone, setTone] = useState('Fast-Paced & Energetic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setErrorMessage('');
    try {
      // Hindi narration is generated alongside the structured breakdown.
      if (language === 'HINDI') {
        await generateHindiYouTubeScript({ topic, durationSec, tone });
      }

      const generated = await generateCreatorScript(topic, language, durationSec, tone);
      const imagesPool = [
        '/assets/cyber_city_scene_1792602671674.jpg',
        '/assets/android_ai_scene_1792602672297.jpg',
        '/assets/finance_shorts_scene_1792602672698.jpg'
      ];
      const scenes = convertGeneratedToScenes(generated.scenes, imagesPool, generated.images);

      const newProject: Project = {
        id: `proj-${Date.now()}`,
        title: generated.suggestedTitles[0] || topic,
        topic,
        language,
        aspectRatio,
        durationSec,
        tone,
        status: 'COMPLETED',
        renderProgress: 100,
        thumbnailUrl: scenes[0]?.imageUrl || imagesPool[0],
        finalVideoUrl: scenes[0]?.imageUrl || imagesPool[0],
        createdAt: new Date().toISOString().split('T')[0],
        scenes
      };

      console.log(
        `[AI] Script served by ${generated.meta.provider} (${generated.meta.model})` +
          (generated.meta.degraded ? ' — offline fallback engine' : '')
      );

      onProjectCreated(newProject);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Generation failed. Check the backend API is reachable.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0F172A] border border-[#202B40] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#202B40] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#A13DFF] to-[#15DDF5] flex items-center justify-center text-black font-black text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Generate AI Video Project</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93A4C0] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-5">
          {/* Topic Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#93A4C0]">Video Topic or Raw Idea</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="e.g. How neural networks learn in 60 seconds with simple analogies..."
              className="w-full bg-[#172235] border border-[#202B40] rounded-xl p-3 text-sm text-white placeholder-[#93A4C0]/50 focus:outline-none focus:border-[#15DDF5] resize-none"
              required
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#93A4C0] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#15DDF5]" />
                Language
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#172235] p-1 rounded-xl border border-[#202B40]">
                {(['ENGLISH', 'HINDI', 'HINGLISH'] as SupportedLanguage[]).map((lang) => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      language === lang 
                        ? 'bg-[#15DDF5] text-black font-bold' 
                        : 'text-[#93A4C0] hover:text-white'
                    }`}
                  >
                    {lang === 'ENGLISH' ? 'English' : lang === 'HINDI' ? 'हिन्दी' : 'Hinglish'}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#93A4C0] flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#A13DFF]" />
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#172235] p-1 rounded-xl border border-[#202B40]">
                {[
                  { id: '9:16', label: '9:16 Shorts' },
                  { id: '16:9', label: '16:9 Cinema' },
                  { id: '1:1', label: '1:1 Feed' }
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setAspectRatio(item.id as AspectRatio)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      aspectRatio === item.id 
                        ? 'bg-[#A13DFF] text-white font-bold' 
                        : 'text-[#93A4C0] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#93A4C0] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#19D89B]" />
                Target Duration: <span className="text-white font-mono">{durationSec}s</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[30, 60, 90].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDurationSec(d)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      durationSec === d 
                        ? 'border-[#19D89B] bg-[#19D89B]/15 text-[#19D89B]' 
                        : 'border-[#202B40] bg-[#172235] text-[#93A4C0] hover:text-white'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#93A4C0] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#508CFF]" />
                Content Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-[#172235] border border-[#202B40] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#508CFF]"
              >
                <option value="Fast-Paced & Energetic">Fast-Paced & Energetic</option>
                <option value="Cinematic & Atmospheric">Cinematic & Atmospheric</option>
                <option value="Explainer & Educational">Explainer & Educational</option>
                <option value="Financial & Analytical">Financial & Analytical</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#15DDF5] via-[#508CFF] to-[#A13DFF] text-black font-extrabold text-sm shadow-neon-cyan hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Wand2 className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing Script & Multi-Track Scenes...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-black" />
                  <span>Generate Video Architecture & Scenes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
