import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIpGeolocation } from '../hooks/useIpGeolocation';
import { deleteSavedUploadedImage } from '../utils/userUploadedImages';
import {
  Product,
  Category,
  Subcategory,
  HeroBanner,
  Blog,
  Order,
  OrderItem,
  StoreSettings,
  CartItem,
  AddedItemInfo,
  CustomerAddress,
  ContactMessage,
  UserProfile,
  CourierOption,
  ShipmozoCourierOption,
  Coupon,
  InventoryLogEntry,
  AuditLogEntry,
  AdminUser,
  AdminRole,
  ReturnRequest,
  ReturnStatus,
  DelhiverySettings,
  ShippingChannelConfig,
  PaymentGatewayConfig,
  WhatsAppSettings,
  OrderStatus,
  MenuHighlightItem,
  SmsIntegrationSettings,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_BANNERS,
  INITIAL_ORDERS,
  INITIAL_BLOGS,
  INITIAL_SETTINGS,
} from '../data/initialData';
import { calculateOrderParcel, sanitizeOrderForCustomer } from '../utils/packaging';
import { logAdminActivity } from '../utils/activityLogger';
import { idbGet, idbSet } from '../utils/indexedDb';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from 'firebase/firestore';
import { recordFirestoreAuditLog } from '../utils/auditLogger';

function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res;
  }
  return obj;
}

/**
 * Strips private API secrets and admin passwords before persisting storefront settings
 * to the public `settings/store_settings` document so client reads never leak secrets
 * and `hasNoExposedSecrets` in `firestore.rules` is strictly satisfied.
 */
function sanitizeSettingsForPublicFirestore(raw: Partial<StoreSettings>): Record<string, any> {
  const copy: any = cleanForFirestore(raw) || {};
  delete copy.adminPassword;
  delete copy.razorpayKeySecret;
  delete copy.paypalClientSecret;
  delete copy.delhiveryApiToken;
  delete copy.twoFactorApiKey;
  delete copy.whatsappAccessToken;

  if (copy.razorpaySettings && typeof copy.razorpaySettings === 'object') {
    copy.razorpaySettings = { ...copy.razorpaySettings, keySecret: '' };
  }
  if (copy.delhiverySettings && typeof copy.delhiverySettings === 'object') {
    copy.delhiverySettings = { ...copy.delhiverySettings, apiToken: '' };
  }
  if (copy.whatsappSettings && typeof copy.whatsappSettings === 'object') {
    copy.whatsappSettings = { ...copy.whatsappSettings, accessToken: '' };
  }
  if (Array.isArray(copy.paymentGateways)) {
    copy.paymentGateways = copy.paymentGateways.map((g: any) => ({
      ...g,
      apiSecret: '',
      webhookSecret: '',
    }));
  }
  if (Array.isArray(copy.shippingChannels)) {
    copy.shippingChannels = copy.shippingChannels.map((c: any) => ({
      ...c,
      apiKey: '',
      apiSecret: '',
    }));
  }
  if (copy.smsSettings && Array.isArray(copy.smsSettings.gateways)) {
    copy.smsSettings = {
      ...copy.smsSettings,
      gateways: copy.smsSettings.gateways.map((g: any) => ({
        ...g,
        apiKey: '',
        accessToken: '',
      })),
    };
  }
  return copy;
}

function toIsoTimestamp(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {}
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return undefined;
}

/**
 * Deduplicates product images before saving to Cloud Firestore so the document
 * never exceeds Firestore's 1,048,576-byte (1 MB) limit even with multiple base64 photos.
 */
function isRealUploadedImage(u?: string): boolean {
  if (!u || typeof u !== 'string') return false;
  if (u.startsWith('data:image/')) return true;
  if (u.includes('images.unsplash.com') || u.startsWith('/uploads/')) return false;
  return u.startsWith('http://') || u.startsWith('https://');
}

function productHasRealImage(p?: Partial<Product>): boolean {
  if (!p) return false;
  if (isRealUploadedImage(p.mainImage)) return true;
  if (Array.isArray(p.images) && p.images.some((u) => isRealUploadedImage(u))) return true;
  if (
    Array.isArray(p.colorOptions) &&
    p.colorOptions.some(
      (co) => isRealUploadedImage(co?.image) || (Array.isArray(co?.images) && co.images.some((u) => isRealUploadedImage(u)))
    )
  ) {
    return true;
  }
  return false;
}

function collectAllProductImageUrls(p?: Partial<Product>): string[] {
  if (!p) return [];
  const urls = new Set<string>();
  if (p.mainImage && typeof p.mainImage === 'string') urls.add(p.mainImage);
  if (Array.isArray(p.images)) {
    p.images.forEach((u) => {
      if (u && typeof u === 'string') urls.add(u);
    });
  }
  if (Array.isArray(p.colorOptions)) {
    p.colorOptions.forEach((co) => {
      if (co?.image && typeof co.image === 'string') urls.add(co.image);
      if (Array.isArray(co?.images)) {
        co.images.forEach((u) => {
          if (u && typeof u === 'string') urls.add(u);
        });
      }
    });
  }
  return Array.from(urls);
}

function productHasFakePlaceholderOnly(p?: Partial<Product>): boolean {
  if (!p || productHasRealImage(p)) return false;
  const urls = collectAllProductImageUrls(p);
  return urls.some((u) => u.includes('images.unsplash.com') || u.startsWith('/uploads/'));
}

async function compressSingleDataUrl(dataUrl: string, maxChars = 85000): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length <= maxChars) {
    return dataUrl;
  }
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_W = 640;
        const MAX_H = 850;
        let w = img.width || 640;
        let h = img.height || 850;
        if (w > MAX_W || h > MAX_H) {
          const ratio = Math.min(MAX_W / w, MAX_H / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let out = canvas.toDataURL('image/jpeg', 0.56);
          if (out.length > maxChars) {
            out = canvas.toDataURL('image/jpeg', 0.42);
          }
          resolve(out);
          return;
        }
      } catch {}
      resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function ensureCompactProductForFirestore(product: Product): Promise<Product> {
  const cache = new Map<string, string>();
  const compactUrl = async (u?: string): Promise<string> => {
    if (!u || typeof u !== 'string') return '';
    if (cache.has(u)) return cache.get(u)!;
    const res = await compressSingleDataUrl(u);
    cache.set(u, res);
    return res;
  };

  const mainImage = await compactUrl(product.mainImage);
  const images = Array.isArray(product.images)
    ? (await Promise.all(product.images.map((u) => compactUrl(u)))).filter(Boolean)
    : [];
  const colorOptions = Array.isArray(product.colorOptions)
    ? await Promise.all(
        product.colorOptions.map(async (co) => ({
          ...co,
          image: await compactUrl(co.image),
          images: Array.isArray(co.images)
            ? (await Promise.all(co.images.map((u) => compactUrl(u)))).filter(Boolean)
            : [],
        }))
      )
    : product.colorOptions;

  return {
    ...product,
    mainImage,
    images,
    colorOptions,
  };
}

function prepareProductForFirestore(product: Product): Record<string, any> {
  const allCandidateUrls: string[] = [];
  const pushUnique = (u?: string) => {
    if (u && typeof u === 'string' && !u.startsWith('__img_ref:') && !allCandidateUrls.includes(u)) {
      allCandidateUrls.push(u);
    }
  };

  // Prioritize mainImage and each color's primary image first
  pushUnique(product.mainImage);
  if (Array.isArray(product.colorOptions)) {
    product.colorOptions.forEach((co) => pushUnique(co?.image));
  }
  if (Array.isArray(product.images)) {
    product.images.forEach((u) => pushUnique(u));
  }
  if (Array.isArray(product.colorOptions)) {
    product.colorOptions.forEach((co) => {
      if (Array.isArray(co?.images)) {
        co.images.forEach((u) => pushUnique(u));
      }
    });
  }

  // If real uploaded images exist, strip out any leftover Unsplash / ephemeral /uploads/ URLs
  const hasReal = allCandidateUrls.some((u) => isRealUploadedImage(u));
  const priorityUrls = hasReal
    ? allCandidateUrls.filter((u) => isRealUploadedImage(u))
    : allCandidateUrls;

  // Cap total base64 image payload at ~720KB so total Firestore document stays safely below 1MB
  const MAX_IMAGE_CHARS = 720000;
  const allowedImages: string[] = [];
  let charBudget = 0;

  for (const url of priorityUrls) {
    const len = url.length;
    if (allowedImages.length === 0 || charBudget + len <= MAX_IMAGE_CHARS) {
      allowedImages.push(url);
      charBudget += len;
    }
  }

  const toRefOrUrl = (url?: string): string => {
    if (!url || typeof url !== 'string') return '';
    const idx = allowedImages.indexOf(url);
    if (idx >= 0) {
      return url.startsWith('data:image/') ? `__img_ref:${idx}` : url;
    }
    return allowedImages[0] ? (allowedImages[0].startsWith('data:image/') ? '__img_ref:0' : allowedImages[0]) : '';
  };

  const dedupedColorOptions = Array.isArray(product.colorOptions)
    ? product.colorOptions.map((co) => {
        const rawImgs = Array.isArray(co.images) && co.images.length > 0 ? co.images : co.image ? [co.image] : [];
        const cleanRawImgs = hasReal ? rawImgs.filter((u) => isRealUploadedImage(u)) : rawImgs;
        const mappedImgs = Array.from(
          new Set(
            cleanRawImgs
              .filter((u) => u && (allowedImages.includes(u) || !u.startsWith('data:image/')))
              .map((u) => toRefOrUrl(u))
              .filter(Boolean)
          )
        );
        const primaryCandidate =
          hasReal && !isRealUploadedImage(co.image)
            ? cleanRawImgs[0] || allowedImages[0]
            : co.image || cleanRawImgs[0] || product.mainImage;
        return {
          ...co,
          image: toRefOrUrl(primaryCandidate),
          images: mappedImgs.length > 0 ? mappedImgs : allowedImages[0] ? [toRefOrUrl(allowedImages[0])] : [],
        };
      })
    : [];

  const mainCandidate =
    hasReal && !isRealUploadedImage(product.mainImage)
      ? allowedImages[0] || ''
      : product.mainImage || allowedImages[0] || '';

  return cleanForFirestore({
    ...product,
    published: product.published !== false,
    inStock: product.inStock !== false,
    mainImage: toRefOrUrl(mainCandidate),
    images: allowedImages,
    colorOptions: dedupedColorOptions,
    createdAt: toIsoTimestamp(product.createdAt) || new Date().toISOString(),
    updatedAt: toIsoTimestamp(product.updatedAt) || new Date().toISOString(),
  });
}

/**
 * Rehydrates any `__img_ref:N` tokens back to their full image URLs when reading from Firestore.
 */
function rehydrateProductFromFirestore(raw: Partial<Product>): Partial<Product> {
  if (!raw || typeof raw !== 'object') return raw;
  const imgPool = Array.isArray(raw.images) ? raw.images : [];
  const resolveRef = (val?: string): string => {
    if (!val || typeof val !== 'string') return '';
    if (val.startsWith('__img_ref:')) {
      const idx = parseInt(val.replace('__img_ref:', ''), 10);
      if (!isNaN(idx) && imgPool[idx]) return imgPool[idx];
      return imgPool[0] || '';
    }
    return val;
  };

  const resolvedImages = imgPool.map((u) => resolveRef(u)).filter(Boolean);
  const resolvedMain = resolveRef(raw.mainImage) || resolvedImages[0] || '';
  const resolvedColors = Array.isArray(raw.colorOptions)
    ? raw.colorOptions.map((co) => {
        const coPrimary = resolveRef(co.image) || resolvedMain;
        const coGallery = Array.isArray(co.images)
          ? co.images.map((u) => resolveRef(u)).filter(Boolean)
          : coPrimary
          ? [coPrimary]
          : [];
        return {
          ...co,
          image: coPrimary,
          images: coGallery.length > 0 ? coGallery : coPrimary ? [coPrimary] : [],
        };
      })
    : raw.colorOptions;

  return {
    ...raw,
    mainImage: resolvedMain,
    images: resolvedImages.length > 0 ? resolvedImages : resolvedMain ? [resolvedMain] : [],
    colorOptions: resolvedColors,
    createdAt: toIsoTimestamp(raw.createdAt) || raw.createdAt,
    updatedAt: toIsoTimestamp(raw.updatedAt) || raw.updatedAt,
  };
}

export type ActiveView =
  | 'home'
  | 'catalogue'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-success'
  | 'contact-us'
  | 'contact'
  | 'track-order'
  | 'blogs'
  | 'blog-detail'
  | 'account'
  | 'admin'
  | 'wishlist'
  | 'search'
  | 'privacy-policy'
  | 'terms-conditions'
  | 'cancellation-policy'
  | 'shipping-delivery'
  | 'returns-exchange'
  | 'stitching-services'
  | 'size-guide'
  | 'faqs';

export type AdminTab =
  | 'dashboard'
  // Catalog
  | 'products'
  | 'categories'
  | 'collections'
  | 'inventory'
  | 'inventory-low'
  // Orders
  | 'orders'
  | 'orders-cod'
  | 'orders-pending'
  | 'orders-confirmed'
  | 'orders-processing'
  | 'orders-ready-to-ship'
  | 'orders-shipped'
  | 'orders-delivered'
  | 'orders-cancelled'
  | 'orders-returns'
  // Shipping
  | 'shipments'
  | 'shipping-rates'
  | 'shipmozo'
  // Customers
  | 'customers'
  | 'customer-orders'
  // Marketing
  | 'coupons'
  | 'banners'
  | 'campaigns'
  | 'marketing-intelligence'
  // Content
  | 'content-homepage'
  | 'blogs'
  // Analytics
  | 'analytics-sales'
  | 'analytics-products'
  | 'analytics-customers'
  | 'analytics-inventory'
  // Settings
  | 'settings'
  | 'settings-store'
  | 'settings-payment'
  | 'settings-shipping'
  | 'settings-admin'
  | 'settings-roles'
  | 'settings-audit'
  // Legacy / extra
  | 'catalogue'
  | 'inquiries';

interface StoreContextType {
  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedProductColor: string | null;
  setSelectedProductColor: (color: string | null) => void;
  openProductDetail: (productId: string, initialColor?: string) => void;
  selectedBlogId: string | null;
  setSelectedBlogId: (id: string | null) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  selectedCategorySlug: string | null;
  setSelectedCategorySlug: (slug: string | null) => void;
  selectedSubcategorySlug: string | null;
  setSelectedSubcategorySlug: (slug: string | null) => void;
  subcategoriesShowcaseCategorySlug: string | null;
  setSubcategoriesShowcaseCategorySlug: (slug: string | null) => void;
  goBack: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Data
  products: Product[];
  categories: Category[];
  banners: HeroBanner[];
  blogs: Blog[];
  orders: Order[];
  settings: StoreSettings;
  contactMessages: ContactMessage[];

  // Cart & Wishlist
  cart: CartItem[];
  wishlist: string[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  lastAddedItem: AddedItemInfo | null;
  setLastAddedItem: (item: AddedItemInfo | null) => void;
  cartDrawerView: 'added-notification' | 'full-cart';
  setCartDrawerView: (view: 'added-notification' | 'full-cart') => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    size?: string,
    quantity?: number,
    color?: string,
    colorImage?: string
  ) => { success: boolean; message: string };
  removeFromCart: (productId: string, size: string, color?: string) => void;
  updateCartQuantity: (
    productId: string,
    size: string,
    quantity: number,
    color?: string
  ) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  clearWishlist: () => void;

  // Geolocation & Multi-Currency Localization
  userCountry: string;
  userCountryCode: string;
  currency: 'INR' | 'USD';
  currencySymbol: '₹' | '$';
  isDomesticIndia: boolean;
  isLoadingGeo: boolean;
  exchangeRate: number;
  setCurrency: (currency: 'INR' | 'USD') => void;
  setUserCountry: (country: string, code?: string) => void;
  formatPrice: (amountInInr: number) => string;
  convertPrice: (amountInInr: number) => number;

  // Calculations
  cartSubtotal: number;
  autoDiscountAmount: number;
  isAutoDiscountApplied: boolean;
  appliedCoupon: Coupon | null;
  couponDiscountAmount: number;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  cartGstAmount: number;
  deliveryFee: number;
  cartTotalAmount: number;

  // Checkout & Orders
  lastConfirmedOrder: Order | null;
  placeOrder: (
    customer: CustomerAddress,
    paymentMode: 'COD' | 'Prepaid',
    paymentStatus: 'Paid' | 'Pending',
    paymentDetails?: {
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
    }
  ) => Order;
  trackOrder: (orderId: string) => Order | undefined;

  // Customer Contact, Auth, Profile & Self-Service
  submitContactForm: (name: string, mobile: string, email: string, message: string) => void;
  submitStockNotification: (
    productId: string,
    productName: string,
    size: string,
    color?: string,
    contact?: string
  ) => Promise<boolean>;
  inquiries: ContactMessage[];
  userProfile: UserProfile;
  loginUser: (mobileOrEmail: string, name?: string) => void;
  logoutUser: () => void;
  updateUserProfile: (updates: { name?: string; email?: string; mobileOrEmail?: string }) => void;
  saveCustomerAddress: (address: CustomerAddress, index?: number) => void;
  deleteCustomerAddress: (index: number) => void;
  cancelCustomerOrder: (orderId: string, reason?: string) => { success: boolean; message: string };
  submitCustomerReturnRequest: (data: {
    orderId: string;
    productName: string;
    productImage?: string;
    size: string;
    quantity: number;
    reason: string;
    refundAmount: number;
  }) => { success: boolean; message: string; returnRequest?: ReturnRequest };
  markReviewHelpful: (productId: string, reviewId: string) => void;

  // Admin Actions
  addProduct: (product: Omit<Product, 'id' | 'views' | 'salesCount' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  togglePublishProduct: (id: string) => void;

  addCategory: (nameOrCategory: string | Partial<Category>, categoryData?: Partial<Category>) => Promise<boolean> | void;
  updateCategory: (categoryOrId: Category | string, partialData?: Partial<Category>) => Promise<boolean> | void;
  deleteCategory: (id: string) => void;
  reorderCategories: (newOrderedCategories: Category[]) => Promise<boolean> | void;
  addSubcategory: (categoryId: string, subcategory: Omit<Subcategory, 'id'> | Subcategory) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  addSubSubcategory: (categoryId: string, subcategoryId: string, subSub: Omit<Subcategory, 'id'> | Subcategory | string) => void;
  deleteSubSubcategory: (categoryId: string, subcategoryId: string, subSubId: string) => void;
  syncCategoriesToCloud: () => Promise<{ success: boolean; count: number }>;

  addBanner: (banner: Omit<HeroBanner, 'id'>) => void;
  updateBanner: (banner: HeroBanner) => void;
  deleteBanner: (id: string) => void;

  addBlog: (blog: Omit<Blog, 'id' | 'createdAt'>) => void;
  updateBlog: (blog: Blog) => void;
  deleteBlog: (id: string) => void;

  // Marketing & Coupons
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usedCount'>) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponActive: (id: string) => void;

  updateOrderStatus: (orderId: string, status: Order['orderStatus']) => void;
  updateOrderPaymentStatus: (orderId: string, paymentStatus: Order['paymentStatus']) => void;
  updateCodVerificationStatus: (
    orderId: string,
    status: 'UNVERIFIED' | 'CONFIRMED' | 'REJECTED',
    verifiedBy?: string
  ) => void;
  confirmCustomerOrder: (
    orderId: string,
    method?: 'WhatsApp Reply' | 'Phone Call' | 'Admin Desk'
  ) => void;
  bulkAcceptOrdersToRTD: (orderIds: string[]) => { successCount: number };
  bulkCancelOrders: (orderIds: string[], reason?: string) => { successCount: number };
  send23hReminder: (orderId: string) => void;
  triggerNightConfirmationNow: (orderId: string) => void;
  markLabelDownloaded: (orderId: string) => void;
  sendCustomerTrackingUpdate: (orderId: string) => void;
  sendDeliveredReviewRequest: (orderId: string) => void;
  updateOrderInternalNotes: (orderId: string, notes: string) => void;
  updateProductStock: (productId: string, sizeOrKey: string, newCount: number) => void;
  createShipmozoShipment: (orderId: string, courierName: string) => void;
  createDelhiveryShipment: (
    orderId: string,
    mode?: 'Surface' | 'Express'
  ) => { success: boolean; awb: string; courier: string; message: string };
  updateDelhiverySettings: (settings: Partial<DelhiverySettings>) => void;
  updateShippingChannels: (channels: ShippingChannelConfig[], activeChannelId?: string) => void;
  updatePaymentGateways: (
    gateways: PaymentGatewayConfig[],
    activeDomesticId?: string,
    activeInternationalId?: string
  ) => void;
  updateWhatsAppSettings: (settings: Partial<WhatsAppSettings>) => void;
  updateSmsSettings: (settings: Partial<SmsIntegrationSettings>) => void;

  // Shipmozo Official API Actions
  shipmozoConfigured: boolean;
  fetchAvailableCouriers: (
    order: Order,
    packageSpecs?: {
      weight_kg?: number;
      length_cm?: number;
      width_cm?: number;
      height_cm?: number;
    }
  ) => Promise<{
    configured: boolean;
    success: boolean;
    message: string;
    couriers: ShipmozoCourierOption[];
  }>;
  bookShipmozoOrder: (
    orderId: string,
    courierId: number | string,
    courierName: string,
    packageDetails?: {
      final_package_weight?: number;
      final_package_length?: number;
      final_package_width?: number;
      final_package_height?: number;
      estimated_shipping_cost?: number;
    }
  ) => Promise<{ success: boolean; message: string }>;
  updateOrderPackageSpecs: (
    orderId: string,
    specs: {
      final_package_weight?: number;
      final_package_length?: number;
      final_package_width?: number;
      final_package_height?: number;
      estimated_shipping_cost?: number;
      selected_courier_id?: number | string;
      selected_courier_name?: string;
    }
  ) => void;
  downloadOrderLabel: (awb: string) => void;
  downloadBulkLabels: (awbs: string[]) => Promise<{ success: boolean; message?: string }>;
  fetchLiveTracking: (awb: string) => Promise<any>;

  updateSettings: (newSettings: StoreSettings) => void;
  menuHighlights: MenuHighlightItem[];
  updateMenuHighlights: (newHighlights: MenuHighlightItem[]) => void;
  toggleMenuHighlight: (id: string) => void;
  addMenuHighlight: (newItem: Omit<MenuHighlightItem, 'id'>) => void;
  deleteMenuHighlight: (id: string) => void;
  resolveMessage: (id: string) => void;
  incrementProductViews: (productId: string) => void;

  // Admin Security & Authentication
  isAdminAuthenticated: boolean;
  adminLogin: (
    username: string,
    password: string,
    saveDevice: boolean,
    trustDevice: boolean
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  adminGoogleLogin: (email?: string, idToken?: string) => Promise<void> | void;
  adminLogout: () => void;
  updateAdminPassword: (newPassword: string) => void;
  adminSavedCredentials: { username: string; password?: string; saved: boolean };

  // Enterprise REDMODE Operating System Extensions
  inventoryLogs: InventoryLogEntry[];
  adjustProductStockWithReason: (
    productId: string,
    sizeOrKey: string,
    adjustment: number,
    reason: string
  ) => void;
  auditLogs: AuditLogEntry[];
  addAuditLog: (
    action: string,
    entity: AuditLogEntry['entity'],
    entityId: string,
    oldValue?: string,
    newValue?: string
  ) => void;
  returnsList: ReturnRequest[];
  updateReturnStatus: (
    returnId: string,
    status: ReturnStatus,
    resolutionNotes?: string
  ) => void;
  adminUsers: AdminUser[];
  currentAdminUser: AdminUser;
  switchAdminUser: (user: AdminUser) => void;
  addAdminUser: (data: {
    name: string;
    email: string;
    mobile?: string;
    password?: string;
    role: 'Label Admin' | 'Listing + Label Admin';
  }) => { success: boolean; message: string; user?: AdminUser };
  updateAdminUser: (
    id: string,
    updates: Partial<{
      name: string;
      email: string;
      mobile: string;
      role: 'Label Admin' | 'Listing + Label Admin';
      password?: string;
    }>
  ) => { success: boolean; message: string };
  toggleAdminUserStatus: (id: string) => { success: boolean; message: string };
  deleteAdminUser: (id: string) => { success: boolean; message: string };
  customerNotes: Record<string, string>;
  updateCustomerNote: (phoneOrId: string, note: string) => void;
  exportOrdersToCSV: (
    selectedOrders?: Order[],
    dateOptions?: {
      preset?: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom';
      startDate?: string;
      endDate?: string;
    }
  ) => { count: number; filename: string };

  // COD & Genuine RTO Rule Engine
  getCustomerCodEligibility: (phone: string) => { codAvailable: boolean; message: string };
  getCustomerPreviousRtoReason: (phone: string) => string | null;
  markOrderAsRto: (orderId: string, reason: string, courierRemarks?: string) => void;
  setCustomerCodOverride: (phone: string, allowed: boolean) => void;
  codOverrides: Record<string, boolean>;

  // Customer Mobile OTP Authentication (No password, no username, no guest)
  sendCustomerOtp: (mobile: string) => Promise<{ success: boolean; message: string; simulated?: boolean }>;
  verifyCustomerOtp: (mobile: string, otp: string, saveForThisDevice?: boolean) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
}

const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin-super-1',
    name: 'Aamir',
    email: 'myredmode@gmail.com',
    mobile: '+91 73027 97464',
    role: 'Super Admin',
    status: 'active',
    lastLogin: new Date().toISOString(),
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'admin-staff-label',
    name: 'Rahul Sharma',
    email: 'rahul.shipping@redmode.in',
    mobile: '+91 98112 34567',
    role: 'Label Admin',
    status: 'active',
    lastLogin: new Date().toISOString(),
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'admin-staff-listing',
    name: 'Vikas Verma',
    email: 'vikas.catalog@redmode.in',
    mobile: '+91 98223 45678',
    role: 'Listing + Label Admin',
    status: 'active',
    lastLogin: new Date().toISOString(),
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    who: 'CEO / Founder',
    role: 'Super Admin',
    action: 'Order Confirmed',
    entity: 'Order',
    entityId: '#RM-1002',
    oldValue: 'COD Verification',
    newValue: 'Confirmed',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'aud-2',
    who: 'Rahul Verma',
    role: 'Order Manager',
    action: 'Shipment Booked via Shipmozo',
    entity: 'Shipment',
    entityId: '#RM-1001',
    oldValue: 'READY TO SHIP',
    newValue: 'BlueDart (AWB: 7892145610)',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'aud-3',
    who: 'Amit Patel',
    role: 'Inventory Manager',
    action: 'Stock Adjustment (+5)',
    entity: 'Inventory',
    entityId: 'prod-1 (Size M)',
    oldValue: '10',
    newValue: '15',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_INVENTORY_LOGS: InventoryLogEntry[] = [
  {
    id: 'inv-1',
    productId: 'prod-1',
    productName: "RedMode Women's Cotton Kurti | Floral Printed A-Line",
    sku: 'RM-KRT-FLR-M',
    size: 'M',
    color: 'Red',
    previousStock: 10,
    adjustment: 5,
    newStock: 15,
    reason: 'Restock from Loom production batch #LM-402',
    adminUser: 'Amit Patel (Inventory Manager)',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'inv-2',
    productId: 'prod-2',
    productName: 'Chikankari Hand Embroidered Pure Cotton Kurti',
    sku: 'RM-CHK-WHT-S',
    size: 'S',
    color: 'White',
    previousStock: 6,
    adjustment: -1,
    newStock: 5,
    reason: 'Fabric inspection damage write-off',
    adminUser: 'Amit Patel (Inventory Manager)',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

const INITIAL_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-1',
    orderId: '#RM-1005',
    customerName: 'Ananya Deshmukh',
    customerPhone: '+91 98201 44521',
    customerEmail: 'ananya.d@gmail.com',
    productName: "RedMode Women's Cotton Kurti | Floral Printed A-Line",
    productImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80',
    size: 'M',
    quantity: 1,
    reason: 'Size exchange needed - Customer requested Size L for a looser bust fit',
    requestDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'Under Review',
    refundAmount: 899,
    resolutionNotes: 'Customer contacted via WhatsApp. Exchange parcel pickup arranged with Delhivery.',
    history: [
      {
        status: 'Requested',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        note: 'Customer initiated return via self-service support portal.',
      },
      {
        status: 'Under Review',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        note: 'Quality desk confirmed tag and fabric criteria passed.',
      },
    ],
  },
  {
    id: 'ret-2',
    orderId: '#RM-1004',
    customerName: 'Meera Iyer',
    customerPhone: '+91 98112 34567',
    customerEmail: 'meera.iyer@outlook.com',
    productName: 'Chikankari Hand Embroidered Pure Cotton Kurti',
    productImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    size: 'XL',
    quantity: 1,
    reason: 'Wrong color delivered by warehouse packing team',
    requestDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: 'Approved',
    refundAmount: 1499,
    resolutionNotes: 'Approved for free reverse pickup and instant replacement dispatch.',
    history: [
      {
        status: 'Requested',
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        note: 'Customer submitted photo of received White kurti instead of Ivory.',
      },
      {
        status: 'Approved',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        note: 'Reverse pickup AWB generated via Shipmozo.',
      },
    ],
  },
];

export function parseCurrentLocation(allProducts?: Product[]): {
  view: ActiveView;
  productId: string | null;
  categorySlug: string | null;
  subcategorySlug: string | null;
  blogId: string | null;
} {
  if (typeof window === 'undefined') {
    return { view: 'home', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }

  const rawPath = (window.location.pathname || '').toLowerCase();
  const rawHash = (window.location.hash || '').toLowerCase();

  let pathStr = rawPath;
  if ((!pathStr || pathStr === '/') && rawHash && rawHash !== '#') {
    pathStr = rawHash.replace(/^#+/, '');
    if (!pathStr.startsWith('/')) pathStr = '/' + pathStr;
  }

  const clean = pathStr.replace(/^\/+|\/+$/g, '');
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { view: 'home', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }

  const first = segments[0];

  if (first === 'admin') {
    return { view: 'admin', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'checkout') {
    return { view: 'checkout', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (
    first === 'trackyourorder' ||
    first === 'track-your-order' ||
    first === 'trackorder' ||
    first === 'track-order' ||
    first === 'track' ||
    first === 'tracking' ||
    first === 'order-tracking'
  ) {
    return { view: 'track-order', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'account') {
    return { view: 'account', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'wishlist') {
    return { view: 'wishlist', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'search') {
    return { view: 'search', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'blogs' || first === 'blog') {
    return { view: 'blogs', productId: null, categorySlug: null, subcategorySlug: null, blogId: segments[1] || null };
  }
  if (first === 'contact' || first === 'contact-us') {
    return { view: 'contact-us', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'size-guide') {
    return { view: 'size-guide', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'faqs' || first === 'faq') {
    return { view: 'faqs', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'privacy-policy') {
    return { view: 'privacy-policy', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'terms-conditions' || first === 'terms') {
    return { view: 'terms-conditions', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'cancellation-policy') {
    return { view: 'cancellation-policy', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'shipping-delivery' || first === 'shipping') {
    return { view: 'shipping-delivery', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'returns-exchange' || first === 'returns') {
    return { view: 'returns-exchange', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }
  if (first === 'stitching-services') {
    return { view: 'stitching-services', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
  }

  // Product detail: /product/:slugOrId or /p/:slugOrId
  if (first === 'product' || first === 'products' || first === 'p') {
    const slugOrId = segments[1] || null;
    let foundId = slugOrId;
    if (slugOrId) {
      const prodsToSearch = allProducts && allProducts.length > 0 ? allProducts : INITIAL_PRODUCTS;
      const matched = prodsToSearch.find((p) => p.slug === slugOrId || p.id === slugOrId);
      if (matched) foundId = matched.id;
    }
    return { view: 'product-detail', productId: foundId, categorySlug: null, subcategorySlug: null, blogId: null };
  }

  // Collections & Catalogue:
  // /collection
  // /collection/:cat
  // /collection/:cat/:sub
  if (first === 'collection' || first === 'collections' || first === 'catalogue' || first === 'shop') {
    const cat = segments[1] || null;
    const sub = segments[2] || null;
    return { view: 'catalogue', productId: null, categorySlug: cat, subcategorySlug: sub, blogId: null };
  }

  if (first === 'category') {
    const cat = segments[1] || null;
    const sub = segments[2] || null;
    return { view: 'catalogue', productId: null, categorySlug: cat, subcategorySlug: sub, blogId: null };
  }

  // Direct category slug support: /kurti, /trouser, /trousers, /jewellery, /kurti-set, etc.
  const knownCategories = [
    'kurti',
    'kurtis',
    'trouser',
    'trousers',
    'kurti-set',
    'kurti-sets',
    'jewellery',
    'jewelry',
    'bottom',
    'bottom-wear',
    'embroidered-kurti',
    'embroidery',
    'long-kurti',
    'short-kurti',
    'sets',
    'festive',
    'new-arrivals',
    'bestseller',
    'bestsellers',
  ];
  if (knownCategories.includes(first)) {
    let cat = first;
    if (cat === 'trousers') cat = 'trouser';
    if (cat === 'kurtis') cat = 'kurti';
    if (cat === 'kurti-sets' || cat === 'sets') cat = 'kurti-set';
    if (cat === 'jewelry') cat = 'jewellery';
    const sub = segments[1] || null;
    return { view: 'catalogue', productId: null, categorySlug: cat, subcategorySlug: sub, blogId: null };
  }

  return { view: 'home', productId: null, categorySlug: null, subcategorySlug: null, blogId: null };
}

export function computeTargetPath(
  view: ActiveView,
  prodId: string | null,
  catSlug: string | null,
  subcatSlug: string | null,
  allProducts: Product[]
): string {
  if (view === 'admin') return '/admin';
  if (view === 'product-detail') {
    if (prodId) {
      const prod = allProducts.find((p) => p.id === prodId || p.slug === prodId);
      const slug = prod?.slug || prodId;
      return `/product/${slug}`;
    }
    return '/collection';
  }
  if (view === 'catalogue') {
    if (catSlug && subcatSlug) {
      return `/collection/${catSlug}/${subcatSlug}`;
    }
    if (catSlug) {
      return `/collection/${catSlug}`;
    }
    return '/collection';
  }
  if (view === 'checkout') return '/checkout';
  if (view === 'track-order') return '/trackyourorder';
  if (view === 'account') return '/account';
  if (view === 'wishlist') return '/wishlist';
  if (view === 'search') return '/search';
  if (view === 'blogs') return '/blogs';
  if (view === 'contact-us' || view === 'contact') return '/contact-us';
  if (view === 'size-guide') return '/size-guide';
  if (view === 'faqs') return '/faqs';
  if (view === 'privacy-policy') return '/privacy-policy';
  if (view === 'terms-conditions') return '/terms-conditions';
  if (view === 'cancellation-policy') return '/cancellation-policy';
  if (view === 'shipping-delivery') return '/shipping-delivery';
  if (view === 'returns-exchange') return '/returns-exchange';
  if (view === 'stitching-services') return '/stitching-services';
  if (view === 'home') return '/';
  return '/';
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation State
  const initialNav = useMemo(() => parseCurrentLocation(INITIAL_PRODUCTS), []);
  const [activeView, setActiveView] = useState<ActiveView>(initialNav.view);

  // Admin Security & Device Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      const isTrusted = localStorage.getItem('redmode_admin_trusted') === 'true';
      const sessionAuth = sessionStorage.getItem('redmode_admin_auth') === 'true';
      if (!isTrusted && !sessionAuth) return false;

      // Verify that stored admin user exists and holds an active admin role
      const savedUser = localStorage.getItem('redmode_current_admin_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const validRoles: AdminRole[] = ['Super Admin', 'Label Admin', 'Listing + Label Admin'];
        if (parsed && validRoles.includes(parsed.role) && parsed.status === 'active') {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  const [adminSavedCredentials, setAdminSavedCredentials] = useState<{
    username: string;
    password?: string;
    saved: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('redmode_admin_credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.password) {
          // Strip legacy plaintext password from localStorage immediately
          const cleanCreds = { username: parsed.username || '', saved: Boolean(parsed.saved) };
          localStorage.setItem('redmode_admin_credentials', JSON.stringify(cleanCreds));
          return cleanCreds;
        }
        return { username: parsed?.username || '', saved: Boolean(parsed?.saved) };
      }
    } catch (e) {}
    return { username: '', saved: false };
  });

  // Multi-Employee Admin Users & Active Persona
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_admin_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validRoles: AdminRole[] = ['Super Admin', 'Label Admin', 'Listing + Label Admin'];
          const filtered = parsed.filter((u: AdminUser) => validRoles.includes(u.role));
          const hasSuper = filtered.some((u: AdminUser) => u.role === 'Super Admin');
          if (hasSuper && filtered.length > 0) {
            const existingIds = new Set(filtered.map((u: AdminUser) => u.id));
            const missingDefaults = INITIAL_ADMIN_USERS.filter((u) => !existingIds.has(u.id));
            if (missingDefaults.length > 0) {
              const merged = [...filtered, ...missingDefaults];
              try {
                localStorage.setItem('redmode_admin_users', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            }
            return filtered;
          }
        }
      }
    } catch (e) {}
    return INITIAL_ADMIN_USERS;
  });

  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser>(() => {
    try {
      const saved = localStorage.getItem('redmode_current_admin_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name && parsed.role) {
          return parsed;
        }
      }
    } catch (e) {}
    return INITIAL_ADMIN_USERS[0];
  });

  // Enterprise Operating System State
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_inventory_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_INVENTORY_LOGS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_AUDIT_LOGS;
  });

  const [returnsList, setReturnsList] = useState<ReturnRequest[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_returns_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_RETURNS;
  });

  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('redmode_customer_notes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '9820144521': 'VIP Customer - Prefers evening courier delivery. Always verify COD on WhatsApp.',
    };
  });

  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialNav.productId);
  const [selectedProductColor, setSelectedProductColor] = useState<string | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(initialNav.blogId);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [shipmozoConfigured] = useState<boolean>(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialNav.categorySlug);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(initialNav.subcategorySlug);
  const [subcategoriesShowcaseCategorySlug, setSubcategoriesShowcaseCategorySlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [lastAddedItem, setLastAddedItem] = useState<AddedItemInfo | null>(null);
  const [cartDrawerView, setCartDrawerView] = useState<'added-notification' | 'full-cart'>('full-cart');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<Order | null>(null);

  // =========================================================================
  // IP GEOLOCATION & MULTI-CURRENCY LOCALIZATION (INR / USD)
  // =========================================================================
  const {
    geoData,
    isLoadingGeo,
    setManualCurrency,
    setManualCountry,
  } = useIpGeolocation();

  // Exchange rate: 1 USD ≈ 84 INR (configured standard rate)
  const exchangeRate = 84;

  const formatPrice = useCallback(
    (amountInInr: number) => {
      if (typeof amountInInr !== 'number' || isNaN(amountInInr) || amountInInr < 0) {
        amountInInr = 0;
      }
      if (geoData.currency === 'USD') {
        const usd = Math.max(1, Math.round((amountInInr / exchangeRate) * 100) / 100);
        return `$${usd.toFixed(2)}`;
      }
      return `₹${Math.round(amountInInr).toLocaleString('en-IN')}`;
    },
    [geoData.currency, exchangeRate]
  );

  const convertPrice = useCallback(
    (amountInInr: number) => {
      if (typeof amountInInr !== 'number' || isNaN(amountInInr) || amountInInr < 0) {
        return 0;
      }
      if (geoData.currency === 'USD') {
        return Math.max(1, Math.round((amountInInr / exchangeRate) * 100) / 100);
      }
      return Math.round(amountInInr);
    },
    [geoData.currency, exchangeRate]
  );

  const openProductDetail = (productId: string, initialColor?: string) => {
    setSelectedProductId(productId);
    setSelectedProductColor(initialColor || null);
    setActiveView('product-detail');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // =========================================================================
  // NAVIGATION HISTORY STACK FOR PRECISE 1-STEP-AT-A-TIME BACK NAVIGATION
  // =========================================================================
  const navHistoryRef = useRef<Array<{
    activeView: ActiveView;
    selectedProductId: string | null;
    selectedProductColor: string | null;
    selectedCategorySlug: string | null;
    selectedSubcategorySlug: string | null;
  }>>([]);
  const isNavigatingBackRef = useRef<boolean>(false);
  const currentNavStateRef = useRef<{
    activeView: ActiveView;
    selectedProductId: string | null;
    selectedProductColor: string | null;
    selectedCategorySlug: string | null;
    selectedSubcategorySlug: string | null;
  }>({
    activeView,
    selectedProductId,
    selectedProductColor,
    selectedCategorySlug,
    selectedSubcategorySlug,
  });

  // Automatically track navigation changes and push previous state onto history stack
  useEffect(() => {
    if (isNavigatingBackRef.current) {
      currentNavStateRef.current = {
        activeView,
        selectedProductId,
        selectedProductColor,
        selectedCategorySlug,
        selectedSubcategorySlug,
      };
      isNavigatingBackRef.current = false;
      return;
    }

    const prev = currentNavStateRef.current;
    const isSame =
      prev.activeView === activeView &&
      prev.selectedProductId === selectedProductId &&
      prev.selectedProductColor === selectedProductColor &&
      prev.selectedCategorySlug === selectedCategorySlug &&
      prev.selectedSubcategorySlug === selectedSubcategorySlug;

    if (!isSame) {
      if (prev.activeView !== 'admin' && activeView !== 'admin') {
        navHistoryRef.current.push({ ...prev });
        if (navHistoryRef.current.length > 50) {
          navHistoryRef.current.shift();
        }
      }
      currentNavStateRef.current = {
        activeView,
        selectedProductId,
        selectedProductColor,
        selectedCategorySlug,
        selectedSubcategorySlug,
      };
    }
  }, [activeView, selectedProductId, selectedProductColor, selectedCategorySlug, selectedSubcategorySlug]);

  const goBack = useCallback(() => {
    isNavigatingBackRef.current = true;

    if (navHistoryRef.current.length > 0) {
      const prev = navHistoryRef.current.pop()!;
      setSelectedProductId(prev.selectedProductId);
      setSelectedProductColor(prev.selectedProductColor);
      setSelectedCategorySlug(prev.selectedCategorySlug);
      setSelectedSubcategorySlug(prev.selectedSubcategorySlug);
      setActiveView(prev.activeView);
    } else {
      // Intelligent fallback 1-step hierarchy if history stack is empty:
      if (activeView === 'product-detail') {
        setSelectedProductId(null);
        if (selectedCategorySlug) {
          setActiveView('catalogue');
        } else {
          setActiveView('home');
        }
      } else if (activeView === 'catalogue') {
        if (selectedSubcategorySlug) {
          // Go back 1 step: from subcategory product grid to subcategory selection screen
          setSelectedSubcategorySlug(null);
        } else {
          // Category has no subcategories, or on all products: go back 1 step to Home!
          setSelectedCategorySlug(null);
          setSelectedSubcategorySlug(null);
          setActiveView('home');
        }
      } else if (activeView !== 'home') {
        setActiveView('home');
      }
      // If already on 'home', do nothing - NEVER call window.history.back()
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView, selectedCategorySlug, selectedSubcategorySlug]);

  // Safe Normalization Helper to populate missing fields on stored products without resurrecting deleted items
  const normalizeProductsWithInitial = (rawList: Partial<Product>[], blacklist: string[] = []): Product[] => {
    if (!Array.isArray(rawList)) return [];

    const activeList = rawList
      .filter((p) => p && p.id && !blacklist.includes(p.id))
      .map((p) => rehydrateProductFromFirestore(p));

    return activeList.map((p: Partial<Product>) => {
      const initialMatch = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
      const userImages =
        Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : p.mainImage
          ? [p.mainImage]
          : initialMatch?.images || [];
      const userMainImage = p.mainImage || userImages[0] || initialMatch?.mainImage || '';

      return {
        ...initialMatch,
        ...p,
        published: p.published !== false,
        inStock: p.inStock !== false,
        mainImage: userMainImage,
        images: userImages,
        sizes:
          Array.isArray(p.sizes) && p.sizes.length > 0
            ? p.sizes
            : initialMatch?.sizes || ['S', 'M', 'L', 'XL'],
        stockBySize: p.stockBySize || initialMatch?.stockBySize || {},
        seo: p.seo || initialMatch?.seo || { metaTitle: p.name || '', metaDescription: '', imageAlt: p.name || '' },
        highlights: p.highlights || initialMatch?.highlights,
        reviews: p.reviews || initialMatch?.reviews || [],
        rating: (() => {
          const revList = Array.isArray(p.reviews)
            ? p.reviews
            : Array.isArray(initialMatch?.reviews)
            ? initialMatch.reviews
            : [];
          if (revList.length > 0) {
            const avg = revList.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / revList.length;
            return Number(avg.toFixed(1));
          }
          return typeof p.rating === 'number' && (p.reviewCount || 0) > 0 && p.reviewCount !== 100
            ? p.rating
            : 0;
        })(),
        reviewCount: (() => {
          const revList = Array.isArray(p.reviews)
            ? p.reviews
            : Array.isArray(initialMatch?.reviews)
            ? initialMatch.reviews
            : [];
          if (revList.length > 0) return revList.length;
          return typeof p.reviewCount === 'number' && p.reviewCount !== 100 ? p.reviewCount : 0;
        })(),
        brand: p.brand || initialMatch?.brand || 'REDMODE',
        material: p.material || initialMatch?.material,
        fit: p.fit || initialMatch?.fit,
        pattern: p.pattern || initialMatch?.pattern,
        color: p.color || initialMatch?.color,
        colorOptions: (() => {
          if (Array.isArray(p.colorOptions) && p.colorOptions.length > 0) {
            return p.colorOptions;
          }
          return initialMatch?.colorOptions || [];
        })(),
        occasion: p.occasion || initialMatch?.occasion,
        countryOfOrigin: p.countryOfOrigin || initialMatch?.countryOfOrigin || 'India',
        sku: p.sku || initialMatch?.sku,
      } as Product;
    });
  };

  // Persistent State with Fallback & Safe Normalization
  const [products, setProducts] = useState<Product[]>(() => {
    let localDeleted: string[] = [];
    try {
      const saved = localStorage.getItem('redmode_deleted_product_ids');
      if (saved) localDeleted = JSON.parse(saved);
    } catch {}

    try {
      const saved = localStorage.getItem('redmode_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return normalizeProductsWithInitial(parsed, localDeleted);
        }
      }
    } catch (e) {
      console.error('Error parsing products from localStorage:', e);
    }
    // Only return INITIAL_PRODUCTS that are not in the deletion blacklist
    return INITIAL_PRODUCTS.filter((p) => !localDeleted.includes(p.id));
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Exclude any legacy subcategory slugs that got saved as top-level categories
          const legacySubcategorySlugs = new Set([
            'printed', 'printed-kurti',
            'embroidered', 'embroidered-kurti',
            'solids', 'classic-solids', 'simple',
            'short-kurti', 'long-kurti',
            'straight-fit', 'regular-fit',
            'cigarette-pants', 'flared-palazzos',
            'palazzo', 'pant', 'pants',
            'zari-work', 'chikankari',
            'festive-kurti-sets', 'daily-wear-sets',
          ]);

          let loadedCategories: Category[] = parsed
            .filter((c: Partial<Category>) => c && c.slug && !legacySubcategorySlugs.has(c.slug.toLowerCase()))
            .map((c: Partial<Category>) => {
              const catObj = {
                ...c,
                subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
              } as Category;
              // Clean any stale /assets/categories/ references
              if (catObj.imageUrl && catObj.imageUrl.startsWith('/assets/categories/')) {
                const initMatch = INITIAL_CATEGORIES.find((ic) => ic.id === catObj.id || ic.slug === catObj.slug);
                catObj.imageUrl = initMatch?.imageUrl || '';
                catObj.bannerUrl = initMatch?.bannerUrl || '';
              }
              return catObj;
            });

          // Ensure essential category subcategories exist if missing
          const kurtiCat = loadedCategories.find(
            (c) => c.slug === 'kurti' || c.name.toLowerCase() === 'kurti'
          );
          if (kurtiCat && (!kurtiCat.subcategories || kurtiCat.subcategories.length === 0)) {
            kurtiCat.subcategories = INITIAL_CATEGORIES[0].subcategories;
          }

          const trouserCat = loadedCategories.find(
            (c) => c.slug === 'trouser' || c.slug === 'bottom' || c.name.toLowerCase() === 'trouser'
          );
          if (trouserCat && (!trouserCat.subcategories || trouserCat.subcategories.length === 0)) {
            trouserCat.subcategories = INITIAL_CATEGORIES[1].subcategories;
          }

          // Ensure other essential categories exist in loaded list
          const existingSlugs = new Set(loadedCategories.map((c) => c.slug));
          for (const initCat of INITIAL_CATEGORIES) {
            if (!existingSlugs.has(initCat.slug)) {
              loadedCategories.push(initCat);
            }
          }

          // Maintain order sequence
          loadedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));

          return loadedCategories;
        }
      }
    } catch (e) {
      console.error('Error parsing categories from localStorage:', e);
    }
    return INITIAL_CATEGORIES;
  });

  const [banners, setBanners] = useState<HeroBanner[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_banners');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_BANNERS;
  });

  const [blogs, setBlogs] = useState<Blog[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_blogs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_BLOGS;
  });

  const LEGACY_DEMO_ORDER_IDS = new Set([
    '#12347', '#12346', '#12345', '#12344', '#12343',
    '12347', '12346', '12345', '12344', '12343',
  ]);

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const realOrders = parsed.filter(
            (o) => o && o.id && !LEGACY_DEMO_ORDER_IDS.has(String(o.id).trim())
          );
          return realOrders;
        }
      }
    } catch (e) {}
    return INITIAL_ORDERS;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('redmode_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean up legacy placeholder svg and fallback to official brand logo
        const cleanedLogoUrl =
          !parsed.logoUrl ||
          parsed.logoUrl === '/redmode-logo.svg' ||
          parsed.logoUrl === '/redmode-emblem.svg' ||
          parsed.logoUrl === '/redmode-icon.svg' ||
          parsed.logoUrl.includes('assets/2') ||
          parsed.logoUrl.includes('redmode-logo.png')
            ? '/assets/redmode-official-emblem.png'
            : parsed.logoUrl;
        if (
          parsed.supportEmail === 'support@redmode.in' ||
          parsed.supportEmail === 'myredmode@gmail.com' ||
          !parsed.supportEmail
        ) {
          parsed.supportEmail = 'MyRedMode@gmail.com';
        }
        if (
          !parsed.storeAddress ||
          parsed.storeAddress.toLowerCase().includes('jaipur') ||
          parsed.storeAddress.toLowerCase().includes('hawa mahal')
        ) {
          parsed.storeAddress = '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India';
        }
        if (
          !parsed.whatsappNumber ||
          parsed.whatsappNumber.includes('74027') ||
          !parsed.whatsappNumber.replace(/\D/g, '').includes('7302797464')
        ) {
          parsed.whatsappNumber = '7302797464';
        }
        const delhiverySettings = {
          ...INITIAL_SETTINGS.delhiverySettings,
          ...(parsed.delhiverySettings || {}),
        };
        if (delhiverySettings.apiToken === 'de52f7425345a44f9e6f89fc01e86d942554a302') {
          delhiverySettings.apiToken = '';
        }
        if (!delhiverySettings.clientName || delhiverySettings.clientName === 'REDMODE_JAIPUR') {
          delhiverySettings.clientName = 'Redmode';
        }
        if (!delhiverySettings.warehouseName || delhiverySettings.warehouseName.includes('Jaipur')) {
          delhiverySettings.warehouseName = 'REDMODE B2C';
        }
        if (!delhiverySettings.pickupPincode || delhiverySettings.pickupPincode === '302002') {
          delhiverySettings.pickupPincode = '250002';
        }
        if (!delhiverySettings.pickupAddress || delhiverySettings.pickupAddress.includes('Jaipur')) {
          delhiverySettings.pickupAddress = '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India';
        }

        const razorpaySettings = {
          ...INITIAL_SETTINGS.razorpaySettings,
          ...(parsed.razorpaySettings || {}),
        };
        if (razorpaySettings.keySecret === 'Asrb0WLHUFBi3iEU3FK1DfiN') {
          razorpaySettings.keySecret = '';
        }
        razorpaySettings.enabled = true;

        const shippingChannels = parsed.shippingChannels && parsed.shippingChannels.length > 0
          ? parsed.shippingChannels
          : INITIAL_SETTINGS.shippingChannels;
        const activeShippingChannelId = parsed.activeShippingChannelId || 'delhivery';

        const paymentGateways = parsed.paymentGateways && parsed.paymentGateways.length > 0
          ? parsed.paymentGateways
          : INITIAL_SETTINGS.paymentGateways;
        const activePaymentGatewayId = parsed.activePaymentGatewayId || 'razorpay_domestic';
        const activeInternationalGatewayId = parsed.activeInternationalGatewayId || 'paypal_export';

        const announcementBar = {
          ...INITIAL_SETTINGS.announcementBar,
          ...(parsed.announcementBar || {}),
          messages:
            parsed.announcementBar?.messages && parsed.announcementBar.messages.length > 0
              ? parsed.announcementBar.messages
              : INITIAL_SETTINGS.announcementBar?.messages || [],
        };

        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          delhiverySettings,
          razorpaySettings,
          shippingChannels,
          activeShippingChannelId,
          paymentGateways,
          activePaymentGatewayId,
          activeInternationalGatewayId,
          announcementBar,
          logoUrl: cleanedLogoUrl,
        };
      }
    } catch (e) {}
    return INITIAL_SETTINGS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'msg-1',
        name: 'Ananya Verma',
        mobile: '9811223344',
        email: 'ananya.v@gmail.com',
        message: 'Need help regarding size exchange for order #12345.',
        createdAt: '2026-03-11T16:00:00Z',
        status: 'New',
      },
    ];
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('redmode_user') || sessionStorage.getItem('redmode_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore parse error
      }
    }
    return {
      mobileOrEmail: '',
      isLoggedIn: false,
      savedAddresses: [],
      savedForThisDevice: true,
    };
  });

  // COD Admin Manual Overrides: Phone (10 digits) -> Boolean (true: allow COD, false: restrict to Prepaid)
  const [codOverrides, setCodOverrides] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('redmode_cod_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('redmode_cod_overrides', JSON.stringify(codOverrides));
  }, [codOverrides]);

  // Signed server challenge tokens for customer OTP verification
  const otpChallengeTokensRef = useRef<Record<string, string>>({});

  // Track system deletions across Firestore so deleted items never resurrect on any client
  const [deletedIds, setDeletedIds] = useState<{
    deletedProductIds: string[];
    deletedCategoryIds: string[];
    deletedBannerIds: string[];
  }>(() => {
    let localDeleted: string[] = [];
    try {
      const saved = localStorage.getItem('redmode_deleted_product_ids');
      if (saved) localDeleted = JSON.parse(saved);
    } catch {}
    return {
      deletedProductIds: Array.isArray(localDeleted) ? localDeleted : [],
      deletedCategoryIds: [],
      deletedBannerIds: [],
    };
  });

  // Real-time listener for System Deletions
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(
        doc(db, 'settings', 'system_deletions'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const delProducts: string[] = Array.isArray(data?.deletedProductIds) ? data.deletedProductIds : [];
            const delCategories: string[] = Array.isArray(data?.deletedCategoryIds) ? data.deletedCategoryIds : [];
            const delBanners: string[] = Array.isArray(data?.deletedBannerIds) ? data.deletedBannerIds : [];

            setDeletedIds({
              deletedProductIds: delProducts,
              deletedCategoryIds: delCategories,
              deletedBannerIds: delBanners,
            });

            try {
              localStorage.setItem('redmode_deleted_product_ids', JSON.stringify(delProducts));
            } catch {}

            // Immediately purge any deleted items from local active state
            if (delProducts.length > 0) {
              setProducts((prev) => prev.filter((p) => !delProducts.includes(p.id)));
            }
          }
        },
        (err) => {
          console.debug('Firestore system_deletions sync skipped:', err);
        }
      );
    } catch {}
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 1. Real-time Cloud Firestore Synchronization for Products across all devices & browsers
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    let localDeleted: string[] = [];
    try {
      const saved = localStorage.getItem('redmode_deleted_product_ids');
      if (saved) localDeleted = JSON.parse(saved);
    } catch {}
    const activeBlacklist = Array.from(new Set([...deletedIds.deletedProductIds, ...localDeleted]));

    const getProductTimeMs = (p: Partial<Product>): number => {
      const iso = toIsoTimestamp(p.updatedAt) || toIsoTimestamp(p.createdAt);
      if (!iso) return 0;
      const ms = new Date(iso).getTime();
      return isNaN(ms) ? 0 : ms;
    };

    const mergeProductLists = (
      currentList: Product[],
      incomingList: Product[],
      blacklist: string[]
    ): Product[] => {
      const initialIdSet = new Set(INITIAL_PRODUCTS.map((ip) => ip.id));
      const map = new Map<string, Product>();
      for (const item of currentList) {
        if (item && item.id && item.name && !blacklist.includes(item.id)) {
          map.set(item.id, item);
        }
      }
      for (const incoming of incomingList) {
        if (!incoming || !incoming.id || !incoming.name || blacklist.includes(incoming.id)) continue;
        const existing = map.get(incoming.id);
        if (!existing) {
          map.set(incoming.id, incoming);
        } else {
          const existingHasReal = !initialIdSet.has(existing.id) && productHasRealImage(existing);
          const incomingHasFakeOnly = !initialIdSet.has(incoming.id) && productHasFakePlaceholderOnly(incoming);

          // Only protect existing real images if incoming has a known fake Unsplash/ephemeral URL
          if (existingHasReal && incomingHasFakeOnly) {
            map.set(incoming.id, {
              ...incoming,
              mainImage: existing.mainImage,
              images: existing.images,
              colorOptions: existing.colorOptions,
            });
            continue;
          }

          const existingTime = getProductTimeMs(existing);
          const incomingTime = getProductTimeMs(incoming);
          if (incomingTime >= existingTime) {
            map.set(incoming.id, incoming);
          }
        }
      }
      return Array.from(map.values()).sort((a, b) => {
        const bTime = getProductTimeMs(b);
        const aTime = getProductTimeMs(a);
        if (bTime !== aTime) return bTime - aTime;
        return 0;
      });
    };

    // Fast local initial load from IndexedDB
    idbGet<Product[]>('redmode_products_v2')
      .then((idbProducts) => {
        if (idbProducts && Array.isArray(idbProducts) && !isCancelled) {
          const filtered = idbProducts.filter((p) => p && p.id && p.name && !activeBlacklist.includes(p.id));
          const normalized = normalizeProductsWithInitial(filtered, activeBlacklist);
          setProducts((prev) => mergeProductLists(prev, normalized, activeBlacklist));
        }
      })
      .catch(() => {});

    // Server-side persistent database load (/api/products)
    fetch('/api/products')
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.products) && res.products.length > 0 && !isCancelled) {
          let currentLocalDeleted: string[] = [];
          try {
            const saved = localStorage.getItem('redmode_deleted_product_ids');
            if (saved) currentLocalDeleted = JSON.parse(saved);
          } catch {}
          const fullBlacklist = Array.from(new Set([...deletedIds.deletedProductIds, ...currentLocalDeleted]));
          const normalized = normalizeProductsWithInitial(res.products, fullBlacklist);
          setProducts((prev) => {
            const merged = mergeProductLists(prev, normalized, fullBlacklist);
            idbSet('redmode_products_v2', merged).catch(() => {});
            try {
              localStorage.setItem('redmode_products', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});

    // Active real-time Firestore onSnapshot listener
    try {
      unsubscribe = onSnapshot(
        collection(db, 'products'),
        (snap) => {
          if (!isCancelled) {
            let currentLocalDeleted: string[] = [];
            try {
              const saved = localStorage.getItem('redmode_deleted_product_ids');
              if (saved) currentLocalDeleted = JSON.parse(saved);
            } catch {}
            const fullBlacklist = Array.from(new Set([...deletedIds.deletedProductIds, ...currentLocalDeleted]));

            const fsProducts: Product[] = [];
            const fsIds = new Set<string>();
            const fsMap = new Map<string, Product>();
            snap.forEach((d) => {
              const data = d.data();
              const docId = data?.id || d.id;
              // Ignore incomplete stub documents that lack a valid product name
              if (data && docId && typeof data.name === 'string' && data.name.trim().length > 0) {
                fsIds.add(docId);
                if (!fullBlacklist.includes(docId)) {
                  const rehydrated = rehydrateProductFromFirestore({ ...(data as Product), id: docId }) as Product;
                  fsProducts.push(rehydrated);
                  fsMap.set(docId, rehydrated);
                }
              }
            });

            const normalized = normalizeProductsWithInitial(fsProducts, fullBlacklist);
            setProducts((prev) => {
              const merged = mergeProductLists(prev, normalized, fullBlacklist);
              idbSet('redmode_products_v2', merged).catch(() => {});
              try {
                localStorage.setItem('redmode_products', JSON.stringify(merged));
              } catch {}

              // Auto-sync any custom local product that failed to reach Firestore earlier OR has a real photo while Firestore only has a placeholder
              const initialIdSet = new Set(INITIAL_PRODUCTS.map((ip) => ip.id));
              merged.forEach((localProd) => {
                if (
                  localProd &&
                  localProd.id &&
                  localProd.name &&
                  !fullBlacklist.includes(localProd.id) &&
                  !initialIdSet.has(localProd.id)
                ) {
                  const fsDoc = fsMap.get(localProd.id);
                  const needsSync =
                    !fsIds.has(localProd.id) ||
                    (productHasRealImage(localProd) && !productHasRealImage(fsDoc));
                  if (needsSync) {
                    ensureCompactProductForFirestore(localProd)
                      .then((compactProd) =>
                        setDoc(
                          doc(db, 'products', localProd.id),
                          prepareProductForFirestore(compactProd),
                          { merge: true }
                        )
                      )
                      .catch((syncErr) => {
                        console.warn('Auto-sync local product to Firestore warning:', syncErr);
                      });
                  }
                }
              });

              return merged;
            });
          }
        },
        (fsErr) => {
          console.debug('Firestore products onSnapshot listener offline/skipped:', fsErr);
        }
      );
    } catch (err) {
      console.debug('Failed to initialize products onSnapshot:', err);
    }

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [deletedIds.deletedProductIds]);

  // Real-time Orders synchronization via Backend API & Cloud Firestore
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    const mergeOrders = (current: Order[], incoming: Order[]): Order[] => {
      const map = new Map<string, Order>();
      for (const o of current) {
        if (o && o.id && !LEGACY_DEMO_ORDER_IDS.has(String(o.id).trim())) {
          map.set(o.id, o);
        }
      }
      for (const inc of incoming) {
        if (inc && inc.id && !LEGACY_DEMO_ORDER_IDS.has(String(inc.id).trim())) {
          map.set(inc.id, { ...(map.get(inc.id) || {}), ...inc });
        }
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    };

    fetch('/api/orders')
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.orders) && !isCancelled) {
          setOrders((prev) => mergeOrders(prev, res.orders));
        }
      })
      .catch(() => {});

    try {
      unsubscribe = onSnapshot(
        collection(db, 'orders'),
        (snap) => {
          if (!isCancelled && !snap.empty) {
            const fsOrders: Order[] = [];
            snap.forEach((d) => {
              const data = d.data() as Order;
              if (data && data.id && !LEGACY_DEMO_ORDER_IDS.has(String(data.id).trim())) {
                fsOrders.push(data);
              }
            });
            if (fsOrders.length > 0) {
              setOrders((prev) => mergeOrders(prev, fsOrders));
            }
          }
        },
        () => {}
      );
    } catch {}

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync to IndexedDB and LocalStorage as offline fallback
  useEffect(() => {
    idbSet('redmode_products_v2', products).catch(() => {});
    try {
      localStorage.setItem('redmode_products', JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('redmode_categories', JSON.stringify(categories));
    } catch {}
    idbSet('redmode_categories_v2', categories).catch(() => {});
  }, [categories]);

  // 2. Real-time Cloud Firestore Synchronization for Categories across all devices & browsers
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onSnapshot(
        collection(db, 'categories'),
        (snap) => {
          if (!isCancelled) {
            const fsCategories: Category[] = [];
            snap.forEach((d) => {
              const data = d.data();
              if (data && data.id && !deletedIds.deletedCategoryIds.includes(data.id)) {
                const cat = { ...(data as Category) };
                if (cat.imageUrl && cat.imageUrl.startsWith('/assets/categories/')) {
                  const initMatch = INITIAL_CATEGORIES.find((ic) => ic.id === cat.id || ic.slug === cat.slug);
                  cat.imageUrl = initMatch?.imageUrl || '';
                  cat.bannerUrl = initMatch?.bannerUrl || '';
                }
                fsCategories.push(cat);
              }
            });

            if (fsCategories.length > 0) {
              fsCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
              setCategories(fsCategories);
              try {
                localStorage.setItem('redmode_categories', JSON.stringify(fsCategories));
              } catch {}
              idbSet('redmode_categories_v2', fsCategories).catch(() => {});
            }
          }
        },
        (err) => {
          console.debug('Firestore categories onSnapshot listener offline/skipped:', err);
        }
      );
    } catch (err) {
      console.debug('Failed to initialize categories onSnapshot:', err);
    }

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [deletedIds.deletedCategoryIds]);

  // 3. Real-time Cloud Firestore Synchronization for Promotional Banners
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onSnapshot(
        collection(db, 'banners'),
        (snap) => {
          if (!isCancelled) {
            const fsBanners: HeroBanner[] = [];
            snap.forEach((d) => {
              const data = d.data();
              if (data && data.id && !deletedIds.deletedBannerIds.includes(data.id)) {
                fsBanners.push(data as HeroBanner);
              }
            });

            if (fsBanners.length > 0) {
              setBanners(fsBanners);
              try {
                localStorage.setItem('redmode_banners', JSON.stringify(fsBanners));
              } catch {}
            }
          }
        },
        (err) => {
          console.debug('Firestore banners onSnapshot offline/skipped:', err);
        }
      );
    } catch (err) {
      console.debug('Failed to initialize banners onSnapshot:', err);
    }

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [deletedIds.deletedBannerIds]);

  // 4. Real-time Cloud Firestore Synchronization for Store Settings (Payment gateways, announcements, store details)
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onSnapshot(
        doc(db, 'settings', 'store_settings'),
        (snap) => {
          if (snap.exists() && !isCancelled) {
            const data = snap.data();
            if (data && Object.keys(data).length > 0) {
              setSettings((prev) => {
                const merged = { ...prev, ...data } as StoreSettings;
                if (
                  !merged.storeAddress ||
                  merged.storeAddress.toLowerCase().includes('jaipur') ||
                  merged.storeAddress.toLowerCase().includes('hawa mahal') ||
                  merged.storeAddress.toLowerCase().includes('mumbai') ||
                  merged.storeAddress.toLowerCase().includes('surat')
                ) {
                  merged.storeAddress = '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India';
                }
                if (
                  !merged.whatsappNumber ||
                  merged.whatsappNumber.includes('74027') ||
                  !merged.whatsappNumber.replace(/\D/g, '').includes('7302797464')
                ) {
                  merged.whatsappNumber = '7302797464';
                }
                if (
                  !merged.supportEmail ||
                  merged.supportEmail.toLowerCase() === 'support@redmode.in' ||
                  merged.supportEmail.toLowerCase() === 'myredmode@gmail.com'
                ) {
                  merged.supportEmail = 'MyRedMode@gmail.com';
                }
                if (merged.smsSettings) {
                  const rawGateways = Array.isArray(merged.smsSettings.gateways) ? merged.smsSettings.gateways : [];
                  const hadMoreThanTwo = rawGateways.some((g) => g.provider !== 'twofactor' && g.provider !== 'meta_whatsapp');
                  const existingTf = rawGateways.find((g) => g.provider === 'twofactor');
                  const tfMissingKey = !existingTf?.apiKey || existingTf.apiKey.trim().length < 8;
                  const shouldPromoteTf =
                    tfMissingKey ||
                    merged.smsSettings.activeProviderId === 'fast2sms' ||
                    merged.smsSettings.activeProviderId === 'msg91' ||
                    !merged.smsSettings.activeProviderId;

                  const nextActiveId = shouldPromoteTf ? 'twofactor' : merged.smsSettings.activeProviderId;
                  const nextFallbackId = nextActiveId === 'twofactor' ? 'meta_whatsapp' : 'twofactor';

                  const cleanedGateways = INITIAL_SETTINGS.smsSettings!.gateways.map((defGw) => {
                    const found = rawGateways.find((g) => g.provider === defGw.provider);
                    if (defGw.provider === 'twofactor') {
                      return {
                        ...defGw,
                        ...(found || {}),
                        id: 'twofactor',
                        provider: 'twofactor' as const,
                        enabled: true,
                        isPrimary: nextActiveId === 'twofactor',
                        apiKey:
                          found?.apiKey &&
                          found.apiKey.trim().length >= 8 &&
                          found.apiKey.trim() !== '699e72b1-de86-11f1-bb6c-0200cd936042'
                            ? found.apiKey.trim()
                            : '',
                      };
                    }
                    return {
                      ...defGw,
                      ...(found || {}),
                      id: 'meta_whatsapp',
                      provider: 'meta_whatsapp' as const,
                      enabled: found?.enabled ?? true,
                      isPrimary: nextActiveId === 'meta_whatsapp',
                      phoneNumberId:
                        !found?.phoneNumberId || found.phoneNumberId === '109845729104823'
                          ? '1375149605673144'
                          : found.phoneNumberId,
                      wabaId:
                        !found?.wabaId || found.wabaId === '392019482910482'
                          ? '2745819689145292'
                          : found.wabaId,
                      accessToken:
                        found?.accessToken && found.accessToken.includes('EAAG9xxxxxxx')
                          ? ''
                          : (found?.accessToken || ''),
                    };
                  });

                  merged.smsSettings = {
                    ...merged.smsSettings,
                    enabled: merged.smsSettings.enabled ?? true,
                    activeProviderId: nextActiveId,
                    fallbackProviderId: nextFallbackId,
                    gateways: cleanedGateways,
                  };

                  if (hadMoreThanTwo) {
                    setDoc(
                      doc(db, 'settings', 'store_settings'),
                      sanitizeSettingsForPublicFirestore({ smsSettings: merged.smsSettings }),
                      { merge: true }
                    ).catch(() => {});
                  }

                  const adminToken =
                    sessionStorage.getItem('redmode_admin_token') ||
                    localStorage.getItem('redmode_admin_token') ||
                    '';
                  if (adminToken) {
                    fetch('/api/admin/sms-settings', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                      },
                      credentials: 'include',
                      body: JSON.stringify(merged.smsSettings),
                    }).catch(() => {});
                  }
                }
                try {
                  localStorage.setItem('redmode_settings', JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          }
        },
        (err) => {
          console.debug('Firestore store_settings onSnapshot offline/skipped:', err);
        }
      );
    } catch (err) {
      console.debug('Failed to initialize store_settings onSnapshot:', err);
    }

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const syncCategoriesToCloud = async (): Promise<{ success: boolean; count: number }> => {
    try {
      let count = 0;
      for (const cat of categories) {
        await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat), { merge: true });
        count++;
      }
      return { success: true, count };
    } catch (e) {
      console.error('Failed to sync categories to cloud:', e);
      return { success: false, count: 0 };
    }
  };

  useEffect(() => {
    localStorage.setItem('redmode_banners', JSON.stringify(banners));
  }, [banners]);

  useEffect(() => {
    localStorage.setItem('redmode_blogs', JSON.stringify(blogs));
  }, [blogs]);

  useEffect(() => {
    localStorage.setItem('redmode_orders', JSON.stringify(orders));
  }, [orders]);

  // Automatic 24-Hour Expiration Check:
  // If an unconfirmed order exceeds 24 hours without customer reply,
  // mark it as Expired (Grey status), cancel it automatically, and send NO message to customer.
  useEffect(() => {
    const checkAndExpireUnconfirmed = () => {
      setOrders((prev) => {
        let changed = false;
        const now = Date.now();
        const updated = prev.map((order) => {
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
          const isAlreadyExpired = order.orderStatus === 'Expired' || order.isExpired === true;

          if (isConfirmed || isCancelled || isAlreadyExpired) return order;

          const refTime = order.confirmationSentAt
            ? new Date(order.confirmationSentAt).getTime()
            : order.scheduledConfirmationTime
            ? new Date(order.scheduledConfirmationTime).getTime()
            : new Date(order.createdAt || now).getTime();

          const hoursElapsed = (now - refTime) / (1000 * 60 * 60);

          // If 24 hours over without reply: automatically move to Cancelled (24h Expired), send NO message to customer
          if (hoursElapsed >= 24) {
            changed = true;
            return {
              ...order,
              orderStatus: 'Cancelled' as OrderStatus,
              isExpired: true,
              expiredAt: order.expiredAt || new Date().toISOString(),
            };
          }

          // If 23 hours reached without reply: trigger 23-hour gentle follow-up message
          if (hoursElapsed >= 23 && !order.reminder23hSent) {
            changed = true;
            return {
              ...order,
              reminder23hSent: true,
              reminder23hSentAt: new Date().toISOString(),
            };
          }

          return order;
        });

        return changed ? updated : prev;
      });
    };

    checkAndExpireUnconfirmed();
    const timer = setInterval(checkAndExpireUnconfirmed, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('redmode_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('redmode_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('redmode_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('redmode_messages', JSON.stringify(contactMessages));
  }, [contactMessages]);

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_coupons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'c1',
        code: 'REDMODE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 999,
        maxDiscount: 500,
        startDate: '2026-01-01',
        expiryDate: '2026-12-31',
        usageLimit: 1000,
        usedCount: 42,
        active: true,
        description: 'Get 10% instant discount on orders above ₹999.',
      },
      {
        id: 'c2',
        code: 'WELCOME15',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderValue: 1499,
        maxDiscount: 750,
        startDate: '2026-01-01',
        expiryDate: '2026-12-31',
        usageLimit: 500,
        usedCount: 19,
        active: true,
        description: '15% off on your first order with RedMode.',
      },
      {
        id: 'c3',
        code: 'FESTIVE200',
        discountType: 'FLAT',
        discountValue: 200,
        minOrderValue: 1999,
        startDate: '2026-01-01',
        expiryDate: '2026-12-31',
        usageLimit: 250,
        usedCount: 8,
        active: true,
        description: 'Flat ₹200 savings on designer festive wear.',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('redmode_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    if (userProfile.isLoggedIn) {
      if (userProfile.savedForThisDevice !== false) {
        localStorage.setItem('redmode_user', JSON.stringify(userProfile));
        sessionStorage.removeItem('redmode_user_session');
      } else {
        sessionStorage.setItem('redmode_user_session', JSON.stringify(userProfile));
        localStorage.removeItem('redmode_user');
      }
    } else {
      localStorage.removeItem('redmode_user');
      sessionStorage.removeItem('redmode_user_session');
    }
  }, [userProfile]);

  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  // Cart Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Automatic ₹999 Offer Rule:
  // "₹999 offer automatically apply hoga jab cart value ₹999 ya usse zyada ho.
  // Customer ko manually coupon enter nahi karna padega."
  const isAutoDiscountApplied = cartSubtotal >= (settings.autoDiscountThreshold || 999);
  const autoDiscountAmount = isAutoDiscountApplied
    ? Math.round((cartSubtotal * (settings.autoDiscountPercent || 10)) / 100)
    : 0;

  // Validate applied coupon against live cartSubtotal, active status, date range, and usage limit
  const appliedCoupon: Coupon | null = useMemo(() => {
    if (!appliedCouponCode || cartSubtotal <= 0) return null;
    const found = coupons.find(
      (c) => c.code.toUpperCase().trim() === appliedCouponCode.toUpperCase().trim() && c.active
    );
    if (!found) return null;
    if (cartSubtotal < (found.minOrderValue || 0)) return null;
    const nowMs = Date.now();
    if (found.startDate) {
      const startMs = new Date(found.startDate).getTime();
      if (!isNaN(startMs) && nowMs < startMs) return null;
    }
    if (found.expiryDate) {
      const endDate = new Date(found.expiryDate);
      endDate.setHours(23, 59, 59, 999);
      if (!isNaN(endDate.getTime()) && nowMs > endDate.getTime()) return null;
    }
    if (typeof found.usageLimit === 'number' && found.usageLimit > 0 && found.usedCount >= found.usageLimit) {
      return null;
    }
    return found;
  }, [appliedCouponCode, coupons, cartSubtotal]);

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon || cartSubtotal <= 0) return 0;
    const announcementCode = (settings.announcementBar?.couponCode || 'REDMODE10').toUpperCase().trim();
    // If the applied coupon is the same as the automatic 10% offer code and auto discount is already applied,
    // don't double-apply the same 10% offer
    if (appliedCoupon.code.toUpperCase().trim() === announcementCode && isAutoDiscountApplied) {
      return 0;
    }
    let rawDisc = 0;
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      rawDisc = Math.round((cartSubtotal * appliedCoupon.discountValue) / 100);
      if (typeof appliedCoupon.maxDiscount === 'number' && appliedCoupon.maxDiscount > 0) {
        rawDisc = Math.min(rawDisc, appliedCoupon.maxDiscount);
      }
    } else {
      rawDisc = Math.round(appliedCoupon.discountValue);
    }
    const maxAllowed = Math.max(0, cartSubtotal - autoDiscountAmount);
    return Math.min(rawDisc, maxAllowed);
  }, [appliedCoupon, cartSubtotal, autoDiscountAmount, isAutoDiscountApplied, settings.announcementBar?.couponCode]);

  const applyCoupon = (rawCode: string): { success: boolean; message: string } => {
    const cleanCode = (rawCode || '').toUpperCase().trim();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid coupon code.' };
    }
    const found = coupons.find((c) => c.code.toUpperCase().trim() === cleanCode);
    if (!found || !found.active) {
      return { success: false, message: `Coupon code "${cleanCode}" is invalid or inactive.` };
    }
    const nowMs = Date.now();
    if (found.startDate) {
      const startMs = new Date(found.startDate).getTime();
      if (!isNaN(startMs) && nowMs < startMs) {
        return { success: false, message: `Coupon "${cleanCode}" is not active yet.` };
      }
    }
    if (found.expiryDate) {
      const endDate = new Date(found.expiryDate);
      endDate.setHours(23, 59, 59, 999);
      if (!isNaN(endDate.getTime()) && nowMs > endDate.getTime()) {
        return { success: false, message: `Coupon "${cleanCode}" has expired.` };
      }
    }
    if (typeof found.usageLimit === 'number' && found.usageLimit > 0 && found.usedCount >= found.usageLimit) {
      return { success: false, message: `Coupon "${cleanCode}" has reached its maximum usage limit.` };
    }
    if (cartSubtotal < (found.minOrderValue || 0)) {
      return {
        success: false,
        message: `Minimum order of ₹${found.minOrderValue} is required to use "${cleanCode}". Add ₹${found.minOrderValue - cartSubtotal} more.`,
      };
    }

    setAppliedCouponCode(found.code.toUpperCase().trim());
    const announcementCode = (settings.announcementBar?.couponCode || 'REDMODE10').toUpperCase().trim();
    if (found.code.toUpperCase().trim() === announcementCode && isAutoDiscountApplied) {
      return {
        success: true,
        message: `Coupon ${found.code} verified! Automatic ${settings.autoDiscountPercent || 10}% discount (₹${autoDiscountAmount}) is active on your bag.`,
      };
    }
    return {
      success: true,
      message: `Coupon "${found.code}" applied successfully!`,
    };
  };

  const removeCoupon = () => {
    setAppliedCouponCode(null);
  };

  const totalOrderDiscount = autoDiscountAmount + couponDiscountAmount;
  const taxableAmount = Math.max(0, cartSubtotal - totalOrderDiscount);
  const cartGstAmount = Math.round(taxableAmount * 0.05); // Standard 5% GST for apparel
  const deliveryFee = cartSubtotal > 0 ? settings.shippingCharges : 0;
  const cartTotalAmount = Math.max(0, taxableAmount + cartGstAmount + deliveryFee);

  // Cart Management
  const addToCart = (
    product: Product,
    size?: string,
    quantity: number = 1,
    color?: string,
    colorImage?: string
  ): { success: boolean; message: string } => {
    // Mandatory Account Login Check per user request
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return { success: false, message: 'Please login to add items to your cart' };
    }

    // Size logic:
    const isFreeSize =
      !product.sizes ||
      product.sizes.length === 0 ||
      (product.sizes.length === 1 &&
        ['free size', 'freesize', 'free-size', 'free'].includes(product.sizes[0].trim().toLowerCase()));

    const targetSize = isFreeSize
      ? 'Free size'
      : (size || product.defaultSize || product.sizes?.[0] || 'Standard');
    const targetColor = color || product.color || product.colorOptions?.[0]?.name;
    const targetVariant = product.colorOptions?.find(
      (c) => c.name.toLowerCase() === (targetColor || '').toLowerCase()
    );
    const targetImage =
      colorImage ||
      targetVariant?.images?.[0] ||
      targetVariant?.image ||
      product.mainImage;

    const targetPrice = targetVariant?.price ?? product.price;
    const targetMrp = targetVariant?.mrp ?? product.mrp;
    const targetSku = targetVariant?.sku ?? product.sku;

    // Check size stock for this color variant if specified, otherwise fall back to product stock
    const availableStock =
      targetVariant?.stockBySize?.[targetSize] ??
      (isFreeSize ? (targetVariant?.stockBySize?.['Free size'] ?? product.stockBySize?.['Free size']) : undefined) ??
      product.stockBySize?.[targetSize] ??
      10;

    if (availableStock <= 0) {
      return {
        success: false,
        message: isFreeSize
          ? `Free size${targetColor ? ` in ${targetColor}` : ''} is currently out of stock.`
          : `Size ${targetSize}${targetColor ? ` in ${targetColor}` : ''} is currently out of stock.`,
      };
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.productId === product.id &&
          item.selectedSize === targetSize &&
          (item.selectedColor || '') === (targetColor || '')
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex].quantity = Math.min(newQty, availableStock);
        return updated;
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            product: {
              ...product,
              price: targetPrice,
              mrp: targetMrp,
              sku: targetSku,
              mainImage: targetImage,
              color: targetColor,
            },
            selectedSize: targetSize,
            selectedColor: targetColor,
            selectedColorImage: targetImage,
            variantSku: targetSku,
            variantPrice: targetPrice,
            quantity: Math.min(quantity, availableStock),
          },
        ];
      }
    });

    const formatSizeLabel = (sz: string) => {
      const clean = sz.trim().toUpperCase();
      const map: Record<string, string> = {
        XS: 'XS-36',
        S: 'S-38',
        M: 'M-40',
        L: 'L-42',
        XL: 'XL-44',
        XXL: 'XXL-46',
        '2XL': 'XXL-46',
        '3XL': '3XL-48',
        '4XL': '4XL-50',
      };
      return map[clean] || clean;
    };

    setLastAddedItem({
      product,
      size: targetSize,
      formattedSize: formatSizeLabel(targetSize),
      color: targetColor,
      colorImage: targetImage,
      price: targetPrice,
      sku: targetSku || product.sku,
    });
    setCartDrawerView('added-notification');

    return {
      success: true,
      message: `Added ${product.name} (${targetColor ? `${targetColor} / ` : ''}Size: ${targetSize}) to your shopping bag.`,
    };
  };

  const removeFromCart = (productId: string, size: string, color?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.selectedSize === size &&
            (!color || (item.selectedColor || '') === color)
          )
      )
    );
  };

  const updateCartQuantity = (
    productId: string,
    size: string,
    quantity: number,
    color?: string
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (
          item.productId === productId &&
          item.selectedSize === size &&
          (!color || (item.selectedColor || '') === color)
        ) {
          const variant = item.product.colorOptions?.find(
            (c) => c.name.toLowerCase() === (item.selectedColor || '').toLowerCase()
          );
          const maxStock =
            variant?.stockBySize?.[size] ?? item.product.stockBySize?.[size] ?? 20;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  const toggleWishlist = (productIdOrKey: string) => {
    // Mandatory Account Login Check per user request
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }

    setWishlist((prev) => {
      const rawId = productIdOrKey.includes('__') ? productIdOrKey.split('__')[0] : productIdOrKey;
      if (prev.includes(productIdOrKey)) {
        return prev.filter((id) => id !== productIdOrKey && id !== rawId);
      }
      if (prev.includes(rawId)) {
        return prev.filter((id) => id !== rawId && id !== productIdOrKey);
      }
      return [...prev, productIdOrKey];
    });
  };

  const incrementProductViews = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, views: (p.views || 0) + 1 } : p))
    );
  };

  // Helper to restore stock when an order is cancelled or rejected
  const restoreOrderInventory = useCallback((cancelledOrder: Order) => {
    if (!cancelledOrder || !Array.isArray(cancelledOrder.items) || cancelledOrder.items.length === 0) return;
    if ((cancelledOrder as any).inventoryRestored) return;

    setProducts((prev) =>
      prev.map((prod) => {
        const matchingItems = cancelledOrder.items.filter((it) => it.productId === prod.id);
        if (matchingItems.length === 0) return prod;

        const updatedStockBySize = { ...prod.stockBySize };
        const updatedColorOptions = prod.colorOptions ? [...prod.colorOptions] : undefined;
        let restoredTotal = 0;

        matchingItems.forEach((it) => {
          const sizeKey = it.size || 'Free size';
          updatedStockBySize[sizeKey] = (updatedStockBySize[sizeKey] ?? 0) + it.quantity;
          restoredTotal += it.quantity;

          if (updatedColorOptions && it.color) {
            const vIdx = updatedColorOptions.findIndex(
              (v) => v.name.toLowerCase() === it.color!.toLowerCase()
            );
            if (vIdx !== -1) {
              const variant = updatedColorOptions[vIdx];
              const varStock = { ...(variant.stockBySize || {}) };
              varStock[sizeKey] = (varStock[sizeKey] ?? 0) + it.quantity;
              updatedColorOptions[vIdx] = { ...variant, stockBySize: varStock };
            }
          }
        });

        return {
          ...prod,
          stockBySize: updatedStockBySize,
          colorOptions: updatedColorOptions,
          salesCount: Math.max(0, (prod.salesCount || 0) - restoredTotal),
        };
      })
    );

    // Also restore stock atomically in Cloud Firestore
    runTransaction(db, async (transaction) => {
      const uniqueProdIds = Array.from(new Set(cancelledOrder.items.map((i) => i.productId)));
      const snaps = await Promise.all(
        uniqueProdIds.map((pid) => transaction.get(doc(db, 'products', pid)))
      );
      snaps.forEach((snap, idx) => {
        if (!snap.exists()) return;
        const pid = uniqueProdIds[idx];
        const data = snap.data() as Product;
        const matchingItems = cancelledOrder.items.filter((i) => i.productId === pid);
        const updatedStockBySize = { ...(data.stockBySize || {}) };
        const updatedColorOptions = Array.isArray(data.colorOptions) ? [...data.colorOptions] : undefined;
        let restoredCount = 0;

        matchingItems.forEach((it) => {
          const sizeKey = it.size || 'Free size';
          updatedStockBySize[sizeKey] = (updatedStockBySize[sizeKey] ?? 0) + it.quantity;
          restoredCount += it.quantity;
          if (updatedColorOptions && it.color) {
            const vIdx = updatedColorOptions.findIndex(
              (v) => v.name.toLowerCase() === it.color!.toLowerCase()
            );
            if (vIdx !== -1) {
              const variant = updatedColorOptions[vIdx];
              const varStock = { ...(variant.stockBySize || {}) };
              varStock[sizeKey] = (varStock[sizeKey] ?? 0) + it.quantity;
              updatedColorOptions[vIdx] = { ...variant, stockBySize: varStock };
            }
          }
        });

        transaction.set(
          doc(db, 'products', pid),
          cleanForFirestore({
            stockBySize: updatedStockBySize,
            ...(updatedColorOptions ? { colorOptions: updatedColorOptions } : {}),
            salesCount: Math.max(0, (data.salesCount || 0) - restoredCount),
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      });
    }).catch((err) => {
      console.debug('Firestore inventory restoration transaction notice:', err);
    });
  }, []);

  // Order Placement with Pre-Order Stock Validation & Atomic Firestore Inventory Transaction
  const placeOrder = (
    customer: CustomerAddress,
    paymentMode: 'COD' | 'Prepaid',
    paymentStatus: 'Paid' | 'Pending',
    paymentDetails?: {
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
    }
  ): Order => {
    if (!cart || cart.length === 0) {
      throw new Error('Your shopping bag is empty. Please add items before placing an order.');
    }

    // 1. Validate stock and active status for every item in the cart to prevent overselling
    for (const item of cart) {
      const liveProd = products.find((p) => p.id === item.productId) || item.product;
      if (!liveProd || liveProd.published === false || liveProd.inStock === false) {
        throw new Error(`"${item.product.name}" is currently unavailable for purchase.`);
      }
      const targetColor = item.selectedColor || liveProd.color || liveProd.colorOptions?.[0]?.name;
      const targetVariant = liveProd.colorOptions?.find(
        (c) => c.name.toLowerCase() === (targetColor || '').toLowerCase()
      );
      if (targetVariant && Array.isArray(liveProd.inactiveRowKeys)) {
        const rowKey = `${liveProd.id}__${targetVariant.name}`;
        if (liveProd.inactiveRowKeys.includes(rowKey)) {
          throw new Error(`"${liveProd.name}" (${targetVariant.name}) is currently inactive.`);
        }
      }
      const sizeKey = item.selectedSize || 'Free size';
      const availableStock =
        targetVariant?.stockBySize?.[sizeKey] ??
        liveProd.stockBySize?.[sizeKey] ??
        0;
      if (availableStock < item.quantity) {
        throw new Error(
          availableStock <= 0
            ? `"${liveProd.name}" (Size: ${sizeKey}${targetColor ? `, Color: ${targetColor}` : ''}) just went out of stock.`
            : `Only ${availableStock} unit(s) of "${liveProd.name}" (Size: ${sizeKey}) are available in stock.`
        );
      }
    }

    const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;

    const orderItems: OrderItem[] = cart.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      image: item.selectedColorImage || item.product.mainImage,
      size: item.selectedSize,
      color: item.selectedColor,
      quantity: item.quantity,
      price: item.product.price,
    }));

    // Calculate admin-only package parcel specifications automatically based on stacking rules
    const parcel = calculateOrderParcel(orderItems, products);

    // Enforce international export rule: No COD for non-Indian shipments
    const isInternationalOrder = Boolean(customer.country && customer.country.toLowerCase() !== 'india');
    const safePaymentMode = isInternationalOrder ? 'Prepaid' : paymentMode;

    const activeChannel = settings.shippingChannels?.find((c) => c.id === settings.activeShippingChannelId) || settings.shippingChannels?.[0];
    const defaultCourierTitle = activeChannel?.name || 'Delhivery Direct B2C';

    const newOrder: Order = {
      id: orderNumber,
      customer,
      items: orderItems,
      subtotal: cartSubtotal,
      discount: totalOrderDiscount,
      gst: cartGstAmount,
      deliveryCharge: deliveryFee,
      total: cartTotalAmount,
      paymentMode: safePaymentMode,
      paymentStatus: isInternationalOrder && paymentStatus === 'Pending' && safePaymentMode === 'Prepaid' ? 'Paid' : paymentStatus,
      orderStatus: 'NEW',
      codVerificationStatus: safePaymentMode === 'COD' ? 'UNVERIFIED' : 'CONFIRMED',
      customerConfirmed: false,
      selected_courier_name: defaultCourierTitle,
      confirmationSentAt: (() => {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        if (mins >= 600 && mins <= 1260) {
          return now.toISOString();
        }
        return undefined;
      })(),
      scheduledConfirmationTime: (() => {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        if (mins >= 600 && mins <= 1260) {
          return undefined;
        }
        const sched = new Date(now);
        if (mins > 1260) {
          sched.setDate(sched.getDate() + 1);
        }
        sched.setHours(10, 0, 0, 0);
        return sched.toISOString();
      })(),
      createdAt: new Date().toISOString(),
      final_package_weight: parcel.final_package_weight,
      final_package_length: parcel.final_package_length,
      final_package_width: parcel.final_package_width,
      final_package_height: parcel.final_package_height,
      razorpayPaymentId: paymentDetails?.razorpayPaymentId,
      razorpayOrderId: paymentDetails?.razorpayOrderId,
      razorpaySignature: paymentDetails?.razorpaySignature,
    };

    const cartSnapshot = [...cart];

    // Deduct stock by size for each ordered product and specific color variant in local state
    setProducts((prev) =>
      prev.map((prod) => {
        const matchingCartItems = cartSnapshot.filter((c) => c.productId === prod.id);
        if (matchingCartItems.length === 0) return prod;

        const updatedStockBySize = { ...prod.stockBySize };
        const updatedColorOptions = prod.colorOptions ? [...prod.colorOptions] : undefined;
        let salesAdded = 0;

        matchingCartItems.forEach((c) => {
          const currentStock = updatedStockBySize[c.selectedSize] ?? 0;
          updatedStockBySize[c.selectedSize] = Math.max(0, currentStock - c.quantity);
          salesAdded += c.quantity;

          if (updatedColorOptions && c.selectedColor) {
            const vIdx = updatedColorOptions.findIndex(
              (v) => v.name.toLowerCase() === c.selectedColor!.toLowerCase()
            );
            if (vIdx !== -1) {
              const variant = updatedColorOptions[vIdx];
              const varStock = { ...(variant.stockBySize || {}) };
              varStock[c.selectedSize] = Math.max(0, (varStock[c.selectedSize] ?? 0) - c.quantity);
              updatedColorOptions[vIdx] = { ...variant, stockBySize: varStock };
            }
          }
        });

        return {
          ...prod,
          stockBySize: updatedStockBySize,
          colorOptions: updatedColorOptions,
          salesCount: (prod.salesCount || 0) + salesAdded,
        };
      })
    );

    // Save order locally and sync to backend & Firestore via atomic transaction
    setOrders((prev) => [newOrder, ...prev]);
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(() => {});

    const orderDocId = newOrder.id.replace(/[^a-zA-Z0-9_-]/g, '') || `ord_${Date.now()}`;
    runTransaction(db, async (transaction) => {
      const uniqueProdIds = Array.from(new Set(cartSnapshot.map((c) => c.productId)));
      const prodSnaps = await Promise.all(
        uniqueProdIds.map((pid) => transaction.get(doc(db, 'products', pid)))
      );

      prodSnaps.forEach((snap, idx) => {
        if (!snap.exists()) return;
        const pid = uniqueProdIds[idx];
        const data = snap.data() as Product;
        const matchingItems = cartSnapshot.filter((c) => c.productId === pid);
        const updatedStockBySize = { ...(data.stockBySize || {}) };
        const updatedColorOptions = Array.isArray(data.colorOptions) ? [...data.colorOptions] : undefined;
        let salesAdded = 0;

        matchingItems.forEach((c) => {
          const currentStock = updatedStockBySize[c.selectedSize] ?? 0;
          if (currentStock < c.quantity) {
            throw new Error(`Insufficient stock in Firestore for ${data.name} (${c.selectedSize}).`);
          }
          updatedStockBySize[c.selectedSize] = Math.max(0, currentStock - c.quantity);
          salesAdded += c.quantity;

          if (updatedColorOptions && c.selectedColor) {
            const vIdx = updatedColorOptions.findIndex(
              (v) => v.name.toLowerCase() === c.selectedColor!.toLowerCase()
            );
            if (vIdx !== -1) {
              const variant = updatedColorOptions[vIdx];
              const varStock = { ...(variant.stockBySize || {}) };
              const curVarStock = varStock[c.selectedSize] ?? currentStock;
              if (curVarStock < c.quantity) {
                throw new Error(`Insufficient variant stock for ${data.name} (${c.selectedColor} / ${c.selectedSize}).`);
              }
              varStock[c.selectedSize] = Math.max(0, curVarStock - c.quantity);
              updatedColorOptions[vIdx] = { ...variant, stockBySize: varStock };
            }
          }
        });

        transaction.set(
          doc(db, 'products', pid),
          cleanForFirestore({
            stockBySize: updatedStockBySize,
            ...(updatedColorOptions ? { colorOptions: updatedColorOptions } : {}),
            salesCount: (data.salesCount || 0) + salesAdded,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      });

      transaction.set(doc(db, 'orders', orderDocId), cleanForFirestore(newOrder), { merge: true });
    }).catch(() => {
      // Fallback order write if product docs were not yet seeded in Firestore
      setDoc(doc(db, 'orders', orderDocId), cleanForFirestore(newOrder), { merge: true }).catch(() => {});
    });

    // Increment coupon usedCount if a coupon was applied
    if (appliedCoupon) {
      setCoupons((prev) =>
        prev.map((c) => {
          if (c.id !== appliedCoupon.id) return c;
          const updatedCoupon = { ...c, usedCount: (c.usedCount || 0) + 1 };
          setDoc(doc(db, 'coupons', updatedCoupon.id), cleanForFirestore(updatedCoupon), { merge: true }).catch(() => {});
          return updatedCoupon;
        })
      );
      setAppliedCouponCode(null);
    }

    // Save customer address to userProfile & Firestore customers collection
    if (userProfile.isLoggedIn && customer.pincode && customer.house) {
      const cleanPhone = normalizeMobile(customer.mobile || userProfile.mobileOrEmail) || userProfile.mobileOrEmail;
      const existingAddrs = userProfile.savedAddresses || [];
      const alreadySaved = existingAddrs.some(
        (a) => a.pincode === customer.pincode && (a.house || '').toLowerCase() === (customer.house || '').toLowerCase()
      );
      const nextAddresses = alreadySaved ? existingAddrs : [customer, ...existingAddrs];
      const nextProfile: UserProfile = {
        ...userProfile,
        name: customer.name || userProfile.name,
        savedAddresses: nextAddresses,
      };
      setUserProfile(nextProfile);
      const custDocId = nextProfile.customerId || `CUST-${cleanPhone.slice(-6)}`;
      setDoc(
        doc(db, 'customers', custDocId),
        cleanForFirestore({
          id: custDocId,
          name: nextProfile.name || customer.name || 'Valued Customer',
          phone: cleanPhone,
          mobile: cleanPhone,
          email: customer.email || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          savedAddresses: nextAddresses,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      ).catch(() => {});
    }

    // Save sanitized order for customer confirmation display
    setLastConfirmedOrder(sanitizeOrderForCustomer(newOrder));
    clearCart();
    return newOrder;
  };

  const trackOrder = (orderId: string): Order | undefined => {
    const cleanId = orderId.trim().toLowerCase().replace('#', '');
    const found = orders.find(
      (o) =>
        o.id.toLowerCase().replace('#', '') === cleanId ||
        o.customer.mobile === cleanId ||
        o.awb_number?.toLowerCase() === cleanId ||
        o.shipmozo?.awb?.toLowerCase() === cleanId
    );
    return found ? sanitizeOrderForCustomer(found) : undefined;
  };

  // Contact form submission (persisted to local state & Cloud Firestore inquiries collection)
  const submitContactForm = (name: string, mobile: string, email: string, message: string) => {
    const newMessage: ContactMessage = {
      id: `msg-${Date.now()}`,
      name,
      mobile,
      email,
      message,
      createdAt: new Date().toISOString(),
      status: 'New',
    };
    setContactMessages((prev) => [newMessage, ...prev]);
    setDoc(doc(db, 'inquiries', newMessage.id), cleanForFirestore(newMessage), { merge: true }).catch(() => {});
  };

  // Stock Notification ("Notify Me") submission persisted to localStorage & Cloud Firestore
  const submitStockNotification = async (
    productId: string,
    productName: string,
    size: string,
    color?: string,
    contact?: string
  ): Promise<boolean> => {
    const cleanContact = (contact || userProfile.mobileOrEmail || '').trim();
    if (!productId || !cleanContact) return false;
    const nowIso = new Date().toISOString();
    const record = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      productName: productName || 'Product',
      size: size || 'ALL',
      color: color || '',
      contact: cleanContact,
      mobile: cleanContact,
      createdAt: nowIso,
      status: 'pending',
    };
    try {
      const saved = localStorage.getItem('redmode_notify_me_list');
      const list = saved ? JSON.parse(saved) : [];
      const next = [record, ...(Array.isArray(list) ? list : [])];
      localStorage.setItem('redmode_notify_me_list', JSON.stringify(next));
    } catch {}
    try {
      await setDoc(doc(db, 'stock_notifications', record.id), cleanForFirestore(record), { merge: true });
    } catch (err) {
      console.debug('Firestore stock_notifications write notice:', err);
    }
    return true;
  };

  const resolveMessage = (id: string) => {
    setContactMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, status: 'Resolved' as const };
        setDoc(doc(db, 'inquiries', id), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      })
    );
  };

  // Customer Mobile OTP Authentication (No password, no username, no guest checkout)
  const normalizeMobile = (phone: string = ''): string => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    return digits.slice(-10);
  };

  const sendCustomerOtp = async (
    rawMobile: string
  ): Promise<{ success: boolean; message: string; simulated?: boolean }> => {
    const mobile = normalizeMobile(rawMobile);
    if (!mobile || mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) {
      return { success: false, message: 'Please enter a valid 10-digit Indian mobile number.' };
    }

    try {
      const res = await fetch('/api/otp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mobile,
          purpose: 'customer',
          smsSettings: settings.smsSettings,
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      if (rawText && rawText.trim().startsWith('{')) {
        try {
          data = JSON.parse(rawText);
        } catch {}
      }

      if (res.ok && data && data.success) {
        if (data.challengeToken) {
          otpChallengeTokensRef.current[mobile] = String(data.challengeToken);
        }
        return {
          success: true,
          simulated: false,
          message: data.message || `OTP sent to +91 ${mobile}`,
        };
      }

      return {
        success: false,
        message: data?.message || 'Unable to send OTP at the moment. Please try again shortly.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Network error while requesting OTP. Please check your internet connection and try again.',
      };
    }
  };

  const verifyCustomerOtp = async (
    rawMobile: string,
    otpInput: string,
    saveForThisDevice: boolean = true
  ): Promise<{ success: boolean; message: string }> => {
    const mobile = normalizeMobile(rawMobile);
    const cleanOtp = (otpInput || '').replace(/\D/g, '').trim();

    if (cleanOtp.length !== 6) {
      return { success: false, message: 'Invalid OTP code. Please enter the 6-digit code received on your phone.' };
    }

    try {
      const challengeToken = otpChallengeTokensRef.current[mobile] || '';
      const res = await fetch('/api/otp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mobile,
          otp: cleanOtp,
          purpose: 'customer',
          challengeToken,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || data?.verified === false) {
        return {
          success: false,
          message: data?.message || 'Incorrect or expired OTP code. Please verify and try again.',
        };
      }

      // Single-use OTP: clear stored challenge token after successful verification
      delete otpChallengeTokensRef.current[mobile];
    } catch (err: any) {
      return {
        success: false,
        message: 'Unable to verify OTP with server. Please check your connection and try again.',
      };
    }

    // Find existing customer name and addresses from previous orders
    const previousOrder = orders.find((o) => normalizeMobile(o.customer?.mobile || o.customer?.phone) === mobile);
    const customerName = previousOrder?.customer?.name || userProfile.name || 'Valued Customer';
    const savedAddresses = userProfile.savedAddresses || [];

    if (previousOrder?.customer && !savedAddresses.some((a) => a.pincode === previousOrder.customer.pincode && a.house === previousOrder.customer.house)) {
      savedAddresses.unshift(previousOrder.customer);
    }

    const updatedProfile: UserProfile = {
      mobileOrEmail: mobile,
      name: customerName,
      isLoggedIn: true,
      savedAddresses,
      savedForThisDevice: saveForThisDevice,
      customerId: `CUST-${mobile.slice(-6)}`,
      createdAt: userProfile.createdAt || new Date().toISOString(),
    };

    setUserProfile(updatedProfile);
    if (saveForThisDevice) {
      localStorage.setItem('redmode_user', JSON.stringify(updatedProfile));
      sessionStorage.removeItem('redmode_user_session');
    } else {
      sessionStorage.setItem('redmode_user_session', JSON.stringify(updatedProfile));
      localStorage.removeItem('redmode_user');
    }

    // Sync customer profile with Cloud Firestore `customers` collection
    const custDocId = updatedProfile.customerId || `CUST-${mobile.slice(-6)}`;
    getDoc(doc(db, 'customers', custDocId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const mergedAddresses = Array.isArray(data?.savedAddresses) && data.savedAddresses.length > 0
            ? data.savedAddresses
            : updatedProfile.savedAddresses;
          const hydrated: UserProfile = {
            ...updatedProfile,
            name: data?.name && data.name !== 'Valued Customer' ? data.name : updatedProfile.name,
            savedAddresses: mergedAddresses,
          };
          setUserProfile(hydrated);
        } else {
          setDoc(
            doc(db, 'customers', custDocId),
            cleanForFirestore({
              id: custDocId,
              name: updatedProfile.name || 'Valued Customer',
              phone: mobile,
              mobile,
              savedAddresses: updatedProfile.savedAddresses,
              createdAt: updatedProfile.createdAt,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          ).catch(() => {});
        }
      })
      .catch(() => {});

    return { success: true, message: 'Mobile verified successfully! Customer Account active.' };
  };

  const loginUser = (mobileOrEmail: string, name?: string) => {
    const cleanMobile = normalizeMobile(mobileOrEmail) || mobileOrEmail;
    const updatedProfile: UserProfile = {
      mobileOrEmail: cleanMobile,
      name: name || 'Valued Customer',
      isLoggedIn: true,
      savedAddresses: userProfile.savedAddresses || [],
      savedForThisDevice: true,
      customerId: `CUST-${cleanMobile.slice(-6)}`,
      createdAt: userProfile.createdAt || new Date().toISOString(),
    };
    setUserProfile(updatedProfile);
    localStorage.setItem('redmode_user', JSON.stringify(updatedProfile));
  };

  const logoutUser = () => {
    const clearedProfile: UserProfile = {
      mobileOrEmail: '',
      isLoggedIn: false,
      savedAddresses: [],
      savedForThisDevice: true,
    };
    setUserProfile(clearedProfile);
    localStorage.removeItem('redmode_user');
    sessionStorage.removeItem('redmode_user_session');
  };

  const persistCustomerProfileToFirestore = (profile: UserProfile) => {
    if (!profile.isLoggedIn || !profile.mobileOrEmail) return;
    const cleanPhone = normalizeMobile(profile.mobileOrEmail) || profile.mobileOrEmail;
    const custDocId = profile.customerId || `CUST-${cleanPhone.slice(-6)}`;
    setDoc(
      doc(db, 'customers', custDocId),
      cleanForFirestore({
        id: custDocId,
        name: profile.name || 'Valued Customer',
        phone: cleanPhone,
        mobile: cleanPhone,
        mobileOrEmail: profile.mobileOrEmail,
        savedAddresses: profile.savedAddresses || [],
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    ).catch(() => {});
  };

  const updateUserProfile = (updates: { name?: string; email?: string; mobileOrEmail?: string }) => {
    setUserProfile((prev) => {
      const next: UserProfile = {
        ...prev,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.mobileOrEmail !== undefined ? { mobileOrEmail: updates.mobileOrEmail } : {}),
      };
      if ( updates.email !== undefined && next.savedAddresses.length > 0 ) {
        next.savedAddresses = next.savedAddresses.map((a, idx) =>
          idx === 0 ? { ...a, email: updates.email } : a
        );
      }
      persistCustomerProfileToFirestore(next);
      return next;
    });
  };

  const saveCustomerAddress = (address: CustomerAddress, index?: number) => {
    setUserProfile((prev) => {
      const list = [...(prev.savedAddresses || [])];
      if (typeof index === 'number' && index >= 0 && index < list.length) {
        list[index] = address;
      } else {
        list.unshift(address);
      }
      const next: UserProfile = {
        ...prev,
        name: prev.name === 'Valued Customer' && address.name ? address.name : prev.name,
        savedAddresses: list,
      };
      persistCustomerProfileToFirestore(next);
      return next;
    });
  };

  const deleteCustomerAddress = (index: number) => {
    setUserProfile((prev) => {
      const list = (prev.savedAddresses || []).filter((_, i) => i !== index);
      const next: UserProfile = {
        ...prev,
        savedAddresses: list,
      };
      persistCustomerProfileToFirestore(next);
      return next;
    });
  };

  const cancelCustomerOrder = (
    orderId: string,
    reason: string = 'Cancelled by customer'
  ): { success: boolean; message: string } => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      return { success: false, message: 'Order not found.' };
    }
    const nonCancellableStatuses = ['Shipped', 'SHIPPED', 'Out for Delivery', 'Delivered', 'DELIVERED', 'Cancelled', 'CANCELLED'];
    if (nonCancellableStatuses.includes(target.orderStatus)) {
      return {
        success: false,
        message: `Order ${orderId} cannot be cancelled because its status is "${target.orderStatus}".`,
      };
    }
    restoreOrderInventory(target);
    const nowIso = new Date().toISOString();
    const updatedOrder: Order = {
      ...target,
      orderStatus: 'Cancelled',
      activityLog: [
        {
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          title: 'Order Cancelled by Customer',
          description: reason,
          source: 'customer',
        },
        ...(target.activityLog || []),
      ],
      ...( { inventoryRestored: true } as any ),
    };
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    persistOrderUpdate(updatedOrder);
    return { success: true, message: `Order ${orderId} has been cancelled and stock has been restored.` };
  };

  const submitCustomerReturnRequest = (data: {
    orderId: string;
    productName: string;
    productImage?: string;
    size: string;
    quantity: number;
    reason: string;
    refundAmount: number;
  }): { success: boolean; message: string; returnRequest?: ReturnRequest } => {
    const targetOrder = orders.find((o) => o.id === data.orderId);
    if (!targetOrder) {
      return { success: false, message: 'Order not found.' };
    }
    const nowIso = new Date().toISOString();
    const newReturn: ReturnRequest = {
      id: `ret-${Date.now()}`,
      orderId: data.orderId,
      customerName: targetOrder.customer?.name || userProfile.name || 'Customer',
      customerPhone: targetOrder.customer?.mobile || targetOrder.customer?.phone || userProfile.mobileOrEmail,
      customerEmail: targetOrder.customer?.email || '',
      productName: data.productName,
      productImage: data.productImage,
      size: data.size,
      quantity: data.quantity,
      reason: data.reason,
      requestDate: nowIso,
      status: 'Requested',
      refundAmount: data.refundAmount,
      history: [
        {
          status: 'Requested',
          timestamp: nowIso,
          note: `Customer requested return/exchange: ${data.reason}`,
        },
      ],
    };

    setReturnsList((prev) => {
      const updated = [newReturn, ...prev];
      try {
        localStorage.setItem('redmode_returns_list', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDoc(doc(db, 'returns', newReturn.id), cleanForFirestore(newReturn), { merge: true }).catch(() => {});

    // Also mark order status as Return Requested
    const updatedOrder: Order = {
      ...targetOrder,
      orderStatus: 'Return Requested',
    };
    setOrders((prev) => prev.map((o) => (o.id === data.orderId ? updatedOrder : o)));
    persistOrderUpdate(updatedOrder);

    return {
      success: true,
      message: `Return/Exchange request (${newReturn.id}) submitted successfully.`,
      returnRequest: newReturn,
    };
  };

  const markReviewHelpful = (productId: string, reviewId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const updatedReviews = (p.reviews || []).map((r) =>
          r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r
        );
        const updatedProd = { ...p, reviews: updatedReviews };
        setDoc(doc(db, 'products', productId), cleanForFirestore({ reviews: updatedReviews }), { merge: true }).catch(() => {});
        return updatedProd;
      })
    );
  };

  // Admin Actions
  const addProduct = (productData: Omit<Product, 'id' | 'views' | 'salesCount' | 'createdAt'>) => {
    const nowIso = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: (productData as any).id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      published: (productData as any).published !== false,
      inStock: (productData as any).inStock !== false,
      views: 0,
      salesCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Immediately update React state, IndexedDB, and localStorage
    setProducts((prev) => {
      const next = [newProduct, ...prev.filter((p) => p.id !== newProduct.id)];
      idbSet('redmode_products_v2', next).catch(() => {});
      try {
        localStorage.setItem('redmode_products', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to write products to localStorage:', e);
      }
      return next;
    });

    // 2. Immediately sync the deduplicated, self-contained product record to Cloud Firestore
    // so it goes live across all devices in real time without waiting on local server calls
    ensureCompactProductForFirestore(newProduct)
      .then((compactProd) => {
        const firestorePayload = prepareProductForFirestore(compactProd);
        return setDoc(doc(db, 'products', newProduct.id), firestorePayload, {
          merge: true,
        });
      })
      .catch((err) => {
        console.error('Firestore product create sync error:', err);
      });
    setDoc(
      doc(db, 'settings', 'system_deletions'),
      {
        deletedProductIds: arrayRemove(newProduct.id),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});

    // 3. Also persist to optional backend API (/api/products) if running
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    }).catch(() => {});

    logAdminActivity({
      adminId: currentAdminUser.id,
      adminName: currentAdminUser.name,
      role: currentAdminUser.role,
      action: `Created new product listing '${newProduct.name}'`,
      type: 'product_create',
      target: newProduct.id,
    });
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    const targetProduct = products.find((p) => p.id === id);
    const nowIso = new Date().toISOString();
    const updatedProd = {
      ...(targetProduct || {}),
      ...updatedFields,
      id,
      published: updatedFields.published !== undefined ? updatedFields.published : (targetProduct?.published !== false),
      inStock: updatedFields.inStock !== undefined ? updatedFields.inStock : (targetProduct?.inStock !== false),
      updatedAt: nowIso,
    } as Product;

    // Permanently delete any removed photo from the local uploaded image library
    if (targetProduct) {
      const oldUrls = collectAllProductImageUrls(targetProduct);
      const newUrls = new Set(collectAllProductImageUrls(updatedProd));
      oldUrls.forEach((oldUrl) => {
        if (!newUrls.has(oldUrl)) {
          deleteSavedUploadedImage(oldUrl);
        }
      });
    }

    setProducts((prev) => {
      const exists = prev.some((p) => p.id === id);
      const next = exists ? prev.map((p) => (p.id === id ? updatedProd : p)) : [updatedProd, ...prev];
      idbSet('redmode_products_v2', next).catch(() => {});
      try {
        localStorage.setItem('redmode_products', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to write products to localStorage:', e);
      }
      return next;
    });

    // Immediately overwrite the full product document in Cloud Firestore across all devices so deleted photos never linger
    ensureCompactProductForFirestore(updatedProd)
      .then((compactProd) => {
        const firestorePayload = prepareProductForFirestore(compactProd);
        return setDoc(doc(db, 'products', id), firestorePayload);
      })
      .catch((err) => {
        console.error('Firestore product update sync error:', err);
      });

    // Also persist to optional backend API (/api/products) if running
    fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProd),
    }).catch(() => {});

    if (targetProduct) {
      logAdminActivity({
        adminId: currentAdminUser.id,
        adminName: currentAdminUser.name,
        role: currentAdminUser.role,
        action: `Updated product '${targetProduct.name}' details & pricing`,
        type: 'product_update',
        target: id,
      });
      addAuditLog(
        `Updated product '${targetProduct.name}' (Price: ₹${updatedProd.price ?? targetProduct.price})`,
        'Product',
        id,
        `Price: ₹${targetProduct.price}, Category: ${targetProduct.category}`,
        `Price: ₹${updatedProd.price ?? targetProduct.price}, Category: ${updatedProd.category ?? targetProduct.category}`
      );
    }
  };

  const deleteProduct = (id: string) => {
    // 0. Permanently purge all photos belonging to this product from the local image library
    const target = products.find((p) => p.id === id);
    if (target) {
      collectAllProductImageUrls(target).forEach((url) => {
        deleteSavedUploadedImage(url);
      });
    }

    // 1. Immediately remove from local reactive state & storage
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      idbSet('redmode_products_v2', next).catch(() => {});
      try {
        localStorage.setItem('redmode_products', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 2. Add to deleted IDs blacklist locally so reload never resurrects this item
    setDeletedIds((prev) => {
      const updated = Array.from(new Set([...prev.deletedProductIds, id]));
      try {
        localStorage.setItem('redmode_deleted_product_ids', JSON.stringify(updated));
      } catch {}
      return {
        ...prev,
        deletedProductIds: updated,
      };
    });

    // 3. Delete from backend API and Firestore & append to system_deletions blacklist in cloud
    fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    try {
      deleteDoc(doc(db, 'products', id)).catch((err) => {
        console.debug('Firestore product delete doc skipped/offline:', err);
      });
      setDoc(
        doc(db, 'settings', 'system_deletions'),
        {
          deletedProductIds: arrayUnion(id),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        console.debug('Firestore system_deletions update skipped/offline:', err);
      });
    } catch {}

    addAuditLog(`Deleted product ID: ${id}`, 'Product', id);
  };

  const togglePublishProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    const nextPublished = !target.published;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, published: nextPublished } : p)));
    try {
      setDoc(doc(db, 'products', id), { published: nextPublished }, { merge: true }).catch(() => {});
    } catch {}
  };

  const addCategory = async (nameOrCat: string | Partial<Category>, categoryData?: Partial<Category>): Promise<boolean> => {
    let newCat: Category;
    if (typeof nameOrCat === 'object') {
      const name = nameOrCat.name || 'New Category';
      const slug = (nameOrCat.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/[^a-z0-9-]/g, '');
      newCat = {
        id: nameOrCat.id || `cat-${Date.now()}`,
        name,
        slug,
        order: nameOrCat.order || categories.length + 1,
        imageUrl: nameOrCat.imageUrl || '',
        bannerUrl: nameOrCat.bannerUrl || '',
        tagline: nameOrCat.tagline || '',
        showOnHome: nameOrCat.showOnHome !== false,
        subcategories: Array.isArray(nameOrCat.subcategories) ? nameOrCat.subcategories : [],
        updatedAt: new Date().toISOString(),
        ...nameOrCat,
      };
    } else {
      const name = nameOrCat;
      const slug = (categoryData?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/[^a-z0-9-]/g, '');
      newCat = {
        id: categoryData?.id || `cat-${Date.now()}`,
        name,
        slug,
        order: categoryData?.order || categories.length + 1,
        imageUrl: categoryData?.imageUrl || '',
        bannerUrl: categoryData?.bannerUrl || '',
        tagline: categoryData?.tagline || '',
        showOnHome: categoryData?.showOnHome !== false,
        subcategories: Array.isArray(categoryData?.subcategories) ? categoryData.subcategories : [],
        updatedAt: new Date().toISOString(),
        ...categoryData,
      };
    }

    setCategories((prev) => {
      const next = [...prev, newCat];
      try {
        localStorage.setItem('redmode_categories', JSON.stringify(next));
      } catch (e) {}
      idbSet('redmode_categories_v2', next).catch(() => {});
      return next;
    });

    try {
      await setDoc(doc(db, 'categories', newCat.id), cleanForFirestore(newCat), { merge: true });
      setDoc(
        doc(db, 'settings', 'system_deletions'),
        {
          deletedCategoryIds: arrayRemove(newCat.id),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
      return true;
    } catch (e) {
      console.error('Failed to write new category to Firestore:', e);
      return false;
    }
  };

  const updateCategory = async (categoryOrId: Category | string, partialData?: Partial<Category>): Promise<boolean> => {
    const targetId = typeof categoryOrId === 'string' ? categoryOrId : categoryOrId.id;
    const existing = categories.find((c) => c.id === targetId);
    const nowIso = new Date().toISOString();

    const merged: Category =
      typeof categoryOrId === 'string'
        ? {
            ...(existing || { id: targetId, name: '', slug: targetId, order: 1, subcategories: [] }),
            ...partialData,
            updatedAt: partialData?.updatedAt || nowIso,
            subcategories:
              partialData?.subcategories !== undefined
                ? Array.isArray(partialData.subcategories)
                  ? partialData.subcategories
                  : []
                : Array.isArray(existing?.subcategories)
                ? existing.subcategories
                : [],
          }
        : {
            ...categoryOrId,
            updatedAt: categoryOrId.updatedAt || nowIso,
            subcategories: Array.isArray(categoryOrId.subcategories)
              ? categoryOrId.subcategories
              : Array.isArray(existing?.subcategories)
              ? existing.subcategories
              : [],
          };

    // Update state synchronously for the UI
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === targetId);
      const next = exists ? prev.map((c) => (c.id === targetId ? merged : c)) : [...prev, merged];
      try {
        localStorage.setItem('redmode_categories', JSON.stringify(next));
      } catch (e) {}
      idbSet('redmode_categories_v2', next).catch(() => {});
      return next;
    });

    // Write definitively to Cloud Firestore
    try {
      await setDoc(doc(db, 'categories', targetId), cleanForFirestore(merged), { merge: true });
      console.log(`[Firestore] Category ${targetId} successfully synced to cloud.`);
      return true;
    } catch (err) {
      console.error('Firestore category update error:', err);
      return false;
    }
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      deleteDoc(doc(db, 'categories', id)).catch(() => {});
      setDoc(
        doc(db, 'settings', 'system_deletions'),
        {
          deletedCategoryIds: arrayUnion(id),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {}
  };

  const reorderCategories = async (newOrderedCategories: Category[]): Promise<boolean> => {
    const updated = newOrderedCategories.map((cat, idx) => ({
      ...cat,
      order: idx + 1,
    }));
    setCategories(updated);
    try {
      localStorage.setItem('redmode_categories', JSON.stringify(updated));
    } catch (err) {
      console.warn('localStorage save warning on reorder:', err);
    }
    idbSet('redmode_categories_v2', updated).catch(() => {});

    try {
      await Promise.all(
        updated.map((cat) =>
          setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat), { merge: true })
        )
      );
      console.log('[Firestore] Reordered categories synced to cloud.');
      return true;
    } catch (err) {
      console.error('Firestore reorder categories sync error:', err);
      return false;
    }
  };

  const addSubcategory = (categoryId: string, subcategory: Omit<Subcategory, 'id'> | Subcategory) => {
    const newSub: Subcategory = {
      id: 'id' in subcategory && subcategory.id ? subcategory.id : `sub-${Date.now()}`,
      name: subcategory.name,
      slug: (subcategory.slug || subcategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/[^a-z0-9-]/g, ''),
      imageUrl: subcategory.imageUrl || '',
      bannerUrl: subcategory.bannerUrl || '',
      description: subcategory.description || '',
    };
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === categoryId) {
          const currentSubs = Array.isArray(c.subcategories) ? c.subcategories : [];
          return {
            ...c,
            subcategories: [...currentSubs, newSub],
          };
        }
        return c;
      });

      const updatedCat = next.find((c) => c.id === categoryId);
      if (updatedCat) {
        setDoc(doc(db, 'categories', categoryId), cleanForFirestore(updatedCat)).catch(() => {});
      }

      return next;
    });
  };

  const deleteSubcategory = (categoryId: string, subcategoryId: string) => {
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === categoryId) {
          const currentSubs = Array.isArray(c.subcategories) ? c.subcategories : [];
          return {
            ...c,
            subcategories: currentSubs.filter((s) => s.id !== subcategoryId),
          };
        }
        return c;
      });

      const updatedCat = next.find((c) => c.id === categoryId);
      if (updatedCat) {
        setDoc(doc(db, 'categories', categoryId), cleanForFirestore(updatedCat)).catch(() => {});
      }

      return next;
    });
  };

  const addSubSubcategory = (
    categoryId: string,
    subcategoryId: string,
    subSub: Omit<Subcategory, 'id'> | Subcategory | string
  ) => {
    const newChild: Subcategory =
      typeof subSub === 'string'
        ? {
            id: `child-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: subSub.trim(),
            slug:
              subSub
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `child-${Date.now()}`,
            imageUrl: '',
            bannerUrl: '',
            description: '',
          }
        : {
            id:
              'id' in subSub && subSub.id
                ? subSub.id
                : `child-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: subSub.name,
            slug:
              (subSub.slug || subSub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '') ||
              `child-${Date.now()}`,
            imageUrl: subSub.imageUrl || '',
            bannerUrl: subSub.bannerUrl || '',
            description: subSub.description || '',
          };

    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === categoryId) {
          const currentSubs = Array.isArray(c.subcategories) ? c.subcategories : [];
          return {
            ...c,
            subcategories: currentSubs.map((s) => {
              if (s.id === subcategoryId || s.slug === subcategoryId) {
                const currentChildren = Array.isArray(s.subcategories) ? s.subcategories : [];
                return {
                  ...s,
                  subcategories: [...currentChildren, newChild],
                };
              }
              return s;
            }),
          };
        }
        return c;
      });

      const updatedCat = next.find((c) => c.id === categoryId);
      if (updatedCat) {
        setDoc(doc(db, 'categories', categoryId), cleanForFirestore(updatedCat)).catch(() => {});
      }

      return next;
    });
  };

  const deleteSubSubcategory = (categoryId: string, subcategoryId: string, subSubId: string) => {
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === categoryId) {
          const currentSubs = Array.isArray(c.subcategories) ? c.subcategories : [];
          return {
            ...c,
            subcategories: currentSubs.map((s) => {
              if (s.id === subcategoryId || s.slug === subcategoryId) {
                const currentChildren = Array.isArray(s.subcategories) ? s.subcategories : [];
                return {
                  ...s,
                  subcategories: currentChildren.filter(
                    (child) => child.id !== subSubId && child.slug !== subSubId && child.name !== subSubId
                  ),
                };
              }
              return s;
            }),
          };
        }
        return c;
      });

      const updatedCat = next.find((c) => c.id === categoryId);
      if (updatedCat) {
        setDoc(doc(db, 'categories', categoryId), cleanForFirestore(updatedCat)).catch(() => {});
      }

      return next;
    });
  };

  const addBanner = (bannerData: Omit<HeroBanner, 'id'>) => {
    const newBanner: HeroBanner = {
      ...bannerData,
      id: `banner-${Date.now()}`,
    };
    setBanners((prev) => [...prev, newBanner]);
    try {
      setDoc(doc(db, 'banners', newBanner.id), cleanForFirestore(newBanner), { merge: true }).catch(() => {});
      setDoc(
        doc(db, 'settings', 'system_deletions'),
        { deletedBannerIds: arrayRemove(newBanner.id) },
        { merge: true }
      ).catch(() => {});
    } catch {}
  };

  const updateBanner = (banner: HeroBanner) => {
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? banner : b)));
    try {
      setDoc(doc(db, 'banners', banner.id), cleanForFirestore(banner), { merge: true }).catch(() => {});
    } catch {}
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    try {
      deleteDoc(doc(db, 'banners', id)).catch(() => {});
      setDoc(
        doc(db, 'settings', 'system_deletions'),
        {
          deletedBannerIds: arrayUnion(id),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {}
  };

  const addBlog = (blogData: Omit<Blog, 'id' | 'createdAt'>) => {
    const newBlog: Blog = {
      ...blogData,
      id: `blog-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBlogs((prev) => [newBlog, ...prev]);
  };

  const updateBlog = (blog: Blog) => {
    setBlogs((prev) => prev.map((b) => (b.id === blog.id ? blog : b)));
  };

  const deleteBlog = (id: string) => {
    setBlogs((prev) => prev.filter((b) => b.id !== id));
  };

  // Coupon Actions
  const addCoupon = (couponData: Omit<Coupon, 'id' | 'usedCount'>) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `c_${Date.now()}`,
      code: couponData.code.toUpperCase().trim(),
      usedCount: 0,
    };
    setCoupons((prev) => [newCoupon, ...prev]);
  };

  const updateCoupon = (id: string, updated: Partial<Coupon>) => {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...updated, code: updated.code ? updated.code.toUpperCase().trim() : c.code }
          : c
      )
    );
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleCouponActive = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const addAuditLog = (
    action: string,
    entity: AuditLogEntry['entity'],
    entityId: string,
    oldValue?: string,
    newValue?: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      who: currentAdminUser.name,
      role: currentAdminUser.role,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => {
      const updated = [newEntry, ...prev.slice(0, 199)];
      try {
        localStorage.setItem('redmode_audit_logs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Cloud Firestore Sync: Record immutable security audit log
    recordFirestoreAuditLog(action, entity, entityId, {
      adminId: currentAdminUser.id,
      adminName: currentAdminUser.name,
      role: currentAdminUser.role,
      oldValue,
      newValue,
    }).catch((err) => {
      console.debug('Firestore AuditLog recording skipped/offline:', err);
    });
  };

  const persistOrderUpdate = (updatedOrder: Order) => {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedOrder),
    }).catch(() => {});
    try {
      const orderDocId = updatedOrder.id.replace(/[^a-zA-Z0-9_-]/g, '') || `ord_${Date.now()}`;
      setDoc(doc(db, 'orders', orderDocId), cleanForFirestore(updatedOrder), { merge: true }).catch(() => {});
    } catch {}
  };

  const updateOrderStatus = (orderId: string, status: Order['orderStatus']) => {
    let oldStatus = '';
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          oldStatus = o.orderStatus;
          const isCancelling =
            (status === 'Cancelled' || (status as any) === 'CANCELLED') &&
            o.orderStatus !== 'Cancelled' &&
            (o.orderStatus as any) !== 'CANCELLED';
          if (isCancelling) {
            restoreOrderInventory(o);
          }
          const updated = {
            ...o,
            orderStatus: status,
            ...(isCancelling ? { inventoryRestored: true } : {}),
          };
          persistOrderUpdate(updated);
          return updated;
        }
        return o;
      })
    );
    addAuditLog(`Order status updated to ${status}`, 'Order', orderId, oldStatus, status);
    logAdminActivity({
      adminId: currentAdminUser.id,
      adminName: currentAdminUser.name,
      role: currentAdminUser.role,
      action: `Updated status of Order #${orderId} to '${status}'`,
      type: 'order_status',
      target: orderId,
    });
  };

  const updateOrderPaymentStatus = (orderId: string, paymentStatus: Order['paymentStatus']) => {
    let oldPaymentStatus = '';
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          oldPaymentStatus = o.paymentStatus;
          const updated = { ...o, paymentStatus };
          persistOrderUpdate(updated);
          return updated;
        }
        return o;
      })
    );
    addAuditLog(`Order payment status updated to ${paymentStatus}`, 'Order', orderId, oldPaymentStatus, paymentStatus);
  };

  const updateCodVerificationStatus = (
    orderId: string,
    status: 'UNVERIFIED' | 'CONFIRMED' | 'REJECTED',
    verifiedBy: string = 'Admin WhatsApp Desk'
  ) => {
    let oldStatus = 'UNVERIFIED';
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        oldStatus = o.codVerificationStatus || 'UNVERIFIED';
        const isRejecting =
          status === 'REJECTED' &&
          o.orderStatus !== 'Cancelled' &&
          (o.orderStatus as any) !== 'CANCELLED';
        if (isRejecting) {
          restoreOrderInventory(o);
        }
        const updated: Order = {
          ...o,
          codVerificationStatus: status,
          codVerifiedAt: new Date().toISOString(),
          codVerifiedBy: verifiedBy,
          orderStatus: status === 'CONFIRMED' ? 'Confirmed' : status === 'REJECTED' ? 'CANCELLED' : o.orderStatus,
          ...(isRejecting ? ({ inventoryRestored: true } as any) : {}),
        };
        persistOrderUpdate(updated);
        return updated;
      })
    );
    addAuditLog(`COD Verification set to ${status} by ${verifiedBy}`, 'Order', orderId, oldStatus, status);
  };

  const confirmCustomerOrder = (
    orderId: string,
    method: 'WhatsApp Reply' | 'Phone Call' | 'Admin Desk' = 'WhatsApp Reply'
  ) => {
    const nowIso = new Date().toISOString();
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const wasExpired = target.isExpired || target.orderStatus === 'Expired' || target.orderStatus === 'Cancelled' || (target.orderStatus as any) === 'CANCELLED';
      const updatedOrder: Order = {
        ...target,
        customerConfirmed: true,
        customerConfirmedAt: nowIso,
        codVerificationStatus: 'CONFIRMED',
        orderStatus: 'Confirmed',
        whatsappStatus: 'Confirmed',
        whatsappReply: method === 'Phone Call' ? 'VERIFIED_ON_CALL' : 'YES',
        whatsappReplyAt: nowIso,
        codVerifiedBy: method,
        isExpired: false,
        expiredAt: undefined,
        confirmationAckSent: true,
        confirmationAckSentAt: nowIso,
        // Bring reactivated late order right into today's active series & timestamp
        createdAt: wasExpired ? nowIso : target.createdAt,
        reactivatedAt: wasExpired ? nowIso : target.reactivatedAt,
      };

      // Move confirmed/reactivated order to the top with today's active queue
      const remaining = prev.filter((o) => o.id !== orderId);
      return [updatedOrder, ...remaining];
    });
    addAuditLog(
      method === 'Phone Call'
        ? `Order confirmed via Phone Call by admin. Moved from Cancelled to Confirmed queue.`
        : `Customer order confirmed via ${method} & auto-confirmation msg dispatched`,
      'Order',
      orderId,
      'Pending',
      'Confirmed'
    );
  };

  // Helper to generate official format AWB for active logistics carrier
  const generateAwbForChannel = (channel?: ShippingChannelConfig): string => {
    if (!channel) {
      return `606696${Math.floor(10000000 + Math.random() * 90000000)}`;
    }
    switch (channel.provider) {
      case 'amazon':
        return `ATS${Math.floor(1000000000 + Math.random() * 9000000000)}IN`;
      case 'shiprocket':
        return `SR${Math.floor(100000000 + Math.random() * 900000000)}`;
      case 'bluedart':
        return `BD${Math.floor(100000000 + Math.random() * 900000000)}`;
      case 'dtdc':
        return `DT${Math.floor(100000000 + Math.random() * 900000000)}`;
      case 'xpressbees':
        return `XB${Math.floor(100000000 + Math.random() * 900000000)}`;
      case 'shadowfax':
        return `SF${Math.floor(100000000 + Math.random() * 900000000)}`;
      case 'custom': {
        const clean = channel.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CUS';
        return `${clean}${Math.floor(100000000 + Math.random() * 900000000)}`;
      }
      case 'delhivery':
      default:
        return `606696${Math.floor(10000000 + Math.random() * 90000000)}`;
    }
  };

  const bulkAcceptOrdersToRTD = (orderIds: string[]): { successCount: number } => {
    if (!orderIds || !orderIds.length) return { successCount: 0 };
    const nowIso = new Date().toISOString();
    let count = 0;

    const activeChannel = settings.shippingChannels?.find((c) => c.id === settings.activeShippingChannelId) || settings.shippingChannels?.[0];
    const courierTitle = activeChannel?.name || 'Delhivery Surface Logistics';

    setOrders((prev) =>
      prev.map((order) => {
        if (!orderIds.includes(order.id)) return order;
        count++;
        const awbNumber = order.awb_number || generateAwbForChannel(activeChannel);
        const trackingUrl = activeChannel?.trackingUrlTemplate
          ? activeChannel.trackingUrlTemplate.replace('{{awb}}', awbNumber)
          : `https://www.delhivery.com/track/package/${awbNumber}`;

        const originHub = (activeChannel?.warehouseName || settings.delhiverySettings?.warehouseName)
          ? `${activeChannel?.warehouseName || settings.delhiverySettings?.warehouseName}, Meerut (${activeChannel?.pickupPincode || settings.delhiverySettings?.pickupPincode || '250002'})`
          : 'REDMODE B2C, Meerut (250002)';

        return {
          ...order,
          orderStatus: 'RTD',
          acceptedAt: nowIso,
          rtdAt: nowIso,
          awb_number: awbNumber,
          selected_courier_name: courierTitle,
          shipment_status: 'RTD',
          shipmozo: order.shipmozo || {
            courier: courierTitle,
            awb: awbNumber,
            trackingUrl,
            status: 'RTD',
            labelGenerated: true,
            shippedAt: nowIso,
            history: [
              {
                status: 'RTD (Ready to Dispatch)',
                location: originHub,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                note: `Order booked via active channel ${courierTitle}. AWB #${awbNumber} generated. Ready for pickup scan.`,
              },
            ],
          },
        };
      })
    );

    addAuditLog(`Bulk accepted ${count} orders to RTD via active courier ${courierTitle}`, 'Order', orderIds.join(', '));
    orderIds.forEach((oid) => {
      logAdminActivity({
        adminId: currentAdminUser.id,
        adminName: currentAdminUser.name,
        role: currentAdminUser.role,
        action: `Generated AWB for Order #${oid}`,
        type: 'awb_generation',
        target: oid,
      });
    });
    return { successCount: count };
  };

  const bulkCancelOrders = (orderIds: string[], reason = 'Customer did not confirm / Expired'): { successCount: number } => {
    if (!orderIds || !orderIds.length) return { successCount: 0 };
    const nowIso = new Date().toISOString();
    let count = 0;

    setOrders((prev) =>
      prev.map((order) => {
        if (!orderIds.includes(order.id)) return order;
        count++;
        if (order.orderStatus !== 'Cancelled' && (order.orderStatus as any) !== 'CANCELLED') {
          restoreOrderInventory(order);
        }
        const updated = {
          ...order,
          orderStatus: 'Cancelled' as OrderStatus,
          isExpired: true,
          expiredAt: nowIso,
          inventoryRestored: true,
        };
        persistOrderUpdate(updated);
        return updated;
      })
    );

    addAuditLog(`Bulk cancelled ${count} orders: ${reason}`, 'Order', orderIds.join(', '));
    return { successCount: count };
  };

  const send23hReminder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          reminder23hSent: true,
          reminder23hSentAt: new Date().toISOString(),
        };
      })
    );
    addAuditLog(`23-Hour Gentle Reminder sent to customer via WhatsApp`, 'Order', orderId);
  };

  const triggerNightConfirmationNow = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          confirmationSentAt: new Date().toISOString(),
          scheduledConfirmationTime: undefined,
        };
      })
    );
    addAuditLog(`Scheduled 10:00 AM Confirmation WhatsApp triggered for order`, 'Order', orderId);
  };

  const markLabelDownloaded = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          labelDownloaded: true,
          labelDownloadedAt: new Date().toISOString(),
          trackingSentToCustomer: true,
          trackingSentAt: new Date().toISOString(),
          orderStatus: 'Ready to Ship',
        };
      })
    );
    addAuditLog(`Shipping label downloaded & order moved to RTD (Ready to Dispatch)`, 'Order', orderId);
  };

  const sendCustomerTrackingUpdate = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          trackingSentToCustomer: true,
          trackingSentAt: new Date().toISOString(),
        };
      })
    );
    addAuditLog(`Tracking details sent to customer`, 'Order', orderId);
  };

  const sendDeliveredReviewRequest = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          reviewRequestSent: true,
          reviewRequestSentAt: new Date().toISOString(),
        };
      })
    );
    addAuditLog(`Delivered & review request message sent to customer`, 'Order', orderId);
  };

  const updateOrderInternalNotes = (orderId: string, notes: string) => {
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          internalNotes: notes,
          internalNotesUpdatedAt: nowIso,
          internalNotesUpdatedBy: currentAdminUser.name,
        };
      })
    );
    addAuditLog(`Updated internal note for order ${orderId}`, 'Order', orderId);
  };

  const updateProductStock = (productId: string, sizeOrKey: string, newCount: number) => {
    let updatedTotal = 0;
    let updatedStockBySize: Record<string, number> = {};
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentStockBySize = { ...(p.stockBySize || {}) };
        currentStockBySize[sizeOrKey] = Math.max(0, newCount);
        const total = Object.values(currentStockBySize).reduce<number>((sum, v) => sum + (Number(v) || 0), 0);
        updatedTotal = total;
        updatedStockBySize = currentStockBySize;
        return {
          ...p,
          stockBySize: currentStockBySize,
          stock: total,
        };
      })
    );
    try {
      setDoc(
        doc(db, 'products', productId),
        {
          stockBySize: updatedStockBySize,
          stock: updatedTotal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {}
  };

  const adjustProductStockWithReason = (
    productId: string,
    sizeOrKey: string,
    adjustment: number,
    reason: string
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const currentStockBySize = { ...(product.stockBySize || {}) };
    const prevStock = typeof currentStockBySize[sizeOrKey] === 'number' ? currentStockBySize[sizeOrKey] : 0;
    const nextStock = Math.max(0, prevStock + adjustment);
    currentStockBySize[sizeOrKey] = nextStock;
    const total = Object.values(currentStockBySize).reduce<number>((sum, v) => sum + (Number(v) || 0), 0);

    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === productId ? { ...p, stockBySize: currentStockBySize, stock: total } : p));
      idbSet('redmode_products_v2', updated).catch(() => {});
      try {
        localStorage.setItem('redmode_products', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      setDoc(
        doc(db, 'products', productId),
        {
          stockBySize: currentStockBySize,
          stock: total,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {}

    const logItem: InventoryLogEntry = {
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      productName: product.name,
      sku: `${product.slug ? product.slug.toUpperCase().slice(0, 8) : 'RM'}-${sizeOrKey}`,
      size: sizeOrKey,
      color: product.color || 'Standard',
      previousStock: prevStock,
      adjustment,
      newStock: nextStock,
      reason: reason || 'Manual stock adjustment',
      adminUser: `${currentAdminUser.name} (${currentAdminUser.role})`,
      timestamp: new Date().toISOString(),
    };

    setInventoryLogs((prev) => {
      const updated = [logItem, ...prev.slice(0, 199)];
      try {
        localStorage.setItem('redmode_inventory_logs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    addAuditLog(
      `Adjusted stock for ${product.name} (${sizeOrKey}) by ${adjustment > 0 ? `+${adjustment}` : adjustment}. Reason: ${reason}`,
      'Inventory',
      `${product.name} (${sizeOrKey})`,
      `${prevStock}`,
      `${nextStock}`
    );

    logAdminActivity({
      adminId: currentAdminUser.id,
      adminName: currentAdminUser.name,
      role: currentAdminUser.role,
      action: `Updated inventory for '${product.name}' (${sizeOrKey}: ${adjustment > 0 ? `+${adjustment}` : adjustment} units)`,
      type: 'inventory_update',
      target: product.id,
    });
  };

  const updateReturnStatus = (
    returnId: string,
    status: ReturnStatus,
    resolutionNotes?: string
  ) => {
    setReturnsList((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== returnId) return r;
        const history = [
          ...(r.history || []),
          {
            status,
            timestamp: new Date().toISOString(),
            note: resolutionNotes || `Status updated to ${status} by ${currentAdminUser.name}`,
          },
        ];
        return {
          ...r,
          status,
          resolutionNotes: resolutionNotes || r.resolutionNotes,
          history,
        };
      });
      try {
        localStorage.setItem('redmode_returns_list', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    addAuditLog(
      `Return ${returnId} status updated to ${status}`,
      'Return',
      returnId,
      undefined,
      status
    );
  };

  const switchAdminUser = (user: AdminUser) => {
    setCurrentAdminUser(user);
    try {
      localStorage.setItem('redmode_current_admin_user', JSON.stringify(user));
    } catch (e) {}
  };

  const addAdminUser = (data: {
    name: string;
    email: string;
    mobile?: string;
    password?: string;
    role: 'Label Admin' | 'Listing + Label Admin';
  }): { success: boolean; message: string; user?: AdminUser } => {
    if (currentAdminUser.role !== 'Super Admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can create staff accounts.' };
    }

    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanRole = data.role;

    if (!cleanName) {
      return { success: false, message: 'Please enter staff member name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid staff email address.' };
    }
    if (cleanRole !== 'Label Admin' && cleanRole !== 'Listing + Label Admin') {
      return { success: false, message: 'Invalid role. Only Label Admin and Listing + Label Admin are allowed.' };
    }

    const emailExists = adminUsers.some(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (emailExists) {
      return { success: false, message: `An admin account with email ${cleanEmail} already exists.` };
    }

    const newStaff: AdminUser = {
      id: `admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      mobile: data.mobile?.trim() || '',
      password: data.password?.trim() || 'Staff@2026',
      role: cleanRole,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [...adminUsers, newStaff];
    setAdminUsers(updated);
    try {
      localStorage.setItem('redmode_admin_users', JSON.stringify(updated));
    } catch (e) {}

    addAuditLog(
      `Created staff admin account for ${newStaff.name} with role ${newStaff.role}`,
      'Settings',
      newStaff.id,
      undefined,
      newStaff.role
    );

    return {
      success: true,
      message: `Staff account created successfully for ${newStaff.name} (${newStaff.role}).`,
      user: newStaff,
    };
  };

  const updateAdminUser = (
    id: string,
    updates: Partial<{
      name: string;
      email: string;
      mobile: string;
      role: 'Label Admin' | 'Listing + Label Admin';
      password?: string;
    }>
  ): { success: boolean; message: string } => {
    if (currentAdminUser.role !== 'Super Admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can edit staff accounts.' };
    }

    const userIndex = adminUsers.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return { success: false, message: 'Admin account not found.' };
    }

    const targetUser = adminUsers[userIndex];
    if (targetUser.role === 'Super Admin') {
      return { success: false, message: 'Super Admin account details are managed in Profile & Security settings.' };
    }

    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const duplicate = adminUsers.some(
        (u) => u.id !== id && u.email.toLowerCase() === cleanEmail
      );
      if (duplicate) {
        return { success: false, message: `An account with email ${cleanEmail} already exists.` };
      }
    }

    if (updates.role && updates.role !== 'Label Admin' && updates.role !== 'Listing + Label Admin') {
      return { success: false, message: 'Invalid role selection.' };
    }

    const updatedUser: AdminUser = {
      ...targetUser,
      ...updates,
      name: updates.name ? updates.name.trim() : targetUser.name,
      email: updates.email ? updates.email.trim().toLowerCase() : targetUser.email,
      mobile: updates.mobile !== undefined ? updates.mobile.trim() : targetUser.mobile,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [...adminUsers];
    updatedList[userIndex] = updatedUser;
    setAdminUsers(updatedList);
    try {
      localStorage.setItem('redmode_admin_users', JSON.stringify(updatedList));
    } catch (e) {}

    if (currentAdminUser.id === id) {
      setCurrentAdminUser(updatedUser);
      try {
        localStorage.setItem('redmode_current_admin_user', JSON.stringify(updatedUser));
      } catch (e) {}
    }

    addAuditLog(
      `Updated staff account: ${updatedUser.name} (${updatedUser.role})`,
      'Settings',
      updatedUser.id
    );

    return { success: true, message: `Staff account for ${updatedUser.name} updated successfully.` };
  };

  const toggleAdminUserStatus = (id: string): { success: boolean; message: string } => {
    if (currentAdminUser.role !== 'Super Admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can toggle staff account status.' };
    }

    const targetUser = adminUsers.find((u) => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'Admin account not found.' };
    }

    if (targetUser.role === 'Super Admin') {
      return { success: false, message: 'Super Admin account cannot be deactivated.' };
    }

    const newStatus: 'active' | 'disabled' = targetUser.status === 'active' ? 'disabled' : 'active';
    const updatedList = adminUsers.map((u) =>
      u.id === id ? { ...u, status: newStatus, updatedAt: new Date().toISOString() } : u
    );

    setAdminUsers(updatedList);
    try {
      localStorage.setItem('redmode_admin_users', JSON.stringify(updatedList));
    } catch (e) {}

    if (currentAdminUser.id === id) {
      const updatedCurrent = { ...currentAdminUser, status: newStatus };
      setCurrentAdminUser(updatedCurrent);
      try {
        localStorage.setItem('redmode_current_admin_user', JSON.stringify(updatedCurrent));
      } catch (e) {}
    }

    addAuditLog(
      `${newStatus === 'disabled' ? 'Deactivated' : 'Reactivated'} staff account for ${targetUser.name}`,
      'Settings',
      targetUser.id,
      targetUser.status,
      newStatus
    );

    return {
      success: true,
      message: `Account for ${targetUser.name} is now ${newStatus === 'disabled' ? 'Disabled' : 'Active'}.`,
    };
  };

  const deleteAdminUser = (id: string): { success: boolean; message: string } => {
    if (currentAdminUser.role !== 'Super Admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can remove staff accounts.' };
    }

    const targetUser = adminUsers.find((u) => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'Admin account not found.' };
    }

    if (targetUser.role === 'Super Admin') {
      return { success: false, message: 'Super Admin account cannot be deleted.' };
    }

    const updatedList = adminUsers.filter((u) => u.id !== id);
    setAdminUsers(updatedList);
    try {
      localStorage.setItem('redmode_admin_users', JSON.stringify(updatedList));
    } catch (e) {}

    if (currentAdminUser.id === id) {
      const superAdmin = updatedList.find((u) => u.role === 'Super Admin') || INITIAL_ADMIN_USERS[0];
      setCurrentAdminUser(superAdmin);
      try {
        localStorage.setItem('redmode_current_admin_user', JSON.stringify(superAdmin));
      } catch (e) {}
    }

    addAuditLog(
      `Removed staff admin account: ${targetUser.name} (${targetUser.email})`,
      'Settings',
      targetUser.id
    );

    return { success: true, message: `Staff account for ${targetUser.name} has been removed.` };
  };

  const updateCustomerNote = (phoneOrId: string, note: string) => {
    setCustomerNotes((prev) => {
      const updated = { ...prev, [phoneOrId]: note };
      try {
        localStorage.setItem('redmode_customer_notes', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    addAuditLog(`Updated internal note for customer ${phoneOrId}`, 'Customer', phoneOrId);
  };

  // COD & Genuine RTO Rule Engine
  const getCustomerCodEligibility = (phone: string): { codAvailable: boolean; message: string } => {
    const cleanPhone = normalizeMobile(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { codAvailable: true, message: '' };
    }

    // 1. Admin manual override takes precedence
    if (codOverrides[cleanPhone] !== undefined) {
      const allowed = codOverrides[cleanPhone];
      return {
        codAvailable: allowed,
        message: allowed ? '' : 'COD Not Available',
      };
    }

    // 2. Evaluate chronological customer order history
    const customerOrders = orders
      .filter((o) => {
        const p = normalizeMobile(o.customer?.mobile || o.customer?.phone || '');
        return p === cleanPhone;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (customerOrders.length === 0) {
      return { codAvailable: true, message: '' };
    }

    let codRestricted = false;

    for (const order of customerOrders) {
      const isCOD = (order.paymentMode || order.paymentMethod || '').toUpperCase() === 'COD';
      const isGenuineRTO =
        Boolean(order.rtoInfo?.isRto) ||
        (order.orderStatus === 'Cancelled' && Boolean(order.rtoInfo?.reason)) ||
        (order.shipment_status || '').toUpperCase().includes('RTO');

      // Rule: If a COD order becomes genuine RTO after dispatch/delivery attempts
      // Normal pre-dispatch cancellations have no rtoInfo.isRto and do NOT trigger this.
      if (isCOD && isGenuineRTO) {
        codRestricted = true;
      }

      // Re-enable COD rule: When subsequent PREPAID order is successfully Delivered/Completed
      const isPrepaid = (order.paymentMode || order.paymentMethod || '').toUpperCase() === 'PREPAID';
      const rawStatus = (order.orderStatus || '').toLowerCase();
      const isDelivered =
        rawStatus === 'delivered' ||
        rawStatus === 'completed' ||
        (order.shipment_status || '').toLowerCase().includes('delivered');

      if (codRestricted && isPrepaid && isDelivered) {
        codRestricted = false;
      }
    }

    return {
      codAvailable: !codRestricted,
      message: codRestricted ? 'COD Not Available' : '',
    };
  };

  const getCustomerPreviousRtoReason = (phone: string): string | null => {
    const cleanPhone = normalizeMobile(phone);
    if (!cleanPhone || cleanPhone.length < 10) return null;

    // Look for previous genuine RTO orders for this customer (newest first)
    const rtoOrders = orders
      .filter((o) => {
        const p = normalizeMobile(o.customer?.mobile || o.customer?.phone || '');
        if (p !== cleanPhone) return false;
        return Boolean(o.rtoInfo?.isRto && o.rtoInfo?.reason);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (rtoOrders.length > 0 && rtoOrders[0].rtoInfo?.reason) {
      return rtoOrders[0].rtoInfo.reason;
    }

    return null;
  };

  const markOrderAsRto = (orderId: string, reason: string, courierRemarks?: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          orderStatus: 'Cancelled',
          rtoInfo: {
            isRto: true,
            reason,
            markedAt: new Date().toISOString(),
            courierRemarks: courierRemarks || 'Courier Delivery Failed - Returned to Origin',
          },
        };
      })
    );
    addAuditLog(`Order marked as Genuine RTO. Reason: ${reason}`, 'Order', orderId, undefined, reason);
  };

  const setCustomerCodOverride = (phone: string, allowed: boolean) => {
    const clean = normalizeMobile(phone);
    if (!clean) return;
    setCodOverrides((prev) => ({
      ...prev,
      [clean]: allowed,
    }));
    addAuditLog(`Admin updated COD override for customer ${clean} to ${allowed ? 'ALLOWED' : 'RESTRICTED'}`, 'Customer', clean);
  };

  const exportOrdersToCSV = (
    selectedOrdersList?: Order[],
    dateOptions?: {
      preset?: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom';
      startDate?: string;
      endDate?: string;
    }
  ): { count: number; filename: string } => {
    let target = selectedOrdersList && selectedOrdersList.length > 0 ? selectedOrdersList : orders;

    let dateSlug = '';
    if (dateOptions && dateOptions.preset && dateOptions.preset !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      target = target.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        if (isNaN(t)) return false;

        switch (dateOptions.preset) {
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
            if (dateOptions.startDate) {
              const startT = new Date(dateOptions.startDate).setHours(0, 0, 0, 0);
              if (t < startT) return false;
            }
            if (dateOptions.endDate) {
              const endT = new Date(dateOptions.endDate).setHours(23, 59, 59, 999);
              if (t > endT) return false;
            }
            return true;
          }
          default:
            return true;
        }
      });

      if (dateOptions.preset === 'custom' && dateOptions.startDate && dateOptions.endDate) {
        dateSlug = `_${dateOptions.startDate}_to_${dateOptions.endDate}`;
      } else {
        dateSlug = `_${dateOptions.preset}`;
      }
    }

    const headers = [
      'Order ID',
      'Order Date & Time',
      'Order Status',
      'Customer Name',
      'Mobile / Phone',
      'Email',
      'House / Flat / Building',
      'Street / Locality',
      'Landmark',
      'Full Shipping Address',
      'City',
      'State',
      'Pincode',
      'Country',
      'Ordered Items Summary',
      'Detailed Items Breakdown (Name | SKU | Size | Qty | Price)',
      'Total Line Items Count',
      'Total Item Quantity (Units)',
      'Subtotal (INR)',
      'Discount (INR)',
      'GST Tax (INR)',
      'Shipping / Delivery Charge (INR)',
      'Total Order Amount (INR)',
      'Payment Mode',
      'Payment Status',
      'Payment / Razorpay Transaction ID',
      'COD Verification Status',
      'Customer WhatsApp Confirmation',
      'Assigned Courier Partner',
      'AWB Tracking Number',
      'Shipment Tracking Status',
      'Package Weight (kg)',
      'Package Dimensions L x W x H (cm)',
      'Estimated Shipping Cost (INR)',
      'Ready To Dispatch (RTD) Date',
      'Shipping Label Downloaded',
      'NDR Exception Information',
      'RTO Information',
      'Internal Admin Notes',
      'Order Timestamp (ISO)',
    ];

    const escapeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = target.map((o) => {
      const customerName = (o.customer.name || `${o.customer.firstName || ''} ${o.customer.lastName || ''}`).trim() || 'Valued Customer';
      const customerMobile = o.customer.mobile || o.customer.phone || '';
      const customerEmail = o.customer.email || '';
      const house = o.customer.house || '';
      const street = o.customer.street || '';
      const landmark = o.customer.landmark || '';
      const fullAddress = [house, street, landmark].filter(Boolean).join(', ') || '';
      const city = o.customer.city || '';
      const state = o.customer.state || '';
      const pincode = o.customer.pincode || '';
      const country = o.customer.country || 'India';

      const itemsSummary = o.items.map((i) => `${i.name} (Qty: ${i.quantity || 1})`).join('; ');
      const detailedItems = o.items
        .map((i) => `${i.name} [SKU: ${i.sku || 'N/A'}] [Size: ${i.size || 'Free'}] [Qty: ${i.quantity || 1}] [Price: ₹${i.price || 0}]`)
        .join(' | ');

      const totalLineItems = o.items.length;
      const totalUnits = o.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
      const subtotal = o.subtotal ?? (o.total - (o.deliveryCharge || 0) + (o.discount || 0));
      const discount = o.discount || 0;
      const gst = o.gst || 0;
      const deliveryCharge = o.deliveryCharge || 0;
      const total = o.total;

      const paymentMode = o.paymentMode || 'COD';
      const paymentStatus = o.paymentStatus || (paymentMode === 'Prepaid' ? 'Paid' : 'COD');
      const paymentId = o.razorpayPaymentId || o.razorpayOrderId || '';

      const codVerification = o.codVerificationStatus || (paymentMode === 'COD' ? 'UNVERIFIED' : 'N/A');
      const waConfirmation = o.customerConfirmed ? 'Confirmed' : (o.whatsappStatus || 'Pending');

      const awb = o.awb_number || o.shipmozo?.awb || '';
      const courier = o.selected_courier_name || o.shipmozo?.courier || (awb ? 'Delhivery Surface' : 'Unassigned');
      const shipmentStatus = o.shipment_status || o.shipmozo?.status || (awb ? 'Manifested' : 'Pending');

      const weightKg = o.final_package_weight || o.final_package_weight_kg || 0.5;
      const dimensions = `${o.final_package_length || o.final_package_length_cm || 25}x${o.final_package_width || o.final_package_width_cm || 20}x${o.final_package_height || o.final_package_height_cm || 5}`;
      const estimatedCost = o.estimated_shipping_cost || 0;

      const rtdDate = o.rtdAt ? new Date(o.rtdAt).toLocaleString('en-IN') : (o.acceptedAt ? new Date(o.acceptedAt).toLocaleString('en-IN') : '');
      const labelDownloaded = o.labelDownloaded ? 'Yes' : 'No';

      const ndr = o.ndrInfo?.hasNdr ? (o.ndrInfo.reason || 'NDR Exception') : 'None';
      const rto = o.rtoInfo?.isRto ? `RTO: ${o.rtoInfo.reason || 'Returned to Origin'}` : 'None';
      const notes = o.internalNotes || '';

      let formattedDate = o.createdAt;
      try {
        formattedDate = new Date(o.createdAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {}

      return [
        escapeCSV(o.id),
        escapeCSV(formattedDate),
        escapeCSV(o.orderStatus),
        escapeCSV(customerName),
        escapeCSV(customerMobile),
        escapeCSV(customerEmail),
        escapeCSV(house),
        escapeCSV(street),
        escapeCSV(landmark),
        escapeCSV(fullAddress),
        escapeCSV(city),
        escapeCSV(state),
        escapeCSV(pincode),
        escapeCSV(country),
        escapeCSV(itemsSummary),
        escapeCSV(detailedItems),
        totalLineItems,
        totalUnits,
        subtotal,
        discount,
        gst,
        deliveryCharge,
        total,
        escapeCSV(paymentMode),
        escapeCSV(paymentStatus),
        escapeCSV(paymentId),
        escapeCSV(codVerification),
        escapeCSV(waConfirmation),
        escapeCSV(courier),
        escapeCSV(awb),
        escapeCSV(shipmentStatus),
        weightKg,
        escapeCSV(dimensions),
        estimatedCost,
        escapeCSV(rtdDate),
        escapeCSV(labelDownloaded),
        escapeCSV(ndr),
        escapeCSV(rto),
        escapeCSV(notes),
        escapeCSV(o.createdAt),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `REDMODE_Orders_History_Export${dateSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { count: target.length, filename };
  };

  // Direct Carrier Shipment Creation
  const createShipmozoShipment = (orderId: string, courierName: string) => {
    const courierCode = courierName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'EXP';
    const awbNumber = `${courierCode}-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        return {
          ...order,
          orderStatus: 'BOOKED',
          awb_number: awbNumber,
          selected_courier_name: courierName,
          shipmozo: {
            courier: courierName,
            awb: awbNumber,
            trackingUrl: `https://redmode.in/track?awb=${awbNumber}`,
            status: 'Booked',
            labelGenerated: true,
            shippedAt: new Date().toISOString(),
            estimatedDelivery: deliveryDate.toISOString().split('T')[0],
            history: [
              {
                status: 'Dispatched via Courier Partner',
                location: 'REDMODE Central Warehouse, Jaipur',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                note: `Air Waybill ${awbNumber} allocated with ${courierName}`,
              },
            ],
          },
        };
      })
    );
  };

  // Direct Delhivery & Multi-Carrier Logistics Shipment Creation
  const createDelhiveryShipment = (
    orderId: string,
    mode: 'Surface' | 'Express' = 'Surface'
  ): { success: boolean; awb: string; courier: string; message: string } => {
    const activeChannel = settings.shippingChannels?.find((c) => c.id === settings.activeShippingChannelId) || settings.shippingChannels?.[0];

    // Generate courier AWB based on active provider
    const awbNumber = generateAwbForChannel(activeChannel);

    const deliveryDays = mode === 'Express' ? 2 : 4;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    const courierTitle = activeChannel?.name || (mode === 'Express' ? 'Delhivery Express Air' : 'Delhivery Surface Logistics');
    const trackingUrl = activeChannel?.trackingUrlTemplate
      ? activeChannel.trackingUrlTemplate.replace('{{awb}}', awbNumber)
      : `https://www.delhivery.com/track/package/${awbNumber}`;

    const originHub = (activeChannel?.warehouseName || settings.delhiverySettings?.warehouseName)
      ? `${activeChannel?.warehouseName || settings.delhiverySettings?.warehouseName}, Meerut (${activeChannel?.pickupPincode || settings.delhiverySettings?.pickupPincode || '250002'})`
      : 'REDMODE B2C, Meerut (250002)';

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        return {
          ...order,
          orderStatus: 'Shipped',
          awb_number: awbNumber,
          selected_courier_name: courierTitle,
          shipment_status: 'Shipped',
          shipmozo: {
            courier: courierTitle,
            awb: awbNumber,
            trackingUrl,
            status: 'Shipped',
            labelGenerated: true,
            shippedAt: new Date().toISOString(),
            estimatedDelivery: deliveryDate.toISOString().split('T')[0],
            history: [
              {
                status: 'Waybill Generated & Manifested',
                location: originHub,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                note: `Official ${courierTitle} AWB #${awbNumber} generated for ${originHub}. Ready for dispatch courier pickup.`,
              },
            ],
          },
        };
      })
    );

    return {
      success: true,
      awb: awbNumber,
      courier: courierTitle,
      message: `Shipment created successfully! AWB: ${awbNumber}`,
    };
  };

  const updateDelhiverySettings = (newDelhivery: Partial<DelhiverySettings>) => {
    setSettings((prev) => {
      const current = prev.delhiverySettings || {
        enabled: true,
        apiToken: '',
        clientName: 'REDMODE_JAIPUR',
        warehouseName: 'REDMODE Central Hub Jaipur',
        pickupPincode: '302002',
        pickupAddress: 'Plot 42, Hawa Mahal Road, Jaipur, Rajasthan',
        pickupPhone: '7302797464',
        environment: 'production',
        defaultShippingMode: 'Surface',
        autoGenerateLabel: true,
        codRemittanceCycle: 'T+2',
      };
      const updated = {
        ...prev,
        delhiverySettings: {
          ...current,
          ...newDelhivery,
        },
      };
      try {
        localStorage.setItem('redmode_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      return updated;
    });
  };

  const updateShippingChannels = (channels: ShippingChannelConfig[], activeChannelId?: string) => {
    setSettings((prev) => {
      const targetActiveId = activeChannelId || prev.activeShippingChannelId || channels[0]?.id || 'delhivery';
      
      // STRICT ENFORCEMENT: Exactly ONE active shipping channel
      const updatedChannels = channels.map((c) => ({
        ...c,
        isPrimary: c.id === targetActiveId,
        enabled: c.id === targetActiveId ? true : c.enabled,
      }));

      const activeChannel = updatedChannels.find((c) => c.id === targetActiveId) || updatedChannels[0];

      // Keep delhiverySettings in sync if Delhivery is active
      const updatedDelhivery = activeChannel && activeChannel.provider === 'delhivery'
        ? {
            ...prev.delhiverySettings,
            enabled: true,
            apiToken: activeChannel.apiKey,
            clientName: activeChannel.clientId || prev.delhiverySettings?.clientName || 'Redmode',
            warehouseName: activeChannel.warehouseName || prev.delhiverySettings?.warehouseName || 'REDMODE B2C',
            pickupPincode: activeChannel.pickupPincode || prev.delhiverySettings?.pickupPincode || '250002',
            pickupAddress: activeChannel.pickupAddress || prev.delhiverySettings?.pickupAddress || '',
            pickupPhone: activeChannel.pickupPhone || prev.delhiverySettings?.pickupPhone || '7302797464',
            environment: (activeChannel.environment || 'production') as 'production' | 'staging',
            defaultShippingMode: (activeChannel.shippingMode === 'Express' ? 'Express' : 'Surface') as 'Surface' | 'Express',
            codRemittanceCycle: (activeChannel.codRemittanceCycle || 'T+2') as 'T+2' | 'Weekly' | 'Bi-Weekly',
            autoGenerateLabel: true,
          }
        : prev.delhiverySettings;

      const updated = {
        ...prev,
        shippingChannels: updatedChannels,
        activeShippingChannelId: targetActiveId,
        delhiverySettings: updatedDelhivery,
      };
      try {
        localStorage.setItem('redmode_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      try {
        setDoc(doc(db, 'settings', 'store_settings'), sanitizeSettingsForPublicFirestore(updated), { merge: true }).catch(() => {});
      } catch {}
      return updated;
    });
  };

  const updatePaymentGateways = (
    gateways: PaymentGatewayConfig[],
    activeDomesticId?: string,
    activeInternationalId?: string
  ) => {
    setSettings((prev) => {
      const targetDomesticId =
        activeDomesticId ||
        prev.activePaymentGatewayId ||
        gateways.find((g) => g.targetMarket === 'domestic' || g.targetMarket === 'both')?.id ||
        'razorpay_domestic';

      const targetInternationalId =
        activeInternationalId ||
        prev.activeInternationalGatewayId ||
        gateways.find((g) => g.targetMarket === 'international')?.id ||
        'paypal_export';

      const updatedGateways = gateways.map((g) => ({
        ...g,
        isPrimary: g.id === targetDomesticId,
      }));

      // Find the primary Razorpay gateway to keep razorpaySettings in sync
      const activeRazorpay =
        updatedGateways.find((g) => g.provider === 'razorpay' && g.enabled) ||
        updatedGateways.find((g) => g.provider === 'razorpay');

      const updatedRazorpaySettings = activeRazorpay
        ? {
            enabled: activeRazorpay.enabled,
            keyId: activeRazorpay.apiKey,
            keySecret: activeRazorpay.apiSecret || prev.razorpaySettings?.keySecret || '',
            merchantName: activeRazorpay.merchantName || 'REDMODE',
            themeColor: activeRazorpay.themeColor || '#111827',
            mode: (activeRazorpay.apiKey.startsWith('rzp_live') ? 'live' : activeRazorpay.mode) as
              | 'test'
              | 'live',
          }
        : prev.razorpaySettings;

      const updated: StoreSettings = {
        ...prev,
        paymentGateways: updatedGateways,
        activePaymentGatewayId: targetDomesticId,
        activeInternationalGatewayId: targetInternationalId,
        razorpaySettings: updatedRazorpaySettings,
      };

      try {
        localStorage.setItem('redmode_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save payment gateway settings:', e);
      }
      try {
        setDoc(doc(db, 'settings', 'store_settings'), sanitizeSettingsForPublicFirestore(updated), { merge: true }).catch(() => {});
      } catch {}
      return updated;
    });
  };

  const updateWhatsAppSettings = (newWhatsApp: Partial<WhatsAppSettings>) => {
    setSettings((prev) => {
      const current = prev.whatsappSettings || INITIAL_SETTINGS.whatsappSettings!;
      const mergedWhatsApp = {
        ...current,
        ...newWhatsApp,
      };
      // Cross-sync Meta WhatsApp credentials with smsSettings.meta_whatsapp
      const currentSms = prev.smsSettings || INITIAL_SETTINGS.smsSettings!;
      const syncedGateways = Array.isArray(currentSms.gateways)
        ? currentSms.gateways.map((g) =>
            g.provider === 'meta_whatsapp'
              ? {
                  ...g,
                  phoneNumberId: mergedWhatsApp.phoneNumberId || g.phoneNumberId,
                  wabaId: mergedWhatsApp.wabaId || g.wabaId,
                  accessToken: mergedWhatsApp.accessToken || g.accessToken,
                }
              : g
          )
        : currentSms.gateways;
      const updated = {
        ...prev,
        whatsappSettings: mergedWhatsApp,
        smsSettings: {
          ...currentSms,
          gateways: syncedGateways,
        },
      };
      try {
        localStorage.setItem('redmode_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      try {
        setDoc(doc(db, 'settings', 'store_settings'), sanitizeSettingsForPublicFirestore(updated), { merge: true }).catch(() => {});
      } catch {}
      return updated;
    });
  };

  const updateSmsSettings = (newSms: Partial<SmsIntegrationSettings>) => {
    setSettings((prev) => {
      const current = prev.smsSettings || INITIAL_SETTINGS.smsSettings!;
      const updatedSms = {
        ...current,
        ...newSms,
      };
      // Cross-sync Meta WhatsApp credentials back to whatsappSettings
      const metaGw = updatedSms.gateways?.find((g) => g.provider === 'meta_whatsapp');
      const currentWa = prev.whatsappSettings || INITIAL_SETTINGS.whatsappSettings!;
      const syncedWa = metaGw
        ? {
            ...currentWa,
            phoneNumberId: metaGw.phoneNumberId || currentWa.phoneNumberId,
            wabaId: metaGw.wabaId || currentWa.wabaId,
            accessToken: metaGw.accessToken || currentWa.accessToken,
          }
        : currentWa;

      const updated = {
        ...prev,
        smsSettings: updatedSms,
        whatsappSettings: syncedWa,
      };
      try {
        localStorage.setItem('redmode_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      try {
        setDoc(doc(db, 'settings', 'store_settings'), sanitizeSettingsForPublicFirestore(updated), { merge: true }).catch(() => {});
      } catch {}

      // Sync active credentials to backend using verified Admin Session Token
      const adminToken =
        sessionStorage.getItem('redmode_admin_token') ||
        localStorage.getItem('redmode_admin_token') ||
        '';
      fetch('/api/admin/sms-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(updatedSms),
      }).catch((err) => console.warn('Sync to /api/admin/sms-settings failed:', err));

      return updated;
    });
  };

  // Direct Courier Rate Calculator & Available Logistics Partners
  const fetchAvailableCouriers = async (
    order: Order,
    packageSpecs?: {
      weight_kg?: number;
      length_cm?: number;
      width_cm?: number;
      height_cm?: number;
    }
  ) => {
    const weightKg = packageSpecs?.weight_kg ?? order.final_package_weight ?? 0.35;
    const isCod = order.paymentMode === 'COD';

    const couriers: CourierOption[] = [
      {
        courier_id: 1,
        courier_name: 'Delhivery Surface',
        service_name: 'Surface Express (3-5 Days)',
        rate: Math.round(45 + weightKg * 15),
        shipping_charges: Math.round(40 + weightKg * 12),
        gst: Math.round((40 + weightKg * 12) * 0.18),
        total_charges: Math.round((40 + weightKg * 12) * 1.18),
        expected_delivery: '3-4 business days',
        cod_charges: isCod ? 30 : 0,
      },
      {
        courier_id: 2,
        courier_name: 'Delhivery Express Air',
        service_name: 'Air Cargo Express (1-2 Days)',
        rate: Math.round(75 + weightKg * 25),
        shipping_charges: Math.round(65 + weightKg * 20),
        gst: Math.round((65 + weightKg * 20) * 0.18),
        total_charges: Math.round((65 + weightKg * 20) * 1.18),
        expected_delivery: '1-2 business days',
        cod_charges: isCod ? 35 : 0,
      },
      {
        courier_id: 3,
        courier_name: 'Blue Dart Air',
        service_name: 'Priority Domestic Air Express',
        rate: Math.round(89 + weightKg * 30),
        shipping_charges: Math.round(78 + weightKg * 25),
        gst: Math.round((78 + weightKg * 25) * 0.18),
        total_charges: Math.round((78 + weightKg * 25) * 1.18),
        expected_delivery: '24-48 hours',
        cod_charges: isCod ? 40 : 0,
      },
      {
        courier_id: 4,
        courier_name: 'DTDC Premium Express',
        service_name: 'Standard Surface',
        rate: Math.round(55 + weightKg * 15),
        shipping_charges: Math.round(48 + weightKg * 12),
        gst: Math.round((48 + weightKg * 12) * 0.18),
        total_charges: Math.round((48 + weightKg * 12) * 1.18),
        expected_delivery: '3-4 business days',
        cod_charges: isCod ? 30 : 0,
      },
      {
        courier_id: 5,
        courier_name: 'Xpressbees Surface',
        service_name: 'E-commerce Standard',
        rate: Math.round(42 + weightKg * 12),
        shipping_charges: Math.round(36 + weightKg * 10),
        gst: Math.round((36 + weightKg * 10) * 0.18),
        total_charges: Math.round((36 + weightKg * 10) * 1.18),
        expected_delivery: '4-5 business days',
        cod_charges: isCod ? 25 : 0,
      },
      {
        courier_id: 6,
        courier_name: 'India Post Speed Post',
        service_name: 'Government Postal Service',
        rate: Math.round(39 + weightKg * 10),
        shipping_charges: Math.round(34 + weightKg * 8),
        gst: Math.round((34 + weightKg * 8) * 0.18),
        total_charges: Math.round((34 + weightKg * 8) * 1.18),
        expected_delivery: '4-6 business days',
        cod_charges: isCod ? 25 : 0,
      },
    ];

    return {
      configured: true,
      success: true,
      message: `${couriers.length} courier partners ready for dispatch`,
      couriers,
    };
  };

  // Direct Courier Assignment & AWB Generation
  const bookShipmozoOrder = async (
    orderId: string,
    courierId: number | string,
    courierName: string,
    packageDetails?: {
      final_package_weight?: number;
      final_package_length?: number;
      final_package_width?: number;
      final_package_height?: number;
      estimated_shipping_cost?: number;
    }
  ): Promise<{ success: boolean; message: string }> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      return { success: false, message: `Order ${orderId} not found` };
    }

    if (!courierId) {
      return { success: false, message: 'Please select a Courier Partner first.' };
    }

    const courierCode = courierName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'EXP';
    const awbNumber = `${courierCode}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 3);

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        return {
          ...order,
          orderStatus: 'BOOKED',
          final_package_weight: packageDetails?.final_package_weight ?? order.final_package_weight ?? 0.35,
          final_package_length: packageDetails?.final_package_length ?? order.final_package_length ?? 30,
          final_package_width: packageDetails?.final_package_width ?? order.final_package_width ?? 24,
          final_package_height: packageDetails?.final_package_height ?? order.final_package_height ?? 4,
          estimated_shipping_cost: packageDetails?.estimated_shipping_cost ?? order.estimated_shipping_cost ?? 55,
          selected_courier_id: courierId,
          selected_courier_name: courierName,
          awb_number: awbNumber,
          shipment_status: 'BOOKED',
          label_url_or_data: `/api/shipping/label/${awbNumber}`,
          shipmozo: {
            courierId: courierId,
            courier: courierName,
            awb: awbNumber,
            trackingUrl: `https://redmode.in/track?awb=${awbNumber}`,
            status: 'Booked',
            labelGenerated: true,
            shippedAt: new Date().toISOString(),
            estimatedDelivery: estDelivery.toISOString().split('T')[0],
            history: [
              {
                status: 'Air Waybill Assigned',
                location: 'REDMODE Central Warehouse, Jaipur',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                note: `Assigned courier partner ${courierName} with AWB ${awbNumber}`,
              },
            ],
          },
        };
      })
    );

    return {
      success: true,
      message: `Order successfully booked with ${courierName} (AWB: ${awbNumber})`,
    };
  };

  const updateOrderPackageSpecs = (
    orderId: string,
    specs: {
      final_package_weight?: number;
      final_package_length?: number;
      final_package_width?: number;
      final_package_height?: number;
      estimated_shipping_cost?: number;
      selected_courier_id?: number | string;
      selected_courier_name?: string;
    }
  ) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...specs } : o))
    );
  };

  // Download Individual Printable Label
  const downloadOrderLabel = (awb: string) => {
    if (!awb) return;
    window.open(`/api/shipping/label/${encodeURIComponent(awb)}`, '_blank');
  };

  // Bulk Download Labels
  const downloadBulkLabels = async (awbNumbers: string[]): Promise<{ success: boolean; message?: string }> => {
    const validAwbs = awbNumbers.filter(Boolean);
    if (validAwbs.length === 0) {
      return { success: false, message: 'No booked orders with valid AWBs selected.' };
    }

    try {
      // Generate clean printable bulk manifest sheet
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const rows = validAwbs
          .map(
            (awb, idx) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${awb}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">REDMODE Central Hub, Jaipur</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">Booked for Pickup</td>
            </tr>`
          )
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>REDMODE Dispatch Manifest</title>
            <style>
              body { font-family: sans-serif; padding: 24px; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
              th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
            </style>
          </head>
          <body>
            <h2>REDMODE COURIER DISPATCH MANIFEST</h2>
            <p>Date: ${new Date().toLocaleDateString('en-IN')} &bull; Total Consignments: ${validAwbs.length}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>AWB Number</th>
                  <th>Origin Hub</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <script>window.print();</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }

      return { success: true };
    } catch (err: any) {
      console.error('Bulk label generation failed:', err);
      return { success: false, message: err.message || 'Failed to generate bulk manifest' };
    }
  };

  // Live Track Order
  const fetchLiveTracking = async (awb: string) => {
    const orderWithAwb = orders.find((o) => o.shipmozo?.awb === awb || o.awb_number === awb);
    if (orderWithAwb?.shipmozo?.history) {
      return {
        success: true,
        data: {
          awb_number: awb,
          courier: orderWithAwb.shipmozo.courier,
          current_status: orderWithAwb.shipmozo.status,
          scans: orderWithAwb.shipmozo.history,
        },
      };
    }
    return {
      success: true,
      data: {
        awb_number: awb,
        courier: 'Assigned Courier Partner',
        current_status: 'In Transit',
        scans: [
          {
            status: 'In Transit',
            location: 'Central Distribution Hub, Jaipur',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: 'Package processed through sorting facility',
          },
        ],
      },
    };
  };

  const updateSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('redmode_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
    try {
      setDoc(doc(db, 'settings', 'store_settings'), sanitizeSettingsForPublicFirestore(newSettings), { merge: true }).catch((err) => {
        console.debug('Firestore store_settings sync warning:', err);
      });
    } catch {}

    if (newSettings.adminProfile) {
      const profile = newSettings.adminProfile;
      setAdminUsers((prev) => {
        const superIndex = prev.findIndex((u) => u.role === 'Super Admin');
        if (superIndex >= 0) {
          const updated = [...prev];
          updated[superIndex] = {
            ...updated[superIndex],
            name: profile.name || updated[superIndex].name,
            email: profile.email || updated[superIndex].email,
            mobile: profile.mobile || updated[superIndex].mobile,
            avatar: profile.avatarUrl !== undefined ? profile.avatarUrl : updated[superIndex].avatar,
          };
          try {
            localStorage.setItem('redmode_admin_users', JSON.stringify(updated));
          } catch (err) {}
          return updated;
        }
        return prev;
      });

      setCurrentAdminUser((prev) => {
        if (prev.role === 'Super Admin') {
          const updated = {
            ...prev,
            name: profile.name || prev.name,
            email: profile.email || prev.email,
            mobile: profile.mobile || prev.mobile,
            avatar: profile.avatarUrl !== undefined ? profile.avatarUrl : prev.avatar,
          };
          try {
            localStorage.setItem('redmode_current_admin_user', JSON.stringify(updated));
          } catch (err) {}
          return updated;
        }
        return prev;
      });
    }

    addAuditLog(
      `Updated store configuration & settings (${newSettings.storeName || 'REDMODE'})`,
      'Settings',
      'store_settings'
    );
  };

  const menuHighlights: MenuHighlightItem[] = useMemo(() => {
    const list = settings?.menuHighlights || [
      {
        id: 'highlight-festive',
        title: "NEW ARRIVALS • FESTIVE '26",
        badge: 'NEW',
        badgeColor: 'rose',
        targetType: 'tag',
        targetValue: 'new-arrivals',
        isEnabled: false,
        order: 1,
      },
      {
        id: 'highlight-bestsellers',
        title: 'BESTSELLERS',
        badge: 'HOT',
        badgeColor: 'dark',
        targetType: 'tag',
        targetValue: 'bestseller',
        isEnabled: false,
        order: 2,
      },
    ];
    return list.filter((item) => item.title.trim().toLowerCase() !== 'home');
  }, [settings?.menuHighlights]);

  const updateMenuHighlights = (newHighlights: MenuHighlightItem[]) => {
    updateSettings({
      ...settings,
      menuHighlights: newHighlights,
    });
  };

  const toggleMenuHighlight = (id: string) => {
    const updated = menuHighlights.map((item) =>
      item.id === id ? { ...item, isEnabled: !item.isEnabled } : item
    );
    updateMenuHighlights(updated);
  };

  const addMenuHighlight = (newItem: Omit<MenuHighlightItem, 'id'>) => {
    const id = `highlight-${Date.now()}`;
    const updated = [...menuHighlights, { ...newItem, id }];
    updateMenuHighlights(updated);
  };

  const deleteMenuHighlight = (id: string) => {
    const updated = menuHighlights.filter((item) => item.id !== id);
    updateMenuHighlights(updated);
  };

  // Verify server-side admin session token when authenticated so "Logout from all other devices" invalidates stale sessions
  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const token =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    fetch('/api/admin/verify-session', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then((r) => {
        if (r.status === 401) {
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('redmode_admin_auth');
          sessionStorage.removeItem('redmode_admin_token');
          localStorage.removeItem('redmode_admin_trusted');
          localStorage.removeItem('redmode_admin_token');
        }
      })
      .catch(() => {});
  }, [isAdminAuthenticated]);

  // Admin Authentication Actions (Server-Side Verified Session Token)
  const adminLogin = async (
    usernameInput: string,
    passwordInput: string,
    saveDevice: boolean,
    trustDevice: boolean
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
          trustDevice,
          staffUsers: adminUsers.filter((u) => u.role !== 'Super Admin'),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        return {
          success: false,
          message: data?.message || 'Invalid credentials. Please enter your correct mobile number and password.',
        };
      }

      if (data.token) {
        sessionStorage.setItem('redmode_admin_token', data.token);
        if (trustDevice) {
          localStorage.setItem('redmode_admin_token', data.token);
        } else {
          localStorage.removeItem('redmode_admin_token');
        }
      }

      const authenticatedUser: AdminUser = data.user || {
        ...(adminUsers.find((u) => u.role === 'Super Admin') || INITIAL_ADMIN_USERS[0]),
        lastLogin: new Date().toISOString(),
      };

      setCurrentAdminUser(authenticatedUser);
      try {
        localStorage.setItem('redmode_current_admin_user', JSON.stringify(authenticatedUser));
      } catch (e) {}

      if (authenticatedUser.role !== 'Super Admin') {
        const updatedList = adminUsers.map((u) => (u.id === authenticatedUser.id ? authenticatedUser : u));
        setAdminUsers(updatedList);
        try {
          localStorage.setItem('redmode_admin_users', JSON.stringify(updatedList));
        } catch (e) {}
      }

      setIsAdminAuthenticated(true);
      sessionStorage.setItem('redmode_admin_auth', 'true');

      if (trustDevice) {
        localStorage.setItem('redmode_admin_trusted', 'true');
      } else {
        localStorage.removeItem('redmode_admin_trusted');
      }

      // Never store plaintext password in localStorage
      if (saveDevice) {
        const safeCreds = { username: usernameInput, saved: true };
        localStorage.setItem('redmode_admin_credentials', JSON.stringify(safeCreds));
        setAdminSavedCredentials(safeCreds);
      } else {
        localStorage.removeItem('redmode_admin_credentials');
        setAdminSavedCredentials({ username: '', saved: false });
      }

      return {
        success: true,
        message: data.message || 'Admin authenticated successfully',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Unable to reach authentication server. Please check your connection and try again.',
      };
    }
  };

  const adminGoogleLogin = async (email?: string, idToken?: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          googleEmail: email,
          googleIdToken: idToken,
          trustDevice: true,
          staffUsers: adminUsers.filter((u) => u.role !== 'Super Admin'),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (data.token) {
          sessionStorage.setItem('redmode_admin_token', data.token);
          localStorage.setItem('redmode_admin_token', data.token);
        }
        if (data.user) {
          setCurrentAdminUser(data.user);
          localStorage.setItem('redmode_current_admin_user', JSON.stringify(data.user));
        }
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('redmode_admin_auth', 'true');
        localStorage.setItem('redmode_admin_trusted', 'true');
      }
    } catch (err) {
      console.error('Admin Google session exchange failed:', err);
    }
  };

  const adminLogout = () => {
    const token =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    fetch('/api/admin/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    }).catch(() => {});

    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('redmode_admin_auth');
    sessionStorage.removeItem('redmode_admin_token');
    localStorage.removeItem('redmode_admin_trusted');
    localStorage.removeItem('redmode_admin_token');
    localStorage.removeItem('redmode_current_admin_user');
    const superAdmin =
      adminUsers.find((u) => u.role === 'Super Admin') || INITIAL_ADMIN_USERS[0];
    setCurrentAdminUser(superAdmin);
    setActiveView('home');
  };

  const updateAdminPassword = (_newPassword: string) => {
    // Password is now stored and verified exclusively on the backend (/api/admin/change-password).
    // Strip any legacy plaintext password from localStorage settings or saved credentials.
    setSettings((prev) => {
      const updated = { ...prev };
      delete (updated as any).adminPassword;
      localStorage.setItem('redmode_settings', JSON.stringify(updated));
      return updated;
    });
    setAdminSavedCredentials((prev) => {
      const updated = { username: prev.username, saved: prev.saved };
      localStorage.setItem('redmode_admin_credentials', JSON.stringify(updated));
      return updated;
    });
  };



  return (
    <StoreContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedProductId,
        setSelectedProductId,
        selectedProductColor,
        setSelectedProductColor,
        openProductDetail,
        selectedBlogId,
        setSelectedBlogId,
        adminTab,
        setAdminTab,
        selectedCategorySlug,
        setSelectedCategorySlug,
        selectedSubcategorySlug,
        setSelectedSubcategorySlug,
        subcategoriesShowcaseCategorySlug,
        setSubcategoriesShowcaseCategorySlug,
        goBack,
        searchQuery,
        setSearchQuery,
        products,
        categories,
        banners,
        blogs,
        orders,
        settings,
        contactMessages,
        cart,
        wishlist,
        isCartOpen,
        setIsCartOpen,
        lastAddedItem,
        setLastAddedItem,
        cartDrawerView,
        setCartDrawerView,
        isSearchOpen,
        setIsSearchOpen,
        isLoginOpen,
        setIsLoginOpen,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        clearWishlist,
        cartSubtotal,
        autoDiscountAmount,
        isAutoDiscountApplied,
        appliedCoupon,
        couponDiscountAmount,
        applyCoupon,
        removeCoupon,
        cartGstAmount,
        deliveryFee,
        cartTotalAmount,
        lastConfirmedOrder,
        placeOrder,
        trackOrder,
        submitContactForm,
        submitStockNotification,
        inquiries: contactMessages || [],
        userProfile,
        loginUser,
        logoutUser,
        updateUserProfile,
        saveCustomerAddress,
        deleteCustomerAddress,
        cancelCustomerOrder,
        submitCustomerReturnRequest,
        markReviewHelpful,
        addProduct,
        updateProduct,
        deleteProduct,
        togglePublishProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        syncCategoriesToCloud,
        addSubcategory,
        deleteSubcategory,
        addSubSubcategory,
        deleteSubSubcategory,
        addBanner,
        updateBanner,
        deleteBanner,
        addBlog,
        updateBlog,
        deleteBlog,
        // Coupons
        coupons,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        toggleCouponActive,
        updateOrderStatus,
        updateOrderPaymentStatus,
        updateCodVerificationStatus,
        confirmCustomerOrder,
        bulkAcceptOrdersToRTD,
        bulkCancelOrders,
        send23hReminder,
        triggerNightConfirmationNow,
        markLabelDownloaded,
        sendCustomerTrackingUpdate,
        sendDeliveredReviewRequest,
        updateOrderInternalNotes,
        updateProductStock,
        createShipmozoShipment,
        createDelhiveryShipment,
        updateDelhiverySettings,
        updateShippingChannels,
        updatePaymentGateways,
        updateWhatsAppSettings,
        updateSmsSettings,
        shipmozoConfigured,
        fetchAvailableCouriers,
        bookShipmozoOrder,
        updateOrderPackageSpecs,
        downloadOrderLabel,
        downloadBulkLabels,
        fetchLiveTracking,
        updateSettings,
        menuHighlights,
        updateMenuHighlights,
        toggleMenuHighlight,
        addMenuHighlight,
        deleteMenuHighlight,
        resolveMessage,
        incrementProductViews,
        // Admin Auth
        isAdminAuthenticated,
        adminLogin,
        adminGoogleLogin,
        adminLogout,
        updateAdminPassword,
        adminSavedCredentials,
        // Enterprise REDMODE Operating System Extensions
        inventoryLogs,
        adjustProductStockWithReason,
        auditLogs,
        addAuditLog,
        returnsList,
        updateReturnStatus,
        adminUsers,
        currentAdminUser,
        switchAdminUser,
        addAdminUser,
        updateAdminUser,
        toggleAdminUserStatus,
        deleteAdminUser,
        customerNotes,
        updateCustomerNote,
        exportOrdersToCSV,
        // COD & Genuine RTO Rule Engine
        getCustomerCodEligibility,
        getCustomerPreviousRtoReason,
        markOrderAsRto,
        setCustomerCodOverride,
        codOverrides,
        // Customer Mobile OTP Authentication
        sendCustomerOtp,
        verifyCustomerOtp,
        // Geolocation & Multi-Currency Localization
        userCountry: geoData.countryName,
        userCountryCode: geoData.countryCode,
        currency: geoData.currency,
        currencySymbol: geoData.currencySymbol,
        isDomesticIndia: geoData.isDomesticIndia,
        isLoadingGeo,
        exchangeRate,
        setCurrency: setManualCurrency,
        setUserCountry: setManualCountry,
        formatPrice,
        convertPrice,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
