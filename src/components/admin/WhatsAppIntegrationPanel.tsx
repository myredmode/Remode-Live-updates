import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Check,
  Copy,
  Eye,
  EyeOff,
  Send,
  X,
  ExternalLink,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { WhatsAppSettings } from '../../types';

interface WhatsAppIntegrationPanelProps {
  onSaveNotification?: (msg: string) => void;
}

const sanitizeWhatsAppSettings = (
  raw?: WhatsAppSettings,
  fallbackPhone?: string,
  isDeleted?: boolean
): WhatsAppSettings => {
  if (isDeleted) {
    return {
      enabled: false,
      provider: 'meta_cloud_api',
      phoneNumber: raw?.phoneNumber || '',
      phoneNumberId: raw?.phoneNumberId || '',
      wabaId: raw?.wabaId || '',
      accessToken: '',
      webhookVerifyToken: raw?.webhookVerifyToken || '',
      orderConfirmationEnabled: raw?.orderConfirmationEnabled ?? false,
      orderDispatchTrackingEnabled: raw?.orderDispatchTrackingEnabled ?? false,
      reminder23hEnabled: raw?.reminder23hEnabled ?? false,
      codVerificationOtpEnabled: raw?.codVerificationOtpEnabled ?? false,
      deliveredReviewEnabled: raw?.deliveredReviewEnabled ?? false,
      apiEndpoint: raw?.apiEndpoint || 'https://graph.facebook.com/v21.0',
    };
  }

  const pid =
    raw?.phoneNumberId && raw.phoneNumberId !== '109845729104823'
      ? raw.phoneNumberId
      : '1375149605673144';
  const waba =
    raw?.wabaId && raw.wabaId !== '392019482910482'
      ? raw.wabaId
      : '2745819689145292';
  const token =
    raw?.accessToken && !raw.accessToken.includes('EAAG9xxxxxxx')
      ? raw.accessToken
      : '';

  return {
    enabled: raw?.enabled ?? true,
    provider: 'meta_cloud_api',
    phoneNumber: raw?.phoneNumber || fallbackPhone || '+91 73027 97464',
    phoneNumberId: pid,
    wabaId: waba,
    accessToken: token,
    webhookVerifyToken: raw?.webhookVerifyToken || 'redmode_wa_verify_2026',
    orderConfirmationEnabled: raw?.orderConfirmationEnabled ?? true,
    orderDispatchTrackingEnabled: raw?.orderDispatchTrackingEnabled ?? true,
    reminder23hEnabled: raw?.reminder23hEnabled ?? true,
    codVerificationOtpEnabled: raw?.codVerificationOtpEnabled ?? true,
    deliveredReviewEnabled: raw?.deliveredReviewEnabled ?? true,
    apiEndpoint: raw?.apiEndpoint || 'https://graph.facebook.com/v21.0',
  };
};

export const WhatsAppIntegrationPanel: React.FC<WhatsAppIntegrationPanelProps> = ({
  onSaveNotification,
}) => {
  const { settings, updateWhatsAppSettings } = useStore();

  const [formData, setFormData] = useState<WhatsAppSettings>(() =>
    sanitizeWhatsAppSettings(
      settings.whatsappSettings,
      settings.whatsappNumber,
      settings.whatsappIntegrationDeleted
    )
  );

  useEffect(() => {
    if (settings.whatsappSettings || settings.whatsappIntegrationDeleted) {
      setFormData(
        sanitizeWhatsAppSettings(
          settings.whatsappSettings,
          settings.whatsappNumber,
          settings.whatsappIntegrationDeleted
        )
      );
    }
  }, [settings.whatsappSettings, settings.whatsappNumber, settings.whatsappIntegrationDeleted]);

  const [showToken, setShowToken] = useState<boolean>(false);
  const [webhookCopied, setWebhookCopied] = useState<boolean>(false);
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);
  const [testPhone, setTestPhone] = useState<string>('7302797464');
  const [testTemplate, setTestTemplate] = useState<'confirmation' | 'dispatch' | 'reminder'>('confirmation');
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [messageFeedback, setMessageFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : 'https://redmode.in/api/whatsapp/webhook';

  const handleFieldChange = (field: keyof WhatsAppSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleActive = () => {
    const nextEnabled = !formData.enabled;
    const updatedData: WhatsAppSettings = {
      ...formData,
      accessToken: (formData.accessToken || '').trim(),
      phoneNumberId: (formData.phoneNumberId || '').trim(),
      wabaId: (formData.wabaId || '').trim(),
      phoneNumber: (formData.phoneNumber || '').trim(),
      apiEndpoint: (formData.apiEndpoint || 'https://graph.facebook.com/v21.0').trim(),
      webhookVerifyToken: (formData.webhookVerifyToken || 'redmode_wa_verify_2026').trim(),
      provider: 'meta_cloud_api',
      enabled: nextEnabled,
    };
    setFormData(updatedData);
    updateWhatsAppSettings(updatedData);
    const msg = nextEnabled
      ? 'Meta WhatsApp Cloud API activated.'
      : 'Meta WhatsApp Cloud API deactivated. Automated messages are paused.';
    setSaveNotification(msg);
    if (onSaveNotification) {
      onSaveNotification(msg);
    }
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const handleConfirmDelete = () => {
    const cleared: WhatsAppSettings = {
      ...formData,
      enabled: false,
      provider: 'meta_cloud_api',
      accessToken: '',
      phoneNumberId: '',
      wabaId: '',
      phoneNumber: '',
      webhookVerifyToken: '',
    };
    setFormData(cleared);
    updateWhatsAppSettings({ __delete: true } as any);
    setIsDeleteModalOpen(false);
    setTestConnectionResult(null);
    setMessageFeedback(null);
    const msg = 'Meta WhatsApp integration deleted permanently.';
    setSaveNotification(msg);
    if (onSaveNotification) {
      onSaveNotification(msg);
    }
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const handleSaveChanges = () => {
    const cleanedData: WhatsAppSettings = {
      ...formData,
      accessToken: (formData.accessToken || '').trim(),
      phoneNumberId: (formData.phoneNumberId || '').trim(),
      wabaId: (formData.wabaId || '').trim(),
      phoneNumber: (formData.phoneNumber || '').trim(),
      apiEndpoint: (formData.apiEndpoint || 'https://graph.facebook.com/v21.0').trim(),
      webhookVerifyToken: (formData.webhookVerifyToken || 'redmode_wa_verify_2026').trim(),
      provider: 'meta_cloud_api',
      enabled: formData.enabled,
    };
    setFormData(cleanedData);
    updateWhatsAppSettings(cleanedData);
    setSaveNotification('Meta WhatsApp settings saved successfully.');
    if (onSaveNotification) {
      onSaveNotification('Meta WhatsApp settings saved successfully.');
    }
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const parseJsonSafe = async (res: Response) => {
    const raw = await res.text();
    if (!raw || !raw.trim().startsWith('{')) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestConnectionResult(null);

    try {
      const adminToken =
        sessionStorage.getItem('redmode_admin_token') ||
        localStorage.getItem('redmode_admin_token') ||
        '';
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: (formData.accessToken || '').trim(),
          phoneNumberId: (formData.phoneNumberId || '').trim(),
          wabaId: (formData.wabaId || '').trim(),
        }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data?.success) {
        setTestConnectionResult({
          success: true,
          message: data.message || `Connected to Meta WhatsApp Cloud API (${data.verifiedName || data.phoneNumberId})`,
        });
      } else {
        setTestConnectionResult({
          success: false,
          message: data?.error || data?.message || `Meta API verification failed (HTTP ${res.status}). Check Access Token & Phone Number ID.`,
        });
      }
    } catch (err: any) {
      setTestConnectionResult({
        success: false,
        message: `Network error testing Meta WhatsApp API: ${err?.message || 'Unable to connect'}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendTestMessage = async () => {
    const clean = testPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setMessageFeedback({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.',
      });
      return;
    }

    setIsSendingMessage(true);
    setMessageFeedback(null);

    const previewMap: Record<'confirmation' | 'dispatch' | 'reminder', string> = {
      confirmation: 'Namaste! Your REDMODE test order #RM-TEST is confirmed. Reply YES to confirm or CANCEL to cancel.',
      dispatch: 'Good news! Your REDMODE parcel has been dispatched via Delhivery Express. Tracking AWB: RM606696001.',
      reminder: 'Friendly reminder from REDMODE: Your order is ready for dispatch. Reply YES to confirm handover.',
    };

    try {
      const adminToken =
        sessionStorage.getItem('redmode_admin_token') ||
        localStorage.getItem('redmode_admin_token') ||
        '';
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          to: clean,
          textMessage: previewMap[testTemplate],
          accessToken: (formData.accessToken || '').trim(),
          phoneNumberId: (formData.phoneNumberId || '').trim(),
        }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data?.success) {
        setMessageFeedback({
          success: true,
          message: `Message sent via Meta Cloud API to +91 ${clean}! Message ID: ${data.messageId || 'Dispatched'}`,
        });
      } else {
        setMessageFeedback({
          success: false,
          message: data?.error || `Meta Cloud API rejected message (HTTP ${res.status}). Note: Free-form text requires an open 24h customer window or an approved template.`,
        });
      }
    } catch (err: any) {
      setMessageFeedback({
        success: false,
        message: `Failed to reach WhatsApp API: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleOpenDirectWhatsAppTest = () => {
    const clean = testPhone.replace(/[^0-9]/g, '').slice(-10);
    const text = encodeURIComponent(
      `Hello! This is a verified test notification from REDMODE via Meta Official WhatsApp Cloud API.`
    );
    window.open(`https://wa.me/91${clean}?text=${text}`, '_blank');
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(formData.webhookVerifyToken || 'redmode_wa_verify_2026');
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. NOTIFICATION BANNER */}
      {saveNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. SECTION HEADER CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-900">
                  Official WhatsApp Business API (Meta)
                </h3>
                {!formData.enabled ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    DEACTIVATED
                  </span>
                ) : formData.accessToken && formData.phoneNumberId ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    NEEDS TOKEN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct official Meta Cloud API integration for automated order confirmations, live AWB tracking alerts, and customer notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
            {formData.enabled ? (
              <button
                type="button"
                onClick={handleToggleActive}
                className="px-3 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleActive}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Activate
              </button>
            )}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200"
              title="Delete WhatsApp Integration"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. META CLOUD API CONFIGURATION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h4 className="text-sm font-semibold text-slate-900">Meta WhatsApp Cloud Gateway</h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Official API
            </span>
          </div>
          <span className="text-xs text-slate-400">Environment: Production (Graph API v19.0)</span>
        </div>

        {/* Test Connection Result Alert */}
        {testConnectionResult && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              testConnectionResult.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <span>{testConnectionResult.message}</span>
            <button
              type="button"
              onClick={() => setTestConnectionResult(null)}
              className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* Group 1: API Credentials (Prompt-specified fields) */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              API Credentials
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Field 1: WhatsApp Cloud Token */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    WhatsApp Cloud Token
                  </label>
                  <span className="text-[11px] text-slate-400">Meta Permanent Access Token</span>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.accessToken || ''}
                    onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                    placeholder="e.g. EAAG9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Permanent system user token from Meta Business Manager with <code className="font-mono text-slate-600">whatsapp_business_messaging</code> permission.
                </p>
              </div>

              {/* Field 2: Phone Number ID */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={formData.phoneNumberId || ''}
                  onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                  placeholder="e.g. 109845729104823"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Found in Meta App Dashboard → WhatsApp → API Setup.
                </p>
              </div>

              {/* Field 3: WABA ID */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WABA ID (WhatsApp Business Account ID)
                </label>
                <input
                  type="text"
                  value={formData.wabaId || ''}
                  onChange={(e) => handleFieldChange('wabaId', e.target.value)}
                  placeholder="e.g. 392019482910482"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Found in Meta Business Manager → WhatsApp Accounts.
                </p>
              </div>

              {/* Additional Clean Settings */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Registered WhatsApp Sender Number
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                  placeholder="+91 73027 97464"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Sender mobile number verified in Meta Business Manager.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={formData.apiEndpoint || 'https://graph.facebook.com/v19.0'}
                  onChange={(e) => handleFieldChange('apiEndpoint', e.target.value)}
                  placeholder="https://graph.facebook.com/v19.0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default: Meta Graph API v19.0.
                </p>
              </div>
            </div>
          </div>

          {/* Group 2: Automated Triggers */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Automated Notification Triggers
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Order Confirmation Notification (YES / CANCEL)</p>
                  <p className="text-[11px] text-slate-500">
                    Dispatched immediately or queued for morning batch with quick confirmation buttons.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.orderConfirmationEnabled}
                    onChange={(e) => handleFieldChange('orderConfirmationEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-900">23-Hour Gentle Reminder</p>
                  <p className="text-[11px] text-slate-500">
                    Sent before Meta 24-hour customer service window expires if customer hasn't responded.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.reminder23hEnabled}
                    onChange={(e) => handleFieldChange('reminder23hEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Dispatched &amp; Live Tracking AWB Link</p>
                  <p className="text-[11px] text-slate-500">
                    Automatically sent when an AWB is generated via active courier partner.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.orderDispatchTrackingEnabled}
                    onChange={(e) => handleFieldChange('orderDispatchTrackingEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-900">COD Verification OTP &amp; Address Verification</p>
                  <p className="text-[11px] text-slate-500">
                    Verifies high-risk COD orders with automated WhatsApp OTP to reduce RTO rate.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.codVerificationOtpEnabled}
                    onChange={(e) => handleFieldChange('codVerificationOtpEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-2 text-rose-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer"
            >
              Delete Integration
            </button>
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

      {/* 4. WEBHOOK CONFIGURATION CARD (Matching courier panel webhook style) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900">Meta Webhook Endpoint</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Callback URL
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {webhookCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{webhookCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Verify Token
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={formData.webhookVerifyToken || 'redmode_wa_verify_2026'}
                onChange={(e) => handleFieldChange('webhookVerifyToken', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{tokenCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 pt-1">
          Use this webhook in Meta App Dashboard (WhatsApp → Configuration) to receive real-time customer YES / CANCEL reply webhooks.
        </p>
      </div>

      {/* 5. TEST NOTIFICATION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Send Test Notification</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Test Meta WhatsApp Cloud API template delivery to any recipient phone number.
          </p>
        </div>

        {messageFeedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              messageFeedback.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <span>{messageFeedback.message}</span>
            <button
              type="button"
              onClick={() => setMessageFeedback(null)}
              className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-56">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Recipient Mobile</label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="7302797464"
              maxLength={10}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Template</label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            >
              <option value="confirmation">Order Confirmation (YES / CANCEL)</option>
              <option value="dispatch">Dispatched &amp; Live Tracking AWB</option>
              <option value="reminder">23h Gentle Reminder</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2 pt-5">
            <button
              type="button"
              onClick={handleSendTestMessage}
              disabled={isSendingMessage}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingMessage ? 'Sending...' : 'Send Test Notification'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenDirectWhatsAppTest}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Delete WhatsApp integration?</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This will permanently clear your saved Meta WhatsApp Cloud credentials and deactivate automated alerts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
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
