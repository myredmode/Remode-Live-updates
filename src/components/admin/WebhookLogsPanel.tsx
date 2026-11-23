import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  source: 'Delhivery' | 'PayPal' | 'Razorpay' | 'WhatsApp';
  endpoint: string;
  eventType: string;
  referenceId: string;
  httpStatus: number;
  verified: boolean;
  isTest?: boolean;
  summary: string;
  headersSummary?: Record<string, string>;
  payload: any;
}

type SourceFilter = 'All' | 'WhatsApp' | 'Delhivery' | 'PayPal' | 'Razorpay';

interface WebhookLogsPanelProps {
  onSaveNotification?: (msg: string) => void;
}

export const WebhookLogsPanel: React.FC<WebhookLogsPanelProps> = ({ onSaveNotification }) => {
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simulatingSource, setSimulatingSource] = useState<'Delhivery' | 'PayPal' | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<'delhivery' | 'paypal' | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const delhiveryWebhookUrl = `${origin}/api/shipping/webhook`;
  const paypalWebhookUrl = `${origin}/api/payment/webhook`;

  const getAuthHeaders = (): Record<string, string> => {
    const token =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/webhook-logs', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setErrorBanner(null);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else if (!silent) {
        setErrorBanner(data?.message || `Unable to load webhook logs (HTTP ${res.status}).`);
      }
    } catch (err: any) {
      if (!silent) {
        setErrorBanner(err?.message || 'Network error loading webhook logs.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const handleCopyUrl = (type: 'delhivery' | 'paypal', url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedEndpoint(type);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const handleSimulateTest = async (source: 'Delhivery' | 'PayPal') => {
    setSimulatingSource(source);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/webhook-logs/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ source }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        await fetchLogs(true);
        if (data.log?.id) setExpandedId(data.log.id);
        if (onSaveNotification) {
          onSaveNotification(`Simulated ${source} webhook event recorded (${data.log?.referenceId || 'OK'}).`);
        }
      } else {
        setErrorBanner(data?.message || `Failed to simulate ${source} webhook.`);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Network error simulating test webhook.');
    } finally {
      setSimulatingSource(null);
    }
  };

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/admin/webhook-logs', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setLogs([]);
        setExpandedId(null);
        setConfirmClear(false);
        if (onSaveNotification) {
          onSaveNotification('Webhook debug logs cleared.');
        }
      } else {
        setErrorBanner(data?.message || 'Failed to clear logs.');
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Network error clearing logs.');
    } finally {
      setClearing(false);
    }
  };

  const filteredLogs = logs.filter((entry) =>
    sourceFilter === 'All' ? true : entry.source === sourceFilter
  );

  const counts = {
    All: logs.length,
    WhatsApp: logs.filter((l) => l.source === 'WhatsApp').length,
    Delhivery: logs.filter((l) => l.source === 'Delhivery').length,
    PayPal: logs.filter((l) => l.source === 'PayPal').length,
    Razorpay: logs.filter((l) => l.source === 'Razorpay').length,
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Error Feedback */}
      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. LIVE WEBHOOK ENDPOINTS FOR QUICK COPY */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Active Webhook Endpoints</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste these URLs into Delhivery One and PayPal Developer Dashboard to verify incoming callbacks here in real time.
            </p>
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 font-mono">
              Synced: {lastUpdated}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Delhivery Tracking Webhook
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={delhiveryWebhookUrl}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={() => handleCopyUrl('delhivery', delhiveryWebhookUrl)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-medium rounded transition cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                {copiedEndpoint === 'delhivery' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedEndpoint === 'delhivery' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              PayPal Payment Webhook
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={paypalWebhookUrl}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={() => handleCopyUrl('paypal', paypalWebhookUrl)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-medium rounded transition cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                {copiedEndpoint === 'paypal' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedEndpoint === 'paypal' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS & FILTER BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Source Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'WhatsApp', 'Delhivery', 'PayPal', 'Razorpay'] as SourceFilter[]).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sourceFilter === src
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {src} ({counts[src]})
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-slate-900"
              />
              <span>Auto-refresh (5s)</span>
            </label>

            <button
              type="button"
              onClick={() => fetchLogs(false)}
              disabled={loading}
              className="px-3 py-1.5 border border-slate-300 hover:border-slate-900 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateTest('Delhivery')}
              disabled={simulatingSource !== null}
              className="px-3 py-1.5 border border-slate-300 hover:border-slate-900 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{simulatingSource === 'Delhivery' ? 'Sending...' : 'Test Delhivery'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateTest('PayPal')}
              disabled={simulatingSource !== null}
              className="px-3 py-1.5 border border-slate-300 hover:border-slate-900 bg-white text-slate-800 text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{simulatingSource === 'PayPal' ? 'Sending...' : 'Test PayPal'}</span>
            </button>

            {logs.length > 0 && (
              confirmClear ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    disabled={clearing}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    {clearing ? 'Clearing...' : 'Confirm Clear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* 3. LOG ENTRIES LIST */}
        {loading && logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading recent webhook events...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center space-y-2">
            <Activity className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              No {sourceFilter === 'All' ? '' : `${sourceFilter} `}webhook events recorded yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
              Send a test event from your PayPal Developer Dashboard or Delhivery One webhook settings, or click <strong>Test Delhivery</strong> / <strong>Test PayPal</strong> above to verify your endpoint right now.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLogs.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const isOk = entry.httpStatus >= 200 && entry.httpStatus < 300;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:border-slate-300"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      {isOk ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              entry.source === 'WhatsApp'
                                ? 'bg-emerald-600 text-white'
                                : entry.source === 'Delhivery'
                                ? 'bg-slate-900 text-white'
                                : entry.source === 'PayPal'
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                : 'bg-sky-50 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {entry.source}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 font-mono">
                            {entry.eventType}
                          </span>
                          {entry.referenceId && (
                            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              Ref: {entry.referenceId}
                            </span>
                          )}
                          {entry.isTest && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Simulated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">{entry.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isOk
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        HTTP {entry.httpStatus} {entry.verified ? '• Verified' : '• Unverified'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-3.5 space-y-3 text-[11px]">
                      <div className="flex flex-wrap items-center gap-4 text-slate-600">
                        <span>
                          <strong>Endpoint:</strong> <code className="font-mono">{entry.endpoint}</code>
                        </span>
                        <span>
                          <strong>Timestamp:</strong> <code className="font-mono">{entry.timestamp}</code>
                        </span>
                      </div>

                      {entry.headersSummary && Object.keys(entry.headersSummary).length > 0 && (
                        <div>
                          <div className="font-semibold text-slate-700 mb-1">Request Headers (Sanitized)</div>
                          <pre className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700 overflow-x-auto">
                            {JSON.stringify(entry.headersSummary, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div>
                        <div className="font-semibold text-slate-700 mb-1">Incoming JSON Payload</div>
                        <pre className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto max-h-72">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
