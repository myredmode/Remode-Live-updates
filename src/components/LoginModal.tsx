import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ShieldCheck, CheckCircle2, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [mobile, setMobile] = useState(userProfile.mobile || '');
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
      if (userProfile.mobile) setMobile(userProfile.mobile);
      if (userProfile.name) setName(userProfile.name);
    }
  }, [isLoginOpen, userProfile.mobile, userProfile.name]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsLoginOpen(false)}
      />

      <div className="relative w-full max-w-md bg-white border border-zinc-200 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Banner */}
        <div className="bg-[#121212] text-white p-6 relative">
          <button
            onClick={() => setIsLoginOpen(false)}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-rose-400 block mb-1">
            REDMODE Official Account
          </span>
          <h2 className="font-display text-2xl font-bold tracking-wide">
            {userProfile.isLoggedIn
              ? `Welcome, ${userProfile.name || `+91 ${userProfile.mobile}`}`
              : step === 'mobile'
              ? 'Mobile OTP Sign In'
              : 'Verify 6-Digit OTP'}
          </h2>
          <p className="text-xs text-zinc-300 mt-1">
            {userProfile.isLoggedIn
              ? 'Your mobile number is verified and ready for instant shopping & order tracking.'
              : step === 'mobile'
              ? 'No password or username needed. Sign in securely using your 10-digit mobile number.'
              : `Enter the 6-digit verification code sent to +91 ${cleanMobile}`}
          </p>
        </div>

        {userProfile.isLoggedIn ? (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900">
                <p className="font-bold">Verified Mobile Account</p>
                <p className="text-emerald-700 mt-0.5">
                  +91 {userProfile.mobile}{' '}
                  {userProfile.savedForThisDevice ? '• Saved on this device' : '• Current session only'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 border border-zinc-200 p-4 bg-zinc-50">
              <div className="flex justify-between">
                <span className="text-zinc-400 uppercase font-semibold">Mobile Number:</span>
                <span className="font-bold text-zinc-900">+91 {userProfile.mobile}</span>
              </div>
              {userProfile.name && (
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase font-semibold">Customer Name:</span>
                  <span className="font-semibold text-zinc-900">{userProfile.name}</span>
                </div>
              )}
              {userProfile.address?.city && (
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase font-semibold">Saved City:</span>
                  <span className="font-semibold text-zinc-900">
                    {userProfile.address.city}, {userProfile.address.state} - {userProfile.address.pincode}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  setIsLoginOpen(false);
                  setActiveView('account');
                }}
                className="py-3 bg-zinc-900 text-white text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition cursor-pointer"
              >
                My Orders & Profile
              </button>
              <button
                onClick={() => {
                  logoutUser();
                  setStep('mobile');
                  setMobile('');
                }}
                className="py-3 border border-rose-200 text-rose-700 text-xs font-bold tracking-widest uppercase hover:bg-rose-50 transition cursor-pointer"
              >
                Logout Device
              </button>
            </div>
          </div>
        ) : step === 'mobile' ? (
          <form onSubmit={handleRequestOtp} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                Mobile Number (WhatsApp / SMS) <span className="text-rose-600">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3.5 bg-zinc-100 border border-r-0 border-zinc-300 text-xs font-bold text-zinc-700">
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
                  className="w-full px-3.5 py-3 border border-zinc-300 text-sm font-medium focus:outline-none focus:border-zinc-900"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                Your Name <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3.5 py-2.5 border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 bg-zinc-50 border border-zinc-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveForThisDevice}
                onChange={(e) => setSaveForThisDevice(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-zinc-900 rounded cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-zinc-900 block">Save login for this device</span>
                <span className="text-zinc-500 text-[11px]">
                  Stay signed in on this browser so you don&apos;t have to verify OTP next time.
                </span>
              </div>
            </label>

            <div className="bg-zinc-50 p-3 border border-zinc-200 flex items-start gap-2.5 text-xs text-zinc-600">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                You will receive a 6-digit one-time verification code (OTP) to authenticate your account and view all orders.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full py-3.5 bg-[#121212] hover:bg-zinc-800 disabled:opacity-60 text-white text-xs font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSendingOtp ? 'Sending OTP...' : 'Send 6-Digit OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndComplete} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && !errorMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Enter 6-Digit OTP
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('mobile');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
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
                    className="w-full h-12 text-center text-lg font-bold border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none bg-white"
                  />
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 bg-zinc-50 border border-zinc-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveForThisDevice}
                onChange={(e) => setSaveForThisDevice(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-zinc-900 rounded cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-zinc-900 block">Save login for this device</span>
                <span className="text-zinc-500 text-[11px]">
                  Keep my account logged in on this phone/computer for 1-click checkout.
                </span>
              </div>
            </label>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-500">Didn&apos;t receive the code?</span>
              {resendTimer > 0 ? (
                <span className="font-semibold text-zinc-400">Resend OTP in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-bold text-zinc-900 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp}
              className="w-full py-3.5 bg-[#121212] hover:bg-zinc-800 disabled:opacity-60 text-white text-xs font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isVerifyingOtp ? 'Verifying...' : 'Verify OTP & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
