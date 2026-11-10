import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, Order, AdminUser, StoreSettings } from '../../types';
import { AddProductPage } from './AddProductPage';
import { InventoryView } from './InventoryView';
import { OrderPrintModal } from './OrderPrintModal';
import { WhatsAppOrderModal } from './WhatsAppOrderModal';
import { WhatsAppCustomerHub } from './WhatsAppCustomerHub';
import { OrderManagementPanel } from './OrderManagementPanel';
import { UniversalLogisticsPanel } from './UniversalLogisticsPanel';
import { UniversalPaymentPanel } from './UniversalPaymentPanel';
import { WhatsAppIntegrationPanel } from './WhatsAppIntegrationPanel';
import { SmsIntegrationPanel } from './SmsIntegrationPanel';
import { AdminSettingsView } from './AdminSettingsView';
import { CustomDomainManager } from './CustomDomainManager';
import { AnnouncementBarManager } from './AnnouncementBarManager';
import { CategoriesAndBannersManager } from './CategoriesAndBannersManager';
import { StaffActivityMonitor } from './StaffActivityMonitor';
import { FestivalAlertModal } from './FestivalAlertModal';
import { ShopAdvisorEventsModal } from './ShopAdvisorEventsModal';
import { computeAllFestivalAlerts, formatFestivalDate } from '../../utils/indianFestivals';
import { AnalyticsService } from '../../services/analytics';
import {
  Home,
  Smartphone,
  Layers,
  CircleDollarSign,
  Users,
  Megaphone,
  BarChart2,
  Calendar,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  X,
  ExternalLink,
  TrendingUp,
  MoreHorizontal,
  Lightbulb,
  MessageSquare,
  Globe,
  Bell,
  Heart,
  PackageCheck,
  Eye,
  ArrowRight,
  PanelLeftClose,
  PanelLeft,
  Edit2,
  Trash2,
  Filter,
  Palette,
  CheckCircle2,
  Boxes,
  Printer,
  FileText,
  Tag,
  Check,
  CheckSquare,
  Square,
  RotateCcw,
  Truck,
  Package,
  Clock,
  AlertTriangle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Key,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Copy,
  MapPin,
  Building2,
  Radio,
  Phone,
  PhoneCall,
} from 'lucide-react';
import { getOrderBatchStatus, getMetaWhatsAppTemplates } from '../../utils/orderTiming';
import { AdminLoginGate } from './AdminLoginGate';
import { AccessDeniedNotice } from './AccessDeniedNotice';
import { hasPermission, isTabAllowed, getDefaultTabForRole, getRoleBadgeInfo } from '../../utils/rbac';
import { recordFirestoreAuditLog, AuditLogPayload } from '../../utils/auditLogger';
export { recordFirestoreAuditLog as logAdminSecurityAction } from '../../utils/auditLogger';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type ActiveTab = 'home' | 'catalog' | 'categories-banners' | 'inventory' | 'add-product' | 'finances' | 'customers' | 'marketing' | 'analytics' | 'integrations' | 'payment-settings' | 'settings' | 'admin-management' | 'domain-dns';
type TimeInterval = 'daily' | 'weekly' | 'monthly' | '6months' | 'yearly';
type TimeFilter = 'Daily' | 'Weekly' | 'Monthly' | '6 Months' | 'Yearly';

export const AdminPanel: React.FC = () => {
  const {
    setActiveView,
    products,
    orders,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    updateCodVerificationStatus,
    confirmCustomerOrder,
    send23hReminder,
    triggerNightConfirmationNow,
    markLabelDownloaded,
    sendCustomerTrackingUpdate,
    sendDeliveredReviewRequest,
    createDelhiveryShipment,
    updateDelhiverySettings,
    settings,
    updateSettings,
    isAdminAuthenticated,
    currentAdminUser,
    adminUsers,
    switchAdminUser,
    addAdminUser,
    updateAdminUser,
    toggleAdminUserStatus,
    deleteAdminUser,
    adminLogout,
    addAuditLog,
  } = useStore();

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return getDefaultTabForRole(currentAdminUser.role);
  });
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const [financesExpanded, setFinancesExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'profile' | 'admin-management' | 'payment' | 'domain-dns'>('profile');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Indian Festivals & Major Events 10-Day Alert Engine State
  const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
  const [isShopAdvisorEventsModalOpen, setIsShopAdvisorEventsModalOpen] = useState(false);
  const [simulatedFestivalDate, setSimulatedFestivalDate] = useState<Date | null>(null);

  const effectiveFestivalDate = useMemo(() => {
    return simulatedFestivalDate || new Date();
  }, [simulatedFestivalDate]);

  const allFestivalAlerts = useMemo(() => {
    return computeAllFestivalAlerts(effectiveFestivalDate, 10, true);
  }, [effectiveFestivalDate]);

  const activeFestivalAlerts = useMemo(() => {
    return allFestivalAlerts.filter((a) => a.isAlertActive);
  }, [allFestivalAlerts]);

  /**
   * Helper function in AdminPanel to log critical admin actions (product updates,
   * user status changes, or settings modifications) directly to Firestore 'AuditLog'
   * collection for security tracking.
   */
  const logCriticalAdminAction = useCallback(
    async (
      action: string,
      entity: 'Product' | 'User' | 'Settings' | 'Order' | 'Inventory' | 'Shipment' | 'Coupon' | 'Customer' | 'Security',
      entityId: string,
      details?: {
        oldValue?: string;
        newValue?: string;
        metadata?: Record<string, any>;
      }
    ) => {
      try {
        await recordFirestoreAuditLog(action, entity, entityId, {
          adminId: currentAdminUser.id,
          adminName: currentAdminUser.name,
          role: currentAdminUser.role,
          oldValue: details?.oldValue,
          newValue: details?.newValue,
          metadata: details?.metadata,
        });
      } catch (e) {
        console.debug('Firestore AuditLog recording skipped/offline:', e);
      }
      addAuditLog(
        action,
        entity === 'User' ? 'Settings' : entity,
        entityId,
        details?.oldValue,
        details?.newValue
      );
    },
    [currentAdminUser, addAuditLog]
  );

  const handleUpdateSettingsWithAudit = useCallback(
    (newSettings: StoreSettings) => {
      updateSettings(newSettings);
      logCriticalAdminAction(
        `Modified store settings & configuration (${newSettings.storeName || 'REDMODE'})`,
        'Settings',
        'store_settings',
        {
          metadata: {
            storeName: newSettings.storeName,
            supportEmail: newSettings.supportEmail,
            whatsappNumber: newSettings.whatsappNumber,
          },
        }
      );
    },
    [updateSettings, logCriticalAdminAction]
  );

  // Enforce role-based tab access
  useEffect(() => {
    if (!isTabAllowed(currentAdminUser.role, activeTab)) {
      setActiveTab(getDefaultTabForRole(currentAdminUser.role));
    }
  }, [currentAdminUser.role, activeTab]);

  // Close user dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Close search suggestions dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideSearchClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    const handleSearchKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
      }
    };
    if (isSearchFocused) {
      document.addEventListener('mousedown', handleOutsideSearchClick);
      document.addEventListener('keydown', handleSearchKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideSearchClick);
      document.removeEventListener('keydown', handleSearchKeyDown);
    };
  }, [isSearchFocused]);

  // Global Ctrl+K / Cmd+K Quick Search Shortcut
  useEffect(() => {
    const handleGlobalSearchShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape' && isSearchFocused) {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalSearchShortcut);
    return () => window.removeEventListener('keydown', handleGlobalSearchShortcut);
  }, [isSearchFocused]);

  // Local Admin Users State (Keeps local list responsive and synchronizes with store)
  const [localAdminUsers, setLocalAdminUsers] = useState<AdminUser[]>(() => adminUsers);

  useEffect(() => {
    setLocalAdminUsers(adminUsers);
  }, [adminUsers]);

  // Admin Management Modal & Form State (Super Admin Only)
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminMobile, setNewAdminMobile] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'Label Admin' | 'Listing + Label Admin' | ''>('Label Admin');
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    role?: string;
    mobile?: string;
    password?: string;
  }>({});
  const [adminMgmtError, setAdminMgmtError] = useState<string | null>(null);
  const [adminMgmtSuccess, setAdminMgmtSuccess] = useState<string | null>(null);

  const handleOpenAddAdminModal = () => {
    setAdminMgmtError(null);
    setFormErrors({});
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminMobile('');
    setNewAdminPassword('');
    setNewAdminRole('Label Admin');
    setIsAddAdminModalOpen(true);
  };

  const handleCloseAddAdminModal = () => {
    setIsAddAdminModalOpen(false);
    setAdminMgmtError(null);
    setFormErrors({});
  };

  // Lock body scroll and listen for ESC key when Add Admin modal is open
  useEffect(() => {
    if (isAddAdminModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCloseAddAdminModal();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isAddAdminModalOpen]);

  const handleToggleAdminStatus = (id: string) => {
    const target = adminUsers.find((u) => u.id === id);
    const oldStatus = target?.status || 'active';
    const newStatus = oldStatus === 'active' ? 'disabled' : 'active';

    toggleAdminUserStatus(id);
    setLocalAdminUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );

    logCriticalAdminAction(
      `Changed staff user status for '${target?.name || id}' to ${newStatus.toUpperCase()}`,
      'User',
      id,
      {
        oldValue: `Status: ${oldStatus}`,
        newValue: `Status: ${newStatus}`,
        metadata: {
          userId: id,
          userName: target?.name,
          userEmail: target?.email,
          userRole: target?.role,
          previousStatus: oldStatus,
          newStatus,
        },
      }
    );
  };

  const handleDeleteAdminUser = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove administrator "${name}"?`)) {
      deleteAdminUser(id);
      setLocalAdminUsers((prev) => prev.filter((u) => u.id !== id));
      setAdminMgmtSuccess(`Administrator "${name}" has been removed.`);
      setTimeout(() => setAdminMgmtSuccess(null), 4000);

      logCriticalAdminAction(
        `Deleted administrator account for '${name}' (ID: ${id})`,
        'User',
        id,
        {
          oldValue: 'Active Administrator',
          newValue: 'Deleted Account',
          metadata: { userId: id, userName: name },
        }
      );
    }
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMgmtError(null);

    const errors: {
      name?: string;
      email?: string;
      role?: string;
      mobile?: string;
      password?: string;
    } = {};

    const cleanName = newAdminName.trim();
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Validate Name
    if (!cleanName) {
      errors.name = 'Full name is required.';
    } else if (cleanName.length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }

    // 2. Validate Email
    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address (e.g., name@domain.com).';
    } else if (localAdminUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      errors.email = 'An administrator with this email address already exists.';
    }

    // 3. Validate Role Selection
    if (!newAdminRole) {
      errors.role = 'Please select a role for the administrator.';
    } else if (newAdminRole !== 'Label Admin' && newAdminRole !== 'Listing + Label Admin') {
      errors.role = 'Invalid role. Only Label Admin or Listing + Label Admin are allowed.';
    }

    // 4. Optional Mobile Number validation
    if (newAdminMobile.trim()) {
      const cleanDigits = newAdminMobile.trim().replace(/[\s\-+()]/g, '');
      if (cleanDigits.length < 7 || cleanDigits.length > 15) {
        errors.mobile = 'Please enter a valid mobile number (7–15 digits).';
      }
    }

    // 5. Optional Password validation
    if (newAdminPassword.trim() && newAdminPassword.trim().length < 6) {
      errors.password = 'Initial password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorMessage = Object.values(errors)[0];
      setAdminMgmtError(firstErrorMessage || 'Please correct the highlighted form errors.');
      return;
    }

    setFormErrors({});

    const res = addAdminUser({
      name: cleanName,
      email: cleanEmail,
      mobile: newAdminMobile.trim() || undefined,
      password: newAdminPassword.trim() || undefined,
      role: newAdminRole as 'Label Admin' | 'Listing + Label Admin',
    });

    if (!res.success) {
      setAdminMgmtError(res.message);
      return;
    }

    // Ensure local admin list state is updated
    if (res.user) {
      const newUser = res.user;
      setLocalAdminUsers((prev) => {
        if (prev.some((u) => u.id === newUser.id)) return prev;
        return [...prev, newUser];
      });
    }

    setAdminMgmtSuccess(res.message || `Admin "${cleanName}" created successfully.`);
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminMobile('');
    setNewAdminPassword('');
    setNewAdminRole('Label Admin');
    setFormErrors({});
    setAdminMgmtError(null);
    setIsAddAdminModalOpen(false);
    setTimeout(() => setAdminMgmtSuccess(null), 4000);
  };

  // Synchronize activeTab if role changes
  useEffect(() => {
    if (!isTabAllowed(currentAdminUser.role, activeTab)) {
      setActiveTab(getDefaultTabForRole(currentAdminUser.role));
    }
  }, [currentAdminUser.role, activeTab]);

  // Filter States
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Yearly');
  const [revenuePeriod, setRevenuePeriod] = useState<TimeInterval>('yearly');
  const [searchQuery, setSearchQuery] = useState('');

  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogViewMode, setCatalogViewMode] = useState<'variants' | 'grouped'>('variants');
  // Catalog Bulk Selection State (holds selected product IDs)
  const [selectedCatalogProductIds, setSelectedCatalogProductIds] = useState<string[]>([]);

  // Product Add / Edit Dedicated Page State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingColorIndex, setEditingColorIndex] = useState<number>(0);

  // 1-Click Invoice & Shipping Label Print State
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [printModalTab, setPrintModalTab] = useState<'invoice' | 'label' | 'both'>('invoice');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // 1-Click WhatsApp Notification Modal State
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);

  // Order Accept & Cancel Decision Desk States (3 Core Stages: Upcoming -> Confirmed -> RTD)
  const [orderFilterStatus, setOrderFilterStatus] = useState<
    'ALL' | 'UPCOMING' | 'PENDING' | 'CONFIRMED' | 'RTD' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED'
  >('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(
    'Customer requested cancellation via WhatsApp/Call'
  );
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [orderActionFeedback, setOrderActionFeedback] = useState<{
    id: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Integrations Sub-Tab (Courier Channels vs Payment Gateways vs WhatsApp API vs SMS/OTP)
  const [integrationSubTab, setIntegrationSubTab] = useState<'couriers' | 'payments' | 'whatsapp' | 'sms'>('couriers');
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState<string | null>(null);

  // Order counts by status (Upcoming -> Confirmed -> RTD -> Shipped -> Delivered)
  const orderCounts = useMemo(() => {
    let upcoming = 0;
    let confirmed = 0;
    let rtd = 0;
    let shipped = 0;
    let delivered = 0;
    let cancelled = 0;
    let expired = 0;

    orders.forEach((o) => {
      const s = (o.orderStatus || (o as any).status || 'Pending').toLowerCase();
      const isDelivered = s === 'delivered';
      const isShipped = (s === 'shipped' || s === 'in transit' || s === 'out for delivery') && !isDelivered;
      const isRTD = (o.labelDownloaded || s === 'ready to ship' || s === 'rtd') && !isShipped && !isDelivered;
      const isConf = (s === 'confirmed' || o.customerConfirmed) && !isRTD && !isShipped && !isDelivered;

      // 24-hour unconfirmed orders automatically count towards Cancelled
      const refTime = o.confirmationSentAt
        ? new Date(o.confirmationSentAt).getTime()
        : o.scheduledConfirmationTime
        ? new Date(o.scheduledConfirmationTime).getTime()
        : new Date(o.createdAt || Date.now()).getTime();
      const hoursElapsed = Math.max(0, (Date.now() - refTime) / (1000 * 60 * 60));
      const is24hExpired = !isConf && (o.isExpired === true || s === 'expired' || hoursElapsed >= 24);
      const isCancelled = s === 'cancelled' || is24hExpired;

      if (isCancelled) cancelled++;
      else if (isDelivered) delivered++;
      else if (isShipped) shipped++;
      else if (isRTD) rtd++;
      else if (isConf) confirmed++;
      else upcoming++;
    });

    return { all: orders.length, upcoming, confirmed, rtd, shipped, delivered, cancelled, expired: 0, pending: upcoming };
  }, [orders]);

  // Filtered orders based on selected tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const rawStatus = (o.orderStatus || (o as any).status || 'Pending').toLowerCase();
      const isDelivered = rawStatus === 'delivered';
      const isShipped =
        (rawStatus === 'shipped' || rawStatus === 'in transit' || rawStatus === 'out for delivery') &&
        !isDelivered;
      const isRTD =
        (o.labelDownloaded || rawStatus === 'ready to ship' || rawStatus === 'rtd') &&
        !isShipped &&
        !isDelivered;
      const isConf =
        (rawStatus === 'confirmed' || o.customerConfirmed) &&
        !isRTD &&
        !isShipped &&
        !isDelivered;

      const refTime = o.confirmationSentAt
        ? new Date(o.confirmationSentAt).getTime()
        : o.scheduledConfirmationTime
        ? new Date(o.scheduledConfirmationTime).getTime()
        : new Date(o.createdAt || Date.now()).getTime();
      const hoursElapsed = Math.max(0, (Date.now() - refTime) / (1000 * 60 * 60));
      const is24hExpired = !isConf && (o.isExpired === true || rawStatus === 'expired' || hoursElapsed >= 24);
      const isCancelled = rawStatus === 'cancelled' || is24hExpired;
      const isUpcoming =
        !isConf &&
        !isRTD &&
        !isShipped &&
        !isDelivered &&
        !isCancelled;

      if (orderFilterStatus === 'UPCOMING' || orderFilterStatus === 'PENDING') {
        if (!isUpcoming) return false;
      } else if (orderFilterStatus === 'CONFIRMED') {
        if (!isConf) return false;
      } else if (orderFilterStatus === 'RTD') {
        if (!isRTD) return false;
      } else if (orderFilterStatus === 'SHIPPED') {
        if (!isShipped) return false;
      } else if (orderFilterStatus === 'DELIVERED') {
        if (!isDelivered) return false;
      } else if (orderFilterStatus === 'CANCELLED' || orderFilterStatus === 'EXPIRED') {
        if (!isCancelled) return false;
      }

      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const idMatch = o.id.toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || o.shippingAddress?.name || '').toLowerCase().includes(q);
        const phoneMatch = (
          o.customer?.phone ||
          o.shippingAddress?.mobile ||
          o.shippingAddress?.phone ||
          ''
        ).includes(q);
        const cityMatch = (o.customer?.city || o.shippingAddress?.city || '').toLowerCase().includes(q);
        return idMatch || nameMatch || phoneMatch || cityMatch;
      }

      return true;
    });
  }, [orders, orderFilterStatus, orderSearchQuery]);

  const handleAcceptOrder = (order: Order) => {
    updateOrderStatus(order.id, 'Confirmed');
    if (order.paymentMode === 'COD' || (order as any).paymentMethod === 'COD') {
      updateCodVerificationStatus(order.id, 'CONFIRMED', 'Admin Desk');
    }
    const orderNo = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    setOrderActionFeedback({
      id: order.id,
      message: `Order #${orderNo} Accepted & Confirmed! Ready for packing. ✅`,
      type: 'success',
    });
    setTimeout(() => setOrderActionFeedback(null), 3500);
  };

  const handleConfirmCancelOrder = () => {
    if (!orderToCancel) return;
    const finalReason = customCancelReason.trim() ? customCancelReason.trim() : cancelReason;
    updateOrderStatus(orderToCancel.id, 'Cancelled');
    if (orderToCancel.paymentMode === 'COD' || (orderToCancel as any).paymentMethod === 'COD') {
      updateCodVerificationStatus(orderToCancel.id, 'REJECTED', `Admin (${finalReason})`);
    }
    const orderNo = orderToCancel.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    setOrderActionFeedback({
      id: orderToCancel.id,
      message: `Order #${orderNo} has been Cancelled (${finalReason}) ❌`,
      type: 'error',
    });
    setOrderToCancel(null);
    setCustomCancelReason('');
    setTimeout(() => setOrderActionFeedback(null), 4000);
  };

  const handleDelhiveryDispatch = (order: Order, mode: 'Surface' | 'Express' = 'Surface') => {
    const result = createDelhiveryShipment(order.id, mode);
    const orderNo = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    setOrderActionFeedback({
      id: order.id,
      message: `Order #${orderNo} Dispatched via ${result.courier}! Delhivery AWB #${result.awb} allocated. Ready to print shipping label. 🚚`,
      type: 'success',
    });
    setSelectedOrderForPrint(order);
    setPrintModalTab('label');
    setIsPrintModalOpen(true);
    setTimeout(() => setOrderActionFeedback(null), 5000);
  };

  // Refs for scrolling and search focusing
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Smooth scroll to top when REDMODE logo/heading is clicked
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ⌘K / Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenPrintModal = (order: Order, tab: 'invoice' | 'label' | 'both' = 'invoice') => {
    setSelectedOrderForPrint(order);
    setPrintModalTab(tab);
    setIsPrintModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setEditingColorIndex(0);
    setActiveTab('add-product');
  };

  const handleOpenEditProduct = (prod: Product, colorIndex: number = 0) => {
    setEditingProduct(prod);
    setEditingColorIndex(colorIndex);
    setActiveTab('add-product');
  };

  const handleSaveProduct = (productData: any) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      logCriticalAdminAction(
        `Updated catalog product '${productData.name || editingProduct.name}'`,
        'Product',
        editingProduct.id,
        {
          oldValue: `Price: ₹${editingProduct.price}, Category: ${editingProduct.category}`,
          newValue: `Price: ₹${productData.price || editingProduct.price}, Category: ${productData.category || editingProduct.category}`,
          metadata: {
            productId: editingProduct.id,
            name: productData.name || editingProduct.name,
            price: productData.price || editingProduct.price,
            category: productData.category || editingProduct.category,
          },
        }
      );
      setOrderActionFeedback({
        id: editingProduct.id,
        message: `Product "${productData.name || editingProduct.name}" updated and saved permanently! ✅`,
        type: 'success',
      });
    } else {
      addProduct(productData);
      logCriticalAdminAction(
        `Created new catalog product '${productData.name}'`,
        'Product',
        productData.id || `prod_${Date.now()}`,
        {
          newValue: `Price: ₹${productData.price}, Category: ${productData.category}`,
          metadata: {
            name: productData.name,
            price: productData.price,
            category: productData.category,
          },
        }
      );
      setOrderActionFeedback({
        id: `prod_${Date.now()}`,
        message: `New product "${productData.name}" saved permanently to catalog! ✅`,
        type: 'success',
      });
    }
    setEditingProduct(null);
    setActiveTab('catalog');
    setTimeout(() => setOrderActionFeedback(null), 4000);
  };

  // Real-time New Order Notification Watcher
  const prevOrderCountRef = useRef<number>(orders.length);
  useEffect(() => {
    if (orders.length > prevOrderCountRef.current) {
      const newest = orders[0];
      if (newest) {
        setOrderActionFeedback({
          id: newest.id,
          message: `New Order ${newest.id} (₹${(Number(newest.total) || 0).toLocaleString('en-IN')}) received in real time! 🔔`,
          type: 'success',
        });
        setTimeout(() => setOrderActionFeedback(null), 5000);
      }
    }
    prevOrderCountRef.current = orders.length;
  }, [orders]);

  // Subscribe to real-time AnalyticsService events so Views & Visits update live
  const [analyticsTick, setAnalyticsTick] = useState(0);
  useEffect(() => {
    const unsub = AnalyticsService.subscribe(() => {
      setAnalyticsTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  // Stock Color Coding Rules:
  // > 15: GREEN
  // 10 - 15: YELLOW
  // < 10: RED
  const getStockBadgeClass = (qty: number) => {
    if (qty > 15) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (qty >= 10) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
  };

  const getStockNumberColor = (num: number) => {
    if (num >= 10) return 'text-slate-900 font-bold';
    return 'text-rose-600 font-black';
  };

  // Helper: Check if an order is cancelled, rejected, or expired
  const isOrderCancelledOrInvalid = useCallback((o: Order) => {
    const s = String(o.orderStatus || (o as any).status || '').toLowerCase();
    if (s === 'cancelled' || s === 'expired' || s === 'failed' || o.isExpired === true) return true;
    if (o.codVerificationStatus === 'REJECTED') return true;
    return false;
  }, []);

  // Helper: Filter timestamp by TimeInterval ('daily' | 'weekly' | 'monthly' | '6months' | 'yearly')
  const isWithinPeriod = useCallback((isoDate: string | undefined, period: TimeInterval): boolean => {
    if (!isoDate) return true;
    const ts = new Date(isoDate).getTime();
    if (isNaN(ts)) return true;
    const now = new Date();
    if (period === 'daily') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return ts >= startOfToday;
    }
    const diffMs = now.getTime() - ts;
    const dayMs = 24 * 60 * 60 * 1000;
    if (period === 'weekly') return diffMs <= 7 * dayMs;
    if (period === 'monthly') return diffMs <= 30 * dayMs;
    if (period === '6months') return diffMs <= 180 * dayMs;
    return diffMs <= 365 * dayMs;
  }, []);

  // Compute live dynamic stats from real store data
  const totalStoreRevenue = useMemo(() => {
    return orders
      .filter((o) => !isOrderCancelledOrInvalid(o))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders, isOrderCancelledOrInvalid]);

  const activeProductsCount = products.length;
  const lowStockCount = useMemo(() => {
    return products.filter((p) => {
      const total = Object.values(p.stockBySize || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);
      return total > 0 && total < 10;
    }).length;
  }, [products]);

  const soldOutCount = useMemo(() => {
    return products.filter((p) => {
      const total = Object.values(p.stockBySize || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);
      return total === 0;
    }).length;
  }, [products]);

  // Period-filtered orders & separated financial metrics (Order Value, Confirmed Revenue, Collected Payments)
  const periodFinancials = useMemo(() => {
    const allInPeriod = orders.filter((o) => isWithinPeriod(o.createdAt, revenuePeriod));
    const validInPeriod = allInPeriod.filter((o) => !isOrderCancelledOrInvalid(o));

    const orderValue = allInPeriod.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const confirmedRevenue = validInPeriod.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const collectedPayments = validInPeriod
      .filter((o) => {
        const st = String(o.orderStatus || '').toLowerCase();
        return o.paymentStatus === 'Paid' || st === 'delivered';
      })
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const aov = validInPeriod.length > 0 ? Math.round(confirmedRevenue / validInPeriod.length) : 0;

    return {
      allInPeriod,
      validInPeriod,
      orderValue,
      confirmedRevenue,
      collectedPayments,
      aov,
    };
  }, [orders, revenuePeriod, isWithinPeriod, isOrderCancelledOrInvalid]);

  // Dynamic Revenue Dataset for Daily, Weekly, Monthly, 6 Months, and Yearly based on REAL confirmed orders
  const revenueData = useMemo(() => {
    const validOrders = periodFinancials.validInPeriod;
    const confirmedTotal = periodFinancials.confirmedRevenue;

    const periodTitle =
      revenuePeriod === 'daily'
        ? 'Daily (Today)'
        : revenuePeriod === 'weekly'
        ? 'This Week'
        : revenuePeriod === 'monthly'
        ? 'Last 30 Days'
        : revenuePeriod === '6months'
        ? 'Last 6 Months'
        : 'Last 1 Year';

    // Build time buckets for the selected period and bucket real orders into them
    const now = new Date();
    let buckets: { label: string; tooltipDate: string; value: number }[] = [];

    if (revenuePeriod === 'daily') {
      const slots = [
        { label: '06:00', maxH: 6 },
        { label: '09:00', maxH: 9 },
        { label: '12:00', maxH: 12 },
        { label: '15:00', maxH: 15 },
        { label: '18:00', maxH: 18 },
        { label: '21:00', maxH: 21 },
        { label: '23:59', maxH: 24 },
      ];
      buckets = slots.map((s) => ({ label: s.label, tooltipDate: `Today ${s.label}`, value: 0 }));
      validOrders.forEach((o) => {
        const d = new Date(o.createdAt || now);
        const h = d.getHours();
        const idx = Math.min(slots.findIndex((s) => h <= s.maxH), slots.length - 1);
        const targetIdx = idx >= 0 ? idx : slots.length - 1;
        buckets[targetIdx].value += Number(o.total) || 0;
      });
    } else if (revenuePeriod === 'weekly') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        buckets.push({
          label: dayNames[d.getDay()],
          tooltipDate: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
          value: 0,
        });
      }
      validOrders.forEach((o) => {
        const d = new Date(o.createdAt || now);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
        const idx = 6 - Math.min(Math.max(diffDays, 0), 6);
        buckets[idx].value += Number(o.total) || 0;
      });
    } else if (revenuePeriod === 'monthly') {
      const ranges = ['Day 1-5', 'Day 6-10', 'Day 11-15', 'Day 16-20', 'Day 21-25', 'Day 26-30'];
      const shortLabels = ['1-5', '6-10', '11-15', '16-20', '21-25', '26-30'];
      buckets = shortLabels.map((lbl, i) => ({ label: lbl, tooltipDate: ranges[i], value: 0 }));
      validOrders.forEach((o) => {
        const d = new Date(o.createdAt || now);
        const dayOfMonth = d.getDate();
        const idx = Math.min(Math.floor((dayOfMonth - 1) / 5), 5);
        buckets[idx].value += Number(o.total) || 0;
      });
    } else if (revenuePeriod === '6months') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: monthNames[d.getMonth()],
          tooltipDate: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          value: 0,
        });
      }
      validOrders.forEach((o) => {
        const d = new Date(o.createdAt || now);
        const monthsDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsDiff >= 0 && monthsDiff < 6) {
          buckets[5 - monthsDiff].value += Number(o.total) || 0;
        }
      });
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      buckets = monthNames.map((m) => ({ label: m, tooltipDate: `${m} ${now.getFullYear()}`, value: 0 }));
      validOrders.forEach((o) => {
        const d = new Date(o.createdAt || now);
        buckets[d.getMonth()].value += Number(o.total) || 0;
      });
    }

    const points = buckets.map((b) => ({
      label: b.label,
      value: Math.round(b.value),
      tooltipDate: b.tooltipDate,
      tooltipVal: `₹${Math.round(b.value).toLocaleString('en-IN')}`,
      pct: confirmedTotal > 0 ? `${Math.round((b.value / confirmedTotal) * 100)}%` : '0%',
    }));

    if (confirmedTotal === 0 || validOrders.length === 0) {
      return {
        title: periodTitle,
        dropdownLabel: periodTitle,
        totalFormatted: '₹0',
        gainText: '₹0 recorded',
        gainPct: '0%',
        gainColor: 'text-slate-400',
        highlightDate: 'No Sales Yet',
        highlightAmount: '₹0',
        highlightPct: '0%',
        yDomain: [0, 1000] as [number, number],
        yTicks: [0, 250, 500, 750, 1000],
        yFormatter: (val: number) => (val === 0 ? '₹0' : `₹${val}`),
        points,
      };
    }

    const maxVal = Math.max(...points.map((p) => p.value), 1000);
    const domainMax = Math.ceil(maxVal * 1.25);
    const yStep = Math.ceil(domainMax / 4);
    const yTicks = [0, yStep, yStep * 2, yStep * 3, domainMax];
    const yFormatter = (val: number) =>
      val === 0
        ? '₹0'
        : val >= 100000
        ? `₹${(val / 100000).toFixed(1)}L`
        : val >= 1000
        ? `₹${(val / 1000).toFixed(0)}k`
        : `₹${val}`;

    const peakBucket = points.reduce((best, cur) => (cur.value > best.value ? cur : best), points[0]);

    return {
      title: periodTitle,
      dropdownLabel: revenuePeriod.toUpperCase(),
      totalFormatted: `₹${Math.round(confirmedRevenueOrZero(confirmedTotal)).toLocaleString('en-IN')}`,
      gainText: `₹${Math.round(confirmedTotal).toLocaleString('en-IN')} from ${validOrders.length} order${validOrders.length > 1 ? 's' : ''}`,
      gainPct: `${validOrders.length} active`,
      gainColor: 'text-emerald-600',
      highlightDate: peakBucket.tooltipDate,
      highlightAmount: peakBucket.tooltipVal,
      highlightPct: peakBucket.pct,
      yDomain: [0, domainMax] as [number, number],
      yTicks,
      yFormatter,
      points,
    };
  }, [revenuePeriod, periodFinancials]);

  function confirmedRevenueOrZero(val: number) {
    return val > 0 ? val : 0;
  }

  // Overview metric values based on REAL tracked storefront engagement & real confirmed orders
  const metricsData = useMemo(() => {
    const filterToInterval: Record<TimeFilter, TimeInterval> = {
      Daily: 'daily',
      Weekly: 'weekly',
      Monthly: 'monthly',
      '6 Months': '6months',
      Yearly: 'yearly',
    };
    const activeInterval = filterToInterval[timeFilter] || revenuePeriod;

    const validOrdersInPeriod = orders.filter(
      (o) => !isOrderCancelledOrInvalid(o) && isWithinPeriod(o.createdAt, activeInterval)
    );
    const liveOrdersCount = validOrdersInPeriod.length;

    // Pull real tracked product & category engagement events from AnalyticsService
    const trackedEvents = AnalyticsService.getRecentEvents(500).filter(
      (ev) =>
        (ev.eventType === 'product_view' || ev.eventType === 'category_view') &&
        isWithinPeriod(ev.timestamp, activeInterval)
    );
    const realViews = trackedEvents.length;
    const uniqueSessions = new Set(trackedEvents.map((e) => e.sessionId).filter(Boolean)).size;
    const realVisits = uniqueSessions;

    const convRate =
      liveOrdersCount > 0 && realVisits > 0
        ? `${Math.min(100, (liveOrdersCount / realVisits) * 100).toFixed(1)}%`
        : '0%';

    return {
      views: realViews.toLocaleString('en-IN'),
      visits: realVisits.toLocaleString('en-IN'),
      orders: liveOrdersCount.toLocaleString('en-IN'),
      conv: convRate,
      subtitleDays:
        timeFilter === 'Daily'
          ? 'today'
          : timeFilter === 'Weekly'
          ? 'last 7 days'
          : timeFilter === 'Monthly'
          ? 'last 30 days'
          : timeFilter === '6 Months'
          ? 'last 6 months'
          : 'last 365 days',
    };
  }, [timeFilter, revenuePeriod, orders, analyticsTick, isOrderCancelledOrInvalid, isWithinPeriod]);

  // Real Category & Payment distribution for the Analytics tab
  const realBreakdownStats = useMemo(() => {
    const validOrders = periodFinancials.validInPeriod;
    const totalRev = periodFinancials.confirmedRevenue;

    // 1. Category Sales Distribution from real order items
    const catTotals: Record<string, number> = {};
    validOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const matchedProd = products.find((p) => p.id === item.productId || p.name === item.name);
        const catName = matchedProd?.category || 'Apparel & Ethnic Wear';
        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        catTotals[catName] = (catTotals[catName] || 0) + lineTotal;
      });
    });

    const colors = ['bg-slate-900', 'bg-slate-700', 'bg-slate-500', 'bg-slate-400', 'bg-slate-300'];
    const baseCategoryNames =
      Object.keys(catTotals).length > 0
        ? Object.keys(catTotals)
        : categories.slice(0, 4).map((c) => c.name);

    const categoryDistribution = baseCategoryNames.map((name, idx) => {
      const amt = catTotals[name] || 0;
      const pct = totalRev > 0 ? Math.min(100, Math.round((amt / totalRev) * 100)) : 0;
      return {
        name,
        pct,
        amount: `₹${Math.round(amt).toLocaleString('en-IN')}`,
        color: colors[idx % colors.length],
      };
    });

    // 2. Payment Mode Share from real orders
    const totalOrdersCount = validOrders.length;
    const prepaidCount = validOrders.filter((o) => o.paymentMode === 'Prepaid').length;
    const codCount = validOrders.filter((o) => o.paymentMode === 'COD').length;

    const paymentDistribution = [
      {
        name: 'Prepaid (UPI / Cards / NetBanking)',
        pct: totalOrdersCount > 0 ? Math.round((prepaidCount / totalOrdersCount) * 100) : 0,
        count: `${prepaidCount} order${prepaidCount === 1 ? '' : 's'}`,
        color: 'bg-emerald-600',
      },
      {
        name: 'Cash on Delivery (COD)',
        pct: totalOrdersCount > 0 ? Math.round((codCount / totalOrdersCount) * 100) : 0,
        count: `${codCount} order${codCount === 1 ? '' : 's'}`,
        color: 'bg-amber-600',
      },
    ];

    return { categoryDistribution, paymentDistribution };
  }, [periodFinancials, products, categories]);

  // Dynamic Recent activity feed based on actual customer orders
  const activities = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }
    return orders.slice(0, 5).map((o, idx) => ({
      id: o.id || `act-${idx}`,
      name: o.customer?.name || (o as any).shippingAddress?.fullName || 'Online Shopper',
      action: `placed order ${o.id} (₹${(Number(o.total) || 0).toLocaleString('en-IN')})`,
      time: o.createdAt
        ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Just now',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      iconType: 'purchase' as const,
    }));
  }, [orders]);

  // Dedicated Authentication & Admin-Role Security Guard:
  // Strictly enforce that /admin only renders for authenticated users with active 'admin' roles.
  // Force login prompt (AdminLoginGate) for any unauthenticated or unauthorized access.
  const isAuthorizedAdmin = useMemo(() => {
    if (!isAdminAuthenticated) return false;
    if (!currentAdminUser) return false;
    if (currentAdminUser.status === 'disabled') return false;
    const validRoles = ['Super Admin', 'Label Admin', 'Listing + Label Admin'];
    return validRoles.includes(currentAdminUser.role);
  }, [isAdminAuthenticated, currentAdminUser]);

  if (!isAuthorizedAdmin) {
    return <AdminLoginGate />;
  }

  const roleBadge = getRoleBadgeInfo(currentAdminUser.role);

  return (
    <div className="min-h-screen bg-[#eef0f4] p-3 md:p-6 lg:p-8 font-sans antialiased text-[#111827] flex items-center justify-center">
      {/* Outer Rounded Container Card matching the design image exactly */}
      <div className="w-full max-w-[1440px] bg-white rounded-[28px] md:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-200/70 flex flex-col min-h-[920px] overflow-hidden">
        

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* ============================================================ */}
          {/* LEFT SIDEBAR                                                 */}
          {/* ============================================================ */}
          <aside
            className={`bg-white border-r border-slate-100/90 p-4 lg:p-5 flex flex-col justify-between transition-all duration-300 shrink-0 lg:rounded-l-[28px] md:rounded-l-[36px] sticky top-0 self-start ${
              sidebarCollapsed ? 'w-20' : 'w-64 md:w-68 lg:w-72'
            }`}
          >
          <div className="space-y-3.5">
            {/* Top Sidebar: User Profile (Super Admin) - Unified Merged Box */}
            <div ref={userMenuRef} className="pb-2">
              {!sidebarCollapsed ? (
                <div
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isUserMenuOpen
                      ? 'border-slate-300 bg-slate-50/70 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Top Profile Header (Clickable Trigger) */}
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-2.5 transition cursor-pointer text-left ${
                      isUserMenuOpen ? 'bg-slate-50/90' : 'bg-white hover:bg-slate-50/60'
                    }`}
                    title={`${currentAdminUser.name} (${currentAdminUser.role}) - Account options`}
                    aria-expanded={isUserMenuOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {currentAdminUser.avatar || (currentAdminUser.role === 'Super Admin' && settings.adminProfile?.avatarUrl) ? (
                        <img
                          src={currentAdminUser.avatar || settings.adminProfile?.avatarUrl}
                          alt={currentAdminUser.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200 shadow-2xs">
                          {currentAdminUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                          {currentAdminUser.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {currentAdminUser.role === 'Super Admin' ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium uppercase ${roleBadge.badgeBg} ${roleBadge.badgeText}`}
                            >
                              {currentAdminUser.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 mr-0.5 ${
                        isUserMenuOpen ? 'rotate-180 text-slate-900' : ''
                      }`}
                    />
                  </button>

                  {/* Merged Inline Collapsible Options (Seamlessly inside the same box) */}
                  {isUserMenuOpen && (
                    <div className="border-t border-slate-200/80 p-1.5 space-y-1 bg-slate-50/60 animate-in fade-in slide-in-from-top-1 duration-150">
                      {currentAdminUser.role === 'Super Admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSettingsInitialSection('profile');
                              setActiveTab('settings');
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer font-medium ${
                              activeTab === 'settings'
                                ? 'bg-white text-slate-950 font-bold shadow-2xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                            }`}
                          >
                            <Settings className="w-4 h-4 text-slate-500" />
                            <span>Profile & Settings</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('admin-management');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition cursor-pointer font-medium ${
                              activeTab === 'admin-management'
                                ? 'bg-white text-slate-950 font-bold shadow-2xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Users className="w-4 h-4 text-slate-500" />
                              <span>Admin Management</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600 font-semibold uppercase border border-slate-300/60">
                              Roles
                            </span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={adminLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className={`flex justify-center mb-1 w-full p-1 rounded-xl cursor-pointer transition ${
                    isUserMenuOpen ? 'bg-slate-100 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                  }`}
                  title={`${currentAdminUser.name} (${currentAdminUser.role}) - Account options`}
                  aria-expanded={isUserMenuOpen}
                >
                  {currentAdminUser.avatar || (currentAdminUser.role === 'Super Admin' && settings.adminProfile?.avatarUrl) ? (
                    <img
                      src={currentAdminUser.avatar || settings.adminProfile?.avatarUrl}
                      alt={currentAdminUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs border border-slate-200">
                      {currentAdminUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              )}

              {/* Dropdown Menu (Collapsed Sidebar Floating Popover Only) */}
              {isUserMenuOpen && sidebarCollapsed && (
                <div className="fixed left-20 top-6 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {currentAdminUser.role === 'Super Admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsInitialSection('profile');
                          setActiveTab('settings');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer font-medium"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Profile & Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('admin-management');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer font-medium"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>Admin Management</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium uppercase border border-slate-200">
                          Roles
                        </span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      adminLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <div className="space-y-3">
              <div>
                {!sidebarCollapsed && (
                  <p className="text-[11px] font-medium text-slate-400 tracking-wider mb-1 px-1">
                    Menu
                  </p>
                )}

                <nav className="space-y-1">
                  {/* Home (Super Admin only) */}
                  {currentAdminUser.role === 'Super Admin' && (
                    <button
                      onClick={() => setActiveTab('home')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'home'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Home className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate text-left">Home</span>}
                    </button>
                  )}

                  {/* Orders & Shipping Labels (All Staff & Super Admin) */}
                  <button
                    onClick={() => setActiveTab('finances')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'finances'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <span>
                          {currentAdminUser.role === 'Label Admin'
                            ? 'Orders & Labels'
                            : 'Orders'}
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && orderCounts.pending > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-bold">
                        {orderCounts.pending}
                      </span>
                    )}
                  </button>

                  {/* Catalog (Super Admin and Listing + Label Admin) */}
                  {currentAdminUser.role !== 'Label Admin' && (
                    <div>
                      <button
                        onClick={() => {
                          setActiveTab('catalog');
                          setCatalogExpanded(!catalogExpanded);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          activeTab === 'catalog'
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="w-4 h-4 shrink-0" />
                          {!sidebarCollapsed && <span>Catalog</span>}
                        </div>
                        {!sidebarCollapsed && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              catalogExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>
                      {!sidebarCollapsed && catalogExpanded && (
                        <div className="pl-9 pr-2 py-1 space-y-1 text-xs text-slate-500">
                          <button
                            type="button"
                            onClick={handleOpenAddProduct}
                            className={`w-full text-left py-1.5 px-2 rounded-lg transition flex items-center justify-between font-semibold cursor-pointer ${
                              activeTab === 'add-product' && !editingProduct
                                ? 'bg-slate-900 text-white font-bold shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Product</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('inventory')}
                            className={`w-full text-left py-1.5 px-2 rounded-lg transition flex items-center justify-between font-semibold cursor-pointer ${
                              activeTab === 'inventory'
                                ? 'bg-slate-900 text-white font-bold shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Inventory &amp; Stock</span>
                            </span>
                            {lowStockCount > 0 && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  activeTab === 'inventory'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {lowStockCount} low
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('catalog');
                              setCatalogCategoryFilter('all');
                            }}
                            className={`w-full text-left py-1.5 px-2 rounded-lg hover:text-slate-900 transition flex items-center justify-between ${
                              activeTab === 'catalog' && catalogCategoryFilter === 'all'
                                ? 'text-slate-900 font-bold bg-slate-100'
                                : 'text-slate-600'
                            }`}
                          >
                            <span>All Products</span>
                            <span className="text-[10px] text-slate-400">{products.length}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Categories & Banners Direct Sidebar Tab */}
                  {(currentAdminUser.role === 'Super Admin' || currentAdminUser.role === 'Listing + Label Admin') && (
                    <button
                      onClick={() => setActiveTab('categories-banners')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'categories-banners'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Layers className="w-4 h-4 shrink-0 text-slate-500" />
                      {!sidebarCollapsed && <span className="truncate text-left">Categories &amp; Banners</span>}
                    </button>
                  )}

                  {/* Customers, Marketing, Analytics (Super Admin exclusive) */}
                  {currentAdminUser.role === 'Super Admin' && (
                    <>
                      <button
                        onClick={() => setActiveTab('customers')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                          activeTab === 'customers'
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate text-left">Customers</span>}
                      </button>

                      <button
                        onClick={() => setActiveTab('marketing')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                          activeTab === 'marketing'
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Megaphone className="w-4 h-4 shrink-0 text-slate-500" />
                        {!sidebarCollapsed && <span className="truncate text-left">Marketing &amp; Announcements</span>}
                      </button>

                      <button
                        onClick={() => setActiveTab('analytics')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                          activeTab === 'analytics'
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <BarChart2 className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate text-left">Analytics</span>}
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('admin-management');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                          activeTab === 'admin-management'
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                        title="Staff & Admin Roles Manager"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 shrink-0 text-slate-700" />
                          {!sidebarCollapsed && <span>Admin Management</span>}
                        </div>
                        {!sidebarCollapsed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Staff
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </nav>
              </div>

              {/* Integrations Section (Super Admin exclusive) */}
              {currentAdminUser.role === 'Super Admin' && (
                <div>
                  {!sidebarCollapsed && (
                    <div className="text-[11px] font-medium text-slate-400 tracking-wider mb-1 px-1">
                      <span>Integrations</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('integrations');
                        setIntegrationSubTab('couriers');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'integrations' && integrationSubTab === 'couriers'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Truck className="w-4 h-4 shrink-0 text-slate-900" />
                      {!sidebarCollapsed && <span>Courier Channels</span>}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('integrations');
                        setIntegrationSubTab('payments');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'integrations' && integrationSubTab === 'payments'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 shrink-0 text-slate-900" />
                      {!sidebarCollapsed && <span>Payment Integration</span>}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('integrations');
                        setIntegrationSubTab('whatsapp');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'integrations' && integrationSubTab === 'whatsapp'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-slate-900" />
                      {!sidebarCollapsed && <span>Meta WhatsApp</span>}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('integrations');
                        setIntegrationSubTab('sms');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'integrations' && integrationSubTab === 'sms'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 shrink-0 text-slate-900" />
                      {!sidebarCollapsed && <span>SMS &amp; OTP Service</span>}
                    </button>

                    <button
                      onClick={() => setActiveTab('domain-dns')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'domain-dns'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                      title="Custom Domain & DNS (Google Hosting)"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 shrink-0 text-slate-900" />
                        {!sidebarCollapsed && <span>Domain &amp; DNS</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Live
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === 'settings'
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Settings className="w-4 h-4 shrink-0 text-slate-900" />
                      {!sidebarCollapsed && <span>Store Settings</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* MAIN DASHBOARD CONTENT AREA                                  */}
        {/* ============================================================ */}
        <main
          ref={mainContentRef}
          className={`flex-1 overflow-y-auto flex flex-col lg:rounded-r-[28px] md:rounded-r-[36px] ${
            activeTab === 'add-product' ? 'bg-[#f8fafc]' : 'bg-white'
          }`}
        >
          {/* Fixed/Sticky Top Header (Fixed on scroll, matching store front) */}
          {activeTab !== 'add-product' && (
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100/90 px-4 sm:px-6 md:px-8 lg:px-10 py-3.5 flex items-center justify-between gap-3 sm:gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all">
              {/* Left: Sidebar Toggle + RedMode Brand / Greeting (Click to scroll to top) */}
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                <button
                  id="admin-sidebar-toggle-btn"
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-xl border border-slate-200/90 hover:bg-slate-100 hover:text-slate-900 text-slate-600 transition cursor-pointer shadow-3xs active:scale-95 shrink-0"
                  title={sidebarCollapsed ? 'Expand Sidebar Menu' : 'Minimize Sidebar Menu'}
                >
                  {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (currentAdminUser.role === 'Super Admin') {
                      setActiveTab('home');
                    } else {
                      setActiveTab(getDefaultTabForRole(currentAdminUser.role));
                    }
                    handleScrollToTop();
                  }}
                  className="text-left group cursor-pointer focus:outline-none flex items-center select-none"
                  title="RedMode Admin"
                >
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 group-hover:opacity-80 transition flex items-center">
                    <span>Hello,&nbsp;</span>
                    {currentAdminUser.role === 'Super Admin' ? (
                      <>
                        <span className="text-[#E52229] font-bold">Red</span>
                        <span>Mode!</span>
                      </>
                    ) : (
                      <span>{currentAdminUser.name.split(' ')[0]}!</span>
                    )}
                  </h1>
                </button>
              </div>

              {/* Center: Fixed Search Bar (Stays fixed when screen scrolls, wider layout) */}
              <div ref={searchContainerRef} className="relative flex-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-2 sm:mx-6">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id="admin-fixed-search-input"
                  type="text"
                  placeholder="Search products, orders, SKU, customer..."
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCatalogSearch(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsSearchFocused(false);
                      if (searchQuery.trim().toLowerCase().includes('admin')) {
                        setActiveTab('admin-management');
                        setSearchQuery('');
                      } else if (currentAdminUser.role !== 'Label Admin') {
                        setActiveTab('catalog');
                        setCatalogSearch(searchQuery);
                      } else {
                        setActiveTab('finances');
                      }
                    }
                  }}
                  className="w-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-800 pl-10 pr-9 py-2.5 rounded-full border border-slate-200/80 focus:border-slate-400 outline-none transition shadow-2xs"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCatalogSearch('');
                        setIsSearchFocused(false);
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-200/80 border border-slate-300/80 rounded shadow-2xs pointer-events-none">
                      ⌘K
                    </kbd>
                  )}
                </div>

                {/* Quick Global Search Dropdown Palette */}
                {isSearchFocused && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 p-2 overflow-hidden animate-in fade-in duration-150 max-h-[75vh] overflow-y-auto">
                    {(() => {
                      const q = searchQuery.trim().toLowerCase();

                      // If query is empty: show quick navigation shortcuts
                      if (!q) {
                        const quickNavs = [
                          { id: 'orders', title: 'Orders & Fulfillment', desc: 'Manage orders, print slips & tracking', icon: Package, tab: 'finances' },
                          { id: 'catalog', title: 'Catalog & Products', desc: 'Browse products, sizes & inventory', icon: Layers, tab: 'catalog' },
                          { id: 'customers', title: 'Customers & CRM', desc: 'Customer profiles, numbers & history', icon: Users, tab: 'customers' },
                          { id: 'settings', title: 'Store Settings', desc: 'Logistics partners, payments & policies', icon: Settings, tab: 'settings' },
                          { id: 'marketing', title: 'Marketing & Announcements', desc: 'Top banners & seasonal offers', icon: Megaphone, tab: 'marketing' },
                        ];

                        return (
                          <div className="space-y-1">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                              <span>Quick Shortcuts</span>
                              <span className="font-mono text-[9px] text-slate-400 font-normal">Press ESC to close</span>
                            </div>
                            {quickNavs.map((nav) => {
                              const IconComponent = nav.icon;
                              return (
                                <button
                                  key={nav.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveTab(nav.tab);
                                    setIsSearchFocused(false);
                                  }}
                                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition cursor-pointer group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center shrink-0 transition">
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-900">{nav.title}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{nav.desc}</div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-800 transition">Jump &rarr;</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      }

                      // When query is typed: live search matching Orders, Products, and Navigation
                      const matchedOrders = orders.filter((o) => {
                        const name = (o.customer?.name || o.shippingAddress?.name || '').toLowerCase();
                        const phone = (o.customer?.phone || o.shippingAddress?.mobile || o.shippingAddress?.phone || '');
                        const idStr = o.id.toLowerCase();
                        const awbStr = (o.awb_number || o.shipment?.awb || '').toLowerCase();
                        return idStr.includes(q) || name.includes(q) || phone.includes(q) || awbStr.includes(q);
                      }).slice(0, 3);

                      const matchedProducts = products.filter((p) => {
                        const title = (p.title || '').toLowerCase();
                        const sku = (p.sku || '').toLowerCase();
                        const cat = (p.category || '').toLowerCase();
                        return title.includes(q) || sku.includes(q) || cat.includes(q);
                      }).slice(0, 3);

                      const navMatches = [
                        { id: 'home', title: 'Dashboard Overview', desc: 'Performance & revenue charts', tab: 'home' },
                        { id: 'orders', title: 'Orders & Fulfillment', desc: 'Order queues & Delhivery shipping', tab: 'finances' },
                        { id: 'catalog', title: 'Product Catalog', desc: 'Product listings & inventory', tab: 'catalog' },
                        { id: 'categories-banners', title: 'Categories & Banners', desc: 'Hero banners & category tiles', tab: 'categories-banners' },
                        { id: 'customers', title: 'Customer Hub', desc: 'Customer orders & phone numbers', tab: 'customers' },
                        { id: 'marketing', title: 'Marketing & Announcements', desc: 'Announcement bars & promos', tab: 'marketing' },
                        { id: 'analytics', title: 'Store Analytics', desc: 'Conversion & sales breakdown', tab: 'analytics' },
                        { id: 'settings', title: 'Store Settings', desc: 'Logistics, payments & policies', tab: 'settings' },
                        { id: 'admin-management', title: 'Admin Staff & Roles', desc: 'Team permissions & credentials', tab: 'admin-management' },
                      ].filter((n) => n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q) || n.id.includes(q)).slice(0, 2);

                      const hasAnyResults = matchedOrders.length > 0 || matchedProducts.length > 0 || navMatches.length > 0;

                      if (!hasAnyResults) {
                        return (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-xs text-slate-500">
                              No orders, products, or shortcuts found for &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('catalog');
                                setCatalogSearch(searchQuery);
                                setIsSearchFocused(false);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>Search in Catalog &rarr;</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {/* 1. MATCHING ORDERS */}
                          {matchedOrders.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span>Orders ({matchedOrders.length})</span>
                                <span className="text-[10px] text-slate-400 font-medium">Click to open</span>
                              </div>
                              <div className="space-y-0.5">
                                {matchedOrders.map((ord) => {
                                  const custName = ord.customer?.name || ord.shippingAddress?.name || 'Customer';
                                  const custPhone = ord.customer?.phone || ord.shippingAddress?.mobile || ord.shippingAddress?.phone || '';
                                  const displayId = `#RM-${ord.id.replace(/-/g, '').slice(-6).toUpperCase()}`;

                                  return (
                                    <button
                                      key={ord.id}
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('finances');
                                        setOrderSearchQuery(ord.id);
                                        setIsSearchFocused(false);
                                        setSearchQuery('');
                                      }}
                                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 transition cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                                          ORD
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600 transition">
                                              {displayId}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                              {ord.orderStatus || 'Confirmed'}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 truncate">
                                            {custName} {custPhone ? `• ${custPhone}` : ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="font-mono font-bold text-xs text-slate-900">₹{ord.total}</div>
                                        <div className="text-[10px] text-slate-400">{ord.paymentMode || 'COD'}</div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 2. MATCHING PRODUCTS */}
                          {matchedProducts.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Products ({matchedProducts.length})
                              </div>
                              <div className="space-y-0.5">
                                {matchedProducts.map((prod) => (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('catalog');
                                      setCatalogSearch(prod.title);
                                      setIsSearchFocused(false);
                                      setSearchQuery('');
                                    }}
                                    className="w-full text-left p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 transition cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {prod.image ? (
                                        <img
                                          src={prod.image}
                                          alt={prod.title}
                                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                          P
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="font-bold text-xs text-slate-900 group-hover:text-red-600 transition truncate">
                                          {prod.title}
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                          <span className="font-mono">{prod.sku || 'No SKU'}</span>
                                          <span>•</span>
                                          <span>{prod.category}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-mono font-bold text-xs text-slate-900">₹{prod.price}</div>
                                      <div className="text-[10px] font-semibold text-emerald-600">{prod.stock} in stock</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. NAVIGATION SHORTCUTS */}
                          {navMatches.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Admin Navigation
                              </div>
                              <div className="space-y-0.5">
                                {navMatches.map((nav) => (
                                  <button
                                    key={nav.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveTab(nav.tab);
                                      setIsSearchFocused(false);
                                      setSearchQuery('');
                                    }}
                                    className="w-full text-left p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">{nav.title}</span>
                                      <span className="text-[10px] text-slate-400">— {nav.desc}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-semibold">&rarr;</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Right: Open Site Pill Button */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  id="admin-open-site-btn"
                  type="button"
                  onClick={() => setActiveView('home')}
                  className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-black hover:bg-slate-800 text-white rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer shadow-sm hover:shadow shrink-0 active:scale-95"
                  title="Open Customer Website"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Open Site</span>
                </button>
              </div>
            </header>
          )}

          {/* Tab Views Content Container with consistent padding */}
          <div className={`flex-1 ${activeTab === 'add-product' ? 'p-0' : 'p-6 md:p-8 lg:p-10'}`}>

          {/* VIEW: HOME (Exact replica of user reference image) */}
          {activeTab === 'home' && (
            currentAdminUser.role === 'Super Admin' ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* ------------------------------------------------------------ */}
                {/* LEFT COLUMN: Overview Performance & Revenue Line Chart      */}
                {/* ------------------------------------------------------------ */}
                <div className="xl:col-span-8 space-y-8">
                {/* SECTION: Overview performance */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">Overview performance</h2>

                    {/* Dynamic Aggregation Interval Capsule */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 text-xs overflow-x-auto">
                      {(['Daily', 'Weekly', 'Monthly', '6 Months', 'Yearly'] as TimeFilter[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setTimeFilter(tab);
                            const periodMap: Record<TimeFilter, TimeInterval> = {
                              Daily: 'daily',
                              Weekly: 'weekly',
                              Monthly: 'monthly',
                              '6 Months': '6months',
                              Yearly: 'yearly',
                            };
                            setRevenuePeriod(periodMap[tab]);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                            timeFilter === tab
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 Metric Stats Grid inside Card */}
                  <div className="border border-slate-200/80 rounded-2xl p-6 bg-white shadow-2xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {/* Total Views */}
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-medium">Total Views</p>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{metricsData.views}</p>
                        <p className="text-[11px] text-slate-400">vs prev ({metricsData.subtitleDays})</p>
                      </div>

                      {/* Visits */}
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-medium">Visits</p>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{metricsData.visits}</p>
                        <p className="text-[11px] text-slate-400">vs prev ({metricsData.subtitleDays})</p>
                      </div>

                      {/* Orders */}
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-medium">Orders</p>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{metricsData.orders}</p>
                        <p className="text-[11px] text-slate-400">vs prev ({metricsData.subtitleDays})</p>
                      </div>

                      {/* Conversion Rate */}
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-medium">Conversion Rate</p>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{metricsData.conv}</p>
                        <p className="text-[11px] text-slate-400">vs prev ({metricsData.subtitleDays})</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION: Revenue */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">Revenue</h2>
                      <span className="text-[11px] font-medium text-slate-400 hidden sm:inline-block">
                        • {revenueData.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Segmented Filter Pills */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 text-xs overflow-x-auto">
                        {(
                          [
                            { key: 'daily', label: 'Daily', filter: 'Daily' },
                            { key: 'weekly', label: 'Weekly', filter: 'Weekly' },
                            { key: 'monthly', label: 'Monthly', filter: 'Monthly' },
                            { key: '6months', label: '6 Months', filter: '6 Months' },
                            { key: 'yearly', label: 'Yearly', filter: 'Yearly' },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                              setRevenuePeriod(tab.key);
                              setTimeFilter(tab.filter as TimeFilter);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                              revenuePeriod === tab.key
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          // Quick cycle period
                          const periods: ('daily' | 'weekly' | 'monthly' | '6months' | 'yearly')[] = [
                            'daily',
                            'weekly',
                            'monthly',
                            '6months',
                            'yearly',
                          ];
                          const idx = periods.indexOf(revenuePeriod);
                          setRevenuePeriod(periods[(idx + 1) % periods.length]);
                        }}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                        title="Toggle Next Period"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Revenue Card with Area/Line Chart matching image */}
                  <div className="border border-slate-200/80 rounded-2xl p-6 bg-white shadow-2xs space-y-6">
                    {/* Revenue Numbers and Floating Highlight Pin */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Total Revenue ({revenueData.title})</p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                          {revenueData.totalFormatted}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          You gained{' '}
                          <span className={`${revenueData.gainColor} font-semibold`}>
                            {revenueData.gainText}
                          </span>{' '}
                          <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold ml-1">
                            {revenueData.gainPct}
                          </span>
                        </p>
                      </div>

                      {/* Tooltip Highlight Card shown in screenshot */}
                      <div className="self-start sm:self-auto bg-white border border-slate-200/90 rounded-xl p-2.5 px-3 shadow-sm flex items-center gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{revenueData.highlightDate}</p>
                          <p className="text-sm font-bold text-slate-900">{revenueData.highlightAmount}</p>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {revenueData.highlightPct}
                        </span>
                      </div>
                    </div>

                    {/* Separated Order Value, Confirmed Revenue & Collected Payments Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <p className="text-[11px] text-slate-500 font-medium">Gross Order Value</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                          ₹{Math.round(periodFinancials.orderValue).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
                        <p className="text-[11px] text-emerald-700 font-medium">Confirmed Revenue</p>
                        <p className="text-sm font-bold text-emerald-900 mt-0.5">
                          ₹{Math.round(periodFinancials.confirmedRevenue).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <p className="text-[11px] text-slate-500 font-medium">Collected Payments</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                          ₹{Math.round(periodFinancials.collectedPayments).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {periodFinancials.confirmedRevenue === 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 font-medium">
                        No sales yet. Your revenue analytics will appear here once customers start placing orders.
                      </div>
                    )}

                    {/* Recharts Area Chart matching the exact visual style */}
                    <div className="h-64 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#f8fafc" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            domain={revenueData.yDomain as [number, number]}
                            ticks={revenueData.yTicks}
                            tickFormatter={revenueData.yFormatter}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-lg text-xs">
                                    <p className="text-[10px] text-slate-400">{data.tooltipDate}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="font-bold text-slate-900">{data.tooltipVal}</span>
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                        {data.pct}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#1e293b"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#revenueGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* RIGHT COLUMN: Shop Advisor, Products & Recent Activities    */}
              {/* ------------------------------------------------------------ */}
              <div className="xl:col-span-4 space-y-8">
                {/* WIDGET: Festive & Campaign Advisor (Clean Minimalist Option C) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-700" />
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">Campaign & Festive Planner</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsShopAdvisorEventsModalOpen(true)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>All Events</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {(() => {
                    const primaryEvent = allFestivalAlerts.find((a) => a.daysRemaining >= 0) || allFestivalAlerts[0];
                    if (!primaryEvent) return null;
                    const fest = primaryEvent.festival;
                    const countdown =
                      primaryEvent.daysRemaining === 0
                        ? 'Today'
                        : primaryEvent.daysRemaining === 1
                        ? 'Tomorrow'
                        : `In ${primaryEvent.daysRemaining} days`;

                    return (
                      <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                {fest.name}
                              </h3>
                              <span className="text-[11px] text-slate-400 font-normal">
                                • {formatFestivalDate(primaryEvent.targetDate)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed">
                              {fest.suggestedAnnouncement || fest.ethnicRelevance || fest.description}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              primaryEvent.daysRemaining <= 3
                                ? 'bg-red-50 text-red-700 border border-red-200/80 font-bold'
                                : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                            }`}
                          >
                            {countdown}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded text-[11px] tracking-wide">
                              {fest.suggestedCoupon || 'FESTIVE10'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
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
                              setSettingsSaveSuccess?.(`✓ Offer applied to announcement bar!`);
                              setTimeout(() => setSettingsSaveSuccess?.(null), 3000);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <span>Apply Offer</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* WIDGET: Products */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">Products</h2>
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>See All</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="border border-slate-200/80 rounded-2xl p-5 bg-white shadow-2xs divide-y divide-slate-100">
                    <div className="flex items-center justify-between py-2.5 first:pt-0">
                      <span className="text-xs font-medium text-slate-600">Active listings</span>
                      <span className="text-sm font-bold text-slate-900">{activeProductsCount}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs font-medium text-slate-600">Expired</span>
                      <span className="text-sm font-bold text-slate-900">{lowStockCount}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5 last:pb-0">
                      <span className="text-xs font-medium text-slate-600">Sold out</span>
                      <span className="text-sm font-bold text-slate-900">{soldOutCount}</span>
                    </div>
                  </div>
                </div>

                {/* WIDGET: Recent Activities */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">Recent Activities</h2>
                    <button
                      onClick={() => setActiveTab('finances')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>See All</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {activities.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        No recent activity yet. When customers place orders or save items, live events will appear here.
                      </div>
                    ) : (
                      activities.map((act) => (
                        <div key={act.id} className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={act.avatar}
                              alt={act.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-100"
                            />
                            {act.iconType === 'heart' ? (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px]">
                                ♥
                              </div>
                            ) : (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                                ✓
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-800">
                              <span className="font-bold text-slate-900">{act.name}</span>{' '}
                              <span className="text-slate-500">{act.action}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Live Sales, Revenue & Performance Dashboard"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: CATALOG */}
          {activeTab === 'catalog' && (
            currentAdminUser.role !== 'Label Admin' ? (
              <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Product Catalog &amp; Inventory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organize listings by category, manage color and size variations, and update live prices
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('categories-banners')}
                    className="px-4 py-2.5 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-full hover:border-black hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Layers className="w-4 h-4 text-[#E52229]" />
                    <span>Categories &amp; Banners</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2.5 bg-black text-white text-xs font-semibold rounded-full hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {/* Listing + Label Admin Activity Monitor (Last 5 actions) */}
              {currentAdminUser.role === 'Listing + Label Admin' && (
                <StaffActivityMonitor
                  mode="role_dashboard"
                  targetRole="Listing + Label Admin"
                  title="Listing + Label Admin — Activity Monitor"
                />
              )}

              {/* Category Pills, View Mode & Search Toolbar */}
              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setCatalogCategoryFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        catalogCategoryFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All Categories ({products.length})
                    </button>

                    {categories.map((cat) => {
                      const count = products.filter(
                        (p) =>
                          p.category.toLowerCase().includes(cat.name.toLowerCase()) ||
                          p.category.toLowerCase() === cat.slug.toLowerCase()
                      ).length;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCatalogCategoryFilter(cat.name.toLowerCase())}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                            catalogCategoryFilter === cat.name.toLowerCase()
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cat.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              catalogCategoryFilter === cat.name.toLowerCase()
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Controls: View Switcher + Search */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* View Switcher: Color-wise vs Grouped */}
                    <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 text-xs">
                      <button
                        type="button"
                        onClick={() => setCatalogViewMode('variants')}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          catalogViewMode === 'variants'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Display every color variation as a separate list item with its own photo, stock, price, and SKU"
                      >
                        <Palette className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Color-Wise List</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogViewMode('grouped')}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          catalogViewMode === 'grouped'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Group all colors under parent style"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>Grouped Styles</span>
                      </button>
                    </div>

                    {/* Filter / Search within catalog */}
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search name, color, SKU..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Table with Category & Color Variations */}
              {(() => {
                const filteredProducts = products.filter((p) => {
                  if (catalogCategoryFilter !== 'all') {
                    const matchCategory =
                      p.category.toLowerCase().includes(catalogCategoryFilter) ||
                      (catalogCategoryFilter === 'trouser' &&
                        (p.category.toLowerCase().includes('trouser') ||
                          p.category.toLowerCase().includes('bottom')));
                    if (!matchCategory) return false;
                  }
                  if (catalogSearch.trim()) {
                    const q = catalogSearch.toLowerCase();
                    const matchSearch =
                      p.name.toLowerCase().includes(q) ||
                      (p.sku && p.sku.toLowerCase().includes(q)) ||
                      (p.color && p.color.toLowerCase().includes(q)) ||
                      (p.colorOptions &&
                        p.colorOptions.some((co) => co.name.toLowerCase().includes(q)));
                    if (!matchSearch) return false;
                  }
                  return true;
                });

                if (filteredProducts.length === 0) {
                  return (
                    <div className="p-12 text-center border border-slate-200/80 rounded-2xl bg-white shadow-2xs space-y-3">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-800 text-sm">No products found in this category</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Add your first product to this category or adjust your search keywords.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddProduct}
                        className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-full hover:bg-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                    </div>
                  );
                }

                // If in Color-Wise Variant View:
                if (catalogViewMode === 'variants') {
                  // Flatten all color variants so each color is its own row:
                  // Blue kurti, Black kurti, White kurti, etc.
                  const allVariants = filteredProducts.flatMap((p) => {
                    if (p.colorOptions && p.colorOptions.length > 0) {
                      return p.colorOptions.map((col, idx) => ({
                        product: p,
                        colorIndex: idx,
                        colorName: col.name,
                        colorHex: col.hex || '#18181b',
                        image: col.image || col.images?.[0] || p.mainImage,
                        galleryCount: col.images?.length || 1,
                        sku: col.sku || (p.sku ? `${p.sku}-${col.name.slice(0, 3).toUpperCase()}` : `${p.id}-${col.name}`),
                        price: col.price ?? p.price,
                        mrp: col.mrp ?? p.mrp,
                        stockBySize: col.stockBySize || p.stockBySize || {},
                        sizes: col.sizes || p.sizes || ['S', 'M', 'L', 'XL'],
                        isFirstVariant: idx === 0,
                        isLastVariant: idx === p.colorOptions!.length - 1,
                        totalVariants: p.colorOptions!.length,
                      }));
                    }
                    return [
                      {
                        product: p,
                        colorIndex: 0,
                        colorName: p.color || 'Standard',
                        colorHex: '#18181b',
                        image: p.mainImage,
                        galleryCount: p.images?.length || 1,
                        sku: p.sku || p.id,
                        price: p.price,
                        mrp: p.mrp,
                        stockBySize: p.stockBySize || {},
                        sizes: p.sizes || ['S', 'M', 'L', 'XL'],
                        isFirstVariant: true,
                        isLastVariant: true,
                        totalVariants: 1,
                      },
                    ];
                  });

                  // Additional client filter for search query across variant color names or SKUs
                  const displayedVariants = catalogSearch.trim()
                    ? allVariants.filter((v) => {
                        const q = catalogSearch.toLowerCase();
                        return (
                          v.product.name.toLowerCase().includes(q) ||
                          v.colorName.toLowerCase().includes(q) ||
                          v.sku.toLowerCase().includes(q) ||
                          v.product.category.toLowerCase().includes(q)
                        );
                      })
                    : allVariants;

                  const allDisplayedProductIds = Array.from(new Set(displayedVariants.map((v) => v.product.id)));
                  const isAllSelected = allDisplayedProductIds.length > 0 && allDisplayedProductIds.every((id) => selectedCatalogProductIds.includes(id));
                  const toggleSelectAll = () => {
                    if (isAllSelected) {
                      setSelectedCatalogProductIds((prev) => prev.filter((id) => !allDisplayedProductIds.includes(id)));
                    } else {
                      setSelectedCatalogProductIds((prev) => Array.from(new Set([...prev, ...allDisplayedProductIds])));
                    }
                  };

                  const handleBulkDelete = () => {
                    if (selectedCatalogProductIds.length === 0) return;
                    const count = selectedCatalogProductIds.length;
                    if (
                      window.confirm(
                        `Are you sure you want to permanently delete ${count} selected product${count > 1 ? 's' : ''}? This will immediately remove them from the store.`
                      )
                    ) {
                      selectedCatalogProductIds.forEach((id) => {
                        deleteProduct(id);
                      });
                      setSelectedCatalogProductIds([]);
                    }
                  };

                  const handleBulkTag = (tagKey: 'isNewLaunch' | 'isBestseller' | 'isFestive', value: boolean) => {
                    selectedCatalogProductIds.forEach((id) => {
                      if (tagKey === 'isNewLaunch') {
                        updateProduct(id, { isNewLaunch: value, isNewArrival: value });
                      } else {
                        updateProduct(id, { [tagKey]: value });
                      }
                    });
                  };

                  const handleBulkChangeCategory = (newCat: string) => {
                    selectedCatalogProductIds.forEach((id) => {
                      updateProduct(id, { category: newCat });
                    });
                    setSelectedCatalogProductIds([]);
                  };

                  return (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      {/* Bulk Selection Actions Bar when items are selected */}
                      {selectedCatalogProductIds.length > 0 ? (
                        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3 text-xs border-b border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                            <span className="font-bold">
                              {selectedCatalogProductIds.length} {selectedCatalogProductIds.length === 1 ? 'Product' : 'Products'} Selected
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedCatalogProductIds([])}
                              className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer ml-1"
                            >
                              Deselect All
                            </button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Category Assign Dropdown */}
                            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                              <span className="text-[10px] text-slate-400 font-medium">Move to:</span>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleBulkChangeCategory(e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                defaultValue=""
                                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
                              >
                                <option value="" disabled className="bg-slate-900 text-white">Select Category...</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.name} className="bg-slate-900 text-white">{c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Quick Bulk Tag Controls */}
                            <button
                              type="button"
                              onClick={() => handleBulkTag('isNewLaunch', true)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-700"
                              title="Mark selected products as New Launch"
                            >
                              <span>✨ Launch</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleBulkTag('isBestseller', true)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-700"
                              title="Mark selected products as Bestseller"
                            >
                              <span>🔥 Best</span>
                            </button>

                            {/* Bulk Delete Button */}
                            {currentAdminUser.role !== 'Label Admin' && (
                              <button
                                type="button"
                                onClick={handleBulkDelete}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                                title="Delete selected products permanently from store"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete ({selectedCatalogProductIds.length})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              Showing {displayedVariants.length} Color Variation Listings
                            </span>
                            <span className="text-slate-400">across {filteredProducts.length} styles</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className="text-xs font-semibold text-slate-700 hover:text-black hover:underline cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                              <span>Select All ({allDisplayedProductIds.length})</span>
                            </button>
                            <span className="text-[11px] text-slate-400 hidden sm:inline">
                              Each color has independent photo, SKU, stock &amp; price
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[760px]">
                          <thead className="bg-slate-50/90 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                            <tr>
                              <th className="py-3.5 px-3.5 w-12 text-center">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                    title={isAllSelected ? "Deselect All" : "Select All Products"}
                                  />
                                </div>
                              </th>
                              <th className="py-3.5 px-4">Product &amp; Color Listing</th>
                              <th className="py-3.5 px-4">Category</th>
                              <th className="py-3.5 px-4">Color Swatch</th>
                              <th className="py-3.5 px-4">Variant SKU</th>
                              <th className="py-3.5 px-4">Price / MRP</th>
                              <th className="py-3.5 px-4">Stock &amp; Sizes</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {displayedVariants.map((v, i) => {
                              const stock = Object.values(v.stockBySize).reduce<number>(
                                (a, b) => a + (Number(b) || 0),
                                0
                              );
                              const isSelected = selectedCatalogProductIds.includes(v.product.id);

                              return (
                                <tr
                                  key={`${v.product.id}-${v.colorName}-${i}`}
                                  className={`hover:bg-slate-50/70 transition group ${
                                    isSelected
                                      ? 'bg-rose-50/30 font-medium'
                                      : v.totalVariants > 1 && !v.isFirstVariant
                                      ? 'bg-slate-50/20'
                                      : ''
                                  }`}
                                >
                                  {/* Checkbox Single Select */}
                                  <td className="py-3.5 px-3.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          setSelectedCatalogProductIds((prev) =>
                                            prev.includes(v.product.id)
                                              ? prev.filter((id) => id !== v.product.id)
                                              : [...prev, v.product.id]
                                          );
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                        title={`Select ${v.product.name}`}
                                      />
                                    </div>
                                  </td>

                                  {/* Photo & Name */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      {/* Variant Specific Photo */}
                                      <div className="relative shrink-0">
                                        <img
                                          src={v.image}
                                          alt={`${v.product.name} - ${v.colorName}`}
                                          className="w-12 h-16 rounded-xl object-cover border border-slate-200/90 shadow-2xs bg-slate-100"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80';
                                          }}
                                        />
                                        {/* Color dot badge on thumbnail */}
                                        <div
                                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-2xs"
                                          style={{ backgroundColor: v.colorHex }}
                                          title={`Color: ${v.colorName}`}
                                        />
                                      </div>

                                      <div className="min-w-0 max-w-[240px]">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="font-semibold text-slate-900 truncate">
                                            {v.product.name}
                                          </p>
                                        </div>

                                        {/* Color Variant Highlight Tag */}
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800 text-[11px] shadow-2xs">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                              style={{ backgroundColor: v.colorHex }}
                                            />
                                            <span>{v.colorName}</span>
                                          </span>

                                          {v.totalVariants > 1 && (
                                            <span className="text-[10px] text-slate-400 font-medium">
                                              ({v.colorIndex + 1}/{v.totalVariants})
                                            </span>
                                          )}

                                          {/* Quick Mark Launch / Bestseller / Festive / OfferTag */}
                                          <div className="flex items-center gap-1 flex-wrap mt-1">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const next = !(v.product.isNewLaunch || v.product.isNewArrival);
                                                updateProduct(v.product.id, { isNewLaunch: next, isNewArrival: next });
                                              }}
                                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                                                v.product.isNewLaunch || v.product.isNewArrival
                                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-3xs'
                                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                              }`}
                                              title="1-Click toggle New Launch tag"
                                            >
                                              ✨ Launch
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const next = !v.product.isBestseller;
                                                updateProduct(v.product.id, { isBestseller: next });
                                              }}
                                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                                                v.product.isBestseller
                                                  ? 'bg-zinc-900 text-white shadow-3xs'
                                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                              }`}
                                              title="1-Click toggle Bestseller tag"
                                            >
                                              🔥 Best
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const next = !v.product.isFestive;
                                                updateProduct(v.product.id, { isFestive: next });
                                              }}
                                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                                                v.product.isFestive
                                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs'
                                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                              }`}
                                              title="1-Click toggle Festive tag"
                                            >
                                              🪔 Festive
                                            </button>

                                            {v.product.offerTag && (
                                              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                {v.product.offerTag}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          Parent Style: {v.product.sku || v.product.id}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Category */}
                                  <td className="py-3.5 px-4">
                                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                      {v.product.category}
                                    </span>
                                    {v.product.subcategory && (
                                      <p className="text-[10px] text-slate-400 mt-1">{v.product.subcategory}</p>
                                    )}
                                  </td>

                                  {/* Color Swatch & Sibling Color Options */}
                                  <td className="py-3.5 px-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-5 h-5 rounded-full border-2 border-white ring-1 ring-slate-200 shadow-2xs shrink-0"
                                          style={{ backgroundColor: v.colorHex }}
                                        />
                                        <div>
                                          <p className="font-bold text-slate-800 text-xs">{v.colorName}</p>
                                          <p className="text-[10px] text-slate-400 font-mono">{v.galleryCount} photos</p>
                                        </div>
                                      </div>
                                      {v.product.colorOptions && v.product.colorOptions.length > 1 && (
                                        <div className="flex items-center gap-1 pt-0.5">
                                          <span className="text-[9px] text-slate-400">All colors:</span>
                                          {v.product.colorOptions.map((co, cIdx) => (
                                            <span
                                              key={cIdx}
                                              className={`w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 ${
                                                cIdx === v.colorIndex ? 'ring-1 ring-slate-900' : 'opacity-70'
                                              }`}
                                              style={{ backgroundColor: co.hex || '#000' }}
                                              title={co.name}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Variant SKU */}
                                  <td className="py-3.5 px-4">
                                    <span className="px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-md font-mono text-[11px] font-bold text-slate-700">
                                      {v.sku}
                                    </span>
                                  </td>

                                  {/* Price / MRP */}
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900 text-sm">₹{v.price}</div>
                                    {v.mrp && v.mrp > v.price && (
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-slate-400 line-through">
                                          ₹{v.mrp}
                                        </span>
                                        <span className="text-[9px] font-bold text-emerald-600">
                                          {Math.round(((v.mrp - v.price) / v.mrp) * 100)}% OFF
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Stock & Size Breakdown */}
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${getStockBadgeClass(stock)}`}
                                    >
                                      {stock} units in stock
                                    </span>

                                    {/* Per Size Badges */}
                                    <div className="flex flex-wrap gap-1 mt-1.5 max-w-[190px]">
                                      {Object.entries(v.stockBySize).map(([sz, qty]) => {
                                        const num = Number(qty) || 0;
                                        return (
                                          <span
                                            key={sz}
                                            className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border bg-white border-slate-200 text-slate-600 shadow-3xs"
                                            title={`${sz}: ${num} units (${num >= 10 ? 'In Stock' : 'Low Stock Alert'})`}
                                          >
                                            {sz}: <span className={getStockNumberColor(num)}>{num}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditProduct(v.product, v.colorIndex)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-black hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
                                        title={`Edit ${v.colorName} Variation`}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                      {currentAdminUser.role !== "Label Admin" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to permanently delete style "${v.product.name}"? This cannot be undone.`)) {
                                              deleteProduct(v.product.id);
                                            }
                                          }}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                          title="Delete Product"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // If in Grouped Styles View:
                const allDisplayedProductIds = filteredProducts.map((p) => p.id);
                const isAllSelected = allDisplayedProductIds.length > 0 && allDisplayedProductIds.every((id) => selectedCatalogProductIds.includes(id));
                const toggleSelectAll = () => {
                  if (isAllSelected) {
                    setSelectedCatalogProductIds((prev) => prev.filter((id) => !allDisplayedProductIds.includes(id)));
                  } else {
                    setSelectedCatalogProductIds((prev) => Array.from(new Set([...prev, ...allDisplayedProductIds])));
                  }
                };

                const handleBulkDelete = () => {
                  if (selectedCatalogProductIds.length === 0) return;
                  const count = selectedCatalogProductIds.length;
                  if (
                    window.confirm(
                      `Are you sure you want to permanently delete ${count} selected product${count > 1 ? 's' : ''}? This will immediately remove them from the store.`
                    )
                  ) {
                    selectedCatalogProductIds.forEach((id) => {
                      deleteProduct(id);
                    });
                    setSelectedCatalogProductIds([]);
                  }
                };

                const handleBulkTag = (tagKey: 'isNewLaunch' | 'isBestseller' | 'isFestive', value: boolean) => {
                  selectedCatalogProductIds.forEach((id) => {
                    if (tagKey === 'isNewLaunch') {
                      updateProduct(id, { isNewLaunch: value, isNewArrival: value });
                    } else {
                      updateProduct(id, { [tagKey]: value });
                    }
                  });
                };

                const handleBulkChangeCategory = (newCat: string) => {
                  selectedCatalogProductIds.forEach((id) => {
                    updateProduct(id, { category: newCat });
                  });
                  setSelectedCatalogProductIds([]);
                };

                return (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {/* Bulk Selection Actions Bar when items are selected */}
                    {selectedCatalogProductIds.length > 0 ? (
                      <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3 text-xs border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                          <span className="font-bold">
                            {selectedCatalogProductIds.length} {selectedCatalogProductIds.length === 1 ? 'Product' : 'Products'} Selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedCatalogProductIds([])}
                            className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer ml-1"
                          >
                            Deselect All
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400 font-medium">Move to:</span>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleBulkChangeCategory(e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              defaultValue=""
                              className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
                            >
                              <option value="" disabled className="bg-slate-900 text-white">Select Category...</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.name} className="bg-slate-900 text-white">{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleBulkTag('isNewLaunch', true)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-700"
                            title="Mark selected products as New Launch"
                          >
                            <span>✨ Launch</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBulkTag('isBestseller', true)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-700"
                            title="Mark selected products as Bestseller"
                          >
                            <span>🔥 Best</span>
                          </button>

                          {currentAdminUser.role !== 'Label Admin' && (
                            <button
                              type="button"
                              onClick={handleBulkDelete}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                              title="Delete selected products permanently from store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete ({selectedCatalogProductIds.length})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            Showing {filteredProducts.length} Product Styles
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-xs font-semibold text-slate-700 hover:text-black hover:underline cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>Select All ({allDisplayedProductIds.length})</span>
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                          <tr>
                            <th className="py-3.5 px-3.5 w-12 text-center">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={toggleSelectAll}
                                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                  title={isAllSelected ? "Deselect All" : "Select All Products"}
                                />
                              </div>
                            </th>
                            <th className="py-3.5 px-4">Product Details</th>
                            <th className="py-3.5 px-4">Category</th>
                            <th className="py-3.5 px-4">Color Variations</th>
                            <th className="py-3.5 px-4">Price / MRP</th>
                            <th className="py-3.5 px-4">Stock</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {filteredProducts.map((p) => {
                            const stock = Object.values(p.stockBySize || {}).reduce<number>(
                              (a, b) => a + (Number(b) || 0),
                              0
                            );
                            const variantsCount = p.colorOptions?.length || 1;
                            const isSelected = selectedCatalogProductIds.includes(p.id);

                            return (
                              <tr
                                key={p.id}
                                className={`hover:bg-slate-50/60 transition group ${
                                  isSelected ? 'bg-rose-50/30 font-medium' : ''
                                }`}
                              >
                                {/* Checkbox Single Select */}
                                <td className="py-3.5 px-3.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedCatalogProductIds((prev) =>
                                          prev.includes(p.id)
                                            ? prev.filter((id) => id !== p.id)
                                            : [...prev, p.id]
                                        );
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                      title={`Select ${p.name}`}
                                    />
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 flex items-center gap-3">
                                  <img
                                    src={p.mainImage}
                                    alt={p.name}
                                    className="w-11 h-14 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80';
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 truncate max-w-[220px]">
                                      {p.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        SKU: {p.sku || p.id}
                                      </span>
                                      {/* Quick Mark Launch / Bestseller / Festive / OfferTag */}
                                      <div className="flex items-center gap-1 flex-wrap mt-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const next = !(p.isNewLaunch || p.isNewArrival);
                                            updateProduct(p.id, { isNewLaunch: next, isNewArrival: next });
                                          }}
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                                            p.isNewLaunch || p.isNewArrival
                                              ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-3xs'
                                              : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                          }`}
                                          title="1-Click toggle New Launch tag"
                                        >
                                          ✨ Launch
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const next = !p.isBestseller;
                                            updateProduct(p.id, { isBestseller: next });
                                          }}
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                                            p.isBestseller
                                              ? 'bg-zinc-900 text-white shadow-3xs'
                                              : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                          }`}
                                          title="1-Click toggle Bestseller tag"
                                        >
                                          🔥 Best
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const next = !p.isFestive;
                                            updateProduct(p.id, { isFestive: next });
                                          }}
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                                            p.isFestive
                                              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs'
                                              : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                          }`}
                                          title="1-Click toggle Festive tag"
                                        >
                                          🪔 Festive
                                        </button>

                                        {p.offerTag && (
                                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                            {p.offerTag}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                    {p.category}
                                  </span>
                                  {p.subcategory && (
                                    <p className="text-[10px] text-slate-400 mt-1">{p.subcategory}</p>
                                  )}
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {p.colorOptions && p.colorOptions.length > 0 ? (
                                        p.colorOptions.map((col, idx) => (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleOpenEditProduct(p, idx)}
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer text-xs font-semibold text-slate-800 shadow-3xs"
                                            title={`Edit ${col.name} (${col.images?.length || 1} photos)`}
                                          >
                                            <span
                                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-3xs"
                                              style={{ backgroundColor: col.hex || '#000' }}
                                            />
                                            <span className="text-[11px]">{col.name}</span>
                                          </button>
                                        ))
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-600 font-medium">
                                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                                          <span>{p.color || 'Standard'}</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[10px] text-slate-500 font-medium">
                                        {variantsCount} {variantsCount === 1 ? 'color option' : 'color variations'}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditProduct(p, p.colorOptions?.length || 0)}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                      >
                                        + Add Color
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-900">₹{p.price}</div>
                                  {p.mrp && p.mrp > p.price && (
                                    <span className="text-[10px] text-slate-400 line-through">
                                      ₹{p.mrp}
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${getStockBadgeClass(stock)}`}
                                  >
                                    {stock} units
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-1 flex gap-1">
                                    {p.sizes?.slice(0, 4).join(', ')}
                                    {(p.sizes?.length || 0) > 4 && '...'}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditProduct(p)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-black hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
                                      title="Edit Product Details & Variations"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>
                                    {currentAdminUser.role !== "Label Admin" && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to permanently delete "${p.name}"? This cannot be undone.`)) {
                                            deleteProduct(p.id);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Delete Product"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Product Catalog & Listings"
                onRedirect={() => setActiveTab("finances")}
              />
            )
          )}

          {/* VIEW: DEDICATED ADD / EDIT PRODUCT PAGE */}
          {activeTab === 'add-product' && (
            currentAdminUser.role !== 'Label Admin' ? (
            <AddProductPage
              initialProduct={editingProduct}
              initialSelectedColorIndex={editingColorIndex}
              categories={categories}
              onSave={(productData) => {
                handleSaveProduct(productData);
                setActiveTab('catalog');
                setEditingProduct(null);
                setEditingColorIndex(0);
              }}
              onCancel={() => {
                setActiveTab('catalog');
                setEditingProduct(null);
                setEditingColorIndex(0);
              }}
            />
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Add / Edit Product"
                onRedirect={() => setActiveTab("finances")}
              />
            )
          )}

          {/* VIEW: INVENTORY MANAGEMENT */}
          {activeTab === 'inventory' && (
            currentAdminUser.role !== 'Label Admin' ? (
              <InventoryView onEditProduct={handleOpenEditProduct} />
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Inventory & Stock"
                onRedirect={() => setActiveTab("finances")}
              />
            )
          )}

          {/* VIEW: ORDERS & FULFILLMENT (MODERN ERP REDESIGN) */}
          {(activeTab === "finances" || activeTab === "orders") && (
            <div className="space-y-6">
              {currentAdminUser.role === 'Label Admin' && (
                <StaffActivityMonitor
                  mode="role_dashboard"
                  targetRole="Label Admin"
                  title="Label Admin — Activity Monitor"
                />
              )}
              <OrderManagementPanel />
            </div>
          )}

          {/* VIEW: CATEGORIES, SUBCATEGORIES & SLIDING BANNERS */}
          {activeTab === 'categories-banners' && (
            (currentAdminUser.role === 'Super Admin' || currentAdminUser.role === 'Listing + Label Admin') ? (
              <CategoriesAndBannersManager onSaveNotification={(msg) => setSettingsSaveSuccess(msg)} />
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Categories & Visuals Management"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: CUSTOMERS & WHATSAPP CAMPAIGN HUB */}
          {activeTab === 'customers' && (
            currentAdminUser.role === 'Super Admin' ? (
              <WhatsAppCustomerHub orders={orders} />
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Customer Management"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: MARKETING & TOP RUNNING ANNOUNCEMENTS */}
          {activeTab === 'marketing' && (
            currentAdminUser.role === 'Super Admin' ? (
              <AnnouncementBarManager onSaveNotification={(msg) => setSettingsSaveSuccess(msg)} />
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Marketing & Announcements"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: ANALYTICS */}
          {activeTab === 'analytics' && (
            currentAdminUser.role === 'Super Admin' ? (
            <div className="space-y-8">
              {/* Analytics Header with Dynamic Aggregation Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales &amp; Business Analytics</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Dynamic sales aggregation, order fulfillment insights, and traffic conversion metrics.
                  </p>
                </div>

                {/* Interval Filter Pills */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 text-xs overflow-x-auto self-start sm:self-auto">
                  {(
                    [
                      { key: 'daily', label: 'Daily', filter: 'Daily' },
                      { key: 'weekly', label: 'Weekly', filter: 'Weekly' },
                      { key: 'monthly', label: 'Monthly', filter: 'Monthly' },
                      { key: '6months', label: '6 Months', filter: '6 Months' },
                      { key: 'yearly', label: 'Yearly', filter: 'Yearly' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setRevenuePeriod(tab.key);
                        setTimeFilter(tab.filter as TimeFilter);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        revenuePeriod === tab.key
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metric KPI Cards (Consistent across all time frames) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                  <p className="text-xs font-medium text-slate-400">Total Sales ({revenueData.title})</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{revenueData.totalFormatted}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    {revenueData.gainText} ({revenueData.gainPct})
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                  <p className="text-xs font-medium text-slate-400">Total Orders</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metricsData.orders}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    vs previous ({metricsData.subtitleDays})
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                  <p className="text-xs font-medium text-slate-400">Avg. Order Value (AOV)</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ₹{periodFinancials.aov.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">
                    {periodFinancials.validInPeriod.length > 0 ? 'Based on confirmed orders' : '0 orders in period'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                  <p className="text-xs font-medium text-slate-400">Store Conversion Rate</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metricsData.conv}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{metricsData.visits} store visits</p>
                </div>
              </div>

              {/* Main Sales Trend Chart */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Revenue &amp; Sales Trajectory</h3>
                    <p className="text-xs text-slate-500">
                      Aggregated by {revenueData.title} • Showing peak sales at {revenueData.highlightDate} ({revenueData.highlightAmount})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                      Peak: {revenueData.highlightPct}
                    </span>
                  </div>
                </div>

                {periodFinancials.confirmedRevenue === 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 font-medium">
                    No sales yet. Your revenue analytics will appear here once customers start placing orders.
                  </div>
                )}

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={revenueData.yDomain as [number, number]}
                        ticks={revenueData.yTicks}
                        tickFormatter={revenueData.yFormatter}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-xl">
                                <p className="text-slate-400 font-medium text-[10px]">{data.tooltipDate}</p>
                                <p className="font-bold text-white text-sm mt-0.5">{data.tooltipVal}</p>
                                <p className="text-emerald-400 text-[11px] font-semibold mt-0.5">{data.pct} share</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#0f172a"
                        strokeWidth={2.5}
                        fill="url(#analyticsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown Grid: Categories & Payment Modes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Sales Distribution */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Category Sales Distribution</h3>
                  <div className="space-y-3">
                    {realBreakdownStats.categoryDistribution.map((cat) => (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                          <span className="font-bold text-slate-600">{cat.pct}% ({cat.amount})</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Order Mode Distribution */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Payment &amp; Fulfillment Share</h3>
                  <div className="space-y-3">
                    {realBreakdownStats.paymentDistribution.map((mode) => (
                      <div key={mode.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{mode.name}</span>
                          <span className="font-bold text-slate-600">{mode.pct}% ({mode.count})</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${mode.color} rounded-full`} style={{ width: `${mode.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Popular Categories & Product Views Real-Time Monitor */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Categories */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Popular Categories</h3>
                      <p className="text-xs text-slate-500">Live navigation tracking from StoreContent</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Live Feed
                    </span>
                  </div>

                  {(() => {
                    const topCategories = AnalyticsService.getPopularCategories();
                    if (topCategories.length === 0) {
                      return (
                        <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Browsing events will automatically populate category popularity rankings here.
                        </div>
                      );
                    }
                    const maxViews = Math.max(...topCategories.map((c) => c.views), 1);
                    return (
                      <div className="space-y-3">
                        {topCategories.slice(0, 5).map((cat, idx) => (
                          <div key={cat.categorySlug} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                {cat.categoryName}
                                <span className="text-[10px] text-slate-400 font-mono">/{cat.categorySlug}</span>
                              </span>
                              <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                                {cat.views} {cat.views === 1 ? 'view' : 'views'}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.round((cat.views / maxViews) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Popular Products */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Most Browsed Products</h3>
                      <p className="text-xs text-slate-500">Tracked product views across sessions</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Eye className="w-3 h-3 text-emerald-600" />
                      Real-time
                    </span>
                  </div>

                  {(() => {
                    const topProducts = AnalyticsService.getPopularProducts();
                    if (topProducts.length === 0) {
                      return (
                        <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Product clicks and page transitions will rank top browsed items here.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2.5">
                        {topProducts.slice(0, 5).map((prod, idx) => (
                          <div
                            key={prod.productId}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{prod.productName}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {prod.categorySlug ? `Category: ${prod.categorySlug}` : `ID: ${prod.productId}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block text-xs font-bold text-slate-900">
                                {prod.views} {prod.views === 1 ? 'view' : 'views'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Business Analytics"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: INTEGRATIONS (Dedicated External Service & API Integrations) */}
          {activeTab === 'integrations' && (
            currentAdminUser.role === 'Super Admin' ? (
            <div className="space-y-6 max-w-5xl">
              {/* Header */}
              <div className="border-b border-slate-200/80 pb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {integrationSubTab === 'payments'
                      ? 'Payment Integration'
                      : integrationSubTab === 'couriers'
                      ? 'Courier Channels'
                      : integrationSubTab === 'sms'
                      ? 'SMS & OTP Service Integrations'
                      : 'Meta WhatsApp'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    {integrationSubTab === 'payments'
                      ? 'Connect and manage payment gateways for domestic and international export checkout.'
                      : integrationSubTab === 'couriers'
                      ? 'Connect and manage external logistics couriers for order shipping and delivery.'
                      : integrationSubTab === 'sms'
                      ? 'Connect and manage transactional OTP gateways (Meta WhatsApp Cloud, 2Factor, Fast2SMS, MSG91) for logins and COD verification.'
                      : 'Connect and manage WhatsApp Business messaging API for automated customer alerts.'}
                  </p>
                </div>
              </div>

              {/* Feedback Alert Banners */}
              {settingsSaveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{settingsSaveSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsSaveSuccess(null)}
                    className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* SUB-PANEL 1: UNIVERSAL COURIER & CHANNEL INTEGRATIONS */}
              {integrationSubTab === 'couriers' && (
                <UniversalLogisticsPanel
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              )}

              {/* SUB-PANEL 2: UNIVERSAL MULTI-GATEWAY PAYMENTS (RAZORPAY + PAYPAL EXPORT) */}
              {integrationSubTab === 'payments' && (
                <UniversalPaymentPanel
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              )}

              {/* SUB-PANEL 3: WHATSAPP BUSINESS & NOTIFICATIONS API */}
              {integrationSubTab === 'whatsapp' && (
                <WhatsAppIntegrationPanel
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              )}

              {/* SUB-PANEL 4: SMS & TRANSACTIONAL OTP GATEWAYS */}
              {integrationSubTab === 'sms' && (
                <SmsIntegrationPanel
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              )}
            </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="API & External Service Integrations"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: DEDICATED PAYMENT GATEWAY SETTINGS */}
          {activeTab === 'payment-settings' && (
            currentAdminUser.role === 'Super Admin' ? (
              <div className="space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        Payment Gateway Settings
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Universal multi-gateway configuration. Setup credentials, run live connection tests, and toggle payment methods for Indian and international buyers.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                      Dual-Routing Active (UPI &amp; PayPal)
                    </span>
                  </div>
                </div>

                {/* Feedback Alert Banners */}
                {settingsSaveSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{settingsSaveSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsSaveSuccess(null)}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <UniversalPaymentPanel
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Payment Gateway Settings"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: ADMIN MANAGEMENT TAB */}
          {activeTab === 'admin-management' && (
            currentAdminUser.role === 'Super Admin' ? (
              <div className="space-y-6">
                <StaffActivityMonitor mode="super_admin" title="Staff Roles Live Activity Tracker" />
                <div id="admin-management-section" className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 md:p-8 space-y-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">Admin Management</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-normal uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                            Super Admin Only
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {localAdminUsers.length} Admin{localAdminUsers.length === 1 ? '' : 's'} ({localAdminUsers.filter((u) => u.status === 'active').length} Active)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Manage administrative team members, assign operational staff roles (Label Admin, Listing + Label Admin), and control account access.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="open-add-admin-modal-btn"
                      data-testid="open-add-admin-modal-btn"
                      onClick={handleOpenAddAdminModal}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Admin</span>
                    </button>
                  </div>

                  {/* Feedback Notification */}
                  {adminMgmtSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{adminMgmtSuccess}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminMgmtSuccess(null)}
                        className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* RESPONSIVE TABLE FOR DESKTOP & TABLETS */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Administrator</th>
                          <th className="px-4 py-3">Assigned Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {localAdminUsers.map((admin) => (
                          <tr key={admin.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {admin.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{admin.name}</span>
                                    {admin.id === currentAdminUser.id && (
                                      <span className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-normal border border-slate-200">
                                        You (Active)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-normal">{admin.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
                                  admin.role === 'Super Admin'
                                    ? 'bg-red-50 text-red-600 border-red-200 font-normal'
                                    : admin.role === 'Listing + Label Admin'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    admin.role === 'Super Admin'
                                      ? 'bg-red-500'
                                      : admin.role === 'Listing + Label Admin'
                                      ? 'bg-blue-600'
                                      : 'bg-emerald-600'
                                  }`}
                                />
                                <span>{admin.role}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  admin.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    admin.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                  }`}
                                />
                                <span className="capitalize">{admin.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                              {admin.mobile ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{admin.mobile}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {admin.role !== 'Super Admin' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAdminStatus(admin.id)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                        admin.status === 'active'
                                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      }`}
                                      title={admin.status === 'active' ? 'Disable account' : 'Enable account'}
                                    >
                                      {admin.status === 'active' ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAdminUser(admin.id, admin.name)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                      title="Delete staff account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-50 rounded border border-slate-100">
                                    Owner
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* RESPONSIVE MOBILE CARDS (< 768px) */}
                  <div className="block md:hidden space-y-3">
                    {localAdminUsers.map((admin) => (
                      <div
                        key={admin.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {admin.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <span>{admin.name}</span>
                                {admin.id === currentAdminUser.id && (
                                  <span className="text-[9px] text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-normal border border-slate-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">{admin.email}</div>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              admin.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                admin.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span className="capitalize">{admin.status}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border ${
                              admin.role === 'Super Admin'
                                ? 'bg-red-50 text-red-600 border-red-200 font-normal'
                                : admin.role === 'Listing + Label Admin'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                            }`}
                          >
                            <span>{admin.role}</span>
                          </span>

                          {admin.mobile && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {admin.mobile}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                          {admin.role !== 'Super Admin' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleAdminStatus(admin.id)}
                                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                {admin.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdminUser(admin.id, admin.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete staff account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Admin Management"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: MAIN ADMIN SETTINGS (Profile, Security, Notifications, Store, Admin Prefs, Privacy) */}
          {/* VIEW: MAIN ADMIN SETTINGS (Profile, Security, Notifications, Store Preferences) */}
          {activeTab === 'settings' && (
            currentAdminUser.role === 'Super Admin' ? (
              <div className="space-y-8">
                <AdminSettingsView
                  settings={settings}
                  updateSettings={handleUpdateSettingsWithAudit}
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Store Settings"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}

          {/* VIEW: DEDICATED DOMAIN & CUSTOM DNS MANAGER */}
          {activeTab === 'domain-dns' && (
            currentAdminUser.role === 'Super Admin' ? (
              <div className="space-y-8 max-w-5xl">
                <CustomDomainManager
                  settings={settings}
                  updateSettings={handleUpdateSettingsWithAudit}
                  onSaveNotification={(msg) => setSettingsSaveSuccess(msg)}
                />
              </div>
            ) : (
              <AccessDeniedNotice
                role={currentAdminUser.role}
                section="Domain & DNS Management"
                onRedirect={() => setActiveTab(getDefaultTabForRole(currentAdminUser.role))}
              />
            )
          )}
          </div>
        </main>
        </div>
      </div>

      {/* Floating Chat / Help Icon (bottom right, matching image) */}
      <button
        type="button"
        onClick={() => {
          setSettingsSaveSuccess('RedMode Support Helpdesk: Reach out via WhatsApp (+91 73027 97464) or email myredmode@gmail.com 💬');
          setTimeout(() => setSettingsSaveSuccess(null), 5000);
        }}
        className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-black hover:bg-slate-800 text-white flex items-center justify-center shadow-lg transition cursor-pointer z-50 hover:scale-105"
        title="Need help? Chat with us"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Dedicated Cancel Order Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cancel Order #{orderToCancel.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kya aap is order ko cancel karna chahte hain?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order summary card */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">
                  {orderToCancel.customer?.name || orderToCancel.shippingAddress?.name || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-800">
                  {orderToCancel.customer?.phone ||
                    orderToCancel.shippingAddress?.mobile ||
                    orderToCancel.shippingAddress?.phone ||
                    'No phone'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount &amp; Mode:</span>
                <span className="font-bold text-slate-900">
                  ₹{orderToCancel.total} ({orderToCancel.paymentMode || (orderToCancel as any).paymentMethod || 'COD'})
                </span>
              </div>
            </div>

            {/* Select reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Cancellation Reason (Kyun cancel ho raha hai?):
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
              >
                <option value="Customer requested cancellation via WhatsApp/Call">
                  Customer requested cancellation (WhatsApp / Call)
                </option>
                <option value="Fake or Unresponsive COD Order (No reply)">
                  Fake / Unresponsive COD Customer (No reply)
                </option>
                <option value="Customer changed mind / Ordered by mistake">
                  Customer changed mind / Ordered by mistake
                </option>
                <option value="Out of stock / Fabric defect">
                  Out of stock / Fabric defect
                </option>
                <option value="Courier unserviceable / Wrong pincode">
                  Courier unserviceable / Wrong pincode
                </option>
                <option value="Duplicate order placed">
                  Duplicate order placed
                </option>
                <option value="Other">
                  Other custom reason
                </option>
              </select>

              {cancelReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter specific reason..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800"
                />
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              ⚠️ Cancel karne se ye order dispatch list se hat jayega, iska parcel dispatch nahi hoga aur aapka RTO shipping charge bach jayega.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Keep Order (Don&apos;t Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Tax Invoice & Shipping Label Print Modal */}
      <OrderPrintModal
        order={selectedOrderForPrint}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        initialTab={printModalTab}
        onLabelDownloaded={(orderId) => {
          markLabelDownloaded(orderId);
          setOrderActionFeedback({
            id: orderId,
            message: 'Shipping label printed & Delhivery live tracking link dispatched to customer on WhatsApp (₹0 within 24h reply window) 🚚',
            type: 'success',
          });
          setTimeout(() => setOrderActionFeedback(null), 5000);
        }}
      />

      {/* 1-Click WhatsApp Order Notification Modal */}
      <WhatsAppOrderModal
        order={selectedOrderForWhatsApp}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />

      {/* ============================================================ */}
      {/* ADD ADMIN MODAL (Conditionally rendered for Super Admin)     */}
      {/* ============================================================ */}
      {isAddAdminModalOpen && currentAdminUser.role === 'Super Admin' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overscroll-contain animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseAddAdminModal();
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[86vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header with prominent Close Cross Button */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-3.5 bg-white/95 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Add New Admin</h3>
                  <p className="text-[11px] text-slate-500">Create staff account with role-based access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAddAdminModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateAdmin} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain">
                {adminMgmtError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{adminMgmtError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="add-admin-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="add-admin-name"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newAdminName}
                    onChange={(e) => {
                      setNewAdminName(e.target.value);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                      if (adminMgmtError) setAdminMgmtError(null);
                    }}
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? 'add-admin-name-error' : undefined}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                      formErrors.name
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                    }`}
                  />
                  {formErrors.name && (
                    <p id="add-admin-name-error" className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="add-admin-email" className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="add-admin-email"
                    type="email"
                    placeholder="staff@redmode.in"
                    value={newAdminEmail}
                    onChange={(e) => {
                      setNewAdminEmail(e.target.value);
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                      if (adminMgmtError) setAdminMgmtError(null);
                    }}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? 'add-admin-email-error' : undefined}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                      formErrors.email
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                    }`}
                  />
                  {formErrors.email && (
                    <p id="add-admin-email-error" className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.email}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-admin-mobile" className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      id="add-admin-mobile"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newAdminMobile}
                      onChange={(e) => {
                        setNewAdminMobile(e.target.value);
                        if (formErrors.mobile) setFormErrors((prev) => ({ ...prev, mobile: undefined }));
                        if (adminMgmtError) setAdminMgmtError(null);
                      }}
                      aria-invalid={!!formErrors.mobile}
                      aria-describedby={formErrors.mobile ? 'add-admin-mobile-error' : undefined}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                        formErrors.mobile
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                      }`}
                    />
                    {formErrors.mobile && (
                      <p id="add-admin-mobile-error" className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.mobile}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="add-admin-password" className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Password
                    </label>
                    <input
                      id="add-admin-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newAdminPassword}
                      onChange={(e) => {
                        setNewAdminPassword(e.target.value);
                        if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
                        if (adminMgmtError) setAdminMgmtError(null);
                      }}
                      aria-invalid={!!formErrors.password}
                      aria-describedby={formErrors.password ? 'add-admin-password-error' : undefined}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                        formErrors.password
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                      }`}
                    />
                    {formErrors.password && (
                      <p id="add-admin-password-error" className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.password}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assign Role <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className={`space-y-2 rounded-xl p-1 transition ${
                      formErrors.role ? 'ring-1 ring-rose-400 bg-rose-50/20' : ''
                    }`}
                    role="radiogroup"
                    aria-invalid={!!formErrors.role}
                    aria-describedby={formErrors.role ? 'add-admin-role-error' : undefined}
                  >
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${newAdminRole === 'Label Admin' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="adminRole"
                        value="Label Admin"
                        checked={newAdminRole === 'Label Admin'}
                        onChange={() => {
                          setNewAdminRole('Label Admin');
                          if (formErrors.role) setFormErrors((prev) => ({ ...prev, role: undefined }));
                          if (adminMgmtError) setAdminMgmtError(null);
                        }}
                        className="mt-0.5 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Label Admin</div>
                        <div className="text-[11px] text-slate-500">Access to Orders, Shipping Labels, AWB generation, manifests & shipment tracking. Strictly NO access to Live Sales, Revenue or Analytics dashboard.</div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${newAdminRole === 'Listing + Label Admin' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="adminRole"
                        value="Listing + Label Admin"
                        checked={newAdminRole === 'Listing + Label Admin'}
                        onChange={() => {
                          setNewAdminRole('Listing + Label Admin');
                          if (formErrors.role) setFormErrors((prev) => ({ ...prev, role: undefined }));
                          if (adminMgmtError) setAdminMgmtError(null);
                        }}
                        className="mt-0.5 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Listing + Label Admin</div>
                        <div className="text-[11px] text-slate-500">Manage products, listings & inventory PLUS complete order label & shipping capabilities.</div>
                      </div>
                    </label>
                  </div>
                  {formErrors.role && (
                    <p id="add-admin-role-error" className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.role}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3 bg-slate-50/95 backdrop-blur-xs border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseAddAdminModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Indian Festivals & Major Events 10-Day Alert Calendar Modal */}
      <FestivalAlertModal
        isOpen={isFestivalModalOpen}
        onClose={() => setIsFestivalModalOpen(false)}
        baseDate={effectiveFestivalDate}
        simulatedDate={simulatedFestivalDate}
        onSimulateDateChange={(date) => setSimulatedFestivalDate(date)}
      />

      {/* Shop Advisor Upcoming Events Modal (Immediate event pehle + Aage ke 10 events) */}
      <ShopAdvisorEventsModal
        isOpen={isShopAdvisorEventsModalOpen}
        onClose={() => setIsShopAdvisorEventsModalOpen(false)}
        alerts={allFestivalAlerts}
      />
    </div>
  );
};
