import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, X, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SmsIntegrationSettings, SmsGatewayConfig } from '../../types';

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
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [gatewayToDelete, setGatewayToDelete] = useState<SmsGatewayConfig | null>(null);

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
    const msg = nextEnabled ? 'OTP service activated.' : 'OTP service deactivated.';
    setSaveSuccessMsg(msg);
    if (onSaveNotification) onSaveNotification(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
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
    const msg = `${label} ${nextEnabled ? 'activated' : 'deactivated'}.`;
    setSaveSuccessMsg(msg);
    if (onSaveNotification) onSaveNotification(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
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
    const msg = `${deletedLabel} gateway permanently deleted.`;
    setSaveSuccessMsg(msg);
    if (onSaveNotification) onSaveNotification(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
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

  const handleSaveAll = () => {
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
    updateSmsSettings(cleanedSms);
    setSaveSuccessMsg('SMS & OTP Gateway settings saved successfully.');
    if (onSaveNotification) {
      onSaveNotification('SMS & OTP Gateway settings saved and synchronized.');
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const currentGateway =
    smsData.gateways.find((g) => g.id === activeTabGateway) || smsData.gateways[0] || null;
  const isCurrentActive = Boolean(
    currentGateway && smsData.enabled && currentGateway.enabled && isGatewayConfigured(currentGateway)
  );
  const missingPresets = defaultSettings.gateways.filter(
    (defGw) => !smsData.gateways.some((g) => g.provider === defGw.provider)
  );

  return (
    <div className="space-y-3 text-slate-900">
      {saveSuccessMsg && !onSaveNotification && (
        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SECTION A – GENERAL SETTINGS */}
      <section className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              General Settings
            </h3>
            <span className="text-xs text-slate-300" aria-hidden="true">/</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  smsData.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              {smsData.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleToggleMasterService}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                smsData.enabled
                  ? 'border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {smsData.enabled ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <div>
            <label
              htmlFor="sms-master-enabled"
              className="text-[11px] font-medium text-slate-600 block mb-1"
            >
              OTP Service Status
            </label>
            <label
              htmlFor="sms-master-enabled"
              className="flex items-center justify-between h-8 px-2.5 rounded-lg border border-[#E5E7EB] bg-white cursor-pointer select-none"
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
            <label className="text-[11px] font-medium text-slate-600 block mb-1">
              Primary Active Provider
            </label>
            <select
              value={smsData.activeProviderId}
              onChange={(e) => handleSelectPrimary(e.target.value)}
              className="w-full h-8 text-xs font-medium text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            >
              {smsData.gateways.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.provider === 'twofactor' ? '2Factor.in SMS' : 'Meta WhatsApp Cloud'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-1">
              Auto-Fallback Provider
            </label>
            <select
              value={smsData.fallbackProviderId || ''}
              onChange={(e) =>
                handleUpdateGlobal('fallbackProviderId', e.target.value || undefined)
              }
              className="w-full h-8 text-xs font-medium text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
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
            <label className="text-[11px] font-medium text-slate-600 block mb-1">
              OTP Expiry Duration
            </label>
            <select
              value={smsData.otpExpiryMinutes}
              onChange={(e) => handleUpdateGlobal('otpExpiryMinutes', Number(e.target.value))}
              className="w-full h-8 text-xs font-medium text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes (Standard)</option>
              <option value={15}>15 Minutes</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION B – GATEWAY CONFIGURATION */}
      <section className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E7EB] pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Gateway Configuration
            </h3>
            <span className="text-xs text-slate-300" aria-hidden="true">/</span>
            {currentGateway ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCurrentActive
                      ? 'bg-emerald-500'
                      : !currentGateway.enabled
                      ? 'bg-rose-400'
                      : 'bg-slate-300'
                  }`}
                />
                {!currentGateway.enabled
                  ? 'Deactivated'
                  : isCurrentActive
                  ? 'Connected'
                  : 'Inactive'}
                {currentGateway.provider === 'twofactor' && twoFactorBalance
                  ? ` · ${twoFactorBalance} Credits`
                  : ''}
              </span>
            ) : (
              <span className="text-xs text-slate-500">No Gateways</span>
            )}
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
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer inline-flex items-center gap-1.5 ${
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
              <>
                <button
                  type="button"
                  onClick={() => handleToggleGatewayActive(currentGateway.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    currentGateway.enabled
                      ? 'border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {currentGateway.enabled ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => setGatewayToDelete(currentGateway)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                  title="Delete Gateway"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {missingPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleReAddGateway(preset.provider as 'twofactor' | 'meta_whatsapp')}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-md transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add {preset.provider === 'meta_whatsapp' ? 'WhatsApp OTP' : '2Factor SMS'}</span>
              </button>
            ))}
          </div>
        </div>

        {!currentGateway ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center space-y-2.5 bg-slate-50/50">
            <p className="text-xs font-medium text-slate-600">
              All SMS / OTP gateways have been deleted. Add a gateway below to re-enable OTP dispatch.
            </p>
            <div className="flex items-center justify-center flex-wrap gap-2">
              {missingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleReAddGateway(preset.provider as 'twofactor' | 'meta_whatsapp')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {preset.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : '2Factor.in SMS'}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 2Factor.in SMS Configuration */}
            {currentGateway.provider === 'twofactor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                2Factor API Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={currentGateway.apiKey || ''}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, { apiKey: e.target.value })
                }
                placeholder="Configured via TWOFACTOR_API_KEY env var or enter key"
                className="w-full h-8 text-xs font-mono text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
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
                className="w-full h-8 text-xs uppercase font-mono text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Meta WhatsApp Cloud Configuration */}
        {currentGateway.provider === 'meta_whatsapp' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Meta Phone Number ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={currentGateway.phoneNumberId || ''}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, { phoneNumberId: e.target.value })
                }
                placeholder="1375149605673144"
                className="w-full h-8 text-xs font-mono text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={currentGateway.wabaId || ''}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, { wabaId: e.target.value })
                }
                placeholder="2745819689145292"
                className="w-full h-8 text-xs font-mono text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Meta WhatsApp Cloud Access Token <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={currentGateway.accessToken || ''}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, { accessToken: e.target.value })
                }
                placeholder="EAAG9... Permanent System User Access Token"
                className="w-full h-8 text-xs font-mono text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Approved WhatsApp Template Name
              </label>
              <input
                type="text"
                value={currentGateway.templateName || ''}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, { templateName: e.target.value })
                }
                placeholder="redmode_otp_verification"
                className="w-full h-8 text-xs text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Language Code
              </label>
              <input
                type="text"
                value={currentGateway.languageCode || 'en_US'}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, { languageCode: e.target.value })
                }
                placeholder="en_US"
                className="w-full h-8 text-xs text-slate-900 bg-white border border-[#E5E7EB] rounded-lg px-2.5 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
        )}
          </>
        )}
      </section>

      {/* SECTION C – AUTOMATION RULES */}
      {currentGateway && (
        <section className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Automation Rules
            </h3>
            <span className="text-[11px] text-slate-500">
              {currentGateway.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : '2Factor.in SMS'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#E5E7EB] bg-white cursor-pointer hover:bg-slate-50/60 transition">
              <input
                type="checkbox"
                checked={currentGateway.otpVerificationEnabled}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, {
                    otpVerificationEnabled: e.target.checked,
                  })
                }
                className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-800">Customer Login OTP</span>
            </label>

            <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#E5E7EB] bg-white cursor-pointer hover:bg-slate-50/60 transition">
              <input
                type="checkbox"
                checked={currentGateway.codVerificationEnabled}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, {
                    codVerificationEnabled: e.target.checked,
                  })
                }
                className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-800">COD Order Verification</span>
            </label>

            <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#E5E7EB] bg-white cursor-pointer hover:bg-slate-50/60 transition">
              <input
                type="checkbox"
                checked={currentGateway.orderUpdatesEnabled}
                onChange={(e) =>
                  handleUpdateGateway(currentGateway.id, {
                    orderUpdatesEnabled: e.target.checked,
                  })
                }
                className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-800">Order Dispatch Alerts</span>
            </label>
          </div>
        </section>
      )}

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
                    This will permanently delete <strong>{gatewayToDelete.name}</strong> and its saved credentials.
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
