import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { getCacheBustedUrl } from '../utils/cacheBuster';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartSubtotal,
    autoDiscountAmount,
    isAutoDiscountApplied,
    cartGstAmount,
    deliveryFee,
    cartTotalAmount,
    appliedCoupon,
    couponDiscountAmount,
    setActiveView,
    settings,
    lastAddedItem,
    cartDrawerView,
    setCartDrawerView,
    products,
    openProductDetail,
    formatPrice,
    userProfile,
    setIsLoginOpen,
  } = useStore();

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isCartOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isCartOpen]);

  const threshold = settings.autoDiscountThreshold || 999;
  const discountPercent = settings.autoDiscountPercent || 10;
  const remainingForOffer = Math.max(0, threshold - cartSubtotal);

  const handleProceedToCheckout = () => {
    // Mandatory customer login
    if (!userProfile.isLoggedIn) {
      setIsCartOpen(false);
      setIsLoginOpen(true);
      return;
    }
    setIsCartOpen(false);
    setActiveView('checkout');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleShopNow = () => {
    setIsCartOpen(false);
    setActiveView('catalogue');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Recommendations for "BUILD YOUR WARDROBE"
  const wardrobeRecommendations = products
    .filter((p) => p.id !== lastAddedItem?.product.id && p.published !== false)
    .slice(0, 6);

  // Determine if we should show the "Added to Bag" notification screen
  const showAddedNotification =
    cartDrawerView === 'added-notification' && lastAddedItem !== null;

  return createPortal(
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <motion.div
              initial={{ x: shouldReduceMotion ? 0 : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: shouldReduceMotion ? 0 : '100%' }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-screen max-w-md sm:max-w-lg h-full bg-white border-l border-zinc-200 flex flex-col shadow-2xl font-sans"
              onClick={(e) => e.stopPropagation()}
            >
          {/* ========================================================================= */}
          {/* VIEW 1: "SIZE [XXL-46] ADDED TO YOUR BAG" (Exact match to reference image) */}
          {/* ========================================================================= */}
          {showAddedNotification ? (
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
              {/* Top Bar with Close Button */}
              <div className="px-6 pt-6 pb-2 flex items-center justify-end">
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-zinc-800 hover:text-black transition"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5 stroke-[1.75]" />
                </button>
              </div>

              {/* Header: SIZE [XXL-46] ADDED TO YOUR BAG */}
              <div className="px-6 sm:px-8 pb-5 pt-1 animate-stagger-1">
                <h2 className="text-sm sm:text-base tracking-wide text-zinc-900 uppercase">
                  <span className="font-bold">
                    SIZE {lastAddedItem.formattedSize || lastAddedItem.size}
                  </span>{' '}
                  <span className="font-normal text-zinc-800">
                    ADDED TO YOUR BAG
                  </span>
                </h2>
              </div>

              {/* Added Product Card Row */}
              <div className="px-6 sm:px-8 py-3 flex items-start gap-5 animate-stagger-2">
                {/* Product Image */}
                <div className="w-32 sm:w-36 aspect-[3/4] bg-zinc-100 shrink-0 overflow-hidden border border-zinc-200 shadow-2xs">
                  <img
                    src={getCacheBustedUrl(
                      lastAddedItem.colorImage ||
                        lastAddedItem.product.mainImage ||
                        lastAddedItem.product.images?.[0],
                      lastAddedItem.product.updatedAt
                    )}
                    alt={lastAddedItem.product.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Product Details & Actions */}
                <div className="flex-1 flex flex-col justify-start pt-1 min-w-0">
                  <h3 className="font-medium text-xs sm:text-sm tracking-wide text-zinc-900 uppercase leading-snug line-clamp-2">
                    {lastAddedItem.product.name}
                  </h3>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mt-1 line-clamp-1">
                    {lastAddedItem.sku || lastAddedItem.product.sku || 'HOLLA-AW26'} -{' '}
                    {lastAddedItem.color || 'STANDARD'}
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-zinc-900 mt-3 font-sans">
                    {formatPrice(lastAddedItem.price)}
                  </p>

                  <div className="mt-5">
                    <button
                      id="added-panel-view-bag-btn"
                      onClick={() => setCartDrawerView('full-cart')}
                      className="text-xs font-bold text-zinc-900 uppercase underline underline-offset-4 tracking-wider hover:text-zinc-600 transition cursor-pointer"
                    >
                      VIEW BAG
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Checkout or Continue Buttons */}
              <div className="px-6 sm:px-8 pt-5 pb-2 animate-stagger-2">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 shadow"
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Divider & BUILD YOUR WARDROBE Section */}
              <div className="mt-6 border-t border-zinc-200 px-6 sm:px-8 pt-6 pb-8 flex-1 animate-stagger-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">
                  BUILD YOUR WARDROBE
                </h4>

                {/* Recommendations Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {wardrobeRecommendations.map((prod) => {
                    const discountPercent =
                      prod.mrp > prod.price
                        ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100)
                        : 0;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setIsCartOpen(false);
                          openProductDetail(prod.id);
                        }}
                        className="group cursor-pointer flex flex-col"
                      >
                        {/* Image */}
                        <div className="w-full aspect-[3/4] bg-zinc-100 overflow-hidden border border-zinc-200 mb-2 relative">
                          <img
                            src={getCacheBustedUrl(prod.mainImage, prod.updatedAt)}
                            alt={prod.name}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>

                        {/* Title */}
                        <h5 className="text-[11px] font-medium text-zinc-900 uppercase tracking-wide line-clamp-1 group-hover:text-zinc-600 transition">
                          {prod.name}
                        </h5>

                        {/* SKU - Color */}
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 line-clamp-1 mt-0.5">
                          {prod.sku || 'REZOS'} - {prod.color || 'STANDARD'}
                        </p>

                        {/* Price */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs">
                          {prod.mrp > prod.price && (
                            <span className="text-zinc-400 line-through text-[11px]">
                              {formatPrice(prod.mrp)}
                            </span>
                          )}
                          <span className="font-semibold text-zinc-900">
                            {formatPrice(prod.price)}
                          </span>
                          {discountPercent > 0 && (
                            <span className="text-[10px] font-bold text-rose-600">
                              {discountPercent}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: FULL SHOPPING BAG VIEW (Items list, quantities, totals, checkout) */
            /* ========================================================================= */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
                <div className="flex items-center gap-2">
                  {lastAddedItem && (
                    <button
                      onClick={() => setCartDrawerView('added-notification')}
                      className="p-1 -ml-1 text-zinc-500 hover:text-zinc-900 transition mr-1"
                      title="Back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <ShoppingBag className="w-5 h-5 text-zinc-900" />
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-zinc-900">
                    Shopping Bag ({cart.reduce((t, i) => t + i.quantity, 0)})
                  </h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 transition"
                  aria-label="Close cart"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Automatic Offer Progress Banner */}
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 text-xs">
                {isAutoDiscountApplied ? (
                  <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                    <Sparkles className="w-4 h-4 text-zinc-900 shrink-0" />
                    <span>
                      🎉 You unlocked {discountPercent}% OFF! {formatPrice(autoDiscountAmount)} saved automatically.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-zinc-800 font-medium">
                      <span>Add {formatPrice(remainingForOffer)} more for automatic {discountPercent}% OFF</span>
                      <span className="font-mono text-zinc-900 font-semibold">
                        {Math.min(100, Math.round((cartSubtotal / threshold) * 100))}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-black h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (cartSubtotal / threshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Items or Empty State */}
              <div className="flex-1 overflow-y-auto p-5">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <ShoppingBag className="w-10 h-10 stroke-1" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
                        Your Bag is Empty
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                        Looks like you haven't added any items yet.
                      </p>
                    </div>
                    <button
                      id="empty-cart-shop-now-btn"
                      onClick={handleShopNow}
                      className="px-8 py-3 bg-[#121212] hover:bg-zinc-800 text-white text-xs font-bold tracking-widest uppercase transition shadow"
                    >
                      SHOP NOW
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-zinc-100">
                    {cart.map((item) => {
                      const variant = item.product.colorOptions?.find(
                        (c) => c.name.toLowerCase() === (item.selectedColor || '').toLowerCase()
                      );
                      const maxStock =
                        variant?.stockBySize?.[item.selectedSize] ??
                        item.product.stockBySize?.[item.selectedSize] ??
                        10;
                      const itemImage =
                        item.selectedColorImage ||
                        variant?.images?.[0] ||
                        variant?.image ||
                        item.product.mainImage;

                      return (
                        <div
                          key={`${item.productId}-${item.selectedSize}-${item.selectedColor || 'default'}`}
                          className="pt-4 first:pt-0 flex gap-4"
                        >
                          {/* Product Image */}
                          <img
                            src={getCacheBustedUrl(itemImage, item.product.updatedAt)}
                            alt={item.product.name}
                            className="w-20 h-26 object-cover object-top border border-zinc-200 shrink-0 bg-zinc-50"
                          />

                          {/* Product Info */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wide line-clamp-1">
                                  {item.product.name}
                                </h4>
                                <button
                                  onClick={() =>
                                    removeFromCart(
                                      item.productId,
                                      item.selectedSize,
                                      item.selectedColor
                                    )
                                  }
                                  className="text-zinc-400 hover:text-rose-700 p-1 -mr-1"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5">
                                {item.variantSku || item.product.sku || 'SKU'}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                                  {item.selectedSize?.toLowerCase().includes('free') ? (
                                    <span>Size: <em className="italic font-normal">Free size</em></span>
                                  ) : (
                                    `Size: ${item.selectedSize}`
                                  )}
                                </span>
                                {item.selectedColor && (
                                  <span className="font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-[11px]">
                                    Color: {item.selectedColor}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantity controls & Price */}
                            <div className="flex items-center justify-between mt-3 pt-2">
                              <div className="flex items-center border border-zinc-300 rounded">
                                <button
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.productId,
                                      item.selectedSize,
                                      item.quantity - 1,
                                      item.selectedColor
                                    )
                                  }
                                  className="p-1 hover:bg-zinc-100 text-zinc-600 transition"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center text-xs font-bold text-zinc-900">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.productId,
                                      item.selectedSize,
                                      item.quantity + 1,
                                      item.selectedColor
                                    )
                                  }
                                  disabled={item.quantity >= maxStock}
                                  className="p-1 hover:bg-zinc-100 text-zinc-600 disabled:opacity-40 transition"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="text-right">
                                <span className="text-sm font-bold text-zinc-950">
                                  {formatPrice(item.product.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Summary & Checkout */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-zinc-200 bg-zinc-50/60 space-y-3">
                  {/* Order Calculations */}
                  <div className="space-y-1.5 text-xs text-zinc-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-zinc-900">
                        {formatPrice(cartSubtotal)}
                      </span>
                    </div>

                    {autoDiscountAmount > 0 && (
                      <div className="flex justify-between text-rose-700 font-semibold">
                        <span>Auto 10% Discount ({formatPrice(threshold)}+ Order)</span>
                        <span>- {formatPrice(autoDiscountAmount)}</span>
                      </div>
                    )}

                    {couponDiscountAmount > 0 && appliedCoupon && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Coupon ({appliedCoupon.code})</span>
                        <span>- {formatPrice(couponDiscountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Estimated GST (5%)</span>
                      <span>{formatPrice(cartGstAmount)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Delivery Charges</span>
                      <span className="text-emerald-700 font-semibold">
                        {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                      </span>
                    </div>

                    <div className="border-t border-zinc-200 pt-2 flex justify-between text-base font-extrabold text-zinc-950">
                      <span>Total Amount</span>
                      <span>{formatPrice(cartTotalAmount)}</span>
                    </div>
                  </div>

                  {/* Proceed to Checkout CTA */}
                  <button
                    id="cart-proceed-checkout-btn"
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>100% Safe & Secure Checkout with COD & Prepaid Options</span>
                  </div>
                </div>
              )}
            </div>
          )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
