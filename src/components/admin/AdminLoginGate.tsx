import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminLoginGate: React.FC = () => {
  const { adminLogin, adminSavedCredentials, setActiveView } = useStore();

  const [username, setUsername] = useState(adminSavedCredentials.username || '');
  const [password, setPassword] = useState('');
  const [saveDevice, setSaveDevice] = useState(adminSavedCredentials.saved || false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both your admin username and password.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await Promise.resolve(
        adminLogin(trimmedUsername, trimmedPassword, saveDevice, trustDevice)
      );
      if (!result.success) {
        setError(result.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4 overflow-x-hidden">
      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-zinc-200/90 shadow-xl shadow-zinc-900/5 overflow-hidden">
        {/* Clean Minimal Header */}
        <div className="px-6 pt-6 pb-4 bg-white border-b border-zinc-100">
          <div className="mb-2.5">
            <span className="font-display text-lg font-extrabold tracking-[0.18em] uppercase select-none">
              <span className="text-[#D91E2A]">RED</span>
              <span className="text-zinc-900">MODE</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
            Enterprise Admin Portal
          </h1>
        </div>

        {/* Username & Password Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-medium text-zinc-800 mb-1.5"
            >
              Admin Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                required
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#D91E2A] focus:ring-2 focus:ring-[#D91E2A]/15 transition-all bg-white"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium text-zinc-800 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#D91E2A] focus:ring-2 focus:ring-[#D91E2A]/15 transition-all bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveDevice}
                onChange={(e) => setSaveDevice(e.target.checked)}
                className="w-4 h-4 accent-[#D91E2A] rounded border-zinc-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-700">
                Remember username on this device
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="w-4 h-4 accent-[#D91E2A] rounded border-zinc-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-700">
                Keep me signed in
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 mt-1 bg-[#D91E2A] hover:bg-[#B91822] active:scale-[0.99] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
          >
            <span>
              {isLoading ? 'Signing in...' : 'Sign In to Admin Dashboard \u2192'}
            </span>
          </button>
        </form>

        {/* Minimal Footer */}
        <div className="px-6 py-3.5 bg-zinc-50/70 border-t border-zinc-100 flex items-center">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </button>
        </div>
      </div>
    </div>
  );
};
