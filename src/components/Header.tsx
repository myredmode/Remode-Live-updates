import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { MenuHighlightItem } from '../types';
import { RedModeLogo } from './RedModeLogo';
import {
  Search,
  User,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  PhoneCall,
  Truck,
  Home,
  Grid,
  Sparkles,
  Globe,
} from 'lucide-react';

interface HeaderProps {
  onOpenLogin?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLogin, onOpenSearch }) => {
  const {
    activeView,
    setActiveView,
    categories,
    selectedCategorySlug,
    setSelectedCategorySlug,
    selectedSubcategorySlug,
    setSelectedSubcategorySlug,
    setSubcategoriesShowcaseCategorySlug,
    setSelectedProductId,
    setSelectedBlogId,
    setSearchQuery,
    cart,
    wishlist,
    setIsCartOpen,
    setCartDrawerView,
    isSearchOpen,
    setIsSearchOpen,
    setIsLoginOpen,
    userProfile,
    settings,
    goBack,
    currency,
    setCurrency,
    userCountry,
  } = useStore();

  const announcementConfig = settings?.announcementBar;
  const isAnnouncementEnabled = announcementConfig?.enabled !== false;
  const announcementMessages =
    announcementConfig?.messages && announcementConfig.messages.length > 0
      ? announcementConfig.messages
      : [
          'FLAT 10% OFF ON ALL PREPAID ORDERS | CODE: REDMODE10',
          'FREE EXPRESS SHIPPING ACROSS INDIA',
          'CASH ON DELIVERY (COD) AVAILABLE',
          'EASY 7-DAY SIZE EXCHANGE & RETURNS',
          'NEW FESTIVE KURTI COLLECTION IS LIVE',
        ];
  const announcementCouponCode = announcementConfig?.couponCode || 'REDMODE10';
  const announcementSpeed = announcementConfig?.speedSeconds || 20;
  const showOnDesktop = announcementConfig?.showOnDesktop !== false;

  // Check if customer is browsing intermediate subcategories screen
  // Subcategories page should have NO top header and NO banner stripe so photos are 100% full
  const activeCategoryObj = useMemo(() => {
    if (!selectedCategorySlug) return undefined;
    const s = selectedCategorySlug.toLowerCase();
    return categories.find(
      (c) => c.slug.toLowerCase() === s || c.name.toLowerCase() === s
    );
  }, [categories, selectedCategorySlug]);

  const hasSubcategories = Boolean(
    activeCategoryObj?.subcategories && activeCategoryObj.subcategories.length > 0
  );
  const isBrowsingSubcategoriesScreen = false;
  const isProductDetailPage = activeView === 'product-detail';
  // Header is ALWAYS visible on subsection (subcategories screen) & catalogue
  // Only hidden on product detail page
  const shouldHideTopHeader = isProductDetailPage;
  const isHomePage = activeView === 'home';

  const [isKurtiDropdownOpen, setIsKurtiDropdownOpen] = useState(false);
  const [isMobileKurtiOpen, setIsMobileKurtiOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedOffer, setCopiedOffer] = useState(false);
  const [menuActiveTab, setMenuActiveTab] = useState<'kurti' | 'embroidery' | 'trouser' | 'sets'>('kurti');
  const [menuLeftFocus, setMenuLeftFocus] = useState<'new-in' | 'the-edit' | 'festive' | 'clothing'>('clothing');

  const activeMenuHighlights = useMemo(() => {
    return (settings?.menuHighlights || []).filter(
      (h) => h.isEnabled && h.title.trim().toLowerCase() !== 'home'
    );
  }, [settings?.menuHighlights]);

  const handleMenuHighlightClick = (item: MenuHighlightItem) => {
    setIsMobileMenuOpen(false);
    if (item.targetType === 'category' && item.targetValue) {
      handleCategoryNav(item.targetValue);
    } else if (item.targetType === 'tag' && item.targetValue) {
      handleCategoryNav(`tag:${item.targetValue}`);
    } else if (item.targetValue) {
      handleCategoryNav(item.targetValue);
    } else {
      handleCategoryNav(null);
    }
  };

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'dark':
        return 'bg-zinc-900 text-white';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
  };

  const kurtiMenuRef = useRef<HTMLDivElement>(null);
  const shopMenuRef = useRef<HTMLDivElement>(null);

  const handleCopyOffer = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(announcementCouponCode);
      }
      setCopiedOffer(true);
      setTimeout(() => setCopiedOffer(false), 2500);
    } catch (e) {
      setCopiedOffer(true);
      setTimeout(() => setCopiedOffer(false), 2500);
    }
  };

  const renderAnnouncementItem = (msg: string, key: string | number) => {
    const codeMatch = msg.match(/(.*CODE:\s*)([A-Z0-9_-]+)(.*)/i);
    if (codeMatch) {
      return (
        <span key={key} className="flex items-center gap-1.5 text-zinc-900 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E52229] shrink-0" />
          <span>{codeMatch[1]}</span>
          <strong className="text-black font-extrabold underline decoration-[#E52229] underline-offset-2">
            {codeMatch[2]}
          </strong>
          <span>{codeMatch[3]}</span>
        </span>
      );
    }
    return (
      <span key={key} className="flex items-center gap-1.5 text-zinc-900 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E52229] shrink-0" />
        <span>{msg}</span>
      </span>
    );
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kurtiMenuRef.current && !kurtiMenuRef.current.contains(event.target as Node)) {
        setIsKurtiDropdownOpen(false);
      }
      if (shopMenuRef.current && !shopMenuRef.current.contains(event.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Return to homepage, clear nested views, and scroll to top smoothly
  const handleGoHome = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedCategorySlug(null);
    setSelectedSubcategorySlug(null);
    setSelectedProductId(null);
    setSelectedBlogId(null);
    setSearchQuery('');
    setIsMobileMenuOpen(false);
    setIsKurtiDropdownOpen(false);
    setIsMobileKurtiOpen(false);
    setIsShopDropdownOpen(false);
    setIsSearchOpen(false);
    setIsCartOpen(false);
    setActiveView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back button handler for mobile top bar ("<")
  const handleBack = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    goBack();
  };

  const handleOpenSearch = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      setActiveView('search');
      setIsSearchOpen(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  };

  const handleOpenLogin = () => {
    setIsMobileMenuOpen(false);
    if (userProfile.isLoggedIn) {
      setActiveView('account');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleCategoryNav = (categorySlug?: string | null) => {
    setSelectedCategorySlug(categorySlug || null);
    setSelectedSubcategorySlug(null);
    setSubcategoriesShowcaseCategorySlug(null);
    setSelectedProductId(null);
    setActiveView('catalogue');
    setIsKurtiDropdownOpen(false);
    setIsShopDropdownOpen(false);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleShopNavigation = (categorySlug?: string, subcategorySlug?: string) => {
    setSelectedCategorySlug(categorySlug || null);
    setSelectedSubcategorySlug(subcategorySlug || null);
    setSubcategoriesShowcaseCategorySlug(null);
    setSelectedProductId(null);
    setActiveView('catalogue');
    setIsShopDropdownOpen(false);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. TOP RUNNING OFFER TICKER (White BG & Black Text)        */}
      {/* Shown on non-home pages; hidden on Home, Subcat & PDP      */}
      {/* ========================================================= */}
      {!isHomePage && !isBrowsingSubcategoriesScreen && !shouldHideTopHeader && isAnnouncementEnabled && announcementMessages.length > 0 && (
        <div
          onClick={handleCopyOffer}
          className={`${
            showOnDesktop ? 'w-full' : 'md:hidden w-full'
          } bg-white text-zinc-950 py-1.5 px-3 text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] uppercase overflow-hidden cursor-pointer select-none border-b border-zinc-200/90 transition hover:bg-zinc-50 group relative z-50 shadow-2xs`}
          title={`Tap to copy code ${announcementCouponCode}`}
        >
          {copiedOffer ? (
            <div className="text-center text-zinc-900 font-bold tracking-wider py-0.5 animate-in fade-in flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E52229]" />
              <span className="text-[#E52229] font-black">
                COUPON CODE "{announcementCouponCode}" COPIED!
              </span>
              <span className="text-zinc-600 font-medium text-[10px] sm:text-[11px]">
                (FLAT 10% OFF ON PREPAID)
              </span>
            </div>
          ) : (
            <div
              className="animate-marquee whitespace-nowrap flex items-center gap-8"
              style={{ animationDuration: `${announcementSpeed}s` }}
            >
              {/* Group 1 */}
              <div className="flex items-center gap-8 shrink-0">
                {announcementMessages.map((msg, idx) =>
                  renderAnnouncementItem(msg, `ann-g1-${idx}`)
                )}
              </div>
              {/* Group 2 (Identical duplicate for infinite seamless loop) */}
              <div className="flex items-center gap-8 shrink-0" aria-hidden="true">
                {announcementMessages.map((msg, idx) =>
                  renderAnnouncementItem(msg, `ann-g2-${idx}`)
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!shouldHideTopHeader && (
        <header className={`sticky top-0 z-50 bg-white border-b border-zinc-200 transition-all font-sans ${isBrowsingSubcategoriesScreen ? 'hidden md:block' : ''}`}>
          {isHomePage && (
            /* ========================================================= */
            /* MOBILE HOME PAGE TOP: SLEEK COMPACT LOGO IN CENTER        */
            /* Mobile only (md:hidden) - Desktop gets the full navbar    */
            /* ========================================================= */
            <div className="md:hidden w-full flex items-center justify-center py-1.5 sm:py-2 bg-white">
              <button
                type="button"
                id="header-logo-mobile-home"
                onClick={handleGoHome}
                className="flex items-center justify-center focus:outline-none p-0.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                aria-label="REDMODE - Home"
                title="Return to Home"
              >
                <img
                  src="/assets/redmode-official-emblem.png?v=10"
                  alt="REDMODE"
                  className="h-7 sm:h-8 w-auto max-w-[140px] sm:max-w-[180px] object-contain select-none"
                />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* STANDARD FULL NAVBAR FOR DESKTOP (ALWAYS) & MOBILE (NON-HOME) */}
          {/* ========================================================= */}
          <div className={`w-full px-3 sm:px-6 lg:px-8 ${isHomePage ? 'hidden md:block' : ''}`}>
            <div className="flex items-center justify-between h-11 sm:h-12 md:h-12 gap-2 sm:gap-3 lg:gap-4 relative">
            
            {/* ========================================================= */}
            {/* LEFT SIDE NAVIGATION (Rare Rabbit typography & alignment) */}
            {/* ========================================================= */}
            <div className="flex items-center justify-start shrink-0">
              {/* Mobile Back Button ("<") */}
              <button
                id="header-mobile-back-btn"
                type="button"
                onClick={handleBack}
                className="p-1.5 -ml-1 text-zinc-900 hover:text-black md:hidden transition flex items-center justify-center cursor-pointer select-none"
                aria-label="Go Back"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Desktop Categories Navigation */}
              <nav className="hidden md:flex items-center gap-3 sm:gap-3.5 lg:gap-4 text-xs lg:text-[12.5px] tracking-[0.08em] uppercase text-zinc-800 whitespace-nowrap">
                {/* 1. Kurti (with dropdown: Long kurti, Short kurti, Kurti set, All Kurtis) */}
                <div
                  ref={kurtiMenuRef}
                  className="relative py-2"
                  onMouseEnter={() => setIsKurtiDropdownOpen(true)}
                  onMouseLeave={() => setIsKurtiDropdownOpen(false)}
                >
                  <button
                    type="button"
                    id="header-nav-kurtis"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsKurtiDropdownOpen((prev) => !prev);
                    }}
                    aria-expanded={isKurtiDropdownOpen}
                    aria-haspopup="true"
                    className={`transition flex items-center gap-1 hover:text-black cursor-pointer select-none ${
                      activeView === 'catalogue' &&
                      (selectedCategorySlug === 'kurti' ||
                        selectedCategorySlug === 'long-kurti' ||
                        selectedCategorySlug === 'short-kurti' ||
                        selectedCategorySlug === 'kurti-set')
                        ? 'text-black font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black'
                        : 'text-zinc-700 font-normal'
                    }`}
                  >
                    <span>Kurti</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${
                        isKurtiDropdownOpen ? 'rotate-180 text-black' : ''
                      }`}
                    />
                  </button>

                  {/* Submenu Dropdown */}
                  {isKurtiDropdownOpen && (
                    <div
                      className="absolute left-0 top-full -mt-0.5 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150 shadow-2xl"
                      onMouseEnter={() => setIsKurtiDropdownOpen(true)}
                      onMouseLeave={() => setIsKurtiDropdownOpen(false)}
                    >
                      <div className="bg-white border border-zinc-200 shadow-xl rounded-none p-1.5 space-y-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryNav('long-kurti');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-between ${
                            selectedCategorySlug === 'long-kurti'
                              ? 'font-bold text-black bg-zinc-100'
                              : 'text-zinc-700 font-medium hover:bg-zinc-50 hover:text-black'
                          }`}
                        >
                          <span>Long Kurti</span>
                          {selectedCategorySlug === 'long-kurti' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryNav('short-kurti');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-between ${
                            selectedCategorySlug === 'short-kurti'
                              ? 'font-bold text-black bg-zinc-100'
                            : 'text-zinc-700 font-medium hover:bg-zinc-50 hover:text-black'
                        }`}
                      >
                        <span>Short Kurti</span>
                        {selectedCategorySlug === 'short-kurti' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryNav('kurti-set');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-between ${
                          selectedCategorySlug === 'kurti-set'
                            ? 'font-bold text-black bg-zinc-100'
                            : 'text-zinc-700 font-medium hover:bg-zinc-50 hover:text-black'
                        }`}
                      >
                        <span>Kurti Set</span>
                        {selectedCategorySlug === 'kurti-set' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </button>
                      <div className="pt-1.5 border-t border-zinc-100 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryNav('kurti');
                          }}
                          className="w-full text-left px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-500 hover:text-black hover:bg-zinc-50 transition cursor-pointer flex items-center justify-between"
                        >
                          <span>All Kurtis</span>
                          <span className="text-zinc-400">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Embroidery */}
              <button
                type="button"
                id="header-nav-embroidery"
                onClick={() => handleCategoryNav('embroidered-kurti')}
                className={`py-2 transition relative hover:text-black cursor-pointer ${
                  activeView === 'catalogue' &&
                  (selectedCategorySlug === 'embroidered-kurti' || selectedCategorySlug === 'embroidery')
                    ? 'text-black font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black'
                    : 'text-zinc-700 font-normal'
                }`}
              >
                Embroidery
              </button>

              {/* 3. Trousers */}
              <button
                type="button"
                id="header-nav-trousers"
                onClick={() => handleCategoryNav('trouser')}
                className={`py-2 transition relative hover:text-black cursor-pointer ${
                  activeView === 'catalogue' &&
                  (selectedCategorySlug === 'trouser' || selectedCategorySlug === 'bottom')
                    ? 'text-black font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black'
                    : 'text-zinc-700 font-normal'
                }`}
              >
                Trousers
              </button>

              {/* 4. Jewellery */}
              <button
                type="button"
                id="header-nav-jewellery"
                onClick={() => {
                  handleCategoryNav('jewellery');
                  setIsKurtiDropdownOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 transition relative hover:text-black cursor-pointer ${
                  activeView === 'catalogue' &&
                  (selectedCategorySlug === 'jewellery' || selectedCategorySlug === 'jewelry')
                    ? 'text-black font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black'
                    : 'text-zinc-700 font-normal'
                }`}
              >
                Jewellery
              </button>

              {/* Dynamic Additional Categories from Admin Panel */}
              {categories
                .filter(
                  (c) =>
                    !['kurti', 'kurti-sets', 'kurti-set', 'trouser', 'bottom', 'jewellery', 'jewelry'].includes(
                      (c.slug || '').toLowerCase()
                    )
                )
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      handleCategoryNav(cat.slug);
                      setIsKurtiDropdownOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 transition relative hover:text-black cursor-pointer ${
                      activeView === 'catalogue' && selectedCategorySlug === cat.slug
                        ? 'text-black font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black'
                        : 'text-zinc-700 font-normal'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}

              </nav>
          </div>

          {/* ========================================================= */}
          {/* BRAND IDENTITY: CLEAN GRAPHIC LOGO (100% Center on Desktop & Mobile) */}
          {/* ========================================================= */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shrink-0 z-10 pointer-events-auto">
            <button
              type="button"
              id="header-logo"
              onClick={handleGoHome}
              className="flex items-center justify-center focus:outline-none py-0.5 px-1 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
              aria-label={`${settings?.businessName || 'REDMODE'} - Return to Home`}
              title="Return to Home"
            >
              <img
                src="/assets/redmode-official-emblem.png?v=10"
                alt={settings?.businessName || 'REDMODE'}
                className="h-7 sm:h-7.5 md:h-8 w-auto max-w-[140px] sm:max-w-[160px] object-contain select-none transition-transform"
              />
            </button>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE ACTIONS: WISHLIST | BAG                        */}
          {/* Mobile: ONLY Favorite & Bag (Search & Account in bottom bar) */}
          {/* Desktop: SEARCH | ACCOUNT | WISHLIST | BAG                */}
          {/* ========================================================= */}
          <div className="flex items-center gap-3 sm:gap-3.5 lg:gap-4 justify-end text-xs lg:text-[12.5px] tracking-[0.08em] uppercase text-zinc-800 whitespace-nowrap shrink-0">
            {/* SEARCH */}
            <button
              id="header-search-btn"
              onClick={handleOpenSearch}
              className="hidden sm:flex items-center gap-1.5 font-normal text-zinc-800 hover:text-black transition cursor-pointer py-1"
              title="Search"
              aria-label="Search"
            >
              <span>SEARCH</span>
            </button>

            {/* LOG IN / ACCOUNT */}
            <button
              id="header-account-btn"
              onClick={handleOpenLogin}
              className="hidden sm:flex items-center gap-1.5 font-normal text-zinc-800 hover:text-black transition cursor-pointer py-1 relative"
              title={
                userProfile.isLoggedIn
                  ? `Signed in as ${userProfile.name || userProfile.mobileOrEmail}`
                  : 'Log In'
              }
              aria-label="Account"
            >
              <span>
                {userProfile.isLoggedIn ? 'ACCOUNT' : 'LOG IN'}
              </span>
              {userProfile.isLoggedIn && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-0.5" />
              )}
            </button>

            {/* WISHLIST / FAVORITE */}
            <button
              id="header-wishlist-btn"
              onClick={() => {
                setActiveView('wishlist');
              }}
              className={`group flex items-center gap-1.5 font-normal transition cursor-pointer py-1 relative ${
                activeView === 'wishlist'
                  ? 'text-black font-semibold'
                  : 'text-zinc-800 hover:text-black'
              }`}
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart
                className={`w-[18px] h-[18px] sm:hidden stroke-[1.25] ${
                  wishlist.length > 0 ? 'fill-[#E52229] stroke-[#E52229] text-[#E52229]' : 'fill-none text-zinc-900'
                }`}
              />
              <span className="hidden sm:inline">
                WISHLIST{wishlist.length > 0 ? ` (${wishlist.length})` : ''}
              </span>
              {wishlist.length > 0 && (
                <span className="sm:hidden w-3.5 h-3.5 text-[8px] font-bold bg-[#E52229] text-white rounded-full flex items-center justify-center font-mono absolute -top-1 -right-1">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* BAG */}
            <button
              id="header-cart-btn"
              onClick={() => {
                setCartDrawerView('full-cart');
                setIsCartOpen(true);
              }}
              className="group flex items-center gap-1.5 font-normal text-zinc-900 hover:text-black transition cursor-pointer py-1 relative"
              title="Shopping Bag"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-[17px] h-[17px] sm:hidden stroke-[1.25] text-zinc-900" />
              <span className="hidden sm:inline">
                BAG ({totalCartCount})
              </span>
              {totalCartCount > 0 && (
                <span className="sm:hidden w-3.5 h-3.5 text-[8.5px] font-bold bg-[#E52229] text-white rounded-full flex items-center justify-center font-mono absolute -top-1 -right-1.5 shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
    )}

      {/* ========================================================= */}
      {/* 2. RARE RABBIT MINIMAL SLIDE DRAWER (NON-EXPANDABLE MENU)  */}
      {/* Categories always display subsections directly underneath  */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-start animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            className="relative w-[86vw] max-w-[375px] h-full bg-white flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-left duration-250 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Brand Logo & Minimal Close Button */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-white shrink-0">
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-[0.04em] uppercase">
                  <span className="text-[#E52229]">RED</span>
                  <span className="text-zinc-900">MODE</span>
                </span>
                <span className="text-[9px] tracking-[0.03em] italic text-zinc-500 font-normal ml-3">
                  ~made on loom
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-black rounded-full hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
                aria-label="Close Navigation Menu"
              >
                <X className="w-5 h-5 stroke-[1.8]" />
              </button>
            </div>

            {/* Scrollable Navigation Area - pb-28 ensures entire menu is 100% visible above bottom nav bar */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 pb-28">
              {/* Quick Highlights / Launches (Managed from Admin Panel - hidden when disabled or empty) */}
              {activeMenuHighlights.length > 0 && (
                <div className="space-y-2.5 pb-4 border-b border-zinc-150">
                  {activeMenuHighlights.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMenuHighlightClick(item)}
                      className="w-full text-left py-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-900 hover:text-[#E52229] transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${getBadgeStyle(
                              item.badgeColor
                            )}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Main Shopping Categories (NON-EXPANDABLE, Subsections always shown underneath) */}
              <div className="space-y-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  SHOP BY CATEGORY
                </div>

                {/* 1. KURTIS */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryNav('kurti')}
                    className="w-full text-left group cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 group-hover:text-[#E52229] transition">
                      KURTIS
                    </span>
                  </button>

                  {/* Subsections permanently visible underneath */}
                  <div className="space-y-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('kurti', 'sub-printed')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Printed Kurtis (Jaipur Block)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('kurti', 'sub-embroidered')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Embroidered Kurtis (Zari Work)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('kurti', 'sub-solids')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Solids &amp; Mulmul Daily Wear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('kurti', 'anarkali')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Anarkali &amp; Flared Silhouettes
                    </button>
                  </div>
                </div>

                {/* 2. TROUSERS & BOTTOMS */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => handleCategoryNav('trouser')}
                    className="w-full text-left group cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 group-hover:text-[#E52229] transition">
                      TROUSERS &amp; BOTTOMS
                    </span>
                  </button>

                  {/* Subsections permanently visible underneath */}
                  <div className="space-y-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('trouser', 'sub-straight-fit')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Straight Fit Cigarette Pants
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('trouser', 'sub-regular-fit')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Flared High-Waist Palazzos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('trouser', 'cotton-pants')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Cotton Stretch Trousers
                    </button>
                  </div>
                </div>

                {/* 3. KURTI SETS */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => handleCategoryNav('kurti-set')}
                    className="w-full text-left group cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 group-hover:text-[#E52229] transition">
                      KURTI SETS
                    </span>
                  </button>

                  {/* Subsections permanently visible underneath */}
                  <div className="space-y-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('kurti-set', 'daily-sets')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      2-Piece Everyday Kurti Pant Sets
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('kurti-set', 'festive-sets')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      3-Piece Festive Velvet &amp; Silk Sets (with Dupatta)
                    </button>
                  </div>
                </div>

                {/* 4. JEWELLERY */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => handleCategoryNav('jewellery')}
                    className="w-full text-left group cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 group-hover:text-[#E52229] transition">
                      JEWELLERY
                    </span>
                  </button>

                  {/* Subsections permanently visible underneath */}
                  <div className="space-y-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('jewellery', 'kundan')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Kundan &amp; Pearl Choker Sets
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('jewellery', 'jhumkas')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Oxidised Silver Jhumkas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShopNavigation('jewellery', 'earrings')}
                      className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                    >
                      Traditional Statement Earrings
                    </button>
                  </div>
                </div>

                {/* Dynamic Additional Categories from Admin Panel */}
                {categories
                  .filter(
                    (c) =>
                      !['kurti', 'kurti-sets', 'kurti-set', 'trouser', 'bottom', 'jewellery', 'jewelry'].includes(
                        (c.slug || '').toLowerCase()
                      )
                  )
                  .map((cat) => (
                    <div key={cat.id} className="py-4 border-b border-zinc-200/80">
                      <div className="w-full flex items-center justify-between py-1 text-left">
                        <button
                          type="button"
                          onClick={() => handleShopNavigation(cat.slug)}
                          className={`text-sm uppercase tracking-[0.14em] transition cursor-pointer hover:text-[#E52229] ${
                            activeView === 'catalogue' && selectedCategorySlug === cat.slug
                              ? 'text-[#E52229] font-extrabold'
                              : 'text-zinc-950 font-bold'
                          }`}
                        >
                          {cat.name}
                        </button>
                      </div>
                      {Array.isArray(cat.subcategories) && cat.subcategories.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          {cat.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleShopNavigation(cat.slug, sub.slug)}
                              className="block w-full text-left py-1 text-xs text-zinc-600 hover:text-black hover:translate-x-1 font-medium tracking-[0.08em] transition cursor-pointer"
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    {/* ========================================================= */}
    {/* 3. MOBILE BOTTOM NAVIGATION BAR (FIXED EVERYWHERE EXCEPT PDP) */}
    {/* Hidden on Product Detail Page so BUY NOW & ADD TO CART bar is 100% visible */}
    {/* Icons only (No text labels) in exact requested order:    */}
    {/* 1. Home | 2. Search | 3. Menu | 4. Account | 5. Track | 6. Bag */}
    {/* ========================================================= */}
    {!isProductDetailPage && (
      <nav
        aria-label="Mobile Navigation"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-zinc-200/80 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] px-1.5 flex items-center justify-around shadow-[0_-2px_12px_rgba(0,0,0,0.04)] select-none font-sans"
      >
      {/* 1. HOME ICON */}
      <button
        type="button"
        id="bottom-nav-home"
        onClick={handleGoHome}
        aria-label="Home"
        title="Home"
        className={`flex-1 h-9 transition cursor-pointer flex items-center justify-center ${
          activeView === 'home' ? 'text-[#E52229]' : 'text-zinc-700 hover:text-black'
        }`}
      >
        <Home className="w-5 h-5 stroke-[1.4]" />
      </button>

      {/* 2. SEARCH ICON */}
      <button
        type="button"
        id="bottom-nav-search"
        onClick={handleOpenSearch}
        aria-label="Search"
        title="Search"
        className={`flex-1 h-9 transition cursor-pointer flex items-center justify-center ${
          activeView === 'search' || isSearchOpen ? 'text-black' : 'text-zinc-700 hover:text-black'
        }`}
      >
        <Search className="w-5 h-5 stroke-[1.4]" />
      </button>

      {/* 3. MENU TEXT (Restored font style, size, weight - no underline) */}
      <button
        type="button"
        id="bottom-nav-menu"
        onClick={() => {
          if (activeView === 'track-order') {
            setActiveView('home');
          }
          setIsMobileMenuOpen((prev) => !prev);
        }}
        aria-label="Menu"
        title="Menu"
        className={`flex-1 h-9 transition cursor-pointer flex items-center justify-center select-none ${
          isMobileMenuOpen ? 'text-[#E52229]' : 'text-zinc-800 hover:text-black'
        }`}
      >
        <span className="text-[12px] font-semibold tracking-[0.05em] leading-none uppercase">
          MENU
        </span>
      </button>

      {/* 4. ACCOUNT ICON */}
      <button
        type="button"
        id="bottom-nav-account"
        onClick={handleOpenLogin}
        aria-label="Account"
        title={userProfile.isLoggedIn ? userProfile.name || 'Account' : 'Log In'}
        className={`flex-1 h-9 transition cursor-pointer flex items-center justify-center relative ${
          userProfile.isLoggedIn ? 'text-black' : 'text-zinc-700 hover:text-black'
        }`}
      >
        <User className="w-5 h-5 stroke-[1.4]" />
        {userProfile.isLoggedIn && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute top-1.5 right-3.5" />
        )}
      </button>

      {/* 5. TYO (TRACK YOUR ORDER - Restored font style, size, weight - no underline) */}
      <button
        type="button"
        id="bottom-nav-track"
        onClick={() => {
          setIsMobileMenuOpen(false);
          setActiveView('track-order');
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }}
        aria-label="Track Your Order (TYO)"
        title="Track Your Order"
        className={`flex-1 h-9 transition cursor-pointer flex items-center justify-center select-none ${
          !isMobileMenuOpen && activeView === 'track-order' ? 'text-[#E52229]' : 'text-zinc-800 hover:text-black'
        }`}
      >
        <span className="text-[12px] font-semibold tracking-[0.05em] leading-none uppercase">
          TYO
        </span>
      </button>

      {/* 6. BAG ICON */}
      <button
        type="button"
        id="bottom-nav-bag"
        onClick={() => {
          setCartDrawerView('full-cart');
          setIsCartOpen(true);
        }}
        aria-label="Shopping Bag"
        title="Bag"
        className="flex-1 h-9 text-zinc-900 hover:text-[#E52229] transition cursor-pointer flex items-center justify-center relative"
      >
        <div className="relative flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 stroke-[1.4]" />
          {totalCartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 text-[8px] font-bold bg-[#E52229] text-white rounded-full flex items-center justify-center font-mono shadow-xs animate-badge-pop">
              {totalCartCount}
            </span>
          )}
        </div>
      </button>
    </nav>
    )}
  </>
  );
};
