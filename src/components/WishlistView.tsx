import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, ColorVariant } from '../types';
import { getCacheBustedUrl } from '../utils/cacheBuster';
import {
  Heart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';

interface WishlistCardProps {
  product: Product;
  wishlistKey: string;
  variantColor?: string;
}

const WishlistCard: React.FC<WishlistCardProps> = ({
  product,
  wishlistKey,
  variantColor,
}) => {
  const { toggleWishlist, openProductDetail, addToCart, setIsCartOpen, formatPrice } = useStore();
  const isFreeSize =
    !product.sizes ||
    product.sizes.length === 0 ||
    (product.sizes.length === 1 &&
      ['free size', 'freesize', 'free-size', 'free'].includes(product.sizes[0].trim().toLowerCase()));
  const [selectedSize, setSelectedSize] = useState<string>(
    isFreeSize ? 'Free size' : (product.defaultSize || product.sizes?.[0] || 'S')
  );
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Find color variant if specified
  const activeVariant: ColorVariant | undefined = variantColor
    ? product.colorOptions?.find(
        (c) => c.name.toLowerCase() === variantColor.toLowerCase()
      )
    : product.colorOptions?.[0];

  const displayColor = variantColor || activeVariant?.name || product.color;
  const displayImage =
    activeVariant?.images?.[0] ||
    activeVariant?.image ||
    product.images?.[0] ||
    product.mainImage;

  const displayPrice = activeVariant?.price || product.price;
  const displayMrp = activeVariant?.mrp || product.mrp;
  const discountPercent =
    displayMrp > displayPrice
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : 0;

  const handleMoveToBag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    const res = addToCart(
      product,
      selectedSize,
      1,
      displayColor,
      displayImage
    );
    if (res.success) {
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        setIsAdding(false);
        setIsCartOpen(true);
      }, 350);
    } else {
      setIsAdding(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(wishlistKey);
  };

  return (
    <div className="group relative flex flex-col bg-white border border-zinc-200 hover:border-zinc-300 transition-all duration-200">
      {/* Product Image Area */}
      <div
        onClick={() => openProductDetail(product.id, displayColor)}
        className="relative aspect-3/4 w-full bg-zinc-100 overflow-hidden cursor-pointer"
      >
        <img
          src={getCacheBustedUrl(displayImage, product.updatedAt)}
          alt={product.name}
          className="w-full h-full object-cover object-top transition duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Remove from Wishlist Button */}
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-zinc-700 hover:text-rose-600 shadow-sm flex items-center justify-center transition-all duration-150 cursor-pointer z-10"
          title="Remove from wishlist"
          aria-label="Remove from wishlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Discount Tag */}
        {discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-zinc-950 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
            {discountPercent}% OFF
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1">
        {/* Product Title */}
        <h3
          onClick={() => openProductDetail(product.id, displayColor)}
          className="text-xs sm:text-[13px] font-semibold tracking-wider text-zinc-950 uppercase line-clamp-1 hover:underline cursor-pointer mb-1"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Fancy Color Name of Displayed Product */}
        <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500 font-medium truncate mb-2">
          {(displayColor || product.color || 'Standard').toUpperCase()}
        </p>

        {/* Price Row (MRP, Sale Price, Offer %, incl. of all taxes) */}
        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-3 flex-wrap">
          {displayMrp > displayPrice && (
            <span className="text-[10px] sm:text-[11px] text-zinc-400 line-through font-normal">
              {formatPrice(displayMrp)}
            </span>
          )}
          <span className="text-xs sm:text-sm font-bold text-zinc-950">
            {formatPrice(displayPrice)}
          </span>
          {discountPercent > 0 && (
            <span className="text-[10px] sm:text-[11px] font-bold text-[#D32F2F]">
              {discountPercent}% OFF
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-normal tracking-tight">
            incl. of all taxes
          </span>
        </div>

        {/* Quick Size Selection / Free Size */}
        <div className="mb-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">
            Size:
          </div>
          {isFreeSize ? (
            <span className="italic font-medium text-zinc-900 text-xs">
              Free size
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSize(s);
                  }}
                  className={`h-7 min-w-7 px-2 text-[11px] font-mono font-medium transition cursor-pointer border ${
                    selectedSize === s
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button: ADD TO BAG */}
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={handleMoveToBag}
            disabled={isAdding}
            className={`w-full py-2.5 px-3 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              addedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 hover:bg-black text-white'
            }`}
          >
            {addedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADDED TO BAG</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>MOVE TO BAG</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const WishlistView: React.FC = () => {
  const { wishlist, products, clearWishlist, setActiveView } = useStore();

  // Resolve products from wishlist keys
  // Keys can be "productId" or "productId__colorname"
  const resolvedItems = wishlist
    .map((key) => {
      const [rawId, colorKey] = key.split('__');
      const product = products.find((p) => p.id === rawId || p.id === key);
      if (!product) return null;
      return {
        product,
        wishlistKey: key,
        variantColor: colorKey,
      };
    })
    .filter(Boolean) as {
    product: Product;
    wishlistKey: string;
    variantColor?: string;
  }[];

  return (
    <div className="w-full bg-white min-h-[70vh] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider mb-6">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="hover:text-zinc-950 transition cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-950 font-semibold">My Wishlist</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-zinc-950 font-sans">
              MY WISHLIST
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              {resolvedItems.length}{' '}
              {resolvedItems.length === 1 ? 'item saved' : 'items saved'} to your
              personal wishlist
            </p>
          </div>

          {resolvedItems.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearWishlist}
                className="text-xs uppercase font-semibold tracking-wider text-zinc-500 hover:text-rose-600 transition underline underline-offset-4 cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setActiveView('catalogue')}
                className="px-4 py-2 border border-zinc-300 hover:border-zinc-900 text-zinc-900 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Content State */}
        {resolvedItems.length === 0 ? (
          /* Empty State */
          <div className="py-16 sm:py-24 text-center max-w-md mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6 text-zinc-400">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.25]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-zinc-900 mb-2">
              YOUR WISHLIST IS EMPTY
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed mb-8">
              Explore our latest arrivals, kurtis, and trousers to save your
              favorite styles for later.
            </p>
            <button
              type="button"
              onClick={() => setActiveView('catalogue')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-zinc-950 hover:bg-black text-white text-xs font-bold uppercase tracking-widest transition cursor-pointer shadow-sm"
            >
              <span>EXPLORE COLLECTION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {resolvedItems.map((item) => (
              <WishlistCard
                key={item.wishlistKey}
                product={item.product}
                wishlistKey={item.wishlistKey}
                variantColor={item.variantColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
