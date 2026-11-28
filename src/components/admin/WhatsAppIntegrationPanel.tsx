import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Check,
  Copy,
  Eye,
  EyeOff,
  Send,
  X,
  ExternalLink,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { WhatsAppSettings, WhatsAppMessageLog, WhatsAppHealthState } from '../../types';
import {
  IntegrationStatusIndicator,
  IntegrationInfoTip,
  SaveChangesButton,
  TestConnectionButton,
  InlineActionFeedback,
  AutomationToggleRow,
  SaveButtonState,
  TestButtonState,
  IntegrationConnectionStatus,
} from './IntegrationActionControls';

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
    confirmCodOrders: raw?.confirmCodOrders ?? true,
    confirmPrepaidOrders: raw?.confirmPrepaidOrders ?? true,
    respectSendingWindow: raw?.respectSendingWindow ?? true,
    sendingWindowStartHour: raw?.sendingWindowStartHour ?? 10,
    sendingWindowEndHour: raw?.sendingWindowEndHour ?? 21,
    reminderDelayHours: raw?.reminderDelayHours ?? 23,
    manualFollowUpHours: raw?.manualFollowUpHours ?? 26,
    confirmationTemplateName: raw?.confirmationTemplateName || 'redmode_order_confirmation',
    reminderTemplateName: raw?.reminderTemplateName || 'redmode_order_reminder_23h',
    templateLanguageCode: raw?.templateLanguageCode || 'en',
    renderWebhookUrl: raw?.renderWebhookUrl || '',
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
  const [testButtonState, setTestButtonState] = useState<TestButtonState>('idle');
  const [testConnectionResult, setTestConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveButtonState, setSaveButtonState] = useState<SaveButtonState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [messageFeedback, setMessageFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [waHealth, setWaHealth] = useState<WhatsAppHealthState | null>(null);
  const [waHealthLoading, setWaHealthLoading] = useState<boolean>(false);

  const saveTimerRef = useRef<number | null>(null);
  const testTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
    };
  }, []);

  // WhatsApp Message Logs & Scheduler State
  const [waLogs, setWaLogs] = useState<WhatsAppMessageLog[]>([]);
  const [waLogStats, setWaLogStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    scheduled: 0,
    replies: 0,
    manualFollowUpCount: 0,
  });
  const [waLogsLoading, setWaLogsLoading] = useState<boolean>(false);
  const [waLogStatusFilter, setWaLogStatusFilter] = useState<string>('all');
  const [waLogSearch, setWaLogSearch] = useState<string>('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [isRunningScheduler, setIsRunningScheduler] = useState<boolean>(false);
  const [schedulerFeedback, setSchedulerFeedback] = useState<string | null>(null);

  const getAdminAuthHeaders = (): Record<string, string> => {
    const token =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWhatsAppLogs = useCallback(async (silent = false) => {
    if (!silent) setWaLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (waLogStatusFilter && waLogStatusFilter !== 'all') params.set('status', waLogStatusFilter);
      if (waLogSearch.trim()) params.set('q', waLogSearch.trim());
      const res = await fetch(`/api/admin/whatsapp/logs?${params.toString()}`, {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setWaLogs(Array.isArray(data.logs) ? data.logs : []);
        if (data.stats) setWaLogStats(data.stats);
      }
    } catch {}
    finally {
      if (!silent) setWaLogsLoading(false);
    }
  }, [waLogStatusFilter, waLogSearch]);

  const fetchWhatsAppHealth = useCallback(async (forceRefresh = false) => {
    setWaHealthLoading(true);
    try {
      const url = forceRefresh ? '/api/admin/whatsapp/health?refresh=1' : '/api/admin/whatsapp/health';
      const res = await fetch(url, {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.status) {
        setWaHealth({
          status: data.status,
          automationEnabled: Boolean(data.automationEnabled),
          checkedAt: data.checkedAt || new Date().toISOString(),
          message: data.message || '',
          verifiedName: data.verifiedName,
          displayPhoneNumber: data.displayPhoneNumber,
          httpStatus: data.httpStatus,
        });
      } else {
        setWaHealth({
          status: 'Temporarily Unavailable',
          automationEnabled: Boolean(formData.enabled),
          checkedAt: new Date().toISOString(),
          message: data?.message || 'Unable to reach Meta WhatsApp API health check.',
        });
      }
    } catch {
      setWaHealth({
        status: 'Temporarily Unavailable',
        automationEnabled: Boolean(formData.enabled),
        checkedAt: new Date().toISOString(),
        message: 'Health check unavailable. Manual confirmation in Order Management remains active.',
      });
    } finally {
      setWaHealthLoading(false);
    }
  }, [formData.enabled]);

  useEffect(() => {
    void fetchWhatsAppHealth(false);
    fetchWhatsAppLogs(false);
    const timer = setInterval(() => fetchWhatsAppLogs(true), 15000);
    return () => clearInterval(timer);
  }, [fetchWhatsAppLogs, fetchWhatsAppHealth]);

  const handleRetryFailedLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch(`/api/admin/whatsapp/logs/${encodeURIComponent(logId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      setSchedulerFeedback(
        data?.success
          ? `Retry dispatched successfully (WAMID: ${data.wamid || 'Sent'}).`
          : `Retry attempt failed: ${data?.error || data?.message || 'Check Meta credentials & template approval.'}`
      );
      await fetchWhatsAppLogs(true);
    } catch (err: any) {
      setSchedulerFeedback(`Retry network error: ${err?.message || 'Failed'}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleRunSchedulerNow = async () => {
    setIsRunningScheduler(true);
    setSchedulerFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp/scheduler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const r = data.result || {};
        setSchedulerFeedback(
          `Scheduler tick complete: ${r.scheduledDispatched || 0} scheduled sent, ${r.remindersSent || 0} 23h reminder(s), ${r.manualFollowUpFlagged || 0} flagged for manual follow-up, ${r.retriesAttempted || 0} retry(s).`
        );
        await fetchWhatsAppLogs(true);
      } else {
        setSchedulerFeedback(data?.message || 'Unable to run scheduler tick.');
      }
    } catch (err: any) {
      setSchedulerFeedback(`Scheduler request failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsRunningScheduler(false);
    }
  };

  // Single Unified Direct Meta Webhook Receiver on Google Cloud Run (no Render middleman required)
  const directWebhookOrigin =
    typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://redmode.in';
  const webhookUrl = formData.renderWebhookUrl || `${directWebhookOrigin}/api/whatsapp/webhook`;

  const handleFieldChange = (field: keyof WhatsAppSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleActive = async () => {
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
    await updateWhatsAppSettings(updatedData);
    setTimeout(() => void fetchWhatsAppHealth(true), 350);
  };

  const handleConfirmDelete = async () => {
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
    await updateWhatsAppSettings({ __delete: true } as any);
    setIsDeleteModalOpen(false);
    setTestConnectionResult(null);
    setSaveError(null);
    setMessageFeedback(null);
    const msg = 'Meta WhatsApp integration deleted permanently.';
    setSaveNotification(msg);
    if (onSaveNotification) {
      onSaveNotification(msg);
    }
    setTimeout(() => setSaveNotification(null), 3500);
    setTimeout(() => void fetchWhatsAppHealth(true), 350);
  };

  const handleSaveChanges = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveButtonState('saving');
    setSaveError(null);

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

    const result = await updateWhatsAppSettings(cleanedData);
    if (result?.success !== false) {
      setSaveButtonState('saved');
      saveTimerRef.current = window.setTimeout(() => {
        setSaveButtonState('idle');
      }, 2000);
      setTimeout(() => void fetchWhatsAppHealth(true), 350);
    } else {
      setSaveButtonState('error');
      setSaveError(result?.error || 'Failed to save Meta WhatsApp settings. Please try again.');
    }
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
    if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
    setIsTestingConnection(true);
    setTestButtonState('testing');
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
        setTestButtonState('connected');
        setTestConnectionResult({
          success: true,
          message: data.message || `Connected to Meta WhatsApp Cloud API (${data.verifiedName || data.phoneNumberId})`,
        });
        setTimeout(() => void fetchWhatsAppHealth(true), 300);
      } else {
        setTestButtonState('failed');
        setTestConnectionResult({
          success: false,
          message: data?.error || data?.message || `Meta API verification failed (HTTP ${res.status}). Check Access Token & Phone Number ID.`,
        });
      }
    } catch (err: any) {
      setTestButtonState('failed');
      setTestConnectionResult({
        success: false,
        message: `Network error testing Meta WhatsApp API: ${err?.message || 'Unable to connect'}`,
      });
    } finally {
      setIsTestingConnection(false);
      testTimerRef.current = window.setTimeout(() => {
        setTestButtonState('idle');
      }, 2000);
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

  const connectionStatus: IntegrationConnectionStatus =
    saveButtonState === 'saving'
      ? 'saving'
      : isTestingConnection || testButtonState === 'testing'
      ? 'testing'
      : waHealth?.status === 'Connected'
      ? 'connected'
      : waHealth?.status === 'Authentication Error' || waHealth?.status === 'Temporarily Unavailable'
      ? 'error'
      : 'disconnected';

  const connectionLabel =
    saveButtonState === 'saving'
      ? 'Saving'
      : isTestingConnection || testButtonState === 'testing'
      ? 'Testing'
      : waHealthLoading && !waHealth
      ? 'Testing'
      : waHealth?.status === 'Connected'
      ? 'Connected'
      : waHealth?.status === 'Authentication Error' || waHealth?.status === 'Temporarily Unavailable'
      ? 'Error'
      : 'Disconnected';

  return (
    <div className="space-y-5 text-slate-800">
      {/* Critical / Destructive Notice Only */}
      {saveNotification && (
        <InlineActionFeedback
          type="success"
          message={saveNotification}
          onDismiss={() => setSaveNotification(null)}
        />
      )}

      {/* 1. COMPACT INTEGRATION HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900">
                  Meta WhatsApp Cloud API
                </h3>
                <IntegrationStatusIndicator
                  status={connectionStatus}
                  label={connectionLabel}
                  title={waHealth?.message || 'Live Meta WhatsApp Cloud API status'}
                />
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    formData.enabled
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Automation: {formData.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automated order confirmations, tracking alerts, and customer reply webhooks with manual fallback.
              </p>
              {waHealth && waHealth.status !== 'Connected' && waHealth.message && (
                <p className="text-[11px] text-rose-700 mt-1.5 font-medium">
                  {waHealth.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={handleToggleActive}
              className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer border whitespace-nowrap ${
                formData.enabled
                  ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900'
                  : 'border-emerald-700 bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {formData.enabled ? 'Pause Automation' : 'Enable Automation'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. API CONFIGURATION & AUTOMATION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
          <h4 className="text-sm font-semibold text-slate-900">API Configuration</h4>
          <span className="text-[11px] text-slate-400 font-mono">Production · Official Cloud API</span>
        </div>

        <div className="space-y-5">
          {/* Group 1: API Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: WhatsApp Cloud Token */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                <span>WhatsApp Cloud Token</span>
                <IntegrationInfoTip text="Permanent system user access token from Meta Business Manager with whatsapp_business_messaging permission." />
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.accessToken || ''}
                  onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                  placeholder="EAAG9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  className="w-full h-9 px-3 pr-9 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  aria-label={showToken ? 'Hide access token' : 'Show access token'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Field 2: Phone Number ID */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                <span>Phone Number ID</span>
                <IntegrationInfoTip text="Found in Meta App Dashboard under WhatsApp → API Setup." />
              </label>
              <input
                type="text"
                value={formData.phoneNumberId || ''}
                onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                placeholder="1375149605673144"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
              />
            </div>

            {/* Field 3: WABA ID */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                <span>WABA ID</span>
                <IntegrationInfoTip text="WhatsApp Business Account ID from Meta Business Manager → WhatsApp Accounts." />
              </label>
              <input
                type="text"
                value={formData.wabaId || ''}
                onChange={(e) => handleFieldChange('wabaId', e.target.value)}
                placeholder="2745819689145292"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
              />
            </div>

            {/* Field 4: Registered Sender Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Registered Sender Number
              </label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                placeholder="+91 73027 97464"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
              />
            </div>

            {/* Field 5: API Base URL */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                API Base URL
              </label>
              <input
                type="text"
                value={formData.apiEndpoint || 'https://graph.facebook.com/v21.0'}
                onChange={(e) => handleFieldChange('apiEndpoint', e.target.value)}
                placeholder="https://graph.facebook.com/v21.0"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 font-mono transition"
              />
            </div>
          </div>

          {/* Group 2: Automation Settings */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700">
              Automation Settings
            </h4>
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
              <AutomationToggleRow
                title="Order Confirmation (YES / CANCEL)"
                description="Send quick confirmation buttons immediately or in the morning batch."
                checked={formData.orderConfirmationEnabled}
                onChange={(val) => handleFieldChange('orderConfirmationEnabled', val)}
              />
              <AutomationToggleRow
                title="23-Hour Gentle Reminder"
                description="Follow up before the 24-hour customer window expires if unanswered."
                checked={formData.reminder23hEnabled}
                onChange={(val) => handleFieldChange('reminder23hEnabled', val)}
              />
              <AutomationToggleRow
                title="Dispatched & Live Tracking AWB"
                description="Send tracking details automatically when a courier AWB is created."
                checked={formData.orderDispatchTrackingEnabled}
                onChange={(val) => handleFieldChange('orderDispatchTrackingEnabled', val)}
              />
              <AutomationToggleRow
                title="COD Verification OTP"
                description="Verify high-risk COD orders over WhatsApp to reduce RTO."
                checked={formData.codVerificationOtpEnabled}
                onChange={(val) => handleFieldChange('codVerificationOtpEnabled', val)}
              />
            </div>
          </div>

          {/* Group 3: Confirmation Policy & Utility Templates */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700">
              Confirmation Policy &amp; Templates
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition cursor-pointer">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium text-slate-900">Confirm COD Orders</p>
                  <p className="text-[11px] text-slate-500">Require YES before dispatch</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.confirmCodOrders ?? true}
                  onChange={(e) => handleFieldChange('confirmCodOrders', e.target.checked)}
                  className="accent-slate-900 w-4 h-4 shrink-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition cursor-pointer">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium text-slate-900">Confirm Prepaid Orders</p>
                  <p className="text-[11px] text-slate-500">Send confirmation for prepaid</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.confirmPrepaidOrders ?? true}
                  onChange={(e) => handleFieldChange('confirmPrepaidOrders', e.target.checked)}
                  className="accent-slate-900 w-4 h-4 shrink-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition cursor-pointer">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium text-slate-900">10 AM – 9 PM IST Window</p>
                  <p className="text-[11px] text-slate-500">Queue night orders for 10 AM</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.respectSendingWindow ?? true}
                  onChange={(e) => handleFieldChange('respectSendingWindow', e.target.checked)}
                  className="accent-slate-900 w-4 h-4 shrink-0 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirmation Template
                </label>
                <input
                  type="text"
                  value={formData.confirmationTemplateName || 'redmode_order_confirmation'}
                  onChange={(e) => handleFieldChange('confirmationTemplateName', e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  23-Hour Reminder Template
                </label>
                <input
                  type="text"
                  value={formData.reminderTemplateName || 'redmode_order_reminder_23h'}
                  onChange={(e) => handleFieldChange('reminderTemplateName', e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Language Code
                </label>
                <input
                  type="text"
                  value={formData.templateLanguageCode || 'en'}
                  onChange={(e) => handleFieldChange('templateLanguageCode', e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Consistent Bottom-Right Action Row */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Integration</span>
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

          {testConnectionResult && !testConnectionResult.success && (
            <InlineActionFeedback
              type="error"
              message={testConnectionResult.message}
              onDismiss={() => setTestConnectionResult(null)}
            />
          )}

          {testConnectionResult && testConnectionResult.success && (
            <InlineActionFeedback
              type="success"
              message={testConnectionResult.message}
              onDismiss={() => setTestConnectionResult(null)}
            />
          )}
        </div>
      </div>

      {/* 3. WEBHOOK CONFIGURATION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-semibold text-slate-900">Webhook Configuration</h4>
          <IntegrationInfoTip text="Configure this Callback URL and Verify Token in Meta Developer Dashboard. The backend verifies X-Hub-Signature-256 and processes YES/CANCEL replies automatically." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Callback URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 min-w-0 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {webhookCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{webhookCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Verify Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.webhookVerifyToken || 'redmode_wa_verify_2026'}
                onChange={(e) => handleFieldChange('webhookVerifyToken', e.target.value)}
                className="flex-1 min-w-0 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{tokenCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4B. WHATSAPP MESSAGE LOGS & 23-HOUR SCHEDULER MONITOR */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              WhatsApp Message Logs &amp; 23-Hour Automation Monitor
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Track WAMID, delivery/read/failure states, customer YES/CANCEL replies, and safe retries in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunSchedulerNow}
              disabled={isRunningScheduler}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isRunningScheduler ? 'Running...' : 'Run 23h Scheduler'}</span>
            </button>
            <button
              type="button"
              onClick={() => fetchWhatsAppLogs(false)}
              disabled={waLogsLoading}
              className="px-3 py-1.5 border border-slate-300 hover:border-slate-900 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${waLogsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { label: 'Sent', value: waLogStats.sent, cls: 'bg-slate-50 text-slate-900 border-slate-200' },
            { label: 'Delivered', value: waLogStats.delivered, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
            { label: 'Read', value: waLogStats.read, cls: 'bg-sky-50 text-sky-800 border-sky-200' },
            { label: 'Replies', value: waLogStats.replies, cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
            { label: 'Failed', value: waLogStats.failed, cls: 'bg-rose-50 text-rose-800 border-rose-200' },
            { label: 'Manual Follow-Up', value: waLogStats.manualFollowUpCount, cls: 'bg-amber-50 text-amber-900 border-amber-200' },
          ].map((stat) => (
            <div key={stat.label} className={`p-2.5 rounded-lg border ${stat.cls}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{stat.label}</p>
              <p className="text-lg font-bold mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>

        {schedulerFeedback && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-2">
            <span>{schedulerFeedback}</span>
            <button
              type="button"
              onClick={() => setSchedulerFeedback(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'sent', 'delivered', 'read', 'failed', 'scheduled', 'received'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setWaLogStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition cursor-pointer ${
                  waLogStatusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'received' ? 'Replies' : st}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={waLogSearch}
              onChange={(e) => setWaLogSearch(e.target.value)}
              placeholder="Search Order ID, Phone, WAMID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Order / WAMID</th>
                <th className="py-2.5 px-3">Customer Phone</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Customer Reply</th>
                <th className="py-2.5 px-3">Error / Retry</th>
                <th className="py-2.5 px-3 text-right">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No WhatsApp message logs recorded yet. Place a test order or trigger a confirmation to inspect live logs.
                  </td>
                </tr>
              ) : (
                waLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 font-mono">{log.orderId}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]" title={log.wamid || log.id}>
                        {log.wamid || 'Pending WAMID'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      <div>{log.customerPhone}</div>
                      {log.customerName && <div className="text-[10px] font-sans text-slate-400">{log.customerName}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {log.messageType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === 'delivered' || log.status === 'read'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.status === 'scheduled'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : log.status === 'received'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.customerReply ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.replyAction === 'YES'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.replyAction === 'CANCEL'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.customerReply}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[220px]">
                      {log.errorMessage ? (
                        <div className="space-y-1">
                          <div className="text-[10px] text-rose-700 truncate" title={log.errorMessage}>
                            {log.errorCode ? `[${log.errorCode}] ` : ''}
                            {log.errorMessage}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">
                              Retry: {log.retryStatus} ({log.retryCount}/{log.maxRetries})
                            </span>
                            {log.status === 'failed' &&
                              (log.messageType === 'order_confirmation' || log.messageType === 'reminder_23h') && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryFailedLog(log.id)}
                                  disabled={retryingLogId === log.id}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-black text-white text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>{retryingLogId === log.id ? '...' : 'Retry'}</span>
                                </button>
                              )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {log.retryStatus !== 'none' ? `Retry: ${log.retryStatus}` : 'OK'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
