import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Clock,
  Flame,
  AlertTriangle,
  Megaphone,
  Copy,
  Check,
  Plus,
  Trash2,
  Tag,
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Gift,
} from 'lucide-react';
import {
  IndianFestival,
  FestivalAlert,
  FestivalCategory,
} from '../../types';
import {
  computeAllFestivalAlerts,
  formatFestivalDate,
  saveCustomFestival,
  deleteCustomFestival,
} from '../../utils/indianFestivals';
import { useStore } from '../../context/StoreContext';

interface FestivalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseDate?: Date;
  onSimulateDateChange?: (date: Date | null) => void;
  simulatedDate?: Date | null;
}

export const FestivalAlertModal: React.FC<FestivalAlertModalProps> = ({
  isOpen,
  onClose,
  baseDate = new Date(),
  onSimulateDateChange,
  simulatedDate,
}) => {
  const { settings, updateSettings } = useStore();

  const [activeFilter, setActiveFilter] = useState<'active-10-days' | 'next-30-days' | 'peak' | 'all'>('active-10-days');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Custom festival modal state
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNameHindi, setCustomNameHindi] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customCategory, setCustomCategory] = useState<FestivalCategory>('Major Festival');
  const [customDesc, setCustomDesc] = useState('');
  const [customCoupon, setCustomCoupon] = useState('');

  // Date simulation
  const [showSimulator, setShowSimulator] = useState(false);
  const [simDateInput, setSimDateInput] = useState('');

  // Compute all alerts based on baseDate
  const allAlerts = useMemo(() => {
    return computeAllFestivalAlerts(baseDate, 10, true);
  }, [baseDate]);

  // Statistics
  const stats = useMemo(() => {
    const active10Day = allAlerts.filter((a) => a.isAlertActive);
    const next30Day = allAlerts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining <= 30);
    const peakRush = allAlerts.filter((a) => a.festival.shoppingImpact === 'Critical Peak' || a.festival.shoppingImpact === 'High Rush');
    return {
      activeCount: active10Day.length,
      next30Count: next30Day.length,
      peakCount: peakRush.length,
      totalCount: allAlerts.length,
    };
  }, [allAlerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((item) => {
      // Tab filter
      if (activeFilter === 'active-10-days' && !item.isAlertActive) return false;
      if (activeFilter === 'next-30-days' && !(item.daysRemaining >= 0 && item.daysRemaining <= 30)) return false;
      if (activeFilter === 'peak' && !(item.festival.shoppingImpact === 'Critical Peak' || item.festival.shoppingImpact === 'High Rush')) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.festival.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.festival.name.toLowerCase().includes(q);
        const matchesHindi = item.festival.nameHindi.toLowerCase().includes(q);
        const matchesDesc = item.festival.description.toLowerCase().includes(q);
        const matchesCoupon = item.festival.suggestedCoupon?.toLowerCase().includes(q);
        if (!matchesName && !matchesHindi && !matchesDesc && !matchesCoupon) return false;
      }

      return true;
    });
  }, [allAlerts, activeFilter, selectedCategory, searchQuery]);

  const handleCopyCoupon = (coupon: string, id: string) => {
    navigator.clipboard.writeText(coupon);
    setCopiedCouponId(id);
    setTimeout(() => setCopiedCouponId(null), 2500);
  };

  const handleDeployAnnouncement = (festAlert: FestivalAlert) => {
    const current = settings.announcementBar || {
      enabled: true,
      messages: [],
      couponCode: 'REDMODE10',
      speedSeconds: 20,
      showOnDesktop: true,
    };

    const newMsg = festAlert.festival.suggestedAnnouncement;
    const existingMessages = current.messages || [];
    const updatedMessages = [newMsg, ...existingMessages.filter((m) => m !== newMsg)];

    const updatedSettings = {
      ...settings,
      announcementBar: {
        ...current,
        enabled: true,
        messages: updatedMessages,
        couponCode: festAlert.festival.suggestedCoupon || current.couponCode,
      },
    };

    updateSettings(updatedSettings);
    setActionSuccessMsg(`Deployed announcement bar for ${festAlert.festival.name}! Check top store bar.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customDate) return;

    const [year, month, day] = customDate.split('-');
    const newFest: IndianFestival = {
      id: `custom-${Date.now()}`,
      name: customName,
      nameHindi: customNameHindi || customName,
      category: customCategory,
      emoji: '🎉',
      colorTheme: 'rose',
      datesByYear: {
        [parseInt(year, 10)]: customDate,
      },
      description: customDesc || 'Custom store event configured by REDMODE admin.',
      ethnicRelevance: 'Promotional discount event for ethnic wear collections.',
      shoppingImpact: 'High Rush',
      recommendedActions: [
        'Review inventory levels for promotional items',
        'Set up WhatsApp marketing broadcast',
        'Deploy promotional announcement bar',
      ],
      suggestedAnnouncement: `🎉 ${customName.toUpperCase()} SPECIAL: CELEBRATE WITH EXCLUSIVE ETHNIC DEALS | CODE: ${customCoupon || 'FESTIVE10'}`,
      suggestedCoupon: customCoupon || 'FESTIVE10',
      isCustom: true,
    };

    saveCustomFestival(newFest);
    setIsAddCustomOpen(false);
    setCustomName('');
    setCustomNameHindi('');
    setCustomDate('');
    setCustomDesc('');
    setCustomCoupon('');
    setActionSuccessMsg(`Custom event "${customName}" added! 10-day alert active.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDeleteCustom = (id: string, name: string) => {
    if (window.confirm(`Delete custom event "${name}"?`)) {
      deleteCustomFestival(id);
      setActionSuccessMsg(`Removed event "${name}".`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const handleSimulateDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDateInput) return;
    const [y, m, d] = simDateInput.split('-').map(Number);
    const simulated = new Date(y, m - 1, d);
    if (onSimulateDateChange) {
      onSimulateDateChange(simulated);
    }
    setActionSuccessMsg(`Testing date set to: ${simDateInput}. Alerts recalculated!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleResetSimulation = () => {
    if (onSimulateDateChange) {
      onSimulateDateChange(null);
    }
    setSimDateInput('');
    setActionSuccessMsg('Reset to real live system date.');
    setTimeout(() => setActionSuccessMsg(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-red-950 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          {/* Subtle Decorative Elements */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
                  10-Day Automated Notification Radar
                </span>
                <span className="text-xs text-slate-400">
                  Current Date: <strong className="text-white">{baseDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </span>
                {simulatedDate && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Simulation Active: {simulatedDate.toISOString().slice(0, 10)}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>🇮🇳 Indian Festivals & Major Events Calendar</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Har major event (Eid, Diwali, Holi, Navratri, Republic Day etc.) ka notification event se <strong>theek 10 din pehle</strong> admin panel me trigger hota hai taaki stock preparation aur promotional campaigns samay par ready rahein.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSimulator(!showSimulator)}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  showSimulator || simulatedDate
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
                title="Date Simulator / Test Alerts"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Test Dates</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Date Simulator Panel */}
          {showSimulator && (
            <div className="mt-4 pt-4 border-t border-white/10 bg-black/30 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Date Simulator:
                </span>
                <span className="text-slate-300 text-[11px]">
                  Kisi bhi festival ke 10 din pehle ka alert test karne ke liye date chunein:
                </span>
              </div>
              <form onSubmit={handleSimulateDate} className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={simDateInput}
                  onChange={(e) => setSimDateInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Apply Test Date
                </button>
                {simulatedDate && (
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset to Real Date
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Action Success Toast Banner */}
        {actionSuccessMsg && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between gap-2 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button
              onClick={() => setActionSuccessMsg(null)}
              className="p-1 hover:bg-emerald-700 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80">
          <div
            onClick={() => setActiveFilter('active-10-days')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeFilter === 'active-10-days'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Active 10-Day Alerts</span>
              <span className={`w-2.5 h-2.5 rounded-full ${stats.activeCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">{stats.activeCount}</span>
              <span className="text-[11px] font-semibold text-red-700/80">Events within 10d</span>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('next-30-days')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeFilter === 'next-30-days'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Next 30 Days</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{stats.next30Count}</span>
              <span className="text-[11px] font-semibold text-slate-600">Upcoming festivals</span>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('peak')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeFilter === 'peak'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Peak Shopping Rush</span>
              <Flame className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-600">{stats.peakCount}</span>
              <span className="text-[11px] font-semibold text-slate-600">Mega ethnic sales</span>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Festivals Tracked</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats.totalCount}</span>
              <span className="text-[11px] font-semibold text-slate-600">Multi-year radar</span>
            </div>
          </div>
        </div>

        {/* Search, Category Filter, and Add Custom Event Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Diwali, Eid, Holi, Karwa Chauth, coupon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-400 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Major Festival">Major Festivals</option>
              <option value="Religious">Religious Holy Days</option>
              <option value="National Event">National Events</option>
              <option value="Shopping Season">Shopping Seasons</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsAddCustomOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Event</span>
            </button>
          </div>
        </div>

        {/* Scrollable Festival List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No events found matching this filter</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeFilter === 'active-10-days'
                  ? 'Filhaal agle 10 dino me koi active festival alert nahi hai. Sabhi festivals dekhne ke liye "Total Festivals Tracked" ya "Next 30 Days" par click karein.'
                  : 'Try adjusting your search terms or filter criteria.'}
              </p>
              {activeFilter === 'active-10-days' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  View All Festivals & Events Calendar
                </button>
              )}
            </div>
          ) : (
            filteredAlerts.map((item) => {
              const fest = item.festival;
              const isAlert = item.isAlertActive;
              const isUrgent = item.daysRemaining <= 3 && item.daysRemaining >= 0;

              return (
                <div
                  key={fest.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs hover:shadow-md ${
                    isAlert
                      ? isUrgent
                        ? 'border-red-400 ring-2 ring-red-500/10'
                        : 'border-amber-300 ring-2 ring-amber-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar of Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl select-none p-2 bg-slate-50 rounded-xl border border-slate-100">
                        {fest.emoji}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">
                            {fest.name}
                          </h3>
                          <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            {fest.nameHindi}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {fest.category}
                          </span>
                          {fest.isCustom && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Custom Event
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-800 font-semibold">
                            {formatFestivalDate(item.targetDate)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Alert Status Pill */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isAlert ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-300 text-red-700 font-bold text-xs shadow-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          <span>
                            {item.daysRemaining === 0
                              ? '🎉 TODAY! CELEBRATION IS LIVE'
                              : item.daysRemaining === 1
                              ? '⏳ TOMORROW! (1 DAY LEFT)'
                              : `🚨 10-DAY ALERT: ${item.daysRemaining} DAYS LEFT`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-medium text-xs">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {item.daysRemaining < 0
                              ? 'Celebrated this year'
                              : `In ${item.daysRemaining} Days (Alert in ${Math.max(0, item.daysRemaining - 10)}d)`}
                          </span>
                        </div>
                      )}

                      {fest.isCustom && (
                        <button
                          onClick={() => handleDeleteCustom(fest.id, fest.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                          title="Delete custom event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3 pt-1">
                    {/* Left: Significance & Ethnic Market Relevance */}
                    <div className="md:col-span-7 space-y-2.5">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {fest.description}
                      </p>

                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>REDMODE Ethnic Demand & Shopping Insight:</span>
                        </div>
                        <p className="text-amber-900/90 text-[11px] leading-relaxed">
                          {fest.ethnicRelevance}
                        </p>
                      </div>

                      {/* Recommended Checklist */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Recommended Action Checklist (10-Day Runway):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          {fest.recommendedActions.map((act, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Merchandising Actions & 1-Click Deployment */}
                    <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Megaphone className="w-3.5 h-3.5 text-red-600" />
                            Suggested Promo Campaign:
                          </span>
                          {fest.suggestedCoupon && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              CODE: {fest.suggestedCoupon}
                            </span>
                          )}
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-800 break-words leading-tight shadow-2xs">
                          {fest.suggestedAnnouncement}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeployAnnouncement(item)}
                          className="w-full py-2 px-3 bg-gradient-to-r from-slate-900 to-red-900 hover:from-black hover:to-red-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                        >
                          <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                          <span>1-Click Deploy to Announcement Bar</span>
                        </button>

                        {fest.suggestedCoupon && (
                          <button
                            type="button"
                            onClick={() => handleCopyCoupon(fest.suggestedCoupon!, fest.id)}
                            className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {copiedCouponId === fest.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Coupon Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy Coupon Code ({fest.suggestedCoupon})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Automatic 10-Day early festival alert engine active across India</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Add Custom Event Modal Overlay */}
      {isAddCustomOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600" />
                <span>Add Custom Festival / Sale Event</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Event / Festival Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REDMODE Anniversary Mega Sale"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hindi / Native Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. रेडमोड वर्षगांठ सेल"
                  value={customNameHindi}
                  onChange={(e) => setCustomNameHindi(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as FestivalCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none"
                  >
                    <option value="Major Festival">Major Festival</option>
                    <option value="Religious">Religious</option>
                    <option value="National Event">National Event</option>
                    <option value="Shopping Season">Shopping Season</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Promo Coupon Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. REDANNIV20"
                  value={customCoupon}
                  onChange={(e) => setCustomCoupon(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note on promotional significance..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-red-600 text-white font-bold rounded-xl"
                >
                  Save & Enable 10-Day Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
