import React from 'react';
import { Video, BarChart3, Smartphone, Calendar, Coins, Sparkles, LogOut } from 'lucide-react';
import { UserProfile, UserRole } from '../types';

export type ActiveTab = 'studio' | 'admin' | 'mobile' | 'calendar' | 'marketplace';

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCreateModal: () => void;
  onOpenDownloadModal: () => void;
  onSignOut: () => void;
  user: UserProfile;
  role: UserRole;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenCreateModal,
  onOpenDownloadModal,
  onSignOut,
  user,
  role
}) => {
  const isAdmin = ADMIN_ROLES.includes(role);

  return (
    <header className="h-16 bg-[#0B132B] border-b border-[#202B40] px-6 flex items-center justify-between gap-8 shrink-0 select-none z-50">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button 
          onClick={() => onTabChange('studio')}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#A13DFF] to-[#15DDF5] flex items-center justify-center font-black text-sm text-black shadow-neon-cyan">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#15DDF5] transition-colors whitespace-nowrap">
            Synthetix AI
          </span>
        </button>
      </div>

      {/* Zone 2: Primary Navigation Tabs (Single line, subtle active state) */}
      <nav className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium overflow-x-auto py-1">
        <button
          onClick={() => onTabChange('studio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'studio'
              ? 'bg-[#172235] text-[#15DDF5] font-semibold'
              : 'text-[#93A4C0] hover:text-white hover:bg-[#121B2D]'
          }`}
        >
          <Video className="w-4 h-4 text-[#15DDF5]" />
          <span>AI Studio</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => onTabChange('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'admin'
                ? 'bg-[#172235] text-[#15DDF5] font-semibold'
                : 'text-[#93A4C0] hover:text-white hover:bg-[#121B2D]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#A13DFF]" />
            <span>Super Admin</span>
          </button>
        )}

        <button
          onClick={() => onTabChange('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'mobile'
              ? 'bg-[#172235] text-[#15DDF5] font-semibold'
              : 'text-[#93A4C0] hover:text-white hover:bg-[#121B2D]'
          }`}
        >
          <Smartphone className="w-4 h-4 text-[#19D89B]" />
          <span>Mobile PWA</span>
        </button>

        <button
          onClick={() => onTabChange('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'calendar'
              ? 'bg-[#172235] text-[#15DDF5] font-semibold'
              : 'text-[#93A4C0] hover:text-white hover:bg-[#121B2D]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#508CFF]" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => onTabChange('marketplace')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'marketplace'
              ? 'bg-[#172235] text-[#15DDF5] font-semibold'
              : 'text-[#93A4C0] hover:text-white hover:bg-[#121B2D]'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Money Hub</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action & Profile Status */}
      <div className="flex items-center gap-2.5 shrink-0">
        {isAdmin && (
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#172235] hover:bg-[#202B40] border border-[#15DDF5]/50 text-[#15DDF5] font-bold text-xs transition-colors whitespace-nowrap shrink-0 shadow-neon-cyan/20 active:scale-98"
            title="Download Complete Source Code ZIP"
          >
            <span>📦 Download ZIP</span>
          </button>
        )}

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] text-black font-extrabold text-xs shadow-neon-cyan hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Video</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#202B40]">
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-[#202B40]"
          />
          <span className="text-xs font-medium text-[#F7F9FF] whitespace-nowrap">{user.name}</span>
          <span className="rounded bg-[#172235] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#A13DFF]">
            {role.replace('_', ' ')}
          </span>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#202B40] text-[#93A4C0] transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
