import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { StoreProvider, useStore } from './context/StoreContext';
import { Category } from './types';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ProductDetail } from './components/ProductDetail';
import { CartDrawer } from './components/CartDrawer';
import { Checkout } from './components/Checkout';
import { TrackOrder } from './components/TrackOrder';
import { ContactUs } from './components/ContactUs';
import { Catalogue } from './components/Catalogue';
import { Blogs } from './components/Blogs';
import { WishlistView } from './components/WishlistView';
import { SearchModal } from './components/SearchModal';
import { LoginModal } from './components/LoginModal';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminLoginGate } from './components/admin/AdminLoginGate';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsAndConditions } from './components/TermsAndConditions';
import { CancellationPolicy } from './components/CancellationPolicy';
import { ShippingPolicy } from './components/ShippingPolicy';
import { ReturnsExchange } from './components/ReturnsExchange';
import { StitchingServices } from './components/StitchingServices';
import { SizeGuide } from './components/SizeGuide';
import { FAQs } from './components/FAQs';
import { SeoManager } from './components/SeoManager';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck } from 'lucide-react';
import { useNavigationAnalytics } from './hooks/useNavigationAnalytics';

// Option 1: Ultra-Fast Micro Dissolve (200ms) - Clean, instantaneous feel, zero lag
const microDissolveVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

interface AdminFirestoreGuardProps {
  onUnauthorizedRedirect: () => void;
}

/**
 * Dedicated Authentication Guard for AdminPanel:
 * Strictly verifies the user's role and status in Firestore before rendering AdminPanel.
 * If the user is not logged in as 'admin', immediately forces a redirect to the storefront homepage.
 */
const AdminFirestoreGuard: React.FC<AdminFirestoreGuardProps> = ({ onUnauthorizedRedirect }) => {
  const { isAdminAuthenticated, currentAdminUser } = useStore();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    let isSubscribed = true;

    async function verifyAdminRoleInFirestore() {
      // 1. If not logged in as admin in local state, immediately force redirect to homepage
      if (!isAdminAuthenticated || !currentAdminUser || !currentAdminUser.id) {
        if (isSubscribed) {
          setAuthStatus('unauthorized');
          onUnauthorizedRedirect();
        }
        return;
      }

      try {
        // 2. Strictly query user's admin record directly from Firestore
        const adminDocRef = doc(db, 'admins', currentAdminUser.id);
        const docSnap = await getDoc(adminDocRef);

        if (!docSnap.exists()) {
          console.warn(`[Firestore Guard] Admin record "${currentAdminUser.id}" not found in Firestore.`);
          if (isSubscribed) {
            setAuthStatus('unauthorized');
            onUnauthorizedRedirect();
          }
          return;
        }

        const data = docSnap.data();
        const validAdminRoles = ['Super Admin', 'Admin', 'Listing + Label Admin', 'Label Admin'];
        const role = data?.role;
        const status = data?.status;

        // 3. Strictly verify user's role in Firestore is an admin role and active
        if (role && validAdminRoles.includes(role) && status === 'active') {
          if (isSubscribed) {
            setAuthStatus('authorized');
          }
        } else {
          console.warn(`[Firestore Guard] Access denied. Role "${role}" or status "${status}" is unauthorized.`);
          if (isSubscribed) {
            setAuthStatus('unauthorized');
            onUnauthorizedRedirect();
          }
        }
      } catch (err) {
        console.error('[Firestore Guard] Error verifying admin role in Firestore:', err);
        if (isSubscribed) {
          setAuthStatus('unauthorized');
          onUnauthorizedRedirect();
        }
      }
    }

    verifyAdminRoleInFirestore();

    return () => {
      isSubscribed = false;
    };
  }, [isAdminAuthenticated, currentAdminUser, onUnauthorizedRedirect]);

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white selection:bg-rose-500">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl mb-4 animate-pulse">
          <ShieldCheck className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-base font-bold tracking-tight text-white">
          Verifying Admin Authorization
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          Verifying role with Firestore security database...
        </p>
      </div>
    );
  }

  if (authStatus === 'authorized') {
    return <AdminPanel />;
  }

  return null;
};

const StoreContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    selectedProductId,
    setSelectedProductId,
    selectedCategorySlug,
    setSelectedCategorySlug,
    selectedSubcategorySlug,
    setSelectedSubcategorySlug,
    isLoginOpen,
    setIsLoginOpen,
    setIsCartOpen,
    categories,
    products,
    isAdminAuthenticated,
  } = useStore();

  // Track navigation across view changes in StoreContent and push events to analytics service
  useNavigationAnalytics();

  const shouldReduceMotion = useReducedMotion();

  // Flag to avoid redundant pushState when navigation originates from popstate (back/forward)
  const isPopStateNavigation = useRef(false);

  // Helper to match category by slug or name (including plural/singular variations like kurti/kurtis)
  const findCategory = useCallback(
    (slugOrName: string) => {
      const clean = slugOrName.toLowerCase().trim();
      const singular = clean.endsWith('s') ? clean.slice(0, -1) : clean;

      return categories.find((cat) => {
        const catSlug = cat.slug.toLowerCase().trim();
        const catName = cat.name.toLowerCase().trim();
        const catSlugSingular = catSlug.endsWith('s') ? catSlug.slice(0, -1) : catSlug;
        const catNameSingular = catName.endsWith('s') ? catName.slice(0, -1) : catName;

        return (
          catSlug === clean ||
          catName === clean ||
          catSlugSingular === singular ||
          catNameSingular === singular ||
          catSlug.includes(clean) ||
          clean.includes(catSlug)
        );
      });
    },
    [categories]
  );

  // Helper to match subcategory by slug or name
  const findSubcategory = useCallback((cat: Category, subSlugOrName: string) => {
    if (!cat.subcategories || cat.subcategories.length === 0) return null;
    const clean = subSlugOrName.toLowerCase().trim();
    const singular = clean.endsWith('s') ? clean.slice(0, -1) : clean;

    return cat.subcategories.find((sub) => {
      const subSlug = sub.slug.toLowerCase().trim();
      const subName = sub.name.toLowerCase().trim();
      const subSlugSingular = subSlug.endsWith('s') ? subSlug.slice(0, -1) : subSlug;
      const subNameSingular = subName.endsWith('s') ? subName.slice(0, -1) : subName;

      return (
        subSlug === clean ||
        subName === clean ||
        subSlugSingular === singular ||
        subNameSingular === singular
      );
    });
  }, []);

  // Sync a URL path into the application view state
  const syncPathToState = useCallback(
    (pathname: string) => {
      if (typeof window === 'undefined') return;

      const decodedPath = decodeURIComponent(pathname);
      const segments = decodedPath
        .toLowerCase()
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean);

      // Root URL / or /home -> Home View
      if (segments.length === 0 || segments[0] === 'home') {
        setIsLoginOpen(false);
        setSelectedCategorySlug(null);
        setSelectedSubcategorySlug(null);
        setSelectedProductId(null);
        setActiveView('home');
        return;
      }

      const first = segments[0];
      const second = segments[1];

      // 1. Modals & Drawer Overlays
      if (first === 'login' || first === 'signin') {
        setIsLoginOpen(true);
        return;
      }

      if (first === 'cart') {
        setIsCartOpen(true);
        return;
      }

      // 2. Specific Page Views
      if (first === 'contact' || first === 'contact-us') {
        setIsLoginOpen(false);
        setActiveView('contact');
        return;
      }

      if (first === 'checkout') {
        setIsLoginOpen(false);
        setActiveView('checkout');
        return;
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
        setIsLoginOpen(false);
        setActiveView('track-order');
        return;
      }

      if (first === 'account' || first === 'my-account') {
        setIsLoginOpen(false);
        setActiveView('account');
        return;
      }

      if (first === 'wishlist') {
        setIsLoginOpen(false);
        setActiveView('wishlist');
        return;
      }

      if (first === 'blogs' || first === 'blog') {
        setIsLoginOpen(false);
        setActiveView('blogs');
        return;
      }

      if (first === 'search') {
        setIsLoginOpen(false);
        setActiveView('search');
        return;
      }

      if (first === 'privacy-policy' || first === 'privacy') {
        setIsLoginOpen(false);
        setActiveView('privacy-policy');
        return;
      }

      if (first === 'terms-conditions' || first === 'terms') {
        setIsLoginOpen(false);
        setActiveView('terms-conditions');
        return;
      }

      if (first === 'cancellation-policy' || first === 'cancellation') {
        setIsLoginOpen(false);
        setActiveView('cancellation-policy');
        return;
      }

      if (first === 'shipping-policy' || first === 'shipping-delivery' || first === 'shipping') {
        setIsLoginOpen(false);
        setActiveView('shipping-delivery');
        return;
      }

      if (first === 'returns-exchange' || first === 'returns') {
        setIsLoginOpen(false);
        setActiveView('returns-exchange');
        return;
      }

      if (first === 'stitching-services' || first === 'stitching') {
        setIsLoginOpen(false);
        setActiveView('stitching-services');
        return;
      }

      if (first === 'size-guide' || first === 'sizes') {
        setIsLoginOpen(false);
        setActiveView('size-guide');
        return;
      }

      if (first === 'faqs' || first === 'faq') {
        setIsLoginOpen(false);
        setActiveView('faqs');
        return;
      }

      if (
        first === 'admin' ||
        first === 'admin-panel' ||
        first === 'adminpanel' ||
        first === 'admin_panel' ||
        first === 'admin panel' ||
        first === 'dashboard' ||
        first === 'admin-login' ||
        first === 'adminlogin'
      ) {
        setIsLoginOpen(false);
        setActiveView('admin');
        return;
      }

      // 3. Product Detail (/product/:id or /p/:id)
      if (first === 'product' || first === 'p') {
        if (second) {
          const foundProduct = products.find(
            (p) =>
              p.id.toLowerCase() === second.toLowerCase() ||
              p.slug.toLowerCase() === second.toLowerCase()
          );
          setSelectedProductId(foundProduct ? foundProduct.id : second);
          setIsLoginOpen(false);
          setActiveView('product-detail');
          return;
        }
      }

      // 4. Catalogue (/catalogue or /shop)
      if (first === 'catalogue' || first === 'catalog' || first === 'shop' || first === 'products') {
        if (second) {
          const matchedCat = findCategory(second);
          if (matchedCat) {
            setSelectedCategorySlug(matchedCat.slug);
            const subCat = segments[2] ? findSubcategory(matchedCat, segments[2]) : null;
            setSelectedSubcategorySlug(subCat ? subCat.slug : null);
            setIsLoginOpen(false);
            setActiveView('catalogue');
            return;
          }
        }
        setSelectedCategorySlug(null);
        setSelectedSubcategorySlug(null);
        setIsLoginOpen(false);
        setActiveView('catalogue');
        return;
      }

      // 5. Category Direct Slug (e.g. /kurti, /kurtis, /trouser, /kurti/printed)
      const matchedCategory = findCategory(first);
      if (matchedCategory) {
        setSelectedCategorySlug(matchedCategory.slug);
        const subCat = second ? findSubcategory(matchedCategory, second) : null;
        setSelectedSubcategorySlug(subCat ? subCat.slug : null);
        setSelectedProductId(null);
        setIsLoginOpen(false);
        setActiveView('catalogue');
        return;
      }

      // 6. Direct product match by id or slug
      const directProduct = products.find(
        (p) =>
          p.id.toLowerCase() === first.toLowerCase() ||
          p.slug.toLowerCase() === first.toLowerCase()
      );
      if (directProduct) {
        setSelectedProductId(directProduct.id);
        setIsLoginOpen(false);
        setActiveView('product-detail');
        return;
      }

      // Fallback: Default to Home
      setActiveView('home');
    },
    [
      categories,
      products,
      findCategory,
      findSubcategory,
      setActiveView,
      setSelectedCategorySlug,
      setSelectedSubcategorySlug,
      setSelectedProductId,
      setIsLoginOpen,
      setIsCartOpen,
    ]
  );

  // Derive the canonical URL path for the current app state
  const getCanonicalPath = useCallback((): string => {
    if (isLoginOpen) return '/login';
    if (activeView === 'home') return '/';
    if (activeView === 'catalogue') {
      if (selectedCategorySlug) {
        if (selectedSubcategorySlug) {
          return `/${selectedCategorySlug}/${selectedSubcategorySlug}`;
        }
        return `/${selectedCategorySlug}`;
      }
      return '/catalogue';
    }
    if (activeView === 'product-detail' && selectedProductId) {
      const prod = products.find((p) => p.id === selectedProductId);
      return prod?.slug ? `/product/${prod.slug}` : `/product/${selectedProductId}`;
    }
    if (activeView === 'contact' || activeView === 'contact-us') return '/contact';
    if (activeView === 'checkout') return '/checkout';
    if (activeView === 'track-order') return '/trackyourorder';
    if (activeView === 'account') return '/account';
    if (activeView === 'blogs') return '/blogs';
    if (activeView === 'wishlist') return '/wishlist';
    if (activeView === 'search') return '/search';
    if (activeView === 'privacy-policy') return '/privacy-policy';
    if (activeView === 'terms-conditions') return '/terms-conditions';
    if (activeView === 'cancellation-policy') return '/cancellation-policy';
    if (activeView === 'shipping-delivery') return '/shipping-policy';
    if (activeView === 'returns-exchange') return '/returns-exchange';
    if (activeView === 'stitching-services') return '/stitching-services';
    if (activeView === 'size-guide') return '/size-guide';
    if (activeView === 'faqs') return '/faqs';
    if (activeView === 'admin') return '/admin';
    return `/${activeView}`;
  }, [
    isLoginOpen,
    activeView,
    selectedCategorySlug,
    selectedSubcategorySlug,
    selectedProductId,
    products,
  ]);

  // Stable ref to latest syncPathToState so effects don't re-run and overwrite view state on internal updates
  const syncPathToStateRef = useRef(syncPathToState);
  useEffect(() => {
    syncPathToStateRef.current = syncPathToState;
  }, [syncPathToState]);

  // Direct URL on first load: sync path to activeView ONLY once on mount if user arrived directly at /kurti, /login, /product/..., etc.
  const hasInitializedPathRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitializedPathRef.current) return;
    hasInitializedPathRef.current = true;

    const initialPath = window.location.pathname;
    if (initialPath && initialPath !== '/') {
      isPopStateNavigation.current = true;
      syncPathToStateRef.current(initialPath);
    } else {
      // Visiting redmode.in or / MUST always open customer homepage, never admin
      setActiveView('home');
      setSelectedProductId(null);
      setSelectedCategorySlug(null);
      setSelectedSubcategorySlug(null);
    }
  }, [setActiveView, setSelectedProductId, setSelectedCategorySlug, setSelectedSubcategorySlug]);

  // Browser Back / Forward popstate event listener: triggers when user uses browser back or forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      isPopStateNavigation.current = true;
      syncPathToStateRef.current(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync in-app clicks & state changes to browser URL bar via pushState
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isPopStateNavigation.current) {
      isPopStateNavigation.current = false;
      return;
    }

    const targetPath = getCanonicalPath();
    const currentPath = window.location.pathname;

    if (currentPath !== targetPath) {
      window.history.pushState({ path: targetPath }, '', targetPath);
    }
  }, [getCanonicalPath]);

  // Scroll to top whenever activeView, product or subcategory changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView, selectedProductId, selectedSubcategorySlug]);

  // Distinct key for view changes
  const viewKey =
    activeView === 'product-detail'
      ? `pdp-${selectedProductId || '0'}`
      : activeView === 'catalogue'
      ? `cat-${selectedCategorySlug || 'all'}-${selectedSubcategorySlug || 'all'}`
      : activeView;

  // STRICT ADMIN ISOLATION & FIRESTORE AUTHENTICATION GUARD:
  // Strictly verify the user's role in Firestore before rendering AdminPanel.
  // If a user is not logged in as 'admin', force a redirect to the storefront homepage even if they visit /admin.
  const handleForceRedirectToHome = useCallback(() => {
    setActiveView('home');
    if (typeof window !== 'undefined') {
      window.history.replaceState({ path: '/' }, '', '/');
    }
  }, [setActiveView]);

  if (activeView === 'admin') {
    // If not authenticated, always show the secure Admin Login Gate
    if (!isAdminAuthenticated) {
      return <AdminLoginGate />;
    }

    // Once logged in, strictly verify role in Firestore before rendering AdminPanel
    return <AdminFirestoreGuard onUnauthorizedRedirect={handleForceRedirectToHome} />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'catalogue':
        return <Catalogue />;
      case 'product-detail':
        return <ProductDetail />;
      case 'checkout':
        return <Checkout />;
      case 'track-order':
        return <TrackOrder />;
      case 'account':
        return <TrackOrder />;
      case 'contact':
      case 'contact-us':
        return <ContactUs />;
      case 'blogs':
        return <Blogs />;
      case 'wishlist':
        return <WishlistView />;
      case 'search':
        return <SearchModal asPageView />;
      case 'privacy-policy':
        return <PrivacyPolicy />;
      case 'terms-conditions':
        return <TermsAndConditions />;
      case 'cancellation-policy':
        return <CancellationPolicy />;
      case 'shipping-delivery':
        return <ShippingPolicy />;
      case 'returns-exchange':
        return <ReturnsExchange />;
      case 'stitching-services':
        return <StitchingServices />;
      case 'size-guide':
        return <SizeGuide />;
      case 'faqs':
        return <FAQs />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Dynamic SEO Meta Tags & Structured Data */}
      <SeoManager />

      {/* Header with Logo, Navigation & Catalogue Dropdown */}
      <Header />

      {/* Main View Router with Instant Micro Dissolve */}
      <main className="flex-1 flex flex-col w-full relative">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={viewKey}
            variants={shouldReduceMotion ? undefined : microDissolveVariants}
            initial={shouldReduceMotion ? undefined : 'initial'}
            animate={shouldReduceMotion ? undefined : 'animate'}
            exit={shouldReduceMotion ? undefined : 'exit'}
            className="w-full flex-1 flex flex-col"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Modals & Drawers */}
      <CartDrawer />
      {activeView !== 'search' && <SearchModal />}
      <LoginModal />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StoreContent />
    </StoreProvider>
  );
}
