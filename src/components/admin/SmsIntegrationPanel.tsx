import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  X,
  Trash2,
  Plus,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SmsIntegrationSettings, SmsGatewayConfig } from '../../types';
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

interface SmsIntegrationPanelProps {
  onSaveNotification?: (msg: string) => void;
}

export const SmsIntegrationPanel: React.FC<SmsIntegrationPanelProps> = ({
  onSaveNotification,
}) => {
  const { settings, updateSmsSettings } = useStore();

  const defaultSettings: SmsIntegrationSettings = {
    enabled: true,
    activeProviderId: 'twofactor',
    fallbackProviderId: 'meta_whatsapp',
    otpExpiryMinutes: 10,
    maxDailyOtpPerNumber: 5,
    gateways: [
      {
        id: 'twofactor',
        name: '2Factor.in SMS Gateway (India #1 Transactional Route)',
        provider: 'twofactor',
        enabled: true,
        isPrimary: true,
        apiKey: '',
        senderId: 'REDMOD',
        route: 'otp',
        otpVerificationEnabled: true,
        orderUpdatesEnabled: false,
        codVerificationEnabled: true,
      },
      {
        id: 'meta_whatsapp',
        name: 'Meta WhatsApp Cloud OTP (Official Meta API)',
        provider: 'meta_whatsapp',
        enabled: true,
        isPrimary: false,
        phoneNumberId: '1375149605673144',
        wabaId: '2745819689145292',
        accessToken: '',
        templateName: 'redmode_otp_verification',
        languageCode: 'en_US',
        otpVerificationEnabled: true,
        orderUpdatesEnabled: true,
        codVerificationEnabled: true,
      },
    ],
  };

  const [envConnected, setEnvConnected] = useState<{
    meta_whatsapp: boolean;
    twofactor: boolean;
  }>({
    meta_whatsapp: false,
    twofactor: false,
  });
  const [twoFactorBalance, setTwoFactorBalance] = useState<string | null>(null);

  useEffect(() => {
    const adminToken =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    fetch('/api/admin/sms-settings', {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      credentials: 'include',
    })
      .then(async (r) => {
        const txt = await r.text();
        if (!txt || !txt.trim().startsWith('{')) return null;
        return JSON.parse(txt);
      })
      .then((data) => {
        if (data?.envConnected) {
          setEnvConnected(data.envConnected);
        }
        if (data?.twoFactorBalance) {
          setTwoFactorBalance(data.twoFactorBalance);
        }
      })
      .catch(() => {});
  }, []);

  const sanitizeSmsSettings = (
    raw?: SmsIntegrationSettings,
    deletedIds: string[] = settings.deletedSmsGatewayIds || []
  ): SmsIntegrationSettings => {
    const hasExplicitGateways = raw && Array.isArray(raw.gateways);
    const base = hasExplicitGateways ? raw! : defaultSettings;
    const rawGateways = hasExplicitGateways
      ? raw!.gateways.filter((g) => g && !deletedIds.includes(g.id))
      : defaultSettings.gateways.filter((g) => !deletedIds.includes(g.id));

    const cleanedGateways: SmsGatewayConfig[] = rawGateways.map((gw) => {
      const defMatch = defaultSettings.gateways.find((d) => d.provider === gw.provider);
      if (gw.provider === 'twofactor') {
        return {
          ...(defMatch || {}),
          ...gw,
          id: gw.id || 'twofactor',
          provider: 'twofactor' as const,
          enabled: gw.enabled ?? true,
          apiKey: gw.apiKey && gw.apiKey.trim().length >= 8 ? gw.apiKey.trim() : '',
        };
      }
      return {
        ...(defMatch || {}),
        ...gw,
        id: gw.id || 'meta_whatsapp',
        provider: 'meta_whatsapp' as const,
        enabled: gw.enabled ?? true,
        phoneNumberId:
          !gw.phoneNumberId || gw.phoneNumberId === '109845729104823'
            ? '1375149605673144'
            : gw.phoneNumberId,
        wabaId:
          !gw.wabaId || gw.wabaId === '392019482910482'
            ? '2745819689145292'
            : gw.wabaId,
        accessToken:
          gw.accessToken && gw.accessToken.includes('EAAG9xxxxxxx')
            ? ''
            : gw.accessToken || '',
      };
    });

    const validActiveId = cleanedGateways.some((g) => g.id === base.activeProviderId)
      ? base.activeProviderId
      : base.activeProviderId === ''
      ? ''
      : cleanedGateways.find((g) => g.enabled)?.id || '';

    const validFallbackId =
      base.fallbackProviderId &&
      base.fallbackProviderId !== validActiveId &&
      cleanedGateways.some((g) => g.id === base.fallbackProviderId)
        ? base.fallbackProviderId
        : undefined;

    return {
      ...base,
      enabled: base.enabled ?? true,
      activeProviderId: validActiveId,
      fallbackProviderId: validFallbackId,
      gateways: cleanedGateways.map((g) => ({
        ...g,
        isPrimary: Boolean(validActiveId && g.id === validActiveId),
      })),
    };
  };

  const [smsData, setSmsData] = useState<SmsIntegrationSettings>(() =>
    sanitizeSmsSettings(settings.smsSettings, settings.deletedSmsGatewayIds || [])
  );

  // Sync when settings.smsSettings finishes loading from Cloud Firestore
  useEffect(() => {
    if (settings.smsSettings && Array.isArray(settings.smsSettings.gateways)) {
      const next = sanitizeSmsSettings(settings.smsSettings, settings.deletedSmsGatewayIds || []);
      setSmsData(next);
      if (activeTabGateway && !next.gateways.some((g) => g.id === activeTabGateway)) {
        setActiveTabGateway(next.gateways[0]?.id || '');
      } else if (!activeTabGateway && next.gateways.length > 0) {
        setActiveTabGateway(next.gateways[0].id);
      }
    }
  }, [settings.smsSettings, settings.deletedSmsGatewayIds]);

  const [activeTabGateway, setActiveTabGateway] = useState<string>(
    () => smsData.gateways[0]?.id || ''
  );
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [gatewayToDelete, setGatewayToDelete] = useState<SmsGatewayConfig | null>(null);

  // Credential visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Universal inline button states & error feedback
  const [saveButtonState, setSaveButtonState] = useState<SaveButtonState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testButtonState, setTestButtonState] = useState<TestButtonState>('idle');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const testTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Reset inline button feedback when switching gateway tabs
  useEffect(() => {
    setShowApiKey(false);
    setShowAccessToken(false);
    setSaveError(null);
    setTestResult(null);
    setSaveButtonState('idle');
    setTestButtonState('idle');
  }, [activeTabGateway]);

  const showTransientNotice = (msg: string) => {
    setStatusNotice(msg);
    if (onSaveNotification) onSaveNotification(msg);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setStatusNotice(null), 3500);
  };

  const isGatewayConfigured = (g: SmsGatewayConfig): boolean => {
    if (g.provider === 'meta_whatsapp') {
      const pid = (g.phoneNumberId || '').trim();
      return Boolean((pid && pid !== '109845729104823') || envConnected.meta_whatsapp);
    }
    if (g.provider === 'twofactor') {
      return Boolean((g.apiKey || '').trim().length >= 6 || envConnected.twofactor);
    }
    return (g.apiKey || '').trim().length >= 6;
  };

  const handleUpdateGlobal = (field: keyof SmsIntegrationSettings, value: any) => {
    setSmsData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleMasterService = () => {
    const nextEnabled = !smsData.enabled;
    const nextState: SmsIntegrationSettings = { ...smsData, enabled: nextEnabled };
    setSmsData(nextState);
    updateSmsSettings(nextState);
    showTransientNotice(nextEnabled ? 'OTP service activated.' : 'OTP service deactivated.');
  };

  const handleUpdateGateway = (gatewayId: string, updates: Partial<SmsGatewayConfig>) => {
    setSmsData((prev) => ({
      ...prev,
      gateways: prev.gateways.map((g) => (g.id === gatewayId ? { ...g, ...updates } : g)),
    }));
  };

  const handleToggleGatewayActive = (gatewayId: string) => {
    const target = smsData.gateways.find((g) => g.id === gatewayId);
    if (!target) return;
    const nextEnabled = !target.enabled;
    const updatedGateways = smsData.gateways.map((g) =>
      g.id === gatewayId ? { ...g, enabled: nextEnabled } : g
    );
    let nextActiveId = smsData.activeProviderId;
    if (!nextEnabled && smsData.activeProviderId === gatewayId) {
      nextActiveId = updatedGateways.find((g) => g.enabled && g.id !== gatewayId)?.id || '';
    } else if (nextEnabled && !smsData.activeProviderId) {
      nextActiveId = gatewayId;
    }
    const nextState: SmsIntegrationSettings = {
      ...smsData,
      activeProviderId: nextActiveId,
      gateways: updatedGateways.map((g) => ({
        ...g,
        isPrimary: Boolean(nextActiveId && g.id === nextActiveId),
      })),
    };
    setSmsData(nextState);
    updateSmsSettings(nextState);
    const label = target.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : '2Factor.in SMS';
    showTransientNotice(`${label} ${nextEnabled ? 'activated' : 'deactivated'}.`);
  };

  const handleConfirmDeleteGateway = () => {
    if (!gatewayToDelete) return;
    const remaining = smsData.gateways.filter((g) => g.id !== gatewayToDelete.id);
    const nextActiveId =
      smsData.activeProviderId === gatewayToDelete.id
        ? remaining.find((g) => g.enabled)?.id || ''
        : smsData.activeProviderId;
    const nextFallbackId =
      smsData.fallbackProviderId === gatewayToDelete.id ||
      smsData.fallbackProviderId === nextActiveId
        ? undefined
        : smsData.fallbackProviderId;

    const nextState: SmsIntegrationSettings = {
      ...smsData,
      activeProviderId: nextActiveId,
      fallbackProviderId: nextFallbackId,
      gateways: remaining.map((g) => ({
        ...g,
        isPrimary: Boolean(nextActiveId && g.id === nextActiveId),
      })),
    };
    setSmsData(nextState);
    updateSmsSettings(nextState);
    if (activeTabGateway === gatewayToDelete.id) {
      setActiveTabGateway(remaining[0]?.id || '');
    }
    const deletedLabel =
      gatewayToDelete.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : '2Factor.in SMS';
    setGatewayToDelete(null);
    showTransientNotice(`${deletedLabel} gateway permanently deleted.`);
  };

  const handleReAddGateway = (provider: 'twofactor' | 'meta_whatsapp') => {
    const template = defaultSettings.gateways.find((g) => g.provider === provider);
    if (!template) return;
    if (smsData.gateways.some((g) => g.provider === provider)) return;
    const nextGateways = [...smsData.gateways, { ...template, isPrimary: !smsData.activeProviderId }];
    const nextActiveId = smsData.activeProviderId || template.id;
    const nextState: SmsIntegrationSettings = {
      ...smsData,
      activeProviderId: nextActiveId,
      gateways: nextGateways,
    };
    setSmsData(nextState);
    setActiveTabGateway(template.id);
    updateSmsSettings(nextState);
  };

  const handleSelectPrimary = (gatewayId: string) => {
    setActiveTabGateway(gatewayId);
    setSmsData((prev) => ({
      ...prev,
      activeProviderId: gatewayId,
      gateways: prev.gateways.map((g) => ({
        ...g,
        isPrimary: g.id === gatewayId,
        enabled: g.id === gatewayId ? true : g.enabled,
      })),
    }));
  };

  const handleSaveAll = async () => {
    if (saveButtonState === 'saving') return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveError(null);
    setSaveButtonState('saving');

    const cleanedSms: SmsIntegrationSettings = {
      ...smsData,
      gateways: smsData.gateways.map((g) => ({
        ...g,
        apiKey: (g.apiKey || '').trim(),
        accessToken: (g.accessToken || '').trim(),
        phoneNumberId: (g.phoneNumberId || '').trim(),
        wabaId: (g.wabaId || '').trim(),
        senderId: (g.senderId || '').trim().toUpperCase(),
        templateName: (g.templateName || '').trim(),
        languageCode: (g.languageCode || 'en_US').trim(),
      })),
    };

    setSmsData(cleanedSms);

    try {
      const result = await updateSmsSettings(cleanedSms);
      if (result && result.success === false) {
        setSaveButtonState('error');
        setSaveError(result.error || 'Failed to save SMS & OTP configuration.');
        saveTimerRef.current = window.setTimeout(() => setSaveButtonState('idle'), 2500);
        return;
      }

      setSaveButtonState('saved');
      saveTimerRef.current = window.setTimeout(() => setSaveButtonState('idle'), 2000);
    } catch (err: any) {
      setSaveButtonState('error');
      setSaveError(err?.message || 'Failed to save SMS & OTP configuration.');
      saveTimerRef.current = window.setTimeout(() => setSaveButtonState('idle'), 2500);
    }
  };

  const handleTestMetaConnection = async () => {
    if (!currentGateway || currentGateway.provider !== 'meta_whatsapp') return;
    if (testButtonState === 'testing') return;
    if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
    setTestResult(null);
    setTestButtonState('testing');

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
          accessToken: (currentGateway.accessToken || '').trim(),
          phoneNumberId: (currentGateway.phoneNumberId || '').trim(),
          wabaId: (currentGateway.wabaId || '').trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const isOk = Boolean(res.ok && data?.success);
      const message =
        data?.message ||
        (isOk
          ? 'Meta WhatsApp Cloud API connection verified.'
          : 'Meta WhatsApp connection failed.');

      setTestResult({ success: isOk, message });
      setTestButtonState(isOk ? 'connected' : 'failed');
      testTimerRef.current = window.setTimeout(() => setTestButtonState('idle'), 2000);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error while testing Meta WhatsApp connection.',
      });
      setTestButtonState('failed');
      testTimerRef.current = window.setTimeout(() => setTestButtonState('idle'), 2000);
    }
  };

  const currentGateway =
    smsData.gateways.find((g) => g.id === activeTabGateway) || smsData.gateways[0] || null;
  const isCurrentActive = Boolean(
    currentGateway && smsData.enabled && currentGateway.enabled && isGatewayConfigured(currentGateway)
  );
  const missingPresets = defaultSettings.gateways.filter(
    (defGw) => !smsData.gateways.some((g) => g.provider === defGw.provider)
  );

  const headerStatus: IntegrationConnectionStatus =
    saveButtonState === 'saving'
      ? 'saving'
      : testButtonState === 'testing'
      ? 'testing'
      : saveButtonState === 'error' || testResult?.success === false
      ? 'error'
      : !smsData.enabled
      ? 'inactive'
      : smsData.gateways.some((g) => g.enabled && isGatewayConfigured(g))
      ? 'connected'
      : 'setup';

  const gatewayStatus: IntegrationConnectionStatus =
    !currentGateway
      ? 'disconnected'
      : testButtonState === 'testing'
      ? 'testing'
      : testResult?.success === false
      ? 'error'
      : !currentGateway.enabled || !smsData.enabled
      ? 'inactive'
      : isCurrentActive
      ? 'connected'
      : 'setup';

  return (
    <div className="space-y-5 text-slate-900">
      {statusNotice && !onSaveNotification && (
        <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Dismiss notice"
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. COMPACT INTEGRATION HEADER + ROUTING CONTROLS */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-semibold text-slate-900">SMS & OTP Gateways</h3>
              <IntegrationStatusIndicator status={headerStatus} />
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                  smsData.enabled
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                OTP Service: {smsData.enabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Transactional OTP delivery, automatic provider fallback, and verification triggers.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleMasterService}
            className={`h-9 px-3.5 text-xs font-medium rounded-lg transition cursor-pointer shrink-0 self-start sm:self-auto ${
              smsData.enabled
                ? 'border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {smsData.enabled ? 'Deactivate Service' : 'Activate Service'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label
              htmlFor="sms-master-enabled"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              OTP Service Status
            </label>
            <label
              htmlFor="sms-master-enabled"
              className="flex items-center justify-between h-9 px-3 rounded-lg border border-slate-300 bg-white cursor-pointer select-none"
            >
              <span className="text-xs font-medium text-slate-800">
                {smsData.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <input
                type="checkbox"
                id="sms-master-enabled"
                checked={smsData.enabled}
                onChange={(e) => handleUpdateGlobal('enabled', e.target.checked)}
                className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Primary Active Provider
            </label>
            <select
              value={smsData.activeProviderId}
              onChange={(e) => handleSelectPrimary(e.target.value)}
              className="w-full h-9 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
            >
              {smsData.gateways.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.provider === 'twofactor' ? '2Factor.in SMS' : 'Meta WhatsApp Cloud'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Auto-Fallback Provider
            </label>
            <select
              value={smsData.fallbackProviderId || ''}
              onChange={(e) =>
                handleUpdateGlobal('fallbackProviderId', e.target.value || undefined)
              }
              className="w-full h-9 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
            >
              <option value="">None (Single Gateway)</option>
              {smsData.gateways
                .filter((g) => g.id !== smsData.activeProviderId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.provider === 'twofactor' ? '2Factor.in SMS' : 'Meta WhatsApp Cloud'}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              OTP Expiry Duration
            </label>
            <select
              value={smsData.otpExpiryMinutes}
              onChange={(e) => handleUpdateGlobal('otpExpiryMinutes', Number(e.target.value))}
              className="w-full h-9 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
            >
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes (Standard)</option>
              <option value={15}>15 Minutes</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. GATEWAY CONFIGURATION & AUTOMATION */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-900">API Configuration</h4>
            <IntegrationStatusIndicator
              status={gatewayStatus}
              label={
                currentGateway?.provider === 'twofactor' && isCurrentActive && twoFactorBalance
                  ? `Connected · ${twoFactorBalance} Credits`
                  : undefined
              }
            />
          </div>

          <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
            {smsData.gateways.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                {smsData.gateways.map((g) => {
                  const isSelected = g.id === currentGateway?.id;
                  const isConfigured = smsData.enabled && g.enabled && isGatewayConfigured(g);
                  const label =
                    g.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : '2Factor.in SMS';
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveTabGateway(g.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isConfigured
                            ? 'bg-emerald-500'
                            : !g.enabled
                            ? 'bg-rose-400'
                            : 'bg-slate-300'
                        }`}
                      />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentGateway && (
              <button
                type="button"
                onClick={() => handleToggleGatewayActive(currentGateway.id)}
                className={`h-8 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
                  currentGateway.enabled
                    ? 'border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {currentGateway.enabled ? 'Deactivate' : 'Activate'}
              </button>
            )}

            {missingPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  handleReAddGateway(preset.provider as 'twofactor' | 'meta_whatsapp')
                }
                className="inline-flex items-center gap-1 h-8 px-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  Add {preset.provider === 'meta_whatsapp' ? 'WhatsApp OTP' : '2Factor SMS'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {!currentGateway ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center space-y-3 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-600">
              No SMS or OTP gateways configured. Add a provider below to enable OTP dispatch.
            </p>
            <div className="flex items-center justify-center flex-wrap gap-2">
              {missingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    handleReAddGateway(preset.provider as 'twofactor' | 'meta_whatsapp')
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Add {preset.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : '2Factor.in SMS'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 2Factor.in SMS Configuration */}
            {currentGateway.provider === 'twofactor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                    <span>
                      2Factor API Key <span className="text-rose-500">*</span>
                    </span>
                    <IntegrationInfoTip text="Leave empty to use the server-side TWOFACTOR_API_KEY environment variable, or paste your 2Factor.in API key here." />
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={currentGateway.apiKey || ''}
                      onChange={(e) =>
                        handleUpdateGateway(currentGateway.id, { apiKey: e.target.value })
                      }
                      placeholder={
                        envConnected.twofactor
                          ? 'Configured via server environment variable'
                          : 'Enter 2Factor API Key'
                      }
                      autoComplete="off"
                      className="w-full h-9 pl-3 pr-9 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Approved Sender ID
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={currentGateway.senderId || 'REDMOD'}
                    onChange={(e) =>
                      handleUpdateGateway(currentGateway.id, {
                        senderId: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="REDMOD"
                    className="w-full h-9 px-3 text-xs uppercase font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>
              </div>
            )}

            {/* Meta WhatsApp Cloud OTP Configuration */}
            {currentGateway.provider === 'meta_whatsapp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Meta Phone Number ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentGateway.phoneNumberId || ''}
                    onChange={(e) =>
                      handleUpdateGateway(currentGateway.id, { phoneNumberId: e.target.value })
                    }
                    placeholder="1375149605673144"
                    className="w-full h-9 px-3 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    value={currentGateway.wabaId || ''}
                    onChange={(e) =>
                      handleUpdateGateway(currentGateway.id, { wabaId: e.target.value })
                    }
                    placeholder="2745819689145292"
                    className="w-full h-9 px-3 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                    <span>
                      Meta WhatsApp Cloud Access Token <span className="text-rose-500">*</span>
                    </span>
                    <IntegrationInfoTip text="Permanent System User token from Meta Business Manager with whatsapp_business_messaging permission." />
                  </label>
                  <div className="relative">
                    <input
                      type={showAccessToken ? 'text' : 'password'}
                      value={currentGateway.accessToken || ''}
                      onChange={(e) =>
                        handleUpdateGateway(currentGateway.id, { accessToken: e.target.value })
                      }
                      placeholder={
                        envConnected.meta_whatsapp
                          ? 'Configured via server environment variable'
                          : 'EAAG9... Permanent System User Access Token'
                      }
                      autoComplete="off"
                      className="w-full h-9 pl-3 pr-9 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessToken((prev) => !prev)}
                      aria-label={showAccessToken ? 'Hide access token' : 'Show access token'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showAccessToken ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Approved WhatsApp Template Name
                  </label>
                  <input
                    type="text"
                    value={currentGateway.templateName || ''}
                    onChange={(e) =>
                      handleUpdateGateway(currentGateway.id, { templateName: e.target.value })
                    }
                    placeholder="redmode_otp_verification"
                    className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Language Code
                  </label>
                  <input
                    type="text"
                    value={currentGateway.languageCode || 'en_US'}
                    onChange={(e) =>
                      handleUpdateGateway(currentGateway.id, { languageCode: e.target.value })
                    }
                    placeholder="en_US"
                    className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  />
                </div>
              </div>
            )}

            {/* 3. AUTOMATION SETTINGS */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Automation Settings
                </h4>
                <span className="text-[11px] text-slate-500">
                  {currentGateway.provider === 'meta_whatsapp'
                    ? 'Meta WhatsApp Cloud'
                    : '2Factor.in SMS'}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                <AutomationToggleRow
                  title="Customer Login OTP"
                  description="Send one-time verification codes during customer sign-in."
                  checked={currentGateway.otpVerificationEnabled}
                  onChange={(checked) =>
                    handleUpdateGateway(currentGateway.id, {
                      otpVerificationEnabled: checked,
                    })
                  }
                />
                <AutomationToggleRow
                  title="COD Order Verification"
                  description="Verify cash-on-delivery orders with an OTP before fulfillment."
                  checked={currentGateway.codVerificationEnabled}
                  onChange={(checked) =>
                    handleUpdateGateway(currentGateway.id, {
                      codVerificationEnabled: checked,
                    })
                  }
                />
                <AutomationToggleRow
                  title="Order Dispatch Alerts"
                  description="Send transactional dispatch notifications through this gateway."
                  checked={currentGateway.orderUpdatesEnabled}
                  onChange={(checked) =>
                    handleUpdateGateway(currentGateway.id, {
                      orderUpdatesEnabled: checked,
                    })
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* CONSISTENT BOTTOM-RIGHT ACTION ROW */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            {currentGateway ? (
              <button
                type="button"
                onClick={() => setGatewayToDelete(currentGateway)}
                className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Gateway</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-2.5 flex-wrap">
              {currentGateway?.provider === 'meta_whatsapp' && (
                <TestConnectionButton
                  state={testButtonState}
                  onClick={handleTestMetaConnection}
                />
              )}
              <SaveChangesButton state={saveButtonState} onClick={handleSaveAll} />
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
      </section>

      {/* DELETE CONFIRMATION MODAL */}
      {gatewayToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGatewayToDelete(null);
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
                  <h3 className="text-sm font-semibold text-slate-900">Delete OTP gateway?</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This will permanently delete <strong>{gatewayToDelete.name}</strong> and its
                    saved credentials.
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
                onClick={handleConfirmDeleteGateway}
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
