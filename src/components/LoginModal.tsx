import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LoginModal: React.FC = () => {
  const {
    isLoginOpen,
    setIsLoginOpen,
    userProfile,
    loginUser,
    logoutUser,
    setActiveView,
    sendCustomerOtp,
    verifyCustomerOtp,
  } = useStore();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState(userProfile.mobile || userProfile.mobileOrEmail || '');
  const [name, setName] = useState(userProfile.name || '');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [saveForThisDevice, setSaveForThisDevice] = useState<boolean>(
    userProfile.savedForThisDevice !== undefined ? userProfile.savedForThisDevice : true
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isLoginOpen) {
      setStep('mobile');
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setInfoMessage(null);
      if (userProfile.mobile || userProfile.mobileOrEmail) {
        setMobile(userProfile.mobile || userProfile.mobileOrEmail);
      }
      if (userProfile.name) setName(userProfile.name);
    }
  }, [isLoginOpen, userProfile.mobile, userProfile.mobileOrEmail, userProfile.name]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isLoginOpen) return null;

  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const result = await sendCustomerOtp(cleanMobile);
      if (!result.success) {
        setErrorMessage(result.message);
        setIsSendingOtp(false);
        return;
      }

      setInfoMessage(result.message);
      setStep('otp');
      setResendTimer(30);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setErrorMessage(null);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      e.preventDefault();
      const updated = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        updated[i] = pasted[i];
      }
      setOtpDigits(updated);
      const focusIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[focusIdx]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSendingOtp) return;
    setErrorMessage(null);
    setIsSendingOtp(true);
    try {
      const result = await sendCustomerOtp(cleanMobile);
      if (result.success) {
        setOtpDigits(['', '', '', '', '', '']);
        setInfoMessage(`A fresh 6-digit OTP has been sent to +91 ${cleanMobile}`);
        setResendTimer(30);
        otpInputRefs.current[0]?.focus();
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP sent to your mobile.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const verification = await verifyCustomerOtp(cleanMobile, enteredOtp, saveForThisDevice);
      if (!verification.success) {
        setErrorMessage(verification.message);
        return;
      }

      if (name.trim()) {
        loginUser({
          name: name.trim(),
          mobile: cleanMobile,
          email: userProfile.email || '',
          savedForThisDevice: saveForThisDevice,
        });
      }

      setIsLoginOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const displayMobile = userProfile.mobile || userProfile.mobileOrEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsLoginOpen(false)}
      />

      <div className="relative w-full max-w-[440px] bg-white rounded-2xl border border-zinc-200/90 shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Clean Minimal Header */}
        <div className="px-6 pt-6 pb-4 bg-white border-b border-zinc-100 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg font-extrabold tracking-[0.18em] uppercase select-none">
              <span className="text-[#D91E2A]">RED</span>
              <span className="text-zinc-900">MODE</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              className="p-1.5 -mr-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">
            {userProfile.isLoggedIn
              ? `Welcome, ${userProfile.name || `+91 ${displayMobile}`}`
              : step === 'mobile'
              ? 'Welcome Back'
              : 'Verify OTP'}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {userProfile.isLoggedIn
              ? 'Signed in to your RedMode account'
              : step === 'mobile'
              ? 'Sign in to your RedMode account'
              : `Enter the 6-digit code sent to +91 ${cleanMobile}`}
          </p>
        </div>

        {userProfile.isLoggedIn ? (
          <div className="p-6 space-y-5">
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900">
                <p className="font-semibold">Verified Mobile Account</p>
                <p className="text-emerald-700 mt-0.5">
                  +91 {displayMobile}{' '}
                  {userProfile.savedForThisDevice ? '• Saved on this device' : '• Current session only'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-600 border border-zinc-200 rounded-xl p-4 bg-zinc-50/60">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Mobile Number</span>
                <span className="font-semibold text-zinc-900">+91 {displayMobile}</span>
              </div>
              {userProfile.name && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Your Name</span>
                  <span className="font-semibold text-zinc-900">{userProfile.name}</span>
                </div>
              )}
              {userProfile.address?.city && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Saved City</span>
                  <span className="font-semibold text-zinc-900">
                    {userProfile.address.city}, {userProfile.address.state} - {userProfile.address.pincode}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsLoginOpen(false);
                  setActiveView('account');
                }}
                className="py-3 px-4 bg-[#D91E2A] hover:bg-[#B91822] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                My Orders & Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  setStep('mobile');
                  setMobile('');
                }}
                className="py-3 px-4 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Logout Device
              </button>
            </div>
          </div>
        ) : step === 'mobile' ? (
          <form onSubmit={handleRequestOtp} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1.5">
                Mobile Number
              </label>
              <div className="flex rounded-xl border border-zinc-200 focus-within:border-[#D91E2A] focus-within:ring-2 focus-within:ring-[#D91E2A]/15 transition-all overflow-hidden bg-white">
                <span className="inline-flex items-center px-3.5 bg-zinc-50 border-r border-zinc-200 text-sm font-medium text-zinc-700 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, ''));
                    setErrorMessage(null);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1.5">
                You&apos;ll receive an OTP via WhatsApp.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#D91E2A] focus:ring-2 focus:ring-[#D91E2A]/15 transition-all bg-white"
              />
            </div>

            <label className="flex items-center gap-2.5 pt-0.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveForThisDevice}
                onChange={(e) => setSaveForThisDevice(e.target.checked)}
                className="w-4 h-4 accent-[#D91E2A] rounded border-zinc-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-700">
                Save login on this device
              </span>
            </label>

            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full py-3 px-4 mt-1 bg-[#D91E2A] hover:bg-[#B91822] active:scale-[0.99] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
            >
              <span>{isSendingOtp ? 'Sending OTP...' : 'Continue with OTP \u2192'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndComplete} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && !errorMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-800">
                  Enter 6-Digit OTP
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('mobile');
                    setErrorMessage(null);
                  }}
                  className="text-xs font-medium text-[#D91E2A] hover:underline cursor-pointer"
                >
                  Change Number (+91 {cleanMobile})
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-full h-11 text-center text-base font-semibold rounded-xl border border-zinc-200 focus:border-[#D91E2A] focus:ring-2 focus:ring-[#D91E2A]/15 focus:outline-none bg-white text-zinc-900 transition-all"
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveForThisDevice}
                onChange={(e) => setSaveForThisDevice(e.target.checked)}
                className="w-4 h-4 accent-[#D91E2A] rounded border-zinc-300 cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-700">
                Save login on this device
              </span>
            </label>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-zinc-500">Didn&apos;t receive the code?</span>
              {resendTimer > 0 ? (
                <span className="font-medium text-zinc-400">Resend OTP in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-semibold text-[#D91E2A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp}
              className="w-full py-3 px-4 bg-[#D91E2A] hover:bg-[#B91822] active:scale-[0.99] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
            >
              <span>{isVerifyingOtp ? 'Verifying...' : 'Verify OTP & Sign In \u2192'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

