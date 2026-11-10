import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Truck,
  Tag,
  Printer,
  FileCheck,
  CheckCircle2,
  Clock,
  User,
  Layers,
  Download,
  Calendar,
  X,
} from 'lucide-react';
import { AdminActivityLog, AdminRole } from '../../types';
import {
  getAdminActivities,
  getActivitiesForRole,
  subscribeToActivities,
  formatActivityTime,
  exportActivitiesToCSV,
} from '../../utils/activityLogger';

interface StaffActivityMonitorProps {
  mode?: 'role_dashboard' | 'super_admin' | 'compact';
  targetRole?: AdminRole;
  title?: string;
  className?: string;
}

export const StaffActivityMonitor: React.FC<StaffActivityMonitorProps> = ({
  mode = 'role_dashboard',
  targetRole,
  title,
  className = '',
}) => {
  const [allLogs, setAllLogs] = useState<AdminActivityLog[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'Label Admin' | 'Listing + Label Admin'>(
    targetRole === 'Label Admin' ? 'Label Admin' : targetRole === 'Listing + Label Admin' ? 'Listing + Label Admin' : 'all'
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dedicated Date Range Activity Export Modal State
  const [isActivityDateModalOpen, setIsActivityDateModalOpen] = useState(false);
  const [activityDatePreset, setActivityDatePreset] = useState<
    'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'
  >('7days');
  const [activityCustomStart, setActivityCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [activityCustomEnd, setActivityCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [activityExportRole, setActivityExportRole] = useState<'all' | 'Label Admin' | 'Listing + Label Admin'>('all');

  // Lock background scroll when date export modal is open
  useEffect(() => {
    if (isActivityDateModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsActivityDateModalOpen(false);
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isActivityDateModalOpen]);

  useEffect(() => {
    // Initial load
    setAllLogs(getAdminActivities());

    // Subscribe to live activity events
    const unsubscribe = subscribeToActivities((updated) => {
      setAllLogs(updated);
    });

    return unsubscribe;
  }, []);

  const handleExportCSV = (role?: AdminRole | 'all') => {
    const res = exportActivitiesToCSV(role);
    const targetLabel =
      role === 'Label Admin'
        ? 'Label Admin'
        : role === 'Listing + Label Admin'
        ? 'Listing + Label Admin'
        : 'All Staff';
    setToastMsg(`Exported ${res.count} activity log(s) for ${targetLabel} to CSV successfully!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Compute matching activities for the Date Export Modal
  const matchingActivitiesForExport = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return allLogs.filter((l) => {
      // Role filter
      if (activityExportRole !== 'all' && l.role !== activityExportRole) {
        return false;
      }

      const t = new Date(l.timestamp).getTime();
      if (isNaN(t)) return false;

      switch (activityDatePreset) {
        case 'today':
          return t >= startOfToday;
        case 'yesterday':
          return t >= startOfToday - oneDayMs && t < startOfToday;
        case '7days':
          return t >= startOfToday - 7 * oneDayMs;
        case '30days':
          return t >= startOfToday - 30 * oneDayMs;
        case 'custom': {
          if (activityCustomStart) {
            const startT = new Date(activityCustomStart).setHours(0, 0, 0, 0);
            if (t < startT) return false;
          }
          if (activityCustomEnd) {
            const endT = new Date(activityCustomEnd).setHours(23, 59, 59, 999);
            if (t > endT) return false;
          }
          return true;
        }
        default:
          return true;
      }
    });
  }, [allLogs, activityExportRole, activityDatePreset, activityCustomStart, activityCustomEnd]);

  const handleExecuteActivityDateExport = () => {
    if (matchingActivitiesForExport.length === 0) {
      setToastMsg('No activity logs found for the selected date range.');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }
    const res = exportActivitiesToCSV(activityExportRole, {
      preset: activityDatePreset,
      startDate: activityCustomStart,
      endDate: activityCustomEnd,
    });
    setToastMsg(`Exported ${res.count} activity log(s) (${activityDatePreset}) to CSV!`);
    setTimeout(() => setToastMsg(null), 4000);
    setIsActivityDateModalOpen(false);
  };

  // Filter logs for the top 5 monitor view
  const getFilteredLogs = (): AdminActivityLog[] => {
    if (mode === 'role_dashboard' && targetRole) {
      return getActivitiesForRole(targetRole, 5);
    }
    if (selectedRoleFilter === 'all') {
      return allLogs
        .filter((l) => l.role === 'Label Admin' || l.role === 'Listing + Label Admin')
        .slice(0, 5);
    }
    return getActivitiesForRole(selectedRoleFilter, 5);
  };

  const displayedLogs = getFilteredLogs();
  const labelAdminLogs = allLogs.filter((l) => l.role === 'Label Admin').slice(0, 5);
  const listingAdminLogs = allLogs.filter((l) => l.role === 'Listing + Label Admin').slice(0, 5);

  const getActionIcon = (type: AdminActivityLog['type']) => {
    switch (type) {
      case 'awb_generation':
        return <Truck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'label_print':
        return <Printer className="w-3.5 h-3.5 text-indigo-600" />;
      case 'manifest_download':
        return <FileCheck className="w-3.5 h-3.5 text-amber-600" />;
      case 'order_status':
        return <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />;
      case 'product_create':
      case 'product_update':
        return <Tag className="w-3.5 h-3.5 text-blue-600" />;
      case 'inventory_update':
        return <Layers className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getActionTypeBadge = (type: AdminActivityLog['type']) => {
    switch (type) {
      case 'awb_generation':
        return { text: 'AWB', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'label_print':
        return { text: 'LABEL', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'manifest_download':
        return { text: 'MANIFEST', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'order_status':
        return { text: 'STATUS', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'product_create':
        return { text: 'CATALOG', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'product_update':
        return { text: 'LISTING', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'inventory_update':
        return { text: 'STOCK', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { text: 'ACTION', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // =========================================================================
  // VIEW 1: SUPER ADMIN TEAM PERFORMANCE TRACKER
  // =========================================================================
  if (mode === 'super_admin') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Toast Feedback */}
        {toastMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Panel Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          {/* Header with live indicator, role filters, and export buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-red-500 border border-slate-800 flex items-center justify-center font-bold shadow-xs shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {title || 'Staff Roles Live Activity Tracker'}
                  </h3>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Auditing
                  </span>
                </div>

              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    selectedRoleFilter === 'all'
                      ? 'bg-white text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Staff
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('Label Admin')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRoleFilter === 'Label Admin'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-800 hover:text-emerald-950'
                  }`}
                >
                  <Truck className="w-3 h-3" />
                  <span>Label Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('Listing + Label Admin')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRoleFilter === 'Listing + Label Admin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>Listing + Label Admin</span>
                </button>
              </div>

              {/* Export Activity CSV Button for Active Filter */}
              <button
                type="button"
                onClick={() => handleExportCSV(selectedRoleFilter)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title={`Export ${selectedRoleFilter === 'all' ? 'All Staff' : selectedRoleFilter} Activity Logs to CSV`}
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export {selectedRoleFilter === 'all' ? 'All Staff' : selectedRoleFilter} CSV</span>
              </button>

              {/* Dedicated Export by Date Button */}
              <button
                type="button"
                onClick={() => {
                  setActivityExportRole(selectedRoleFilter);
                  setIsActivityDateModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title="Export staff activity CSV filtered by specific date range"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export by Date</span>
              </button>
            </div>
          </div>

          {/* Dual Side-by-Side Cards (When 'all' is selected) or Detailed List */}
          {selectedRoleFilter === 'all' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* 1. Label Admin Column */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Label Admin
                        </h4>
                        <p className="text-[10px] text-emerald-700">Orders, AWBs &amp; 4x6 Dispatch Labels</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Last 5 Actions
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExportCSV('Label Admin')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Export Label Admin Activity to CSV"
                      >
                        <Download className="w-3 h-3 text-emerald-700" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-emerald-100/60 mt-2">
                    {labelAdminLogs.map((log) => {
                      const badge = getActionTypeBadge(log.type);
                      return (
                        <div key={log.id} className="py-2.5 flex items-start gap-2.5">
                          <div className="mt-0.5 p-1 rounded-md bg-white border border-emerald-200/80 shrink-0">
                            {getActionIcon(log.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 leading-snug break-words">
                              {log.action}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                              <span className={`px-1.5 py-0.2 rounded font-black uppercase text-[9px] border ${badge.bg}`}>
                                {badge.text}
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1 text-slate-600 font-medium">
                                <User className="w-2.5 h-2.5 text-slate-400" />
                                {log.adminName.split(' ')[0]}
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                {formatActivityTime(log.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Listing + Label Admin Column */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center font-bold">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                          Listing + Label Admin
                        </h4>
                        <p className="text-[10px] text-blue-700">Catalog, Inventory &amp; Labels Desk</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        Last 5 Actions
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExportCSV('Listing + Label Admin')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-blue-800 hover:bg-blue-50 border border-blue-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Export Listing + Label Admin Activity to CSV"
                      >
                        <Download className="w-3 h-3 text-blue-700" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-blue-100/60 mt-2">
                    {listingAdminLogs.map((log) => {
                      const badge = getActionTypeBadge(log.type);
                      return (
                        <div key={log.id} className="py-2.5 flex items-start gap-2.5">
                          <div className="mt-0.5 p-1 rounded-md bg-white border border-blue-200/80 shrink-0">
                            {getActionIcon(log.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 leading-snug break-words">
                              {log.action}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                              <span className={`px-1.5 py-0.2 rounded font-black uppercase text-[9px] border ${badge.bg}`}>
                                {badge.text}
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1 text-slate-600 font-medium">
                                <User className="w-2.5 h-2.5 text-slate-400" />
                                {log.adminName.split(' ')[0]}
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                {formatActivityTime(log.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Role Filter View */
            <div className="mt-4 divide-y divide-slate-100">
              {displayedLogs.map((log, idx) => {
                const badge = getActionTypeBadge(log.type);
                const isLabelRole = log.role === 'Label Admin';
                return (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-[11px] font-black text-slate-400 w-4 pt-1">
                        #{idx + 1}
                      </span>
                      <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                        {getActionIcon(log.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                          {log.action}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                            {badge.text}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isLabelRole
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {log.role}
                          </span>
                          <span className="text-slate-700 font-medium">
                            Performed by: <strong>{log.adminName}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatActivityTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DATE RANGE ACTIVITY EXPORT MODAL */}
        {isActivityDateModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsActivityDateModalOpen(false);
            }}
          >
            <div
              className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Export Staff Activity by Date (CSV)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Download action audit logs filtered by staff role and date period
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsActivityDateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain text-xs">
                {/* Role Switcher */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                    Target Staff Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All Staff' },
                      { id: 'Label Admin', label: 'Label Admin' },
                      { id: 'Listing + Label Admin', label: 'Listing Admin' },
                    ].map((r) => {
                      const active = activityExportRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActivityExportRole(r.id as any)}
                          className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Presets Grid */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-2">
                    Date Range Period
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'today', label: 'Today', desc: 'Past 24 hours' },
                      { id: 'yesterday', label: 'Yesterday', desc: '1 day ago' },
                      { id: '7days', label: 'Last 7 Days', desc: 'Past week' },
                      { id: '30days', label: 'Last 30 Days', desc: '1 month history' },
                      { id: 'all', label: 'All Time', desc: 'Entire audit log' },
                      { id: 'custom', label: 'Custom Range', desc: 'Pick dates' },
                    ].map((p) => {
                      const active = activityDatePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivityDatePreset(p.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`block font-bold text-xs ${active ? 'text-emerald-950' : 'text-slate-800'}`}>
                            {p.label}
                          </span>
                          <span className={`block text-[10px] mt-0.5 ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {p.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Inputs */}
                {activityDatePreset === 'custom' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                    <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Choose Start &amp; End Dates:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          From Date:
                        </label>
                        <input
                          type="date"
                          value={activityCustomStart}
                          onChange={(e) => setActivityCustomStart(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          To Date:
                        </label>
                        <input
                          type="date"
                          value={activityCustomEnd}
                          onChange={(e) => setActivityCustomEnd(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Preview Summary Card */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">Matching Action Records:</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {matchingActivitiesForExport.length} Actions
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    ✓ Includes Activity ID, precise date &amp; time, admin staff name, action category (AWB, label print, manifest, listing, stock update), and target SKU/order.
                  </p>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 z-10 border-t border-slate-100 px-5 py-3 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsActivityDateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteActivityDateExport}
                  disabled={matchingActivitiesForExport.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV ({matchingActivitiesForExport.length} Actions)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ROLE DASHBOARD (For logged-in staff member)
  // =========================================================================
  const isLabel = targetRole === 'Label Admin';
  const roleTheme = isLabel
    ? {
        border: 'border-emerald-200',
        bg: 'bg-emerald-50/40',
        iconBg: 'bg-emerald-600 text-white',
        pillBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        accentText: 'text-emerald-900',
        subText: 'text-emerald-700',
        roleTitle: 'Label Admin Activity Monitor',
        deskTitle: 'Orders Desk & 4x6 Shipping Fulfillment',
      }
    : {
        border: 'border-blue-200',
        bg: 'bg-blue-50/40',
        iconBg: 'bg-blue-600 text-white',
        pillBg: 'bg-blue-100 text-blue-800 border-blue-200',
        accentText: 'text-blue-900',
        subText: 'text-blue-700',
        roleTitle: 'Listing + Label Admin Activity Monitor',
        deskTitle: 'Product Catalog & Shipping Labels Desk',
      };

  return (
    <div className={`rounded-2xl border ${roleTheme.border} ${roleTheme.bg} p-4 sm:p-5 shadow-xs ${className}`}>
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="mb-3 p-3 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/70">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${roleTheme.iconBg} flex items-center justify-center font-bold shadow-xs shrink-0`}>
            {isLabel ? <Truck className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xs sm:text-sm font-extrabold ${roleTheme.accentText}`}>
                {title || roleTheme.roleTitle}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${roleTheme.pillBg}`}>
                Last 5 Actions
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {roleTheme.deskTitle} &bull; Recorded for Super Admin tracking &amp; audit history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => handleExportCSV(targetRole)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-50 transition cursor-pointer text-xs shadow-2xs"
            title={`Export ${targetRole} Activity Logs to CSV`}
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivityExportRole(targetRole || 'all');
              setIsActivityDateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer text-xs shadow-2xs"
            title="Export activity filtered by date range"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>By Date</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Logging Active</span>
          </span>
        </div>
      </div>

      {/* 5 Actions Horizontal/Vertical Timeline */}
      <div className="mt-3.5 divide-y divide-slate-200/60">
        {displayedLogs.map((log, idx) => {
          const badge = getActionTypeBadge(log.type);
          return (
            <div
              key={log.id}
              className="py-2.5 flex items-start justify-between gap-3 hover:bg-white/80 px-2 rounded-xl transition"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-[11px] font-black text-slate-400 w-4 pt-0.5 shrink-0">
                  {idx + 1}.
                </span>
                <div className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 shadow-2xs">
                  {getActionIcon(log.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    {log.action}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <span className={`px-1.5 py-0.2 rounded font-black uppercase text-[9px] border ${badge.bg}`}>
                      {badge.text}
                    </span>
                    {log.target && (
                      <span className="font-mono text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[9px]">
                        {log.target}
                      </span>
                    )}
                    <span>&bull;</span>
                    <span className="text-slate-600">{log.adminName}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {formatActivityTime(log.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DATE RANGE ACTIVITY EXPORT MODAL IN ROLE DASHBOARD */}
      {isActivityDateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsActivityDateModalOpen(false);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Export {targetRole} Activity by Date (CSV)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Download action audit logs filtered by date period
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsActivityDateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain text-xs">
              {/* Presets Grid */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  Date Range Period
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'today', label: 'Today', desc: 'Past 24 hours' },
                    { id: 'yesterday', label: 'Yesterday', desc: '1 day ago' },
                    { id: '7days', label: 'Last 7 Days', desc: 'Past week' },
                    { id: '30days', label: 'Last 30 Days', desc: '1 month history' },
                    { id: 'all', label: 'All Time', desc: 'Entire audit log' },
                    { id: 'custom', label: 'Custom Range', desc: 'Pick dates' },
                  ].map((p) => {
                    const active = activityDatePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivityDatePreset(p.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`block font-bold text-xs ${active ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {p.label}
                        </span>
                        <span className={`block text-[10px] mt-0.5 ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Date Inputs */}
              {activityDatePreset === 'custom' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Choose Start &amp; End Dates:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={activityCustomStart}
                        onChange={(e) => setActivityCustomStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={activityCustomEnd}
                        onChange={(e) => setActivityCustomEnd(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Preview Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">Matching Action Records:</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {matchingActivitiesForExport.length} Actions
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  ✓ Includes Activity ID, precise date &amp; time, admin staff name, action category, and target SKU/order.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 border-t border-slate-100 px-5 py-3 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between text-xs shrink-0">
              <button
                type="button"
                onClick={() => setIsActivityDateModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteActivityDateExport}
                disabled={matchingActivitiesForExport.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV ({matchingActivitiesForExport.length} Actions)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
