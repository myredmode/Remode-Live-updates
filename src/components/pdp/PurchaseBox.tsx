import React, { useState } from 'react';
import {
  ShoppingBag,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { Product } from '../../types';

interface PurchaseBoxProps {
  product: Product;
  selectedSize: string;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  addedAnimation: boolean;
  onViewBag: () => void;
  discountPercent: number;
  effectivePrice?: number;
  effectiveMrp?: number;
  effectiveStockBySize?: Record<string, number>;
  selectedColor?: string;
}

export const PurchaseBox: React.FC<PurchaseBoxProps> = ({
  product,
  selectedSize,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
  addedAnimation,
  onViewBag,
  discountPercent,
  effectivePrice,
  effectiveMrp,
  effectiveStockBySize,
  selectedColor,
}) => {
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
    deliveryDate?: string;
  } | null>(null);

  // Calculate dynamic delivery date based on current date + 3 to 4 business days
  const deliveryDateString = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const handlePincodeSubmit = (e: React.FormEvent) => {
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
      setPincodeResult({
        checked: true,
        valid: true,
        message: `Delivery available to ${cleanPin}`,
        deliveryDate: estDate,
      });
    } else {
      setPincodeResult({
        checked: true,
        valid: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }
  };

  const currentPrice = effectivePrice ?? product.price;
  const currentMrp = effectiveMrp ?? product.mrp;
  const stockRecord = effectiveStockBySize ?? product.stockBySize ?? {};
  const effectiveStock = selectedSize ? (stockRecord[selectedSize] ?? 5) : 5;
  const isOutOfStock = selectedSize ? effectiveStock <= 0 : false;
  const isLowStock = selectedSize ? (effectiveStock > 0 && effectiveStock <= 3) : false;
  const computedDiscount =
    currentMrp > currentPrice
      ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
      : discountPercent;

  return (
    <div
      id="product-purchase-box"
      className="border border-zinc-200 bg-white p-4 sm:p-5 lg:p-5 xl:p-6 shadow-sm lg:sticky lg:top-24 lg:self-start space-y-4 sm:space-y-5 transition-all"
    >
      {/* Price Block in Purchase Box */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950">
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            {currentMrp > currentPrice && (
              <span className="text-xs sm:text-sm text-zinc-400 line-through">
                MRP ₹{currentMrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {computedDiscount > 0 && (
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Save {computedDiscount}%
            </span>
          )}
        </div>
        {selectedColor && (
          <p className="text-[11px] text-zinc-500 font-medium">
            Variant: <strong className="text-zinc-800">{selectedColor}</strong>
            {selectedSize ? ` • Size: ${selectedSize}` : ''}
          </p>
        )}
        <p className="text-[11px] text-zinc-500">
          Inclusive of GST • Standard Shipping Included
        </p>
      </div>

      <hr className="border-zinc-200" />

      {/* Dynamic Delivery Information */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-start gap-2 text-zinc-800">
          <Truck className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-zinc-900">
              FREE Delivery by{' '}
              <span className="text-emerald-700 font-extrabold">{deliveryDateString}</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Order within <span className="font-semibold text-zinc-800">3 hrs 45 mins</span> for same-day dispatch from Meerut hub.
            </p>
          </div>
        </div>

        {/* Pincode Checker */}
        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            <span>Deliver to your location</span>
          </div>

          <form onSubmit={handlePincodeSubmit} className="flex gap-1.5">
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit Pincode"
              className="flex-1 px-3 py-2 text-xs border border-zinc-300 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white rounded-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition rounded-none shrink-0"
            >
              Check
            </button>
          </form>

          {pincodeResult && (
            <div
              className={`mt-2 p-2 text-xs rounded-none flex items-start gap-1.5 ${
                pincodeResult.valid
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {pincodeResult.valid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{pincodeResult.message}</span>
                    {pincodeResult.deliveryDate && (
                      <span className="block text-[11px] text-emerald-800">
                        Expected by {pincodeResult.deliveryDate} via Shipmozo Express.
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span>{pincodeResult.message}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <hr className="border-zinc-200" />

      {/* Stock Availability */}
      <div>
        {isOutOfStock ? (
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span>Currently Out of Stock</span>
          </div>
        ) : isLowStock ? (
          <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Only {effectiveStock} items left in stock - order soon</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>In Stock • Ready to Dispatch</span>
          </div>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
          Quantity:
        </span>
        <div className="flex items-center border border-zinc-300">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent font-bold"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="w-10 h-8 flex items-center justify-center text-xs font-bold text-zinc-900 border-x border-zinc-300">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(Math.min(effectiveStock || 10, quantity + 1))}
            disabled={quantity >= (effectiveStock || 10) || isOutOfStock}
            className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent font-bold"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Primary Action Buttons: ADD TO CART & BUY NOW */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          id="pdp-add-to-cart-btn"
          onClick={onAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-3.5 px-4 border-2 text-xs sm:text-sm font-extrabold tracking-wider uppercase transition flex items-center justify-center gap-2 disabled:opacity-50 ${
            addedAnimation
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-zinc-950 bg-white text-zinc-950 hover:bg-zinc-100 shadow-sm'
          }`}
        >
          {addedAnimation ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart</span>
            </>
          )}
        </button>

        <button
          type="button"
          id="pdp-buy-now-btn"
          onClick={onBuyNow}
          disabled={isOutOfStock}
          className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-extrabold tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Buy Now</span>
        </button>

        {/* In-Place Feedback after Add to Cart */}
        {addedAnimation && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Item in your bag!
              </span>
            </div>
            <button
              type="button"
              onClick={onViewBag}
              className="font-bold underline text-emerald-800 hover:text-emerald-950 uppercase text-[11px] tracking-wider"
            >
              View Bag →
            </button>
          </div>
        )}
      </div>

      {/* Payment Options Callout */}
      <div className="bg-zinc-50 border border-zinc-200 p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-zinc-900">
          <Banknote className="w-4 h-4 text-zinc-700" />
          <span>Payment Methods:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600">
          <div className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Cash on Delivery</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Instant UPI / GPay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Credit & Debit Cards</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Net Banking</span>
          </div>
        </div>
        <p className="text-[10px] text-rose-700 font-semibold pt-1 border-t border-zinc-200">
          ★ Pay Online & Get Extra ₹50 Instant Prepaid Discount.
        </p>
      </div>

      {/* Trust & Guarantee Badges */}
      <div className="space-y-2.5 pt-2 border-t border-zinc-200 text-xs text-zinc-600">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0" />
          <span>100% Quality Inspected RedMode Craft</span>
        </div>
        <div className="flex items-center gap-2.5">
          <RotateCcw className="w-4 h-4 text-zinc-700 shrink-0" />
          <span>7-Day Hassle-Free Size Exchange & Returns</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Truck className="w-4 h-4 text-zinc-700 shrink-0" />
          <span>Tracked Express Courier Delivery</span>
        </div>
      </div>
    </div>
  );
};
