import React, { useState } from 'react';
import {
  ChevronDown,
  Ruler,
  Truck,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Package,
} from 'lucide-react';
import { Product } from '../../types';

interface ProductAccordionsProps {
  product: Product;
  onOpenSizeChart: () => void;
  effectiveDescription?: string;
  effectiveSku?: string;
  selectedColor?: string;
}

export const ProductAccordions: React.FC<ProductAccordionsProps> = ({
  product,
  onOpenSizeChart,
  effectiveDescription,
  effectiveSku,
  selectedColor,
}) => {
  // All sections start collapsed as requested:
  // "Initially: Product Description ▼"
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    description: false,
    details: false,
    sizeFit: false,
    shipping: false,
    returns: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const displayDescription = effectiveDescription || product.description;
  const displaySku = effectiveSku || product.sku || product.id;
  const displayColor = selectedColor || product.color || product.colorOptions?.[0]?.name;

  return (
    <div id="product-accordions-container" className="w-full divide-y divide-zinc-200 border-y border-zinc-200 mt-8">
      {/* 1. PRODUCT DESCRIPTION ACCORDION */}
      <div className="py-1">
        <button
          type="button"
          id="accordion-btn-description"
          aria-expanded={openSections.description}
          aria-controls="accordion-panel-description"
          onClick={() => toggleSection('description')}
          className="w-full py-4 flex items-center justify-between text-left group transition select-none"
        >
          <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-zinc-900 group-hover:text-rose-700 transition flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-zinc-400 group-hover:text-rose-700 transition" />
            <span>Product Description</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-950 transition-transform duration-300 transform ${
              openSections.description ? 'rotate-180 text-rose-700' : 'rotate-0'
            }`}
          />
        </button>

        <div
          id="accordion-panel-description"
          className={`grid transition-all duration-300 ease-in-out ${
            openSections.description ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden text-xs sm:text-sm text-zinc-600 space-y-3 leading-relaxed">
            <p className="whitespace-pre-line">
              {displayDescription}
            </p>

            <div className="p-3 bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1 mt-2">
              <strong className="block text-zinc-900 font-bold uppercase tracking-wider text-[11px]">
                The REDMODE Artisanal Standard
              </strong>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Each piece is carefully crafted using azo-free dyes and tailored by master craftsmen in India. Minor variations in motifs are natural hallmarks of authentic artisanal work.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT DETAILS ACCORDION */}
      <div className="py-1">
        <button
          type="button"
          id="accordion-btn-details"
          aria-expanded={openSections.details}
          aria-controls="accordion-panel-details"
          onClick={() => toggleSection('details')}
          className="w-full py-4 flex items-center justify-between text-left group transition select-none"
        >
          <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-zinc-900 group-hover:text-rose-700 transition flex items-center gap-2.5">
            <Package className="w-4 h-4 text-zinc-400 group-hover:text-rose-700 transition" />
            <span>Product Details</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-950 transition-transform duration-300 transform ${
              openSections.details ? 'rotate-180 text-rose-700' : 'rotate-0'
            }`}
          />
        </button>

        <div
          id="accordion-panel-details"
          className={`grid transition-all duration-300 ease-in-out ${
            openSections.details ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="border border-zinc-200 divide-y divide-zinc-200 text-xs bg-white">
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">Brand</span>
                <span className="font-bold text-zinc-900">{product.brand || 'REDMODE'}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5">
                <span className="font-semibold text-zinc-500">Color Variant</span>
                <span className="font-bold text-zinc-900">{displayColor}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">SKU Code</span>
                <span className="font-mono font-bold text-zinc-900">{displaySku}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5">
                <span className="font-semibold text-zinc-500">Fabric</span>
                <span className="font-medium text-zinc-900">{product.material || '100% Pure Mulmul Cotton'}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">Fit Silhouette</span>
                <span className="font-medium text-zinc-900">{product.fit || 'A-Line Regular Fit'}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5">
                <span className="font-semibold text-zinc-500">Pattern</span>
                <span className="font-medium text-zinc-900">{product.pattern || 'Sanganeri Traditional Hand Print'}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">Sleeve Length</span>
                <span className="font-medium text-zinc-900">3/4th Bell Sleeves</span>
              </div>
              <div className="grid grid-cols-2 p-2.5">
                <span className="font-semibold text-zinc-500">Neck Style</span>
                <span className="font-medium text-zinc-900">Keyhole Mandarin Collar</span>
              </div>
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">Occasion</span>
                <span className="font-medium text-zinc-900">{product.occasion || 'Festive / Daily Ethnic / Office'}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5">
                <span className="font-semibold text-zinc-500">Country of Origin</span>
                <span className="font-medium text-zinc-900">{product.countryOfOrigin || 'India'}</span>
              </div>
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">Company &amp; Address</span>
                <span className="font-medium text-zinc-900">RedMode — 1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India</span>
              </div>
              <div className="grid grid-cols-2 p-2.5">
                <span className="font-semibold text-zinc-500">Contact &amp; Email</span>
                <span className="font-medium text-zinc-900">7302797464 | MyRedMode@gmail.com</span>
              </div>
              <div className="grid grid-cols-2 p-2.5 bg-zinc-50/60">
                <span className="font-semibold text-zinc-500">Care Instructions</span>
                <span className="font-medium text-zinc-900">Gentle cold wash separately with mild detergent. Warm iron inside out.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIZE & FIT ACCORDION */}
      <div className="py-1">
        <button
          type="button"
          id="accordion-btn-sizefit"
          aria-expanded={openSections.sizeFit}
          aria-controls="accordion-panel-sizefit"
          onClick={() => toggleSection('sizeFit')}
          className="w-full py-4 flex items-center justify-between text-left group transition select-none"
        >
          <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-zinc-900 group-hover:text-rose-700 transition flex items-center gap-2.5">
            <Ruler className="w-4 h-4 text-zinc-400 group-hover:text-rose-700 transition" />
            <span>Size & Fit</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-950 transition-transform duration-300 transform ${
              openSections.sizeFit ? 'rotate-180 text-rose-700' : 'rotate-0'
            }`}
          />
        </button>

        <div
          id="accordion-panel-sizefit"
          className={`grid transition-all duration-300 ease-in-out ${
            openSections.sizeFit ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden text-xs text-zinc-600 space-y-3">
            <div className="flex items-center gap-2 text-zinc-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Standard Indian Ethnic Fit • True to standard size</span>
            </div>

            <p className="leading-relaxed">
              Model in the product pictures is 5&apos;8&quot; tall with a 34&quot; bust, wearing size <strong>S (Small)</strong>.
              For a comfortable and elegant drape, we recommend choosing 2 inches above your exact body measurement.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenSizeChart}
                className="px-4 py-2 border border-zinc-950 bg-white hover:bg-zinc-950 hover:text-white text-zinc-950 font-bold uppercase tracking-wider text-xs transition flex items-center gap-2"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Open Full Interactive Size Guide (Inches / CM)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SHIPPING & DELIVERY ACCORDION */}
      <div className="py-1">
        <button
          type="button"
          id="accordion-btn-shipping"
          aria-expanded={openSections.shipping}
          aria-controls="accordion-panel-shipping"
          onClick={() => toggleSection('shipping')}
          className="w-full py-4 flex items-center justify-between text-left group transition select-none"
        >
          <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-zinc-900 group-hover:text-rose-700 transition flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-zinc-400 group-hover:text-rose-700 transition" />
            <span>Shipping & Delivery</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-950 transition-transform duration-300 transform ${
              openSections.shipping ? 'rotate-180 text-rose-700' : 'rotate-0'
            }`}
          />
        </button>

        <div
          id="accordion-panel-shipping"
          className={`grid transition-all duration-300 ease-in-out ${
            openSections.shipping ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden text-xs text-zinc-600 space-y-3 leading-relaxed">
            <p>
              {product.deliveryInfo ||
                'Dispatched within 24 hours. Estimated delivery 3-5 business days via premier express courier network across India.'}
            </p>

            <ul className="space-y-1.5 list-disc list-inside pl-1 text-zinc-700">
              <li><strong>Dispatch:</strong> Orders placed before 2:00 PM are handed over to the courier on the same business day.</li>
              <li><strong>Metro Delivery:</strong> 2 to 3 business days (Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad).</li>
              <li><strong>Rest of India:</strong> 3 to 5 business days with active SMS and WhatsApp tracking.</li>
              <li><strong>Free Shipping:</strong> Included on all prepaid and COD orders above ₹499.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. RETURNS & REPLACEMENT ACCORDION */}
      <div className="py-1">
        <button
          type="button"
          id="accordion-btn-returns"
          aria-expanded={openSections.returns}
          aria-controls="accordion-panel-returns"
          onClick={() => toggleSection('returns')}
          className="w-full py-4 flex items-center justify-between text-left group transition select-none"
        >
          <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-zinc-900 group-hover:text-rose-700 transition flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-zinc-400 group-hover:text-rose-700 transition" />
            <span>Returns & Replacement</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-950 transition-transform duration-300 transform ${
              openSections.returns ? 'rotate-180 text-rose-700' : 'rotate-0'
            }`}
          />
        </button>

        <div
          id="accordion-panel-returns"
          className={`grid transition-all duration-300 ease-in-out ${
            openSections.returns ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden text-xs text-zinc-600 space-y-3 leading-relaxed">
            <p>
              {product.returnPolicy ||
                'Easy 7-day hassle-free return and size exchange. Free reverse doorstep pickup available PAN India.'}
            </p>

            <ul className="space-y-1.5 list-disc list-inside pl-1 text-zinc-700">
              <li><strong>7-Day Window:</strong> Returns or size exchanges accepted within 7 days of package delivery.</li>
              <li><strong>Free Reverse Pickup:</strong> Our courier partner picks up the item right from your doorstep.</li>
              <li><strong>Condition:</strong> Must be unworn, unwashed, and in original packaging with brand tags attached.</li>
              <li><strong>Instant Refund:</strong> Processed within 48 hours of return quality inspection to source account or store wallet.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
