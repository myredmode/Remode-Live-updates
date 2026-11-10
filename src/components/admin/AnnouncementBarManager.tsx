import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  RotateCcw,
  Eye,
  Sliders,
  Tag,
  Play,
  Pause,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AnnouncementBarSettings } from '../../types';

interface AnnouncementBarManagerProps {
  onSaveNotification?: (msg: string) => void;
}

const DEFAULT_MESSAGES = [
  'FLAT 10% OFF ON ALL PREPAID ORDERS | CODE: REDMODE10',
  'FREE EXPRESS SHIPPING ACROSS INDIA',
  'CASH ON DELIVERY (COD) AVAILABLE',
  'EASY 7-DAY SIZE EXCHANGE & RETURNS',
  'NEW FESTIVE KURTI COLLECTION IS LIVE',
];

const PRESET_IDEAS = [
  'FLAT 10% OFF ON ALL PREPAID ORDERS | CODE: REDMODE10',
  'FREE EXPRESS SHIPPING ACROSS INDIA',
  'CASH ON DELIVERY (COD) AVAILABLE',
  'EASY 7-DAY SIZE EXCHANGE & RETURNS',
  'NEW FESTIVE KURTI COLLECTION IS LIVE',
  'SAME-DAY DISPATCH ON ALL ORDERS BEFORE 2 PM',
  'BUY ANY 2 KURTIS GET EXTRA 5% OFF | CODE: PAIR5',
  'HANDCRAFTED PURE COTTON & SILK FABRICS',
  '100% QUALITY GUARANTEE & AUTHENTIC JAIPURI PRINTS',
];

export const AnnouncementBarManager: React.FC<AnnouncementBarManagerProps> = ({
  onSaveNotification,
}) => {
  const { settings, updateSettings } = useStore();

  const currentAnnouncement = settings.announcementBar || {
    enabled: true,
    messages: DEFAULT_MESSAGES,
    couponCode: 'REDMODE10',
    speedSeconds: 20,
    showOnDesktop: true,
  };

  const [enabled, setEnabled] = useState<boolean>(currentAnnouncement.enabled !== false);
  const [showOnDesktop, setShowOnDesktop] = useState<boolean>(currentAnnouncement.showOnDesktop !== false);
  const [speedSeconds, setSpeedSeconds] = useState<number>(currentAnnouncement.speedSeconds || 20);
  const [couponCode, setCouponCode] = useState<string>(currentAnnouncement.couponCode || 'REDMODE10');
  const [messages, setMessages] = useState<string[]>(
    currentAnnouncement.messages && currentAnnouncement.messages.length > 0
      ? currentAnnouncement.messages
      : DEFAULT_MESSAGES
  );

  const [newMessageText, setNewMessageText] = useState('');
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state if settings update externally
  useEffect(() => {
    if (settings.announcementBar) {
      setEnabled(settings.announcementBar.enabled !== false);
      setShowOnDesktop(settings.announcementBar.showOnDesktop !== false);
      setSpeedSeconds(settings.announcementBar.speedSeconds || 20);
      setCouponCode(settings.announcementBar.couponCode || 'REDMODE10');
      if (settings.announcementBar.messages && settings.announcementBar.messages.length > 0) {
        setMessages(settings.announcementBar.messages);
      }
    }
  }, [settings.announcementBar]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    if (onSaveNotification && type === 'success') {
      onSaveNotification(text);
    }
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Add new message
  const handleAddMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMessageText.trim();
    if (!trimmed) {
      showStatus('Please enter some text for the announcement.', 'error');
      return;
    }
    setMessages((prev) => [...prev, trimmed]);
    setNewMessageText('');
    showStatus('New announcement added! Click "Save Changes" to publish.', 'success');
  };

  // Add preset message
  const handleAddPreset = (text: string) => {
    if (messages.includes(text)) {
      showStatus('This announcement is already in your list.', 'error');
      return;
    }
    setMessages((prev) => [...prev, text]);
    showStatus(`Added: "${text.substring(0, 30)}..."`, 'success');
  };

  // Update existing message
  const handleUpdateMessage = (index: number, newText: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = newText;
      return updated;
    });
  };

  // Delete message
  const handleDeleteMessage = (index: number) => {
    if (messages.length <= 1) {
      showStatus('You must keep at least 1 message or turn off the announcement bar.', 'error');
      return;
    }
    setMessages((prev) => prev.filter((_, i) => i !== index));
    showStatus('Announcement removed.', 'success');
  };

  // Move Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setMessages((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  // Move Down
  const handleMoveDown = (index: number) => {
    if (index >= messages.length - 1) return;
    setMessages((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  // Reset to default messages
  const handleResetToDefault = () => {
    setMessages([...DEFAULT_MESSAGES]);
    setCouponCode('REDMODE10');
    setSpeedSeconds(20);
    setEnabled(true);
    showStatus('Reset to default announcements.', 'success');
  };

  // Save all changes to StoreContext & LocalStorage
  const handleSave = () => {
    const validMessages = messages.map((m) => m.trim()).filter(Boolean);
    if (validMessages.length === 0) {
      showStatus('Please include at least 1 message before saving.', 'error');
      return;
    }

    const updatedAnnouncement: AnnouncementBarSettings = {
      enabled,
      messages: validMessages,
      couponCode: couponCode.trim() || 'REDMODE10',
      speedSeconds: Number(speedSeconds) || 20,
      showOnDesktop,
    };

    updateSettings({
      ...settings,
      announcementBar: updatedAnnouncement,
    });

    showStatus('Top Announcement Bar updated successfully! Changes are live across the store. ✅', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Top Running Announcement Bar
            </h2>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. LIVE PREVIEW STRIP                                      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Live Customer Preview
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewPaused(!isPreviewPaused)}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            {isPreviewPaused ? (
              <>
                <Play className="w-3 h-3 text-emerald-600" /> Play Animation
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-amber-600" /> Pause Animation
              </>
            )}
          </button>
        </div>

        {/* The Live Banner Container */}
        <div className="relative border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
          {!enabled ? (
            <div className="bg-zinc-100 text-zinc-500 py-3 text-center text-xs font-semibold uppercase tracking-wider">
              Announcement Bar is currently DISABLED (Turn on switch below to activate)
            </div>
          ) : (
            <div
              className="bg-white text-zinc-900 py-2 px-3 text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] uppercase overflow-hidden border-b border-zinc-200 select-none shadow-2xs"
              style={{ minHeight: '34px' }}
            >
              <div
                className="animate-marquee whitespace-nowrap flex items-center gap-8"
                style={{
                  animationDuration: `${speedSeconds}s`,
                  animationPlayState: isPreviewPaused ? 'paused' : 'running',
                }}
              >
                {/* Loop 1 */}
                <div className="flex items-center gap-8 shrink-0">
                  {messages.map((msg, idx) => (
                    <span key={`prev1-${idx}`} className="flex items-center gap-2 text-zinc-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E52229] shrink-0" />
                      <span>{msg}</span>
                    </span>
                  ))}
                </div>
                {/* Loop 2 for seamless infinite scroll */}
                <div className="flex items-center gap-8 shrink-0" aria-hidden="true">
                  {messages.map((msg, idx) => (
                    <span key={`prev2-${idx}`} className="flex items-center gap-2 text-zinc-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E52229] shrink-0" />
                      <span>{msg}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. GENERAL CONFIGURATION                                  */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-slate-700" />
          General Strip Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Master Enable/Disable */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-slate-800">Bar Visibility</span>
              <span className="text-[11px] text-slate-500">
                {enabled ? 'Active on store' : 'Disabled'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>

          {/* Show on Desktop & Mobile */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-slate-800">Show on Desktop</span>
              <span className="text-[11px] text-slate-500">
                {showOnDesktop ? 'Mobile & Laptop' : 'Mobile Only'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOnDesktop}
                onChange={(e) => setShowOnDesktop(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>

          {/* Marquee Speed */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Scroll Speed ({speedSeconds}s)
            </label>
            <select
              value={speedSeconds}
              onChange={(e) => setSpeedSeconds(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-black"
            >
              <option value={28}>Relaxed / Slow (28s)</option>
              <option value={20}>Standard / Optimal (20s)</option>
              <option value={14}>Fast / Dynamic (14s)</option>
            </select>
          </div>

          {/* Tap-to-Copy Coupon Code */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#E52229]" />
              Tap-to-Copy Code
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. REDMODE10"
              className="w-full text-xs font-mono font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-black uppercase"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. RUNNING MESSAGES LIST                                  */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Running Messages List
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                {messages.length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These messages cycle in order from left to right. You can edit any message directly or rearrange the sequence.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>

        {/* Add New Message Input */}
        <form onSubmit={handleAddMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            placeholder="Type new running message (e.g. FLAT 15% OFF FOR DIWALI | CODE: DIWALI15)..."
            className="flex-1 text-xs font-medium px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Message</span>
          </button>
        </form>

        {/* Message Cards */}
        <div className="space-y-2.5">
          {messages.map((msg, index) => (
            <div
              key={index}
              className="flex items-center gap-2 sm:gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition group"
            >
              {/* Order number */}
              <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>

              {/* Red dot preview */}
              <span className="w-2 h-2 rounded-full bg-[#E52229] shrink-0" />

              {/* Editable input */}
              <input
                type="text"
                value={msg}
                onChange={(e) => handleUpdateMessage(index, e.target.value)}
                className="flex-1 text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-black"
              />

              {/* Actions: Move Up / Down / Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className={`p-1.5 rounded-lg border border-slate-200 bg-white transition cursor-pointer ${
                    index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === messages.length - 1}
                  className={`p-1.5 rounded-lg border border-slate-200 bg-white transition cursor-pointer ${
                    index === messages.length - 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(index)}
                  className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick-Add Idea Chips */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Add Marketing Presets (1-Click):
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_IDEAS.map((preset, pIdx) => {
              const alreadyAdded = messages.includes(preset);
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  disabled={alreadyAdded}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition text-left cursor-pointer ${
                    alreadyAdded
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-black'
                  }`}
                >
                  {alreadyAdded ? '✓ Added: ' : '+ '}{preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Remember to click Save Changes to immediately sync the ticker across the website.
          </p>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
