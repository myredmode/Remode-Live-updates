import { Order } from '../types';

export interface OrderBatchStatus {
  batchType: 'NEXT_DAY_DISPATCH' | 'AWAITING_CONFIRMATION' | 'NIGHT_POST_CUTOFF' | 'EXPIRED';
  badgeLabel: string;
  badgeClass: string;
  description: string;
  isEligibleForNextDay: boolean;
  orderTimeFormatted: string;
  isPost9Pm: boolean;
  scheduledMessageText: string;
  hoursElapsed: number;
  is23hWindowEligible: boolean; // 23 hours passed since msg without reply
  is24hExpired: boolean; // 24+ hours passed without customer reply -> Auto-Cancelled (Expired)
}

/**
 * Evaluates whether an order falls within the 10:00 AM - 9:00 PM cutoff window,
 * whether it's scheduled for 10:00 AM next morning,
 * whether 23 hours have elapsed without customer reply for the free reminder alert,
 * or if 24 hours have elapsed causing it to auto-cancel as Expired (Grey status).
 */
export function getOrderBatchStatus(order: Order): OrderBatchStatus {
  const dateObj = new Date(order.createdAt || Date.now());
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 10:00 AM = 600 min, 21:00 (9:00 PM) = 1260 min
  const isWithinDayWindow = totalMinutes >= 600 && totalMinutes <= 1260;
  const isPost9Pm = !isWithinDayWindow;
  
  const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isConfirmed =
    order.customerConfirmed ||
    order.codVerificationStatus === 'CONFIRMED' ||
    order.orderStatus === 'Confirmed' ||
    order.orderStatus === 'Shipped' ||
    order.orderStatus === 'SHIPPED' ||
    order.orderStatus === 'Delivered' ||
    order.orderStatus === 'DELIVERED';

  const isCancelled =
    order.orderStatus === 'Cancelled' ||
    (order.orderStatus as any) === 'CANCELLED' ||
    order.codVerificationStatus === 'REJECTED';

  // Calculate hours elapsed since confirmation message was sent or scheduled
  const refTime = order.confirmationSentAt
    ? new Date(order.confirmationSentAt).getTime()
    : order.scheduledConfirmationTime
    ? new Date(order.scheduledConfirmationTime).getTime()
    : dateObj.getTime();
  const now = Date.now();
  const hoursElapsed = Math.max(0, (now - refTime) / (1000 * 60 * 60));

  const isExplicitExpired = order.orderStatus === 'Expired' || order.isExpired === true;
  const is24hExpired = !isConfirmed && !isCancelled && (isExplicitExpired || hoursElapsed >= 24);
  const is23hWindowEligible = !isConfirmed && !isCancelled && !is24hExpired && hoursElapsed >= 23 && !order.reminder23hSent;

  // If 24 hours elapsed without reply, order is Auto-Cancelled / Expired in Grey color
  if (is24hExpired) {
    return {
      batchType: 'EXPIRED',
      badgeLabel: 'Auto-Cancelled (Expired)',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      description: `24 hours elapsed without confirmation reply. Order auto-cancelled (no message sent). If customer replies YES now, you can reactivate.`,
      isEligibleForNextDay: false,
      orderTimeFormatted: timeFormatted,
      isPost9Pm,
      scheduledMessageText: '24h window closed without response. Marked as Expired.',
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      is23hWindowEligible: false,
      is24hExpired: true,
    };
  }

  if (isWithinDayWindow) {
    if (isConfirmed) {
      return {
        batchType: 'NEXT_DAY_DISPATCH',
        badgeLabel: 'Next-Day Dispatch (10 AM - 9 PM)',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        description: `Order booked at ${timeFormatted} & Confirmed. Scheduled for tomorrow Delhivery pickup.`,
        isEligibleForNextDay: true,
        orderTimeFormatted: timeFormatted,
        isPost9Pm: false,
        scheduledMessageText: 'Instant confirmation sent during 10 AM - 9 PM window.',
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        is23hWindowEligible,
        is24hExpired: false,
      };
    } else {
      return {
        batchType: 'AWAITING_CONFIRMATION',
        badgeLabel: 'Awaiting Customer Reply (WhatsApp YES)',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        description: `Booked at ${timeFormatted}. Msg sent. If unconfirmed, 23h reminder will alert before 24h expiration.`,
        isEligibleForNextDay: false,
        orderTimeFormatted: timeFormatted,
        isPost9Pm: false,
        scheduledMessageText: 'Confirmation sent. Waiting for customer to reply YES on WhatsApp.',
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        is23hWindowEligible,
        is24hExpired: false,
      };
    }
  }

  // Outside 10 AM - 9 PM (Night Order or Early Morning before 10 AM)
  return {
    batchType: 'NIGHT_POST_CUTOFF',
    badgeLabel: 'Night Order (Msg at 10:00 AM)',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    description: `Booked at ${timeFormatted} (Post 9 PM). Confirmation WhatsApp scheduled for 10:00 AM tomorrow.`,
    isEligibleForNextDay: false,
    orderTimeFormatted: timeFormatted,
    isPost9Pm: true,
    scheduledMessageText: 'Scheduled: Auto WhatsApp will trigger at 10:00 AM sharp to avoid disturbing customer at night.',
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
    is23hWindowEligible,
    is24hExpired: false,
  };
}

/**
 * Formats standard WhatsApp utility templates strictly adhering to Meta API ₹0.22 cost limit
 */
export function getMetaWhatsAppTemplates(order: Order) {
  const customerName = order.customer?.name || 'Customer';
  const orderNo = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const total = order.total.toLocaleString('en-IN');
  const paymentMode = order.paymentMode || 'COD';
  const awb = order.awb_number || '148920194812';
  const trackingUrl = `https://www.delhivery.com/track/package/${awb}`;

  return {
    // 1. Order Confirmation Request (Sent instantly 10AM-9PM, OR at 10:00 AM next day for night orders)
    confirmation: `Namaste *${customerName}* ji! ✨

Aapka RedMode order *#${orderNo}* receive ho gaya hai!

💰 *Amount to Pay:* ₹${total} (${paymentMode})
📍 *Delivery Address:* ${order.customer?.city || 'Meerut'}, ${order.customer?.pincode || '250002'}

⚠️ *Important:* Hamara Delhivery Express dispatch batch nikal raha hai. 
Kripya apna order confirm karne ke liye is message ka reply karein:

👉 Reply: *YES* (Order confirm karein)
👉 Reply: *CANCEL* (Order cancel karein)`,

    // 2. 23-Hour Gentle Reminder (Utility Template before 24h window expires)
    reminder23h: `Namaste *${customerName}* ji! ⏳

Aapka RedMode order *#${orderNo}* (₹${total}) hamare warehouse me packing ke liye hold par hai.

Agar aap ye order mangwana chahte hain, to kripya abhi reply karein:
👉 *YES* likh kar reply karein taaki hum parcel Delhivery ko handover kar sakein.

(Note: 24 ghante me reply na aane par ye order automatically cancel ho jata hai).
Dhanyawad! Team RedMode`,

    // 2.1 Confirmation Acknowledgment (Sent right when customer replies YES - ₹0.00 inside free 24h conversation window)
    orderConfirmedAck: `Namaste *${customerName}* ji! 🎉✨

Aapka RedMode order *#${orderNo}* successfully CONFIRMED ho gaya hai!

📋 *Order ID:* #${orderNo}
💰 *Total Amount:* ₹${total} (${paymentMode})
📦 *Status:* Confirmed & Packing for Delhivery Handover

Hamari warehouse team aapka parcel safe packaging me pack kar rahi hai. Jaise hi Delhivery courier partner parcel pickup karega, aapko live tracking AWB link bhej diya jayega.

Dhanyawad! Team RedMode`,

    // 3. Dispatched & Live Tracking Link on Label Download (FREE within 24-hr customer reply window: ₹0.00)
    tracking: `Namaste *${customerName}* ji! 🚚✨

Khushkhabri! Your order has been dispatched! 📦

📋 *Order ID:* #${orderNo}
🏷️ *AWB Number:* ${awb}
🚚 *Courier Partner:* Delhivery Express
💰 *Amount:* ₹${total} (${paymentMode})

Track your order here:
🔗 ${trackingUrl}

Aapka parcel safe packaging ke saath nikal chuka hai aur jald deliver hoga.
Dhanyawad! Team RedMode`,

    // 4. Delivered & Review Us (Meta Utility/Marketing Template ~₹0.11)
    deliveredReview: `Namaste *${customerName}* ji! 🌸

Aapka RedMode order *#${orderNo}* deliver ho gaya hai. 
Humein poori ummeed hai aapko hamara fabric, design aur fitting pasand aayi hogi!

⭐ *Aapka Review Hamare Liye Bahut Keemti Hai:*
Kripya humein 5-Star rating aur apna feedback share karein:
👉 https://myredmode.com/reviews

🎁 *Special Gift:* Apne agle order par Flat 15% OFF ke liye coupon use karein: *REDMODE15*

Shukriya, Team RedMode`,
  };
}
