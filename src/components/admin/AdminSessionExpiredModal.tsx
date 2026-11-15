import React, { useEffect } from 'react';
import { Clock, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminSessionExpiredModal: React.FC = () => {
  const {
    isAdminSessionExpired,
    adminSessionExpiredReason,
    dismissAdminSessionExpired,
    setActiveView,
  } = useStore();

  useEffect(() => {
    if (!isAdminSessionExpired) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissAdminSessionExpired();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminSessionExpired, dismissAdminSessionExpired]);

  if (!isAdminSessionExpired) return null;

  const isInactivity = adminSessionExpiredReason !== 'token_invalidated';

  const handleSignInAgain = () => {
    dismissAdminSessionExpired();
    setActiveView('admin');
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
      window.history.pushState({ path: '/admin' }, '', '/admin');
    }
  };

  const handleReturnToStorefront = () => {
    dismissAdminSessionExpired();
    setActiveView('home');
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      window.history.replaceState({ path: '/' }, '', '/');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-zinc-950/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-session-expired-title"
    >
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-zinc-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Clean Minimal Brand Header */}
        <div className="px-6 pt-6 pb-4 bg-white border-b border-zinc-100 flex items-center justify-between">
          <div>
            <span className="font-display text-base font-extrabold tracking-[0.18em] uppercase select-none block">
              <span className="text-[#D91E2A]">RED</span>
              <span className="text-zinc-900">MODE</span>
            </span>
            <span className="text-[11px] font-medium text-zinc-500">
              Enterprise Admin Security
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-[#D91E2A] flex items-center justify-center shrink-0">
            {isInactivity ? (
              <Clock className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-[#D91E2A] border border-rose-200/80">
              <span>Session Expired</span>
            </div>
            <h2
              id="admin-session-expired-title"
              className="text-lg font-bold text-zinc-900 tracking-tight"
            >
              {isInactivity
                ? 'Logged Out Due to Inactivity'
                : 'Your Admin Session Has Expired'}
            </h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {isInactivity
                ? 'For your security, administrator sessions automatically time out after 30 minutes of inactivity. Your session token has been invalidated.'
                : 'Your administrator session token is no longer valid or was signed out from another device. Please sign in again to continue.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 flex items-center justify-between">
            <span className="font-medium text-zinc-500">Security Policy</span>
            <span className="font-semibold text-zinc-900">30-Minute Auto-Timeout</span>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              id="session-expired-signin-btn"
              onClick={handleSignInAgain}
              className="w-full py-3 px-4 bg-[#D91E2A] hover:bg-[#B91822] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign In Again</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReturnToStorefront}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Storefront</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
