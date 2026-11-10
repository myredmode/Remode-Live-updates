import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Megaphone,
  Check,
  Copy,
  Lightbulb,
  ArrowRight,
  Clock,
  Tag,
} from 'lucide-react';
import { FestivalAlert } from '../../types';
import { formatFestivalDate } from '../../utils/indianFestivals';
import { useStore } from '../../context/StoreContext';

interface ShopAdvisorEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: FestivalAlert[];
}

export const ShopAdvisorEventsModal: React.FC<ShopAdvisorEventsModalProps> = ({
  isOpen,
  onClose,
  alerts,
}) => {
  const { settings, updateSettings } = useStore();
  const [deployedId, setDeployedId] = useState<string | null>(null);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter upcoming or ongoing festivals (daysRemaining >= 0)
  const upcomingEvents = alerts.filter((a) => a.daysRemaining >= 0);

  // 1. Immediate upcoming event (Pehle)
  const primaryEvent = upcomingEvents[0];

  // 2. Aage ke 10 upcoming events
  const next10Events = upcomingEvents.slice(1, 11);

  const handleDeploy = (alertItem: FestivalAlert) => {
    const fest = alertItem.festival;
    const current = settings.announcementBar || {
      enabled: true,
      messages: [],
      couponCode: 'REDMODE10',
      speedSeconds: 20,
      showOnDesktop: true,
    };

    const newMsg = fest.suggestedAnnouncement;
    const existing = current.messages || [];
    const updated = [newMsg, ...existing.filter((m) => m !== newMsg)];

    updateSettings({
      ...settings,
      announcementBar: {
        ...current,
        enabled: true,
        messages: updated,
        couponCode: fest.suggestedCoupon || current.couponCode,
      },
    });

    setDeployedId(fest.id);
    setTimeout(() => setDeployedId(null), 3000);
  };

  const handleCopyCoupon = (coupon: string, id: string) => {
    navigator.clipboard.writeText(coupon);
    setCopiedCouponId(id);
    setTimeout(() => setCopiedCouponId(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="shop-advisor-slideover-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Dimmed backdrop - click to close drawer */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Container (Option 3: Smooth Right Side Drawer) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-12">
        <div className="w-screen max-w-xl md:max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right">
          
          {/* Top Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-800 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="shop-advisor-slideover-title"
                  className="text-base font-bold text-slate-900 tracking-tight"
                >
                  Campaign &amp; Festive Planner
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Primary Upcoming Event */}
            {primaryEvent && (
              <div className="space-y-2">
                <div className="border border-slate-200/90 bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">
                          {primaryEvent.festival.name}
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">
                          • {formatFestivalDate(primaryEvent.targetDate)}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white shadow-2xs">
                      {primaryEvent.daysRemaining === 0
                        ? 'TODAY'
                        : `In ${primaryEvent.daysRemaining} Days`}
                    </span>
                  </div>

                  {/* Actions: Coupon & Deploy */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Coupon:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCoupon(
                            primaryEvent.festival.suggestedCoupon || 'FESTIVE10',
                            primaryEvent.festival.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:border-slate-300 transition cursor-pointer"
                        title="Click to copy coupon code"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{primaryEvent.festival.suggestedCoupon || 'FESTIVE10'}</span>
                        {copiedCouponId === primaryEvent.festival.id ? (
                          <Check className="w-3 h-3 text-emerald-600 ml-1" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 ml-1" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeploy(primaryEvent)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {deployedId === primaryEvent.festival.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Offer Live!</span>
                        </>
                      ) : (
                        <>
                          <Megaphone className="w-3.5 h-3.5 text-slate-300" />
                          <span>Apply Offer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Events List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Upcoming Events
                </h3>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                {next10Events.map((item, index) => {
                  const fest = item.festival;

                  return (
                    <div
                      key={fest.id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-medium text-slate-400 w-5 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {fest.name}
                          </h4>
                          <span className="text-xs text-slate-400">
                            • {formatFestivalDate(item.targetDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          In {item.daysRemaining} days
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeploy(item)}
                          className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                          title="Apply offer to announcement bar"
                        >
                          {deployedId === fest.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Megaphone className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{deployedId === fest.id ? 'Applied' : 'Apply Offer'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>Campaign &amp; Festive Events</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Close Drawer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
