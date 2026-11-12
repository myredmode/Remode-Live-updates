import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, ShieldCheck, Phone, CheckCircle2, UserCheck, ArrowRight, RefreshCw, AlertCircle, Package, MapPin, Smartphone } from 'lucide-react';

interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, sendCustomerOtp, verifyCustomerOtp, logoutUser, isLoginOpen, setIsLoginOpen, orders, setActiveView } = useStore();
  const [mobileNumber, setMobileNumber] = useState('');
  const [saveForThisDevice, setSaveForThisDevice] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [instantFallbackOtp, setInstantFallbackOtp] = useState<string | null>(null);

  const show = isOpen !== undefined ? isOpen : isLoginOpen;
  const handleClose = () => {
    setErrorMessage(null);
    setInfoMessage(null);
    if (onClose) {
      onClose();
    } else {
      setIsLoginOpen(false);
    }
  };

  if (!show) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const clean = mobileNumber.replace(/\D/g, '');
    if (clean.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendCustomerOtp(clean);
      if (res.success) {
        setOtpSent(true);
        setInfoMessage(res.message);
        if (res.fallbackOtp) {
          setInstantFallbackOtp(res.fallbackOtp);
        } else {
          setInstantFallbackOtp(null);
        }
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    const clean = mobileNumber.replace(/\D/g, '');
    const res = verifyCustomerOtp(clean, otpCode.trim(), saveForThisDevice);

    if (res.success) {
      setIsVerifying(false);
      handleClose();
    } else {
      setIsVerifying(false);
      setErrorMessage(res.message);
    }
  };

  const handleResend = async () => {
    setErrorMessage(null);
    const clean = mobileNumber.replace(/\D/g, '');
    const res = await sendCustomerOtp(clean);
    if (res.success) {
      setInfoMessage(res.message || 'New OTP sent successfully.');
      if (res.fallbackOtp) {
        setInstantFallbackOtp(res.fallbackOtp);
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 animate-modal-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/70">
          <div>
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {userProfile.isLoggedIn ? 'Verified Customer Account' : 'Customer Mobile Sign In'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {userProfile.isLoggedIn
                ? 'Your authenticated phone number is connected to orders.'
                : 'Enter your 10-digit mobile number for instant OTP verification.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-full hover:bg-zinc-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {userProfile.isLoggedIn ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="w-12 h-12 rounded-full bg-[#121212] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-zinc-900 truncate">{userProfile.name || 'REDMODE Customer'}</h4>
                    <span className="text-[10px] font-mono bg-zinc-200/80 text-zinc-700 px-1.5 py-0.5 rounded">
                      {userProfile.customerId || `CUST-${(userProfile.mobileOrEmail || '').slice(-6)}`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">+91 {userProfile.mobileOrEmail}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Account Active
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                      <Smartphone className="w-3 h-3 text-zinc-500" />
                      {userProfile.savedForThisDevice !== false ? 'Saved on Device' : 'Session Only'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Account Benefits Card */}
              <div className="p-3.5 bg-zinc-50/70 rounded-xl border border-zinc-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Package className="w-4 h-4 text-zinc-600" /> Total Orders:
                  </span>
                  <span className="font-bold text-zinc-900 font-mono">
                    {orders.filter((o) => {
                      const custM = (userProfile.mobileOrEmail || '').replace(/\D/g, '').slice(-10);
                      const ordM = (o.customer?.mobile || o.customer?.phone || '').replace(/\D/g, '').slice(-10);
                      return custM && ordM === custM;
                    }).length} Orders
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-zinc-600" /> Saved Addresses:
                  </span>
                  <span className="font-semibold text-zinc-800">
                    {userProfile.savedAddresses && userProfile.savedAddresses.length > 0
                      ? `${userProfile.savedAddresses.length} Saved`
                      : 'Auto-saved on checkout'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      setActiveView('track-order');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-lg border border-zinc-300 text-zinc-800 text-xs font-semibold hover:bg-zinc-100 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4 text-zinc-600" />
                    <span>My Orders & Tracking</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-[#121212] text-white text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logoutUser();
                    setOtpSent(false);
                    setMobileNumber('');
                    setOtpCode('');
                  }}
                  className="w-full py-1.5 text-center text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Sign Out from this Device
                </button>
              </div>
            </div>
          ) : !otpSent ? (
            /* Mobile Phone Input Step */
            <form onSubmit={handleSendOtp} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Mobile Number <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-zinc-500 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    autoFocus
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210"
                    className="w-full pl-13 pr-10 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-[#121212]"
                  />
                  <Phone className="w-4 h-4 text-zinc-400 absolute right-3.5" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  A 6-digit OTP will be sent to your mobile for instant secure login.
                </p>
              </div>

              {/* Save Login for this Device */}
              <div className="pt-0.5">
                <label className="flex items-center gap-2.5 text-xs text-zinc-700 hover:text-zinc-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveForThisDevice}
                    onChange={(e) => setSaveForThisDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-[#121212] accent-[#121212] focus:ring-[#121212] cursor-pointer"
                  />
                  <span className="font-medium text-zinc-800">Save login for this device</span>
                </label>
                <p className="text-[11px] text-zinc-400 pl-6.5 mt-0.5">
                  Is device par baar-baar OTP verify nahi karna padega (Persistent Login).
                </p>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 px-4 rounded-lg bg-[#121212] text-white text-sm font-semibold hover:bg-zinc-800 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-[11px] text-zinc-500 text-center leading-relaxed pt-2">
                By verifying your phone number, you agree to REDMODE's Terms of Service & Privacy Policy.
              </div>
            </form>
          ) : (
            /* OTP Verification Step */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
                <div className="font-semibold flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>OTP Sent to +91 {mobileNumber}</span>
                  </span>
                  {instantFallbackOtp && (
                    <button
                      type="button"
                      onClick={() => setOtpCode(instantFallbackOtp)}
                      className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-[11px] font-bold transition cursor-pointer"
                    >
                      Use OTP: {instantFallbackOtp}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-emerald-800">
                  {instantFallbackOtp
                    ? `Instant Verification Code: ${instantFallbackOtp} (Click above or enter below to sign in)`
                    : (infoMessage || 'Please enter the 6-digit verification code sent to your mobile.')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Enter 6-Digit OTP <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full px-3.5 py-3 border border-zinc-300 rounded-lg text-center tracking-[0.4em] font-mono text-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#121212]"
                />
              </div>

              {/* Save Login for this Device in OTP Screen */}
              <div>
                <label className="flex items-center gap-2.5 text-xs text-zinc-700 hover:text-zinc-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveForThisDevice}
                    onChange={(e) => setSaveForThisDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-[#121212] accent-[#121212] focus:ring-[#121212] cursor-pointer"
                  />
                  <span className="font-medium text-zinc-800">Save login for this device</span>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setErrorMessage(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-800 hover:underline cursor-pointer"
                >
                  Change Mobile
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-rose-700 font-semibold hover:underline cursor-pointer"
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-lg bg-[#121212] text-white text-sm font-semibold hover:bg-zinc-800 transition shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 py-1 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
      <div id="customer-firebase-recaptcha" className="invisible fixed bottom-0 left-0" />
    </div>
  );
};
