import React, { useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  MessageSquare,
  Truck,
  Package,
  AlertCircle,
  FileText,
  RotateCcw,
  ArrowUpDown,
  History,
} from 'lucide-react';
import { Order, OrderActivityLogItem } from '../../types';
import { useStore } from '../../context/StoreContext';

interface OrderActivityLogProps {
  order: Order;
}

export const OrderActivityLog: React.FC<OrderActivityLogProps> = ({ order }) => {
  const { auditLogs } = useStore();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Format date helper: "22 Sep 2026, 01:45 PM"
  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return 'Timestamp recorded';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Compile and synthesize comprehensive activity history
  const activities: OrderActivityLogItem[] = useMemo(() => {
    const list: OrderActivityLogItem[] = [];
    const addedKeys = new Set<string>();

    const addEvent = (
      id: string,
      timestamp: string | undefined,
      title: string,
      description: string,
      source?: OrderActivityLogItem['source']
    ) => {
      if (!timestamp) return;
      const key = `${title.toLowerCase()}-${timestamp.slice(0, 16)}`;
      if (addedKeys.has(key)) return;
      addedKeys.add(key);

      list.push({
        id,
        timestamp,
        title,
        description,
        source,
      });
    };

    // 1. Existing explicitly stored activity logs on the order
    if (order.activityLog && Array.isArray(order.activityLog)) {
      order.activityLog.forEach((item) => {
        addEvent(item.id, item.timestamp, item.title, item.description, item.source);
      });
    }

    // 2. Global audit logs matching this order
    if (auditLogs && Array.isArray(auditLogs)) {
      auditLogs
        .filter(
          (log) =>
            log.entity === 'Order' &&
            (log.entityId === order.id || log.entityId.includes(order.id))
        )
        .forEach((log) => {
          let source: OrderActivityLogItem['source'] = 'admin';
          if (log.action.toLowerCase().includes('whatsapp')) source = 'whatsapp';
          else if (log.action.toLowerCase().includes('delhivery') || log.action.toLowerCase().includes('rtd')) source = 'delhivery';
          else if (log.action.toLowerCase().includes('system') || log.action.toLowerCase().includes('auto')) source = 'system';

          addEvent(
            log.id,
            log.timestamp,
            log.action,
            `Action executed by ${log.who || 'System Desk'}${
              log.oldValue && log.newValue ? ` (Changed from "${log.oldValue}" to "${log.newValue}")` : ''
            }.`,
            source
          );
        });
    }

    // 3. Synthesize chronological milestones from order data fields

    // (A) Order Placement Event
    if (order.createdAt) {
      const cleanPhone = (order.customer?.phone || order.customer?.mobile || '').replace(/\D/g, '');
      const payLabel = order.paymentMode === 'COD' ? 'Cash on Delivery (COD)' : 'Prepaid Payment';
      addEvent(
        `evt-create-${order.id}`,
        order.createdAt,
        'Order Placed',
        `Customer placed order for ₹${order.total.toLocaleString('en-IN')} via ${payLabel}. Delivery address: ${order.customer?.city || ''}, ${order.customer?.state || ''} (${order.customer?.pincode || ''}). Initial queue: Upcoming.`,
        'customer'
      );
    }

    // (B) Automated WhatsApp Confirmation Dispatched
    const waSentTime = order.confirmationSentAt || order.whatsappSentAt;
    if (waSentTime || order.whatsappStatus) {
      const time = waSentTime || order.createdAt;
      const cleanPhone = (order.customer?.phone || order.customer?.mobile || '').replace(/\D/g, '');
      addEvent(
        `evt-wa-sent-${order.id}`,
        time,
        'Automated WhatsApp Confirmation Sent',
        `Automated order confirmation message dispatched to customer (+91 ${cleanPhone}) via Meta WhatsApp Cloud API from official business line (+91 73027 97464).`,
        'whatsapp'
      );
    }

    // (C) 23h Gentle Reminder Sent
    if (order.reminder23hSent && order.reminder23hSentAt) {
      addEvent(
        `evt-wa-remind-${order.id}`,
        order.reminder23hSentAt,
        'WhatsApp Reminder Sent',
        '23-hour automated follow-up reminder sent via WhatsApp Cloud API awaiting customer confirmation.',
        'whatsapp'
      );
    }

    // (D) Customer Confirmation Event (via WhatsApp or Phone/Desk)
    if (order.customerConfirmed || order.customerConfirmedAt || order.whatsappReplyAt) {
      const confirmTime = order.customerConfirmedAt || order.whatsappReplyAt || order.createdAt;
      const method = order.codVerifiedBy || 'WhatsApp Reply';
      const replyText = order.whatsappReply || 'YES';
      addEvent(
        `evt-confirmed-${order.id}`,
        confirmTime,
        'Customer Confirmed Order',
        `Customer verified the order (Reply: "${replyText}") via ${method}. Status automatically advanced to Confirmed.`,
        'whatsapp'
      );
    }

    // (E) Ready to Dispatch (RTD) / Acceptance
    if (order.rtdAt || order.acceptedAt || order.orderStatus === 'RTD') {
      const rtdTime = order.rtdAt || order.acceptedAt || order.customerConfirmedAt || order.createdAt;
      addEvent(
        `evt-rtd-${order.id}`,
        rtdTime,
        'Moved to Ready to Dispatch (RTD)',
        'Order accepted for fulfillment. Items assigned for packing and courier pickup preparation.',
        'system'
      );
    }

    // (F) Delhivery Logistics Waybill & Courier Generation
    if (order.awb_number) {
      const awbTime = order.rtdAt || order.acceptedAt || order.createdAt;
      const courierName = order.selected_courier_name || 'Delhivery Surface Logistics';
      addEvent(
        `evt-delhivery-awb-${order.id}`,
        awbTime,
        'Delhivery Waybill Generated',
        `Official Waybill #${order.awb_number} generated via Delhivery One Logistics API. Pickup hub assigned: REDMODE B2C, Meerut (250002). Service: ${courierName}.`,
        'delhivery'
      );
    }

    // (G) Shipping Label & Packing Slip Prepared
    if (order.labelDownloaded || order.labelDownloadedAt) {
      const labelTime = order.labelDownloadedAt || order.rtdAt || order.createdAt;
      addEvent(
        `evt-label-${order.id}`,
        labelTime,
        'Shipping Label Generated',
        'Thermal shipping label with barcode & Delhivery routing slip prepared for manifest.',
        'system'
      );
    }

    // (H) In Transit / Dispatched
    if (
      order.orderStatus === 'In Transit' ||
      order.orderStatus === 'Shipped' ||
      order.shipmozo?.shippedAt ||
      order.shipment_status === 'In Transit'
    ) {
      const transitTime = order.shipmozo?.shippedAt || order.rtdAt || order.createdAt;
      addEvent(
        `evt-transit-${order.id}`,
        transitTime,
        'Package Handed Over & In Transit',
        `Shipment dispatched with Delhivery logistics network. Package is in transit to destination pin ${order.customer?.pincode || ''}.`,
        'delhivery'
      );
    }

    // (I) Tracking Link Dispatched
    if (order.trackingSentToCustomer && order.trackingSentAt) {
      addEvent(
        `evt-track-sent-${order.id}`,
        order.trackingSentAt,
        'Delhivery Tracking Sent to Customer',
        `Live tracking URL (https://www.delhivery.com/track/package/${order.awb_number || ''}) dispatched to customer's WhatsApp.`,
        'whatsapp'
      );
    }

    // (J) Non-Delivery Report (NDR)
    if (order.ndrInfo?.hasNdr) {
      addEvent(
        `evt-ndr-${order.id}`,
        order.ndrInfo.timestamp || order.createdAt,
        'Delivery Issue Logged (NDR)',
        `Delhivery courier logged delivery exception: ${order.ndrInfo.reason || 'Customer not available'} (Attempt #${order.ndrInfo.attemptCount || 1}). Action: ${order.ndrInfo.action || 'Re-attempt scheduled'}.`,
        'delhivery'
      );
    }

    // (K) Return to Origin (RTO)
    if (order.rtoInfo?.isRto) {
      addEvent(
        `evt-rto-${order.id}`,
        order.rtoInfo.markedAt || order.createdAt,
        'Return to Origin (RTO) Logged',
        `Shipment marked as genuine RTO: ${order.rtoInfo.reason}${order.rtoInfo.courierRemarks ? ` (Courier remarks: "${order.rtoInfo.courierRemarks}")` : ''}. COD privileges restricted.`,
        'delhivery'
      );
    }

    // (L) Delivered / Completed
    if (order.orderStatus === 'Delivered' || order.orderStatus === 'Completed') {
      addEvent(
        `evt-delivered-${order.id}`,
        order.reviewRequestSentAt || order.createdAt,
        'Order Delivered Successfully',
        'Customer received package. Delivery proof confirmed by courier network.',
        'delhivery'
      );
    }

    // (M) Cancelled / Expired
    if (
      order.orderStatus === 'Cancelled' ||
      order.orderStatus === 'CANCELLED' ||
      order.orderStatus === 'Expired' ||
      order.isExpired
    ) {
      addEvent(
        `evt-cancelled-${order.id}`,
        order.expiredAt || order.createdAt,
        'Order Cancelled',
        'Order cancelled. Customer confirmation window timed out or order was cancelled at admin desk.',
        'system'
      );
    }

    // Sort chronologically based on selected toggle
    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [order, auditLogs, sortOrder]);

  // Pick an icon based on title/source
  const getEventIcon = (item: OrderActivityLogItem) => {
    const text = (item.title + ' ' + item.description).toLowerCase();
    if (text.includes('whatsapp') || text.includes('message')) {
      return <MessageSquare className="w-3.5 h-3.5 text-slate-700" />;
    }
    if (text.includes('delhivery') || text.includes('waybill') || text.includes('transit') || text.includes('courier')) {
      return <Truck className="w-3.5 h-3.5 text-slate-700" />;
    }
    if (text.includes('label') || text.includes('packing') || text.includes('invoice')) {
      return <FileText className="w-3.5 h-3.5 text-slate-700" />;
    }
    if (text.includes('rto') || text.includes('ndr') || text.includes('cancel') || text.includes('expired')) {
      return <AlertCircle className="w-3.5 h-3.5 text-slate-700" />;
    }
    if (text.includes('confirm') || text.includes('delivered') || text.includes('completed')) {
      return <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />;
    }
    if (text.includes('placed') || text.includes('rtd')) {
      return <Package className="w-3.5 h-3.5 text-slate-700" />;
    }
    return <Clock className="w-3.5 h-3.5 text-slate-700" />;
  };

  return (
    <div className="p-4 bg-slate-50/75 rounded-xl border border-slate-200">
      {/* Header without badges */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Activity Log & Timeline
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            ({activities.length} updates)
          </span>
        </div>

        {/* Chronological order toggle */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer transition px-2 py-0.5 rounded border border-slate-200 bg-white"
          title="Toggle sort direction"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
        </button>
      </div>

      {/* Clean Timeline List without colored badge pills */}
      <div className="mt-4 relative">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No activity updates recorded for this order yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-5">
            {/* Continuous vertical line connecting all events */}
            <div
              className="absolute left-2.75 top-2 bottom-2 w-px bg-slate-200"
              aria-hidden="true"
            />

            {activities.map((item, index) => {
              const isLatest = index === 0 && sortOrder === 'desc';
              return (
                <div key={item.id || index} className="relative group">
                  {/* Subtle Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${
                      isLatest
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    {isLatest ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    ) : (
                      getEventIcon(item)
                    )}
                  </div>

                  {/* Event Content - No badges, pristine typography */}
                  <div className="pt-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                      <time className="text-[11px] text-slate-500 font-mono">
                        {formatTimestamp(item.timestamp)}
                      </time>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
