import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Category } from '../types';
import { getCacheBustedUrl } from '../utils/cacheBuster';

export const HomeView: React.FC = () => {
  const {
    categories,
    setActiveView,
    setSelectedCategorySlug,
    setSelectedSubcategorySlug,
    setSubcategoriesShowcaseCategorySlug,
    setSelectedProductId,
    formatPrice,
  } = useStore();

  // ONLY MAIN CATEGORIES on Home (KURTI, TROUSER, KURTI SETS, JEWELLERY, etc.)
  // Subcategories will NEVER be shown on Home Page; they only open AFTER tapping a category!
  const activeCategories = useMemo(() => {
    const subcategorySlugs = new Set([
      'printed',
      'printed-kurti',
      'embroidered',
      'embroidered-kurti',
      'solids',
      'classic-solids',
      'simple',
      'short-kurti',
      'long-kurti',
      'straight-fit',
      'regular-fit',
      'cigarette-pants',
      'flared-palazzos',
      'palazzo',
      'pant',
      'pants',
      'zari-work',
      'chikankari',
      'festive-kurti-sets',
      'daily-wear-sets',
    ]);

    return categories
      .filter((c) => c.showOnHome !== false && !subcategorySlugs.has(c.slug.toLowerCase()))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [categories]);

  // Click on a category banner from Home Page:
  // If it has subcategories -> opens subcategories showcase banners (e.g. Kurti, Trouser)
  // If NO subcategories -> opens product listing screen directly (e.g. Jewellery, Kurti Sets)!
  const handleCategoryClick = (cat: Category) => {
    setSelectedCategorySlug(cat.slug);
    setSelectedSubcategorySlug(null);
    setSelectedProductId(null);
    if (cat.subcategories && cat.subcategories.length > 0) {
      setSubcategoriesShowcaseCategorySlug(cat.slug);
    } else {
      setSubcategoriesShowcaseCategorySlug(null);
    }
    setActiveView('catalogue');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Reusable Desktop Category Banner Tile (Rare Rabbit Signature Style)
  const renderDesktopTile = (
    cat: Category,
    idx: number,
    isLastInRow: boolean = false,
    customHeightClass?: string
  ) => (
    <div
      key={`desktop-${cat.id}`}
      id={`desktop-category-banner-${cat.slug}`}
      onClick={() => handleCategoryClick(cat)}
      className={`relative w-full ${customHeightClass || 'h-full'} overflow-hidden bg-zinc-950 cursor-pointer select-none group border-r border-zinc-900/30 ${
        isLastInRow ? 'border-r-0' : ''
      } transition-transform duration-200`}
      role="button"
      tabIndex={0}
      aria-label={`Explore ${cat.name} Collection`}
    >
      {cat.imageUrl || cat.bannerUrl ? (
        <img
          src={getCacheBustedUrl(cat.imageUrl || cat.bannerUrl, cat.updatedAt || cat.order)}
          alt={cat.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black text-white p-6 text-center">
          <img src="/assets/redmode-official-emblem.png" alt="REDMODE" className="w-14 h-14 opacity-50 mb-4 object-contain" />
          <span className="text-xs font-semibold tracking-[0.25em] uppercase text-zinc-400">REDMODE COLLECTION</span>
          <span className="text-lg font-bold tracking-wider uppercase text-white mt-1">{cat.name}</span>
        </div>
      )}

      {/* Subtle Vignette Gradient for Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none group-hover:from-black/90 transition-all duration-300" />

      {/* Rare Rabbit Style Minimal Typography at Bottom Center */}
      <div className="absolute inset-x-0 bottom-8 lg:bottom-12 px-3 text-center flex flex-col items-center justify-end pointer-events-none space-y-1">
        {/* Optional Starting Price / Subtitle Tagline */}
        <span className="text-[10px] lg:text-[11px] font-semibold tracking-[0.2em] text-zinc-300 uppercase drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
          {cat.tagline ||
            (cat.slug === 'kurti'
              ? `STARTING AT ${formatPrice(749)}`
              : cat.slug === 'trouser' || cat.slug === 'bottom'
              ? `STARTING AT ${formatPrice(899)}`
              : cat.slug === 'kurti-set'
              ? `STARTING AT ${formatPrice(1299)}`
              : `STARTING AT ${formatPrice(499)}`)}
        </span>

        {/* Category Name in Bold with Elegant Underline (Rare Rabbit Exact Look) */}
        <h2 className="text-sm lg:text-base xl:text-lg font-bold tracking-[0.16em] uppercase text-white drop-shadow-md underline underline-offset-8 decoration-white/70 group-hover:decoration-white transition-all">
          {cat.name.toUpperCase()}
        </h2>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white font-sans pb-16 md:pb-0">
      {/* ========================================================================= */}
      {/* 1. MOBILE FEED (Vertical Stack - md:hidden)                                */}
      {/* Seamless vertical continuous line feed (unchanged)                        */}
      {/* ========================================================================= */}
      <section id="home-category-banners-mobile" className="w-full space-y-0 md:hidden">
        {activeCategories.map((cat, idx) => (
          <div
            key={`mobile-${cat.id}`}
            id={`home-category-banner-${cat.slug}`}
            onClick={() => handleCategoryClick(cat)}
            className="relative w-full aspect-[3/4] overflow-hidden bg-zinc-950 cursor-pointer select-none group border-b border-zinc-900/10 active:scale-[0.992] transition-transform duration-150"
            role="button"
            tabIndex={0}
            aria-label={`Explore ${cat.name} Collection`}
          >
            {cat.imageUrl || cat.bannerUrl ? (
              <img
                src={getCacheBustedUrl(cat.imageUrl || cat.bannerUrl, cat.updatedAt || cat.order)}
                alt={cat.name}
                className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-105"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black text-white p-6 text-center">
                <img src="/assets/redmode-official-emblem.png" alt="REDMODE" className="w-16 h-16 opacity-50 mb-4 object-contain" />
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-zinc-400">REDMODE COLLECTION</span>
                <span className="text-2xl font-bold tracking-wider uppercase text-white mt-1">{cat.name}</span>
              </div>
            )}

            {/* Subtle Vignette Gradient for Editorial Mood & Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

            {/* Typography at Bottom Center */}
            <div className="absolute inset-x-0 bottom-8 px-4 text-center flex flex-col items-center justify-center pointer-events-none space-y-1">
              {/* Top Tagline / Starting Price */}
              <span className="text-[10px] font-semibold tracking-[0.24em] text-zinc-300 uppercase drop-shadow-md">
                {cat.tagline ||
                  (cat.slug === 'kurti'
                    ? `STARTING AT JUST ${formatPrice(749)}`
                    : cat.slug === 'trouser' || cat.slug === 'bottom'
                    ? `STARTING AT JUST ${formatPrice(899)}`
                    : cat.slug === 'kurti-set'
                    ? `STARTING AT JUST ${formatPrice(1299)}`
                    : `STARTING AT JUST ${formatPrice(499)}`)}
              </span>

              {/* Main Bold Category Headline */}
              <h1 className="text-3xl font-bold uppercase tracking-wider text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                {cat.name.toUpperCase()}
              </h1>

              {/* Action Callout */}
              <span className="text-[10px] text-white/90 tracking-[0.18em] uppercase font-medium pt-1 underline underline-offset-4 decoration-white/60">
                EXPLORE COLLECTION →
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ========================================================================= */}
      {/* 2. DESKTOP EDITORIAL BALANCED GRID (hidden md:grid / md:flex)              */}
      {/* - If <= 4 categories: Classic 4-pillar full viewport height split         */}
      {/* - If 5 categories: Top row 3 (33.3% each) + Bottom row 2 (50% - 50%)      */}
      {/* - If 6 categories: Top row 3 (33.3% each) + Bottom row 3 (33.3% each)     */}
      {/* ========================================================================= */}

      {/* CASE A: 1 to 4 Categories (Current Default State) */}
      {activeCategories.length <= 4 && (
        <section
          id="home-category-banners-desktop"
          className="hidden md:grid w-full h-[calc(100vh-56px)] min-h-[600px] max-h-[920px] bg-zinc-950 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${activeCategories.length}, minmax(0, 1fr))`,
          }}
        >
          {activeCategories.map((cat, idx) =>
            renderDesktopTile(cat, idx, idx === activeCategories.length - 1)
          )}
        </section>
      )}

      {/* CASE B: Exactly 5 Categories (Both Rows 100% Full Width Edge-to-Edge, No Black Gaps) */}
      {activeCategories.length === 5 && (
        <section
          id="home-category-banners-desktop-5"
          className="hidden md:flex flex-col w-full bg-zinc-950 overflow-hidden"
        >
          {/* Top Row: 3 Categories (Full Width - 33.33% each) */}
          <div className="w-full h-[50vh] min-h-[420px] max-h-[560px] grid grid-cols-3 border-b border-zinc-900/40">
            {activeCategories.slice(0, 3).map((cat, idx) =>
              renderDesktopTile(cat, idx, idx === 2)
            )}
          </div>

          {/* Bottom Row: 2 Categories (Full Width - 50% each, Edge-to-Edge) */}
          <div className="w-full h-[50vh] min-h-[420px] max-h-[560px] grid grid-cols-2">
            {activeCategories.slice(3, 5).map((cat, idx) =>
              renderDesktopTile(cat, idx + 3, idx === 1)
            )}
          </div>
        </section>
      )}

      {/* CASE C: Exactly 6 Categories (Top 3 Equal 33.33% + Bottom 3 Equal 33.33%) */}
      {activeCategories.length === 6 && (
        <section
          id="home-category-banners-desktop-6"
          className="hidden md:flex flex-col w-full bg-zinc-950 overflow-hidden"
        >
          {/* Top Row: 3 Categories */}
          <div className="w-full h-[52vh] min-h-[440px] max-h-[580px] grid grid-cols-3 border-b border-zinc-900/40">
            {activeCategories.slice(0, 3).map((cat, idx) =>
              renderDesktopTile(cat, idx, idx === 2)
            )}
          </div>

          {/* Bottom Row: 3 Categories */}
          <div className="w-full h-[52vh] min-h-[440px] max-h-[580px] grid grid-cols-3">
            {activeCategories.slice(3, 6).map((cat, idx) =>
              renderDesktopTile(cat, idx + 3, idx === 2)
            )}
          </div>
        </section>
      )}

      {/* CASE D: More Than 6 Categories (Clean 3 to 4 Column Balanced Grid) */}
      {activeCategories.length > 6 && (
        <section
          id="home-category-banners-desktop-more"
          className="hidden md:grid grid-cols-3 lg:grid-cols-4 w-full bg-zinc-950 overflow-hidden"
        >
          {activeCategories.map((cat, idx) =>
            renderDesktopTile(
              cat,
              idx,
              (idx + 1) % 4 === 0,
              'h-[50vh] min-h-[420px] max-h-[560px]'
            )
          )}
        </section>
      )}
    </div>
  );
};
