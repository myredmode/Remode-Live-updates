import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Check,
  AlertTriangle,
  X,
  Copy,
  Globe,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentGatewayConfig, PaymentGatewayProvider, PaymentMarketAudience } from '../../types';

interface UniversalPaymentPanelProps {
  onSaveNotification?: (msg: string) => void;
}

interface ProviderPresetMeta {
  provider: PaymentGatewayProvider;
  label: string;
  defaultName: string;
  targetMarket: PaymentMarketAudience;
  currency: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiSecretLabel: string;
  apiSecretPlaceholder: string;
  description: string;
}

const PROVIDER_PRESETS: Record<PaymentGatewayProvider, ProviderPresetMeta> = {
  razorpay: {
    provider: 'razorpay',
    label: 'Razorpay',
    defaultName: 'Razorpay (India - UPI, Cards & NetBanking)',
    targetMarket: 'domestic',
    currency: 'INR',
    apiKeyLabel: 'Key ID',
    apiKeyPlaceholder: 'rzp_live_... or rzp_test_...',
    apiSecretLabel: 'Key Secret',
    apiSecretPlaceholder: 'Enter Razorpay Key Secret',
    description: 'UPI (GPay/PhonePe), RuPay, Visa, Mastercard, NetBanking & Wallets.',
  },
  paypal: {
    provider: 'paypal',
    label: 'PayPal Express',
    defaultName: 'PayPal Express (Global Export)',
    targetMarket: 'international',
    currency: 'USD',
    apiKeyLabel: 'Client ID',
    apiKeyPlaceholder: 'Enter PayPal REST API Client ID',
    apiSecretLabel: 'Client Secret',
    apiSecretPlaceholder: 'Enter PayPal Client Secret',
    description: 'Accept PayPal wallet, international Credit/Debit cards in USD/EUR.',
  },
  phonepe: {
    provider: 'phonepe',
    label: 'PhonePe PG',
    defaultName: 'PhonePe Payment Gateway',
    targetMarket: 'domestic',
    currency: 'INR',
    apiKeyLabel: 'Merchant ID',
    apiKeyPlaceholder: 'Enter PhonePe Merchant ID',
    apiSecretLabel: 'Salt Key',
    apiSecretPlaceholder: 'Enter PhonePe Salt Key',
    description: 'Direct Mobile UPI intent gateway via PhonePe merchant suite.',
  },
  cashfree: {
    provider: 'cashfree',
    label: 'Cashfree Payments',
    defaultName: 'Cashfree PG',
    targetMarket: 'domestic',
    currency: 'INR',
    apiKeyLabel: 'App ID',
    apiKeyPlaceholder: 'Enter Cashfree App ID',
    apiSecretLabel: 'Secret Key',
    apiSecretPlaceholder: 'Enter Cashfree Secret Key',
    description: 'Domestic payment gateway with UPI, Cards, NetBanking, and Pay Later.',
  },
  stripe: {
    provider: 'stripe',
    label: 'Stripe Global',
    defaultName: 'Stripe Global Payments',
    targetMarket: 'international',
    currency: 'USD',
    apiKeyLabel: 'Publishable Key',
    apiKeyPlaceholder: 'pk_live_... or pk_test_...',
    apiSecretLabel: 'Secret Key',
    apiSecretPlaceholder: 'sk_live_... or sk_test_...',
    description: 'Global credit cards and Apple Pay / Google Pay in 135+ currencies.',
  },
  upi_qr: {
    provider: 'upi_qr',
    label: 'Direct Business UPI',
    defaultName: 'Direct Business UPI QR',
    targetMarket: 'domestic',
    currency: 'INR',
    apiKeyLabel: 'Business UPI VPA',
    apiKeyPlaceholder: 'e.g. redmode@okicici or merchant@upi',
    apiSecretLabel: 'Payee Account Name',
    apiSecretPlaceholder: 'e.g. REDMODE APPARELS',
    description: '0% fee direct bank account UPI QR payment with instant settlement.',
  },
  custom: {
    provider: 'custom',
    label: 'Custom Gateway',
    defaultName: 'Custom Payment Channel',
    targetMarket: 'both',
    currency: 'INR',
    apiKeyLabel: 'API Key / Merchant Key',
    apiKeyPlaceholder: 'Enter custom API key',
    apiSecretLabel: 'API Secret / Passphrase',
    apiSecretPlaceholder: 'Enter custom API secret',
    description: 'Connect any custom regional or proprietary payment gateway API.',
  },
};

export const UniversalPaymentPanel: React.FC<UniversalPaymentPanelProps> = ({
  onSaveNotification,
}) => {
  const { settings, updatePaymentGateways } = useStore();

  // Load Gateways list
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(() => {
    if (settings.paymentGateways && settings.paymentGateways.length > 0) {
      return settings.paymentGateways;
    }
    return [
      {
        id: 'razorpay_domestic',
        name: 'Razorpay (India - UPI, Cards & NetBanking)',
        provider: 'razorpay',
        enabled: true,
        isPrimary: true,
        targetMarket: 'domestic',
        apiKey: settings.razorpaySettings?.keyId || 'rzp_test_TgYmLmX3cPZpNk',
        apiSecret: settings.razorpaySettings?.keySecret || 'Asrb0WLHUFBi3iEU3FK1DfiN',
        merchantName: settings.razorpaySettings?.merchantName || 'REDMODE',
        currency: 'INR',
        mode: settings.razorpaySettings?.mode || 'test',
        themeColor: '#111827',
      },
      {
        id: 'paypal_export',
        name: 'PayPal Express (Global Export)',
        provider: 'paypal',
        enabled: true,
        isPrimary: false,
        targetMarket: 'international',
        apiKey: 'paypal_sandbox_export_client_id',
        apiSecret: 'paypal_sandbox_export_secret_key',
        merchantName: 'REDMODE International',
        currency: 'USD',
        mode: 'test',
        themeColor: '#003087',
      },
    ];
  });

  const [activeDomesticId, setActiveDomesticId] = useState<string>(() => {
    return settings.activePaymentGatewayId || 'razorpay_domestic';
  });

  const [activeInternationalId, setActiveInternationalId] = useState<string>(() => {
    return settings.activeInternationalGatewayId || 'paypal_export';
  });

  const [selectedGatewayId, setSelectedGatewayId] = useState<string>(() => {
    return settings.activePaymentGatewayId || 'razorpay_domestic';
  });

  // UI States
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isAddGatewayOpen, setIsAddGatewayOpen] = useState<boolean>(false);
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGatewayConfig | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState<boolean>(false);

  // Sync state if settings change externally
  useEffect(() => {
    if (settings.paymentGateways && settings.paymentGateways.length > 0) {
      setGateways(settings.paymentGateways);
    }
    if (settings.activePaymentGatewayId) {
      setActiveDomesticId(settings.activePaymentGatewayId);
    }
    if (settings.activeInternationalGatewayId) {
      setActiveInternationalId(settings.activeInternationalGatewayId);
    }
  }, [settings.paymentGateways, settings.activePaymentGatewayId, settings.activeInternationalGatewayId]);

  // Current selected gateway
  const currentGateway =
    gateways.find((g) => g.id === selectedGatewayId) || gateways[0] || null;

  const currentMeta = currentGateway
    ? PROVIDER_PRESETS[currentGateway.provider] || PROVIDER_PRESETS.custom
    : PROVIDER_PRESETS.razorpay;

  // Field change handler
  const handleFieldChange = (field: keyof PaymentGatewayConfig, value: any) => {
    if (!currentGateway) return;
    setGateways((prev) =>
      prev.map((g) => {
        if (g.id === currentGateway.id) {
          return { ...g, [field]: value };
        }
        return g;
      })
    );
  };

  // Switch active gateway
  const handleMakeActive = (gateway: PaymentGatewayConfig) => {
    let nextDomestic = activeDomesticId;
    let nextInternational = activeInternationalId;

    if (gateway.targetMarket === 'international') {
      nextInternational = gateway.id;
      setActiveInternationalId(gateway.id);
    } else {
      nextDomestic = gateway.id;
      setActiveDomesticId(gateway.id);
    }

    const updated = gateways.map((g) => {
      if (g.id === gateway.id) {
        return { ...g, enabled: true, isPrimary: true };
      }
      return g;
    });

    setGateways(updated);
    updatePaymentGateways(updated, nextDomestic, nextInternational);

    setNotification({
      type: 'success',
      text: `"${gateway.name}" is now the active gateway for ${
        gateway.targetMarket === 'international' ? 'international export orders' : 'domestic orders'
      }.`,
    });
    if (onSaveNotification) {
      onSaveNotification(`Active Gateway: ${gateway.name}`);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Add a new gateway partner
  const handleSelectNewProvider = (prov: PaymentGatewayProvider) => {
    const meta = PROVIDER_PRESETS[prov] || PROVIDER_PRESETS.custom;
    const newId = `${prov}_${Date.now()}`;
    const newGateway: PaymentGatewayConfig = {
      id: newId,
      name: meta.defaultName,
      provider: prov,
      enabled: true,
      isPrimary: false,
      targetMarket: meta.targetMarket,
      apiKey: '',
      apiSecret: '',
      merchantName: 'REDMODE',
      currency: meta.currency,
      mode: 'test',
      themeColor: '#111827',
    };

    const updated = [...gateways, newGateway];
    setGateways(updated);
    setSelectedGatewayId(newId);
    setIsAddGatewayOpen(false);

    setNotification({
      type: 'info',
      text: `Added ${meta.label}. Fill your credentials and test connection below.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (!gatewayToDelete) return;
    if (gateways.length <= 1) {
      setNotification({
        type: 'error',
        text: 'At least one payment gateway must remain configured.',
      });
      setGatewayToDelete(null);
      return;
    }

    const remaining = gateways.filter((g) => g.id !== gatewayToDelete.id);
    if (selectedGatewayId === gatewayToDelete.id) {
      setSelectedGatewayId(remaining[0]?.id || '');
    }

    let nextDomestic = activeDomesticId;
    let nextInternational = activeInternationalId;
    if (gatewayToDelete.id === activeDomesticId) {
      nextDomestic = remaining.find((g) => g.targetMarket !== 'international')?.id || remaining[0].id;
      setActiveDomesticId(nextDomestic);
    }
    if (gatewayToDelete.id === activeInternationalId) {
      nextInternational = remaining.find((g) => g.targetMarket === 'international')?.id || remaining[0].id;
      setActiveInternationalId(nextInternational);
    }

    setGateways(remaining);
    updatePaymentGateways(remaining, nextDomestic, nextInternational);

    const deletedName = gatewayToDelete.name;
    setGatewayToDelete(null);

    setNotification({
      type: 'success',
      text: `Payment gateway "${deletedName}" was deleted successfully.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Save changes
  const handleSaveChanges = () => {
    updatePaymentGateways(gateways, activeDomesticId, activeInternationalId);
    setNotification({
      type: 'success',
      text: 'Payment gateway settings saved successfully.',
    });
    if (onSaveNotification) {
      onSaveNotification('Payment gateway settings saved successfully.');
    }
    setTimeout(() => setNotification(null), 3500);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!currentGateway) return;
    setIsTesting(true);
    setTestResult(null);

    const parseSafeJson = async (res: Response) => {
      const raw = await res.text();
      if (!raw || !raw.trim().startsWith('{')) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'x-admin-role': 'Super Admin',
    };

    try {
      if (currentGateway.provider === 'razorpay') {
        const res = await fetch('/api/payment/razorpay/test-keys', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            keyId: currentGateway.apiKey,
            keySecret: currentGateway.apiSecret,
          }),
        });
        const data = await parseSafeJson(res);
        setIsTesting(false);
        setTestResult({
          success: Boolean(res.ok && data?.success),
          message:
            data?.message ||
            (res.ok ? 'Razorpay connection verified successfully!' : `Razorpay test failed (HTTP ${res.status}). Check Key ID and Secret.`),
        });
      } else if (currentGateway.provider === 'paypal') {
        const res = await fetch('/api/payment/paypal/test-keys', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            clientId: currentGateway.apiKey,
            clientSecret: currentGateway.apiSecret,
            mode: currentGateway.mode,
          }),
        });
        const data = await parseSafeJson(res);
        setIsTesting(false);
        setTestResult({
          success: Boolean(res.ok && data?.success),
          message:
            data?.message ||
            (res.ok ? 'PayPal Express International gateway verified successfully!' : `PayPal test failed (HTTP ${res.status}). Check Client ID and Secret.`),
        });
      } else {
        const res = await fetch('/api/payment/gateway/test', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            provider: currentGateway.provider,
            apiKey: currentGateway.apiKey,
            apiSecret: currentGateway.apiSecret,
            mode: currentGateway.mode,
          }),
        });
        const data = await parseSafeJson(res);
        setIsTesting(false);
        setTestResult({
          success: Boolean(res.ok && data?.success),
          message:
            data?.message ||
            (res.ok ? `${currentGateway.name} validated successfully.` : `Gateway validation failed (HTTP ${res.status}).`),
        });
      }
    } catch (err: any) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: `Connection test failed for ${currentGateway.name}: ${err?.message || 'Unable to reach gateway endpoint.'}`,
      });
    }
  };

  // Copy webhook URL
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/payment/webhook`
    : '/api/payment/webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  // Lock background body scroll when modals open
  useEffect(() => {
    if (isAddGatewayOpen || gatewayToDelete) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isAddGatewayOpen, gatewayToDelete]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddGatewayOpen(false);
        setGatewayToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-lg border text-[14px] flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. PAYMENT GATEWAYS LIST SECTION (Exact match to Courier Channels) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Payment Gateways</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add and manage your payment partners. Domestic orders route to Razorpay (UPI &amp; Cards), and export orders route to PayPal.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddGatewayOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Gateway</span>
          </button>
        </div>

        {/* Compact Gateway Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {gateways.map((g) => {
            const isDomesticActive = g.id === activeDomesticId;
            const isExportActive = g.id === activeInternationalId;
            const isActive = isDomesticActive || isExportActive;
            const isSelected = g.id === selectedGatewayId;
            const isConfigured = Boolean(g.apiKey && g.apiKey.trim().length > 0);

            return (
              <div
                key={g.id}
                onClick={() => setSelectedGatewayId(g.id)}
                className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        {g.provider === 'paypal' ? (
                          <span className="font-black text-xs text-[#003087]">PP</span>
                        ) : g.provider === 'razorpay' ? (
                          <span className="font-mono font-bold text-[10px] text-[#0c2340]">rzp</span>
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{g.name}</h4>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {g.targetMarket === 'international' ? 'PayPal • Export (Global)' : `${g.provider} • Domestic (India)`}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        ACTIVE
                      </span>
                    ) : !isConfigured ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        NEEDS SETUP
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-100 shrink-0">
                        INACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMakeActive(g);
                        }}
                        className="text-slate-800 hover:text-black font-semibold cursor-pointer"
                      >
                        Make Active
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGatewayId(g.id);
                      }}
                      className="text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {gateways.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGatewayToDelete(g);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                      title="Delete Gateway"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. GATEWAY CONFIGURATION SECTION (Exact match to Courier Configuration) */}
      {currentGateway && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-slate-900">{currentGateway.name}</h3>
              {currentGateway.id === activeDomesticId || currentGateway.id === activeInternationalId ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-100">
                  INACTIVE
                </span>
              )}
            </div>

            {currentGateway.id !== activeDomesticId && currentGateway.id !== activeInternationalId && (
              <button
                type="button"
                onClick={() => handleMakeActive(currentGateway)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer self-start sm:self-auto"
              >
                Make Active
              </button>
            )}
          </div>

          {/* Test connection feedback banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              <span>{testResult.message}</span>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form Groups */}
          <div className="space-y-5">
            {/* Group 1: General & API Credentials */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                API Credentials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Gateway / Channel Display Name
                  </label>
                  <input
                    type="text"
                    value={currentGateway.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Market / Audience
                  </label>
                  <select
                    value={currentGateway.targetMarket}
                    onChange={(e) => handleFieldChange('targetMarket', e.target.value as PaymentMarketAudience)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition cursor-pointer"
                  >
                    <option value="domestic">🇮🇳 Domestic Only (India Buyers - UPI &amp; Cards)</option>
                    <option value="international">🌐 International Only (Export / Non-Indian Buyers)</option>
                    <option value="both">🌍 Global (Both Domestic &amp; Export)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {currentMeta.apiKeyLabel}
                  </label>
                  <input
                    type="text"
                    value={currentGateway.apiKey}
                    onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                    placeholder={currentMeta.apiKeyPlaceholder}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {currentMeta.apiSecretLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={currentGateway.apiSecret || ''}
                      onChange={(e) => handleFieldChange('apiSecret', e.target.value)}
                      placeholder={currentMeta.apiSecretPlaceholder}
                      className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Merchant Name on Modal
                  </label>
                  <input
                    type="text"
                    value={currentGateway.merchantName || 'REDMODE'}
                    onChange={(e) => handleFieldChange('merchantName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Environment Mode
                  </label>
                  <select
                    value={currentGateway.mode}
                    onChange={(e) => handleFieldChange('mode', e.target.value as 'test' | 'live')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition cursor-pointer"
                  >
                    <option value="test">Test / Sandbox Mode</option>
                    <option value="live">Production Live</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Settlement Currency
                  </label>
                  <select
                    value={currentGateway.currency || 'INR'}
                    onChange={(e) => handleFieldChange('currency', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition cursor-pointer"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar (Export)</option>
                    <option value="EUR">EUR (€) - Euro (Export)</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              {currentGateway.id !== activeDomesticId &&
                currentGateway.id !== activeInternationalId &&
                gateways.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setGatewayToDelete(currentGateway)}
                    className="px-3 py-2 text-rose-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer"
                  >
                    Delete Gateway
                  </button>
                )}
            </div>

            <button
              type="button"
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 self-end sm:self-auto"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. WEBHOOK COMPACT SECTION (Exact match to Courier Webhook) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
        <h4 className="text-sm font-semibold text-slate-900">Webhook / Callback URL</h4>
        <div className="flex items-center gap-2 max-w-2xl">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
          />
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            {webhookCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{webhookCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Use this webhook in your payment partner dashboard (Razorpay / PayPal) to receive automated payment confirmation callbacks.
        </p>
      </div>

      {/* MODAL 1: ADD PAYMENT GATEWAY PARTNER (Exact match to Add Courier Modal) */}
      {isAddGatewayOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddGatewayOpen(false);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Add Payment Partner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a payment provider to configure credentials and activate for checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddGatewayOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(PROVIDER_PRESETS) as PaymentGatewayProvider[]).map((prov) => {
                  const meta = PROVIDER_PRESETS[prov];
                  return (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => handleSelectNewProvider(prov)}
                      className="p-3 text-left border border-slate-200 hover:border-slate-900 hover:bg-slate-50/70 rounded-xl transition cursor-pointer flex items-center gap-2.5"
                    >
                      <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        {prov === 'paypal' ? (
                          <span className="font-black text-xs text-[#003087]">PP</span>
                        ) : prov === 'razorpay' ? (
                          <span className="font-mono font-bold text-[10px] text-[#0c2340]">rzp</span>
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-slate-900">{meta.label}</h5>
                        <p className="text-[10px] text-slate-400">
                          {meta.targetMarket === 'international' ? 'Export Only' : 'Standard API'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 border-t border-slate-100 px-5 py-3 bg-slate-50/95 backdrop-blur-xs flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAddGatewayOpen(false)}
                className="px-4 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE MODAL (Exact match to Courier Delete Modal) */}
      {gatewayToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGatewayToDelete(null);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-sm w-full max-h-[85vh] flex flex-col p-5 border border-slate-200 shadow-2xl space-y-4 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Delete payment integration?</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This will remove the saved credentials and configuration for <strong>{gatewayToDelete.name}</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGatewayToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGatewayToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-xl transition cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
