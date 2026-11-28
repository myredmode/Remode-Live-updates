import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentGatewayConfig, PaymentGatewayProvider, PaymentMarketAudience } from '../../types';
import {
  IntegrationStatusIndicator,
  SaveChangesButton,
  TestConnectionButton,
  InlineActionFeedback,
  SaveButtonState,
  TestButtonState,
  IntegrationConnectionStatus,
} from './IntegrationActionControls';

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

const cleanPaymentCredential = (val?: string): string => {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed || trimmed.toLowerCase().includes('paypal_sandbox_export')) return '';
  return trimmed;
};

const cleanGatewayList = (list: PaymentGatewayConfig[]): PaymentGatewayConfig[] =>
  list.map((g) => ({
    ...g,
    apiKey: cleanPaymentCredential(g.apiKey),
    apiSecret: cleanPaymentCredential(g.apiSecret),
    webhookSecret: cleanPaymentCredential(g.webhookSecret),
  }));

export const UniversalPaymentPanel: React.FC<UniversalPaymentPanelProps> = ({
  onSaveNotification,
}) => {
  const { settings, updatePaymentGateways } = useStore();

  // Load Gateways list
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(() => {
    if (Array.isArray(settings.paymentGateways)) {
      return cleanGatewayList(settings.paymentGateways);
    }
    return [
      {
        id: 'razorpay_domestic',
        name: 'Razorpay (India - UPI, Cards & NetBanking)',
        provider: 'razorpay',
        enabled: true,
        isPrimary: true,
        targetMarket: 'domestic',
        apiKey: cleanPaymentCredential(settings.razorpaySettings?.keyId),
        apiSecret: cleanPaymentCredential(settings.razorpaySettings?.keySecret),
        merchantName: settings.razorpaySettings?.merchantName || 'REDMODE',
        currency: 'INR',
        mode: settings.razorpaySettings?.mode || 'live',
        themeColor: '#111827',
      },
      {
        id: 'paypal_export',
        name: 'PayPal Express (Global Export)',
        provider: 'paypal',
        enabled: true,
        isPrimary: false,
        targetMarket: 'international',
        apiKey: '',
        apiSecret: '',
        merchantName: 'REDMODE International',
        currency: 'USD',
        mode: 'live',
        themeColor: '#003087',
      },
    ];
  });

  const [activeDomesticId, setActiveDomesticId] = useState<string>(() => {
    return settings.activePaymentGatewayId !== undefined
      ? settings.activePaymentGatewayId
      : 'razorpay_domestic';
  });

  const [activeInternationalId, setActiveInternationalId] = useState<string>(() => {
    return settings.activeInternationalGatewayId !== undefined
      ? settings.activeInternationalGatewayId
      : 'paypal_export';
  });

  const [selectedGatewayId, setSelectedGatewayId] = useState<string>(() => {
    if (settings.activePaymentGatewayId) return settings.activePaymentGatewayId;
    if (settings.activeInternationalGatewayId) return settings.activeInternationalGatewayId;
    if (Array.isArray(settings.paymentGateways)) return settings.paymentGateways[0]?.id || '';
    return 'razorpay_domestic';
  });

  // UI States
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isAddGatewayOpen, setIsAddGatewayOpen] = useState<boolean>(false);
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGatewayConfig | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testButtonState, setTestButtonState] = useState<TestButtonState>('idle');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveButtonState, setSaveButtonState] = useState<SaveButtonState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState<boolean>(false);

  const saveTimerRef = useRef<number | null>(null);
  const testTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
    };
  }, []);

  // Sync state if settings change externally (preserving empty arrays & explicit deactivated IDs)
  useEffect(() => {
    if (Array.isArray(settings.paymentGateways)) {
      const cleaned = cleanGatewayList(settings.paymentGateways);
      setGateways(cleaned);
      if (selectedGatewayId && !cleaned.some((g) => g.id === selectedGatewayId)) {
        setSelectedGatewayId(cleaned[0]?.id || '');
      } else if (!selectedGatewayId && cleaned.length > 0) {
        setSelectedGatewayId(cleaned[0].id);
      }
    }
    if (settings.activePaymentGatewayId !== undefined) {
      setActiveDomesticId(settings.activePaymentGatewayId);
    }
    if (settings.activeInternationalGatewayId !== undefined) {
      setActiveInternationalId(settings.activeInternationalGatewayId);
    }
  }, [settings.paymentGateways, settings.activePaymentGatewayId, settings.activeInternationalGatewayId]);

  // Current selected gateway
  const currentGateway =
    gateways.find((g) => g.id === selectedGatewayId) || gateways[0] || null;

  const currentMeta = currentGateway
    ? PROVIDER_PRESETS[currentGateway.provider] || PROVIDER_PRESETS.custom
    : PROVIDER_PRESETS.razorpay;

  const isGatewayActive = (g: PaymentGatewayConfig): boolean =>
    (g.id === activeDomesticId || g.id === activeInternationalId) && g.enabled !== false;

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

  // Activate gateway
  const handleMakeActive = (gateway: PaymentGatewayConfig) => {
    let nextDomestic = activeDomesticId;
    let nextInternational = activeInternationalId;

    if (gateway.targetMarket === 'international') {
      nextInternational = gateway.id;
      if (nextDomestic === gateway.id) nextDomestic = '';
    } else if (gateway.targetMarket === 'both') {
      nextDomestic = gateway.id;
      nextInternational = gateway.id;
    } else {
      nextDomestic = gateway.id;
      if (nextInternational === gateway.id) nextInternational = '';
    }

    setActiveDomesticId(nextDomestic);
    setActiveInternationalId(nextInternational);

    const updated = gateways.map((g) => {
      if (g.id === gateway.id) {
        return { ...g, enabled: true, isPrimary: g.id === nextDomestic };
      }
      return { ...g, isPrimary: g.id === nextDomestic };
    });

    setGateways(updated);
    updatePaymentGateways(updated, nextDomestic, nextInternational);

    setNotification({
      type: 'success',
      text: `"${gateway.name}" is now active for ${
        gateway.targetMarket === 'international'
          ? 'international export orders'
          : gateway.targetMarket === 'both'
          ? 'domestic & international orders'
          : 'domestic orders'
      }.`,
    });
    if (onSaveNotification) {
      onSaveNotification(`Activated Gateway: ${gateway.name}`);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Deactivate gateway
  const handleDeactivate = (gateway: PaymentGatewayConfig) => {
    const nextDomestic = activeDomesticId === gateway.id ? '' : activeDomesticId;
    const nextInternational = activeInternationalId === gateway.id ? '' : activeInternationalId;

    setActiveDomesticId(nextDomestic);
    setActiveInternationalId(nextInternational);

    const updated = gateways.map((g) =>
      g.id === gateway.id ? { ...g, enabled: false, isPrimary: false } : g
    );

    setGateways(updated);
    updatePaymentGateways(updated, nextDomestic, nextInternational);

    setNotification({
      type: 'info',
      text: `"${gateway.name}" has been deactivated and hidden from checkout.`,
    });
    if (onSaveNotification) {
      onSaveNotification(`Deactivated Gateway: ${gateway.name}`);
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

  // Confirm delete handler (permanent removal)
  const handleConfirmDelete = () => {
    if (!gatewayToDelete) return;

    const remaining = gateways.filter((g) => g.id !== gatewayToDelete.id);
    if (selectedGatewayId === gatewayToDelete.id) {
      setSelectedGatewayId(remaining[0]?.id || '');
    }

    let nextDomestic = activeDomesticId;
    let nextInternational = activeInternationalId;
    if (gatewayToDelete.id === activeDomesticId) {
      nextDomestic = '';
      setActiveDomesticId('');
    }
    if (gatewayToDelete.id === activeInternationalId) {
      nextInternational = '';
      setActiveInternationalId('');
    }

    setGateways(remaining);
    updatePaymentGateways(remaining, nextDomestic, nextInternational);

    const deletedName = gatewayToDelete.name;
    setGatewayToDelete(null);
    setTestResult(null);

    setNotification({
      type: 'success',
      text: `Payment gateway "${deletedName}" was permanently deleted.`,
    });
    if (onSaveNotification) {
      onSaveNotification(`Deleted Gateway: ${deletedName}`);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveButtonState('saving');
    setSaveError(null);

    const cleaned = gateways.map((g) => ({
      ...g,
      name: (g.name || '').trim() || g.name,
      apiKey: cleanPaymentCredential(g.apiKey),
      apiSecret: cleanPaymentCredential(g.apiSecret),
      webhookSecret: cleanPaymentCredential(g.webhookSecret),
      merchantName: (g.merchantName || 'REDMODE').trim(),
    }));
    setGateways(cleaned);

    const result = await updatePaymentGateways(cleaned, activeDomesticId, activeInternationalId);
    if (result?.success !== false) {
      setSaveButtonState('saved');
      saveTimerRef.current = window.setTimeout(() => {
        setSaveButtonState('idle');
      }, 2000);
    } else {
      setSaveButtonState('error');
      setSaveError(result?.error || 'Failed to save payment gateway settings. Please try again.');
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!currentGateway) return;
    if (testTimerRef.current) window.clearTimeout(testTimerRef.current);

    const cleanKey = cleanPaymentCredential(currentGateway.apiKey);
    const cleanSecret = cleanPaymentCredential(currentGateway.apiSecret);

    if (!cleanKey) {
      setTestButtonState('failed');
      setTestResult({
        success: false,
        message: `Please enter your ${currentMeta.apiKeyLabel} before testing connection.`,
      });
      testTimerRef.current = window.setTimeout(() => setTestButtonState('idle'), 2000);
      return;
    }

    if (currentGateway.provider !== 'upi_qr' && !cleanSecret) {
      setTestButtonState('failed');
      setTestResult({
        success: false,
        message: `Please enter your ${currentMeta.apiSecretLabel} before testing connection.`,
      });
      testTimerRef.current = window.setTimeout(() => setTestButtonState('idle'), 2000);
      return;
    }

    setIsTesting(true);
    setTestButtonState('testing');
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

    const adminToken =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    };

    try {
      let ok = false;
      let msg = '';

      if (currentGateway.provider === 'razorpay') {
        const res = await fetch('/api/payment/razorpay/test-keys', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            keyId: cleanKey,
            keySecret: cleanSecret,
          }),
        });
        const data = await parseSafeJson(res);
        ok = Boolean(res.ok && data?.success);
        msg =
          data?.message ||
          (ok ? 'Razorpay connection verified successfully.' : `Razorpay test failed (HTTP ${res.status}). Check Key ID and Secret.`);
      } else if (currentGateway.provider === 'paypal') {
        const res = await fetch('/api/payment/paypal/test-keys', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            clientId: cleanKey,
            clientSecret: cleanSecret,
            mode: currentGateway.mode,
          }),
        });
        const data = await parseSafeJson(res);
        ok = Boolean(res.ok && data?.success);
        msg =
          data?.message ||
          (ok ? 'PayPal Express International gateway verified successfully.' : `PayPal test failed (HTTP ${res.status}). Check Client ID and Secret.`);
      } else {
        const res = await fetch('/api/payment/gateway/test', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            provider: currentGateway.provider,
            apiKey: cleanKey,
            apiSecret: cleanSecret,
            mode: currentGateway.mode,
          }),
        });
        const data = await parseSafeJson(res);
        ok = Boolean(res.ok && data?.success);
        msg =
          data?.message ||
          (ok ? `${currentGateway.name} validated successfully.` : `Gateway validation failed (HTTP ${res.status}).`);
      }

      setIsTesting(false);
      setTestButtonState(ok ? 'connected' : 'failed');
      setTestResult({ success: ok, message: msg });
    } catch (err: any) {
      setIsTesting(false);
      setTestButtonState('failed');
      setTestResult({
        success: false,
        message: `Connection test failed for ${currentGateway.name}: ${err?.message || 'Unable to reach gateway endpoint.'}`,
      });
    } finally {
      testTimerRef.current = window.setTimeout(() => {
        setTestButtonState('idle');
      }, 2000);
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

  const getGatewayStatus = (g: PaymentGatewayConfig): { status: IntegrationConnectionStatus; label: string } => {
    const isActive = isGatewayActive(g);
    const isConfigured = Boolean(g.apiKey && g.apiKey.trim().length > 0);
    if (g.id === currentGateway?.id) {
      if (saveButtonState === 'saving') return { status: 'saving', label: 'Saving' };
      if (isTesting || testButtonState === 'testing') return { status: 'testing', label: 'Testing' };
      if (testResult && !testResult.success) return { status: 'error', label: 'Error' };
      if (testResult && testResult.success) return { status: 'connected', label: 'Connected' };
    }
    if (isActive && isConfigured) return { status: 'connected', label: 'Connected' };
    if (isActive) return { status: 'connected', label: 'Active' };
    if (g.enabled === false) return { status: 'disconnected', label: 'Disconnected' };
    if (!isConfigured) return { status: 'setup', label: 'Needs Setup' };
    return { status: 'inactive', label: 'Inactive' };
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Important Status Notice (add / delete / errors) */}
      {notification && (
        <InlineActionFeedback
          type={notification.type === 'error' ? 'error' : 'success'}
          message={notification.text}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* 1. PAYMENT GATEWAYS LIST SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Payment Gateways</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage domestic (India) and international export payment providers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddGatewayOpen(true)}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Gateway</span>
          </button>
        </div>

        {/* Compact Gateway Cards Grid */}
        {gateways.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center space-y-2.5 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-600">
              No payment gateways configured. Add a gateway partner to enable online payments at checkout.
            </p>
            <button
              type="button"
              onClick={() => setIsAddGatewayOpen(true)}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Gateway</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gateways.map((g) => {
              const isActive = isGatewayActive(g);
              const isSelected = g.id === selectedGatewayId;
              const badge = getGatewayStatus(g);

              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setSelectedGatewayId(g.id);
                    setTestResult(null);
                    setSaveError(null);
                    setTestButtonState('idle');
                    setSaveButtonState('idle');
                  }}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        {g.provider === 'paypal' ? (
                          <span className="font-black text-xs text-[#003087]">PP</span>
                        ) : g.provider === 'razorpay' ? (
                          <span className="font-mono font-bold text-[10px] text-[#0c2340]">rzp</span>
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 truncate">{g.name}</h4>
                        <p className="text-[11px] text-slate-500 capitalize truncate">
                          {g.targetMarket === 'international'
                            ? 'Export (Global)'
                            : g.targetMarket === 'both'
                            ? 'Domestic & Export'
                            : 'Domestic (India)'}
                        </p>
                      </div>
                    </div>

                    <IntegrationStatusIndicator status={badge.status} label={badge.label} />
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivate(g);
                          }}
                          className="text-amber-700 hover:text-amber-900 font-medium cursor-pointer"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakeActive(g);
                          }}
                          className="text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGatewayId(g.id);
                          setTestResult(null);
                          setSaveError(null);
                        }}
                        className="text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Configure
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGatewayToDelete(g);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 rounded"
                      title="Delete Gateway"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SELECTED GATEWAY CONFIGURATION SECTION */}
      {currentGateway && (() => {
        const headerBadge = getGatewayStatus(currentGateway);
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            {/* Compact Integration Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900">{currentGateway.name}</h3>
                  <IntegrationStatusIndicator status={headerBadge.status} label={headerBadge.label} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentMeta.label} · {currentGateway.mode === 'live' ? 'Live Production' : 'Test / Sandbox'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                {isGatewayActive(currentGateway) ? (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(currentGateway)}
                    className="h-8 px-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-lg transition cursor-pointer whitespace-nowrap"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMakeActive(currentGateway)}
                    className="h-8 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition cursor-pointer whitespace-nowrap"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>

            {/* Form Groups */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-700">API Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Gateway Display Name
                  </label>
                  <input
                    type="text"
                    value={currentGateway.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Target Market
                  </label>
                  <select
                    value={currentGateway.targetMarket}
                    onChange={(e) => handleFieldChange('targetMarket', e.target.value as PaymentMarketAudience)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition cursor-pointer"
                  >
                    <option value="domestic">Domestic Only (India — UPI &amp; Cards)</option>
                    <option value="international">International Only (Export Buyers)</option>
                    <option value="both">Global (Domestic &amp; Export)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {currentMeta.apiKeyLabel}
                  </label>
                  <input
                    type="text"
                    value={currentGateway.apiKey}
                    onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                    placeholder={currentMeta.apiKeyPlaceholder}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {currentMeta.apiSecretLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={currentGateway.apiSecret || ''}
                      onChange={(e) => handleFieldChange('apiSecret', e.target.value)}
                      placeholder={currentMeta.apiSecretPlaceholder}
                      autoComplete="off"
                      className="w-full h-9 px-3 pr-9 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Merchant Name on Checkout
                  </label>
                  <input
                    type="text"
                    value={currentGateway.merchantName || 'REDMODE'}
                    onChange={(e) => handleFieldChange('merchantName', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Environment Mode
                  </label>
                  <select
                    value={currentGateway.mode}
                    onChange={(e) => handleFieldChange('mode', e.target.value as 'test' | 'live')}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition cursor-pointer"
                  >
                    <option value="test">Test / Sandbox Mode</option>
                    <option value="live">Production Live</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Settlement Currency
                  </label>
                  <select
                    value={currentGateway.currency || 'INR'}
                    onChange={(e) => handleFieldChange('currency', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition cursor-pointer"
                  >
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="USD">USD ($) — US Dollar (Export)</option>
                    <option value="EUR">EUR (€) — Euro (Export)</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="AED">AED (د.إ) — UAE Dirham</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Consistent Bottom-Right Action Row */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setGatewayToDelete(currentGateway)}
                  className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Gateway</span>
                </button>

                <div className="flex items-center justify-end gap-2.5 flex-wrap">
                  <TestConnectionButton
                    state={testButtonState}
                    onClick={handleTestConnection}
                  />
                  <SaveChangesButton
                    state={saveButtonState}
                    onClick={handleSaveChanges}
                  />
                </div>
              </div>

              {saveError && (
                <InlineActionFeedback
                  type="error"
                  message={saveError}
                  onDismiss={() => setSaveError(null)}
                />
              )}

              {testResult && !testResult.success && (
                <InlineActionFeedback
                  type="error"
                  message={testResult.message}
                  onDismiss={() => setTestResult(null)}
                />
              )}

              {testResult && testResult.success && (
                <InlineActionFeedback
                  type="success"
                  message={testResult.message}
                  onDismiss={() => setTestResult(null)}
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* 3. WEBHOOK COMPACT SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
        <h4 className="text-sm font-semibold text-slate-900">Webhook / Callback URL</h4>
        <div className="flex items-center gap-2 max-w-2xl">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 min-w-0 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
          />
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            {webhookCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{webhookCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Add this callback URL in your payment gateway dashboard to receive automated payment confirmations.
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
