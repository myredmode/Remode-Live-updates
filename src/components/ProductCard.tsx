import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Bookmark, ShoppingBag, X, Check, Bell } from 'lucide-react';
import { getCacheBustedUrl } from '../utils/cacheBuster';

interface ProductCardProps {
  product: Product;
  variantColor?: string;
  photoOnly?: boolean;
  hideColorOptions?: boolean;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variantColor,
  photoOnly = false,
  hideColorOptions = false,
  priority = false,
}) => {
  const {
    openProductDetail,
    setSelectedProductId,
    setActiveView,
    addToCart,
    setIsCartOpen,
    wishlist,
    toggleWishlist,
    incrementProductViews,
    userProfile,
    setIsLoginOpen,
    formatPrice,
  } = useStore();

  const [isHovered, setIsHovered] = useState(false);
  const [isSizeSelectorOpen, setIsSizeSelectorOpen] = useState(false);
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isNotifyDrawerOpen, setIsNotifyDrawerOpen] = useState(false);
  const [notifyContact, setNotifyContact] = useState(userProfile.mobileOrEmail || '');
  const [isNotified, setIsNotified] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('redmode_notify_me_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.some((item: any) => item.productId === product.id);
      }
    } catch {}
    return false;
  });

  // Active color state: can be updated via variant prop or user clicking swatches
  const [activeColor, setActiveColor] = useState<string>(
    variantColor || product.color || product.colorOptions?.[0]?.name || ''
  );

  // Sync if variantColor prop changes
  React.useEffect(() => {
    if (variantColor) {
      setActiveColor(variantColor);
    }
  }, [variantColor]);

  const effectiveColor = activeColor || variantColor || product.color || product.colorOptions?.[0]?.name || '';

  const hasMultipleColors = Boolean(product.colorOptions && product.colorOptions.length > 1);
  const cardColor = effectiveColor || (hasMultipleColors ? (product.colorOptions?.[0]?.name || product.color) : '');
  const wishlistKey = hasMultipleColors && cardColor
    ? `${product.id}__${cardColor.toLowerCase().trim()}`
    : product.id;

  const isWishlisted = wishlist.includes(wishlistKey) || wishlist.includes(product.id);

  const activeColorOption = product.colorOptions?.find(
    (c) => c.name.toLowerCase() === effectiveColor.toLowerCase()
  ) || (product.colorOptions && product.colorOptions.length > 0 ? product.colorOptions[0] : undefined);

  // Primary image with cache-busting versioning — always prefer real uploaded photos over sample placeholders
  const candidateImages = [
    activeColorOption?.image,
    ...(activeColorOption?.images || []),
    product.mainImage,
    ...(product.images || []),
  ].filter((u): u is string => Boolean(u && typeof u === 'string'));

  const realPrimary =
    candidateImages.find((u) => u.startsWith('data:image/')) ||
    candidateImages.find((u) => !u.includes('images.unsplash.com') && !u.startsWith('/uploads/')) ||
    candidateImages[0] ||
    '';
  const primaryImage = getCacheBustedUrl(realPrimary, product.updatedAt);

  // Secondary image on hover (if available) with cache-busting
  const rawSecondary =
    candidateImages.find(
      (u) =>
        u !== realPrimary &&
        !u.includes('images.unsplash.com') &&
        !u.startsWith('/uploads/')
    ) || null;
  const secondaryImage = rawSecondary ? getCacheBustedUrl(rawSecondary, product.updatedAt) : null;

  const hasSecondaryImage = Boolean(secondaryImage && secondaryImage !== primaryImage);

  // Clean, readable title
  const displayTitle = product.name || 'Untitled Garment';

  // Subtitle detail (e.g. "Kenway - Red" / "Chikankari - White" / Color name)
  const fancyColorName = (
    effectiveColor ||
    product.color ||
    product.colorOptions?.[0]?.name ||
    'Standard'
  );

  const subtitleDetail = React.useMemo(() => {
    if (product.subcategory && fancyColorName) {
      return `${product.subcategory} - ${fancyColorName}`;
    }
    if (product.fabric && fancyColorName) {
      return `${product.fabric} - ${fancyColorName}`;
    }
    return fancyColorName;
  }, [product.subcategory, product.fabric, fancyColorName]);

  // Color hex mapper
  const getColorHex = (colorName: string): string => {
    const map: Record<string, string> = {
      red: '#DC2626',
      maroon: '#800000',
      burgundy: '#831843',
      wine: '#881337',
      white: '#FFFFFF',
      'off-white': '#F4F4F5',
      cream: '#FEF08A',
      black: '#18181B',
      blue: '#2563EB',
      navy: '#1E3A8A',
      green: '#16A34A',
      emerald: '#059669',
      olive: '#65A30D',
      yellow: '#EAB308',
      mustard: '#D97706',
      gold: '#EAB308',
      pink: '#EC4899',
      rose: '#F43F5E',
      peach: '#FDBA74',
      purple: '#9333EA',
      lavender: '#C084FC',
      beige: '#F5F5DC',
      tan: '#D2B48C',
      brown: '#78350F',
      grey: '#71717A',
      gray: '#71717A',
    };
    const key = colorName.toLowerCase().trim();
    for (const [name, hex] of Object.entries(map)) {
      if (key.includes(name)) return hex;
    }
    return '#A1A1AA';
  };

  // Stock checks
  const stockMap = activeColorOption?.stockBySize || product.stockBySize || {};
  const stockEntries = Object.entries(stockMap);
  const totalStock = stockEntries.reduce((sum, [, count]) => sum + (Number(count) || 0), 0);
  const isOutOfStock = product.inStock === false || (totalStock <= 0 && stockEntries.length > 0);

  const saveNotifyRequest = (contactVal: string) => {
    try {
      const saved = localStorage.getItem('redmode_notify_me_list');
      const list = saved ? JSON.parse(saved) : [];
      const next = [
        {
          productId: product.id,
          productName: product.name,
          color: effectiveColor || '',
          contact: contactVal || userProfile.mobileOrEmail || 'Customer',
          createdAt: new Date().toISOString(),
        },
        ...(Array.isArray(list) ? list.filter((i: any) => i.productId !== product.id) : []),
      ];
      localStorage.setItem('redmode_notify_me_list', JSON.stringify(next));
    } catch {}
    setIsNotified(true);
    setIsNotifyDrawerOpen(false);
  };

  const handleNotifyMeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isNotified) return;
    if (userProfile.isLoggedIn && userProfile.mobileOrEmail) {
      saveNotifyRequest(userProfile.mobileOrEmail);
      return;
    }
    setNotifyContact(userProfile.mobileOrEmail || '');
    setIsNotifyDrawerOpen((prev) => !prev);
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!notifyContact.trim()) return;
    saveNotifyRequest(notifyContact.trim());
  };

  // Pricing
  const cardPrice = activeColorOption?.price ?? product.price;
  const cardMrp = activeColorOption?.mrp ?? product.mrp;

  const discountPercent =
    cardMrp > cardPrice
      ? Math.round(((cardMrp - cardPrice) / cardMrp) * 100)
      : 0;

  const isFreeSize =
    !product.sizes ||
    product.sizes.length === 0 ||
    (product.sizes.length === 1 &&
      ['free size', 'freesize', 'free-size', 'free'].includes(product.sizes[0].trim().toLowerCase()));

  const availableSizes = isFreeSize
    ? ['Free size']
    : (product.sizes && product.sizes.length > 0
        ? product.sizes
        : ['S', 'M', 'L', 'XL', 'XXL']);

  const isSizeInStock = (sz: string) => {
    if (!stockMap || Object.keys(stockMap).length === 0) return true;
    const count =
      stockMap[sz] ??
      stockMap[sz.toLowerCase()] ??
      stockMap[sz.toUpperCase()];
    if (count === undefined) return true;
    return Number(count) > 0;
  };

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

  // Card click: opens product detail
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (openProductDetail) {
      openProductDetail(product.id, effectiveColor || undefined);
    } else {
      setSelectedProductId(product.id);
      setActiveView('product-detail');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    // Increment product views quietly in background
    setTimeout(() => {
      try {
        incrementProductViews(product.id);
      } catch (err) {}
    }, 100);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    toggleWishlist(wishlistKey);
  };

  const handleBagIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    if (isOutOfStock) return;
    setIsSizeSelectorOpen((prev) => !prev);
  };

  const handleSelectSizeAndAdd = (e: React.MouseEvent, sz: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userProfile.isLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    if (!isSizeInStock(sz) || isOutOfStock) return;

    addToCart(
      product,
      sz,
      1,
      effectiveColor || undefined,
      primaryImage
    );

    setAddedSize(sz);
    setIsSizeSelectorOpen(false);
    setIsCartOpen(true);
  };

  // Swatches display calculation (Show up to 3 swatches + "+X" count matching reference)
  const colorOptionsList = product.colorOptions || [];
  const maxVisibleSwatches = 3;
  const displayedSwatches = colorOptionsList.slice(0, maxVisibleSwatches);
  const remainingColorsCount = Math.max(0, colorOptionsList.length - maxVisibleSwatches);

  // Badge text
  const badgeText = React.useMemo(() => {
    if (product.offerTag) {
      const lower = product.offerTag.toLowerCase();
      if (lower.includes('best')) return 'Best Seller';
      if (lower.includes('price') || lower.includes('drop')) return 'Price Drop';
      if (lower.includes('new')) return 'New Arrival';
      return product.offerTag.toUpperCase();
    }
    if (discountPercent >= 40) return 'First Time on Discount';
    if (discountPercent > 0) return `${discountPercent}% OFF`;
    return null;
  }, [product.offerTag, discountPercent]);

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer flex flex-col bg-transparent transition-all duration-200 rounded-none overflow-hidden select-none"
    >
      {/* 1. PRODUCT IMAGE AREA (Dominant Rectangular Container) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100">
        {!isImageLoaded && (
          <div className="absolute inset-0 bg-zinc-200 animate-shimmer pointer-events-none z-0" />
        )}

        {/* Primary Product Image */}
        <img
          src={primaryImage}
          alt={product.seo?.imageAlt || product.name}
          onLoad={() => setIsImageLoaded(true)}
          className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
            isHovered && hasSecondaryImage ? 'opacity-0' : 'opacity-100'
          } ${isImageLoaded ? 'visible' : 'invisible'}`}
          loading={priority ? 'eager' : 'lazy'}
          onError={(e) => {
            setIsImageLoaded(true);
            const fallback = candidateImages.find((u) => u !== realPrimary && u.startsWith('data:image/'));
            if (fallback && e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
        />

        {/* Secondary Product Image (Smooth fade on hover if available) */}
        {hasSecondaryImage && (
          <img
            src={secondaryImage!}
            alt={`${product.name} alternate view`}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 pointer-events-none ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        )}

        {/* Top-Left Subtle Badge (Matching Reference: e.g. First Time on Discount, Price Drop) */}
        {!photoOnly && badgeText && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="font-sans text-[8.5px] sm:text-[9px] tracking-wider uppercase font-medium text-white bg-zinc-950/85 px-2 py-0.5 select-none">
              {badgeText}
            </span>
          </div>
        )}

        {/* Top-Right Wishlist Icon (Minimal Floating Bookmark Ribbon) */}
        {!photoOnly && (
          <button
            type="button"
            onClick={handleWishlistClick}
            className="absolute top-2 right-2 p-1.5 transition-transform duration-150 active:scale-90 z-10 text-zinc-900 cursor-pointer drop-shadow-xs"
            title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Bookmark
              className={`w-4 h-4 transition-colors duration-150 ${
                isWishlisted
                  ? 'fill-[#E52229] stroke-[#E52229]'
                  : 'stroke-[1.3] fill-none stroke-zinc-900'
              }`}
            />
          </button>
        )}

        {/* Out of Stock Badge & Notify Me (Photo remains 100% clear, no blur) */}
        {isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between gap-1.5 bg-gradient-to-t from-black/65 via-black/25 to-transparent z-10">
            <span className="font-sans bg-zinc-950/90 text-white text-[9.5px] sm:text-[10px] uppercase tracking-wider px-2 py-1 font-semibold">
              Out of Stock
            </span>
            {!photoOnly && (
              <button
                type="button"
                onClick={handleNotifyMeClick}
                className={`font-sans text-[9.5px] sm:text-[10px] uppercase tracking-wider px-2.5 py-1 font-semibold flex items-center gap-1 transition cursor-pointer shadow-xs ${
                  isNotified
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                {isNotified ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Notified</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3" />
                    <span>Notify Me</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Notify Me Drawer (Opens when product is Out of Stock and user clicks Notify Me) */}
      {!photoOnly && isOutOfStock && isNotifyDrawerOpen && !isNotified && (
        <form
          onSubmit={handleNotifySubmit}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-50 border-t border-b border-zinc-200 px-2.5 py-2 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] uppercase tracking-wider font-semibold text-zinc-900">
              Get Restock Alert
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotifyDrawerOpen(false);
              }}
              className="text-zinc-400 hover:text-zinc-900 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              required
              placeholder="Mobile or Email..."
              value={notifyContact}
              onChange={(e) => setNotifyContact(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-white border border-zinc-300 text-zinc-900 outline-none focus:border-zinc-950"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-zinc-800 cursor-pointer shrink-0"
            >
              Notify
            </button>
          </div>
        </form>
      )}

      {/* Quick Size Selector Drawer (Opens when clicking cart icon) */}
      {!photoOnly && isSizeSelectorOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white border-t border-b border-zinc-200 px-3 py-2.5 transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-sans text-[10px] uppercase tracking-wider font-semibold text-zinc-900">
              SELECT SIZE
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSizeSelectorOpen(false);
              }}
              className="text-zinc-400 hover:text-zinc-950 transition p-1 cursor-pointer"
              title="Close size selector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {isFreeSize ? (
            <div className="py-1">
              <button
                type="button"
                onClick={(e) => handleSelectSizeAndAdd(e, 'Free size')}
                className="w-full font-sans text-xs py-2 px-3 text-center transition cursor-pointer flex items-center justify-center gap-1.5 bg-zinc-950 text-white hover:bg-zinc-800"
              >
                {addedSize === 'Free size' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="italic font-normal">Added (Free size)</span>
                  </>
                ) : (
                  <>
                    <span className="italic font-normal">Free size</span>
                    <span className="text-[11px] text-zinc-400 font-normal">— Add to Bag</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-y-2 gap-x-1.5 py-1">
              {availableSizes.map((sz) => {
                const formatted = formatSizeLabel(sz);
                const inStock = isSizeInStock(sz);
                const isJustAdded = addedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!inStock}
                    onClick={(e) => handleSelectSizeAndAdd(e, sz)}
                    className={`font-sans text-xs py-1 px-1 text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                      isJustAdded
                        ? 'text-emerald-700 font-bold'
                        : inStock
                        ? 'text-zinc-800 hover:text-rose-700 font-medium'
                        : 'text-zinc-300 line-through cursor-not-allowed'
                    }`}
                  >
                    {isJustAdded && <Check className="w-3 h-3 text-emerald-600" />}
                    <span>{formatted}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRODUCT INFORMATION (Exact Reference Hierarchy) */}
      {!photoOnly && (
        <div className="pt-2 sm:pt-2.5 px-0.5 sm:px-1 pb-1 flex-1 flex flex-col justify-between text-zinc-900 bg-white">
          <div className="space-y-1">
            {/* 2. PRODUCT TITLE & QUICK ACTION BAG / NOTIFY ICON */}
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="font-sans text-xs sm:text-[13px] font-normal text-zinc-900 tracking-normal truncate flex-1 leading-snug">
                {displayTitle}
              </h3>
              {isOutOfStock ? (
                <button
                  type="button"
                  onClick={handleNotifyMeClick}
                  className={`px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1 border transition cursor-pointer shrink-0 ${
                    isNotified
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                      : 'border-zinc-300 text-zinc-800 hover:border-zinc-950 bg-zinc-50'
                  }`}
                  title={isNotified ? 'Restock alert active' : 'Notify me when back in stock'}
                >
                  {isNotified ? <Check className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                  <span>{isNotified ? 'Notified' : 'Notify Me'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBagIconClick}
                  className="p-0.5 text-zinc-400 hover:text-zinc-950 transition cursor-pointer shrink-0"
                  title="Quick Add to Bag"
                  aria-label="Quick Add to Bag"
                >
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[1.2]" />
                </button>
              )}
            </div>

            {/* 3. OPTIONAL PRODUCT VARIANT / COLOR / SHORT DETAIL */}
            {/* Mobile: Do not show color on outside card. Desktop: Show full detail with color */}
            <p className="font-sans text-[11px] sm:text-xs text-zinc-500 font-normal truncate leading-tight">
              <span className="md:hidden">{product.subcategory || product.fabric || ''}</span>
              <span className="hidden md:inline">{subtitleDetail}</span>
            </p>

            {/* 4, 5, 6. PRICE DISPLAY: Original MRP strikethrough, Current Price bold, Discount in red */}
            <div className="flex items-baseline gap-1.5 sm:gap-2 font-sans pt-0.5">
              {cardMrp > cardPrice && (
                <span className="text-[11px] sm:text-xs text-zinc-400 line-through font-normal">
                  {formatPrice(cardMrp)}
                </span>
              )}
              <span className="text-xs sm:text-[13px] font-semibold text-zinc-950">
                {formatPrice(cardPrice)}
              </span>
              {discountPercent > 0 && (
                <span className="text-[11px] sm:text-xs font-semibold text-rose-600">
                  {discountPercent}%
                </span>
              )}
            </div>

            {/* 7. COLOR SWATCHES (Visible on desktop; hidden on mobile per user specification) */}
            {!hideColorOptions && hasMultipleColors && displayedSwatches.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 pt-1">
                {displayedSwatches.map((opt) => {
                  const hex = getColorHex(opt.name);
                  const isMulti = opt.name.toLowerCase().includes('multi');
                  const isCurrent = (effectiveColor || '').toLowerCase() === opt.name.toLowerCase();
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveColor(opt.name);
                      }}
                      className={`w-3 h-3 rounded-[1px] border transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-1 ring-zinc-950 border-zinc-900 scale-105'
                          : 'border-zinc-300 hover:border-zinc-500'
                      }`}
                      style={
                        isMulti
                          ? {
                              background:
                                'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #10b981 50%, #3b82f6 75%, #ec4899 100%)',
                            }
                          : { backgroundColor: hex }
                      }
                      title={opt.name}
                      aria-label={opt.name}
                    />
                  );
                })}
                {remainingColorsCount > 0 && (
                  <span className="text-[10px] text-zinc-500 font-normal select-none">
                    +{remainingColorsCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
