/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { StudioEditor } from './pages/StudioEditor';
import { AdminDashboard } from './pages/AdminDashboard';
import { MobileApp } from './pages/MobileApp';
import { ContentCalendar } from './pages/ContentCalendar';
import { MarketplaceHub } from './pages/MarketplaceHub';
import { CreateVideoModal } from './components/CreateVideoModal';
import { DownloadModal } from './components/DownloadModal';
import { ToastProvider } from './components/Toast';
import { fetchBootstrap, saveProject, updateProject, saveSchedulePost } from './services/api';
import { fetchSession, logout, type SessionUser } from './services/api';
import { AuthGate } from './components/AuthGate';
import { Project, ApiKeyItem, LedgerEntry, ScheduledPost, MarketplaceItem, UserProfile, UserRole } from './types';

const DEFAULT_USER: UserProfile = {
  id: 'unknown',
  name: 'Creator',
  handle: '@creator',
  avatarUrl: '/assets/avatar_alex_reed_1792602672415.jpg',
  upiId: '',
  bio: '',
  connectedAccounts: []
};

const EMPTY_PROJECT: Project = {
  id: 'draft',
  title: 'New Project',
  topic: '',
  language: 'ENGLISH',
  aspectRatio: '9:16',
  durationSec: 60,
  tone: 'Cinematic',
  status: 'DRAFT',
  renderProgress: 0,
  thumbnailUrl: '/assets/cyber_city_scene_1792602671674.jpg',
  scenes: [],
  createdAt: new Date().toISOString().split('T')[0]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const [session, setSession] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project>(EMPTY_PROJECT);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduledPost[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSession()
      .then((data) => {
        if (cancelled) return;
        setSession(data.user);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchBootstrap()
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects);
        setCurrentProject(data.projects[0] ?? EMPTY_PROJECT);
        setApiKeys(data.apiKeys);
        setLedger(data.ledger);
        setMarketplaceItems(data.marketplace);
        setSchedule(data.schedule);
        setWalletBalance(data.walletBalance);
        setUser(data.user);
        setLoadError('');
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err?.message || 'Could not reach the studio API');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // The cookie is cleared server-side regardless; carry on to the gate.
    }
    setSession(null);
    setActiveTab('studio');
  };

  /** Re-reads everything from the API — used after a dataset restore. */
  const reloadFromServer = () => {
    fetchBootstrap()
      .then((data) => {
        setProjects(data.projects);
        setCurrentProject(data.projects[0] ?? EMPTY_PROJECT);
        setApiKeys(data.apiKeys);
        setLedger(data.ledger);
        setMarketplaceItems(data.marketplace);
        setSchedule(data.schedule);
        setWalletBalance(data.walletBalance);
        setUser(data.user);
      })
      .catch((err: Error) => console.warn('Reload failed:', err.message));
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects]);
    setCurrentProject(newProject);
    setActiveTab('studio');
    saveProject(newProject).catch((err: Error) => console.warn('Project not persisted:', err.message));
  };

  const handleUpdateProject = (updated: Project) => {
    setCurrentProject(updated);
    setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
    updateProject(updated).catch((err: Error) => console.warn('Project not persisted:', err.message));
  };

  const handleAddSchedule = (newPost: ScheduledPost) => {
    setSchedule([newPost, ...schedule]);
    saveSchedulePost(newPost).catch((err: Error) => console.warn('Schedule not persisted:', err.message));
  };

  const handleUpdateWallet = (newBal: number, newLedger: LedgerEntry[]) => {
    setWalletBalance(newBal);
    setLedger(newLedger);
  };

  if (isCheckingSession) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#080F20] font-sans text-[#93A4C0]">
        <div className="h-12 w-64 animate-pulse rounded-full bg-[#172235]/60" />
        <p className="text-xs">Checking your session…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthGate onAuthenticated={setSession} />;
  }

  const role: UserRole = session.role;
  const canAdminister = role === 'SUPER_ADMIN' || role === 'ADMIN';

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#080F20] font-sans text-[#93A4C0]">
        <div className="h-12 w-64 animate-pulse rounded-full bg-[#172235]/60" />
        <p className="text-xs">Loading Synthetix Studio…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080F20] text-[#F7F9FF]">
      {/* Universal Top Bar */}
      <Navigation
        activeTab={activeTab}
        user={user ?? DEFAULT_USER}
        role={role}
        onTabChange={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {loadError && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          Studio API unreachable — {loadError}
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'studio' && (
          <StudioEditor
            currentProject={currentProject}
            onUpdateProject={handleUpdateProject}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onNavigateToCalendar={() => setActiveTab('calendar')}
            onNavigateToMoneyHub={() => setActiveTab('marketplace')}
            user={user ?? DEFAULT_USER}
            schedule={schedule}
          />
        )}

        {activeTab === 'admin' && canAdminister && (
          <AdminDashboard
            apiKeys={apiKeys}
            ledger={ledger}
            walletBalance={walletBalance}
            onUpdateKeys={setApiKeys}
            onDatasetRestored={reloadFromServer}
          />
        )}

        {activeTab === 'mobile' && (
          <MobileApp
            projects={projects}
            schedule={schedule}
            user={user ?? DEFAULT_USER}
            walletBalance={walletBalance}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectProject={(proj) => {
              setCurrentProject(proj);
              setActiveTab('studio');
            }}
            onUpdateUser={setUser}
          />
        )}

        {activeTab === 'calendar' && (
          <ContentCalendar
            schedule={schedule}
            onAddSchedule={handleAddSchedule}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceHub
            ledger={ledger}
            marketplaceItems={marketplaceItems}
            walletBalance={walletBalance}
            onUpdateWallet={handleUpdateWallet}
            user={user ?? DEFAULT_USER}
          />
        )}
      </div>

      {/* AI Video Creation Modal */}
      <CreateVideoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Complete Source Code Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
    </ToastProvider>
  );
}
