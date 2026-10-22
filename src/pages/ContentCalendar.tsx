import React, { useState } from 'react';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle,
  Share2, Plus, Youtube, Facebook, Instagram, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ScheduledPost } from '../types';
import { useToast } from '../components/Toast';

interface ContentCalendarProps {
  schedule: ScheduledPost[];
  onAddSchedule: (post: ScheduledPost) => void;
  onOpenCreateModal: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const LOCAL_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const TIME_ZONE_OPTIONS = [
  'Asia/Kolkata (IST)',
  'America/New_York (EST)',
  'UTC (Universal)',
  LOCAL_TIME_ZONE
];

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
  schedule,
  onAddSchedule,
  onOpenCreateModal
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [timeZone, setTimeZone] = useState(LOCAL_TIME_ZONE);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const { notify } = useToast();

  const currentAbbr = MONTH_ABBR[viewMonth];
  const postsForView = schedule.filter((s) => (s.dateMonth || 'OCT').toUpperCase() === currentAbbr);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = new Date(viewYear, viewMonth, 1).getDay();

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(1);
  };

  const handleInstantPublish = (id: string) => {
    setPublishingId(id);
    setTimeout(() => {
      setPublishingId(null);
      notify('Post successfully published via Social Graph API!', 'success');
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#080F20] text-[#F7F9FF] p-6 space-y-6 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#202B40] gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#508CFF]" />
            Content Calendar & Publishing Hub
          </h1>
          <p className="text-xs text-[#93A4C0] mt-0.5">
            Automated multi-platform scheduling across YouTube Shorts, Instagram Reels, and Facebook
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeZone}
            onChange={(e) => {
              setTimeZone(e.target.value);
              notify(`Delivery timezone set to ${e.target.value}.`, 'info');
            }}
            className="bg-[#172235] border border-[#202B40] rounded-lg px-2.5 py-1.5 text-xs text-[#15DDF5] focus:outline-none"
          >
            {TIME_ZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz === LOCAL_TIME_ZONE ? `Local · ${tz}` : tz}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] text-black font-extrabold rounded-lg text-xs shadow-neon-cyan"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule New Short</span>
          </button>
        </div>
      </header>

      {/* Calendar Grid + Scheduled Queue Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Calendar View */}
        <div className="lg:col-span-2 bg-[#172235] border border-[#202B40] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <span className="text-[11px] text-[#93A4C0] font-normal">({postsForView.length} releases queued)</span>
            </h2>
            <div className="flex items-center space-x-1 text-xs">
              <button
                onClick={() => shiftMonth(-1)}
                title="Previous month"
                aria-label="Previous month"
                className="p-1 rounded bg-[#202B40] hover:text-[#15DDF5] text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setViewYear(2026);
                  setViewMonth(9);
                  setSelectedDay(24);
                  notify('Jumped to October 2026.', 'info');
                }}
                className="px-2 py-1 rounded bg-[#202B40] hover:text-[#15DDF5] text-white text-[11px] font-semibold transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => shiftMonth(1)}
                title="Next month"
                aria-label="Next month"
                className="p-1 rounded bg-[#202B40] hover:text-[#15DDF5] text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#93A4C0] font-semibold">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} className="min-h-[80px]" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const postsOnDay = postsForView.filter((s) => s.dateDay === day);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[80px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#15DDF5] bg-[#15DDF5]/10'
                      : 'border-[#202B40] bg-[#121B2D]/50 hover:bg-[#121B2D]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${isSelected ? 'text-[#15DDF5]' : 'text-white'}`}>
                      {day}
                    </span>
                    {postsOnDay.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#15DDF5]" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {postsOnDay.map((p) => (
                      <div
                        key={p.id}
                        className="text-[9px] truncate px-1.5 py-0.5 rounded bg-[#202B40] text-[#F7F9FF] font-semibold flex items-center gap-1"
                      >
                        {p.platform === 'YOUTUBE' && <span className="text-red-500">▶</span>}
                        {p.platform === 'FACEBOOK' && <span className="text-blue-500">f</span>}
                        {p.platform === 'INSTAGRAM' && <span className="text-pink-500">📸</span>}
                        <span className="truncate">{p.projectTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Queued Posts for Selected Day */}
        <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 space-y-4 flex flex-col">
          <div className="border-b border-[#202B40] pb-3">
            <h2 className="text-sm font-bold text-white">Releases on {MONTH_NAMES[viewMonth]} {selectedDay}, {viewYear}</h2>
            <p className="text-xs text-[#93A4C0]">Automated delivery time slots · {timeZone}</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {postsForView.filter((s) => s.dateDay === selectedDay).length === 0 ? (
              <div className="p-6 text-center text-xs text-[#93A4C0] space-y-2">
                <Clock className="w-8 h-8 mx-auto text-[#93A4C0]/50" />
                <p>No video scheduled for {MONTH_NAMES[viewMonth]} {selectedDay}.</p>
                <button
                  onClick={onOpenCreateModal}
                  className="px-3 py-1.5 rounded-lg bg-[#202B40] text-[#15DDF5] font-semibold hover:bg-[#2e3e5c]"
                >
                  Schedule one now
                </button>
              </div>
            ) : (
              postsForView
                .filter((s) => s.dateDay === selectedDay)
                .map((post) => (
                  <div
                    key={post.id}
                    className="p-3 bg-[#121B2D] border border-[#202B40] rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[180px]">
                        {post.projectTitle}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#172235] text-[#15DDF5]">
                        {post.platform}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#93A4C0]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#19D89B]" />
                        {post.scheduledTime}
                      </span>
                      <span className="text-[10px] text-[#19D89B] font-semibold">
                        {post.status}
                      </span>
                    </div>

                    <button
                      onClick={() => handleInstantPublish(post.id)}
                      disabled={publishingId === post.id}
                      className="w-full py-1.5 rounded-lg bg-[#202B40] hover:bg-[#2e3e5c] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#15DDF5]" />
                      <span>{publishingId === post.id ? 'Publishing...' : 'Dispatch Now'}</span>
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
