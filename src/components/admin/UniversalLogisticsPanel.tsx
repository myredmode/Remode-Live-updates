import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Check,
  Copy,
  AlertTriangle,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ShippingChannelConfig } from '../../types';

interface UniversalLogisticsPanelProps {
  onSaveNotification?: (msg: string) => void;
}

interface ProviderMeta {
  provider: ShippingChannelConfig['provider'];
  label: string;
  defaultName: string;
  apiBaseUrl: string;
  trackingUrlTemplate: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiSecretLabel?: string;
  apiSecretPlaceholder?: string;
  clientIdLabel?: string;
  clientIdPlaceholder?: string;
}

const PROVIDER_METAS: Record<ShippingChannelConfig['provider'], ProviderMeta> = {
  delhivery: {
    provider: 'delhivery',
    label: 'Delhivery Direct B2C',
    defaultName: 'Delhivery Direct B2C',
    apiBaseUrl: 'https://track.delhivery.com',
    trackingUrlTemplate: 'https://www.delhivery.com/track/package/{{awb}}',
    apiKeyLabel: 'API Token',
    apiKeyPlaceholder: 'e.g. de52f7425345a44f9e6f89fc01e86d942554a302',
    clientIdLabel: 'Client Name',
    clientIdPlaceholder: 'e.g. Redmode',
  },
  amazon: {
    provider: 'amazon',
    label: 'Amazon Shipping (ATS)',
    defaultName: 'Amazon Shipping (ATS)',
    apiBaseUrl: 'https://sellingpartnerapi-eu.amazon.com',
    trackingUrlTemplate: 'https://track.amazon.in/tracking/{{awb}}',
    apiKeyLabel: 'LWA Client Secret / Access Token',
    apiKeyPlaceholder: 'e.g. amzn.sp.api.client_secret_...',
    apiSecretLabel: 'LWA Client ID / AWS Secret',
    apiSecretPlaceholder: 'e.g. amzn1.sp.solution....',
    clientIdLabel: 'Amazon Seller / Merchant ID',
    clientIdPlaceholder: 'e.g. A2XXXXXXXXXXXX',
  },
  shiprocket: {
    provider: 'shiprocket',
    label: 'Shiprocket Multi-Carrier',
    defaultName: 'Shiprocket Multi-Carrier',
    apiBaseUrl: 'https://apiv2.shiprocket.in/v1/external',
    trackingUrlTemplate: 'https://shiprocket.co/tracking/{{awb}}',
    apiKeyLabel: 'API Token / JWT',
    apiKeyPlaceholder: 'e.g. eyJhbGciOi...',
    apiSecretLabel: 'Account Password / Secret (Optional)',
    apiSecretPlaceholder: 'Account API password if required',
    clientIdLabel: 'Registered Email ID',
    clientIdPlaceholder: 'e.g. logistics@redmode.in',
  },
  bluedart: {
    provider: 'bluedart',
    label: 'Blue Dart Apex Express',
    defaultName: 'Blue Dart Apex Express',
    apiBaseUrl: 'https://apigateway.bluedart.com/in/transportation',
    trackingUrlTemplate: 'https://www.bluedart.com/tracking?handler=trak&action=custtracking&track=awb&numbers={{awb}}',
    apiKeyLabel: 'Customer License Key',
    apiKeyPlaceholder: 'e.g. BD-LIC-XXXXXXXX',
    apiSecretLabel: 'API Secret / Passkey',
    apiSecretPlaceholder: 'Blue Dart security key',
    clientIdLabel: 'Customer / Account Code',
    clientIdPlaceholder: 'e.g. 520148',
  },
  dtdc: {
    provider: 'dtdc',
    label: 'DTDC Direct Courier',
    defaultName: 'DTDC Direct Courier',
    apiBaseUrl: 'https://smartcon.dtdc.com/ctsv/services',
    trackingUrlTemplate: 'https://www.dtdc.in/tracking/tracking_results.asp?trkid={{awb}}',
    apiKeyLabel: 'API Key / Access Token',
    apiKeyPlaceholder: 'e.g. DTDC_API_KEY_XXXXX',
    clientIdLabel: 'Customer Code',
    clientIdPlaceholder: 'e.g. CUST_MEERUT_01',
  },
  xpressbees: {
    provider: 'xpressbees',
    label: 'Xpressbees Logistics',
    defaultName: 'Xpressbees Logistics',
    apiBaseUrl: 'https://shipment.xpressbees.com/api',
    trackingUrlTemplate: 'https://www.xpressbees.com/track?awb={{awb}}',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'e.g. xb_key_xxxxxxxx',
    clientIdLabel: 'Account ID',
    clientIdPlaceholder: 'e.g. XB_REDMODE',
  },
  shadowfax: {
    provider: 'shadowfax',
    label: 'Shadowfax Express',
    defaultName: 'Shadowfax Express',
    apiBaseUrl: 'https://api.shadowfax.in',
    trackingUrlTemplate: 'https://tracker.shadowfax.in/{{awb}}',
    apiKeyLabel: 'Authorization Key',
    apiKeyPlaceholder: 'e.g. Token token="xxxxxxxxx"',
    clientIdLabel: 'Store ID',
    clientIdPlaceholder: 'e.g. SF_STORE_250002',
  },
  custom: {
    provider: 'custom',
    label: 'Custom Courier API',
    defaultName: 'Custom Courier API',
    apiBaseUrl: 'https://api.yourcourier.com/v1',
    trackingUrlTemplate: 'https://yourcourier.com/track/{{awb}}',
    apiKeyLabel: 'API Key / Secret Token',
    apiKeyPlaceholder: 'Enter custom courier API key or token',
    apiSecretLabel: 'Secondary Secret Key (Optional)',
    apiSecretPlaceholder: 'Enter secondary API secret if required',
    clientIdLabel: 'Client ID / Account Code (Optional)',
    clientIdPlaceholder: 'e.g. ACCOUNT_123',
  },
};

export const UniversalLogisticsPanel: React.FC<UniversalLogisticsPanelProps> = ({
  onSaveNotification,
}) => {
  const { settings, updateShippingChannels, currentAdminUser } = useStore();

  // Load channels from settings or provide defaults
  const [channels, setChannels] = useState<ShippingChannelConfig[]>(() => {
    if (settings.shippingChannels && settings.shippingChannels.length > 0) {
      return settings.shippingChannels;
    }
    return [
      {
        id: 'delhivery',
        name: 'Delhivery Direct B2C',
        provider: 'delhivery',
        enabled: true,
        isPrimary: true,
        apiKey: settings.delhiverySettings?.apiToken || 'de52f7425345a44f9e6f89fc01e86d942554a302',
        clientId: settings.delhiverySettings?.clientName || 'Redmode',
        warehouseName: settings.delhiverySettings?.warehouseName || 'REDMODE B2C',
        pickupPincode: settings.delhiverySettings?.pickupPincode || '250002',
        pickupAddress: settings.delhiverySettings?.pickupAddress || '1807 , ZAKIR HUSSAIN COLONY MEERUT NEAR MADINA MASJID , Meerut, Uttar Pradesh ,India 250002',
        pickupPhone: settings.delhiverySettings?.pickupPhone || '7302797464',
        environment: settings.delhiverySettings?.environment || 'production',
        shippingMode: settings.delhiverySettings?.defaultShippingMode || 'Surface',
        apiBaseUrl: 'https://track.delhivery.com',
        trackingUrlTemplate: 'https://www.delhivery.com/track/package/{{awb}}',
        codRemittanceCycle: settings.delhiverySettings?.codRemittanceCycle || 'T+2',
      },
    ];
  });

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    return settings.activeShippingChannelId || 'delhivery';
  });

  const [selectedChannelId, setSelectedChannelId] = useState<string>(() => {
    return settings.activeShippingChannelId || 'delhivery';
  });

  // UI States
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showApiSecret, setShowApiSecret] = useState<boolean>(false);
  const [isAddCourierOpen, setIsAddCourierOpen] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState<boolean>(false);

  // Modals for Delete
  const [channelToDelete, setChannelToDelete] = useState<ShippingChannelConfig | null>(null);
  const [activeDeleteBlockedCourier, setActiveDeleteBlockedCourier] = useState<ShippingChannelConfig | null>(null);

  // Sync state if settings change externally
  useEffect(() => {
    if (settings.shippingChannels && settings.shippingChannels.length > 0) {
      setChannels(settings.shippingChannels);
    }
    if (settings.activeShippingChannelId) {
      setActiveChannelId(settings.activeShippingChannelId);
    }
  }, [settings.shippingChannels, settings.activeShippingChannelId]);

  // Ensure selected channel exists
  const currentChannel = channels.find((c) => c.id === selectedChannelId) || channels[0] || null;

  // Field change handler
  const handleFieldChange = (field: keyof ShippingChannelConfig, value: any) => {
    if (!currentChannel) return;
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id === currentChannel.id) {
          return { ...ch, [field]: value };
        }
        return ch;
      })
    );
  };

  // Switch active courier
  const handleMakeActive = (channelId: string) => {
    setActiveChannelId(channelId);
    const updatedChannels = channels.map((ch) => ({
      ...ch,
      isPrimary: ch.id === channelId,
      enabled: ch.id === channelId ? true : ch.enabled,
    }));
    setChannels(updatedChannels);
    const target = updatedChannels.find((c) => c.id === channelId);
    updateShippingChannels(updatedChannels, channelId);

    setNotification({
      type: 'success',
      text: `"${target?.name || channelId}" is now the active courier for all new orders.`,
    });
    if (onSaveNotification) {
      onSaveNotification(`Active courier: ${target?.name}`);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Add a new courier partner
  const handleSelectNewProvider = (providerKey: ShippingChannelConfig['provider']) => {
    const meta = PROVIDER_METAS[providerKey] || PROVIDER_METAS.custom;
    const newId = `${providerKey}_${Date.now()}`;
    const newChannel: ShippingChannelConfig = {
      id: newId,
      name: meta.defaultName,
      provider: providerKey,
      enabled: false,
      isPrimary: false,
      apiKey: '',
      apiSecret: '',
      clientId: '',
      warehouseName: 'REDMODE B2C Hub',
      pickupPincode: '250002',
      pickupAddress: '1807 , ZAKIR HUSSAIN COLONY MEERUT NEAR MADINA MASJID , Meerut, Uttar Pradesh ,India 250002',
      pickupPhone: '7302797464',
      environment: 'production',
      shippingMode: 'Surface',
      apiBaseUrl: meta.apiBaseUrl,
      trackingUrlTemplate: meta.trackingUrlTemplate,
      codRemittanceCycle: 'T+2',
      authType: 'Bearer',
      awbEndpoint: '',
      shipmentEndpoint: '',
      customHeaders: '',
    };

    const updated = [...channels, newChannel];
    setChannels(updated);
    setSelectedChannelId(newId);
    setIsAddCourierOpen(false);

    // Save persistently
    updateShippingChannels(updated, activeChannelId);

    setNotification({
      type: 'info',
      text: `Added "${newChannel.name}". Enter your credentials below and click "Save Changes".`,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Delete initiated by user
  const handleDeleteClick = (channel: ShippingChannelConfig) => {
    // If the courier is active, block deletion and instruct to switch first
    if (channel.id === activeChannelId) {
      setActiveDeleteBlockedCourier(channel);
      return;
    }

    // Otherwise, show confirmation modal
    setChannelToDelete(channel);
  };

  // Confirm delete handler (REAL persistence)
  const handleConfirmDelete = () => {
    if (!channelToDelete) return;

    const remaining = channels.filter((c) => c.id !== channelToDelete.id);

    // If the currently selected editing channel was deleted, select active channel
    if (selectedChannelId === channelToDelete.id) {
      setSelectedChannelId(activeChannelId);
    }

    setChannels(remaining);

    // Persist to StoreContext & localStorage
    updateShippingChannels(remaining, activeChannelId);

    const deletedName = channelToDelete.name;
    setChannelToDelete(null);

    setNotification({
      type: 'success',
      text: `Courier "${deletedName}" was deleted successfully.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Save changes
  const handleSaveChanges = () => {
    const updatedChannels = channels.map((ch) => ({
      ...ch,
      isPrimary: ch.id === activeChannelId,
    }));
    updateShippingChannels(updatedChannels, activeChannelId);

    setNotification({
      type: 'success',
      text: 'Courier settings saved successfully.',
    });
    if (onSaveNotification) {
      onSaveNotification('Courier settings saved successfully.');
    }
    setTimeout(() => setNotification(null), 3500);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!currentChannel) return;
    if (!currentChannel.apiKey || !currentChannel.apiKey.trim()) {
      setTestResult({
        success: false,
        message: `Please enter a valid ${currentMeta.apiKeyLabel || 'API Token'} before testing the connection.`,
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/shipping/test-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': currentAdminUser.role || 'Super Admin',
        },
        body: JSON.stringify({
          provider: currentChannel.provider,
          name: currentChannel.name,
          apiKey: currentChannel.apiKey.trim(),
          apiSecret: (currentChannel.apiSecret || '').trim(),
          clientId: (currentChannel.clientId || '').trim(),
          warehouseName: (currentChannel.warehouseName || 'REDMODE B2C').trim(),
          environment: currentChannel.environment || 'production',
          apiBaseUrl: (currentChannel.apiBaseUrl || currentMeta.apiBaseUrl || '').trim(),
          pincode: (currentChannel.pickupPincode || '250002').trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      setIsTesting(false);

      if (res.ok && data && data.success) {
        setTestResult({
          success: true,
          message:
            data.message ||
            `Connected to ${currentChannel.name} (${currentChannel.environment === 'staging' ? 'Staging' : 'Production'}) successfully!`,
        });
      } else {
        setTestResult({
          success: false,
          message:
            data?.message ||
            `Connection test failed (HTTP ${res.status}) for ${currentChannel.name}. Please verify your API Token, Client Name, and Pickup Pincode.`,
        });
      }
    } catch (err: any) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: `Network error while testing connection to ${currentChannel.name}: ${err?.message || 'Unable to reach server'}.`,
      });
    }
  };

  // Copy webhook URL
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/shipping/webhook`
    : '/api/shipping/webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const currentMeta = currentChannel
    ? PROVIDER_METAS[currentChannel.provider] || PROVIDER_METAS.custom
    : PROVIDER_METAS.delhivery;

  // Lock background body scroll when modals open
  useEffect(() => {
    if (isAddCourierOpen || channelToDelete || activeDeleteBlockedCourier) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isAddCourierOpen, channelToDelete, activeDeleteBlockedCourier]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddCourierOpen(false);
        setChannelToDelete(null);
        setActiveDeleteBlockedCourier(null);
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

      {/* 2. COURIER CHANNELS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Courier Channels</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add and manage your shipping partners. Only one courier can be active for new orders.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddCourierOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Courier</span>
          </button>
        </div>

        {/* Compact Courier Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((ch) => {
            const isActive = ch.id === activeChannelId;
            const isSelected = ch.id === selectedChannelId;
            const isConfigured = Boolean(ch.apiKey && ch.apiKey.trim().length > 0);

            return (
              <div
                key={ch.id}
                onClick={() => setSelectedChannelId(ch.id)}
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
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{ch.name}</h4>
                        <p className="text-[11px] text-slate-400 capitalize">{ch.provider}</p>
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
                          handleMakeActive(ch.id);
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
                        setSelectedChannelId(ch.id);
                      }}
                      className="text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(ch);
                    }}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                    title="Delete Courier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COURIER CONFIGURATION SECTION */}
      {currentChannel && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-slate-900">{currentChannel.name}</h3>
              {currentChannel.id === activeChannelId ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-100">
                  INACTIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-1.5 border border-slate-300 hover:border-slate-900 bg-white text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'Testing Connection...' : 'Test Connection'}
              </button>
              {currentChannel.id !== activeChannelId && (
                <button
                  type="button"
                  onClick={() => handleMakeActive(currentChannel.id)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Make Active
                </button>
              )}
            </div>
          </div>

          {/* Test connection feedback (Top) */}
          {isTesting && (
            <div className="p-3 rounded-lg text-xs bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping shrink-0" />
              <span>Connecting to {currentChannel.name} API server and verifying credentials...</span>
            </div>
          )}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-start justify-between gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium'
                  : 'bg-rose-50 text-rose-900 border border-rose-200 font-medium'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer shrink-0"
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
                    Courier / Channel Display Name
                  </label>
                  <input
                    type="text"
                    value={currentChannel.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={currentChannel.apiBaseUrl || currentMeta.apiBaseUrl}
                    onChange={(e) => handleFieldChange('apiBaseUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {currentMeta.apiKeyLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={currentChannel.apiKey}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      placeholder={currentMeta.apiKeyPlaceholder}
                      className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {currentMeta.clientIdLabel && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {currentMeta.clientIdLabel}
                    </label>
                    <input
                      type="text"
                      value={currentChannel.clientId || ''}
                      onChange={(e) => handleFieldChange('clientId', e.target.value)}
                      placeholder={currentMeta.clientIdPlaceholder}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>
                )}

                {currentMeta.apiSecretLabel && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {currentMeta.apiSecretLabel}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiSecret ? 'text' : 'password'}
                        value={currentChannel.apiSecret || ''}
                        onChange={(e) => handleFieldChange('apiSecret', e.target.value)}
                        placeholder={currentMeta.apiSecretPlaceholder}
                        className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiSecret(!showApiSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showApiSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Courier Extra Fields */}
                {currentChannel.provider === 'custom' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Authentication Type
                      </label>
                      <select
                        value={currentChannel.authType || 'Bearer'}
                        onChange={(e) => handleFieldChange('authType', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                      >
                        <option value="Bearer">Bearer Token (Authorization: Bearer ...)</option>
                        <option value="ApiKeyHeader">API Key Header (x-api-key)</option>
                        <option value="BasicAuth">Basic Auth</option>
                        <option value="Custom">Custom Headers Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        AWB Generation Endpoint (Optional)
                      </label>
                      <input
                        type="text"
                        value={currentChannel.awbEndpoint || ''}
                        onChange={(e) => handleFieldChange('awbEndpoint', e.target.value)}
                        placeholder="/api/v1/generate-awb"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Shipment Creation Endpoint (Optional)
                      </label>
                      <input
                        type="text"
                        value={currentChannel.shipmentEndpoint || ''}
                        onChange={(e) => handleFieldChange('shipmentEndpoint', e.target.value)}
                        placeholder="/api/v1/shipments/create"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Custom Headers (JSON)
                      </label>
                      <input
                        type="text"
                        value={currentChannel.customHeaders || ''}
                        onChange={(e) => handleFieldChange('customHeaders', e.target.value)}
                        placeholder='{"X-Merchant-Id": "123"}'
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Group 2: Tracking */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tracking
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tracking URL Template
                </label>
                <input
                  type="text"
                  value={currentChannel.trackingUrlTemplate || currentMeta.trackingUrlTemplate}
                  onChange={(e) => handleFieldChange('trackingUrlTemplate', e.target.value)}
                  placeholder="https://.../track/{{awb}}"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Use {'{{awb}}'} as the placeholder for the airway bill number.
                </p>
              </div>
            </div>

            {/* Group 3: Pickup / Warehouse */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pickup / Warehouse
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Warehouse Hub Name
                  </label>
                  <input
                    type="text"
                    value={currentChannel.warehouseName || 'REDMODE B2C'}
                    onChange={(e) => handleFieldChange('warehouseName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pickup Pincode
                  </label>
                  <input
                    type="text"
                    value={currentChannel.pickupPincode || '250002'}
                    onChange={(e) => handleFieldChange('pickupPincode', e.target.value)}
                    maxLength={6}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rider Contact Phone
                  </label>
                  <input
                    type="text"
                    value={currentChannel.pickupPhone || '7302797464'}
                    onChange={(e) => handleFieldChange('pickupPhone', e.target.value)}
                    maxLength={10}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Warehouse Address
                  </label>
                  <input
                    type="text"
                    value={
                      currentChannel.pickupAddress ||
                      '1807 , ZAKIR HUSSAIN COLONY MEERUT NEAR MADINA MASJID , Meerut, Uttar Pradesh ,India 250002'
                    }
                    onChange={(e) => handleFieldChange('pickupAddress', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  />
                </div>
              </div>
            </div>

            {/* Group 4: Shipping Preferences */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Shipping
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Default Shipping Service
                  </label>
                  <select
                    value={currentChannel.shippingMode || 'Surface'}
                    onChange={(e) => handleFieldChange('shippingMode', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  >
                    <option value="Surface">Surface Logistics (Economical)</option>
                    <option value="Express">Express Air (Priority 24-48h)</option>
                    <option value="Standard">Standard Courier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    API Environment
                  </label>
                  <select
                    value={currentChannel.environment || 'production'}
                    onChange={(e) => handleFieldChange('environment', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  >
                    <option value="production">Live Production</option>
                    <option value="staging">Sandbox / Staging</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    COD Remittance Cycle
                  </label>
                  <select
                    value={currentChannel.codRemittanceCycle || 'T+2'}
                    onChange={(e) => handleFieldChange('codRemittanceCycle', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  >
                    <option value="T+2">T+2 Daily Remittance</option>
                    <option value="Weekly">Weekly Friday Remittance</option>
                    <option value="Bi-Weekly">Bi-Weekly Remittance</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Test connection feedback (Bottom, right above the Test Connection button) */}
          {isTesting && (
            <div className="p-3 rounded-lg text-xs bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping shrink-0" />
              <span>Connecting to {currentChannel.name} API server and verifying credentials...</span>
            </div>
          )}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-start justify-between gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium'
                  : 'bg-rose-50 text-rose-900 border border-rose-200 font-medium'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 border border-slate-300 hover:border-slate-900 bg-white text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'Testing Connection...' : 'Test Connection'}
              </button>

              {currentChannel.id !== activeChannelId && channels.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteClick(currentChannel)}
                  className="px-3 py-2 text-rose-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer"
                >
                  Delete Courier
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

      {/* 5. WEBHOOK COMPACT SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
        <h4 className="text-sm font-semibold text-slate-900">Webhook Endpoint</h4>
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
          Use this webhook in your courier partner dashboard to receive shipment status updates.
        </p>
      </div>

      {/* MODAL 1: ADD COURIER PARTNER */}
      {isAddCourierOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddCourierOpen(false);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Add Courier Partner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a courier provider to configure credentials and activate for order bookings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCourierOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(PROVIDER_METAS) as ShippingChannelConfig['provider'][]).map((prov) => {
                  const meta = PROVIDER_METAS[prov];
                  return (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => handleSelectNewProvider(prov)}
                      className="p-3 text-left border border-slate-200 hover:border-slate-900 hover:bg-slate-50/70 rounded-xl transition cursor-pointer flex items-center gap-2.5"
                    >
                      <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-slate-900">{meta.label}</h5>
                        <p className="text-[10px] text-slate-400">Standard API</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 border-t border-slate-100 px-5 py-3 bg-slate-50/95 backdrop-blur-xs flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAddCourierOpen(false)}
                className="px-4 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE MODAL */}
      {channelToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChannelToDelete(null);
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
                  <h3 className="text-sm font-semibold text-slate-900">Delete courier integration?</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This will remove the saved credentials and configuration for <strong>{channelToDelete.name}</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChannelToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChannelToDelete(null)}
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

      {/* MODAL 3: CANNOT DELETE ACTIVE COURIER MODAL */}
      {activeDeleteBlockedCourier && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveDeleteBlockedCourier(null);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-sm w-full max-h-[85vh] flex flex-col p-5 border border-slate-200 shadow-2xl space-y-4 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Cannot Delete Active Courier</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    You cannot delete the active courier. Activate another courier first.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDeleteBlockedCourier(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveDeleteBlockedCourier(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-black text-white rounded-xl transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
