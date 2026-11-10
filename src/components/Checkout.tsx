import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerAddress, Order } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Truck,
  RotateCcw,
  Clock,
  ArrowRight,
  Printer,
  PackageCheck,
  AlertCircle,
  Phone,
  Unlock,
  Loader2,
  AlertTriangle,
  Globe,
} from 'lucide-react';

export const Checkout: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    autoDiscountAmount,
    isAutoDiscountApplied,
    cartGstAmount,
    deliveryFee,
    cartTotalAmount,
    placeOrder,
    setActiveView,
    settings,
    lastConfirmedOrder,
    userProfile,
    setIsLoginOpen,
    getCustomerCodEligibility,
    getCustomerPreviousRtoReason,
    userCountry,
    currency,
    exchangeRate,
    formatPrice,
  } = useStore();

  // Address State (Syncs with geo-detected country on initial load)
  const [address, setAddress] = useState<CustomerAddress>({
    name: userProfile.name || '',
    mobile: userProfile.mobileOrEmail || '',
    email: '',
    country: userCountry && userCountry !== 'India' && currency === 'USD' ? userCountry : 'India',
    house: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  // Pincode lookup state
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodeSuccess, setPincodeSuccess] = useState(false);
  const [isCityStateLocked, setIsCityStateLocked] = useState(false);

  // International Export detection
  const isInternational = Boolean(address.country && address.country !== 'India');
  // Approx USD amount conversion (1 USD ≈ configured exchangeRate INR)
  const effectiveExchangeRate = exchangeRate || 84;
  const approxUsdAmount = Math.max(1, Math.round((cartTotalAmount / effectiveExchangeRate) * 100) / 100);

  // Sync userProfile when logged in or changes
  useEffect(() => {
    if (userProfile.isLoggedIn && userProfile.mobileOrEmail) {
      setAddress((prev) => ({
        ...prev,
        mobile: userProfile.mobileOrEmail,
        name: prev.name || userProfile.name || '',
      }));
    }
  }, [userProfile]);

  // Handle automatic Pincode lookup (only for India domestic addresses)
  useEffect(() => {
    if (isInternational) {
      setPincodeSuccess(false);
      setIsCityStateLocked(false);
      return;
    }
    const cleanPincode = (address.pincode || '').replace(/\D/g, '');
    if (cleanPincode.length === 6) {
      setIsLookingUpPincode(true);
      fetch(`/api/pincode/lookup/${cleanPincode}`)
        .then((res) => res.json())
        .then((data) => {
          setIsLookingUpPincode(false);
          if (data.city && data.state) {
            setAddress((prev) => ({
              ...prev,
              city: data.city,
              state: data.state,
            }));
            setPincodeSuccess(true);
            setIsCityStateLocked(true);
          }
        })
        .catch(() => {
          setIsLookingUpPincode(false);
        });
    } else {
      setPincodeSuccess(false);
      setIsCityStateLocked(false);
    }
  }, [address.pincode, isInternational]);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<'COD' | 'Prepaid'>('Prepaid');
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'razorpay' | 'paypal'>('razorpay');
  const [prepaidType, setPrepaidType] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentGatewayModal, setPaymentGatewayModal] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(lastConfirmedOrder);
  const [formError, setFormError] = useState<string | null>(null);

  // Optional manual coupon input
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Check customer COD eligibility via verified mobile number
  const effectiveMobile = address.mobile || userProfile.mobileOrEmail;
  const codEligibility = getCustomerCodEligibility(effectiveMobile);
  const previousRtoReason = getCustomerPreviousRtoReason(effectiveMobile);

  // Force Prepaid & PayPal for International Export orders
  useEffect(() => {
    if (isInternational) {
      setSelectedPaymentProvider('paypal');
      if (paymentMode === 'COD') {
        setPaymentMode('Prepaid');
      }
    }
  }, [isInternational, paymentMode]);

  // If COD is not available, automatically keep payment mode on Prepaid
  useEffect(() => {
    if (!codEligibility.codAvailable && paymentMode === 'COD') {
      setPaymentMode('Prepaid');
    }
  }, [codEligibility.codAvailable, paymentMode]);

  // If cart is empty and no confirmed order, show redirect
  if (cart.length === 0 && !confirmedOrder) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-2xl font-bold text-zinc-900">Your Cart is Empty</h2>
        <p className="text-zinc-500 text-sm mt-2">Add your favorite items before checkout.</p>
        <button
          onClick={() => setActiveView('catalogue')}
          className="mt-6 px-8 py-3 bg-[#121212] text-white text-xs uppercase font-bold tracking-widest cursor-pointer"
        >
          Browse Catalogue
        </button>
      </div>
    );
  }

  // Handle Form Validation
  const validateAddress = (): boolean => {
    if (!userProfile.isLoggedIn) {
      setFormError('Account verification is compulsory. Please login with your mobile number.');
      setIsLoginOpen(true);
      return false;
    }
    if (!address.name.trim()) {
      setFormError('Please enter full customer name.');
      return false;
    }
    if (!address.mobile.trim() || (isInternational ? address.mobile.length < 7 : address.mobile.length < 10)) {
      setFormError(isInternational ? 'Please enter a valid international contact number.' : 'Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!address.house.trim()) {
      setFormError('Please enter Flat / House / Building details.');
      return false;
    }
    if (!address.street.trim()) {
      setFormError('Please enter Street / Area / Locality.');
      return false;
    }
    if (isInternational) {
      if (!address.pincode.trim() || address.pincode.trim().length < 3) {
        setFormError('Please enter a valid Postal / ZIP Code.');
        return false;
      }
    } else {
      if (!address.pincode.trim() || address.pincode.length !== 6) {
        setFormError('Please enter valid 6-digit Pincode.');
        return false;
      }
    }
    if (!address.city.trim()) {
      setFormError('Please enter City.');
      return false;
    }
    if (!address.state.trim()) {
      setFormError(isInternational ? 'Please enter State / Province / Region.' : 'Please enter State.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // COD Order Flow
  const handlePlaceOrderCOD = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddress()) return;

    if (isInternational) {
      setFormError('Cash on Delivery is unavailable for international export orders. Please use PayPal.');
      return;
    }

    if (!codEligibility.codAvailable) {
      setFormError('COD is not available for this account. Please proceed with Prepaid payment.');
      return;
    }

    const newOrder = placeOrder(address, 'COD', 'Pending');
    setConfirmedOrder(newOrder);
  };

  // PayPal International Export Payment Flow
  const handleInitiatePayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddress()) return;

    setIsProcessingPayment(true);
    setFormError(null);

    const activePaypal =
      settings.paymentGateways?.find((g) => g.provider === 'paypal') || {
        apiKey: 'paypal_sandbox_export_client_id',
        apiSecret: 'paypal_sandbox_export_secret_key',
        mode: 'test',
      };

    try {
      // 1. Create order on backend
      const res = await fetch('/api/payment/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInr: cartTotalAmount,
          currency: 'USD',
          clientIdOverride: activePaypal.apiKey,
          clientSecretOverride: activePaypal.apiSecret,
          mode: activePaypal.mode,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to initialize PayPal export order.');
      }

      // 2. Capture / Confirm international payment
      const captureRes = await fetch('/api/payment/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
        }),
      });

      const captureData = await captureRes.json();
      if (captureData.success) {
        const newOrder = placeOrder(address, 'Prepaid', 'Paid', {
          razorpayPaymentId: captureData.orderId || `PP-${Date.now()}`,
          razorpayOrderId: `PAYPAL-USD-${orderData.amountUsd}`,
          razorpaySignature: 'VERIFIED_PAYPAL_EXPORT',
        });
        setConfirmedOrder(newOrder);
      } else {
        throw new Error('PayPal payment verification could not be confirmed.');
      }
    } catch (err: any) {
      setFormError(`PayPal error: ${err.message || 'Failed to complete international transaction.'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Load Razorpay Checkout SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Prepaid Order Flow with Razorpay
  const handleInitiatePrepaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddress()) return;

    setIsProcessingPayment(true);
    setFormError(null);

    const rzpSettings = settings.razorpaySettings;
    const keyId = (rzpSettings?.keyId || '').trim();
    const keySecret = (rzpSettings?.keySecret || '').trim();

    try {
      // 1. Create order on backend
      const res = await fetch('/api/payment/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotalAmount,
          receipt: `rcpt_${Date.now()}`,
          notes: {
            customerMobile: address.mobile,
            customerName: address.name,
            pincode: address.pincode,
          },
          keyIdOverride: keyId,
          keySecretOverride: keySecret,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to initialize payment gateway.');
      }

      // Check if real key is configured and Razorpay script loads
      const isScriptLoaded = await loadRazorpayScript();
      const hasRealKey = keyId && !keyId.startsWith('rzp_test_simulated');

      if (isScriptLoaded && hasRealKey && !orderData.simulated) {
        // Resolve absolute brand logo URL for Razorpay iframe
        const resolvedLogo = settings.logoUrl?.startsWith('http')
          ? settings.logoUrl
          : typeof window !== 'undefined'
          ? `${window.location.origin}/assets/2.png`
          : '/assets/2.png';

        // Real Razorpay Checkout modal
        const options = {
          key: orderData.keyId || keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: rzpSettings?.merchantName || 'REDMODE',
          description: `Order Payment for ${cart.length} item(s)`,
          image: resolvedLogo,
          order_id: orderData.orderId,
          prefill: {
            name: address.name,
            contact: address.mobile,
            email: userProfile.mobileOrEmail.includes('@') ? userProfile.mobileOrEmail : `${address.mobile}@redmode.in`,
          },
          theme: {
            color: rzpSettings?.themeColor || '#111827',
            backdrop_color: 'rgba(0, 0, 0, 0.75)',
            hide_topbar: false,
          },
          modal: {
            backdropclose: false,
            escape: true,
            handleback: true,
            confirm_close: true,
            ondismiss: () => {
              setIsProcessingPayment(false);
            },
          },
          handler: async (response: any) => {
            try {
              // Verify signature
              const verifyRes = await fetch('/api/payment/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  keySecretOverride: keySecret,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                const newOrder = placeOrder(address, 'Prepaid', 'Paid', {
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                });
                setConfirmedOrder(newOrder);
              } else {
                setFormError('Payment verification failed. If money was debited, it will be auto-refunded.');
              }
            } catch (err: any) {
              setFormError('Failed to verify payment with server.');
            } finally {
              setIsProcessingPayment(false);
            }
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setIsProcessingPayment(false);
          setFormError(`Payment failed: ${resp.error?.description || 'Transaction cancelled or declined by bank.'}`);
        });
        rzp.open();
      } else {
        // Fallback / Sandbox Simulation Modal
        setIsProcessingPayment(false);
        setPaymentGatewayModal(true);
      }
    } catch (err: any) {
      setIsProcessingPayment(false);
      // Fallback to simulation modal if offline/error
      setPaymentGatewayModal(true);
    }
  };

  const handleSimulatePaymentSuccess = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentGatewayModal(false);
      const mockPayId = `pay_sim_${Date.now().toString().slice(-8)}`;
      const newOrder = placeOrder(address, 'Prepaid', 'Paid', {
        razorpayPaymentId: mockPayId,
        razorpayOrderId: `order_sim_${Date.now().toString().slice(-6)}`,
      });
      setConfirmedOrder(newOrder);
    }, 1200);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAutoDiscountApplied) {
      setCouponMessage(`Automatic 10% offer is already applied on your order!`);
    } else {
      setCouponMessage(`Cart values above ₹${settings.autoDiscountThreshold || 999} get 10% automatically.`);
    }
  };

  // ==========================================
  // CONFIRMATION VIEW
  // ==========================================
  if (confirmedOrder) {
    return (
      <div className="bg-zinc-50 min-h-screen py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white border border-zinc-200 shadow-xl rounded-none p-6 sm:p-10 space-y-8">
          {/* Green confirmation title */}
          <div className="text-center space-y-3 pb-6 border-b border-zinc-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight flex items-center justify-center gap-2">
              <span>🟢 YAY! Your order has been confirmed!</span>
            </h1>
            <p className="text-base sm:text-lg font-bold text-zinc-900">
              Your Order ID is <span className="font-mono text-zinc-950 underline">{confirmedOrder.id}</span>
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              We have received your order. Tracking updates will be delivered via WhatsApp and SMS once dispatched.
            </p>
          </div>

          {/* Order Summary & Delivery Details */}
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-zinc-900 uppercase tracking-wider">Order Summary</h3>
            <div className="divide-y divide-zinc-100 border border-zinc-200 p-4 bg-zinc-50/50">
              {confirmedOrder.items.map((item, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-14 object-cover border" />
                    <div>
                      <p className="font-bold text-zinc-900">{item.name}</p>
                      <p className="text-zinc-500">
                        Size:{' '}
                        {item.size?.toLowerCase().includes('free') ? (
                          <em className="italic font-normal text-zinc-900">Free size</em>
                        ) : (
                          <strong>{item.size}</strong>
                        )}
                        {item.color && (
                          <span> • Color: <strong className="text-zinc-800">{item.color}</strong></span>
                        )}{' '}
                        • Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 p-4 border border-zinc-200 bg-white">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>₹{confirmedOrder.subtotal}</span>
              </div>
              {confirmedOrder.discount > 0 && (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Auto-applied 10% Discount</span>
                  <span>- ₹{confirmedOrder.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>GST (5%)</span>
                <span>₹{confirmedOrder.gst}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping</span>
                <span className="text-emerald-700 font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-zinc-950 border-t pt-2 mt-2">
                <span>Total Paid / Payable</span>
                <span>₹{confirmedOrder.total}</span>
              </div>
            </div>

            {/* Address Details */}
            <div className="p-4 border border-zinc-200 bg-zinc-50">
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider mb-2">Delivery Address</h4>
              <p className="font-semibold text-zinc-800">{confirmedOrder.customer.name}</p>
              <p className="text-zinc-600">{confirmedOrder.customer.house}, {confirmedOrder.customer.street}</p>
              <p className="text-zinc-600">{confirmedOrder.customer.city}, {confirmedOrder.customer.state} - {confirmedOrder.customer.pincode}</p>
              <p className="text-zinc-600">Mobile: {confirmedOrder.customer.mobile || confirmedOrder.customer.phone}</p>
              <p className="text-zinc-600 mt-1 font-medium">
                Payment Mode: <strong className="uppercase">{confirmedOrder.paymentMode || confirmedOrder.paymentMethod}</strong> ({confirmedOrder.paymentStatus})
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200">
            <button
              onClick={() => setActiveView('track-order')}
              className="flex-1 py-3.5 bg-[#121212] hover:bg-zinc-800 text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Track Your Order</span>
            </button>
            <button
              onClick={() => window.print()}
              className="py-3.5 px-6 border border-zinc-300 text-zinc-800 hover:bg-zinc-100 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={() => setActiveView('home')}
              className="py-3.5 px-6 border border-zinc-300 text-zinc-800 hover:bg-zinc-100 text-xs font-bold tracking-widest uppercase cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CHECKOUT FORM VIEW
  // ==========================================
  return (
    <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mandatory Account Verification Notice if not logged in */}
        {!userProfile.isLoggedIn && (
          <div className="mb-6 p-4 bg-zinc-900 text-white rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Customer Verification Required</h3>
                <p className="text-xs text-zinc-300 mt-0.5">
                  No guest checkout. Verify your 10-digit mobile number with an OTP to link and place your order.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="px-5 py-2.5 bg-white text-zinc-900 text-xs font-bold uppercase tracking-wider rounded hover:bg-zinc-100 transition shrink-0 cursor-pointer shadow"
            >
              Login via Mobile OTP
            </button>
          </div>
        )}

        {/* Checkout Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 uppercase tracking-tight">
            Secure Checkout
          </h1>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit Encrypted Checkout • Verified Customer Accounts Only</span>
          </p>
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: Address & Payment Flow */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Address */}
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#121212] text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-bold text-sm sm:text-base text-zinc-900 uppercase tracking-wider">
                    Delivery Address
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-rose-600">* All Fields Compulsory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Destination Country Selection */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase tracking-wider text-zinc-700">
                      Destination Country <span className="text-rose-600">*</span>
                    </label>
                    {isInternational ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Global Export Shipping
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5">
                        🇮🇳 Domestic Delivery
                      </span>
                    )}
                  </div>
                  <select
                    value={address.country || 'India'}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setAddress((prev) => ({
                        ...prev,
                        country: newCountry,
                        pincode: newCountry === 'India' ? prev.pincode.slice(0, 6) : prev.pincode,
                      }));
                      if (newCountry !== 'India') {
                        setSelectedPaymentProvider('paypal');
                        setPaymentMode('Prepaid');
                      } else {
                        setSelectedPaymentProvider('razorpay');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 bg-white font-medium focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="India">🇮🇳 India (Domestic Delivery)</option>
                    <option value="United States">🇺🇸 United States (Global Export)</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom (Global Export)</option>
                    <option value="United Arab Emirates">🇦🇪 United Arab Emirates (UAE / Dubai)</option>
                    <option value="Canada">🇨🇦 Canada (Global Export)</option>
                    <option value="Australia">🇦🇺 Australia (Global Export)</option>
                    <option value="Germany">🇩🇪 Germany (Europe Export)</option>
                    <option value="Singapore">🇸🇬 Singapore (Global Export)</option>
                    <option value="Other International">🌍 Other International Country (Global Export)</option>
                  </select>
                </div>

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Customer Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Mobile Number - Linked to verified account */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase tracking-wider text-zinc-700">
                      Contact Number (Compulsory) <span className="text-rose-600">*</span>
                    </label>
                    {userProfile.isLoggedIn && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Account Verified
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-500 font-semibold text-xs select-none">
                      {isInternational ? '+' : '+91'}
                    </span>
                    <input
                      type="tel"
                      maxLength={isInternational ? 16 : 10}
                      required
                      value={address.mobile}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^\d+]/g, '');
                        setAddress({ ...address, mobile: clean });
                      }}
                      placeholder={isInternational ? '1 555 123 4567' : '9876543210'}
                      className="w-full pl-10 pr-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 tracking-wider focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>

                {/* Flat / House No */}
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Flat / House No. / Building Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.house}
                    onChange={(e) => setAddress({ ...address, house: e.target.value })}
                    placeholder="e.g. Flat 302, Royal Residency"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Street / Area */}
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Street / Colony / Area <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder="e.g. 12th Main, Indiranagar"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Pincode / Postal Code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase tracking-wider text-zinc-700">
                      {isInternational ? 'Postal / ZIP Code' : 'Pincode'} <span className="text-rose-600">*</span>
                    </label>
                    {isLookingUpPincode && (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                      </span>
                    )}
                    {pincodeSuccess && (
                      <span className="text-[10px] font-semibold text-emerald-700">
                        Pincode Verified
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={isInternational ? 10 : 6}
                    required
                    value={address.pincode}
                    onChange={(e) => {
                      const val = isInternational ? e.target.value : e.target.value.replace(/\D/g, '');
                      setAddress({ ...address, pincode: val });
                    }}
                    placeholder={isInternational ? 'e.g. 90210 / SW1A 1AA' : '6-digit Pincode'}
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900 uppercase"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Landmark <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                    placeholder="e.g. Near Metro Station"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* City */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase tracking-wider text-zinc-700">
                      City / Town <span className="text-rose-600">*</span>
                    </label>
                    {isCityStateLocked && !isInternational && (
                      <button
                        type="button"
                        onClick={() => setIsCityStateLocked(false)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                        title="Click to edit manually"
                      >
                        <Unlock className="w-2.5 h-2.5" /> Edit
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      readOnly={isCityStateLocked && !isInternational}
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder={isInternational ? 'e.g. New York / London' : 'Auto-filled from pincode'}
                      className={`w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900 ${
                        isCityStateLocked && !isInternational ? 'bg-zinc-100/70 cursor-not-allowed text-zinc-800' : 'bg-white'
                      }`}
                    />
                    {isCityStateLocked && !isInternational && (
                      <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-3 select-none" />
                    )}
                  </div>
                </div>

                {/* State / Region */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase tracking-wider text-zinc-700">
                      {isInternational ? 'State / Province' : 'State'} <span className="text-rose-600">*</span>
                    </label>
                    {isCityStateLocked && !isInternational && (
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Auto-detected
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      readOnly={isCityStateLocked && !isInternational}
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder={isInternational ? 'e.g. California / England' : 'Auto-filled from pincode'}
                      className={`w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900 ${
                        isCityStateLocked && !isInternational ? 'bg-zinc-100/70 cursor-not-allowed text-zinc-800' : 'bg-white'
                      }`}
                    />
                    {isCityStateLocked && !isInternational && (
                      <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-3 select-none" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Payment Method */}
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#121212] text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-bold text-sm sm:text-base text-zinc-900 uppercase tracking-wider">
                    Payment Option
                  </h2>
                </div>
                {isInternational && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> PayPal Global Export
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* 1. International Export ONLY: PayPal Express */}
                {isInternational ? (
                  <div className="space-y-3">
                    <label
                      className="flex items-start gap-4 p-4 border-2 border-[#003087] bg-blue-50/40 cursor-pointer transition shadow-xs"
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        checked={true}
                        readOnly
                        className="mt-1 accent-[#003087] cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 text-sm">
                              PayPal Express (International Export)
                            </span>
                            <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-100 px-2 py-0.5">
                              USD (${approxUsdAmount})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">PayPal Account</span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                          Cross-border order to <strong>{address.country}</strong>. Pay securely in USD directly via your PayPal account.
                        </p>

                        <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs">
                          <span className="text-zinc-600">Total Billed: <strong className="text-zinc-950 font-bold">USD ${approxUsdAmount}</strong> <span className="text-zinc-400">(Approx. ₹{cartTotalAmount} INR)</span></span>
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Buyer Protection Included
                          </span>
                        </div>
                      </div>
                    </label>

                    {/* Strict COD Notice for Foreign / Export Orders */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-none text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">No Cash on Delivery (COD) for International Orders</span>
                        <span className="text-amber-800 text-[11px] leading-relaxed">
                          Cash on Delivery is strictly unavailable for shipments outside India. All foreign export orders are securely processed online via PayPal Express.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Domestic Option A: Razorpay UPI / Cards */}
                    <label
                      onClick={() => {
                        setPaymentMode('Prepaid');
                        setSelectedPaymentProvider('razorpay');
                      }}
                      className={`flex items-start gap-4 p-4 border cursor-pointer transition ${
                        paymentMode === 'Prepaid' && selectedPaymentProvider === 'razorpay'
                          ? 'border-zinc-950 bg-zinc-50'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        value="Prepaid_Razorpay"
                        checked={paymentMode === 'Prepaid' && selectedPaymentProvider === 'razorpay'}
                        onChange={() => {
                          setPaymentMode('Prepaid');
                          setSelectedPaymentProvider('razorpay');
                        }}
                        className="mt-1 accent-zinc-950 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 text-sm">
                            Prepaid (UPI / Cards / Net Banking)
                          </span>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5">
                            Instant Verification
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Pay securely via Google Pay, PhonePe, Paytm, BHIM, Cards, or Net Banking.
                        </p>

                        {paymentMode === 'Prepaid' && selectedPaymentProvider === 'razorpay' && (
                          <div className="mt-3 pt-3 border-t border-zinc-200 flex flex-wrap gap-2 text-xs">
                            {['UPI / QR', 'RuPay & Cards', 'Net Banking'].map((m) => (
                              <span
                                key={m}
                                className="px-2.5 py-1 bg-white border border-zinc-300 font-medium text-zinc-700 rounded"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Domestic Option B: Cash on Delivery (COD) */}
                    <div
                      className={`border transition ${
                        !codEligibility.codAvailable
                          ? 'border-zinc-200 bg-zinc-50/80 opacity-90'
                          : paymentMode === 'COD'
                          ? 'border-zinc-950 bg-zinc-50'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <label
                        className={`flex items-start gap-4 p-4 ${
                          !codEligibility.codAvailable ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMode"
                          value="COD"
                          disabled={!codEligibility.codAvailable}
                          checked={paymentMode === 'COD'}
                          onChange={() => {
                            if (codEligibility.codAvailable) {
                              setPaymentMode('COD');
                            }
                          }}
                          className="mt-1 accent-zinc-950 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-sm ${!codEligibility.codAvailable ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>
                              Cash on Delivery (COD)
                            </span>
                            {!codEligibility.codAvailable ? (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded uppercase">
                                COD Not Available
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-200 px-2 py-0.5">
                                Pay at Doorstep
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            Pay cash or UPI directly to the delivery agent upon receiving your order.
                          </p>

                          {/* COD Restriction notice if genuine RTO occurred */}
                          {!codEligibility.codAvailable && (
                            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>COD Restricted for this Number</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-rose-700">
                                Cash on Delivery is unavailable due to a previously returned (RTO) shipment on this mobile number.
                                {previousRtoReason && (
                                  <span className="block mt-0.5 font-medium">
                                    Courier Reason: <strong>{previousRtoReason}</strong>
                                  </span>
                                )}
                                <span className="block mt-1 text-emerald-800 font-semibold">
                                  Complete this order via Prepaid to automatically restore COD privileges for future orders.
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Place Order Button */}
              <div className="mt-6 pt-4 border-t border-zinc-200">
                {!userProfile.isLoggedIn ? (
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Verify Mobile Number to Checkout</span>
                  </button>
                ) : isInternational || selectedPaymentProvider === 'paypal' ? (
                  <button
                    id="checkout-pay-paypal-btn"
                    disabled={isProcessingPayment}
                    onClick={handleInitiatePayPal}
                    className="w-full py-4 bg-[#003087] hover:bg-[#002266] text-white text-xs sm:text-sm font-bold tracking-widest uppercase transition flex items-center justify-center gap-2.5 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.82A.802.802 0 0 1 5.736 2.2h7.027c3.553 0 5.86 1.83 5.418 5.485-.386 3.195-2.52 5.093-5.69 5.093h-2.31a.801.801 0 0 0-.792.682l-1.313 7.877z"/>
                    </svg>
                    <span>
                      {isProcessingPayment
                        ? 'Connecting to PayPal...'
                        : `PAY WITH PAYPAL (USD $${approxUsdAmount})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : paymentMode === 'COD' ? (
                  <button
                    id="checkout-place-order-cod-btn"
                    onClick={handlePlaceOrderCOD}
                    className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <span>Place COD Order (₹{cartTotalAmount})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="checkout-pay-prepaid-btn"
                    onClick={handleInitiatePrepaid}
                    className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Proceed to Pay Online (₹{cartTotalAmount})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Order Summary, Policies & Delivery Details */}
          <div className="lg:col-span-5 space-y-6">
            {/* Order Summary Box */}
            <div className="bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-3">
                Order Summary ({cart.reduce((t, i) => t + i.quantity, 0)} Items)
              </h3>

              {/* Items List */}
              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const itemImg = item.selectedColorImage || item.product.mainImage;
                  return (
                    <div
                      key={`${item.productId}-${item.selectedSize}-${item.selectedColor || 'default'}`}
                      className="py-3 flex gap-3"
                    >
                      <img
                        src={itemImg}
                        alt={item.product.name}
                        className="w-14 h-16 object-cover border border-zinc-200 shrink-0 bg-zinc-50"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">{item.product.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Size:{' '}
                          {item.selectedSize?.toLowerCase().includes('free') ? (
                            <em className="italic font-normal text-zinc-900">Free size</em>
                          ) : (
                            <strong>{item.selectedSize}</strong>
                          )}
                          {item.selectedColor && (
                            <span> • Color: <strong className="text-zinc-900">{item.selectedColor}</strong></span>
                          )}{' '}
                          • Qty: {item.quantity}
                        </p>
                        <p className="text-xs font-bold text-zinc-950 mt-1">
                          ₹{item.product.price * item.quantity}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="pt-2 border-t border-zinc-200 flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon Code"
                  className="flex-1 px-3 py-2 text-xs border border-zinc-300 uppercase rounded-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold uppercase cursor-pointer"
                >
                  Apply
                </button>
              </form>

              {couponMessage && (
                <p className="text-[11px] font-medium text-rose-700">{couponMessage}</p>
              )}

              {/* Pricing Calculation Details */}
              <div className="border-t border-zinc-200 pt-3 space-y-2 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold text-zinc-900">₹{cartSubtotal}</span>
                </div>

                {isAutoDiscountApplied && (
                  <div className="flex justify-between text-rose-700 font-semibold bg-rose-50 p-2 rounded">
                    <span>Auto 10% Offer on ₹{settings.autoDiscountThreshold || 999}+</span>
                    <span>- ₹{autoDiscountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>GST (5% Apparel Standard)</span>
                  <span>₹{cartGstAmount}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-700 font-bold">
                    {deliveryFee === 0 ? 'FREE (PAN India)' : `₹${deliveryFee}`}
                  </span>
                </div>

                <div className="border-t border-zinc-200 pt-3 flex justify-between text-lg font-extrabold text-zinc-950">
                  <span>Final Amount</span>
                  <span>₹{cartTotalAmount}</span>
                </div>
              </div>
            </div>

            {/* Policies Section */}
            <div className="bg-white border border-zinc-200 p-6 space-y-4 shadow-sm text-xs">
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-2">
                Customer Assurance & Policies
              </h4>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">Estimated Delivery Time</span>
                  <p className="text-zinc-600">
                    {settings.deliveryEstimate || '3-5 Business Days across all Indian states and pin codes.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">Return & Exchange Policy</span>
                  <p className="text-zinc-600">
                    {settings.returnPolicyText || 'Easy 7-day hassle-free return and size exchange. Reverse courier pickup provided.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">Express Delivery Policy</span>
                  <p className="text-zinc-600">
                    Orders are dispatched swiftly. Complete live tracking provided via Delhivery and SMS/WhatsApp notifications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Gateway Verification Modal */}
      {paymentGatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border border-zinc-200 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#0c2340] text-[#3395ff] font-black text-xs flex items-center justify-center tracking-tighter">
                  rzp
                </div>
                <div>
                  <h3 className="font-display font-bold text-zinc-900 text-sm">Razorpay Secure Checkout</h3>
                  <p className="text-[10px] text-zinc-500">256-bit SSL Encrypted • RBI Authorized</p>
                </div>
              </div>
              <span className="font-extrabold text-zinc-900 text-base">₹{cartTotalAmount}</span>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Sandbox Test Mode Active</span>
                  <p className="text-[11px] text-blue-700">
                    Live Razorpay keys are not yet configured in Admin Settings. You can click &quot;Confirm &amp; Pay&quot; to test prepaid order placement safely!
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border rounded-lg space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Select Payment Method</span>
                  <span className="text-emerald-700 font-bold text-[11px]">100% Safe UPI &amp; Cards</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrepaidType('upi')}
                    className={`flex-1 py-2 text-xs font-bold rounded border cursor-pointer ${
                      prepaidType === 'upi' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-700'
                    }`}
                  >
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrepaidType('card')}
                    className={`flex-1 py-2 text-xs font-bold rounded border cursor-pointer ${
                      prepaidType === 'card' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-700'
                    }`}
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrepaidType('netbanking')}
                    className={`flex-1 py-2 text-xs font-bold rounded border cursor-pointer ${
                      prepaidType === 'netbanking' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-700'
                    }`}
                  >
                    NetBanking
                  </button>
                </div>

                {prepaidType === 'upi' && (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-32 h-32 mx-auto bg-white border border-zinc-300 p-2 flex items-center justify-center font-mono text-xs font-bold text-zinc-800">
                      [UPI QR CODE]
                    </div>
                    <span className="text-[11px] text-zinc-500">Scan via GPay / PhonePe / Paytm</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaymentGatewayModal(false)}
                className="flex-1 py-3 text-xs font-bold text-zinc-600 border border-zinc-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleSimulatePaymentSuccess}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
              >
                {isProcessingPayment ? (
                  <span>Verifying Payment...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Pay ₹{cartTotalAmount}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
