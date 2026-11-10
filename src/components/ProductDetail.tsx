import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Share,
  Bookmark,
  Check,
  ShoppingBag,
  Search,
  ChevronLeft,
  ChevronDown,
  X,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { SizeChartModal } from './pdp/SizeChartModal';
import { RelatedProducts } from './pdp/RelatedProducts';
import { Product, ColorVariant } from '../types';

// Color hex mapping for swatches
const COLOR_HEX_MAP: Record<string, string> = {
  white: '#FFFFFF',
  'off white': '#F4F2EE',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  black: '#1A1A1A',
  charcoal: '#333333',
  blue: '#3B82F6',
  'royal blue': '#1D4ED8',
  'sky blue': '#38BDF8',
  sky: '#0EA5E9',
  navy: '#1E293B',
  'slate blue': '#5B7083',
  'dark brown': '#3B241E',
  brown: '#5C3A21',
  tan: '#D2B48C',
  beige: '#E8D8C8',
  khaki: '#C3B091',
  grey: '#9CA3AF',
  gray: '#9CA3AF',
  'light grey': '#D1D5DB',
  'light gray': '#D1D5DB',
  'dark grey': '#4B5563',
  'dark gray': '#4B5563',
  silver: '#E2E8F0',
  green: '#15803D',
  emerald: '#047857',
  'emerald green': '#047857',
  'bottle green': '#094B2E',
  mehendi: '#5B6932',
  pista: '#93C572',
  olive: '#556B2F',
  teal: '#0D9488',
  'rama green': '#0E8388',
  rama: '#0E8388',
  red: '#DC2626',
  crimson: '#991B1B',
  ruby: '#E0115F',
  maroon: '#800000',
  wine: '#581845',
  yellow: '#EAB308',
  mustard: '#D97706',
  pink: '#EC4899',
  rose: '#E11D48',
  magenta: '#D946EF',
  fuchsia: '#C026D3',
  purple: '#7E22CE',
  lavender: '#C084FC',
  indigo: '#4B0082',
  orange: '#EA580C',
  rust: '#9A3412',
  peach: '#FDBA74',
  coral: '#F97316',
  'antique gold': '#C5A059',
  gold: '#D4AF37',
};

const resolveColorHex = (col: ColorVariant): string => {
  if (col.hex && col.hex.startsWith('#')) return col.hex;
  const normalized = col.name.trim().toLowerCase();
  if (COLOR_HEX_MAP[normalized]) return COLOR_HEX_MAP[normalized];
  for (const [key, val] of Object.entries(COLOR_HEX_MAP)) {
    if (normalized.includes(key)) return val;
  }
  return '#1A1A1A';
};

const formatSizeWithChest = (sz: string): string => {
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

export const ProductDetail: React.FC = () => {
  const {
    selectedProductId,
    setSelectedProductId,
    selectedProductColor,
    setSelectedProductColor,
    products,
    cart,
    addToCart,
    wishlist,
    toggleWishlist,
    setIsCartOpen,
    setIsSearchOpen,
    setIsLoginOpen,
    userProfile,
    setActiveView,
    settings,
    goBack,
    formatPrice,
  } = useStore();

  const product =
    products.find((p) => p.id === selectedProductId || p.slug === selectedProductId) ||
    products[0];

  // Accordion state for MORE INFO
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState<boolean>(true);

  // Selected Color state
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (selectedProductColor) return selectedProductColor;
    if (!product) return '';
    return product.color || product.colorOptions?.[0]?.name || '';
  });

  // Active Color Variant derived from selectedColor
  const activeVariant = useMemo(() => {
    if (!product || !product.colorOptions || product.colorOptions.length === 0) return null;
    return (
      product.colorOptions.find(
        (c) => c.name.toLowerCase() === (selectedColor || '').toLowerCase()
      ) || product.colorOptions[0]
    );
  }, [product, selectedColor]);

  // Variant-specific or fallback attributes
  const effectiveImages = useMemo(() => {
    if (activeVariant?.images && activeVariant.images.length > 0) {
      return activeVariant.images;
    }
    if (activeVariant?.image) {
      return [activeVariant.image, ...(product?.images || [])];
    }
    return [product?.mainImage, ...(product?.images || [])].filter(Boolean) as string[];
  }, [activeVariant, product]);

  // Size selection state
  const isFreeSize = useMemo(() => {
    if (!product?.sizes || product.sizes.length === 0) return true;
    if (
      product.sizes.length === 1 &&
      ['free size', 'freesize', 'free-size', 'free'].includes(product.sizes[0].trim().toLowerCase())
    ) {
      return true;
    }
    return false;
  }, [product?.sizes]);

  // Size selection state - initially empty per user explicit requirement (no auto-selection)
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    return isFreeSize ? 'Free size' : '';
  });
  const [sizeError, setSizeError] = useState<boolean>(false);

  const effectivePrice = useMemo(() => {
    if (selectedSize && activeVariant?.priceBySize?.[selectedSize] != null) {
      return Number(activeVariant.priceBySize[selectedSize]);
    }
    if (isFreeSize && activeVariant?.priceBySize?.['Free size'] != null) {
      return Number(activeVariant.priceBySize['Free size']);
    }
    if (activeVariant?.price != null && Number(activeVariant.price) > 0) {
      return Number(activeVariant.price);
    }
    if (selectedSize && product?.priceBySize?.[selectedSize] != null) {
      return Number(product.priceBySize[selectedSize]);
    }
    if (isFreeSize && product?.priceBySize?.['Free size'] != null) {
      return Number(product.priceBySize['Free size']);
    }
    return Number(product?.price || 0);
  }, [selectedSize, activeVariant, isFreeSize, product]);

  const rawMrp = useMemo(() => {
    if (selectedSize && activeVariant?.mrpBySize?.[selectedSize] != null) {
      return Number(activeVariant.mrpBySize[selectedSize]);
    }
    if (isFreeSize && activeVariant?.mrpBySize?.['Free size'] != null) {
      return Number(activeVariant.mrpBySize['Free size']);
    }
    if (activeVariant?.mrp != null && Number(activeVariant.mrp) > 0) {
      return Number(activeVariant.mrp);
    }
    if (selectedSize && product?.mrpBySize?.[selectedSize] != null) {
      return Number(product.mrpBySize[selectedSize]);
    }
    if (isFreeSize && product?.mrpBySize?.['Free size'] != null) {
      return Number(product.mrpBySize['Free size']);
    }
    return Number(product?.mrp || 0);
  }, [selectedSize, activeVariant, isFreeSize, product]);

  const effectiveMrp = rawMrp > effectivePrice ? rawMrp : Math.round(effectivePrice * 1.45);
  const effectiveSku =
    (selectedSize && activeVariant?.skuBySize?.[selectedSize]) ||
    (isFreeSize && activeVariant?.skuBySize?.['Free size']) ||
    (selectedSize && product?.skuBySize?.[selectedSize]) ||
    (isFreeSize && product?.skuBySize?.['Free size']) ||
    activeVariant?.sku ||
    product?.sku ||
    product?.id ||
    '';
  const effectiveStockBySize = activeVariant?.stockBySize ?? product?.stockBySize ?? {};
  const effectiveDescription = activeVariant?.description || product?.description;
  const effectiveDiscountPercent =
    effectiveMrp > effectivePrice
      ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100)
      : 0;

  // Modals & UI States
  const [isSizeChartOpen, setIsSizeChartOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isQuickSizeDrawerOpen, setIsQuickSizeDrawerOpen] = useState<boolean>(false);
  const [quickActionType, setQuickActionType] = useState<'cart' | 'buy'>('cart');
  const [activeTab, setActiveTab] = useState<'description' | 'fabric' | 'manufacturer'>('description');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isTitleExpanded, setIsTitleExpanded] = useState<boolean>(false);
  const mobileSliderRef = React.useRef<HTMLDivElement>(null);

  // Enlarged photo modal handlers
  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const handleCloseLightbox = () => {
    setLightboxIndex(null);
  };

  // Keyboard navigation and scroll lock for enlarged photo modal (Escape to close)
  useEffect(() => {
    if (lightboxIndex === null) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseLightbox();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex]);

  // Title Truncation Logic (If > 5 words, show first 3-4 words with dots, expandable on click)
  const titleWords = useMemo(() => {
    return (product?.name || '').trim().split(/\s+/).filter(Boolean);
  }, [product?.name]);
  const isTitleLong = titleWords.length > 5;
  const truncatedTitle = isTitleLong
    ? `${titleWords.slice(0, 3).join(' ')}...`
    : (product?.name || '');
  const displayTitle = isTitleExpanded || !isTitleLong ? (product?.name || '') : truncatedTitle;

  const handleMobileScroll = () => {
    if (!mobileSliderRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = mobileSliderRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      setActiveSlideIndex(Math.min(Math.max(0, idx), effectiveImages.length - 1));

      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const rawProgress = (scrollLeft / maxScroll) * (effectiveImages.length - 1);
        setScrollProgress(Math.max(0, Math.min(effectiveImages.length - 1, rawProgress)));
      } else {
        setScrollProgress(0);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    if (!mobileSliderRef.current) return;
    const clientWidth = mobileSliderRef.current.clientWidth;
    mobileSliderRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
    setActiveSlideIndex(index);
    setScrollProgress(index);
  };

  // Pincode Checker State
  const [pincode, setPincode] = useState<string>('');
  const [pincodeStatus, setPincodeStatus] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
    deliveryDate?: string;
  } | null>(null);

  // Scroll to top whenever product changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setIsTitleExpanded(false);
  }, [product?.id]);

  // Sync color & size when product or entry color changes
  useEffect(() => {
    if (product) {
      const initialCol =
        selectedProductColor || product.color || product.colorOptions?.[0]?.name || '';
      setSelectedColor(initialCol);

      // Customer explicit rule: koi size automatically selected na ho
      if (isFreeSize) {
        setSelectedSize('Free size');
      } else {
        setSelectedSize('');
      }
      setSizeError(false);
      setActiveSlideIndex(0);
      setScrollProgress(0);
      if (mobileSliderRef.current) {
        mobileSliderRef.current.scrollTo({ left: 0, behavior: 'instant' });
      }
    }
  }, [product?.id, selectedProductColor, isFreeSize]);

  // Dynamic SEO Page Title
  useEffect(() => {
    if (product?.name) {
      const colorSuffix = selectedColor ? ` - ${selectedColor}` : '';
      document.title = `${product.name}${colorSuffix} | REDMODE`;
    }
  }, [product?.name, selectedColor]);

  const handleSelectColor = (newColor: string) => {
    setSelectedColor(newColor);
    if (setSelectedProductColor) {
      setSelectedProductColor(newColor);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length === 6) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      const estDate = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      setPincodeStatus({
        checked: true,
        valid: true,
        message: `Delivery available to ${cleanPin}`,
        deliveryDate: estDate,
      });
    } else {
      setPincodeStatus({
        checked: true,
        valid: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }
  };

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-zinc-600 font-medium">Product not found.</p>
        <button
          onClick={() => setActiveView('catalogue')}
          className="mt-4 px-6 py-2.5 bg-zinc-950 text-white text-xs uppercase font-bold tracking-wider"
        >
          Return to Catalogue
        </button>
      </div>
    );
  }

  const hasMultipleColors = Boolean(product.colorOptions && product.colorOptions.length > 1);
  const pdpWishlistKey =
    hasMultipleColors && selectedColor
      ? `${product.id}__${selectedColor.toLowerCase().trim()}`
      : product.id;
  const isWishlisted = wishlist.includes(pdpWishlistKey) || wishlist.includes(product.id);

  const handleAddToCart = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Mandatory Account Login Check
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    if (!isFreeSize && !selectedSize) {
      setQuickActionType('cart');
      setIsQuickSizeDrawerOpen(true);
      return;
    }
    const sizeToUse = isFreeSize ? 'Free size' : selectedSize;
    addToCart(
      product,
      sizeToUse,
      1,
      selectedColor,
      effectiveImages[0]
    );
    setIsCartOpen(true);
  };

  const handleBuyNow = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Mandatory Account Login Check
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    if (!isFreeSize && !selectedSize) {
      setQuickActionType('buy');
      setIsQuickSizeDrawerOpen(true);
      return;
    }
    const sizeToUse = isFreeSize ? 'Free size' : selectedSize;
    addToCart(
      product,
      sizeToUse,
      1,
      selectedColor,
      effectiveImages[0]
    );
    setActiveView('checkout');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleQuickSelectSize = (sz: string) => {
    // Mandatory Account Login Check
    if (!userProfile.isLoggedIn) {
      setIsQuickSizeDrawerOpen(false);
      setIsLoginOpen(true);
      return;
    }

    const stockCount = effectiveStockBySize[sz] ?? effectiveStockBySize[sz.toUpperCase()] ?? 10;
    if (stockCount <= 0) return;
    setSelectedSize(sz);
    setSizeError(false);
    setIsQuickSizeDrawerOpen(false);

    if (quickActionType === 'buy') {
      addToCart(product, sz, 1, selectedColor, effectiveImages[0]);
      setActiveView('checkout');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      addToCart(product, sz, 1, selectedColor, effectiveImages[0]);
      setIsCartOpen(true);
    }
  };

  const handleToggleWishlist = () => {
    // Mandatory Account Login Check
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    toggleWishlist(pdpWishlistKey);
  };

  const loyaltyPoints = Math.round(effectivePrice * 0.04);

  return (
    <div id="redmode-product-detail-page" className="bg-white text-zinc-900 pb-28 sm:pb-8 font-sans relative">
      {/* ========================================================================= */}
      {/* FIXED TRANSPARENT ICONS STRIPE OVER PRODUCT PHOTO                         */}
      {/* Left: < (Back) | Right: Search, Save (Wishlist), Add to Cart              */}
      {/* Background is completely transparent (no white circles)                    */}
      {/* ========================================================================= */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="w-full bg-transparent py-2.5 sm:py-3.5 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* 1. Back < button */}
            <button
              type="button"
              id="pdp-floating-back-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goBack();
              }}
              className="pointer-events-auto p-2 bg-transparent text-black hover:opacity-75 transition active:scale-90 cursor-pointer flex items-center justify-center"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.4] text-black" />
            </button>

            {/* Right utility buttons: Search | Save | Add to Cart */}
            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5">
              {/* 2. Search Icon */}
              <button
                type="button"
                id="pdp-floating-search-btn"
                onClick={() => setIsSearchOpen(true)}
                className="p-2 bg-transparent text-black hover:opacity-75 transition active:scale-90 cursor-pointer flex items-center justify-center"
                title="Search Products"
                aria-label="Search"
              >
                <Search className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[1.4] text-black" />
              </button>

              {/* 3. Save Icon (Bookmark) */}
              <button
                type="button"
                id="pdp-floating-save-btn"
                onClick={handleToggleWishlist}
                className="p-2 bg-transparent text-black hover:opacity-75 transition active:scale-90 cursor-pointer flex items-center justify-center"
                title={isWishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
                aria-label="Save to Wishlist"
              >
                <Bookmark
                  className={`w-5.5 h-5.5 sm:w-6 sm:h-6 ${
                    isWishlisted ? 'fill-[#E52229] stroke-[#E52229]' : 'stroke-[1.4] text-black'
                  }`}
                />
              </button>

              {/* 4. Add to Cart / Bag Icon */}
              <button
                type="button"
                id="pdp-floating-cart-btn"
                onClick={() => {
                  if (!userProfile.isLoggedIn) {
                    setIsLoginOpen(true);
                    return;
                  }
                  setIsCartOpen(true);
                }}
                className="p-2 bg-transparent text-black hover:opacity-75 transition active:scale-90 cursor-pointer relative flex items-center justify-center"
                title="Shopping Bag"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[1.4] text-black" />
                {cart && cart.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#E52229] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono shadow-xs animate-badge-pop">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-4">
        {/* Main 2-Column Product Detail Layout (Matching User Reference Image) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Full Product Image Gallery (Desktop Grid / Mobile Slider)    */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 xl:col-span-7 relative">

            {/* Desktop Editorial Images Grid: 2 images wide (Edge-to-edge full photo) */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-2.5 lg:gap-3">
              {effectiveImages.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  onClick={() => handleOpenLightbox(idx)}
                  className="relative aspect-[3/4] bg-zinc-100 overflow-hidden cursor-pointer group select-none"
                >
                  {/* Base Image */}
                  <img
                    src={img}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />

                  {/* Best Seller Badge on First Image */}
                  {idx === 0 && (
                    <div className="absolute top-14 left-3 bg-[#2b2b2b]/90 text-white text-[11px] font-medium tracking-wide px-3.5 py-1.5 shadow-sm backdrop-blur-xs pointer-events-none z-10">
                      Best Seller
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Scrollable Image View with Horizontal Line Slide Indicator */}
            <div className="sm:hidden relative w-full">
              <div
                ref={mobileSliderRef}
                onScroll={handleMobileScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none w-full"
              >
                {effectiveImages.map((img, idx) => (
                  <div
                    key={`mob-${img}-${idx}`}
                    onClick={() => handleOpenLightbox(idx)}
                    className="relative aspect-[3/4] w-full shrink-0 snap-center overflow-hidden bg-zinc-100 cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover object-top"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                    {idx === 0 && (
                      <div className="absolute top-14 left-3 bg-[#2b2b2b]/90 text-white text-[10px] font-medium tracking-wide px-3 py-1 shadow-sm backdrop-blur-xs">
                        Best Seller
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Distinctive Segmented Sliding Line Indicator over product photo */}
              {effectiveImages.length > 1 && (
                <div className="absolute bottom-3.5 inset-x-0 z-20 flex justify-center items-center pointer-events-none select-none">
                  <div className="pointer-events-auto flex items-center gap-1.5 py-1 px-2">
                    {effectiveImages.map((_, i) => {
                      const isActive = activeSlideIndex === i;
                      return (
                        <button
                          key={`slide-line-${i}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToSlide(i);
                          }}
                          className={`cursor-pointer transition-all duration-300 ease-out rounded-full ${
                            isActive
                              ? 'w-7 sm:w-8 h-[2.5px] bg-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]'
                              : 'w-2 sm:w-2.5 h-[2px] bg-white/45 hover:bg-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                          }`}
                          title={`Go to photo ${i + 1}`}
                          aria-label={`Photo slide ${i + 1} of ${effectiveImages.length}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Clean, Minimalist Product Panel (Matching Rare Rabbit Image) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 space-y-4 px-4 sm:px-0 lg:pl-2">
            {/* Row 1: Product Title (Light weight, 3 words + dots if > 5 words, expandable on click) & Bookmark/Share */}
            <div className="flex items-start justify-between gap-3">
              <h1
                onClick={() => isTitleLong && setIsTitleExpanded((prev) => !prev)}
                className={`text-base sm:text-lg lg:text-xl font-light uppercase tracking-wide text-zinc-900 leading-snug font-sans ${
                  isTitleLong ? 'cursor-pointer select-none hover:text-zinc-600 transition' : ''
                }`}
                title={isTitleLong ? (isTitleExpanded ? 'Click to show less' : 'Click to see full title') : undefined}
              >
                {displayTitle}
              </h1>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`p-1.5 transition cursor-pointer ${
                    isWishlisted ? 'text-zinc-950' : 'text-zinc-700 hover:text-black'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  aria-label="Wishlist"
                >
                  <Bookmark
                    className={`w-5 h-5 ${
                      isWishlisted ? 'fill-zinc-950 stroke-zinc-950' : 'stroke-[1.5]'
                    }`}
                  />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-1.5 text-zinc-700 hover:text-black transition cursor-pointer"
                    title="Share product"
                    aria-label="Share"
                  >
                    <Share className="w-5 h-5 stroke-[1.5]" />
                  </button>
                  {copiedLink && (
                    <span className="absolute right-0 top-8 bg-zinc-950 text-white text-[10px] font-bold px-2 py-1 whitespace-nowrap shadow-md z-20">
                      Link Copied!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Fancy Color Name directly under product title */}
            <p className="text-xs font-light uppercase tracking-widest text-zinc-500 font-sans">
              {(selectedColor || product.color || 'Standard').toUpperCase()}
            </p>

            {/* Row 3: Pricing (phle MRP, fir sale price, fir percent offer, fir incl. of taxes) */}
            <div className="flex items-baseline gap-2 sm:gap-2.5 flex-wrap">
              <span className="text-xs sm:text-sm text-zinc-400 line-through font-normal">
                {formatPrice(effectiveMrp)}
              </span>
              <span className="text-lg sm:text-xl font-bold text-zinc-950">
                {formatPrice(effectivePrice)}
              </span>
              {effectiveDiscountPercent > 0 && (
                <span className="text-xs sm:text-sm font-bold text-[#D32F2F]">
                  {effectiveDiscountPercent}% OFF
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-zinc-400 font-normal tracking-tight">
                incl. of taxes
              </span>
            </div>

            {/* Color Options: Shown only inside product page after click */}
            {product.colorOptions && product.colorOptions.length > 1 && (
              <div className="pt-2">
                {/* Rectangle Swatches: only color visible in rectangle, no text */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {product.colorOptions.map((opt) => {
                    const isSelected = (selectedColor || '').toLowerCase() === opt.name.toLowerCase();
                    const hex = COLOR_HEX_MAP[opt.name.toLowerCase()] || opt.hex || '#6b7280';
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => handleSelectColor(opt.name)}
                        className={`relative w-9 h-6 sm:w-10 sm:h-7 rounded-none border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-zinc-950 ring-2 ring-zinc-950 ring-offset-1 scale-105'
                            : 'border-zinc-300 hover:border-zinc-700'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={opt.name}
                        aria-label={opt.name}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 4: SIZE Section (No size automatically selected on click) */}
            <div id="pdp-size-section" className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                  SIZE
                </span>
                {!isFreeSize && (
                  <button
                    type="button"
                    onClick={() => setIsSizeChartOpen(true)}
                    className="text-xs text-zinc-800 hover:text-black underline underline-offset-4 tracking-wide cursor-pointer transition"
                  >
                    Size Chart
                  </button>
                )}
              </div>

              {/* Free size in italics or Size Buttons Grid */}
              {isFreeSize ? (
                <div className="py-1">
                  <span className="italic font-medium text-zinc-900 text-sm tracking-wide">
                    Free size
                  </span>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-5 gap-2 max-w-md">
                    {(product.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL']).map((sz) => {
                      const isSelected = selectedSize === sz;
                      const isStockAvailable =
                        (effectiveStockBySize[sz] ?? product.stockBySize?.[sz] ?? 1) > 0;

                      return (
                        <div key={sz} className="flex flex-col items-center">
                          <button
                            type="button"
                            disabled={!isStockAvailable}
                            onClick={() => {
                              if (selectedSize === sz) {
                                setSelectedSize('');
                              } else {
                                setSelectedSize(sz);
                                setSizeError(false);
                              }
                            }}
                            className={`w-full h-10 flex items-center justify-center text-xs tracking-wider transition cursor-pointer border ${
                              isSelected
                                ? 'border-zinc-950 bg-zinc-950 text-white font-bold'
                                : !isStockAvailable
                                ? 'border-zinc-200 text-zinc-300 line-through cursor-not-allowed bg-zinc-50'
                                : sizeError
                                ? 'border-red-400 text-zinc-900 bg-white hover:border-zinc-900'
                                : 'border-zinc-300 hover:border-zinc-900 text-zinc-900 bg-white'
                            }`}
                          >
                            {sz}
                          </button>
                          {!isStockAvailable && (
                            <span className="text-[10px] text-red-600 font-medium mt-1">
                              Notify Me
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {sizeError && (
                    <p className="text-xs text-red-600 font-medium mt-1.5 animate-pulse">
                      Please select a size
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Row 5: DELIVERY STATUS (PIN Code Delivery Checker) */}
            <div className="pt-3 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-950 block">
                DELIVERY STATUS
              </span>
              <form onSubmit={handleCheckPincode} className="flex gap-0 max-w-md border border-zinc-300 focus-within:border-zinc-950">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter PIN code"
                  className="flex-1 px-3.5 py-2.5 text-xs tracking-wide placeholder:text-zinc-400 focus:outline-hidden font-sans bg-transparent"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0"
                >
                  CHECK
                </button>
              </form>

              {pincodeStatus && (
                <p
                  className={`text-xs mt-1.5 font-medium ${
                    pincodeStatus.valid ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {pincodeStatus.message}
                  {pincodeStatus.deliveryDate && (
                    <span className="block text-[11px] text-zinc-600 mt-0.5">
                      Estimated Delivery by <strong>{pincodeStatus.deliveryDate}</strong> • Free Express Delivery • COD Available
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Row 6: ACTION BUTTONS (BUY NOW & ADD TO CART) - Hidden on mobile because mobile uses the fixed bottom action bar */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-3 pt-2">
              <button
                id="pdp-buy-now-btn"
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3.5 border border-zinc-950 bg-white hover:bg-zinc-50 text-zinc-950 text-xs font-bold tracking-widest uppercase transition flex items-center justify-center cursor-pointer"
              >
                BUY NOW
              </button>

              <button
                id="pdp-add-to-cart-btn"
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold tracking-widest uppercase transition flex items-center justify-center cursor-pointer shadow-xs"
              >
                ADD TO CART
              </button>
            </div>

            {/* Row 7: MORE INFO (Dropdown / Accordion - click toggles full product details) */}
            <div className="pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsMoreInfoOpen((prev) => !prev)}
                className="w-full py-3.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-950 hover:text-black transition cursor-pointer select-none"
              >
                <span>MORE INFO</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 text-zinc-700 ${
                    isMoreInfoOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isMoreInfoOpen && (
                <div className="pt-1 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Tab Navigation (DESCRIPTION, FABRIC & CARE, MANUFACTURER) */}
                  <div className="flex items-center gap-4 sm:gap-6 border-b border-zinc-200 pb-2 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setActiveTab('description')}
                      className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider transition cursor-pointer pb-2 whitespace-nowrap relative ${
                        activeTab === 'description'
                          ? 'text-zinc-950 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-700'
                      }`}
                    >
                      DESCRIPTION
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('fabric')}
                      className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider transition cursor-pointer pb-2 whitespace-nowrap relative ${
                        activeTab === 'fabric'
                          ? 'text-zinc-950 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-700'
                      }`}
                    >
                      FABRIC & CARE
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('manufacturer')}
                      className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider transition cursor-pointer pb-2 whitespace-nowrap relative ${
                        activeTab === 'manufacturer'
                          ? 'text-zinc-950 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-700'
                      }`}
                    >
                      MANUFACTURER DETAILS
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="pt-4 text-xs text-zinc-600 leading-relaxed font-sans">
                    {activeTab === 'description' && (
                      <div className="space-y-3">
                        <p className="whitespace-pre-line text-zinc-700">
                          {effectiveDescription ||
                            `Elevate your ethnic wardrobe with this exclusive designer creation from REDMODE. Crafted from premium breathable pure fabric, it combines rich craftsmanship with modern comfort. Designed for versatile festive, office, and casual celebrations.`}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-zinc-600 border-t border-zinc-100">
                          <div>
                            <span className="font-semibold text-zinc-900">Fabric: </span>
                            {product.fabric || '100% Pure Premium Cotton'}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900">Fit: </span>
                            {product.fit || 'Regular Comfort Fit'}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900">Occasion: </span>
                            Festive & Daily Luxury
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900">Care: </span>
                            Hand Wash / Gentle Machine Wash
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'fabric' && (
                      <div className="space-y-2 text-zinc-700">
                        <p>• <strong>Material:</strong> {product.fabric || '100% Cotton / Premium Viscose'}</p>
                        <p>• <strong>Feel:</strong> Ultra-soft on skin, breathable for all-day comfort.</p>
                        <p>• <strong>Washing Instructions:</strong> Cold water gentle wash with mild detergent. Do not bleach. Dry in shade.</p>
                      </div>
                    )}

                    {activeTab === 'manufacturer' && (
                      <div className="space-y-2 text-[11px] text-zinc-700">
                        <div className="flex justify-between py-1 border-b border-zinc-100">
                          <span className="text-zinc-500">Company Name</span>
                          <span className="font-medium text-zinc-900">RedMode</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-100">
                          <span className="text-zinc-500">Country of Origin</span>
                          <span className="font-medium text-zinc-900">India</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-100">
                          <span className="text-zinc-500">Commodity</span>
                          <span className="font-medium text-zinc-900">Ethnic Apparel</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-100">
                          <span className="text-zinc-500">Net Quantity</span>
                          <span className="font-medium text-zinc-900">1 Unit</span>
                        </div>
                        <div className="flex justify-between gap-4 py-1 border-b border-zinc-100">
                          <span className="text-zinc-500 shrink-0">Manufactured &amp; Marketed By</span>
                          <span className="font-medium text-zinc-900 text-right">
                            RedMode, 1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-100">
                          <span className="text-zinc-500">Contact Number</span>
                          <span className="font-medium text-zinc-900 text-right">7302797464</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-zinc-500">Email</span>
                          <span className="font-medium text-zinc-900 text-right">
                            MyRedMode@gmail.com
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LOWER SECTIONS: Similar Products                                          */}
        {/* ========================================================================= */}
        <div className="mt-12 border-t border-zinc-200 pt-8 px-4 sm:px-0">
          <RelatedProducts currentProduct={product} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FULL-WIDTH ENLARGED PRODUCT ZOOM (NO LEFT/RIGHT WHITE GAPS, TRULY BIG) */}
      {/* ========================================================================= */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-white overflow-y-auto overflow-x-hidden select-none cursor-zoom-out"
          onClick={handleCloseLightbox}
        >
          {/* Top-Right Clean Minimal Black Cross Button */}
          <button
            type="button"
            id="cancel-zoom-cross-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseLightbox();
            }}
            className="fixed top-3 right-3 sm:top-5 sm:right-6 z-50 p-2.5 sm:p-3 text-zinc-900 hover:text-black bg-white/90 hover:bg-white rounded-full transition cursor-pointer shadow-md active:scale-90"
            title="Close Zoom (Esc)"
            aria-label="Close Zoom"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
          </button>

          {/* Edge-to-Edge Big Zoom Image (No left-right white gaps on mobile, truly large photo) */}
          <div
            className="w-full min-h-screen flex items-center justify-center p-0 sm:p-4 md:p-6"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseLightbox();
            }}
          >
            <img
              key={`enlarged-${lightboxIndex}`}
              src={effectiveImages[lightboxIndex]}
              alt={`${product.name} enlarged view`}
              className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-auto object-cover select-none cursor-zoom-out"
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUICK SIZE BOTTOM-SHEET DRAWER                                         */}
      {/* Slides up smoothly when tapping Add to Cart / Buy Now without a size      */}
      {/* ========================================================================= */}
      {isQuickSizeDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-overlay"
          onClick={() => setIsQuickSizeDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl p-5 pb-8 space-y-4 animate-bottom-sheet border-t border-zinc-200"
          >
            {/* Top Sheet Header: Thumbnail, Name, Price & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
              <div className="flex items-center gap-3">
                <img
                  src={effectiveImages[0]}
                  alt={product.name}
                  className="w-12 h-16 object-cover object-top rounded-xs border border-zinc-200 shrink-0"
                />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-950 uppercase tracking-wide line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-sm font-extrabold text-zinc-950">
                      {formatPrice(effectivePrice)}
                    </span>
                    {effectiveMrp > effectivePrice && (
                      <span className="text-xs text-zinc-400 line-through">
                        {formatPrice(effectiveMrp)}
                      </span>
                    )}
                    {effectiveDiscountPercent > 0 && (
                      <span className="text-xs font-bold text-[#E52229]">
                        {effectiveDiscountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickSizeDrawerOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-950 transition cursor-pointer rounded-full hover:bg-zinc-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Size Prompt & Size Chart Link */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest uppercase text-zinc-900">
                SELECT YOUR SIZE
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsQuickSizeDrawerOpen(false);
                  setIsSizeChartOpen(true);
                }}
                className="text-[11px] font-semibold text-zinc-600 hover:text-black underline underline-offset-2 transition cursor-pointer"
              >
                Size Guide
              </button>
            </div>

            {/* Size Options Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {(product.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL']).map((sz) => {
                const stockCount = effectiveStockBySize[sz] ?? effectiveStockBySize[sz.toUpperCase()] ?? 10;
                const isOutOfStock = stockCount <= 0;
                const isLowStock = stockCount > 0 && stockCount <= 3;
                const formattedLabel = formatSizeWithChest(sz);

                return (
                  <button
                    key={`quick-size-${sz}`}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleQuickSelectSize(sz)}
                    className={`py-3 px-2 flex flex-col items-center justify-center border transition-all cursor-pointer relative ${
                      isOutOfStock
                        ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed line-through opacity-60'
                        : 'border-zinc-300 bg-white hover:border-black hover:bg-zinc-50 active:scale-95 text-zinc-950'
                    }`}
                  >
                    <span className="font-sans text-xs font-bold tracking-wider">
                      {formattedLabel}
                    </span>
                    {isLowStock && (
                      <span className="text-[9px] font-semibold text-[#E52229] mt-0.5 tracking-tight">
                        Only {stockCount} left
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-zinc-500 text-center pt-2">
              Tap any size to immediately {quickActionType === 'buy' ? 'proceed to Checkout' : 'add to your Shopping Bag'}.
            </p>
          </div>
        </div>
      )}

      {/* Size Chart Modal */}
      <SizeChartModal
        isOpen={isSizeChartOpen}
        onClose={() => setIsSizeChartOpen(false)}
        sizeChart={product.sizeChart}
        selectedSize={selectedSize}
        category={product.category}
      />

      {/* Mobile Sticky Bottom Action Bar (Fixed like Rare Rabbit) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-3 py-2.5 grid grid-cols-2 gap-2.5 shadow-lg">
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full py-3 border border-zinc-950 bg-white text-zinc-950 text-xs font-bold tracking-widest uppercase transition cursor-pointer"
        >
          BUY NOW
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full py-3 bg-zinc-950 text-white text-xs font-bold tracking-widest uppercase transition cursor-pointer shadow"
        >
          ADD TO CART
        </button>
      </div>
    </div>
  );
};
