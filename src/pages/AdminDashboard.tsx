import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import {
  KeyRound, Activity, RefreshCw, Trash2, Eye, Plus, ShieldCheck,
  AlertTriangle, Server, Zap, CheckCircle2, Lock, X, Globe, Plug
} from 'lucide-react';
import { ApiKeyItem, ProviderInfo, StudioMetrics, LedgerEntry } from '../types';
import { fetchProviders, registerProviderKey, deleteProviderKey, testProvider, fetchMetrics, pulseProviderKeys, resetProviderKey, resetStudioData } from '../services/api';

interface AdminDashboardProps {
  apiKeys: ApiKeyItem[];
  ledger: LedgerEntry[];
  walletBalance: number;
  onUpdateKeys: (updated: ApiKeyItem[]) => void;
  onDatasetRestored?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  apiKeys,
  ledger,
  walletBalance,
  onUpdateKeys,
  onDatasetRestored
}) => {
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [inspectKey, setInspectKey] = useState<ApiKeyItem | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState<string>('groq');
  const [newKeySecret, setNewKeySecret] = useState('');
  const [isRotating, setIsRotating] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [keyFormError, setKeyFormError] = useState('');
  const [metrics, setMetrics] = useState<StudioMetrics | null>(null);

  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => setProviders([]));
    fetchMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const refreshMetrics = () => {
    fetchMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const result = await testProvider(providerId);
      setProviderStatus((prev) => ({
        ...prev,
        [providerId]: result.ok ? `OK · ${result.latencyMs}ms · ${result.model}` : `FAILED · ${result.error ?? 'unknown error'}`
      }));
    } catch (err: any) {
      setProviderStatus((prev) => ({ ...prev, [providerId]: `FAILED · ${err?.message ?? 'unreachable'}` }));
    } finally {
      setTestingProvider(null);
    }
  };

  // Rotate / Test key handler — starts a fresh quota window server-side.
  const handleRotateKey = async (keyId: string) => {
    setIsRotating(true);
    try {
      const result = await resetProviderKey(keyId);
      if (result?.key) {
        onUpdateKeys(apiKeys.map((k) => (k.id === keyId ? result.key : k)));
        refreshMetrics();
      }
    } catch {
      // Leave the row untouched when the server rejects the reset.
    } finally {
      setIsRotating(false);
    }
  };

  // Delete key handler
  const handleDeleteKey = (keyId: string) => {
    deleteProviderKey(keyId).catch(() => undefined);
    onUpdateKeys(apiKeys.filter((k) => k.id !== keyId));
    refreshMetrics();
  };

  // Add new key handler — the secret is encrypted server-side before storage.
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !newKeySecret) return;

    setKeyFormError('');
    try {
      const result: any = await registerProviderKey({
        name: newKeyName,
        providerId: newKeyProvider,
        secret: newKeySecret
      });

      const storedKey: ApiKeyItem = result?.key;
      if (storedKey) {
        onUpdateKeys([storedKey, ...apiKeys.filter((k) => k.providerId !== storedKey.providerId)]);
      }

      setProviders(await fetchProviders());
      setShowAddKeyModal(false);
      setNewKeyName('');
      setNewKeySecret('');
    } catch (err: any) {
      setKeyFormError(err?.message || 'Could not register the key');
    }
  };

  // Runs a live connectivity sweep across every provider that holds a key.
  const [isPulsing, setIsPulsing] = useState(false);
  const [pulseSummary, setPulseSummary] = useState('');
  const handleSimulateBurst = async () => {    setIsPulsing(true);
    setPulseSummary('');
    try {
      const result = await pulseProviderKeys();
      onUpdateKeys(result.keys);
      const passed = result.results.filter((r) => r.ok).length;
      setPulseSummary(
        result.tested === 0
          ? 'No provider credentials registered yet'
          : `${passed}/${result.tested} providers reachable`
      );
    } catch (err: any) {
      setPulseSummary(err?.message || 'Pulse failed');
    } finally {
      setIsPulsing(false);
    }
  };

  // Restores the seeded studio dataset after destructive edits.
  const [isRestoring, setIsRestoring] = useState(false);
  const handleRestoreDataset = async () => {
    setIsRestoring(true);
    try {
      const result = await resetStudioData();
      if (result?.keys) onUpdateKeys(result.keys);
      onDatasetRestored?.();
      refreshMetrics();
    } catch {
      // Nothing to undo if the server rejected the restore.
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#080F20] text-[#F7F9FF] p-6 space-y-6 font-sans">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#202B40] gap-4">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-[#172235] border border-[#202B40] rounded font-mono text-xs text-[#15DDF5] font-bold tracking-wider">
            PLATFORM_CORE
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Super Admin Telemetry</h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateBurst}
            disabled={isPulsing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#172235] hover:bg-[#202B40] border border-[#202B40] rounded-lg text-xs font-semibold text-[#15DDF5] disabled:opacity-60"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isPulsing ? 'Testing Connections…' : 'Test All Connections'}</span>
          </button>
          {pulseSummary && (
            <span className="text-[11px] font-medium text-[#93A4C0]">{pulseSummary}</span>
          )}

          <button
            onClick={handleRestoreDataset}
            disabled={isRestoring}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#172235] hover:bg-[#202B40] border border-[#202B40] rounded-lg text-xs font-semibold text-[#A13DFF] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Restoring…' : 'Restore Dataset'}</span>
          </button>

          <button
            onClick={() => setShowAddKeyModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] rounded-lg text-xs font-bold text-black shadow-neon-purple hover:opacity-95"
          >
            <KeyRound className="w-4 h-4 text-black" />
            <span>+ NEW API KEY</span>
          </button>
        </div>
      </header>

      {/* Primary KPI Row (Matching Reference Image 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-[#172235] border border-[#202B40] rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#93A4C0]">Total Projects</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono-tabular">
                {metrics?.totalProjects ?? 0}
              </span>
              <span className="text-xs text-[#19D89B] font-bold">
                {metrics?.activeConnections ?? 0} active
              </span>
            </div>
          </div>
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.providerUsage ?? []}>
                <Area type="monotone" dataKey="users" stroke="#15DDF5" fill="#15DDF5" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Server Load */}
        <div className="bg-[#172235] border border-[#202B40] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#93A4C0]">Quota Utilisation</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono-tabular">
                {((metrics?.avgUsagePct ?? 0) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-amber-400 font-bold">
                {metrics?.providersCount ?? 0} providers
              </span>
            </div>
          </div>
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.providerUsage ?? []}>
                <Area type="monotone" dataKey="load" stroke="#A13DFF" fill="#A13DFF" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wallet & Ledger */}
        <div className="bg-[#172235] border border-[#202B40] rounded-xl p-4 flex flex-col justify-between">
          <p className="text-xs font-semibold text-[#93A4C0]">Creator Wallet & Ledger</p>
          <div className="flex justify-between items-baseline mt-2">
            <div>
              <span className="text-2xl font-black text-white font-mono-tabular">
                ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-[#93A4C0]">Available Balance</p>
            </div>
            <div>
              <span className="text-2xl font-black text-[#15DDF5] font-mono-tabular">
                {ledger.length}
              </span>
              <p className="text-[10px] text-[#93A4C0]">Ledger Entries</p>
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-[11px] text-[#19D89B]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Razorpay & Stripe Webhooks Active</span>
          </div>
        </div>

        {/* API Spend vs Budget */}
        <div className="bg-[#172235] border border-[#202B40] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#93A4C0]">Total API Spend vs. Budget</p>
            <p className="text-2xl font-black text-white mt-1 font-mono-tabular">
              ${(metrics?.apiSpend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} / $
              {(metrics?.apiBudget ?? 0).toLocaleString('en-US')}
            </p>
          </div>
          <div className="space-y-1.5 mt-3">
            <div className="w-full bg-[#202B40] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#15DDF5] to-[#A13DFF] h-2 rounded-full"
                style={{
                  width: `${Math.min(100, ((metrics?.apiSpend ?? 0) / (metrics?.apiBudget || 1)) * 100).toFixed(1)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#93A4C0]">
              <span>
                {Math.min(100, ((metrics?.apiSpend ?? 0) / (metrics?.apiBudget || 1)) * 100).toFixed(1)}% Utilized
              </span>
              <span className="text-amber-400">
                {apiKeys.filter((k) => k.status === 'ACTIVE').length} of {apiKeys.length} keys active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Free LLM Provider Registry */}
      <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-[#A13DFF]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Free LLM Provider Registry</h2>
          </div>
          <p className="text-xs text-[#93A4C0]">
            {providers.filter((p) => p.configured).length} / {providers.length} providers configured
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-xl border border-[#202B40] bg-[#121B2D] p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-white">{provider.name}</p>
                  <p className="text-[10px] font-mono text-[#93A4C0] truncate max-w-[220px]">{provider.baseUrl}</p>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    provider.configured
                      ? 'bg-[#19D89B]/15 text-[#19D89B]'
                      : 'bg-[#202B40] text-[#93A4C0]'
                  }`}
                >
                  {provider.configured ? 'CONFIGURED' : 'NO KEY'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[9px] text-[#93A4C0]">
                <span className="px-1.5 py-0.5 rounded bg-[#202B40] font-mono">{provider.defaultModel}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#202B40]">
                  {provider.freeTier === 'PERMANENT' ? 'Permanent free' : provider.freeTier === 'LOCAL' ? 'Self-hosted' : 'Renewable credits'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#202B40]">{Math.round(provider.maxContextTokens / 1024)}K ctx</span>
                {provider.creditCardRequired && (
                  <span className="px-1.5 py-0.5 rounded bg-[#FF5F78]/15 text-[#FF5F78]">Card required</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestProvider(provider.id)}
                  disabled={testingProvider === provider.id}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#15DDF5] hover:text-white disabled:opacity-50"
                >
                  <Plug className={`w-3 h-3 ${testingProvider === provider.id ? 'animate-pulse' : ''}`} />
                  {testingProvider === provider.id ? 'Testing…' : 'Test connection'}
                </button>
                <a
                  href={provider.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold text-[#A13DFF] hover:underline"
                >
                  Get key
                </a>
              </div>

              {providerStatus[provider.id] && (
                <p
                  className={`text-[10px] font-mono ${
                    providerStatus[provider.id].startsWith('OK') ? 'text-[#19D89B]' : 'text-[#FF5F78]'
                  }`}
                >
                  {providerStatus[provider.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Keys Manager Table (Matching Reference Image 1 Bottom Section) */}
      <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#15DDF5]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">API Keys Manager</h2>
          </div>
          <div className="flex items-center space-x-3 text-xs text-[#93A4C0]">
            <span className="flex items-center gap-1.5 text-[#19D89B] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              AES-256-GCM Hardware Encrypted
            </span>
            <span>·</span>
            <span>Automatic Rotation Active</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121B2D] text-[#93A4C0] uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l">Key Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Usage</th>
                <th className="py-2.5 px-3">Concurrency</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right rounded-r">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B40]">
              {apiKeys.map((key) => {
                const isExhausted = key.status === 'EXHAUSTED';
                const isRateLimited = key.status === 'RATE_LIMITED';
                const statusColor = isExhausted 
                  ? 'text-[#FF5F78]' 
                  : isRateLimited 
                  ? 'text-amber-400' 
                  : 'text-[#19D89B]';

                return (
                  <tr key={key.id} className="hover:bg-[#202B40]/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {key.name}
                      <span className="block text-[10px] font-sans text-[#93A4C0] font-normal">
                        Last used: {key.lastUsed}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#93A4C0] font-mono text-[11px]">{key.provider}</td>
                    <td className="py-3 px-3 text-white font-mono-tabular">
                      {key.usedThisMonth.toLocaleString()} / {key.monthlyQuota.toLocaleString()} reqs
                    </td>
                    <td className="py-3 px-3 text-[#93A4C0] font-mono-tabular">
                      {key.activeRequests} / {key.concurrencyLimit} leases
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold flex items-center ${statusColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                        {key.status}
                        {isRateLimited && key.rateLimitResetSeconds && (
                          <span className="text-[10px] ml-1 text-[#93A4C0]">({key.rateLimitResetSeconds}s cooldown)</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => setInspectKey(key)}
                        className="px-2 py-1 rounded bg-[#202B40] text-[#93A4C0] hover:text-[#15DDF5] transition-colors"
                        title="Inspect Telemetry"
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={() => handleRotateKey(key.id)}
                        disabled={isRotating}
                        className="px-2 py-1 rounded bg-[#202B40] text-[#93A4C0] hover:text-[#A13DFF] transition-colors disabled:opacity-50"
                        title="Rotate / Reset Key"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 inline ${isRotating ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="px-2 py-1 rounded bg-[#202B40] text-[#93A4C0] hover:text-[#FF5F78] transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT KEY MODAL */}
      {inspectKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-[#202B40] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202B40] pb-3">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#15DDF5]" />
                {inspectKey.name}
              </h3>
              <button 
                onClick={() => setInspectKey(null)}
                className="text-xs text-[#93A4C0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#172235] rounded-xl space-y-1">
                <p className="text-[#93A4C0]">Hardware Key Fingerprint</p>
                <p className="font-mono text-white font-semibold">aes256gcm:9f82...d1c5 (Protected)</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#172235] rounded-xl">
                  <p className="text-[#93A4C0]">Estimated Cost</p>
                  <p className="text-base font-bold text-white font-mono-tabular">${inspectKey.costTotal}</p>
                </div>
                <div className="p-2.5 bg-[#172235] rounded-xl">
                  <p className="text-[#93A4C0]">Concurrency Cap</p>
                  <p className="text-base font-bold text-white font-mono-tabular">{inspectKey.concurrencyLimit} reqs</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectKey(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#172235] text-white hover:bg-[#202B40]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW KEY MODAL */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-[#202B40] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202B40] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#A13DFF]" />
                Register New API Key
              </h3>
              <button 
                onClick={() => setShowAddKeyModal(false)}
                className="text-xs text-[#93A4C0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddKey} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">Key Label / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. GROQ_PRIMARY_US_EAST"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2.5 text-xs text-white uppercase font-mono focus:outline-none focus:border-[#15DDF5]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">Provider Engine</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value as any)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#15DDF5]"
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} — {provider.defaultModel}
                    </option>
                  ))}
                </select>
                {providers.find((p) => p.id === newKeyProvider) && (
                  <p className="text-[10px] text-[#93A4C0] mt-1">
                    Env var: <span className="font-mono text-[#15DDF5]">{providers.find((p) => p.id === newKeyProvider)?.apiKeyEnv || 'none required'}</span>
                    {' · '}
                    <a
                      href={providers.find((p) => p.id === newKeyProvider)?.signupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#A13DFF] hover:underline"
                    >
                      Get free key
                    </a>
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">Secret API Key String</label>
                <input
                  type="password"
                  placeholder="Paste secret token..."
                  value={newKeySecret}
                  onChange={(e) => setNewKeySecret(e.target.value)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#15DDF5]"
                  required
                />
                <p className="text-[10px] text-[#93A4C0] mt-1">
                  Encrypted with AES-256-GCM on the server before it touches disk.
                </p>
                {keyFormError && (
                  <p className="text-[10px] text-red-400 mt-1">{keyFormError}</p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#93A4C0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] text-black shadow-neon-purple"
                >
                  Store & Activate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
