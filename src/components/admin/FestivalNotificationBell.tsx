import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  Calendar,
  Sparkles,
  Clock,
  Flame,
  ChevronRight,
  Megaphone,
  CheckCircle2,
  X,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import {
  computeAllFestivalAlerts,
  getActive10DayFestivalAlerts,
  formatFestivalDate,
} from '../../utils/indianFestivals';
import { useStore } from '../../context/StoreContext';
import { FestivalAlert } from '../../types';

interface FestivalNotificationBellProps {
  onOpenFullModal: () => void;
  baseDate?: Date;
}

export const FestivalNotificationBell: React.FC<FestivalNotificationBellProps> = ({
  onOpenFullModal,
  baseDate = new Date(),
}) => {
  const { settings, updateSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute alerts
  const allAlerts = useMemo(() => computeAllFestivalAlerts(baseDate, 10, true), [baseDate]);
  const active10DayAlerts = useMemo(() => allAlerts.filter((a) => a.isAlertActive), [allAlerts]);
  const upcomingBeyond10 = useMemo(
    () => allAlerts.filter((a) => !a.isAlertActive && a.daysRemaining > 0).slice(0, 3),
    [allAlerts]
  );

  const activeCount = active10DayAlerts.length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickDeploy = (alertItem: FestivalAlert, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = settings.announcementBar || {
      enabled: true,
      messages: [],
      couponCode: 'REDMODE10',
      speedSeconds: 20,
      showOnDesktop: true,
    };

    const newMsg = alertItem.festival.suggestedAnnouncement;
    const existing = current.messages || [];
    const updatedMessages = [newMsg, ...existing.filter((m) => m !== newMsg)];

    updateSettings({
      ...settings,
      announcementBar: {
        ...current,
        enabled: true,
        messages: updatedMessages,
        couponCode: alertItem.festival.suggestedCoupon || current.couponCode,
      },
    });

    setToastMessage(`✓ ${alertItem.festival.name} announcement live on website!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="admin-festival-notification-bell-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 sm:p-2.5 rounded-full border transition cursor-pointer active:scale-95 flex items-center justify-center ${
          activeCount > 0
            ? 'bg-red-50 hover:bg-red-100/80 border-red-200 text-red-600 shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200/90 text-slate-700'
        }`}
        title={
          activeCount > 0
            ? `${activeCount} Indian festival(s) within 10 days!`
            : 'Indian Festivals & Events 10-Day Notification Center'
        }
      >
        <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${activeCount > 0 ? 'text-red-600 animate-bounce' : 'text-slate-600'}`} />

        {/* Dynamic Badge */}
        {activeCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md ring-2 ring-white">
            {activeCount}
          </span>
        ) : (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </button>

      {/* Dropdown Flyout */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-950 via-zinc-900 to-red-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇮🇳</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Festive & Event Alerts</span>
                  {activeCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 font-extrabold text-white">
                      {activeCount} Active
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-300">
                  10-Day Automated Early Warning Engine
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toast feedback */}
          {toastMessage && (
            <div className="bg-emerald-600 text-white text-[11px] font-semibold py-1.5 px-3 flex items-center justify-between">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 p-1">
            {activeCount > 0 ? (
              active10DayAlerts.map((alertItem) => {
                const fest = alertItem.festival;
                const isUrgent = alertItem.daysRemaining <= 3;

                return (
                  <div
                    key={fest.id}
                    className={`p-3 rounded-xl transition hover:bg-slate-50 m-1 border ${
                      isUrgent ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="text-2xl shrink-0 p-1 bg-white rounded-lg border border-slate-100 shadow-2xs">
                          {fest.emoji}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-xs font-bold text-slate-900">
                              {fest.name}
                            </h5>
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1 rounded">
                              {fest.nameHindi}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatFestivalDate(alertItem.targetDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          alertItem.daysRemaining === 0
                            ? 'bg-red-600 text-white animate-pulse'
                            : alertItem.daysRemaining === 1
                            ? 'bg-red-500 text-white'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {alertItem.daysRemaining === 0
                          ? 'TODAY! 🎉'
                          : alertItem.daysRemaining === 1
                          ? 'TOMORROW!'
                          : `${alertItem.daysRemaining}d Left`}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {fest.ethnicRelevance}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {fest.suggestedCoupon ? `Coupon: ${fest.suggestedCoupon}` : 'Special Campaign'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleQuickDeploy(alertItem, e)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Deploy to announcement bar"
                      >
                        <Megaphone className="w-3 h-3 text-amber-300" />
                        <span>Push Banner</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h5 className="text-xs font-bold text-slate-800">
                  Sabhi Major Festivals 10 Din se Door Hain
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Agla major event aate hi 10 din pehle yahan red notification trigger ho jaega.
                </p>
              </div>
            )}

            {/* Upcoming Beyond 10 Days Sneak Peek */}
            {upcomingBeyond10.length > 0 && (
              <div className="p-3 bg-slate-50/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Next Coming Up on Indian Calendar:
                </span>
                <div className="space-y-1.5">
                  {upcomingBeyond10.map((item) => (
                    <div
                      key={item.festival.id}
                      className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border border-slate-200/70"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{item.festival.emoji}</span>
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {item.festival.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        In {item.daysRemaining} days
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenFullModal();
              }}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Open Full 2025-2028 Festive Calendar Radar</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
