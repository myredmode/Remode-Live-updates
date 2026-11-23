import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  XCircle,
  MessageSquare,
  Printer,
  Eye,
  Send,
  X,
  RotateCcw,
  Check,
  Tag,
  FileText,
  ExternalLink,
  Phone,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  Download,
  AlertOctagon,
  Loader2,
  Flag,
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Order, WhatsAppHealthState } from '../../types';
import { useStore } from '../../context/StoreContext';
import { OrderPrintModal } from './OrderPrintModal';
import { WhatsAppOrderModal } from './WhatsAppOrderModal';
import { OrderActivityLog } from './OrderActivityLog';
import { logAdminActivity } from '../../utils/activityLogger';
import { getOrderAwbNumber, hasRealDelhiveryAwb } from '../../utils/barcode128';

export type PrimaryOrderStatus = 'ALL' | 'Upcoming' | 'Confirmed' | 'RTD' | 'In Transit' | 'Completed' | 'Cancelled';

interface OrderManagementPanelProps {
  initialStatus?: PrimaryOrderStatus;
}

export const OrderManagementPanel: React.FC<OrderManagementPanelProps> = ({ initialStatus = 'Upcoming' }) => {
  const {
    orders,
    confirmCustomerOrder,
    confirmOrderManually,
    cancelOrderAtomically,
    retryOrderWhatsApp,
    markOrderForFollowUp,
    generateDelhiveryAwbForConfirmedOrder,
    downloadShippingLabelForOrder,
    bulkCancelOrders,
    updateOrderStatus,
    updateWhatsAppSettings,
    settings,
    exportOrdersToCSV,
    markOrderAsRto,
    setCustomerCodOverride,
    getCustomerCodEligibility,
  } = useStore();

  // Primary Status Tab
  const [activeStatus, setActiveStatus] = useState<PrimaryOrderStatus>(initialStatus);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'COD' | 'Prepaid'>('ALL');
  const [confirmationFilter, setConfirmationFilter] = useState<
    | 'ALL'
    | 'ALL_UPCOMING'
    | 'WAITING_YES'
    | 'WA_FAILED'
    | 'MANUAL_FOLLOWUP'
    | 'MANUALLY_CONFIRMED'
    | 'WHATSAPP_CONFIRMED'
  >('ALL');

  // Real Backend WhatsApp API Health Indicator & Automation Toggle
  const [waHealth, setWaHealth] = useState<WhatsAppHealthState | null>(null);
  const [waHealthLoading, setWaHealthLoading] = useState<boolean>(false);
  const isWaAutomationOn = settings.whatsappSettings?.enabled !== false;

  // Hybrid Confirmation Action States & Modals
  const [manualConfirmOrder, setManualConfirmOrder] = useState<Order | null>(null);
  const [manualConfirmChecked, setManualConfirmChecked] = useState<boolean>(false);
  const [manualConfirmNote, setManualConfirmNote] = useState<string>('');
  const [isSubmittingManualConfirm, setIsSubmittingManualConfirm] = useState<boolean>(false);

  const [singleCancelOrder, setSingleCancelOrder] = useState<Order | null>(null);
  const [singleCancelReason, setSingleCancelReason] = useState<string>('Customer did not confirm / Admin cancelled');
  const [isSubmittingSingleCancel, setIsSubmittingSingleCancel] = useState<boolean>(false);

  const [retryingWaOrderId, setRetryingWaOrderId] = useState<string | null>(null);
  const [togglingFollowUpOrderId, setTogglingFollowUpOrderId] = useState<string | null>(null);

  // Bulk Selection & Delhivery Label/AWB Loading States
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [verifyingAwb, setVerifyingAwb] = useState<string | null>(null);
  const [isSyncingAllScans, setIsSyncingAllScans] = useState(false);
  const [downloadingLabelOrderId, setDownloadingLabelOrderId] = useState<string | null>(null);
  const [generatingAwbOrderId, setGeneratingAwbOrderId] = useState<string | null>(null);
  const [isBulkDownloadingLabels, setIsBulkDownloadingLabels] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'CANCEL'>('CANCEL');

  // Modals & Drawers
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [selectedBulkOrdersForPrint, setSelectedBulkOrdersForPrint] = useState<Order[] | null>(null);
  const [isBulkStatusMenuOpen, setIsBulkStatusMenuOpen] = useState(false);
  const [printModalTab, setPrintModalTab] = useState<'invoice' | 'label'>('invoice');
  const [isRtoDropdownOpen, setIsRtoDropdownOpen] = useState(false);

  const getAdminAuthHeaders = (): Record<string, string> => {
    const token =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWhatsAppHealth = useCallback(async (forceRefresh = false) => {
    setWaHealthLoading(true);
    try {
      const url = forceRefresh ? '/api/admin/whatsapp/health?refresh=1' : '/api/admin/whatsapp/health';
      const res = await fetch(url, {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.status) {
        setWaHealth({
          status: data.status,
          automationEnabled: Boolean(data.automationEnabled),
          checkedAt: data.checkedAt || new Date().toISOString(),
          message: data.message || '',
          verifiedName: data.verifiedName,
          displayPhoneNumber: data.displayPhoneNumber,
          httpStatus: data.httpStatus,
        });
      } else {
        setWaHealth({
          status: 'Temporarily Unavailable',
          automationEnabled: isWaAutomationOn,
          checkedAt: new Date().toISOString(),
          message: data?.message || 'Unable to verify Meta WhatsApp Cloud API health.',
        });
      }
    } catch {
      setWaHealth({
        status: 'Temporarily Unavailable',
        automationEnabled: isWaAutomationOn,
        checkedAt: new Date().toISOString(),
        message: 'Could not reach health endpoint. Manual order confirmation remains fully operational.',
      });
    } finally {
      setWaHealthLoading(false);
    }
  }, [isWaAutomationOn]);

  useEffect(() => {
    void fetchWhatsAppHealth(false);
  }, [fetchWhatsAppHealth]);

  // Active detail order kept synchronized with live store updates
  const activeDetailOrder = useMemo(() => {
    if (!selectedOrderForDetails) return null;
    return orders.find((o) => o.id === selectedOrderForDetails.id) || selectedOrderForDetails;
  }, [selectedOrderForDetails, orders]);

  const RTO_REASONS = [
    'Customer Refused Delivery',
    'Wrong Address',
    'Customer Not Available',
    'Cash Not Ready',
    'Address Untraceable',
  ];

  // Quick Action Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Dedicated Date Range Export CSV Modal State
  const [isDateExportModalOpen, setIsDateExportModalOpen] = useState(false);
  const [exportDatePreset, setExportDatePreset] = useState<
    'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom'
  >('30days');
  const [exportCustomStart, setExportCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [exportCustomEnd, setExportCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportStatusScope, setExportStatusScope] = useState<PrimaryOrderStatus>('ALL');

  // Lock background scroll when date export modal is open
  React.useEffect(() => {
    if (isDateExportModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsDateExportModalOpen(false);
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isDateExportModalOpen]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Status Mapping Logic (Preserving all approved stages + Manual Follow-Up in Upcoming)
  const mapOrderToPrimaryStatus = (order: Order): PrimaryOrderStatus => {
    const rawStatus = (order.orderStatus || '').toLowerCase();
    const isConfirmed = order.customerConfirmed === true || rawStatus === 'confirmed';

    if (rawStatus.includes('cancel') || rawStatus.includes('expire') || order.isExpired === true) {
      return 'Cancelled';
    }
    if (rawStatus.includes('deliver') || rawStatus === 'completed') {
      return 'Completed';
    }
    if (
      rawStatus.includes('transit') ||
      rawStatus.includes('shipped') ||
      rawStatus.includes('out for delivery') ||
      rawStatus.includes('picked up')
    ) {
      return 'In Transit';
    }
    if (
      rawStatus === 'rtd' ||
      rawStatus.includes('ready to ship') ||
      rawStatus.includes('ready to dispatch') ||
      rawStatus === 'booked'
    ) {
      return 'RTD';
    }
    if (isConfirmed) {
      return 'Confirmed';
    }
    // Unconfirmed orders (including 23h reminded & needsManualFollowUp) stay in Upcoming and never auto-ship
    return 'Upcoming';
  };

  // Counts for each of the Primary Statuses
  const statusCounts = useMemo(() => {
    const counts: Record<PrimaryOrderStatus, number> = {
      ALL: orders.length,
      Upcoming: 0,
      Confirmed: 0,
      RTD: 0,
      'In Transit': 0,
      Completed: 0,
      Cancelled: 0,
    };

    orders.forEach((order) => {
      const cat = mapOrderToPrimaryStatus(order);
      counts[cat]++;
    });

    return counts;
  }, [orders]);

  // Filtered Orders for Current Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status check
      if (activeStatus !== 'ALL') {
        const orderCat = mapOrderToPrimaryStatus(order);
        if (orderCat !== activeStatus) return false;
      }

      // 2. Global search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = order.id.toLowerCase().includes(q);
        const nameMatch = (order.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (order.customer?.phone || order.customer?.mobile || '').includes(q);
        const cityMatch = (order.customer?.city || '').toLowerCase().includes(q);
        const itemsMatch = (order.items || []).some((item) => item.name.toLowerCase().includes(q));
        const awbMatch = (order.awb_number || '').toLowerCase().includes(q);

        if (!idMatch && !nameMatch && !phoneMatch && !cityMatch && !itemsMatch && !awbMatch) {
          return false;
        }
      }

      // 3. Payment Filter
      if (paymentFilter !== 'ALL') {
        const mode = order.paymentMode || 'COD';
        if (paymentFilter === 'COD' && mode !== 'COD') return false;
        if (paymentFilter === 'Prepaid' && mode === 'COD') return false;
      }

      // 4. Hybrid Confirmation Filter (6 dedicated views)
      if (confirmationFilter !== 'ALL') {
        const orderCat = mapOrderToPrimaryStatus(order);
        const isConfirmedOrd =
          order.customerConfirmed === true ||
          orderCat === 'Confirmed' ||
          orderCat === 'RTD' ||
          orderCat === 'In Transit' ||
          orderCat === 'Completed';
        const isWaFailed =
          order.whatsappStatus === 'Failed' || order.whatsappDeliveryStatus === 'failed';
        const isManualConfirmed =
          isConfirmedOrd &&
          (order.confirmationMethod === 'Manual' ||
            String(order.codVerifiedBy || '').toLowerCase().includes('manual') ||
            String(order.codVerifiedBy || '').toLowerCase().includes('phone') ||
            String(order.codVerifiedBy || '').toLowerCase().includes('admin'));
        const isWhatsAppConfirmed =
          isConfirmedOrd && !isManualConfirmed &&
          (order.confirmationMethod === 'WhatsApp' ||
            order.whatsappReply === 'YES' ||
            order.whatsappStatus === 'Confirmed' ||
            order.customerConfirmed === true);

        if (confirmationFilter === 'ALL_UPCOMING' && orderCat !== 'Upcoming') return false;
        if (confirmationFilter === 'WAITING_YES') {
          if (orderCat !== 'Upcoming' || isWaFailed || order.needsManualFollowUp) return false;
        }
        if (confirmationFilter === 'WA_FAILED') {
          if (!isWaFailed) return false;
        }
        if (confirmationFilter === 'MANUAL_FOLLOWUP') {
          if (orderCat !== 'Upcoming' || (!order.needsManualFollowUp && !isWaFailed)) return false;
        }
        if (confirmationFilter === 'MANUALLY_CONFIRMED' && !isManualConfirmed) return false;
        if (confirmationFilter === 'WHATSAPP_CONFIRMED' && !isWhatsAppConfirmed) return false;
      }

      // 5. Date Filter
      if (dateFilter !== 'ALL') {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'TODAY') {
          if (orderDate < startOfToday) return false;
        } else if (dateFilter === 'YESTERDAY') {
          const startOfYesterday = new Date(startOfToday);
          startOfYesterday.setDate(startOfYesterday.getDate() - 1);
          if (orderDate < startOfYesterday || orderDate >= startOfToday) return false;
        } else if (dateFilter === 'LAST_7_DAYS') {
          const sevenDaysAgo = new Date(startOfToday);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        }
      }

      return true;
    });
  }, [orders, activeStatus, searchQuery, paymentFilter, confirmationFilter, dateFilter]);

  // Compute matching orders and stats specifically for the Date Range Export Modal
  const matchingOrdersForExport = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      // 1. Status scope filter inside export modal
      if (exportStatusScope !== 'ALL') {
        const cat = mapOrderToPrimaryStatus(o);
        if (cat !== exportStatusScope) return false;
      }

      // 2. Date filtering
      const t = new Date(o.createdAt).getTime();
      if (isNaN(t)) return false;

      switch (exportDatePreset) {
        case 'today':
          return t >= startOfToday;
        case 'yesterday':
          return t >= startOfToday - oneDayMs && t < startOfToday;
        case '7days':
          return t >= startOfToday - 7 * oneDayMs;
        case '30days':
          return t >= startOfToday - 30 * oneDayMs;
        case 'this_month': {
          const d = new Date(t);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        case 'last_month': {
          const d = new Date(t);
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
        }
        case 'custom': {
          if (exportCustomStart) {
            const startT = new Date(exportCustomStart).setHours(0, 0, 0, 0);
            if (t < startT) return false;
          }
          if (exportCustomEnd) {
            const endT = new Date(exportCustomEnd).setHours(23, 59, 59, 999);
            if (t > endT) return false;
          }
          return true;
        }
        default:
          return true;
      }
    });
  }, [orders, exportDatePreset, exportCustomStart, exportCustomEnd, exportStatusScope]);

  const exportStats = useMemo(() => {
    const totalRev = matchingOrdersForExport.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalQty = matchingOrdersForExport.reduce(
      (acc, o) => acc + o.items.reduce((s, it) => s + (it.quantity || 1), 0),
      0
    );
    return { revenue: totalRev, items: totalQty };
  }, [matchingOrdersForExport]);

  const handleExecuteDateExport = () => {
    if (matchingOrdersForExport.length === 0) {
      showToast('No orders found for the selected date range.', 'info');
      return;
    }
    const result = exportOrdersToCSV(matchingOrdersForExport, {
      preset: exportDatePreset,
      startDate: exportCustomStart,
      endDate: exportCustomEnd,
    });
    showToast(`Exported ${result.count} order(s) for date range (${exportDatePreset}) to CSV!`);
    logAdminActivity({
      action: `Exported ${result.count} orders to CSV (Date Range: ${exportDatePreset})`,
      type: 'manifest_download',
      target: 'Orders CSV',
    });
    setIsDateExportModalOpen(false);
  };

  // Bulk Selection Handlers
  const isAllSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every((o) => selectedOrderIds.includes(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  // Generate / Retry Real Delhivery AWB for a Confirmed order (Strictly keeps order in Confirmed — NEVER moves to RTD)
  const handleGenerateRealAwb = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGeneratingAwbOrderId(order.id);
    try {
      const res = await generateDelhiveryAwbForConfirmedOrder(order);
      if (res.success && res.awb) {
        showToast(
          res.alreadyExists
            ? `Order ${order.id} already has real Delhivery AWB #${res.awb}. Download Shipping Label to move to RTD.`
            : `Real Delhivery AWB #${res.awb} generated for Order ${order.id}. Download Shipping Label to move to RTD.`,
          'success'
        );
      } else {
        showToast(res.message || `Could not generate Delhivery AWB for Order ${order.id}.`, 'error');
      }
    } finally {
      setGeneratingAwbOrderId(null);
    }
  };

  // Download actual scannable shipping label (ONLY after successful download does Confirmed -> RTD trigger)
  const handleDownloadShippingLabel = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!hasRealDelhiveryAwb(order)) {
      showToast(
        `Order ${order.id} does not have a real Delhivery AWB yet. Click "Generate Real AWB" first.`,
        'error'
      );
      return;
    }

    setDownloadingLabelOrderId(order.id);
    try {
      const res = await downloadShippingLabelForOrder(order.id);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setDownloadingLabelOrderId(null);
    }
  };

  // Bulk Download Shipping Labels (Transitions ONLY Confirmed orders whose labels actually downloaded cleanly)
  const handleBulkDownloadShippingLabels = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    const selectedOrders = orders.filter((o) => orderIds.includes(o.id));
    const eligible = selectedOrders.filter((o) => hasRealDelhiveryAwb(o));
    const skippedCount = selectedOrders.length - eligible.length;

    if (eligible.length === 0) {
      showToast(
        'None of the selected orders have a real Delhivery AWB yet. Generate real Delhivery AWBs on Confirmed orders first.',
        'error'
      );
      return;
    }

    setIsBulkDownloadingLabels(true);
    let downloadedCount = 0;
    let movedToRtdCount = 0;
    let failedCount = 0;

    try {
      for (const ord of eligible) {
        const res = await downloadShippingLabelForOrder(ord.id);
        if (res.success) {
          downloadedCount++;
          if (res.transitionedToRtd) movedToRtdCount++;
        } else {
          failedCount++;
        }
      }

      if (downloadedCount > 0) {
        const parts = [`Downloaded ${downloadedCount} label(s)`];
        if (movedToRtdCount > 0) parts.push(`${movedToRtdCount} Confirmed order(s) moved to RTD`);
        if (skippedCount > 0) parts.push(`${skippedCount} skipped (no real AWB)`);
        if (failedCount > 0) parts.push(`${failedCount} failed (remained Confirmed)`);
        showToast(parts.join(' • '), 'success');
        clearSelection();
      } else {
        showToast('Shipping label downloads failed. Confirmed orders remain in Confirmed.', 'error');
      }
    } finally {
      setIsBulkDownloadingLabels(false);
    }
  };

  // Bulk Cancel Execution
  const handleExecuteBulkCancel = () => {
    if (selectedOrderIds.length === 0) return;
    const result = bulkCancelOrders(selectedOrderIds, 'Admin bulk cancelled');
    showToast(`${result.successCount} order(s) moved to Cancelled`, 'info');
    setIsBulkModalOpen(false);
    clearSelection();
  };

  // Single Order Move from Upcoming -> Confirmed (Customer Replies YES -> auto-creates real Delhivery AWB)
  const handleCustomerSaidYes = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    confirmCustomerOrder(order.id, 'WhatsApp Reply');
    showToast(`Order ${order.id} confirmed! Generating real Delhivery AWB (stays Confirmed until label is downloaded).`);
  };

  // Hybrid Confirmation Filter Counts
  const confirmationFilterCounts = useMemo(() => {
    let allUpcoming = 0;
    let waitingYes = 0;
    let waFailed = 0;
    let manualFollowUp = 0;
    let manuallyConfirmed = 0;
    let whatsappConfirmed = 0;

    orders.forEach((order) => {
      const cat = mapOrderToPrimaryStatus(order);
      const isConfirmedOrd =
        order.customerConfirmed === true ||
        cat === 'Confirmed' ||
        cat === 'RTD' ||
        cat === 'In Transit' ||
        cat === 'Completed';
      const isWaFailed = order.whatsappStatus === 'Failed' || order.whatsappDeliveryStatus === 'failed';
      const isManualConfirmed =
        isConfirmedOrd &&
        (order.confirmationMethod === 'Manual' ||
          String(order.codVerifiedBy || '').toLowerCase().includes('manual') ||
          String(order.codVerifiedBy || '').toLowerCase().includes('phone') ||
          String(order.codVerifiedBy || '').toLowerCase().includes('admin'));
      const isWhatsAppConfirmed = isConfirmedOrd && !isManualConfirmed;

      if (cat === 'Upcoming') {
        allUpcoming++;
        if (order.needsManualFollowUp || isWaFailed) {
          manualFollowUp++;
        } else {
          waitingYes++;
        }
      }
      if (isWaFailed) waFailed++;
      if (isManualConfirmed) manuallyConfirmed++;
      if (isWhatsAppConfirmed) whatsappConfirmed++;
    });

    return {
      allUpcoming,
      waitingYes,
      waFailed,
      manualFollowUp,
      manuallyConfirmed,
      whatsappConfirmed,
    };
  }, [orders]);

  // Toggle WhatsApp Automation ON/OFF (Never blocks checkout, DB, manual confirm, or Delhivery)
  const handleToggleWhatsAppAutomation = () => {
    const nextEnabled = !isWaAutomationOn;
    updateWhatsAppSettings({ enabled: nextEnabled });
    showToast(
      nextEnabled
        ? 'WhatsApp Automation turned ON. New orders will send automatic confirmation; old historical orders will NOT be resent.'
        : 'WhatsApp Automation turned OFF. Checkout, order saving, manual confirmation, and Delhivery shipping remain 100% active.',
      'info'
    );
    setTimeout(() => {
      void fetchWhatsAppHealth(true);
    }, 350);
  };

  // Open Dedicated Manual Order Confirmation Modal
  const openManualConfirmModal = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setManualConfirmOrder(order);
    setManualConfirmChecked(false);
    setManualConfirmNote('');
  };

  const handleSubmitManualConfirm = async () => {
    if (!manualConfirmOrder || !manualConfirmChecked) return;
    setIsSubmittingManualConfirm(true);
    try {
      const res = await confirmOrderManually(manualConfirmOrder.id, manualConfirmNote);
      if (res.success) {
        showToast(res.message, 'success');
        setManualConfirmOrder(null);
        setManualConfirmChecked(false);
        setManualConfirmNote('');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSubmittingManualConfirm(false);
    }
  };

  // Single Atomic Cancel Modal Handler
  const openSingleCancelModal = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSingleCancelOrder(order);
    setSingleCancelReason('Customer requested cancellation / did not confirm');
  };

  const handleSubmitSingleCancel = async () => {
    if (!singleCancelOrder) return;
    setIsSubmittingSingleCancel(true);
    try {
      const res = await cancelOrderAtomically(singleCancelOrder.id, singleCancelReason);
      if (res.success) {
        showToast(res.message, 'info');
        setSingleCancelOrder(null);
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSubmittingSingleCancel(false);
    }
  };

  // Retry WhatsApp Confirmation
  const handleRetryWhatsApp = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRetryingWaOrderId(order.id);
    try {
      const res = await retryOrderWhatsApp(order.id);
      showToast(res.message, res.success ? 'success' : 'error');
    } finally {
      setRetryingWaOrderId(null);
    }
  };

  // Mark / Unmark for Manual Follow-up
  const handleToggleFollowUp = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingFollowUpOrderId(order.id);
    try {
      const nextFlagged = !order.needsManualFollowUp;
      const res = await markOrderForFollowUp(
        order.id,
        nextFlagged,
        nextFlagged ? 'Marked for manual follow-up by admin' : ''
      );
      showToast(res.message, res.success ? 'info' : 'error');
    } finally {
      setTogglingFollowUpOrderId(null);
    }
  };

  // Helper to format WhatsApp delivery status cleanly
  const getWhatsAppDisplayStatus = (order: Order): { label: string; cls: string } => {
    const rawWs = order.whatsappStatus;
    const rawDel = order.whatsappDeliveryStatus;
    if (rawWs === 'Failed' || rawDel === 'failed') {
      return { label: 'Failed', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (rawDel === 'read') {
      return { label: 'Read', cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
    if (rawDel === 'delivered') {
      return { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (rawWs === 'Scheduled' || rawDel === 'scheduled' || (order.scheduledConfirmationTime && !order.confirmationSentAt)) {
      return { label: 'Scheduled', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (rawWs === 'Sent' || rawDel === 'sent' || rawWs === 'Confirmed' || order.confirmationSentAt) {
      return { label: 'Sent', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    return { label: 'Pending', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
  };

  const getOrderAwb = (order?: Order | null): string | undefined => {
    const awb = getOrderAwbNumber(order);
    return awb || undefined;
  };

  // Verify if Delhivery Delivery Partner has scanned the parcel barcode in portal
  const handleVerifyDelhiveryPickup = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const awb = getOrderAwb(order);
    if (!awb) {
      showToast(`Order #${order.id} ke liye AWB number nahi mila. Pehle shipping waybill generate karein.`, 'error');
      return;
    }

    setVerifyingAwb(awb);
    try {
      const res = await fetch(`/api/delhivery/track/${encodeURIComponent(awb)}`);
      const data = await res.json();
      if (data.isPickedUp || data.status === 'In Transit' || data.status === 'Shipped' || data.status === 'Dispatched') {
        updateOrderStatus(order.id, 'In Transit');
        showToast(`✅ Delhivery Scan Verified! Delivery partner ne parcel scan kar liya (AWB #${awb}). Order In Transit me move ho gaya.`);
      } else {
        showToast(`⏳ Delhivery Portal: AWB #${awb} abhi "${data.status || 'Manifested'}" hai. Delivery partner ne scan nahi maara.`);
      }
    } catch {
      showToast(`Delhivery portal se connect karne me dikkat aayi (AWB #${awb}).`, 'error');
    } finally {
      setVerifyingAwb(null);
    }
  };

  // Bulk Verify Delhivery scans for multiple orders
  const handleBulkCheckDelhiveryScans = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    setIsSyncingAllScans(true);
    let movedCount = 0;
    try {
      for (const id of orderIds) {
        const ord = orders.find((o) => o.id === id);
        const awb = getOrderAwb(ord);
        if (!awb) continue;
        try {
          const res = await fetch(`/api/delhivery/track/${encodeURIComponent(awb)}`);
          const data = await res.json();
          if (data.isPickedUp || data.status === 'In Transit' || data.status === 'Shipped' || data.status === 'Dispatched') {
            updateOrderStatus(id, 'In Transit');
            movedCount++;
          }
        } catch {
          // ignore individual fetch errors
        }
      }

      if (movedCount > 0) {
        showToast(`✅ ${movedCount} orders ke Delhivery pickup scans verify ho gaye! Sabhi In Transit me shift ho gaye.`);
        clearSelection();
      } else {
        showToast('Delhivery Portal Status: Delivery partner ne abhi tak kisi bhi parcel ka pickup scan nahi maara. Sabhi RTD me hain.');
      }
    } finally {
      setIsSyncingAllScans(false);
    }
  };

  // Format Helpers
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getCleanCustomerPhone = (order: Order) => {
    const raw = order.customer?.phone || order.customer?.mobile || '';
    return raw.replace(/[^0-9]/g, '');
  };

  return (
    <div className="space-y-5">
      {/* 1. HEADER: Title, Live WhatsApp API Connection Indicator & Automation ON/OFF Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hybrid confirmation: Meta WhatsApp automation with full manual admin fallback.
            </p>
          </div>
        </div>

        {/* Live WhatsApp API Connection Indicator + Simple Automation ON/OFF Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real Backend Connection Indicator */}
          <div
            title={waHealth?.message || 'Checking Meta WhatsApp Cloud API connection'}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              waHealth?.status === 'Connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : waHealth?.status === 'Authentication Error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : waHealth?.status === 'Temporarily Unavailable'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {waHealth?.status === 'Connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : waHealth?.status === 'Authentication Error' ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span>WhatsApp API:</span>
            <span>{waHealthLoading && !waHealth ? 'Checking...' : waHealth?.status || 'Disconnected'}</span>
            <button
              type="button"
              onClick={() => void fetchWhatsAppHealth(true)}
              disabled={waHealthLoading}
              title="Refresh live Meta WhatsApp API health check"
              className="p-0.5 rounded hover:bg-black/5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${waHealthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Simple WhatsApp Automation ON / OFF Switch */}
          <button
            type="button"
            onClick={handleToggleWhatsAppAutomation}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              isWaAutomationOn
                ? 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                : 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
            }`}
            title="Toggle automatic WhatsApp confirmation ON or OFF. Turning OFF never affects checkout, database, manual confirmation, or Delhivery."
          >
            <span>WhatsApp Automation:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                isWaAutomationOn ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
              }`}
            >
              {isWaAutomationOn ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* META API DOWNTIME / AUTOMATION OFF / FAILED WHATSAPP ALERT BANNER */}
      {((isWaAutomationOn && waHealth && waHealth.status !== 'Connected') ||
        !isWaAutomationOn ||
        confirmationFilterCounts.waFailed > 0) && (
        <div
          className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            waHealth?.status === 'Authentication Error' || confirmationFilterCounts.waFailed > 0
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
            <div>
              <div className="font-bold">
                {!isWaAutomationOn
                  ? 'WhatsApp Automation is OFF — Manual Confirmation Mode Active'
                  : waHealth && waHealth.status !== 'Connected'
                  ? `Meta WhatsApp API: ${waHealth.status}`
                  : `${confirmationFilterCounts.waFailed} order(s) have failed WhatsApp confirmation`}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {waHealth && waHealth.status !== 'Connected' && isWaAutomationOn
                  ? `${waHealth.message || 'Automatic WhatsApp sends may fail.'} `
                  : ''}
                Checkout, database order saving, <strong>Confirm Manually</strong>, and Delhivery shipping continue normally without Meta API.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {confirmationFilterCounts.waFailed > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveStatus('Upcoming');
                  setConfirmationFilter('WA_FAILED');
                  clearSelection();
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
              >
                View Failed ({confirmationFilterCounts.waFailed})
              </button>
            )}
            {confirmationFilterCounts.manualFollowUp > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveStatus('Upcoming');
                  setConfirmationFilter('MANUAL_FOLLOWUP');
                  clearSelection();
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
              >
                Manual Follow-up ({confirmationFilterCounts.manualFollowUp})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTUAL ORDER STATUS TABS (Clickable Filters) */}
      <div className="flex items-center border-b border-slate-200 gap-6 sm:gap-8 overflow-x-auto scrollbar-none pb-px">
        {(
          [
            { key: 'Upcoming', label: 'Upcoming', count: statusCounts.Upcoming },
            { key: 'Confirmed', label: 'Confirmed', count: statusCounts.Confirmed },
            { key: 'RTD', label: 'RTD', count: statusCounts.RTD },
            { key: 'In Transit', label: 'In Transit', count: statusCounts['In Transit'] },
            { key: 'Completed', label: 'Completed', count: statusCounts.Completed },
            { key: 'Cancelled', label: 'Cancelled', count: statusCounts.Cancelled },
          ] as const
        ).map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveStatus(tab.key);
                setConfirmationFilter('ALL');
                clearSelection();
              }}
              className={`flex items-center gap-2 py-3 text-sm font-medium transition cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? 'border-slate-950 text-slate-950 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* HYBRID CONFIRMATION QUICK FILTERS (All 6 Required Views) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            { key: 'ALL_UPCOMING', label: 'All Upcoming', count: confirmationFilterCounts.allUpcoming, targetTab: 'Upcoming' as PrimaryOrderStatus },
            { key: 'WAITING_YES', label: 'Waiting for WhatsApp YES', count: confirmationFilterCounts.waitingYes, targetTab: 'Upcoming' as PrimaryOrderStatus },
            { key: 'WA_FAILED', label: 'WhatsApp Failed', count: confirmationFilterCounts.waFailed, targetTab: 'ALL' as PrimaryOrderStatus },
            { key: 'MANUAL_FOLLOWUP', label: 'Manual Follow-up', count: confirmationFilterCounts.manualFollowUp, targetTab: 'Upcoming' as PrimaryOrderStatus },
            { key: 'MANUALLY_CONFIRMED', label: 'Manually Confirmed', count: confirmationFilterCounts.manuallyConfirmed, targetTab: 'ALL' as PrimaryOrderStatus },
            { key: 'WHATSAPP_CONFIRMED', label: 'WhatsApp Confirmed', count: confirmationFilterCounts.whatsappConfirmed, targetTab: 'ALL' as PrimaryOrderStatus },
          ] as const
        ).map((f) => {
          const isSelected = confirmationFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                if (isSelected) {
                  setConfirmationFilter('ALL');
                  if (activeStatus === 'ALL') setActiveStatus('Upcoming');
                } else {
                  setConfirmationFilter(f.key);
                  setActiveStatus(f.targetTab);
                }
                clearSelection();
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : f.key === 'WA_FAILED' && f.count > 0
                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  : f.key === 'MANUAL_FOLLOWUP' && f.count > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
        {confirmationFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => {
              setConfirmationFilter('ALL');
              if (activeStatus === 'ALL') setActiveStatus('Upcoming');
            }}
            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* 4. SEARCH & FILTERS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, customer, phone..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs ${
                dateFilter !== 'ALL' || paymentFilter !== 'ALL' || confirmationFilter !== 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(dateFilter !== 'ALL' || paymentFilter !== 'ALL' || confirmationFilter !== 'ALL') && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>

            {/* Filter Popover */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-40 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-900">Filter Orders</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('ALL');
                      setPaymentFilter('ALL');
                      setConfirmationFilter('ALL');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e: any) => setDateFilter(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today Only</option>
                    <option value="YESTERDAY">Yesterday</option>
                    <option value="LAST_7_DAYS">Last 7 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentFilter}
                    onChange={(e: any) => setPaymentFilter(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="ALL">All Payment Types</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="Prepaid">Prepaid (Online)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Confirmation Queue
                  </label>
                  <select
                    value={confirmationFilter}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setConfirmationFilter(val);
                      if (val === 'MANUALLY_CONFIRMED' || val === 'WHATSAPP_CONFIRMED' || val === 'WA_FAILED') {
                        setActiveStatus('ALL');
                      } else if (val === 'ALL_UPCOMING' || val === 'WAITING_YES' || val === 'MANUAL_FOLLOWUP') {
                        setActiveStatus('Upcoming');
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="ALL">All States</option>
                    <option value="ALL_UPCOMING">All Upcoming</option>
                    <option value="WAITING_YES">Waiting for WhatsApp YES</option>
                    <option value="WA_FAILED">WhatsApp Failed</option>
                    <option value="MANUAL_FOLLOWUP">Manual Follow-up</option>
                    <option value="MANUALLY_CONFIRMED">Manually Confirmed</option>
                    <option value="WHATSAPP_CONFIRMED">WhatsApp Confirmed</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Orders to CSV Controls (With every detail) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const ordersToExport =
                  selectedOrderIds.length > 0
                    ? orders.filter((o) => selectedOrderIds.includes(o.id))
                    : filteredOrders;
                exportOrdersToCSV(ordersToExport);
                showToast(`Exported ${ordersToExport.length} order(s) history to detailed CSV!`);
                logAdminActivity({
                  action: `Exported ${ordersToExport.length} orders history to CSV with full details`,
                  type: 'manifest_download',
                  target: 'Orders CSV',
                });
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Download order history with complete customer, shipping, item and payment details"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>
                {selectedOrderIds.length > 0
                  ? `Export Selected (${selectedOrderIds.length}) CSV`
                  : activeStatus !== 'ALL' || searchQuery || paymentFilter !== 'ALL' || confirmationFilter !== 'ALL' || dateFilter !== 'ALL'
                  ? `Export Filtered (${filteredOrders.length}) CSV`
                  : `Export Orders History (${orders.length}) CSV`}
              </span>
            </button>

            {/* Dedicated Date Range Export Button */}
            <button
              type="button"
              onClick={() => setIsDateExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Download orders CSV filtered by specific date or date range"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export by Date</span>
            </button>

            {/* Quick button to export ALL orders history if a status/search filter is currently active */}
            {(activeStatus !== 'ALL' || searchQuery || paymentFilter !== 'ALL' || confirmationFilter !== 'ALL' || dateFilter !== 'ALL' || selectedOrderIds.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  exportOrdersToCSV(orders);
                  showToast(`Exported complete all-time order history (${orders.length} orders) with every detail!`);
                  logAdminActivity({
                    action: `Exported all-time orders history (${orders.length} orders) to CSV`,
                    type: 'manifest_download',
                    target: 'All Orders CSV',
                  });
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Export complete all-time order history with every detail"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>All Orders ({orders.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>



      {/* 4. TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between shadow-xs transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-slate-900 text-white border-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="p-0.5 hover:opacity-75 cursor-pointer ml-4">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Confirmed Workflow Banner: Real Delhivery AWB + Manual Label Download -> RTD */}
      {activeStatus === 'Confirmed' && (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>Confirmed Orders • Real Delhivery AWB &amp; Label Download Gate</span>
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Real Delhivery AWBs are auto-generated on confirmation. Orders stay in <strong>Confirmed</strong> until you click <strong>&quot;Download Shipping Label&quot;</strong> — successful download automatically moves the order to <strong>RTD</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RTD Automated Dispatch Note Banner */}
      {activeStatus === 'RTD' && (
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <span>RTD (Ready to Dispatch) • Delhivery Surface Logistics</span>
                <span className="text-[10px] font-normal px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Barcode Scan Driven
                </span>
              </p>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                Orders tabhi <strong>"In Transit"</strong> me move honge jab Delhivery delivery pickup partner parcel scan marega aur status Delhivery portal me update hoga.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const rtdOrderIds = filteredOrders.map((o) => o.id);
              handleBulkCheckDelhiveryScans(rtdOrderIds);
            }}
            disabled={isSyncingAllScans || filteredOrders.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncingAllScans ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Sync Delhivery Portal Scans</span>
          </button>
        </div>
      )}

      {/* 5. DATA TABLE / LIST CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              {activeStatus === 'Upcoming' ? (
                <Clock className="w-6 h-6" />
              ) : activeStatus === 'Confirmed' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : activeStatus === 'RTD' ? (
                <Package className="w-6 h-6" />
              ) : (
                <Truck className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              {activeStatus === 'ALL'
                ? 'No orders found matching your search or filters'
                : activeStatus === 'Upcoming'
                ? 'No orders waiting for customer confirmation'
                : activeStatus === 'Confirmed'
                ? 'No confirmed orders awaiting accept'
                : activeStatus === 'RTD'
                ? 'No orders ready to dispatch'
                : activeStatus === 'In Transit'
                ? 'No orders currently in transit'
                : activeStatus === 'Completed'
                ? 'No completed orders'
                : 'No cancelled or expired orders'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery || dateFilter !== 'ALL'
                ? 'Try clearing your search query or filters to see more results.'
                : 'All orders in this queue have been processed or moved to their next operational stage.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer w-4 h-4"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="py-3 px-3.5">Order ID &amp; Date</th>
                  <th className="py-3 px-3.5">Customer &amp; Phone</th>
                  <th className="py-3 px-3.5">Items</th>
                  <th className="py-3 px-3.5">Amount &amp; Pay</th>
                  <th className="py-3 px-3.5">
                    {activeStatus === 'Upcoming' ? 'Confirmation Status' : 'Status'}
                  </th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isConfirmed = order.customerConfirmed === true || String(order.orderStatus || '').toLowerCase() === 'confirmed';
                  const customerName = order.customer?.name || 'Guest Customer';
                  const customerPhone = order.customer?.phone || order.customer?.mobile || '';
                  const firstItem = order.items?.[0];
                  const itemCount = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;
                  const orderCat = mapOrderToPrimaryStatus(order);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderForDetails(order)}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isSelected ? 'bg-slate-50/90' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Order ID & Date */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{order.id}</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {formatDateTime(order.createdAt)}
                        </div>
                      </td>

                      {/* Customer & Phone */}
                      <td className="py-3.5 px-3.5 max-w-[180px]">
                        <div className="font-medium text-slate-900 truncate">{customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{customerPhone || 'No phone'}</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-3.5 max-w-[220px]">
                        {firstItem ? (
                          <div className="flex items-center gap-2">
                            {firstItem.image && (
                              <img
                                src={firstItem.image}
                                alt={firstItem.name}
                                className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate text-[11px] leading-tight">
                                {firstItem.name}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Size {firstItem.size || 'Standard'} {itemCount > 1 && `(+${itemCount - 1} more)`}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">1 Item</span>
                        )}
                      </td>

                      {/* Amount & Payment */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">₹{order.total.toLocaleString('en-IN')}</div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              order.paymentMode === 'Prepaid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {order.paymentMode || 'COD'}
                          </span>
                        </div>
                      </td>

                      {/* Status / Confirmation (Clear Business Status + WhatsApp Status + Confirmation State) */}
                      <td className="py-3.5 px-3.5">
                        {(() => {
                          const waBadge = getWhatsAppDisplayStatus(order);
                          const isManualConf =
                            order.confirmationMethod === 'Manual' ||
                            String(order.codVerifiedBy || '').toLowerCase().includes('manual') ||
                            String(order.codVerifiedBy || '').toLowerCase().includes('phone') ||
                            String(order.codVerifiedBy || '').toLowerCase().includes('admin');

                          if (orderCat === 'Upcoming') {
                            const isWaFailed =
                              order.whatsappStatus === 'Failed' || order.whatsappDeliveryStatus === 'failed';
                            return (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold">
                                    Upcoming
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${waBadge.cls}`}
                                  >
                                    WA: {waBadge.label}
                                  </span>
                                </div>
                                {order.needsManualFollowUp || isWaFailed ? (
                                  <div className="space-y-0.5">
                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Manual Follow-up</span>
                                    </div>
                                    {(order.whatsappError || order.manualFollowUpReason) && (
                                      <div
                                        title={order.whatsappError || order.manualFollowUpReason}
                                        className="text-[10px] text-slate-500 max-w-[195px] truncate"
                                      >
                                        {order.whatsappError || order.manualFollowUpReason}
                                      </div>
                                    )}
                                  </div>
                                ) : order.scheduledConfirmationTime && !order.confirmationSentAt ? (
                                  <div className="text-[10px] text-indigo-700 font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    <span>Scheduled 10:00 AM IST</span>
                                  </div>
                                ) : order.reminder23hSent ? (
                                  <div className="text-[10px] text-amber-800 font-medium">
                                    23h Reminder Sent • Waiting for YES
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>Waiting for YES</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (orderCat === 'Confirmed') {
                            return (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                    Confirmed
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${waBadge.cls}`}
                                  >
                                    WA: {waBadge.label}
                                  </span>
                                </div>
                                <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                  {isManualConf ? (
                                    <>
                                      <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>
                                        Manually Confirmed
                                        {order.confirmedByAdminName ? ` (${order.confirmedByAdminName})` : ''}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>WhatsApp Confirmed</span>
                                    </>
                                  )}
                                </div>
                                {order.delhiveryShipmentStatus === 'creating' || generatingAwbOrderId === order.id ? (
                                  <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-medium">
                                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                    <span>Generating Delhivery AWB...</span>
                                  </div>
                                ) : hasRealDelhiveryAwb(order) ? (
                                  <>
                                    <div className="text-[10px] text-slate-700 font-mono font-semibold">
                                      AWB: {getOrderAwbNumber(order)}
                                    </div>
                                    <div className="text-[10px] text-amber-700 font-medium">
                                      Awaiting Label Download → RTD
                                    </div>
                                  </>
                                ) : order.delhiveryShipmentStatus === 'failed' ? (
                                  <div
                                    title={order.delhiveryShipmentError || 'Delhivery AWB creation failed'}
                                    className="text-[10px] text-rose-700 font-medium max-w-[190px] truncate"
                                  >
                                    AWB Error: {order.delhiveryShipmentError || 'Retry required'}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-500">
                                    Real Delhivery AWB pending
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (orderCat === 'RTD') {
                            return (
                              <div>
                                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                                  <Package className="w-3.5 h-3.5" />
                                  <span>Ready to Dispatch</span>
                                </div>
                                <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Awaiting Courier Scan</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  AWB: {order.awb_number || 'Generated'}
                                </div>
                              </div>
                            );
                          }

                          if (orderCat === 'In Transit') {
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-700 font-medium text-[11px]">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Shipped via Delhivery</span>
                                </div>
                                {order.ndrInfo?.hasNdr && (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                                    <span>NDR: {order.ndrInfo.reason}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (orderCat === 'Completed') {
                            return (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Delivered to Customer</span>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1">
                              {order.rtoInfo?.isRto ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] whitespace-nowrap">
                                  <span>RTO: {order.rtoInfo.reason}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-rose-700 font-medium text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Cancelled / Expired</span>
                                </div>
                              )}
                              {order.ndrInfo?.hasNdr && (
                                <div className="text-[10px] text-amber-700 font-medium">
                                  NDR: {order.ndrInfo.reason}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Upcoming Context Actions: 4 Explicit Hybrid Controls */}
                          {orderCat === 'Upcoming' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => openManualConfirmModal(order, e)}
                                title="Confirm order manually after contacting customer (works even if Meta API is down)"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm Manually</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRetryWhatsApp(order, e)}
                                disabled={retryingWaOrderId === order.id}
                                title="Retry sending WhatsApp confirmation message"
                                className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                {retryingWaOrderId === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3 h-3 text-slate-500" />
                                )}
                                <span>Retry WA</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleToggleFollowUp(order, e)}
                                disabled={togglingFollowUpOrderId === order.id}
                                title={
                                  order.needsManualFollowUp
                                    ? 'Clear Manual Follow-up flag'
                                    : 'Mark for Manual Follow-up'
                                }
                                className={`p-1 rounded border transition cursor-pointer disabled:opacity-50 ${
                                  order.needsManualFollowUp
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-white text-slate-500 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                                }`}
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => openSingleCancelModal(order, e)}
                                title="Cancel order and restore stock atomically once"
                                className="p-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded transition cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForWhatsApp(order)}
                                title="Open WhatsApp message details"
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-slate-200 transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Cancelled Context Actions (24h Unconfirmed / Call to Confirm option) */}
                          {orderCat === 'Cancelled' && (
                            <>
                              {order.customer?.phone && (
                                <span
                                  title="Customer Phone (Dial manually)"
                                  className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 select-all tracking-tight"
                                >
                                  {order.customer.phone}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmCustomerOrder(order.id, 'Phone Call');
                                  showToast(`Order #${order.id} confirmed via Phone Call! Moved to Confirmed tab.`);
                                }}
                                title="Verify customer on call & confirm order"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm (Called)</span>
                              </button>
                            </>
                          )}

                          {/* 1-Click Tax Invoice */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForPrint(order);
                              setSelectedBulkOrdersForPrint(null);
                              setPrintModalTab('invoice');
                            }}
                            title="Print Tax Invoice"
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>Invoice</span>
                          </button>

                          {/* Confirmed Context Actions: Real AWB + Prominent Download Shipping Label -> RTD */}
                          {orderCat === 'Confirmed' && (
                            <>
                              {hasRealDelhiveryAwb(order) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDownloadShippingLabel(order, e)}
                                    disabled={downloadingLabelOrderId === order.id}
                                    title="Download scannable Delhivery shipping label (moves order to RTD only after download succeeds)"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                                  >
                                    {downloadingLabelOrderId === order.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Download className="w-3 h-3" />
                                    )}
                                    <span>
                                      {downloadingLabelOrderId === order.id
                                        ? 'Downloading...'
                                        : 'Download Shipping Label'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrderForPrint(order);
                                      setSelectedBulkOrdersForPrint(null);
                                      setPrintModalTab('label');
                                    }}
                                    title="Preview shipping label (preview does not move order to RTD)"
                                    className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/90 rounded transition cursor-pointer shrink-0"
                                  >
                                    <Tag className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleGenerateRealAwb(order, e)}
                                  disabled={
                                    generatingAwbOrderId === order.id ||
                                    order.delhiveryShipmentStatus === 'creating'
                                  }
                                  title="Create real Delhivery shipment & obtain AWB (order stays Confirmed)"
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                                >
                                  {generatingAwbOrderId === order.id ||
                                  order.delhiveryShipmentStatus === 'creating' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Truck className="w-3 h-3" />
                                  )}
                                  <span>
                                    {order.delhiveryShipmentStatus === 'failed'
                                      ? 'Retry Real AWB'
                                      : 'Generate Real AWB'}
                                  </span>
                                </button>
                              )}
                            </>
                          )}

                          {/* RTD / In Transit / Completed Label Re-download (idempotent: never duplicates RTD transition) */}
                          {(orderCat === 'RTD' || orderCat === 'In Transit' || orderCat === 'Completed') &&
                            hasRealDelhiveryAwb(order) && (
                              <button
                                type="button"
                                onClick={(e) => handleDownloadShippingLabel(order, e)}
                                disabled={downloadingLabelOrderId === order.id}
                                title="Re-download scannable Delhivery shipping label"
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 border border-indigo-200/90 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                              >
                                {downloadingLabelOrderId === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3 text-indigo-600" />
                                )}
                                <span>Label</span>
                              </button>
                            )}

                          {/* RTD Context Actions - Delhivery Scan Check */}
                          {orderCat === 'RTD' && (
                            <button
                              type="button"
                              onClick={(e) => handleVerifyDelhiveryPickup(order, e)}
                              disabled={verifyingAwb === getOrderAwb(order)}
                              title="Check Delhivery Portal: verify if courier partner scanned parcel barcode"
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <RotateCcw
                                className={`w-3 h-3 ${verifyingAwb === getOrderAwb(order) ? 'animate-spin' : ''}`}
                              />
                              <span>Check Scan</span>
                            </button>
                          )}

                          {/* Global View Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForDetails(order)}
                            title="View full order details"
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. STICKY BULK-ACTION BAR (Shows only when 1+ orders selected) */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl flex flex-wrap items-center gap-2 sm:gap-3 z-40 border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{selectedOrderIds.length} Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700 shrink-0" />

          {/* Quick Bulk Status Update Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsBulkStatusMenuOpen(!isBulkStatusMenuOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-xs"
            >
              <span>Update Status</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isBulkStatusMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 text-slate-800 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bulk Status Change
                </div>
                <button
                  type="button"
                  onClick={() => {
                    selectedOrderIds.forEach((id) => confirmCustomerOrder(id, 'Admin Bulk Desk'));
                    showToast(
                      `✓ Marked ${selectedOrderIds.length} order(s) as Confirmed & queued real Delhivery AWBs (orders stay Confirmed until labels are downloaded).`
                    );
                    clearSelection();
                    setIsBulkStatusMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 rounded-lg flex items-center gap-2 cursor-pointer transition font-medium"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark as Confirmed</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkStatusMenuOpen(false);
                    void handleBulkDownloadShippingLabels(selectedOrderIds);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-slate-800 hover:text-blue-900 rounded-lg flex items-center gap-2 cursor-pointer transition font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Labels → Move to RTD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectedOrderIds.forEach((id) => updateOrderStatus(id, 'In Transit'));
                    showToast(`✓ Marked ${selectedOrderIds.length} orders as Shipped / In Transit!`);
                    clearSelection();
                    setIsBulkStatusMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 rounded-lg flex items-center gap-2 cursor-pointer transition font-medium"
                >
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mark as Shipped / In Transit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectedOrderIds.forEach((id) => updateOrderStatus(id, 'Delivered'));
                    showToast(`✓ Marked ${selectedOrderIds.length} orders as Delivered / Completed!`);
                    clearSelection();
                    setIsBulkStatusMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 rounded-lg flex items-center gap-2 cursor-pointer transition font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark as Completed / Delivered</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkStatusMenuOpen(false);
                    setBulkActionType('CANCEL');
                    setIsBulkModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 cursor-pointer transition font-medium"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Selected Orders</span>
                </button>
              </div>
            )}
          </div>

          {/* Bulk Download Verified Shipping Labels (Moves Confirmed -> RTD only after download succeeds) */}
          <button
            type="button"
            disabled={isBulkDownloadingLabels}
            onClick={() => void handleBulkDownloadShippingLabels(selectedOrderIds)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Download scannable Delhivery shipping labels (moves Confirmed orders to RTD only after download succeeds)"
          >
            {isBulkDownloadingLabels ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>
              {isBulkDownloadingLabels
                ? 'Downloading...'
                : `Download Shipping Labels (${selectedOrderIds.length})`}
            </span>
          </button>

          {/* Bulk 1-Click Print GST Invoices */}
          <button
            type="button"
            onClick={() => {
              const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
              if (selectedOrders.length > 0) {
                setPrintModalTab('invoice');
                setSelectedBulkOrdersForPrint(selectedOrders);
                setSelectedOrderForPrint(null);
                logAdminActivity({
                  action: `Bulk printed ${selectedOrders.length} GST Invoices`,
                  type: 'label_print',
                  target: selectedOrderIds.join(', '),
                });
              }
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
            title="1-Click Print All Selected GST Tax Invoices"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Invoices ({selectedOrderIds.length})</span>
          </button>

          {/* Export Selected to CSV */}
          <button
            type="button"
            onClick={() => {
              const ordersToExport = orders.filter((o) => selectedOrderIds.includes(o.id));
              exportOrdersToCSV(ordersToExport);
              showToast(`Exported ${ordersToExport.length} orders to CSV!`);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-700"
            title="Export Selected Orders to CSV"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-1"
          >
            Deselect
          </button>
        </div>
      )}

      {/* 7. BULK CANCEL CONFIRMATION DIALOG */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Cancel {selectedOrderIds.length} orders?
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              These {selectedOrderIds.length} orders will be moved to Cancelled. Customer confirmation will be marked as expired/rejected.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 max-h-36 overflow-y-auto space-y-1 text-xs">
              {selectedOrderIds.map((id) => (
                <div key={id} className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold">{id}</span>
                  <span className="text-[10px] text-slate-400">Selected</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Keep Orders
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkCancel}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer shadow-xs bg-rose-600 hover:bg-rose-700"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ORDER DETAILS MODAL / DRAWER */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">Order {selectedOrderForDetails.id}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                    {mapOrderToPrimaryStatus(selectedOrderForDetails)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {formatDateTime(selectedOrderForDetails.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Customer & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Customer Information
                  </span>
                  <div className="font-semibold text-slate-900">{selectedOrderForDetails.customer?.name}</div>
                  <div className="text-slate-600 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{selectedOrderForDetails.customer?.phone || selectedOrderForDetails.customer?.mobile}</span>
                  </div>
                  {selectedOrderForDetails.customer?.email && (
                    <div className="text-slate-500 mt-0.5">{selectedOrderForDetails.customer.email}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Delivery Address
                  </span>
                  <div className="text-slate-700 leading-relaxed">
                    {selectedOrderForDetails.customer?.house && `${selectedOrderForDetails.customer.house}, `}
                    {selectedOrderForDetails.customer?.address || selectedOrderForDetails.customer?.street}
                    <br />
                    {selectedOrderForDetails.customer?.city}, {selectedOrderForDetails.customer?.state} -{' '}
                    <strong>{selectedOrderForDetails.customer?.pincode}</strong>
                  </div>
                </div>
              </div>

              {/* Products List */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Order Items ({selectedOrderForDetails.items?.length || 0})
                </span>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {selectedOrderForDetails.items?.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Size: <span className="font-medium text-slate-800">{item.size || 'Free Size'}</span> | Qty:{' '}
                            <span className="font-medium text-slate-800">{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-semibold text-slate-900">
                        ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment Details
                  </span>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-500">Mode:</span>
                    <span className="font-bold text-slate-800">{selectedOrderForDetails.paymentMode || 'COD'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-slate-800">{selectedOrderForDetails.paymentStatus || 'Pending'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{selectedOrderForDetails.subtotal?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  {selectedOrderForDetails.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-₹{selectedOrderForDetails.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping</span>
                    <span>
                      {selectedOrderForDetails.deliveryCharge === 0 ? 'FREE' : `₹${selectedOrderForDetails.deliveryCharge}`}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total</span>
                    <span>₹{selectedOrderForDetails.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Hybrid Order Confirmation Status (WhatsApp + Manual Fallback) */}
              {(() => {
                const detailOrd = activeDetailOrder || selectedOrderForDetails;
                const waBadge = getWhatsAppDisplayStatus(detailOrd);
                return (
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1.5">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                      Hybrid Order Confirmation Details
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">WhatsApp Delivery Status:</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${waBadge.cls}`}>
                        {waBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Confirmation State:</span>
                      <span className="font-bold text-emerald-700">
                        {detailOrd.customerConfirmed
                          ? detailOrd.confirmationMethod === 'Manual'
                            ? `Manually Confirmed${detailOrd.confirmedByAdminName ? ` by ${detailOrd.confirmedByAdminName}` : ''}`
                            : 'WhatsApp Confirmed (YES)'
                          : detailOrd.needsManualFollowUp
                          ? 'Manual Follow-up Required'
                          : 'Waiting for WhatsApp YES'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Confirmation Sent:</span>
                      <span className="font-medium text-slate-800">
                        {detailOrd.confirmationSentAt
                          ? formatDateTime(detailOrd.confirmationSentAt)
                          : detailOrd.whatsappStatus === 'Failed'
                          ? 'Failed — Manual Confirmation Available'
                          : 'Pending / Automation OFF'}
                      </span>
                    </div>
                    {detailOrd.customerConfirmedAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Confirmed Timestamp:</span>
                        <span className="font-medium text-slate-800">
                          {formatDateTime(detailOrd.customerConfirmedAt)}
                        </span>
                      </div>
                    )}
                    {(detailOrd.whatsappError || detailOrd.manualFollowUpReason) && (
                      <div className="pt-1 text-[11px] text-rose-700 bg-rose-50/80 border border-rose-200 rounded-lg px-2.5 py-1.5">
                        <strong>Reason:</strong> {detailOrd.whatsappError || detailOrd.manualFollowUpReason}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Delhivery Fulfillment Info */}
              {selectedOrderForDetails.awb_number && (
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                  <span className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider block">
                    Delhivery Shipping Fulfillment
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Official AWB Tracking:</span>
                    <span className="font-mono font-bold text-indigo-900">
                      {selectedOrderForDetails.awb_number}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Courier Service:</span>
                    <span className="font-medium text-slate-800">
                      {selectedOrderForDetails.selected_courier_name || 'Delhivery Surface Logistics'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Origin Hub:</span>
                    <span className="font-medium text-slate-800">
                      REDMODE B2C, Meerut 250002
                    </span>
                  </div>
                </div>
              )}

              {/* Genuine RTO Status (If RTO) */}
              {selectedOrderForDetails.rtoInfo?.isRto && (
                <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                    Genuine RTO (Return to Origin)
                  </span>
                  <div className="text-xs font-bold text-rose-900">
                    RTO: {selectedOrderForDetails.rtoInfo.reason}
                  </div>
                  {selectedOrderForDetails.rtoInfo.courierRemarks && (
                    <div className="text-[11px] text-rose-700">
                      Courier Remarks: {selectedOrderForDetails.rtoInfo.courierRemarks}
                    </div>
                  )}
                  {selectedOrderForDetails.rtoInfo.markedAt && (
                    <div className="text-[10px] text-slate-500">
                      Marked on {formatDateTime(selectedOrderForDetails.rtoInfo.markedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* NDR Exception Status (If NDR) */}
              {selectedOrderForDetails.ndrInfo?.hasNdr && (
                <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Non-Delivery Report (NDR) Exception
                  </span>
                  <div className="text-xs font-bold text-amber-900">
                    NDR: {selectedOrderForDetails.ndrInfo.reason}
                  </div>
                  {selectedOrderForDetails.ndrInfo.lastAttemptDate && (
                    <div className="text-[11px] text-amber-700">
                      Last Attempt: {formatDateTime(selectedOrderForDetails.ndrInfo.lastAttemptDate)} (Attempt #{selectedOrderForDetails.ndrInfo.attemptCount || 1})
                    </div>
                  )}
                </div>
              )}

              {/* Order Activity Log & History (Clean chronological timeline without badge pills) */}
              <OrderActivityLog order={activeDetailOrder || selectedOrderForDetails} />

              {/* Customer COD Eligibility Card */}
              {(() => {
                const customerMobile = selectedOrderForDetails.customer?.phone || selectedOrderForDetails.customer?.mobile || '';
                const isCodAllowed = getCustomerCodEligibility(customerMobile);
                return (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Customer COD Eligibility
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${isCodAllowed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={`font-bold ${isCodAllowed ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isCodAllowed ? 'COD Allowed' : 'COD Restricted (Previous RTO)'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerCodOverride(customerMobile, !isCodAllowed);
                        showToast(`Customer COD eligibility updated to ${!isCodAllowed ? 'Allowed' : 'Restricted'}`);
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                    >
                      {isCodAllowed ? 'Restrict COD' : 'Allow COD (Override)'}
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/75 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForPrint(selectedOrderForDetails);
                    setPrintModalTab('invoice');
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>GST Invoice</span>
                </button>

                {hasRealDelhiveryAwb(
                  orders.find((o) => o.id === selectedOrderForDetails.id) || selectedOrderForDetails
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      const liveOrd =
                        orders.find((o) => o.id === selectedOrderForDetails.id) || selectedOrderForDetails;
                      setSelectedOrderForPrint(liveOrd);
                      setPrintModalTab('label');
                    }}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-800 hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
                    title="Preview scannable label (preview does not move order to RTD)"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Preview Label</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mark as Genuine RTO Dropdown Action */}
                {!selectedOrderForDetails.rtoInfo?.isRto && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRtoDropdownOpen(!isRtoDropdownOpen)}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Mark Genuine RTO</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {isRtoDropdownOpen && (
                      <div className="absolute right-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs">
                        <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                          Select Genuine RTO Reason
                        </div>
                        {RTO_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => {
                              markOrderAsRto(selectedOrderForDetails.id, reason, 'Admin marked genuine RTO');
                              showToast(`Order ${selectedOrderForDetails.id} marked as Genuine RTO: ${reason}. COD restricted.`);
                              setIsRtoDropdownOpen(false);
                              setSelectedOrderForDetails(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-50 text-slate-800 hover:text-rose-900 font-medium cursor-pointer transition"
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cancelled Context: Phone Call Confirmation option for 24h unconfirmed / cancelled orders */}
                {mapOrderToPrimaryStatus(selectedOrderForDetails) === 'Cancelled' && (
                  <div className="flex items-center gap-2">
                    {selectedOrderForDetails.customer?.phone && (
                      <div
                        title="Customer Phone (Dial manually from your phone)"
                        className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 select-all"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedOrderForDetails.customer.phone}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        confirmCustomerOrder(selectedOrderForDetails.id, 'Phone Call');
                        setSelectedOrderForDetails(null);
                        showToast(`Order #${selectedOrderForDetails.id} confirmed via Phone Call! Moved to Confirmed tab.`);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm (Called Manually)</span>
                    </button>
                  </div>
                )}

                {/* RTD Context: Manual Label Re-download & Delhivery Scan Verification */}
                {(() => {
                  const liveDetailsOrder =
                    orders.find((o) => o.id === selectedOrderForDetails.id) || selectedOrderForDetails;
                  const liveCat = mapOrderToPrimaryStatus(liveDetailsOrder);
                  if (liveCat === 'RTD') {
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownloadShippingLabel(liveDetailsOrder)}
                          disabled={downloadingLabelOrderId === liveDetailsOrder.id}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                        >
                          {downloadingLabelOrderId === liveDetailsOrder.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Re-download Shipping Label</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderForPrint(liveDetailsOrder);
                            setPrintModalTab('invoice');
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Print Invoice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDelhiveryPickup(liveDetailsOrder)}
                          disabled={verifyingAwb === getOrderAwb(liveDetailsOrder)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <RotateCcw
                            className={`w-3.5 h-3.5 ${
                              verifyingAwb === getOrderAwb(liveDetailsOrder) ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Check Delhivery Portal Scan</span>
                        </button>
                      </div>
                    );
                  }
                  if (liveCat === 'Confirmed') {
                    if (hasRealDelhiveryAwb(liveDetailsOrder)) {
                      return (
                        <button
                          type="button"
                          onClick={() => void handleDownloadShippingLabel(liveDetailsOrder)}
                          disabled={downloadingLabelOrderId === liveDetailsOrder.id}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          {downloadingLabelOrderId === liveDetailsOrder.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {downloadingLabelOrderId === liveDetailsOrder.id
                              ? 'Downloading Label...'
                              : 'Download Shipping Label (Moves to RTD)'}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => void handleGenerateRealAwb(liveDetailsOrder)}
                        disabled={
                          generatingAwbOrderId === liveDetailsOrder.id ||
                          liveDetailsOrder.delhiveryShipmentStatus === 'creating'
                        }
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        {generatingAwbOrderId === liveDetailsOrder.id ||
                        liveDetailsOrder.delhiveryShipmentStatus === 'creating' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {liveDetailsOrder.delhiveryShipmentStatus === 'failed'
                            ? 'Retry Real Delhivery AWB'
                            : 'Generate Real Delhivery AWB'}
                        </span>
                      </button>
                    );
                  }
                  if (liveCat === 'Upcoming') {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openManualConfirmModal(liveDetailsOrder)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Manually</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRetryWhatsApp(liveDetailsOrder)}
                          disabled={retryingWaOrderId === liveDetailsOrder.id}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${retryingWaOrderId === liveDetailsOrder.id ? 'animate-spin' : ''}`} />
                          <span>Retry WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleFollowUp(liveDetailsOrder)}
                          disabled={togglingFollowUpOrderId === liveDetailsOrder.id}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>{liveDetailsOrder.needsManualFollowUp ? 'Clear Follow-up' : 'Mark for Follow-up'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openSingleCancelModal(liveDetailsOrder)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. PRINT MODAL (Invoice & Delhivery Label - Single & Bulk Batch) */}
      {(selectedOrderForPrint || (selectedBulkOrdersForPrint && selectedBulkOrdersForPrint.length > 0)) && (
        <OrderPrintModal
          isOpen={true}
          order={
            selectedOrderForPrint
              ? orders.find((o) => o.id === selectedOrderForPrint.id) || selectedOrderForPrint
              : null
          }
          orders={
            selectedBulkOrdersForPrint
              ? selectedBulkOrdersForPrint.map((so) => orders.find((o) => o.id === so.id) || so)
              : undefined
          }
          initialTab={printModalTab}
          onLabelDownloaded={(oid, movedToRtd) => {
            if (movedToRtd) {
              showToast(`Shipping label downloaded for Order ${oid}. Automatically moved to RTD!`, 'success');
            }
          }}
          onClose={() => {
            setSelectedOrderForPrint(null);
            setSelectedBulkOrdersForPrint(null);
          }}
        />
      )}

      {/* 10. WHATSAPP MODAL */}
      {selectedOrderForWhatsApp && (
        <WhatsAppOrderModal
          isOpen={true}
          order={selectedOrderForWhatsApp}
          onClose={() => setSelectedOrderForWhatsApp(null)}
        />
      )}

      {/* 11. DATE RANGE EXPORT CSV MODAL */}
      {isDateExportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDateExportModalOpen(false);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Export Orders by Date (CSV)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Download full audit report with customer, shipping &amp; SKU details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDateExportModalOpen(false)}
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
                  Select Date Range
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'today', label: 'Today', desc: 'Past 24h' },
                    { id: 'yesterday', label: 'Yesterday', desc: '1 day ago' },
                    { id: '7days', label: 'Last 7 Days', desc: 'Past week' },
                    { id: '30days', label: 'Last 30 Days', desc: '1 month' },
                    { id: 'this_month', label: 'This Month', desc: 'Current calendar' },
                    { id: 'last_month', label: 'Last Month', desc: 'Previous month' },
                    { id: 'all', label: 'All Time', desc: `All ${orders.length} orders` },
                    { id: 'custom', label: 'Custom Range', desc: 'Pick dates' },
                  ].map((preset) => {
                    const active = exportDatePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setExportDatePreset(preset.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`block font-bold text-xs ${active ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {preset.label}
                        </span>
                        <span className={`block text-[10px] mt-0.5 ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Date Inputs (Only when 'custom' is active) */}
              {exportDatePreset === 'custom' && (
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
                        value={exportCustomStart}
                        onChange={(e) => setExportCustomStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={exportCustomEnd}
                        onChange={(e) => setExportCustomEnd(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Order Status Filter (Optional scope) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Order Status Scope
                </label>
                <select
                  value={exportStatusScope}
                  onChange={(e) => setExportStatusScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-900 font-medium cursor-pointer"
                >
                  <option value="ALL">All Order Statuses (Full Historical Audit)</option>
                  <option value="Upcoming">Upcoming (Awaiting Confirmation)</option>
                  <option value="Confirmed">Confirmed Orders</option>
                  <option value="RTD">Ready To Dispatch (RTD)</option>
                  <option value="In Transit">In Transit (With Courier)</option>
                  <option value="Completed">Completed / Delivered</option>
                  <option value="Cancelled">Cancelled / Expired</option>
                </select>
              </div>

              {/* Live Preview Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">Matching Records:</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {matchingOrdersForExport.length} Orders
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Revenue:</span>
                    <strong className="text-white text-xs">₹{exportStats.revenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Items / Units:</span>
                    <strong className="text-white text-xs">{exportStats.items} units</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                  ✓ Includes customer address, phone, item SKUs, sizes, payment details, courier partner, AWB number, NDR &amp; RTO reports.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 border-t border-slate-100 px-5 py-3 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between text-xs shrink-0">
              <button
                type="button"
                onClick={() => setIsDateExportModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDateExport}
                disabled={matchingOrdersForExport.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV ({matchingOrdersForExport.length} Orders)</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 12. MANUAL ORDER CONFIRMATION DIALOG (Requires explicit customer contact confirmation) */}
      {manualConfirmOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isSubmittingManualConfirm) setManualConfirmOrder(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Confirm Order Manually</h3>
                  <p className="text-[11px] text-slate-500">
                    Order {manualConfirmOrder.id} • Works independently of Meta WhatsApp API
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingManualConfirm}
                onClick={() => setManualConfirmOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{manualConfirmOrder.customer?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phone (Call / WhatsApp):</span>
                <span className="font-mono font-bold text-slate-900 select-all">
                  {manualConfirmOrder.customer?.phone || manualConfirmOrder.customer?.mobile || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount &amp; Mode:</span>
                <span className="font-bold text-slate-900">
                  ₹{manualConfirmOrder.total.toLocaleString('en-IN')} ({manualConfirmOrder.paymentMode || 'COD'})
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer text-xs text-emerald-950">
              <input
                type="checkbox"
                checked={manualConfirmChecked}
                onChange={(e) => setManualConfirmChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-600 cursor-pointer shrink-0"
              />
              <span className="leading-snug font-medium">
                I confirm that I have contacted the customer and they explicitly agreed to confirm this order.
              </span>
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Optional Admin Note
              </label>
              <input
                type="text"
                value={manualConfirmNote}
                onChange={(e) => setManualConfirmNote(e.target.value)}
                placeholder="e.g. Verified address & COD amount on phone call"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This will move the order from <strong>Upcoming → Confirmed</strong> and generate a real Delhivery AWB. The order will remain in <strong>Confirmed</strong> until you manually download the shipping label.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingManualConfirm}
                onClick={() => setManualConfirmOrder(null)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!manualConfirmChecked || isSubmittingManualConfirm}
                onClick={() => void handleSubmitManualConfirm()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isSubmittingManualConfirm ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingManualConfirm ? 'Confirming...' : 'Confirm Order Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. SINGLE ATOMIC CANCEL ORDER MODAL */}
      {singleCancelOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isSubmittingSingleCancel) setSingleCancelOrder(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cancel Order {singleCancelOrder.id}?</h3>
                  <p className="text-[11px] text-slate-500">
                    Inventory will be restored atomically once only.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingSingleCancel}
                onClick={() => setSingleCancelOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Cancellation Reason
              </label>
              <input
                type="text"
                value={singleCancelReason}
                onChange={(e) => setSingleCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingSingleCancel}
                onClick={() => setSingleCancelOrder(null)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isSubmittingSingleCancel}
                onClick={() => void handleSubmitSingleCancel()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isSubmittingSingleCancel ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingSingleCancel ? 'Cancelling...' : 'Confirm Cancel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
