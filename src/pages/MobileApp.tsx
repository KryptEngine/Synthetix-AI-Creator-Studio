import React, { useEffect, useState } from 'react';
import {
  Home, Play, Wallet, User, CheckCircle2, ChevronRight,
  Sparkles, ShieldCheck, ArrowUpRight, DollarSign, Lock, AlertCircle, Smartphone,
  Fingerprint, ScanFace, Unlock, KeyRound, RefreshCw, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LedgerEntry, Project, ScheduledPost, UserProfile } from '../types';
import { useToast } from '../components/Toast';
import { updateUserProfile, requestPayout, fetchLedger } from '../services/api';

interface MobileAppProps {
  projects: Project[];
  schedule: ScheduledPost[];
  user: UserProfile;
  walletBalance: number;
  onOpenCreateModal: () => void;
  onSelectProject: (project: Project) => void;
  onUpdateUser: (user: UserProfile) => void;
}

const GATEWAYS = [
  { name: 'YouTube Data API', platform: 'YouTube', detail: 'Publish & analytics for YouTube', color: 'text-[#19D89B]' },
  { name: 'Meta Social Graph', platform: 'Facebook', detail: 'Publish & analytics for Facebook', color: 'text-[#19D89B]' },
  { name: 'Instagram Graph', platform: 'Instagram', detail: 'Publish & analytics for Instagram', color: 'text-[#19D89B]' },
  { name: 'Edge TTS Cluster', platform: '', detail: 'Neural narration voices', color: 'text-[#19D89B]' }
];

const HELP_TOPICS = [
  { q: 'How do I generate my first video?', a: 'Tap "+ Create New Video", describe the topic, and the AI engine writes the script, scenes, and narration.' },
  { q: 'How does scheduled publishing work?', a: 'Every release queued in the Content Calendar is dispatched at its slot in the selected timezone.' },
  { q: 'How are earnings calculated?', a: 'Revenue from the marketplace licence and affiliate payouts lands in the wallet shown under Earnings.' },
  { q: 'Can I rotate my provider keys?', a: 'Yes — open the Admin dashboard, rotate any key, and the new secret is re-encrypted immediately.' }
];

export const MobileApp: React.FC<MobileAppProps> = ({
  projects,
  schedule,
  user,
  walletBalance,
  onOpenCreateModal,
  onSelectProject,
  onUpdateUser
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'publish' | 'earnings' | 'auth'>('home');
  const [selectedThumbnail, setSelectedThumbnail] = useState(1);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  
  // Biometric Authentication States
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [biometricMethod, setBiometricMethod] = useState<'FACE_ID' | 'TOUCH_ID'>('FACE_ID');
  const [isBiometricsAuthenticated, setIsBiometricsAuthenticated] = useState(false);
  const [isScanningBiometrics, setIsScanningBiometrics] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [passcodeFallbackInput, setPasscodeFallbackInput] = useState('');
  const [showPasscodeFallback, setShowPasscodeFallback] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const initialUpi = user.upiId || '';

  const [withdrawAmount, setWithdrawAmount] = useState(walletBalance > 0 ? walletBalance.toString() : '');
  const [upiId, setUpiId] = useState(initialUpi);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Affiliate income comes from the real ledger, not a fixed label.
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchLedger()
      .then((data) => {
        if (!cancelled) setLedger(data.entries);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [walletBalance]);

  const affiliateIncome = ledger
    .filter((entry) => entry.type === 'AFFILIATE_PAYOUT')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const affiliateReferrals = ledger.filter((entry) => entry.type === 'AFFILIATE_PAYOUT').length;

  // 6-digit OTP simulator
  const [otpDigits, setOtpDigits] = useState(['4', '8', '2', '1', '9', '0']);
  const [otpVerified, setOtpVerified] = useState(false);

  // Calendar quick row + settings sheet
  const [selectedDay, setSelectedDay] = useState(23);
  const [settingsPanel, setSettingsPanel] = useState<'language' | 'appearance' | 'gateways' | 'help' | null>(null);
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');
  const [theme, setTheme] = useState<'Dark Neon' | 'Midnight Blue' | 'OLED Black'>('Dark Neon');
  const [openHelp, setOpenHelp] = useState<number | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: user.name,
    handle: user.handle,
    upiId: user.upiId,
    bio: user.bio ?? ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const { notify } = useToast();

  const calendarDays = [
    { day: 'Mon', d: 21 },
    { day: 'Tue', d: 22 },
    { day: 'Wed', d: 23 },
    { day: 'Thu', d: 24 },
    { day: 'Fri', d: 25 }
  ];

  const postsOnDay = (day: number) => schedule.filter((s) => s.dateDay === day);

  const THEME_FRAME: Record<typeof theme, string> = {
    'Dark Neon': 'bg-[#0A1224]',
    'Midnight Blue': 'bg-[#0B1533]',
    'OLED Black': 'bg-[#000000]'
  };

  // Trigger Biometric Scan
  const triggerBiometricScan = (onSuccess?: () => void) => {
    setShowBiometricModal(true);
    setIsScanningBiometrics(true);
    setBiometricError(null);

    setTimeout(() => {
      setIsScanningBiometrics(false);
      setIsBiometricsAuthenticated(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setShowBiometricModal(false);
      }, 700);
    }, 1100);
  };

  const handleVerifyPasscodeFallback = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeFallbackInput === '123456' || passcodeFallbackInput.length === 6) {
      setIsBiometricsAuthenticated(true);
      setShowPasscodeFallback(false);
      setShowBiometricModal(false);
      setPasscodeFallbackInput('');
    } else {
      setBiometricError('Invalid passcode. Use 123456 for test.');
    }
  };

  const handlePublishToYouTube = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
      } catch {}
      setTimeout(() => setPublishSuccess(false), 4000);
    }, 1200);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > walletBalance) {
      notify('Enter a valid withdrawal amount.', 'error');
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await requestPayout({
        amount,
        upiId: user.upiId || '',
        accountHolder: user.name
      });
      setWithdrawSuccess(true);
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {}
      notify(result.message || `Withdrawal of ₹${amount.toFixed(2)} requested.`, 'success');
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess(false);
      }, 2000);
    } catch (err: any) {
      notify(err?.message || 'The withdrawal request failed.', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#080F20] overflow-y-auto">
      {/* SMARTPHONE DEVICE CONTAINER (Matching Reference Images 2 & 4) */}
      <div className={`w-full max-w-[375px] h-[780px] ${THEME_FRAME[theme]} text-[#F7F9FF] flex flex-col justify-between border-[8px] border-[#1C263A] rounded-[48px] overflow-hidden shadow-2xl relative select-none`}>
        
        {/* Dynamic Island / Top Speaker Notch */}
        <div className="h-6 bg-[#0A1224] px-6 pt-2 flex items-center justify-between text-[11px] font-semibold text-[#93A4C0] shrink-0">
          <span>10:09</span>
          <div className="w-20 h-4 bg-black rounded-full" />
          <div className="flex items-center space-x-1 text-[10px]">
            <span>5G</span>
            <span>88%</span>
          </div>
        </div>

        {/* SCREEN SCROLLABLE VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: MOBILE HOME (Matching Reference Image 2 Left & Image 4 Screen 3) */}
          {activeTab === 'home' && (
            <div className="space-y-4 pt-1">
              {/* Header Greeting */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Hello, {user.name.split(' ')[0]}! 👋</h2>
                  <p className="text-xs text-[#93A4C0]">
                    {language === 'English' ? "Let's craft viral shorts today" : 'आज वायरल शॉर्ट्स बनाएं'}
                  </p>
                </div>
                <img
                  src="/assets/avatar_alex_reed_1792602672415.jpg"
                  alt="Alex"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#15DDF5] shadow-neon-cyan"
                />
              </div>

              {/* Primary Action Button */}
              <button 
                onClick={onOpenCreateModal}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#15DDF5] to-[#A13DFF] text-black font-extrabold text-xs shadow-neon-cyan flex items-center justify-center space-x-2 active:scale-98 transition-transform"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>{language === 'English' ? '+ Create New Video' : '+ नया वीडियो बनाएं'}</span>
              </button>

              {/* Content Calendar Quick Row */}
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    const total = schedule.length;
                    notify(`${total} release${total === 1 ? '' : 's'} queued in the content calendar.`, 'info');
                  }}
                  className="w-full flex justify-between items-center text-xs hover:text-[#15DDF5] transition-colors"
                >
                  <span className="font-bold text-white">Content Calendar</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#93A4C0]" />
                </button>
                <div className="flex justify-between space-x-1.5 overflow-x-auto pb-1">
                  {calendarDays.map((item) => {
                    const isActive = selectedDay === item.d;
                    const dayPosts = postsOnDay(item.d);
                    return (
                      <button
                        key={item.d}
                        onClick={() => {
                          setSelectedDay(item.d);
                          notify(
                            dayPosts.length
                              ? `${dayPosts.length} release${dayPosts.length === 1 ? '' : 's'} on Oct ${item.d}.`
                              : `No releases on Oct ${item.d}.`,
                            'info'
                          );
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs transition-colors ${
                          isActive
                            ? 'bg-[#15DDF5] text-black font-extrabold shadow-sm'
                            : 'bg-[#172235] text-[#93A4C0] hover:bg-[#202B40]'
                        }`}
                      >
                        <p className="text-[9px] uppercase">{item.day}</p>
                        <p className="font-extrabold text-sm">{item.d}</p>
                        {dayPosts.length > 0 && (
                          <p className={`text-[9px] font-bold ${isActive ? 'text-black/70' : 'text-[#15DDF5]'}`}>
                            {dayPosts.length} post{dayPosts.length === 1 ? '' : 's'}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {postsOnDay(selectedDay).length > 0 && (
                  <div className="space-y-1 pt-1">
                    {postsOnDay(selectedDay).map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#172235]/70 text-[10px]"
                      >
                        <span className="truncate text-[#F7F9FF] font-semibold">{post.projectTitle}</span>
                        <span className="shrink-0 font-mono text-[#15DDF5]">{post.scheduledTime}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Projects Tiles (2x2 Grid) */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#93A4C0] uppercase tracking-wider">Recent Projects</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {projects.slice(0, 4).map((proj, idx) => (
                    <div 
                      key={proj.id}
                      onClick={() => onSelectProject(proj)}
                      className="bg-[#172235] border border-[#202B40] hover:border-[#15DDF5] p-2.5 rounded-2xl space-y-1.5 cursor-pointer transition-all"
                    >
                      <div className="w-full h-20 bg-black/50 rounded-xl overflow-hidden relative flex items-center justify-center">
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white/90" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate">{proj.title}</p>
                        <span className="text-[10px] text-[#19D89B] font-semibold">{proj.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REVIEW & PUBLISH (Matching Reference Image 2 Center) */}
          {activeTab === 'publish' && (
            <div className="space-y-3.5 pt-1">
              <h2 className="text-sm font-bold text-center text-white">Review & Publish</h2>

              {/* Video Player Display */}
              <div className="w-full h-48 bg-black rounded-2xl overflow-hidden border border-[#202B40] relative flex items-center justify-center shadow-lg">
                <img
                  src="/assets/finance_shorts_scene_1792602672698.jpg"
                  alt="Review"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#15DDF5] text-black flex items-center justify-center shadow-neon-cyan">
                    <Play className="w-6 h-6 ml-0.5 fill-current" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-3 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-white font-bold">
                  01:45
                </div>
              </div>

              {/* Video Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#93A4C0]">Video Title</label>
                <input 
                  type="text" 
                  defaultValue="Maximizing Productivity with AI Tools"
                  className="w-full bg-[#172235] border border-[#202B40] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>

              {/* AI Suggested Thumbnails */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#93A4C0]">AI-Suggested Thumbnails</label>
                <div className="flex space-x-2">
                  {[
                    { id: 1, img: '/assets/finance_shorts_scene_1792602672698.jpg' },
                    { id: 2, img: '/assets/cyber_city_scene_1792602671674.jpg' },
                    { id: 3, img: '/assets/android_ai_scene_1792602672297.jpg' }
                  ].map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedThumbnail(t.id)}
                      className={`flex-1 h-14 rounded-xl overflow-hidden border-2 cursor-pointer relative ${
                        selectedThumbnail === t.id ? 'border-[#15DDF5]' : 'border-transparent'
                      }`}
                    >
                      <img src={t.img} alt="Thumb" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      {selectedThumbnail === t.id && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-[#15DDF5]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish Button */}
              <button 
                onClick={handlePublishToYouTube}
                disabled={isPublishing}
                className="w-full py-3 rounded-xl bg-[#19D89B] text-black font-extrabold text-xs shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {isPublishing ? 'Publishing to YouTube...' : 'Approve & Publish to YouTube'}
              </button>

              {publishSuccess && (
                <div className="p-2.5 bg-[#19D89B]/15 border border-[#19D89B] rounded-xl text-center text-xs text-[#19D89B] font-bold">
                  Successfully dispatched to YouTube & Facebook!
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EARNINGS & WALLET (Matching Reference Image 2 Right) */}
          {activeTab === 'earnings' && (
            <div className="space-y-4 pt-1">
              {biometricsEnabled && !isBiometricsAuthenticated ? (
                /* BIOMETRIC LOCKED GATE SCREEN */
                <div className="p-6 bg-[#172235]/90 border border-[#202B40] rounded-3xl text-center space-y-4 my-6 backdrop-blur-sm">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#15DDF5] to-[#A13DFF] opacity-20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-[#121B2D] border-2 border-[#15DDF5] flex items-center justify-center text-[#15DDF5] shadow-neon-cyan">
                      {biometricMethod === 'FACE_ID' ? (
                        <ScanFace className="w-10 h-10 animate-pulse" />
                      ) : (
                        <Fingerprint className="w-10 h-10 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Wallet Protected by Biometrics</span>
                    </h3>
                    <p className="text-[11px] text-[#93A4C0] px-2 leading-relaxed">
                      Device authentication ({biometricMethod === 'FACE_ID' ? 'Face ID' : 'Touch ID'}) is required to access your financial telemetry and withdrawal balances.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => triggerBiometricScan()}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#15DDF5] to-[#A13DFF] text-black font-extrabold text-xs shadow-neon-cyan flex items-center justify-center gap-2 active:scale-98 transition-transform"
                    >
                      {biometricMethod === 'FACE_ID' ? (
                        <>
                          <ScanFace className="w-4 h-4 text-black" />
                          <span>Authenticate with Face ID</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4 text-black" />
                          <span>Scan Fingerprint / Touch ID</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowPasscodeFallback(true)}
                      className="w-full py-2 text-[11px] text-[#93A4C0] hover:text-white font-medium"
                    >
                      Use Device Passcode Instead
                    </button>
                  </div>
                </div>
              ) : (
                /* UNLOCKED EARNINGS & WALLET DASHBOARD */
                <>
                  {biometricsEnabled && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#121B2D] border border-[#202B40] rounded-xl text-[10px]">
                      <span className="flex items-center gap-1.5 text-[#19D89B] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Biometric Session Unlocked
                      </span>
                      <button
                        onClick={() => setIsBiometricsAuthenticated(false)}
                        className="text-[#93A4C0] hover:text-[#FF5F78] flex items-center gap-1 font-semibold"
                        title="Re-lock Wallet"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Re-lock</span>
                      </button>
                    </div>
                  )}

                  <div className="text-center space-y-0.5">
                    <p className="text-xs text-[#93A4C0]">Total Earnings</p>
                    <h1 className="text-3xl font-black text-white font-mono-tabular">
                      ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h1>
                  </div>

                  {/* Views vs Revenue Container */}
                  <div className="p-3 bg-[#172235] border border-[#202B40] rounded-2xl space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white">Views vs. Revenue</span>
                      <span className="text-[#15DDF5] font-bold">~50k views</span>
                    </div>
                    <div className="w-full h-20 bg-gradient-to-t from-[#A13DFF]/20 to-transparent rounded-lg flex items-end justify-between px-2 pb-1">
                      {[35, 50, 70, 85, 60, 95].map((val, idx) => (
                        <div 
                          key={idx} 
                          style={{ height: `${val}%` }} 
                          className="w-4 bg-gradient-to-t from-[#A13DFF] to-[#15DDF5] rounded-t" 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Affiliate Income Card */}
                  <div className="p-3 bg-[#172235] border border-[#202B40] rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-[11px] text-[#93A4C0]">Affiliate Income</p>
                      <p className="text-lg font-black text-white font-mono-tabular">₹{affiliateIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-[#19D89B] font-semibold">{affiliateReferrals} referrals recorded</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#93A4C0]" />
                  </div>

                  {/* Withdraw Button */}
                  <button 
                    onClick={() => {
                      if (biometricsEnabled && !isBiometricsAuthenticated) {
                        triggerBiometricScan(() => setShowWithdrawModal(true));
                      } else {
                        setShowWithdrawModal(true);
                      }
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#15DDF5] to-[#A13DFF] text-black font-extrabold text-xs shadow-neon-cyan flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4 text-black" />
                    <span>Withdraw Funds (₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to Bank)</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE & SECURITY (Matching Reference Image 4 Right) */}
          {activeTab === 'auth' && (
            <div className="space-y-3.5 pt-1">
              <h2 className="text-sm font-bold text-white">Profile & Security</h2>

              {/* Profile Card */}
              <div className="p-3 bg-[#172235] border border-[#202B40] rounded-2xl flex items-center space-x-3">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-[#15DDF5]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-[#93A4C0] truncate">{user.handle}</p>
                </div>
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-[#202B40] hover:bg-[#2e3e5c] text-[10px] font-bold text-[#15DDF5]"
                >
                  Edit
                </button>
              </div>

              {/* BIOMETRIC APP PROTECTION CONFIGURATION SECTION */}
              <div className="p-3.5 bg-[#172235] border border-[#202B40] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#15DDF5]/15 border border-[#15DDF5]/40 flex items-center justify-center text-[#15DDF5]">
                      {biometricMethod === 'FACE_ID' ? <ScanFace className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Biometric App Protection</p>
                      <p className="text-[10px] text-[#93A4C0]">Protect Wallet & Earnings with Device Biometrics</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    id="biometricToggle"
                    checked={biometricsEnabled} 
                    onChange={() => {
                      const next = !biometricsEnabled;
                      setBiometricsEnabled(next);
                      if (!next) {
                        setIsBiometricsAuthenticated(true);
                      } else {
                        setIsBiometricsAuthenticated(false);
                      }
                    }} 
                    className="w-4 h-4 accent-[#15DDF5] cursor-pointer" 
                  />
                </div>

                {/* Preferred Authentication Method Dropdown Selector */}
                <div className="pt-2 border-t border-[#202B40] space-y-2">
                  <div className="space-y-1">
                    <label 
                      htmlFor="biometricMethodSelect" 
                      className="text-[11px] font-semibold text-[#93A4C0] flex items-center justify-between"
                    >
                      <span>Preferred Authentication Method</span>
                      <span className="text-[10px] text-[#15DDF5] font-mono">
                        {biometricMethod === 'FACE_ID' ? 'Face ID' : 'Touch ID'}
                      </span>
                    </label>
                    <select
                      id="biometricMethodSelect"
                      value={biometricMethod}
                      onChange={(e) => setBiometricMethod(e.target.value as 'FACE_ID' | 'TOUCH_ID')}
                      disabled={!biometricsEnabled}
                      className="w-full bg-[#121B2D] border border-[#202B40] rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#15DDF5] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <option value="FACE_ID">Face ID (Facial Recognition)</option>
                      <option value="TOUCH_ID">Touch ID (Fingerprint Sensor)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#19D89B] flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {biometricsEnabled ? 'Protection Active on Wallet' : 'Protection Disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerBiometricScan()}
                      disabled={!biometricsEnabled}
                      className="px-2.5 py-1 rounded-lg bg-[#202B40] text-[10px] font-semibold text-[#15DDF5] hover:bg-[#2e3e5c] transition-colors disabled:opacity-40"
                    >
                      Test {biometricMethod === 'FACE_ID' ? 'Face ID' : 'Touch ID'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication (2FA) */}
              <div className="p-3 bg-[#172235] border border-[#202B40] rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</p>
                    <p className={`text-[10px] font-semibold ${twoFactorEnabled ? 'text-[#19D89B]' : 'text-[#93A4C0]'}`}>
                      {twoFactorEnabled ? 'Currently ON (Hardware Guard)' : 'Disabled'}
                    </p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={twoFactorEnabled} 
                    onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} 
                    className="w-4 h-4 accent-[#15DDF5] cursor-pointer" 
                  />
                </div>

                {/* 6-Digit OTP Box (Image 4 Verification) */}
                <div className="pt-1 space-y-1.5 border-t border-[#202B40]">
                  <p className="text-[10px] text-[#93A4C0]">Test 6-Digit OTP Generator:</p>
                  <div className="flex justify-between gap-1">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const copy = [...otpDigits];
                          copy[i] = e.target.value;
                          setOtpDigits(copy);
                        }}
                        className="w-8 h-9 text-center bg-[#080F20] border border-[#202B40] rounded-lg text-sm font-mono font-bold text-[#15DDF5] focus:outline-none focus:border-[#15DDF5]"
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setOtpVerified(true);
                      setTimeout(() => setOtpVerified(false), 3000);
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#202B40] text-[10px] font-semibold text-[#15DDF5] hover:bg-[#2e3e5c]"
                  >
                    {otpVerified ? 'OTP Token Verified! ✓' : 'Verify Hardware OTP'}
                  </button>
                </div>
              </div>

              {/* Settings list */}
              <div className="space-y-1 text-xs">
                {[
                  { key: 'language' as const, label: `Language: ${language}` },
                  { key: 'appearance' as const, label: `Appearance: ${theme}` },
                  { key: 'gateways' as const, label: 'Connected Gateways' },
                  { key: 'help' as const, label: 'Help & Docs' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSettingsPanel((prev) => (prev === item.key ? null : item.key))}
                    className={`w-full p-2.5 bg-[#172235]/60 hover:bg-[#172235] rounded-xl flex justify-between items-center transition-colors ${
                      settingsPanel === item.key ? 'text-white' : ''
                    }`}
                  >
                    <span className="text-[#93A4C0] font-medium">{item.label}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-[#93A4C0] transition-transform ${
                      settingsPanel === item.key ? 'rotate-90' : ''
                    }`} />
                  </button>
                ))}
              </div>

              {settingsPanel === 'language' && (
                <div className="p-2.5 bg-[#172235] rounded-xl space-y-1.5">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">App language</p>
                  {(['English', 'Hindi'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setLanguage(option);
                        notify(`App language switched to ${option}.`, 'success');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] ${
                        language === option ? 'bg-[#15DDF5] text-black font-bold' : 'bg-[#202B40] text-[#93A4C0] hover:bg-[#2e3e5c]'
                      }`}
                    >
                      <span>{option}</span>
                      {language === option && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsPanel === 'appearance' && (
                <div className="p-2.5 bg-[#172235] rounded-xl space-y-1.5">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Appearance</p>
                  {(['Dark Neon', 'Midnight Blue', 'OLED Black'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setTheme(option);
                        notify(`Appearance switched to ${option}.`, 'success');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] ${
                        theme === option ? 'bg-[#15DDF5] text-black font-bold' : 'bg-[#202B40] text-[#93A4C0] hover:bg-[#2e3e5c]'
                      }`}
                    >
                      <span>{option}</span>
                      {theme === option && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsPanel === 'gateways' && (
                <div className="p-2.5 bg-[#172235] rounded-xl space-y-1.5">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Connected gateways</p>
                  {GATEWAYS.map((gw) => {
                    const account = gw.platform
                      ? user.connectedAccounts.find((a) => a.platform.toLowerCase() === gw.platform.toLowerCase())
                      : undefined;
                    return (
                      <div key={gw.name} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#202B40]">
                        <div>
                          <p className="text-[11px] font-semibold text-white">{gw.name}</p>
                          <p className="text-[9px] text-[#93A4C0]">
                            {account
                              ? `${account.handle} · ${account.followersCount.toLocaleString('en-US')} followers`
                              : gw.detail}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold ${account ? gw.color : 'text-[#93A4C0]'}`}>
                          {account ? 'CONNECTED' : 'NOT LINKED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {settingsPanel === 'help' && (
                <div className="p-2.5 bg-[#172235] rounded-xl space-y-1.5">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Help & docs</p>
                  {HELP_TOPICS.map((topic, idx) => (
                    <button
                      key={topic.q}
                      onClick={() => setOpenHelp((prev) => (prev === idx ? null : idx))}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#202B40] hover:bg-[#2e3e5c] text-[11px] font-semibold text-white"
                    >
                      {topic.q}
                    </button>
                  ))}
                  {openHelp !== null && (
                    <p className="px-2.5 py-2 rounded-lg bg-[#0A1224] text-[11px] leading-relaxed text-[#93A4C0]">
                      {HELP_TOPICS[openHelp].a}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="h-14 bg-[#0E1729] border-t border-[#202B40] px-4 flex items-center justify-around shrink-0">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex flex-col items-center ${activeTab === 'home' ? 'text-[#15DDF5]' : 'text-[#93A4C0]'}`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[9px] mt-0.5 font-semibold">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('publish')} 
            className={`flex flex-col items-center ${activeTab === 'publish' ? 'text-[#15DDF5]' : 'text-[#93A4C0]'}`}
          >
            <Play className="w-4 h-4" />
            <span className="text-[9px] mt-0.5 font-semibold">Publish</span>
          </button>
          <button 
            onClick={() => setActiveTab('earnings')} 
            className={`flex flex-col items-center ${activeTab === 'earnings' ? 'text-[#15DDF5]' : 'text-[#93A4C0]'}`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[9px] mt-0.5 font-semibold">Earnings</span>
          </button>
          <button 
            onClick={() => setActiveTab('auth')} 
            className={`flex flex-col items-center ${activeTab === 'auth' ? 'text-[#15DDF5]' : 'text-[#93A4C0]'}`}
          >
            <User className="w-4 h-4" />
            <span className="text-[9px] mt-0.5 font-semibold">Profile</span>
          </button>
        </nav>
      </div>

      {/* PROFILE EDITOR MODAL */}
      {showProfileEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0F172A] border border-[#202B40] rounded-2xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#15DDF5]" />
                Edit Creator Profile
              </h3>
              <button
                onClick={() => setShowProfileEditor(false)}
                aria-label="Close profile editor"
                className="text-[#93A4C0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#93A4C0]">Display name</label>
                <input
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#93A4C0]">Handle</label>
                <input
                  value={profileDraft.handle}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, handle: e.target.value }))}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#93A4C0]">Payout UPI ID</label>
                <input
                  value={profileDraft.upiId}
                  placeholder="yourname@bank"
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, upiId: e.target.value }))}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#93A4C0]">Bio</label>
                <textarea
                  value={profileDraft.bio}
                  rows={2}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowProfileEditor(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#172235] text-[#93A4C0] hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={savingProfile}
                onClick={async () => {
                  if (!profileDraft.name.trim()) {
                    notify('Display name cannot be empty.', 'error');
                    return;
                  }
                  setSavingProfile(true);
                  try {
                    const { user: saved } = await updateUserProfile(profileDraft);
                    onUpdateUser(saved);
                    setShowProfileEditor(false);
                    notify('Creator profile saved.', 'success');
                  } catch (err: any) {
                    notify(err?.message || 'Could not save the profile.', 'error');
                  } finally {
                    setSavingProfile(false);
                  }
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#15DDF5] text-black hover:opacity-95 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0F172A] border border-[#202B40] rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#19D89B]" />
              Withdraw Creator Funds
            </h3>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-[#93A4C0]">Withdrawal Amount (USD)</label>
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#93A4C0]">Payout Method (UPI / Bank Account)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2 text-xs text-white font-mono"
                  required
                />
              </div>

              {withdrawSuccess ? (
                <div className="p-2 bg-[#19D89B]/15 text-[#19D89B] text-xs font-bold rounded-lg text-center">
                  Withdrawal initiated! Funds queued in Escrow.
                </div>
              ) : (
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-2 rounded-xl text-xs bg-[#172235] text-[#93A4C0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#19D89B] text-black"
                  >
                    Confirm Payout
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* BIOMETRIC SCANNER MODAL (iOS / Android System Prompt Simulation) */}
      {showBiometricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-[320px] bg-[#121B2D]/95 border border-[#202B40] rounded-[32px] p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
            {/* Glow sweep backdrop */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#15DDF5]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#A13DFF]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#15DDF5]">
                {biometricMethod === 'FACE_ID' ? 'Apple Face ID' : 'Biometric Sensor'}
              </span>
              <h3 className="text-sm font-bold text-white">Synthetix AI Creator Studio</h3>
              <p className="text-[11px] text-[#93A4C0]">
                Confirm identity to access Wallet & Earnings
              </p>
            </div>

            {/* Sensor graphic */}
            <div className="relative w-24 h-24 mx-auto my-2 flex items-center justify-center">
              {isScanningBiometrics ? (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#15DDF5] animate-spin" />
                  <div className="w-20 h-20 rounded-full bg-[#172235] flex items-center justify-center text-[#15DDF5] shadow-neon-cyan">
                    {biometricMethod === 'FACE_ID' ? (
                      <ScanFace className="w-10 h-10 animate-pulse" />
                    ) : (
                      <Fingerprint className="w-10 h-10 animate-pulse" />
                    )}
                  </div>
                  {/* Laser Scanning Line */}
                  <div className="absolute left-3 right-3 h-0.5 bg-[#15DDF5] shadow-[0_0_8px_#15DDF5] animate-bounce" />
                </>
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#19D89B]/20 border-2 border-[#19D89B] flex items-center justify-center text-[#19D89B] shadow-[0_0_15px_rgba(25,216,155,0.4)]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
            </div>

            {/* Status Feedback */}
            <div className="text-xs font-semibold">
              {isScanningBiometrics ? (
                <span className="text-[#93A4C0] flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#15DDF5]" />
                  Scanning {biometricMethod === 'FACE_ID' ? 'Facial Geometry' : 'Dermal Ridges'}...
                </span>
              ) : (
                <span className="text-[#19D89B]">Authentication Successful ✓</span>
              )}
            </div>

            <div className="pt-2 border-t border-[#202B40] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowBiometricModal(false);
                  setIsScanningBiometrics(false);
                }}
                className="flex-1 py-2 text-xs text-[#93A4C0] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBiometricModal(false);
                  setShowPasscodeFallback(true);
                }}
                className="flex-1 py-2 text-xs font-semibold text-[#15DDF5] hover:underline"
              >
                Passcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSCODE FALLBACK MODAL */}
      {showPasscodeFallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-[300px] bg-[#0F172A] border border-[#202B40] rounded-3xl p-5 text-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#202B40] flex items-center justify-center text-[#15DDF5]">
              <KeyRound className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">Enter Device Passcode</h3>
              <p className="text-[10px] text-[#93A4C0]">Enter your 6-digit mobile lock code</p>
            </div>

            <form onSubmit={handleVerifyPasscodeFallback} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                value={passcodeFallbackInput}
                onChange={(e) => setPasscodeFallbackInput(e.target.value)}
                className="w-full text-center tracking-[0.5em] bg-[#172235] border border-[#202B40] rounded-xl py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-[#15DDF5]"
              />

              {biometricError && (
                <p className="text-[10px] text-[#FF5F78]">{biometricError}</p>
              )}

              <p className="text-[9px] text-[#93A4C0]">Demo Hint: Enter any 6 digits (e.g. 123456)</p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasscodeFallback(false)}
                  className="flex-1 py-2 text-xs text-[#93A4C0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#15DDF5] text-black font-bold text-xs"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
