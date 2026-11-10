export interface ProductSeo {
  title: string;
  metaDescription: string;
  keywords: string;
  urlSlug: string;
  imageAlt: string;
}

export interface SizeChartEntry {
  size: string;
  bust: string;
  waist: string;
  hip: string;
  length: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number; // 1 to 5
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  helpfulCount?: number;
}

export interface ColorVariant {
  name: string;
  hex: string;
  image?: string;
  images?: string[];
  stockBySize?: Record<string, number>;
  priceBySize?: Record<string, number>;
  mrpBySize?: Record<string, number>;
  skuBySize?: Record<string, string>;
  sizes?: string[];
  sku?: string;
  price?: number;
  mrp?: number;
  productId?: string;
  material?: string;
  description?: string;
  highlights?: string[];
}

export interface ProductOffer {
  id: string;
  title: string;
  description: string;
  code?: string;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number;
  gstRate: number; // e.g. 5%
  offerTag?: string;
  mainImage: string;
  images: string[];
  category: string;
  subcategory: string;
  subSubcategory?: string;
  kurtiType?: string; // e.g. "Short Kurti", "Long Kurti", "Anarkali Kurti"
  typeStyle?: string; // e.g. "Straight Fit", "2-Piece Kurti Set"
  sizes: string[];
  defaultSize: string; // e.g. "S"
  stockBySize: Record<string, number>; // e.g. { S: 5, M: 12, L: 8, XL: 3 }
  priceBySize?: Record<string, number>;
  mrpBySize?: Record<string, number>;
  skuBySize?: Record<string, string>;
  sizeChart: SizeChartEntry[];
  description: string;
  returnPolicy: string;
  deliveryInfo: string;
  published: boolean;
  inactiveRowKeys?: string[];
  views: number;
  salesCount: number;
  createdAt: string;
  seo: ProductSeo;
  // Enhanced attributes
  brand?: string;
  sku?: string;
  material?: string;
  fit?: string;
  pattern?: string;
  color?: string;
  colorOptions?: ColorVariant[];
  occasion?: string;
  countryOfOrigin?: string;
  highlights?: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  offers?: ProductOffer[];
  // Special Badges & Tags (Marked via Admin Panel for Menu Highlights & Filters)
  isNewArrival?: boolean;
  isNewLaunch?: boolean;
  isBestseller?: boolean;
  isFestive?: boolean;
  tags?: string[];
  // Admin-Only Product & Packaging Specifications (Strictly internal - never shown to customers)
  product_length_cm?: number;
  product_width_cm?: number;
  product_height_cm?: number;
  product_weight_kg?: number;
  packed_length_cm?: number;
  packed_width_cm?: number;
  packed_height_cm?: number;
  packed_weight_kg?: number;
  updatedAt?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  bannerUrl?: string;
  description?: string;
  subcategories?: Subcategory[];
  childCategories?: Subcategory[];
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  imageUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  showOnHome?: boolean;
  subcategories: Subcategory[];
  updatedAt?: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  imageUrl: string;
  targetCategory: string;
  link?: string;
  categorySlug?: string;
  active: boolean;
  order: number;
  buttonText: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  selectedSize: string;
  selectedColor?: string;
  selectedColorImage?: string;
  variantId?: string;
  variantSku?: string;
  variantPrice?: number;
  quantity: number;
}

export interface AddedItemInfo {
  product: Product;
  size: string;
  formattedSize: string;
  color?: string;
  colorImage?: string;
  price: number;
  sku?: string;
}

export interface CustomerAddress {
  name: string;
  mobile: string;
  phone?: string;
  email?: string;
  country?: string; // e.g. 'India', 'United States', 'United Kingdom', etc.
  house?: string;
  address?: string;
  street?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface ShipmentTrackingHistory {
  status: string;
  location: string;
  timestamp: string;
  note: string;
}

export interface CourierOption {
  courier_id: number | string;
  courier_name: string;
  service_name?: string;
  rate?: number;
  shipping_charges?: number;
  gst?: number;
  total_charges?: number;
  expected_delivery?: string;
  min_weight?: string | number;
  chargeable_weight?: string | number;
  cod_charges?: number;
  image?: string;
}

export type ShipmozoCourierOption = CourierOption;

export interface ShipmentDetails {
  shipmentOrderId?: string;
  shipmozoOrderId?: string;
  courierId?: number | string;
  courier: string;
  courier_name?: string;
  awb: string;
  trackingUrl?: string;
  status: string;
  labelGenerated: boolean;
  labelUrl?: string;
  shippedAt: string;
  estimatedDelivery?: string;
  bookingError?: string;
  estimated_shipping_cost?: number;
  history: ShipmentTrackingHistory[];
}

export type ShipmozoDetails = ShipmentDetails;

export type OrderStatus =
  | 'NEW'
  | 'Pending'
  | 'COD Verification'
  | 'Confirmed'
  | 'Processing'
  | 'Ready to Ship'
  | 'READY TO SHIP'
  | 'RTD'
  | 'Ready to Dispatch'
  | 'BOOKING'
  | 'BOOKED'
  | 'Pickup Scheduled'
  | 'Picked Up'
  | 'In Transit'
  | 'Shipped'
  | 'SHIPPED'
  | 'Out for Delivery'
  | 'Delivered'
  | 'DELIVERED'
  | 'Cancelled'
  | 'CANCELLED'
  | 'Expired'
  | 'Return Requested'
  | 'Returned'
  | 'Refunded'
  | 'BOOKING FAILED';

export interface Order {
  id: string; // e.g. "#12345"
  customer: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  gst: number;
  deliveryCharge: number;
  total: number;
  paymentMode: 'COD' | 'Prepaid';
  paymentStatus: 'Paid' | 'Pending' | 'COD' | 'Failed' | 'Refunded';
  orderStatus: OrderStatus;
  createdAt: string;
  shipmozo?: ShipmozoDetails;

  // COD Verification & Fraud Shield (Strictly ₹0 free WhatsApp-based confirmation)
  codVerificationStatus?: 'UNVERIFIED' | 'CONFIRMED' | 'REJECTED';
  codVerifiedAt?: string;
  codVerifiedBy?: string;

  // Admin-Only Package & Shipping Fields (Strictly internal - never exposed to customer UI/API)
  final_package_weight?: number; // Final weight in kg
  final_package_length?: number; // Parcel length in cm
  final_package_width?: number; // Parcel width in cm
  final_package_height?: number; // Parcel height in cm
  final_package_weight_kg?: number;
  final_package_length_cm?: number;
  final_package_width_cm?: number;
  final_package_height_cm?: number;
  estimated_shipping_cost?: number;
  selected_courier_id?: number | string;
  selected_courier_name?: string;
  shipmozo_order_id?: string;
  awb_number?: string;
  shipment_status?: string;
  label_url_or_data?: string;

  // Order Confirmation & 10 AM - 9 PM Dispatch Batch Tracking
  customerConfirmed?: boolean;
  customerConfirmedAt?: string;
  confirmationSentAt?: string;
  whatsappStatus?: 'Sending' | 'Sent' | 'Awaiting Reply' | 'Confirmed' | 'No Reply' | 'Expired';
  whatsappSentAt?: string;
  whatsappReply?: string;
  whatsappReplyAt?: string;
  acceptedAt?: string;
  rtdAt?: string;
  scheduledConfirmationTime?: string; // For orders placed after 9 PM, scheduled for 10 AM next morning
  reminder23hSent?: boolean;
  reminder23hSentAt?: string;
  labelDownloaded?: boolean;
  labelDownloadedAt?: string;
  trackingSentToCustomer?: boolean;
  trackingSentAt?: string;
  reviewRequestSent?: boolean;
  reviewRequestSentAt?: string;
  isExpired?: boolean;
  expiredAt?: string;
  reactivatedAt?: string;
  confirmationAckSent?: boolean;
  confirmationAckSentAt?: string;

  // Genuine RTO & NDR (Delhivery Courier Information)
  rtoInfo?: {
    isRto: boolean;
    reason: string; // e.g. "Customer Refused Delivery", "Wrong Address", "Customer Unavailable", "Incomplete Address", "Repeatedly Unreachable"
    markedAt?: string;
    courierRemarks?: string;
  };
  ndrInfo?: {
    hasNdr: boolean;
    reason?: string;
    action?: string;
    timestamp?: string;
    attemptCount?: number;
  };

  // Activity Log & Status Audit History
  activityLog?: OrderActivityLogItem[];

  // Private Internal Notes (Admin-only, never visible to customer)
  internalNotes?: string;
  internalNotesUpdatedAt?: string;
  internalNotesUpdatedBy?: string;

  // Razorpay Online Payment Integration Fields
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}

export interface OrderActivityLogItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  source?: 'whatsapp' | 'delhivery' | 'system' | 'admin' | 'customer';
}

export type Banner = HeroBanner;

export interface Blog {
  id: string;
  title: string;
  slug: string;
  featuredImage: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  metaDescription?: string;
  published: boolean;
  createdAt: string;
  author: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  createdAt: string;
  status: 'New' | 'Resolved';
}

export interface DelhiverySettings {
  enabled: boolean;
  apiToken: string;
  clientName: string;
  warehouseName: string;
  pickupPincode: string;
  pickupAddress: string;
  pickupPhone: string;
  environment: 'production' | 'staging';
  defaultShippingMode: 'Surface' | 'Express';
  autoGenerateLabel: boolean;
  codRemittanceCycle: 'Weekly' | 'Bi-Weekly' | 'T+2';
}

export interface ShippingChannelConfig {
  id: string; // e.g. 'delhivery', 'amazon_shipping', 'shiprocket', 'bluedart', or custom string
  name: string; // Display name
  provider: 'delhivery' | 'amazon' | 'shiprocket' | 'bluedart' | 'dtdc' | 'xpressbees' | 'shadowfax' | 'custom';
  enabled: boolean;
  isPrimary: boolean;
  apiKey: string; // API Token / Secret / Access Key
  apiSecret?: string; // Secret Key / AWS Secret / LWA Client Secret
  clientId?: string; // Client ID / Account ID / Merchant ID / Delhivery Client Name
  warehouseName?: string;
  pickupPincode?: string;
  pickupPhone?: string;
  pickupAddress?: string;
  apiBaseUrl?: string; // Base URL or custom API endpoint
  trackingUrlTemplate?: string; // URL template with {{awb}}
  shippingMode?: 'Surface' | 'Express' | 'Standard';
  environment?: 'production' | 'staging';
  codRemittanceCycle?: 'T+2' | 'Weekly' | 'Bi-Weekly';
  customHeaders?: string;
  authType?: 'Bearer' | 'ApiKeyHeader' | 'BasicAuth' | 'Custom';
  awbEndpoint?: string;
  shipmentEndpoint?: string;
  trackingEndpoint?: string;
  webhookEndpoint?: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  provider: 'meta_cloud_api';
  phoneNumber: string;
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  orderConfirmationEnabled: boolean;
  orderDispatchTrackingEnabled: boolean;
  reminder23hEnabled: boolean;
  codVerificationOtpEnabled: boolean;
  deliveredReviewEnabled: boolean;
  apiEndpoint?: string;
}

export type SmsProviderType = 'meta_whatsapp' | 'twofactor' | 'fast2sms' | 'msg91' | 'custom_http';

export interface SmsGatewayConfig {
  id: string;
  name: string;
  provider: SmsProviderType;
  enabled: boolean;
  isPrimary: boolean;
  apiKey?: string;
  apiSecret?: string;
  senderId?: string;
  templateId?: string;
  route?: 'otp' | 'transactional' | 'promotional';
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  templateName?: string;
  languageCode?: string;
  customUrl?: string;
  httpMethod?: 'POST' | 'GET';
  otpVerificationEnabled: boolean;
  orderUpdatesEnabled: boolean;
  codVerificationEnabled: boolean;
}

export interface SmsIntegrationSettings {
  enabled: boolean;
  activeProviderId: string;
  fallbackProviderId?: string;
  gateways: SmsGatewayConfig[];
  otpExpiryMinutes: number;
  maxDailyOtpPerNumber: number;
}

export interface AdminProfileSettings {
  name: string;
  avatarUrl: string;
  email: string;
  mobile: string;
  role: string;
}

export interface AdminNotificationSettings {
  newOrder: boolean;
  orderConfirmation: boolean;
  paymentReceived: boolean;
  lowStock: boolean;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
}

export interface AdminUiPreferences {
  defaultOrderView: 'ALL' | 'UPCOMING' | 'CONFIRMED' | 'RTD' | 'SHIPPED';
  defaultDateRange: 'Daily' | 'Weekly' | 'Monthly' | '6 Months' | 'Yearly';
  itemsPerPage: number;
}

export interface AnnouncementBarSettings {
  enabled: boolean;
  messages: string[];
  couponCode?: string;
  speedSeconds?: number;
  showOnDesktop?: boolean;
}

export interface MenuHighlightItem {
  id: string;
  title: string;
  badge?: string;
  badgeColor?: 'rose' | 'dark' | 'emerald' | 'amber' | 'blue';
  targetType: 'all' | 'category' | 'tag';
  targetValue?: string;
  isEnabled: boolean;
  order: number;
}

export interface StoreSettings {
  businessName: string;
  storeName?: string;
  tagline?: string;
  logoText: string;
  logoUrl: string;
  announcementBar?: AnnouncementBarSettings;
  menuHighlights?: MenuHighlightItem[];
  whatsappNumber: string;
  whatsappSettings?: WhatsAppSettings;
  supportEmail: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube?: string;
    pinterest?: string;
  };
  gstNumber: string;
  gstRate?: number;
  shippingCharges: number;
  shippingFee?: number;
  codCharges: number;
  codFee?: number;
  autoDiscountThreshold: number; // ₹999
  autoDiscountPercent: number; // 10%
  prepaidDiscountPercent?: number;
  prepaidBenefitsNote: string;
  deliveryEstimate: string;
  returnPolicyText: string;
  contactInfo: string;
  adminPassword?: string;
  adminUsername?: string;
  delhiverySettings?: DelhiverySettings;
  shippingChannels?: ShippingChannelConfig[];
  activeShippingChannelId?: string;
  // Admin & Store Preferences
  adminProfile?: AdminProfileSettings;
  adminNotifications?: AdminNotificationSettings;
  adminPreferences?: AdminUiPreferences;
  storeAddress?: string;
  storeCurrency?: string;
  storeTimezone?: string;
  razorpaySettings?: RazorpaySettings;
  paymentGateways?: PaymentGatewayConfig[];
  activePaymentGatewayId?: string;
  activeInternationalGatewayId?: string;
  customDomainSettings?: CustomDomainConfig;
  smsSettings?: SmsIntegrationSettings;
}

export interface CustomDomainDnsRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'AAAA';
  host: string;
  value: string;
  ttl?: string;
  status: 'active' | 'pending' | 'verified';
  purpose: string;
}

export interface CustomDomainConfig {
  primaryDomain: string; // e.g. 'redmode.in'
  subdomainWww: string; // e.g. 'www.redmode.in'
  dnsProvider: 'google_firebase' | 'cloudflare' | 'hostinger' | 'godaddy' | 'spaceship' | 'custom';
  hostingTarget: 'google_firebase_hosting' | 'direct_google_cloud' | 'cloudflare_proxy';
  sslStatus: 'active' | 'provisioning' | 'pending_verification';
  forceHttps: boolean;
  redirectToCanonical: boolean;
  hstsEnabled: boolean;
  firebaseProjectId?: string;
  lastDnsCheck?: string;
  records: CustomDomainDnsRecord[];
}

export type PaymentGatewayProvider =
  | 'razorpay'
  | 'paypal'
  | 'phonepe'
  | 'cashfree'
  | 'stripe'
  | 'upi_qr'
  | 'custom';

export type PaymentMarketAudience = 'domestic' | 'international' | 'both';

export interface PaymentGatewayConfig {
  id: string; // Unique channel ID, e.g. 'razorpay_domestic', 'paypal_export'
  name: string; // Display Name
  provider: PaymentGatewayProvider;
  enabled: boolean;
  isPrimary: boolean;
  targetMarket: PaymentMarketAudience; // 'domestic' (India only) | 'international' (Export / Non-Indian only) | 'both'
  apiKey: string; // Razorpay Key ID / PayPal Client ID / PhonePe Merchant ID / Stripe Publishable Key / UPI ID
  apiSecret?: string; // Razorpay Key Secret / PayPal Client Secret / PhonePe Salt Key / Stripe Secret Key
  webhookSecret?: string;
  merchantName?: string;
  currency?: string; // 'INR', 'USD', 'EUR', 'GBP'
  mode: 'test' | 'live';
  themeColor?: string;
  notes?: string;
}

export interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  merchantName?: string;
  themeColor?: string;
  mode: 'test' | 'live';
}

export interface UserProfile {
  mobileOrEmail: string;
  name?: string;
  isLoggedIn: boolean;
  savedAddresses: CustomerAddress[];
  savedForThisDevice?: boolean;
  customerId?: string;
  createdAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  startDate?: string;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  description?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  status: 'Active' | 'Inactive';
  orders: Order[];
}

export interface InventoryLogEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color?: string;
  previousStock: number;
  adjustment: number;
  newStock: number;
  reason: string;
  adminUser: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  who: string;
  role: string;
  action: string;
  entity: 'Order' | 'Inventory' | 'Product' | 'Shipment' | 'Coupon' | 'Return' | 'Customer' | 'Settings';
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  role: AdminRole;
  action: string;
  type:
    | 'awb_generation'
    | 'label_print'
    | 'manifest_download'
    | 'order_status'
    | 'product_create'
    | 'product_update'
    | 'inventory_update'
    | 'scan_pickup'
    | 'other';
  target?: string;
  timestamp: string;
}

export type AdminRole =
  | 'Super Admin'
  | 'Label Admin'
  | 'Listing + Label Admin';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  password?: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  avatar?: string;
  permissions?: string[];
  lastActive?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ReturnStatus =
  | 'Requested'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Pickup'
  | 'Received'
  | 'Refunded'
  | 'Closed';

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  productName: string;
  productImage?: string;
  size: string;
  quantity: number;
  reason: string;
  requestDate: string;
  status: ReturnStatus;
  refundAmount: number;
  resolutionNotes?: string;
  history: { status: ReturnStatus; timestamp: string; note: string }[];
}

export type FestivalCategory = 'Major Festival' | 'Religious' | 'National Event' | 'Shopping Season';
export type FestivalUrgency = 'critical' | 'high' | 'medium' | 'info';

export interface IndianFestival {
  id: string;
  name: string;
  nameHindi: string;
  category: FestivalCategory;
  datesByYear: Record<number, string>;
  description: string;
  ethnicRelevance: string;
  shoppingImpact: 'Critical Peak' | 'High Rush' | 'Moderate' | 'Special Sale';
  recommendedActions: string[];
  suggestedAnnouncement: string;
  suggestedCoupon?: string;
  colorTheme: 'amber' | 'emerald' | 'rose' | 'orange' | 'purple' | 'blue' | 'red';
  emoji: string;
  isCustom?: boolean;
}

export interface FestivalAlert {
  festival: IndianFestival;
  targetDate: string; // YYYY-MM-DD
  daysRemaining: number;
  isAlertActive: boolean; // True when daysRemaining <= 10 && daysRemaining >= 0
  urgency: FestivalUrgency;
  statusText: string;
}

