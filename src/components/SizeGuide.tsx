import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Ruler, HelpCircle } from 'lucide-react';

type SizeCategoryTab = 'kurtis' | 'trousers';

export const SizeGuide: React.FC = () => {
  const { setActiveView, settings } = useStore();
  const [activeTab, setActiveTab] = useState<SizeCategoryTab>('kurtis');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  const brandName = settings?.brandName || 'REDMODE';

  const formatMeasurement = (val: string) => {
    if (!val || val === '--' || val === '-') return '--';
    if (unit === 'in') return val;
    const matches = val.match(/\d+(\.\d+)?/g);
    if (!matches) return val;
    if (matches.length === 1) {
      const cmVal = Math.round(parseFloat(matches[0]) * 2.54);
      return `${cmVal} cm`;
    }
    if (matches.length === 2) {
      const cm1 = Math.round(parseFloat(matches[0]) * 2.54);
      const cm2 = Math.round(parseFloat(matches[1]) * 2.54);
      return `${cm1}–${cm2} cm`;
    }
    return val;
  };

  const handleNavigateHome = () => {
    setActiveView('home');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // 1. KURTIS / TOPS (Standard garment measurements)
  const kurtiData = [
    { size: 'S', bust: '36"', waist: '32"', hip: '39"', length: '44"' },
    { size: 'M', bust: '38"', waist: '34"', hip: '41"', length: '44"' },
    { size: 'L', bust: '40"', waist: '36"', hip: '43"', length: '45"' },
    { size: 'XL', bust: '42"', waist: '38"', hip: '45"', length: '45"' },
    { size: 'XXL', bust: '44"', waist: '40"', hip: '47"', length: '46"' },
  ];

  // 2. TROUSERS & BOTTOMS (Complete measurements for standard and elasticated fits)
  const trouserData = [
    { size: 'S', waist: '26-28"', hip: '38"', length: '37"' },
    { size: 'M', waist: '28-30"', hip: '40"', length: '38"' },
    { size: 'L', waist: '30-32"', hip: '42"', length: '38"' },
    { size: 'XL', waist: '32-34"', hip: '44"', length: '39"' },
    { size: 'XXL', waist: '34-36"', hip: '46"', length: '39"' },
    { size: 'Free Size', waist: '28-36"', hip: '44"', length: '38"' },
    { size: 'Plus Size', waist: '36-44"', hip: '50"', length: '39"' },
  ];

  return (
    <div className="bg-white min-h-screen text-zinc-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* 1. Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center space-x-2 text-xs text-zinc-500 uppercase tracking-wider">
            <li>
              <button
                type="button"
                onClick={handleNavigateHome}
                className="hover:text-zinc-950 transition cursor-pointer"
              >
                Home
              </button>
            </li>
            <li className="text-zinc-400">/</li>
            <li className="text-zinc-900 font-semibold" aria-current="page">
              Size Guide
            </li>
          </ol>
        </nav>

        {/* 2. Main Heading */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Ruler className="w-6 h-6 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-zinc-950 font-sans">
              SIZE GUIDE
            </h1>
          </div>

          {/* 3. Short Introductory Text */}
          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed mt-2">
            Find your perfect fit with our {brandName} size guide. Please refer to the measurements below before placing your order.
          </p>
        </header>

        {/* 4. Category Navigation Tabs & Unit Toggle Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-3 mb-6">
          {/* Category Tabs: Kurtis, Trousers */}
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('kurtis')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer border-b-2 -mb-[13px] ${
                activeTab === 'kurtis'
                  ? 'border-zinc-950 text-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Kurtis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trousers')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer border-b-2 -mb-[13px] ${
                activeTab === 'trousers'
                  ? 'border-zinc-950 text-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Trousers
            </button>
          </div>

          {/* Unit Toggle (Inches vs Centimeters) */}
          <div className="flex items-center self-start sm:self-auto gap-2">
            <span className="text-xs text-zinc-500 font-medium">Unit:</span>
            <div className="inline-flex border border-zinc-200 bg-zinc-50 p-0.5 rounded-sm text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUnit('in')}
                className={`px-3 py-1 transition cursor-pointer rounded-xs ${
                  unit === 'in'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`px-3 py-1 transition cursor-pointer rounded-xs ${
                  unit === 'cm'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Centimeters (cm)
              </button>
            </div>
          </div>
        </div>

        {/* 5. Size Tables */}
        <section aria-label="Measurement Table" className="mb-10">
          {/* TAB 1: KURTIS */}
          {activeTab === 'kurtis' && (
            <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Kurtis Measurement Chart
                </span>
                <span className="text-[11px] text-zinc-500">
                  Garment measurements in {unit === 'in' ? 'inches' : 'centimeters'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-zinc-200">
                  <thead className="bg-white text-zinc-800 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Size</th>
                      <th className="py-3 px-4 sm:px-6">Bust</th>
                      <th className="py-3 px-4 sm:px-6">Waist</th>
                      <th className="py-3 px-4 sm:px-6">Hip</th>
                      <th className="py-3 px-4 sm:px-6">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-normal text-zinc-700">
                    {kurtiData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/70 transition">
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-zinc-950">
                          {row.size}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.bust)}</td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.waist)}</td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.hip)}</td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.length)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TROUSERS */}
          {activeTab === 'trousers' && (
            <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Trousers &amp; Bottoms Measurement Chart
                </span>
                <span className="text-[11px] text-zinc-500">
                  Garment measurements in {unit === 'in' ? 'inches' : 'centimeters'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-zinc-200">
                  <thead className="bg-white text-zinc-800 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Size</th>
                      <th className="py-3 px-4 sm:px-6">Waist</th>
                      <th className="py-3 px-4 sm:px-6">Hip</th>
                      <th className="py-3 px-4 sm:px-6">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-normal text-zinc-700">
                    {trouserData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/70 transition">
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-zinc-950">
                          {row.size}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.waist)}</td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.hip)}</td>
                        <td className="py-3.5 px-4 sm:px-6">{formatMeasurement(row.length)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 6. "How to Measure" Section */}
        <section aria-labelledby="how-to-measure-heading" className="border-t border-zinc-200 pt-10 pb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <HelpCircle className="w-5 h-5 text-zinc-900" />
            <h2 id="how-to-measure-heading" className="text-lg sm:text-xl font-bold uppercase tracking-wide text-zinc-950">
              HOW TO MEASURE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="border border-zinc-200 p-5 rounded-sm bg-zinc-50/40">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h3 className="font-bold text-sm text-zinc-950 uppercase tracking-wider">
                  Bust / Chest
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pl-10">
                Measure around the fullest part of your bust or chest. Keep the measuring tape parallel to the floor and comfortably snug, not tight.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-zinc-200 p-5 rounded-sm bg-zinc-50/40">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="font-bold text-sm text-zinc-950 uppercase tracking-wider">
                  Waist
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pl-10">
                Measure around your natural waistline, which is usually the narrowest part of your torso, located just above your belly button.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border border-zinc-200 p-5 rounded-sm bg-zinc-50/40">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <h3 className="font-bold text-sm text-zinc-950 uppercase tracking-wider">
                  Hip
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pl-10">
                Stand with your feet together and measure around the widest part of your hips and rear, keeping the measuring tape flat.
              </p>
            </div>

            {/* Step 4 */}
            <div className="border border-zinc-200 p-5 rounded-sm bg-zinc-50/40">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <h3 className="font-bold text-sm text-zinc-950 uppercase tracking-wider">
                  Shoulder
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pl-10">
                Measure straight across the back from the tip of one shoulder bone to the tip of the other shoulder bone.
              </p>
            </div>

            {/* Step 5 */}
            <div className="border border-zinc-200 p-5 rounded-sm bg-zinc-50/40">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-zinc-950 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  5
                </span>
                <h3 className="font-bold text-sm text-zinc-950 uppercase tracking-wider">
                  Garment Length
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pl-10">
                Measure from the highest point of the shoulder seam straight down to the lower hemline of the garment.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Fit Note */}
        <section aria-label="Fit Note" className="my-6 p-4 sm:p-5 bg-zinc-50 border border-zinc-200 rounded-sm">
          <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
            <strong className="text-zinc-950 font-semibold">Fit Note: </strong>
            Measurements may vary slightly due to garment construction and fabric characteristics. For the best fit, compare these measurements with a similar garment you already own.
          </p>
        </section>
      </div>
    </div>
  );
};
