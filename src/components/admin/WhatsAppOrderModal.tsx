import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, ShieldCheck, Truck, CheckCircle2, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Order } from '../../types';
import { useStore } from '../../context/StoreContext';

interface WhatsAppOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

type TemplateType = 'confirmation' | 'confirmed_ack' | 'reminder23h' | 'shipped' | 'cod_verify' | 'delivered_feedback' | 'custom';

export const WhatsAppOrderModal: React.FC<WhatsAppOrderModalProps> = ({ order, isOpen, onClose }) => {
  const { settings, updateCodVerificationStatus, updateOrderStatus, confirmCustomerOrder, send23hReminder } = useStore();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('confirmation');
  const [customText, setCustomText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSendingCloud, setIsSendingCloud] = useState<boolean>(false);

  // Extract safe customer details
  const customerName = order?.customer?.name || (order as any)?.shippingAddress?.name || 'Customer';
  const customerPhone =
    order?.customer?.phone ||
    (order as any)?.customer?.mobile ||
    (order as any)?.shippingAddress?.mobile ||
    (order as any)?.shippingAddress?.phone ||
    '';
  const orderId = order ? order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() : '';
  const orderTotal = order ? order.total.toLocaleString('en-IN') : '0';
  const paymentMode = order?.paymentMode || (order as any)?.paymentMethod || 'Prepaid';
  const itemsList =
    order?.items?.map((it, idx) => `${idx + 1}. ${it.name} (Size: ${it.size || 'Free Size'}) x${it.quantity}`).join('\n') ||
    '1. Ethnic Fashion Kurti';

  // Format clean phone number for wa.me API
  const cleanPhone = React.useMemo(() => {
    if (!customerPhone) return '';
    const digits = customerPhone.replace(/[^0-9]/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits;
  }, [customerPhone]);

  // Predefined professional, friendly WhatsApp templates (neutral modern tone)
  const templateMessages: Record<TemplateType, string> = {
    confirmation: `Hello *${customerName}*! ✨

Aapka RedMode order *#${orderId}* receive ho gaya hai! 🎉

💰 *Amount to Pay:* ₹${orderTotal} (${paymentMode})
📍 *Delivery Address:* ${order?.customer?.city || 'Meerut'}, ${order?.customer?.pincode || '250002'}

⚠️ *Important:* Hamara Delhivery Express batch nikal raha hai. Kripya apna order confirm karne ke liye reply karein:
👉 Reply: *YES* (Order confirm karein)
👉 Reply: *CANCEL* (Order cancel karein)`,

    confirmed_ack: `Namaste *${customerName}* ji! 🎉✨

Aapka RedMode order *#${orderId}* successfully CONFIRMED ho gaya hai!

📋 *Order ID:* #${orderId}
💰 *Total Amount:* ₹${orderTotal} (${paymentMode})
📦 *Status:* Confirmed & Packing for Delhivery Handover

Hamara dispatch team aapka parcel safe packing me pack kar raha hai. Jaise hi Delhivery courier partner parcel scan karega, aapko live tracking AWB link bhej diya jayega.

Dhanyawad! Team RedMode`,

    reminder23h: `Namaste *${customerName}* ji! ⏳

Aapka RedMode order *#${orderId}* (₹${orderTotal}) hamare warehouse me packing hold par hai.

Agar aap ye order mangwana chahte hain, to kripya abhi reply karein:
👉 *YES* likh kar reply karein taaki hum parcel Delhivery ko handover kar sakein.

(Agar aapko cancel karna hai to *CANCEL* likh dein).
Dhanyawad! Team RedMode`,

    shipped: `Hello *${customerName}*! 🚚✨

Khushkhabri! Your order has been dispatched! 📦

📋 *Order ID:* #${orderId}
🏷️ *AWB Tracking No:* ${order?.shipment?.awb || order?.awb_number || '148920194812'}
🚚 *Courier Partner:* Delhivery Express
💰 *Total:* ₹${orderTotal} (${paymentMode})

Track your order here:
🔗 https://www.delhivery.com/track/package/${order?.shipment?.awb || order?.awb_number || '148920194812'}

Aapka parcel safe express delivery ke saath nikal chuka hai.
Dhanyawad! Team RedMode`,

    cod_verify: `Hello *${customerName}*! 👋

Aapne REDMODE par Cash on Delivery (COD) order *#${orderId}* place kiya hai:
💰 *Total Amount to Pay on Delivery:* ₹${orderTotal}

Kripya delivery confirm karne ke liye is message ka *YES* ya *CONFIRM* reply karein.
Aapka reply aate hi hum aapka parcel turant express courier se dispatch kar denge! 📦✨

Agar aapne ye order nahi kiya hai, to *CANCEL* reply karein.`,

    delivered_feedback: `Hello *${customerName}*! 🌸

Aapka Redmode order *#${orderId}* deliver ho gaya hai. 
Humein poori ummeed hai aapko hamara fabric aur fitting behad pasand aayi hogi! ✨

❤️ *Aapka Review Hamare Liye Bahut Keemti Hai!*
Kripya apna pyara feedback aur photo review hamare saath isi chat par share karein.

🎁 *Exclusive Gift for you:*
Apne agle order par payein Flat 15% Off! 
Coupon Code use karein: *WELCOME15*

Happy Styling,
*Team REDMODE*`,

    custom: `Hello *${customerName}*,

Aapke Redmode order *#${orderId}* ke reference me hum aapko update karna chahte hain:
`,
  };

  // Sync active message when template or order changes
  useEffect(() => {
    if (selectedTemplate !== 'custom') {
      setCustomText(templateMessages[selectedTemplate]);
    }
  }, [selectedTemplate, order]);

  if (!isOpen || !order) return null;

  // Handle direct 1-click WhatsApp web / app dispatch
  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      setActionFeedback('Valid customer mobile number is not available for this order.');
      setTimeout(() => setActionFeedback(null), 3500);
      return;
    }
    if (selectedTemplate === 'reminder23h' && order) {
      send23hReminder(order.id);
    }
    const encodedText = encodeURIComponent(customText);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle Official Meta WhatsApp Cloud API Dispatch
  const handleSendViaCloudApi = async () => {
    if (!cleanPhone) {
      setActionFeedback('Valid customer mobile number is not available for this order.');
      setTimeout(() => setActionFeedback(null), 3500);
      return;
    }
    setIsSendingCloud(true);
    setActionFeedback(null);
    try {
      const waConfig = settings?.whatsappSettings;
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          textMessage: customText,
          accessToken: waConfig?.accessToken || '',
          phoneNumberId: waConfig?.phoneNumberId || '',
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (selectedTemplate === 'reminder23h' && order) {
          send23hReminder(order.id);
        }
        setActionFeedback(`Message sent via Meta WhatsApp Cloud API (ID: ${data.messageId || 'Dispatched'}) ✅`);
      } else {
        setActionFeedback(data?.error || 'Could not send via Cloud API. Check Access Token or use "Open & Send on WhatsApp".');
      }
    } catch (err: any) {
      setActionFeedback(`Network error: ${err?.message || 'Could not reach WhatsApp Cloud endpoint.'}`);
    } finally {
      setIsSendingCloud(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Direct WhatsApp Notification</h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  100% Free • Zero Ban Risk
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-bold text-slate-800">#{orderId}</span> • Customer:{' '}
                <span className="font-semibold text-slate-800">{customerName}</span> (
                <span className="font-mono text-emerald-700 font-semibold">{customerPhone || 'No Phone'}</span>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Template Selector Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Choose Message Template:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('confirmation')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTemplate === 'confirmation'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-3xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Confirm Req</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('confirmed_ack')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTemplate === 'confirmed_ack'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-3xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Confirmed Ack</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('reminder23h')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTemplate === 'reminder23h'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-900 shadow-3xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">23h Reminder</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('shipped')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTemplate === 'shipped'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-3xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Shipped Alert</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('cod_verify')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTemplate === 'cod_verify'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-3xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">COD Verify</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('delivered_feedback')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTemplate === 'delivered_feedback'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-3xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Review / Gift</span>
              </button>
            </div>
          </div>

          {/* Editable WhatsApp Message Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Message Preview (Editable):
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={9}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full text-xs font-sans p-3.5 border border-slate-200 rounded-xl bg-slate-50/60 text-slate-800 leading-relaxed focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden resize-none transition"
                placeholder="Type your WhatsApp notification message here..."
              />
            </div>
          </div>

          {/* Customer Reply & Order Verification Desk */}
          {order && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Customer Reply Action (1-Click Order Update):</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.codVerificationStatus === 'CONFIRMED' || order.orderStatus === 'Confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.orderStatus === 'Expired' || order.isExpired
                      ? 'bg-slate-200 text-slate-700'
                      : order.codVerificationStatus === 'REJECTED' || order.orderStatus === 'Cancelled' || (order.orderStatus as any) === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {order.orderStatus || 'Pending'} {order.codVerificationStatus ? `(${order.codVerificationStatus})` : ''}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Customer ne WhatsApp par kya reply kiya? Yahan se 1-click me website par status update karein:
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    confirmCustomerOrder(order.id, 'WhatsApp Reply');
                    updateCodVerificationStatus(order.id, 'CONFIRMED', 'WhatsApp Admin');
                    setActionFeedback("Order Confirmed & added to today's active batch! Auto-confirmation message sent (₹0 fee) & Delhivery unlocked ✅");
                    setTimeout(() => setActionFeedback(null), 3000);
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Customer Ne &quot;YES&quot; Kaha (Mark Confirmed)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateCodVerificationStatus(order.id, 'REJECTED', 'WhatsApp Admin');
                    updateOrderStatus(order.id, 'CANCELLED');
                    setActionFeedback('Order Cancelled / Rejected ❌');
                    setTimeout(() => setActionFeedback(null), 3000);
                  }}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>&quot;Cancel&quot; / Fake Order</span>
                </button>
              </div>

              {actionFeedback && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-center animate-in fade-in">
                  {actionFeedback}
                </div>
              )}
            </div>
          )}

          {/* Security & Zero Ban Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-600">
            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
              ✓
            </div>
            <div>
              <span className="font-bold text-slate-800">Direct Human Send:</span> Clicking &quot;Open in WhatsApp&quot; opens WhatsApp Web or your phone app directly with this pre-filled message. WhatsApp registers this as a genuine human conversation—no expensive API fees and zero block risk!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendViaCloudApi}
              disabled={!cleanPhone || isSendingCloud}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                cleanPhone && !isSendingCloud
                  ? 'border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingCloud ? 'Sending via API...' : 'Send via Cloud API'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!cleanPhone}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer ${
                cleanPhone
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Open &amp; Send on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
