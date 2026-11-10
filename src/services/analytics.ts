import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  platform: string;
  isMobile: boolean;
  language: string;
}

export interface NavigationEvent {
  id: string;
  eventType: 'view_change' | 'category_view' | 'product_view' | 'search';
  fromView?: string | null;
  toView: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  subcategorySlug?: string | null;
  productId?: string | null;
  productName?: string | null;
  productPrice?: number | null;
  searchQuery?: string | null;
  urlPath: string;
  timestamp: string;
  sessionId: string;
  referrer: string;
  device?: DeviceInfo;
}

export interface PopularCategoryStat {
  categorySlug: string;
  categoryName: string;
  views: number;
  lastViewedAt: string;
}

export interface PopularProductStat {
  productId: string;
  productName: string;
  categorySlug?: string;
  price?: number;
  views: number;
  lastViewedAt: string;
}

// Session ID persistence across page navigations within a tab
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  try {
    let sid = window.sessionStorage.getItem('redmode_analytics_session_id');
    if (!sid) {
      sid = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      window.sessionStorage.setItem('redmode_analytics_session_id', sid);
    }
    return sid;
  } catch {
    return `ses_${Date.now()}`;
  }
}

// Extract lightweight client metadata
function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: '',
      screenWidth: 0,
      screenHeight: 0,
      platform: 'unknown',
      isMobile: false,
      language: 'en',
    };
  }
  const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  return {
    userAgent: navigator.userAgent.slice(0, 150),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    platform: navigator.platform || 'unknown',
    isMobile,
    language: navigator.language || 'en',
  };
}

// Local storage key constants
const RECENT_EVENTS_KEY = 'redmode_analytics_recent_events_v1';
const POPULAR_CATEGORIES_KEY = 'redmode_popular_categories_v1';
const POPULAR_PRODUCTS_KEY = 'redmode_popular_products_v1';

// In-memory subscribers for live analytics monitoring
type AnalyticsListener = (event: NavigationEvent) => void;
const listeners = new Set<AnalyticsListener>();

// Anti-spam deduplication ref (avoids duplicate events within 1000ms for exact same view/cat/prod)
let lastLoggedSignature = '';
let lastLoggedTimestamp = 0;

export class AnalyticsService {
  /**
   * Subscribe to real-time navigation and view events
   */
  static subscribe(listener: AnalyticsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Log any structured navigation or engagement event
   */
  static async logEvent(
    partialEvent: Omit<NavigationEvent, 'id' | 'timestamp' | 'sessionId' | 'referrer' | 'device'>
  ): Promise<NavigationEvent | null> {
    const signature = `${partialEvent.eventType}:${partialEvent.toView}:${partialEvent.categorySlug || ''}:${partialEvent.subcategorySlug || ''}:${partialEvent.productId || ''}`;
    const now = Date.now();

    // Prevent spam if triggered multiple times within 1 second
    if (signature === lastLoggedSignature && now - lastLoggedTimestamp < 1000) {
      return null;
    }
    lastLoggedSignature = signature;
    lastLoggedTimestamp = now;

    const event: NavigationEvent = {
      id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
      device: getDeviceInfo(),
      ...partialEvent,
    };

    // 1. Notify all local runtime subscribers immediately
    listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.warn('[Analytics] Listener callback error:', err);
      }
    });

    // 2. Persist to local cache for instant UI availability
    this.saveRecentEventLocally(event);

    // 3. Update category / product popularity metrics in local cache
    if (event.categorySlug) {
      this.incrementLocalCategoryViews(event.categorySlug, event.categoryName || event.categorySlug);
    }
    if (event.productId) {
      this.incrementLocalProductViews(
        event.productId,
        event.productName || event.productId,
        event.categorySlug || undefined,
        event.productPrice || undefined
      );
    }

    // 4. Asynchronously push to Cloud Firestore
    this.pushToFirestore(event).catch((err) => {
      // Non-blocking catch to ensure storefront never lags or fails if offline
      console.warn('[Analytics Service] Background Firestore sync deferred:', err?.message || err);
    });

    return event;
  }

  /**
   * Track high-level view navigation (e.g., home -> catalogue, catalogue -> cart)
   */
  static trackViewChange(params: {
    fromView?: string | null;
    toView: string;
    urlPath?: string;
    categorySlug?: string | null;
    categoryName?: string | null;
    subcategorySlug?: string | null;
    productId?: string | null;
    productName?: string | null;
  }) {
    return this.logEvent({
      eventType: 'view_change',
      fromView: params.fromView,
      toView: params.toView,
      categorySlug: params.categorySlug,
      categoryName: params.categoryName,
      subcategorySlug: params.subcategorySlug,
      productId: params.productId,
      productName: params.productName,
      urlPath: params.urlPath || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    });
  }

  /**
   * Explicitly record a Category View event to monitor popular categories
   */
  static trackCategoryView(params: {
    categorySlug: string;
    categoryName?: string;
    subcategorySlug?: string | null;
    fromView?: string | null;
    urlPath?: string;
  }) {
    return this.logEvent({
      eventType: 'category_view',
      fromView: params.fromView,
      toView: 'catalogue',
      categorySlug: params.categorySlug,
      categoryName: params.categoryName || params.categorySlug,
      subcategorySlug: params.subcategorySlug,
      urlPath:
        params.urlPath ||
        (params.subcategorySlug
          ? `/${params.categorySlug}/${params.subcategorySlug}`
          : `/${params.categorySlug}`),
    });
  }

  /**
   * Explicitly record a Product View event to monitor popular products
   */
  static trackProductView(params: {
    productId: string;
    productName: string;
    categorySlug?: string | null;
    categoryName?: string | null;
    productPrice?: number | null;
    fromView?: string | null;
    urlPath?: string;
  }) {
    return this.logEvent({
      eventType: 'product_view',
      fromView: params.fromView,
      toView: 'product-detail',
      productId: params.productId,
      productName: params.productName,
      categorySlug: params.categorySlug,
      categoryName: params.categoryName,
      productPrice: params.productPrice,
      urlPath: params.urlPath || `/product/${params.productId}`,
    });
  }

  /**
   * Record a search query event
   */
  static trackSearch(query: string, fromView?: string | null) {
    if (!query || query.trim().length === 0) return null;
    return this.logEvent({
      eventType: 'search',
      fromView: fromView,
      toView: 'search',
      searchQuery: query.trim(),
      urlPath: `/search?q=${encodeURIComponent(query.trim())}`,
    });
  }

  /**
   * Get recently recorded navigation events
   */
  static getRecentEvents(maxCount = 20): NavigationEvent[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(RECENT_EVENTS_KEY);
      if (!raw) return [];
      const parsed: NavigationEvent[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, maxCount) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get popular categories sorted by view count
   */
  static getPopularCategories(): PopularCategoryStat[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(POPULAR_CATEGORIES_KEY);
      if (!raw) return [];
      const stats: Record<string, PopularCategoryStat> = JSON.parse(raw);
      return Object.values(stats).sort((a, b) => b.views - a.views);
    } catch {
      return [];
    }
  }

  /**
   * Get popular products sorted by view count
   */
  static getPopularProducts(): PopularProductStat[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(POPULAR_PRODUCTS_KEY);
      if (!raw) return [];
      const stats: Record<string, PopularProductStat> = JSON.parse(raw);
      return Object.values(stats).sort((a, b) => b.views - a.views);
    } catch {
      return [];
    }
  }

  // --- Private Helper Methods ---

  private static saveRecentEventLocally(event: NavigationEvent) {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getRecentEvents(50);
      existing.unshift(event);
      window.localStorage.setItem(RECENT_EVENTS_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch (err) {
      console.warn('[Analytics] Failed saving event to localStorage:', err);
    }
  }

  private static incrementLocalCategoryViews(categorySlug: string, categoryName: string) {
    if (typeof window === 'undefined' || !categorySlug) return;
    try {
      const raw = window.localStorage.getItem(POPULAR_CATEGORIES_KEY);
      const map: Record<string, PopularCategoryStat> = raw ? JSON.parse(raw) : {};
      const current = map[categorySlug] || {
        categorySlug,
        categoryName,
        views: 0,
        lastViewedAt: new Date().toISOString(),
      };
      current.views += 1;
      current.lastViewedAt = new Date().toISOString();
      if (categoryName && categoryName !== categorySlug) {
        current.categoryName = categoryName;
      }
      map[categorySlug] = current;
      window.localStorage.setItem(POPULAR_CATEGORIES_KEY, JSON.stringify(map));
    } catch (err) {
      console.warn('[Analytics] Failed incrementing category views locally:', err);
    }
  }

  private static incrementLocalProductViews(
    productId: string,
    productName: string,
    categorySlug?: string,
    price?: number
  ) {
    if (typeof window === 'undefined' || !productId) return;
    try {
      const raw = window.localStorage.getItem(POPULAR_PRODUCTS_KEY);
      const map: Record<string, PopularProductStat> = raw ? JSON.parse(raw) : {};
      const current = map[productId] || {
        productId,
        productName,
        categorySlug,
        price,
        views: 0,
        lastViewedAt: new Date().toISOString(),
      };
      current.views += 1;
      current.lastViewedAt = new Date().toISOString();
      if (productName && productName !== productId) {
        current.productName = productName;
      }
      if (price) current.price = price;
      if (categorySlug) current.categorySlug = categorySlug;
      map[productId] = current;
      window.localStorage.setItem(POPULAR_PRODUCTS_KEY, JSON.stringify(map));
    } catch (err) {
      console.warn('[Analytics] Failed incrementing product views locally:', err);
    }
  }

  private static async pushToFirestore(event: NavigationEvent): Promise<void> {
    try {
      // 1. Write the individual event doc into analytics_events collection
      const eventDocRef = doc(db, 'analytics_events', event.id);
      await setDoc(eventDocRef, {
        id: event.id,
        eventType: event.eventType,
        fromView: event.fromView || null,
        toView: event.toView,
        categorySlug: event.categorySlug || null,
        categoryName: event.categoryName || null,
        subcategorySlug: event.subcategorySlug || null,
        productId: event.productId || null,
        productName: event.productName || null,
        productPrice: event.productPrice || null,
        searchQuery: event.searchQuery || null,
        urlPath: event.urlPath,
        timestamp: event.timestamp,
        sessionId: event.sessionId,
        referrer: event.referrer,
        device: event.device || null,
        createdAt: serverTimestamp(),
      });

      // 2. If it is a category view, update category analytics counter doc in Firestore
      if (event.categorySlug) {
        const catStatRef = doc(db, 'analytics_categories', event.categorySlug);
        await setDoc(
          catStatRef,
          {
            categorySlug: event.categorySlug,
            categoryName: event.categoryName || event.categorySlug,
            views: increment(1),
            lastViewedAt: event.timestamp,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 3. If it is a product view, update product analytics doc and increment product views
      if (event.productId) {
        const prodStatRef = doc(db, 'analytics_products', event.productId);
        await setDoc(
          prodStatRef,
          {
            productId: event.productId,
            productName: event.productName || event.productId,
            categorySlug: event.categorySlug || null,
            views: increment(1),
            lastViewedAt: event.timestamp,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Also increment `views` on the product catalog document if it already exists
        const catalogProdRef = doc(db, 'products', event.productId);
        await updateDoc(catalogProdRef, {
          views: increment(1),
        }).catch(() => {
          // Ignore if product doc does not exist yet
        });
      }
    } catch (err: any) {
      console.warn('[Analytics Service] Push to Firestore warning:', err?.message || err);
    }
  }
}
