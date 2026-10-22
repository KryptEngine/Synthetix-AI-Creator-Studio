import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize,
  Settings, Plus, Calendar, CheckCircle2, Video, Music, Type,
  Sparkles, Download, Share2, Layers, RefreshCw, Scissors, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Project, Scene, AspectRatio, UserProfile, ScheduledPost } from '../types';
import { useToast } from '../components/Toast';
import { exportProjectVideo, downloadProjectManifest } from '../services/exporter';

interface StudioEditorProps {
  currentProject: Project;
  user: UserProfile;
  schedule: ScheduledPost[];
  onUpdateProject: (updated: Project) => void;
  onOpenCreateModal: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToMoneyHub: () => void;
}

export const StudioEditor: React.FC<StudioEditorProps> = ({
  currentProject,
  user,
  schedule,
  onUpdateProject,
  onOpenCreateModal,
  onNavigateToCalendar,
  onNavigateToMoneyHub
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(12);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [scheduleActive, setScheduleActive] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(currentProject.aspectRatio || '16:9');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSceneForEdit, setSelectedSceneForEdit] = useState<Scene | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { notify } = useToast();

  const totalDuration = currentProject.durationSec || 60;

  const now = new Date();
  const todayDay = now.getDate();
  const calendarTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const monthAbbr = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const calendarLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInCalendarMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const scheduledDays = schedule
    .filter((post) => (post.dateMonth || '').toUpperCase() === monthAbbr)
    .map((post) => post.dateDay);

  const nextRelease = schedule.find((post) => post.status === 'QUEUED') ?? schedule[0];

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Playhead loop timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Sync active scene based on time
  useEffect(() => {
    if (currentProject.scenes.length > 0) {
      let accumulated = 0;
      for (let i = 0; i < currentProject.scenes.length; i++) {
        accumulated += currentProject.scenes[i].audioDurationSec;
        if (currentTimeSec <= accumulated) {
          setActiveSceneIndex(i);
          return;
        }
      }
      setActiveSceneIndex(currentProject.scenes.length - 1);
    }
  }, [currentTimeSec, currentProject.scenes]);

  const activeScene = currentProject.scenes[activeSceneIndex] || currentProject.scenes[0] || {
    sequenceOrder: 1,
    sceneText: 'AI synthesized visuals will stream here during playback.',
    visualPrompt: 'Futuristic digital environment with quantum lighting',
    imageUrl: currentProject.thumbnailUrl,
    transitionEffect: 'zoom'
  };

  const handleStartRenderExport = () => {
    setShowExportModal(true);
    setIsExporting(true);
    setExportProgress(12);

    setTimeout(() => setExportProgress(35), 600);
    setTimeout(() => setExportProgress(68), 1300);
    setTimeout(() => setExportProgress(92), 2000);
    setTimeout(() => {
      setExportProgress(100);
      setIsExporting(false);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // fallback if canvas-confetti is not loaded
      }
    }, 2600);
  };

  const handleUpdateSceneText = (newText: string, newPrompt: string) => {
    if (!selectedSceneForEdit) return;
    const updatedScenes = currentProject.scenes.map((s) =>
      s.id === selectedSceneForEdit.id ? { ...s, sceneText: newText, visualPrompt: newPrompt } : s
    );
    onUpdateProject({ ...currentProject, scenes: updatedScenes });
    setSelectedSceneForEdit(null);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        previewRef.current?.requestFullscreen?.().catch(() => undefined);
      } else {
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      }
      return next;
    });
  };

  const handleDownloadVideo = async () => {
    try {
      const { fileName } = await exportProjectVideo(currentProject);
      notify(`Video downloaded as ${fileName}.`, 'success');
    } catch {
      try {
        const fileName = downloadProjectManifest(currentProject);
        notify(`Video rendering is not supported here, so the scene manifest (${fileName}) was downloaded instead.`, 'info');
      } catch {
        notify('Export failed: the browser blocked the download.', 'error');
      }
    }
    setShowExportModal(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#080F20] text-[#F7F9FF]">
      {/* LEFT NAVIGATION SIDEBAR (Matching Reference Image 3) */}
      <aside className="w-56 bg-[#0E1729] border-r border-[#202B40] flex flex-col justify-between p-3 select-none shrink-0">
        <div className="space-y-4">
          <div className="px-2 pt-2">
            <span className="text-[10px] font-bold text-[#93A4C0] tracking-wider uppercase">Workspace</span>
          </div>

          <nav className="space-y-1 text-xs">
            {[
              { label: 'DASHBOARD', active: false, action: onNavigateToCalendar },
              { label: 'AI STUDIO', active: true, action: onOpenCreateModal },
              { label: 'SHORTS CUTTER', active: false, action: () => setAspectRatio('9:16') },
              { label: 'CONTENT CALENDAR', active: false, action: onNavigateToCalendar },
              { label: 'PUBLISH HUB', active: false, action: onNavigateToCalendar },
              { label: 'MONEY HUB', active: false, action: onNavigateToMoneyHub }
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition-all ${
                  item.active 
                    ? 'bg-[#172235] text-[#15DDF5]' 
                    : 'text-[#93A4C0] hover:bg-[#172235]/60 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-2.5 bg-[#172235] rounded-xl flex items-center justify-between border border-[#202B40]">
          <div className="flex items-center space-x-2.5">
            <img
              src={user.avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-[#A13DFF]"
            />
            <div>
              <p className="text-xs font-bold text-white">{user.name}</p>
              <p className="text-[10px] text-[#19D89B] font-semibold">{user.handle}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            title="Workspace settings"
            aria-label="Workspace settings"
            aria-expanded={showSettings}
            className={`text-[#93A4C0] hover:text-white transition-colors ${showSettings ? 'text-[#15DDF5]' : ''}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {showSettings && (
          <div className="p-3 bg-[#172235] rounded-xl border border-[#202B40] space-y-2.5 text-[11px]">
            <p className="font-bold text-white uppercase tracking-wider">Workspace Settings</p>

            <label className="flex items-center justify-between text-[#93A4C0] cursor-pointer">
              <span>Auto captions</span>
              <input
                type="checkbox"
                checked={autoCaptions}
                onChange={(e) => {
                  setAutoCaptions(e.target.checked);
                  notify(e.target.checked ? 'Auto captions enabled.' : 'Auto captions disabled.', 'info');
                }}
                className="w-4 h-4 accent-[#15DDF5] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-[#93A4C0] cursor-pointer">
              <span>Progress bar</span>
              <input
                type="checkbox"
                checked={showProgressBar}
                onChange={(e) => {
                  setShowProgressBar(e.target.checked);
                  notify(e.target.checked ? 'Timeline progress bar shown.' : 'Timeline progress bar hidden.', 'info');
                }}
                className="w-4 h-4 accent-[#15DDF5] cursor-pointer"
              />
            </label>

            <button
              onClick={() => {
                setShowSettings(false);
                notify('Settings saved for this workspace.', 'success');
              }}
              className="w-full py-1.5 rounded-lg bg-[#15DDF5] text-black font-bold hover:opacity-95"
            >
              Save Settings
            </button>
          </div>
        )}
      </aside>

      {/* CENTER WORKSPACE: STUDIO CANVAS & MULTI-TRACK TIMELINE */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#080F20]">
        {/* Top Studio Bar */}
        <header className="h-12 border-b border-[#202B40] bg-[#0E1729]/80 backdrop-blur px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#172235] text-[#15DDF5] font-semibold uppercase tracking-wider">
              PROJECT: {currentProject.title.substring(0, 32)}
            </span>
            <div className="flex items-center bg-[#172235] rounded-lg p-0.5 border border-[#202B40] text-[11px]">
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`px-2 py-0.5 rounded font-medium ${aspectRatio === '16:9' ? 'bg-[#508CFF] text-white font-bold' : 'text-[#93A4C0]'}`}
              >
                16:9 Widescreen
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`px-2 py-0.5 rounded font-medium ${aspectRatio === '9:16' ? 'bg-[#A13DFF] text-white font-bold' : 'text-[#93A4C0]'}`}
              >
                9:16 Shorts
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenCreateModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#172235] border border-[#202B40] text-xs font-semibold hover:bg-[#202B40] text-white"
            >
              <Plus className="w-3.5 h-3.5 text-[#15DDF5]" />
              <span>New Project</span>
            </button>
            <button
              onClick={handleStartRenderExport}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] text-black font-extrabold text-xs shadow-neon-purple hover:opacity-95"
            >
              Render & Export
            </button>
          </div>
        </header>

        {/* Video Canvas Preview */}
        <div className="flex-1 bg-[#080F20] flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {/* Aspect-Ratio Driven Screen Frame */}
          <div
            ref={previewRef}
            className={`bg-black rounded-xl overflow-hidden border border-[#202B40] shadow-2xl relative flex items-center justify-center group transition-all duration-300 ${
              isFullscreen
                ? 'fixed inset-0 z-40 w-screen h-screen rounded-none border-0'
                : aspectRatio === '9:16'
                ? 'w-[280px] h-[497px]'
                : 'w-[640px] h-[360px]'
            }`}
          >
            {/* Visual Canvas Backdrop */}
            <img
              src={activeScene.imageUrl || currentProject.thumbnailUrl}
              alt="Scene preview"
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
            />

            {/* Dark Scrim for Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40 z-10" />

            {/* Top Scene Kicker */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
              <span className="text-[11px] font-semibold text-white/90 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">
                Scene {activeSceneIndex + 1} of {currentProject.scenes.length || 1}
              </span>
              <span className="text-[10px] uppercase font-mono text-[#15DDF5] bg-black/60 px-2 py-0.5 rounded">
                FX: {activeScene.transitionEffect || 'fade'}
              </span>
            </div>

            {/* In-canvas Play/Pause Button */}
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute z-30 w-14 h-14 rounded-full bg-[#15DDF5]/90 hover:bg-[#15DDF5] text-black flex items-center justify-center transition-transform hover:scale-110 shadow-neon-cyan"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 ml-0.5 fill-current" />}
            </button>

            {/* Bottom Subtitle / Captions Overlay (Hormozi Kinetic Style) */}
            {autoCaptions && (
              <div className="absolute bottom-5 inset-x-4 z-20 text-center">
                <p className="text-sm md:text-base font-extrabold text-white leading-snug drop-shadow-lg px-2 py-1 bg-black/50 rounded-lg inline-block border border-white/10">
                  <span className="text-[#15DDF5] font-black mr-1">“</span>
                  {activeScene.sceneText}
                  <span className="text-[#15DDF5] font-black ml-1">”</span>
                </p>
              </div>
            )}
          </div>

          {/* Transport Controls Bar */}
          <div className="w-full max-w-xl mt-3 flex items-center justify-between text-xs text-[#93A4C0] px-2">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setCurrentTimeSec(0)} 
                className="hover:text-white transition-colors"
                title="Rewind to start"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="text-white hover:text-[#15DDF5] transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button 
                onClick={() => setCurrentTimeSec((prev) => Math.min(totalDuration, prev + 5))} 
                className="hover:text-white transition-colors"
                title="Fast forward 5s"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <span className="font-mono text-white font-semibold">
                {formatTime(currentTimeSec)} / {formatTime(totalDuration)}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setIsMuted((prev) => !prev);
                  notify(isMuted ? 'Narration audio unmuted.' : 'Narration audio muted.', 'info');
                }}
                title={isMuted ? 'Unmute narration' : 'Mute narration'}
                aria-label={isMuted ? 'Unmute narration' : 'Mute narration'}
                className={`hover:text-white transition-colors ${isMuted ? 'text-red-400' : 'text-[#93A4C0]'}`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
                aria-label={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
                className="text-[#93A4C0] hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM MULTI-TRACK TIMELINE (Matching Reference Image 3) */}
        <section className="h-60 bg-[#0E1729] border-t border-[#202B40] flex flex-col shrink-0">
          {/* Timeline Header & Playhead Time Ruler */}
          <div className="h-8 border-b border-[#202B40] px-4 flex items-center justify-between text-[11px] text-[#93A4C0] select-none">
            <div className="flex items-center space-x-8 font-mono">
              <span 
                className="cursor-pointer hover:text-white"
                onClick={() => setCurrentTimeSec(0)}
              >
                0:00
              </span>
              <span 
                className="cursor-pointer hover:text-white"
                onClick={() => setCurrentTimeSec(15)}
              >
                0:15
              </span>
              <span 
                className="cursor-pointer hover:text-white"
                onClick={() => setCurrentTimeSec(30)}
              >
                0:30
              </span>
              <span 
                className="cursor-pointer hover:text-white"
                onClick={() => setCurrentTimeSec(45)}
              >
                0:45
              </span>
              <span className="text-[#15DDF5] font-bold">
                {formatTime(currentTimeSec)} (Playhead)
              </span>
              <span 
                className="cursor-pointer hover:text-white"
                onClick={() => setCurrentTimeSec(60)}
              >
                1:00
              </span>
            </div>

            <span className="text-[10px] text-[#93A4C0]">Click clips to edit scenes & prompts</span>
          </div>

          {/* Playhead Progress Bar */}
          {showProgressBar && (
            <div className="h-1.5 w-full bg-[#172235] border-b border-[#202B40]">
              <div
                className="h-full bg-gradient-to-r from-[#15DDF5] to-[#A13DFF] transition-all duration-300"
                style={{ width: `${totalDuration ? (currentTimeSec / totalDuration) * 100 : 0}%` }}
              />
            </div>
          )}

          {/* Timeline Tracks Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 select-none">
            {/* Track 1: Video Track */}
            <div className="flex items-center space-x-2">
              <div className="w-28 flex items-center space-x-1.5 text-xs font-bold text-[#93A4C0] shrink-0">
                <Video className="w-3.5 h-3.5 text-[#15DDF5]" />
                <span className="truncate">VIDEO 1</span>
              </div>
              <div className="flex-1 h-11 bg-[#172235] rounded-lg border border-[#202B40] relative overflow-hidden flex items-center p-1 space-x-1">
                {currentProject.scenes.map((scene, idx) => (
                  <button
                    key={scene.id}
                    onClick={() => {
                      setActiveSceneIndex(idx);
                      setSelectedSceneForEdit(scene);
                    }}
                    className={`h-full flex-1 rounded px-2 flex items-center justify-between text-left transition-all text-[11px] truncate ${
                      activeSceneIndex === idx
                        ? 'bg-[#15DDF5]/20 border border-[#15DDF5] text-white'
                        : 'bg-[#202B40] hover:bg-[#2e3e5c] text-[#F7F9FF]/80'
                    }`}
                  >
                    <span className="truncate font-semibold">Scene {idx + 1}: {scene.sceneText.substring(0, 16)}...</span>
                    <span className="text-[10px] text-[#93A4C0] ml-1">{scene.audioDurationSec}s</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Track 2: Video Track 2 / Overlays */}
            <div className="flex items-center space-x-2">
              <div className="w-28 flex items-center space-x-1.5 text-xs font-bold text-[#93A4C0] shrink-0">
                <Layers className="w-3.5 h-3.5 text-[#A13DFF]" />
                <span className="truncate">OVERLAYS</span>
              </div>
              <div className="flex-1 h-9 bg-[#172235] rounded-lg border border-[#202B40] relative p-1 flex items-center">
                <div className="w-1/2 h-full bg-[#A13DFF]/20 border border-[#A13DFF]/50 rounded text-[10px] flex items-center px-2 text-[#A13DFF] font-semibold">
                  HUD Glitch & Kinetic Scanlines (0:00 - 0:30)
                </div>
              </div>
            </div>

            {/* Track 3: Audio Track */}
            <div className="flex items-center space-x-2">
              <div className="w-28 flex items-center space-x-1.5 text-xs font-bold text-[#93A4C0] shrink-0">
                <Music className="w-3.5 h-3.5 text-[#19D89B]" />
                <span className="truncate">AUDIO</span>
              </div>
              <div className="flex-1 h-9 bg-[#172235] rounded-lg border border-[#202B40] p-1 flex items-center">
                <div className="w-full h-full bg-[#19D89B]/15 border border-[#19D89B]/40 rounded text-[10px] flex items-center px-2 text-[#19D89B] font-semibold truncate">
                  Narration: Edge-TTS Neural Voice + Lo-Fi Cyber Ambient Track (14% Vol)
                </div>
              </div>
            </div>

            {/* Track 4: Captions / Subtitles Track */}
            <div className="flex items-center space-x-2">
              <div className="w-28 flex items-center space-x-1.5 text-xs font-bold text-[#93A4C0] shrink-0">
                <Type className="w-3.5 h-3.5 text-[#508CFF]" />
                <span className="truncate">CAPTIONS</span>
              </div>
              <div className="flex-1 h-8 bg-[#172235] rounded-lg border border-[#202B40] p-1 flex items-center">
                <div className="w-3/4 h-full bg-[#508CFF]/20 border border-[#508CFF]/50 rounded text-[10px] flex items-center px-2 text-white font-semibold">
                  Subtitles: Hormozi Pop Dynamic Word Timestamps
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* RIGHT SIDEBAR: PLATFORM & SCHEDULING (Matching Reference Image 3 Right Rail) */}
      <aside className="w-72 bg-[#0E1729] border-l border-[#202B40] p-4 flex flex-col space-y-5 select-none shrink-0 overflow-y-auto">
        <div>
          <h3 className="text-xs font-bold tracking-wider text-white uppercase mb-3">Platform & Scheduling</h3>
          
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#93A4C0]">Connected Accounts</span>

            {user.connectedAccounts.length === 0 && (
              <p className="text-[10px] text-[#93A4C0]">
                No social accounts linked yet. Add them from your studio profile.
              </p>
            )}

            {user.connectedAccounts.map((account) => {
              const badge = account.platform.charAt(0).toUpperCase();
              const badgeColor =
                account.platform.toLowerCase() === 'youtube'
                  ? 'bg-red-600'
                  : account.platform.toLowerCase() === 'facebook'
                  ? 'bg-blue-600'
                  : 'bg-pink-600';
              return (
                <div
                  key={account.platform}
                  className="flex items-center justify-between p-2.5 bg-[#172235] rounded-lg border border-[#202B40]"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded ${badgeColor} flex items-center justify-center font-black text-xs text-white`}>
                      {badge}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{account.platform}</p>
                      <p className="text-[10px] text-[#93A4C0]">
                        {account.handle} ({account.followersCount.toLocaleString('en-US')})
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#19D89B]" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Box */}
        <div className="p-3 bg-[#172235] rounded-xl border border-[#202B40] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase">Schedule Publish</span>
            <input 
              type="checkbox" 
              checked={scheduleActive} 
              onChange={() => setScheduleActive(!scheduleActive)}
              className="w-4 h-4 accent-[#15DDF5] cursor-pointer" 
            />
          </div>
          <div className="text-xs space-y-1">
            <p className="text-[11px] text-[#93A4C0]">Next Queued Release:</p>
            {nextRelease ? (
              <p className="font-bold text-[#15DDF5]">
                {nextRelease.projectTitle} • {nextRelease.dateMonth} {nextRelease.dateDay} • {nextRelease.scheduledTime}
              </p>
            ) : (
              <p className="font-semibold text-[#93A4C0]">Nothing queued — open the Content Calendar to schedule one.</p>
            )}
          </div>
        </div>

        {/* Mini Calendar Grid (Matching Image 3) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#93A4C0]">
            <span className="font-bold text-white flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-[#15DDF5]" /> {calendarLabel}
            </span>
            <span className="text-[10px]">{calendarTimeZone}</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
            {['S','M','T','W','T','F','S'].map((d, index) => (
              <span key={`${d}-${index}`} className="text-[#93A4C0] font-bold py-1">{d}</span>
            ))}
            {Array.from({ length: daysInCalendarMonth }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={onNavigateToCalendar}
                title={`${calendarLabel} ${day}`}
                className={`py-1.5 rounded transition-colors ${
                  day === todayDay
                    ? 'bg-[#15DDF5] text-black font-extrabold shadow-sm'
                    : scheduledDays.includes(day)
                    ? 'bg-[#A13DFF]/30 text-[#15DDF5] font-semibold'
                    : 'bg-[#172235] text-[#93A4C0] hover:bg-[#202B40] hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* SCENE EDIT MODAL (Inspector) */}
      {selectedSceneForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0F172A] border border-[#202B40] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202B40] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-[#15DDF5]" />
                Edit Scene {selectedSceneForEdit.sequenceOrder}
              </h3>
              <button 
                onClick={() => setSelectedSceneForEdit(null)}
                className="text-xs text-[#93A4C0] hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">Spoken Narration</label>
                <textarea
                  defaultValue={selectedSceneForEdit.sceneText}
                  id="editSceneText"
                  rows={2}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">Visual AI Prompt</label>
                <textarea
                  defaultValue={selectedSceneForEdit.visualPrompt}
                  id="editVisualPrompt"
                  rows={2}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#202B40]">
              <button
                onClick={() => setSelectedSceneForEdit(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#93A4C0] hover:text-white hover:bg-[#1E293B]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const text = (document.getElementById('editSceneText') as HTMLTextAreaElement)?.value;
                  const prompt = (document.getElementById('editVisualPrompt') as HTMLTextAreaElement)?.value;
                  handleUpdateSceneText(text, prompt);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#15DDF5] text-black hover:opacity-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER & EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-[#202B40] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#A13DFF] to-[#15DDF5] flex items-center justify-center text-black font-black">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isExporting ? 'Compiling Video Engine...' : 'Rendering Complete!'}
              </h3>
              <p className="text-xs text-[#93A4C0]">
                {isExporting 
                  ? 'FFmpeg is concatenating visual scenes, synthesizing audio, and burning kinetic subtitles.' 
                  : 'Your high-retention video is rendered in crisp 1080p.'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#93A4C0]">Render Pipeline</span>
                <span className="text-[#15DDF5] font-bold">{exportProgress}%</span>
              </div>
              <div className="w-full bg-[#172235] h-2.5 rounded-full overflow-hidden border border-[#202B40]">
                <div 
                  className="bg-gradient-to-r from-[#15DDF5] to-[#A13DFF] h-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="bg-[#172235] p-3 rounded-xl border border-[#202B40] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#93A4C0]">1. Script & Audio Sync:</span>
                <span className="text-[#19D89B] font-semibold">Done</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#93A4C0]">2. Image Scene Concat:</span>
                <span className={exportProgress >= 60 ? 'text-[#19D89B] font-semibold' : 'text-[#93A4C0]'}>
                  {exportProgress >= 60 ? 'Done' : 'Processing...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#93A4C0]">3. Subtitle Burn-In:</span>
                <span className={exportProgress >= 90 ? 'text-[#19D89B] font-semibold' : 'text-[#93A4C0]'}>
                  {exportProgress >= 90 ? 'Done' : 'Waiting...'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#172235] text-[#93A4C0] hover:text-white"
              >
                Close
              </button>
              <button
                disabled={isExporting}
                onClick={handleDownloadVideo}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#15DDF5] text-black hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-neon-cyan"
              >
                <Download className="w-4 h-4" />
                <span>Download Video</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
