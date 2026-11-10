import React, { useState } from 'react';
import {
  Star,
  Ruler,
  Tag,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Product, ColorVariant } from '../../types';

interface ProductInfoProps {
  product: Product;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  onOpenSizeChart: () => void;
  selectedColor?: string;
  onSelectColor?: (color: string) => void;
  effectivePrice?: number;
  effectiveMrp?: number;
  effectiveStockBySize?: Record<string, number>;
  effectiveSku?: string;
  discountPercent: number;
  autoDiscountThreshold: number;
  autoDiscountPercent: number;
  onNavigateToProduct?: (productId: string) => void;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  selectedSize,
  onSelectSize,
  onOpenSizeChart,
  selectedColor,
  onSelectColor,
  effectivePrice,
  effectiveMrp,
  effectiveStockBySize,
  effectiveSku,
  discountPercent,
  autoDiscountThreshold,
  autoDiscountPercent,
  onNavigateToProduct,
}) => {
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  const isFreeSize =
    !product.sizes ||
    product.sizes.length === 0 ||
    (product.sizes.length === 1 &&
      ['free size', 'freesize', 'free-size', 'free'].includes(product.sizes[0].trim().toLowerCase()));

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const scrollToReviews = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('customer-reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentPrice = effectivePrice ?? product.price;
  const currentMrp = effectiveMrp ?? product.mrp;
  const currentStockBySize = effectiveStockBySize ?? product.stockBySize ?? {};
  const savingsAmount = currentMrp > currentPrice ? currentMrp - currentPrice : 0;
  const currentDiscountPercent =
    currentMrp > currentPrice
      ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
      : discountPercent;

  const ratingValue = product.rating || 4.8;
  const reviewCountValue =
    product.reviewCount || (product.reviews?.length ? product.reviews.length * 24 + 5 : 127);

  const effectiveStock = selectedSize ? (currentStockBySize[selectedSize] ?? 5) : 5;
  const isLowStock = selectedSize ? effectiveStock > 0 && effectiveStock <= 3 : false;
  const isOutOfStock = selectedSize ? effectiveStock <= 0 : false;

  return (
    <div id="product-center-info" className="flex flex-col space-y-6">
      <div className="space-y-1.5">
        {/* Main Product Title */}
        <h1 className="font-sans text-xl sm:text-2xl font-bold uppercase tracking-wider text-zinc-950 leading-snug">
          {product.name}
        </h1>

        {/* Fancy Color Name */}
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {(selectedColor || product.color || 'Standard').toUpperCase()}
        </p>

        {/* Pricing & Tax Row */}
        <div className="flex items-baseline gap-2 sm:gap-2.5 flex-wrap pt-1">
          {currentMrp > currentPrice && (
            <span className="text-sm sm:text-base text-zinc-400 line-through font-normal">
              ₹{currentMrp.toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-2xl sm:text-3xl font-bold text-zinc-950">
            ₹{currentPrice.toLocaleString('en-IN')}
          </span>
          {currentDiscountPercent > 0 && (
            <span className="text-sm sm:text-base font-bold text-[#D32F2F]">
              {currentDiscountPercent}% OFF
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-zinc-400 font-normal tracking-tight">
            incl. of all taxes
          </span>
        </div>
      </div>

      {/* Available Special Offers & Coupons Card */}
      <div className="bg-zinc-50/80 border border-zinc-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900">
          <Tag className="w-4 h-4 text-rose-700" />
          <span>Available Offers & Instant Discounts</span>
        </div>

        <div className="space-y-2">
          {/* Automatic Storewide Offer */}
          <div className="flex items-start justify-between gap-3 p-2.5 bg-white border border-zinc-200 text-xs">
            <div className="space-y-0.5">
              <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                AUTO-APPLIED
              </span>
              <p className="font-semibold text-zinc-900">
                Get extra {autoDiscountPercent}% OFF on orders ₹{autoDiscountThreshold}+
              </p>
              <p className="text-[11px] text-zinc-500">
                Discount applies automatically in your shopping bag.
              </p>
            </div>
          </div>

          {/* Instant Coupon REDMODE10 */}
          <div className="flex items-center justify-between gap-3 p-2.5 bg-white border border-dashed border-rose-300 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 border border-rose-200">
                  REDMODE10
                </span>
                <span className="text-[11px] font-semibold text-zinc-800">
                  10% Instant Discount
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Valid on all prepaid and COD orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyCode('REDMODE10')}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              {copiedCoupon === 'REDMODE10' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Prepaid Extra ₹50 Offer */}
          <div className="flex items-center gap-2 p-2 text-xs text-zinc-700 bg-emerald-50/70 border border-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Prepaid Advantage:</strong> Pay online via UPI/Card to get Extra ₹50 OFF + Priority Same-Day Dispatch.
            </span>
          </div>
        </div>
      </div>

      {/* Color Selection (Pure text options matching premium minimal standard, NO color dots/circles) */}
      {(product.colorOptions && product.colorOptions.length > 0) || product.color ? (
        <div id="pdp-color-selection-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-950">
              COLOR:{' '}
              <span className="font-semibold text-zinc-700">
                {selectedColor || product.color || product.colorOptions?.[0]?.name || 'Standard'}
              </span>
            </span>
          </div>

          {product.colorOptions && product.colorOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {product.colorOptions.map((col, idx) => {
                const isActive =
                  (selectedColor || product.color || '').toLowerCase() === col.name.toLowerCase();
                const stockForCurrentSize = selectedSize ? (col.stockBySize?.[selectedSize] ?? 1) : 1;
                const isComboUnavailable = selectedSize ? stockForCurrentSize <= 0 : false;

                return (
                  <button
                    key={idx}
                    type="button"
                    id={`pdp-color-btn-${col.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      if (onSelectColor) onSelectColor(col.name);
                      if (col.productId && col.productId !== product.id && onNavigateToProduct) {
                        onNavigateToProduct(col.productId);
                      }
                    }}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border transition cursor-pointer ${
                      isActive
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : isComboUnavailable
                        ? 'border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-zinc-400'
                        : 'border-zinc-300 hover:border-zinc-950 bg-white text-zinc-800'
                    }`}
                    title={`Select ${col.name}${isComboUnavailable ? ' (Unavailable in size ' + selectedSize + ')' : ''}`}
                  >
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Size Selection Area (Separate and distinct) */}
      <div id="pdp-size-selection-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-950">
              SIZE:{' '}
              {isFreeSize ? (
                <span className="italic font-normal text-zinc-800">
                  Free size
                </span>
              ) : (
                <span className="font-semibold text-zinc-700">
                  {selectedSize || 'Select Size'}
                </span>
              )}
            </span>
          </div>

          {!isFreeSize && (
            <button
              type="button"
              id="open-size-chart-btn"
              onClick={onOpenSizeChart}
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:underline transition"
            >
              Size Guide & Measurements
            </button>
          )}
        </div>

        {/* Size Display: Free size in italics or Size Chips */}
        {isFreeSize ? (
          <div className="py-1">
            <span className="italic text-zinc-900 text-sm font-medium">
              Free size
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(product.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((sz) => {
              const stockForSize = currentStockBySize[sz] ?? product.stockBySize?.[sz] ?? 0;
              const isSelected = selectedSize === sz;
              const isSoldOut = stockForSize <= 0;

              return (
                <button
                  key={sz}
                  id={`pdp-size-btn-${sz}`}
                  type="button"
                  onClick={() => onSelectSize(sz)}
                  className={`min-w-[48px] px-3.5 py-2.5 text-center border text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : isSoldOut
                      ? 'border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-zinc-400'
                      : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-950'
                  }`}
                  title={isSoldOut ? `Size ${sz} is out of stock in ${selectedColor || 'this color'}` : `Size ${sz}`}
                >
                  <span>{sz}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Combination Validation Message if combination is unavailable */}
        {isOutOfStock && (
          <div className="p-3 bg-zinc-50 border border-zinc-300 text-xs text-zinc-800 space-y-0.5">
            <p className="font-bold text-zinc-950">Not available in this combination</p>
            <p className="text-zinc-600 text-[11px]">
              Size {selectedSize} is currently out of stock in {selectedColor || product.color || 'this color'}. Please choose another available size or color.
            </p>
          </div>
        )}

        {/* Low Stock Warning */}
        {isLowStock && !isOutOfStock && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Hurry! Only <strong>{effectiveStock} pieces</strong> left in size{' '}
              <strong>{selectedSize}</strong> ({selectedColor || product.color}).
            </span>
          </div>
        )}
      </div>

      <hr className="border-zinc-200" />

      {/* About This Item / Highlights */}
      {product.highlights && product.highlights.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
            About This Item / Key Highlights
          </h3>
          <ul className="space-y-2 text-xs text-zinc-600">
            {product.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
