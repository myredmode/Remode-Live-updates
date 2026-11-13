import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { auth, googleProvider, signInWithPopup } from '../../firebase';

export const AdminLoginGate: React.FC = () => {
  const { adminLogin, adminGoogleLogin, adminSavedCredentials, setActiveView, settings } = useStore();

  const [username, setUsername] = useState(adminSavedCredentials.username || '');
  const [password, setPassword] = useState('');
  const [saveDevice, setSaveDevice] = useState(adminSavedCredentials.saved || false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await Promise.resolve(adminLogin(username, password, saveDevice, trustDevice));
      if (!result.success) {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = (user.email || '').toLowerCase();
      const allowedEmails = [
        'myredmode@gmail.com',
        'admin@redmode.in',
        (settings.supportEmail || '').toLowerCase(),
      ].filter(Boolean);

      if (allowedEmails.includes(email)) {
        const idToken = await user.getIdToken();
        await Promise.resolve(adminGoogleLogin(email, idToken));
      } else {
        setError(`Google account (${user.email}) is not authorized for REDMODE Admin access.`);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setError(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#14161b] border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="p-8 pb-6 text-center border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-rose-500" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-[0.2em] text-white uppercase">
            {settings.logoText || 'REDMODE'}
          </h1>
          <p className="text-xs uppercase tracking-widest text-rose-400 font-semibold mt-1">
            Enterprise Admin Portal
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Restricted access. Enter your administrator credentials to manage products, inventory, and Shipmozo orders.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Admin Mobile Number or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter Mobile Number or Email"
                className="w-full bg-[#0c0d10] border border-zinc-800 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Security Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-[#0c0d10] border border-zinc-800 focus:border-rose-500 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={saveDevice}
                onChange={(e) => setSaveDevice(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-medium text-zinc-200 group-hover:text-white block">
                  Remember username on this device
                </span>
                <span className="text-[11px] text-zinc-500">
                  Pre-fills your administrator username on this browser (passwords are never stored locally).
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-medium text-zinc-200 group-hover:text-white block">
                  Keep this device signed in
                </span>
                <span className="text-[11px] text-zinc-500">
                  Maintains your encrypted administrator session token on this device.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span>Verifying Security Credentials...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Unlock Admin Dashboard</span>
              </>
            )}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-zinc-500 text-[10px] uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Signing in...' : 'Sign in with Google (Owner)'}</span>
          </button>
        </form>

        <div className="px-8 py-4 bg-[#0c0d10]/80 border-t border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </button>
          <span className="text-[11px] text-zinc-600">SSL Encrypted • 256-Bit</span>
        </div>
      </div>
    </div>
  );
};
