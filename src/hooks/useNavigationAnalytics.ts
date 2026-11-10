import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import {
  AnalyticsService,
  NavigationEvent,
  PopularCategoryStat,
  PopularProductStat,
} from '../services/analytics';

/**
 * Custom React hook that tracks user navigation across view changes in StoreContent,
 * pushing events to the AnalyticsService to monitor popular categories and product views.
 */
export function useNavigationAnalytics() {
  const {
    activeView,
    selectedCategorySlug,
    selectedSubcategorySlug,
    selectedProductId,
    searchQuery,
    categories,
    products,
  } = useStore();

  const [recentEvents, setRecentEvents] = useState<NavigationEvent[]>(() =>
    AnalyticsService.getRecentEvents(10)
  );
  const [popularCategories, setPopularCategories] = useState<PopularCategoryStat[]>(() =>
    AnalyticsService.getPopularCategories()
  );
  const [popularProducts, setPopularProducts] = useState<PopularProductStat[]>(() =>
    AnalyticsService.getPopularProducts()
  );

  // Subscribe to live analytics events to keep local counters reactive
  useEffect(() => {
    const unsubscribe = AnalyticsService.subscribe((newEvent) => {
      setRecentEvents((prev) => [newEvent, ...prev.slice(0, 9)]);
      if (newEvent.categorySlug) {
        setPopularCategories(AnalyticsService.getPopularCategories());
      }
      if (newEvent.productId) {
        setPopularProducts(AnalyticsService.getPopularProducts());
      }
    });

    return unsubscribe;
  }, []);

  // Track previous navigation state to calculate transition delta and avoid duplicate firings
  const prevStateRef = useRef<{
    activeView: string;
    categorySlug: string | null;
    subcategorySlug: string | null;
    productId: string | null;
    searchQuery: string;
    isInitial: boolean;
  }>({
    activeView: '',
    categorySlug: null,
    subcategorySlug: null,
    productId: null,
    searchQuery: '',
    isInitial: true,
  });

  useEffect(() => {
    const prev = prevStateRef.current;

    // Check if any tracked parameter actually changed
    const hasViewChanged = prev.activeView !== activeView;
    const hasCategoryChanged = prev.categorySlug !== selectedCategorySlug;
    const hasSubcategoryChanged = prev.subcategorySlug !== selectedSubcategorySlug;
    const hasProductChanged = prev.productId !== selectedProductId;
    const hasSearchChanged = prev.searchQuery !== searchQuery && !!searchQuery;

    if (
      !prev.isInitial &&
      !hasViewChanged &&
      !hasCategoryChanged &&
      !hasSubcategoryChanged &&
      !hasProductChanged &&
      !hasSearchChanged
    ) {
      return;
    }

    const currentUrlPath =
      typeof window !== 'undefined' ? window.location.pathname : '/';

    // 1. Resolve human-readable category name
    const matchedCategory = selectedCategorySlug
      ? categories.find(
          (c) =>
            c.slug.toLowerCase() === selectedCategorySlug.toLowerCase() ||
            c.name.toLowerCase() === selectedCategorySlug.toLowerCase()
        )
      : null;
    const categoryName = matchedCategory ? matchedCategory.name : selectedCategorySlug || null;

    // 2. Resolve product info if viewing product details
    const matchedProduct = selectedProductId
      ? products.find((p) => p.id === selectedProductId || p.slug === selectedProductId)
      : null;

    // A. PRODUCT VIEW: User opened or switched to a product detail page
    if (activeView === 'product-detail' && selectedProductId) {
      const prodName = matchedProduct ? matchedProduct.name : selectedProductId;
      const prodCat = matchedProduct ? matchedProduct.category : selectedCategorySlug;
      const prodPrice = matchedProduct ? matchedProduct.price : null;

      AnalyticsService.trackProductView({
        productId: selectedProductId,
        productName: prodName,
        categorySlug: prodCat || null,
        categoryName: prodCat || null,
        productPrice: prodPrice,
        fromView: prev.activeView || null,
        urlPath: currentUrlPath,
      });
    }
    // B. CATEGORY VIEW: User browsed a specific category or subcategory
    else if (activeView === 'catalogue' && selectedCategorySlug) {
      AnalyticsService.trackCategoryView({
        categorySlug: selectedCategorySlug,
        categoryName: categoryName || selectedCategorySlug,
        subcategorySlug: selectedSubcategorySlug || null,
        fromView: prev.activeView || null,
        urlPath: currentUrlPath,
      });
    }
    // C. SEARCH QUERY VIEW: User entered a search term
    else if (hasSearchChanged && searchQuery.trim().length > 1) {
      AnalyticsService.trackSearch(searchQuery.trim(), prev.activeView || null);
    }
    // D. GENERAL VIEW CHANGE: User navigated across views (home, cart, checkout, track-order, etc.)
    else {
      AnalyticsService.trackViewChange({
        fromView: prev.isInitial ? null : prev.activeView,
        toView: activeView,
        urlPath: currentUrlPath,
        categorySlug: selectedCategorySlug || null,
        categoryName: categoryName || null,
        subcategorySlug: selectedSubcategorySlug || null,
        productId: selectedProductId || null,
        productName: matchedProduct?.name || null,
      });
    }

    // Update previous ref for next evaluation
    prevStateRef.current = {
      activeView,
      categorySlug: selectedCategorySlug,
      subcategorySlug: selectedSubcategorySlug,
      productId: selectedProductId,
      searchQuery: searchQuery || '',
      isInitial: false,
    };
  }, [
    activeView,
    selectedCategorySlug,
    selectedSubcategorySlug,
    selectedProductId,
    searchQuery,
    categories,
    products,
  ]);

  // Expose manual tracking helper for explicit UI actions (e.g., CTA clicks)
  const trackCustomEvent = useCallback(
    (
      eventType: NavigationEvent['eventType'],
      details: {
        toView?: string;
        categorySlug?: string;
        productId?: string;
        urlPath?: string;
      }
    ) => {
      return AnalyticsService.logEvent({
        eventType,
        toView: details.toView || activeView,
        categorySlug: details.categorySlug || selectedCategorySlug,
        productId: details.productId || selectedProductId,
        urlPath: details.urlPath || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      });
    },
    [activeView, selectedCategorySlug, selectedProductId]
  );

  return {
    recentEvents,
    popularCategories,
    popularProducts,
    trackCustomEvent,
  };
}
