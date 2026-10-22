import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { login, registerUser, type SessionUser } from '../services/api';

interface AuthGateProps {
  onAuthenticated: (user: SessionUser) => void;
}

/**
 * Sign-in / sign-up screen. The API refuses every business route without a
 * session, so this gate is the only way into the studio.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result =
        mode === 'login'
          ? await login(email, password)
          : await registerUser({ name, email, password });
      onAuthenticated(result.user);
    } catch (err: any) {
      setError(err?.message || 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  };

  const field =
    'w-full rounded-lg bg-[#172235] border border-[#202B40] pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#5A6B87] focus:border-[#15DDF5] focus:outline-none';

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#080F20] px-4 font-sans text-[#F7F9FF]">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A13DFF] to-[#15DDF5] text-black">
            <span className="text-xl font-black">S</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">Synthetix AI Creator Studio</h1>
          <p className="mt-1 text-xs text-[#93A4C0]">
            {mode === 'login' ? 'Sign in to your studio' : 'Create a creator account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[#202B40] bg-[#0E1728] p-5 shadow-2xl">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6B87]" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Creator name"
                className={field}
                autoComplete="name"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6B87]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              className={field}
              autoComplete="email"
              required
            />
          </div>

          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6B87]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Password (min 8 characters)' : 'Password'}
              className={field}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] px-4 py-2.5 text-sm font-extrabold text-black shadow-neon-purple transition hover:opacity-95 disabled:opacity-60"
          >
            {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs font-medium text-[#93A4C0] hover:text-[#15DDF5]"
          >
            <Lock className="h-3 w-3" />
            {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-[#5A6B87]">
          Sessions are cookie-based and expire after 7 days. Provider credentials never reach the browser.
        </p>
      </div>
    </div>
  );
};
