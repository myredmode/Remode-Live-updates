import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, X } from 'lucide-react';
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

  const sanitizeSmsSettings = (raw?: SmsIntegrationSettings): SmsIntegrationSettings => {
    const base = raw && Array.isArray(raw.gateways) ? raw : defaultSettings;
    const rawGateways = Array.isArray(base.gateways) ? base.gateways : [];
    const existingTwoFactor = rawGateways.find((g) => g.provider === 'twofactor');
    const shouldPromoteTwoFactor =
      !existingTwoFactor?.apiKey ||
      existingTwoFactor.apiKey.trim().length < 8 ||
      base.activeProviderId === 'fast2sms' ||
      base.activeProviderId === 'msg91' ||
      !base.activeProviderId;

    const activeId = shouldPromoteTwoFactor ? 'twofactor' : base.activeProviderId;
    const fallbackId = activeId === 'twofactor' ? 'meta_whatsapp' : 'twofactor';

    const cleanedGateways = defaultSettings.gateways.map((defGw) => {
      const found = rawGateways.find((g) => g.provider === defGw.provider);
      if (defGw.provider === 'twofactor') {
        return {
          ...defGw,
          ...(found || {}),
          id: 'twofactor',
          provider: 'twofactor' as const,
          enabled: true,
          isPrimary: activeId === 'twofactor',
          apiKey:
            found?.apiKey && found.apiKey.trim().length >= 8
              ? found.apiKey.trim()
              : '',
        };
      }
      return {
        ...defGw,
        ...(found || {}),
        id: 'meta_whatsapp',
        provider: 'meta_whatsapp' as const,
        enabled: found?.enabled ?? true,
        isPrimary: activeId === 'meta_whatsapp',
        phoneNumberId:
          !found?.phoneNumberId || found.phoneNumberId === '109845729104823'
            ? '1375149605673144'
            : found.phoneNumberId,
        wabaId:
          !found?.wabaId || found.wabaId === '392019482910482'
            ? '2745819689145292'
            : found.wabaId,
        accessToken:
          found?.accessToken && found.accessToken.includes('EAAG9xxxxxxx')
            ? ''
            : (found?.accessToken || ''),
      };
    });

    return {
      ...base,
      enabled: base.enabled ?? true,
      activeProviderId: activeId,
      fallbackProviderId: fallbackId,
      gateways: cleanedGateways,
    };
  };

  const [smsData, setSmsData] = useState<SmsIntegrationSettings>(() =>
    sanitizeSmsSettings(settings.smsSettings)
  );

  // Sync when settings.smsSettings finishes loading from Cloud Firestore
  useEffect(() => {
    if (settings.smsSettings && Array.isArray(settings.smsSettings.gateways)) {
      setSmsData(sanitizeSmsSettings(settings.smsSettings));
    }
  }, [settings.smsSettings]);

  const [activeTabGateway, setActiveTabGateway] = useState<string>('twofactor');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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

  const handleUpdateGateway = (gatewayId: string, updates: Partial<SmsGatewayConfig>) => {
    setSmsData((prev) => ({
      ...prev,
      gateways: prev.gateways.map((g) => (g.id === gatewayId ? { ...g, ...updates } : g)),
    }));
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
    updateSmsSettings(smsData);
    setSaveSuccessMsg('SMS & OTP Gateway settings saved successfully.');
    if (onSaveNotification) {
      onSaveNotification('SMS & OTP Gateway settings saved and synchronized.');
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const currentGateway =
    smsData.gateways.find((g) => g.id === activeTabGateway) || smsData.gateways[0];
  const isCurrentActive =
    smsData.enabled && currentGateway.enabled && isGatewayConfigured(currentGateway);

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

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center justify-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
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
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Gateway Configuration
            </h3>
            <span className="text-xs text-slate-300" aria-hidden="true">/</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCurrentActive ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              {isCurrentActive ? 'Connected' : 'Inactive'}
              {currentGateway.provider === 'twofactor' && twoFactorBalance
                ? ` · ${twoFactorBalance} Credits`
                : ''}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto">
            {smsData.gateways.map((g) => {
              const isSelected = g.id === activeTabGateway;
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
                      isConfigured ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

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
      </section>

      {/* SECTION C – AUTOMATION RULES */}
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
    </div>
  );
};
