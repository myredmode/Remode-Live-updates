import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

export const AdminLoginGate: React.FC = () => {
  const {
    adminLogin,
    adminSavedCredentials,
    setActiveView,
  } = useStore();

  const [identifier, setIdentifier] = useState(
    adminSavedCredentials?.saved ? adminSavedCredentials.username : ''
  );
  const [password, setPassword] = useState(
    adminSavedCredentials?.saved && adminSavedCredentials.password
      ? adminSavedCredentials.password
      : ''
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(adminSavedCredentials?.saved));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('Please enter your mobile number, username, or email.');
      triggerShake();
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Please enter your password.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = adminLogin(cleanUser, cleanPass, rememberMe, rememberMe);
      setIsLoading(false);

      if (!res.success) {
        setErrorMessage(
          res.message || 'Invalid credentials. Please enter your correct mobile number and password.'
        );
        triggerShake();
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white relative">
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(229,34,41,0.1),rgba(0,0,0,0))] pointer-events-none" />

      <div
        className={`relative w-full max-w-[390px] bg-white rounded-3xl shadow-2xl border border-zinc-100 p-8 sm:p-9 space-y-6 transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-lg shadow-md mx-auto border border-zinc-800 tracking-tight">
            <span className="text-[#E52229]">R</span>
            <span className="text-white">M</span>
          </div>

          <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">
            REDMODE Admin
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Sign in to access your store workspace
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Clean Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          {/* User Identifier */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-700 block">
              Mobile, Username or Email
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Enter username, mobile or email"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/60 focus:bg-white text-zinc-900 text-xs font-medium outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition"
              />
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-700 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/60 focus:bg-white text-zinc-900 text-xs font-medium outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-700 cursor-pointer transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-600 text-xs">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
              />
              <span>Remember this device</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold bg-zinc-950 hover:bg-black text-white text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Return to Store */}
        <div className="pt-2 text-center border-t border-zinc-100">
          <button
            type="button"
            onClick={() => {
              setActiveView('home');
              if (typeof window !== 'undefined') {
                window.history.pushState({ path: '/' }, '', '/');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to Storefront</span>
          </button>
        </div>
      </div>
    </div>
  );
};
