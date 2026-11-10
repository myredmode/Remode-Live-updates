import React, { useState } from 'react';
import {
  Smartphone,
  Check,
  Eye,
  EyeOff,
  Send,
  X,
  ShieldCheck,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle2,
  Settings,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SmsIntegrationSettings, SmsGatewayConfig, SmsProviderType } from '../../types';

interface SmsIntegrationPanelProps {
  onSaveNotification?: (msg: string) => void;
}

export const SmsIntegrationPanel: React.FC<SmsIntegrationPanelProps> = ({
  onSaveNotification,
}) => {
  const { settings, updateSmsSettings } = useStore();

  const defaultSettings: SmsIntegrationSettings = {
    enabled: true,
    activeProviderId: 'meta_whatsapp',
    fallbackProviderId: 'twofactor',
    otpExpiryMinutes: 10,
    maxDailyOtpPerNumber: 5,
    gateways: [
      {
        id: 'meta_whatsapp',
        name: 'Meta WhatsApp Cloud OTP (Official Meta API)',
        provider: 'meta_whatsapp',
        enabled: true,
        isPrimary: true,
        phoneNumberId: '109845729104823',
        wabaId: '392019482910482',
        accessToken: 'EAAG9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        templateName: 'redmode_otp_verification',
        languageCode: 'en_US',
        otpVerificationEnabled: true,
        orderUpdatesEnabled: true,
        codVerificationEnabled: true,
      },
      {
        id: 'twofactor',
        name: '2Factor.in SMS Gateway (India #1 Transactional Route)',
        provider: 'twofactor',
        enabled: true,
        isPrimary: false,
        apiKey: '',
        senderId: 'REDMOD',
        route: 'otp',
        otpVerificationEnabled: true,
        orderUpdatesEnabled: false,
        codVerificationEnabled: true,
      },
      {
        id: 'fast2sms',
        name: 'Fast2SMS Quick OTP Gateway',
        provider: 'fast2sms',
        enabled: false,
        isPrimary: false,
        apiKey: '',
        route: 'otp',
        otpVerificationEnabled: true,
        orderUpdatesEnabled: false,
        codVerificationEnabled: false,
      },
      {
        id: 'msg91',
        name: 'MSG91 Enterprise SMS Gateway',
        provider: 'msg91',
        enabled: false,
        isPrimary: false,
        apiKey: '',
        senderId: 'REDMOD',
        templateId: '',
        route: 'otp',
        otpVerificationEnabled: true,
        orderUpdatesEnabled: false,
        codVerificationEnabled: false,
      },
    ],
  };

  const [smsData, setSmsData] = useState<SmsIntegrationSettings>(
    settings.smsSettings || defaultSettings
  );

  const [activeTabGateway, setActiveTabGateway] = useState<string>('meta_whatsapp');
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Live Test OTP Simulator
  const [testMobile, setTestMobile] = useState<string>('7302797464');
  const [testProvider, setTestProvider] = useState<string>('meta_whatsapp');
  const [isSendingTestOtp, setIsSendingTestOtp] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const toggleShowToken = (key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
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
    setSaveSuccessMsg('SMS & OTP Gateway settings saved and synchronized successfully!');
    if (onSaveNotification) {
      onSaveNotification('SMS & OTP Gateway settings saved and synchronized.');
    }
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSendTestOtp = async () => {
    const cleanNumber = testMobile.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length !== 10) {
      setTestResult({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.',
      });
      return;
    }

    setIsSendingTestOtp(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/sms/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': 'Super Admin',
        },
        body: JSON.stringify({
          mobile: cleanNumber,
          providerId: testProvider,
          gatewayConfig: smsData.gateways.find((g) => g.id === testProvider),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `Test OTP dispatched to +91 ${cleanNumber} successfully!`,
          details: data.details || `Delivered via ${data.channel?.toUpperCase() || testProvider.toUpperCase()} gateway`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Failed to dispatch test OTP via this gateway.',
          details: data.error || 'Please verify API credentials, template ID, or balance.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Network request error while testing gateway.',
        details: err.message,
      });
    } finally {
      setIsSendingTestOtp(false);
    }
  };

  const currentGateway = smsData.gateways.find((g) => g.id === activeTabGateway) || smsData.gateways[0];

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. SAVE SUCCESS NOTIFICATION */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

      {/* 2. TOP BANNER & ACTION HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  SMS & OTP Service Integrations
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {smsData.enabled ? 'GATEWAYS ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage transactional OTP gateways for customer phone verification, admin 2FA security, and COD order verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Global Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Service Master Toggle
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sms-master-enabled"
                checked={smsData.enabled}
                onChange={(e) => handleUpdateGlobal('enabled', e.target.checked)}
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
              />
              <label htmlFor="sms-master-enabled" className="text-xs font-medium text-slate-700 cursor-pointer">
                {smsData.enabled ? 'Enabled (Active)' : 'Disabled'}
              </label>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Primary Active Provider
            </label>
            <select
              value={smsData.activeProviderId}
              onChange={(e) => handleSelectPrimary(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            >
              {smsData.gateways.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Auto-Fallback Provider
            </label>
            <select
              value={smsData.fallbackProviderId || ''}
              onChange={(e) => handleUpdateGlobal('fallbackProviderId', e.target.value || undefined)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value="">None (Single Gateway)</option>
              {smsData.gateways
                .filter((g) => g.id !== smsData.activeProviderId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              OTP Expiry Duration
            </label>
            <select
              value={smsData.otpExpiryMinutes}
              onChange={(e) => handleUpdateGlobal('otpExpiryMinutes', Number(e.target.value))}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes (Standard)</option>
              <option value={15}>15 Minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. GATEWAY SELECTION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {smsData.gateways.map((g) => {
          const isSelected = g.id === activeTabGateway;
          const isPrimary = g.id === smsData.activeProviderId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveTabGateway(g.id)}
              className={`px-3.5 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border-b-2 ${
                isSelected
                  ? 'border-slate-900 text-slate-900 bg-white shadow-2xs font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{g.provider === 'meta_whatsapp' ? 'Meta WhatsApp Cloud' : g.provider === 'twofactor' ? '2Factor.in SMS' : g.provider === 'fast2sms' ? 'Fast2SMS' : 'MSG91'}</span>
              {isPrimary && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-900 text-white uppercase">
                  Primary
                </span>
              )}
              {g.enabled && !isPrimary && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. ACTIVE GATEWAY CONFIGURATION FORM */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900">{currentGateway.name}</h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                currentGateway.enabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {currentGateway.enabled ? 'GATEWAY ENABLED' : 'GATEWAY DISABLED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentGateway.provider === 'meta_whatsapp' && 'Official WhatsApp Cloud API. 1,000 free conversations per month, instant delivery without DLT registration.'}
              {currentGateway.provider === 'twofactor' && 'Direct transactional SMS gateway for India. 14-18 paise per OTP with 98%+ delivery SLA.'}
              {currentGateway.provider === 'fast2sms' && 'Fast2SMS Bulk SMS & OTP Quick Route API.'}
              {currentGateway.provider === 'msg91' && 'MSG91 Enterprise SMS platform with DLT and multi-channel failover.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateGateway(currentGateway.id, { enabled: !currentGateway.enabled })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                currentGateway.enabled
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {currentGateway.enabled ? 'Disable Gateway' : 'Enable Gateway'}
            </button>
            {!currentGateway.isPrimary && (
              <button
                type="button"
                onClick={() => handleSelectPrimary(currentGateway.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition cursor-pointer"
              >
                Set as Primary
              </button>
            )}
          </div>
        </div>

        {/* PROVIDER-SPECIFIC FIELDS */}
        {currentGateway.provider === 'meta_whatsapp' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Recommended for REDMODE Store:</span> Meta provides 1,000 free service messages every month. Customer verification OTPs deliver directly on WhatsApp within 1 second.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Meta Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentGateway.phoneNumberId || ''}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { phoneNumberId: e.target.value })}
                  placeholder="e.g. 109845729104823"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">From Meta for Developers ➔ WhatsApp ➔ API Setup</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  value={currentGateway.wabaId || ''}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { wabaId: e.target.value })}
                  placeholder="e.g. 392019482910482"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Found in Meta Business Manager Settings</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Meta WhatsApp Cloud Access Token <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleShowToken('meta_token')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  {showTokens['meta_token'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showTokens['meta_token'] ? 'Hide Token' : 'Reveal Token'}</span>
                </button>
              </div>
              <input
                type={showTokens['meta_token'] ? 'text' : 'password'}
                value={currentGateway.accessToken || ''}
                onChange={(e) => handleUpdateGateway(currentGateway.id, { accessToken: e.target.value })}
                placeholder="EAAG9... Permanent System User Access Token"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Generate in Meta Business Settings ➔ System Users ➔ Assets (WhatsApp Account) ➔ Generate New Token.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Approved WhatsApp Template Name
                </label>
                <input
                  type="text"
                  value={currentGateway.templateName || ''}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { templateName: e.target.value })}
                  placeholder="e.g. redmode_otp_verification"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Language Code
                </label>
                <input
                  type="text"
                  value={currentGateway.languageCode || 'en_US'}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { languageCode: e.target.value })}
                  placeholder="en_US or hi"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {currentGateway.provider === 'twofactor' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">2Factor.in Integration:</span> High-speed transactional OTP gateway in India. Get your API Key instantly at{' '}
                <a href="https://2factor.in" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-0.5">
                  2factor.in <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    2Factor API Key <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleShowToken('twofactor_token')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showTokens['twofactor_token'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showTokens['twofactor_token'] ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showTokens['twofactor_token'] ? 'text' : 'password'}
                  value={currentGateway.apiKey || ''}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { apiKey: e.target.value })}
                  placeholder="e.g. 5b11234a-9876-11ec-b9b5-0200cd936042"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Approved Sender ID (Header)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={currentGateway.senderId || 'REDMOD'}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { senderId: e.target.value.toUpperCase() })}
                  placeholder="e.g. REDMOD"
                  className="w-full text-xs uppercase font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">6-character DLT Header</span>
              </div>
            </div>
          </div>
        )}

        {currentGateway.provider === 'fast2sms' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Fast2SMS Quick SMS Route:</span> Quick setup with wallet recharge at{' '}
                <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-0.5">
                  fast2sms.com <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Fast2SMS API Key (Authorization Key) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleShowToken('fast2sms_token')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  {showTokens['fast2sms_token'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showTokens['fast2sms_token'] ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showTokens['fast2sms_token'] ? 'text' : 'password'}
                value={currentGateway.apiKey || ''}
                onChange={(e) => handleUpdateGateway(currentGateway.id, { apiKey: e.target.value })}
                placeholder="Enter Fast2SMS API Key"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>
        )}

        {currentGateway.provider === 'msg91' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">MSG91 Enterprise Gateway:</span> Enterprise SMS platform. Requires TRAI DLT template registration.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  MSG91 AuthKey <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentGateway.apiKey || ''}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { apiKey: e.target.value })}
                  placeholder="e.g. 345678AbCdEfG"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sender ID (DLT Header)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={currentGateway.senderId || 'REDMOD'}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { senderId: e.target.value.toUpperCase() })}
                  placeholder="e.g. REDMOD"
                  className="w-full text-xs uppercase font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  DLT Template ID
                </label>
                <input
                  type="text"
                  value={currentGateway.templateId || ''}
                  onChange={(e) => handleUpdateGateway(currentGateway.id, { templateId: e.target.value })}
                  placeholder="e.g. 1207161728192837461"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Feature Checkboxes */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <label className="text-xs font-semibold text-slate-800 block">
            Trigger Rules & Automations for this Gateway:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={currentGateway.otpVerificationEnabled}
                onChange={(e) => handleUpdateGateway(currentGateway.id, { otpVerificationEnabled: e.target.checked })}
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-700 font-medium">Customer Login OTP</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={currentGateway.codVerificationEnabled}
                onChange={(e) => handleUpdateGateway(currentGateway.id, { codVerificationEnabled: e.target.checked })}
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-700 font-medium">COD Order Verification</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={currentGateway.orderUpdatesEnabled}
                onChange={(e) => handleUpdateGateway(currentGateway.id, { orderUpdatesEnabled: e.target.checked })}
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-700 font-medium">Order Dispatch Alerts</span>
            </label>
          </div>
        </div>
      </div>

      {/* 5. LIVE TEST OTP SENDER TOOL */}
      <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Send className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold">Live Gateway Tester & Simulator</h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            Real-Time Test
          </span>
        </div>
        <p className="text-xs text-slate-300">
          Send a real verification OTP to any phone number to test connectivity, delivery speed, and template formatting before taking the gateway live.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Select Gateway to Test
            </label>
            <select
              value={testProvider}
              onChange={(e) => setTestProvider(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {smsData.gateways.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Recipient Mobile Number (+91)
            </label>
            <input
              type="tel"
              value={testMobile}
              onChange={(e) => setTestMobile(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSendTestOtp}
              disabled={isSendingTestOtp}
              className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSendingTestOtp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test OTP</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-3.5 rounded-lg text-xs space-y-1 ${
              testResult.success
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.details && (
              <p className="text-[11px] opacity-80 pl-6">{testResult.details}</p>
            )}
          </div>
        )}
      </div>

      {/* 6. TRAI DLT & COMPLIANCE QUICK GUIDE */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <HelpCircle className="w-4 h-4 text-slate-600" />
          <span>India SMS & DLT Regulations Quick Tip</span>
        </div>
        <p className="leading-relaxed">
          TRAI regulations in India require all commercial SMS to be sent through registered DLT entities (Jio / Airtel / Vodafone).
          If you want to go live immediately without waiting for DLT approval, use the <strong>Meta WhatsApp Cloud OTP</strong> gateway which provides <strong>1,000 free OTP conversations per month</strong> and 1-second instant delivery directly to the customer&apos;s WhatsApp!
        </p>
      </div>
    </div>
  );
};
