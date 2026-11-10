import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ProductGridSkeleton';
import { expandProductsForListing } from '../utils/productVariants';
import { getCacheBustedUrl } from '../utils/cacheBuster';
import {
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  ChevronLeft,
  Check,
} from 'lucide-react';

export const Catalogue: React.FC = () => {
  const {
    products,
    categories,
    selectedCategorySlug,
    setSelectedCategorySlug,
    selectedSubcategorySlug,
    setSelectedSubcategorySlug,
    subcategoriesShowcaseCategorySlug,
    setSubcategoriesShowcaseCategorySlug,
    searchQuery,
    setActiveView,
  } = useStore();

  const [priceSort, setPriceSort] = useState<'featured' | 'low-high' | 'high-low' | 'bestsellers'>('featured');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string | null>(null);
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [selectedSubSubcategorySlug, setSelectedSubSubcategorySlug] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showAllSubcatProducts, setShowAllSubcatProducts] = useState(false);
  const [gridColumns, setGridColumns] = useState<2 | 4>(4);
  const [mobileGridColumns, setMobileGridColumns] = useState<1 | 2>(1);
  const [isGridLoading, setIsGridLoading] = useState<boolean>(products.length === 0);

  // If products are loaded, keep grid ready without artificial lag
  useEffect(() => {
    if (products.length > 0) {
      setIsGridLoading(false);
    }
  }, [products]);

  // Active category object if found
  const currentCategory = useMemo(() => {
    if (!selectedCategorySlug) return undefined;
    const s = selectedCategorySlug.toLowerCase();
    return categories.find(
      (c) => c.slug.toLowerCase() === s || c.name.toLowerCase() === s
    );
  }, [categories, selectedCategorySlug]);

  // Subcategories for active category (manageable dynamically from Admin Panel)
  // If category has no subcategories (e.g. Kurti Sets), returns [] so customer goes directly to products!
  const activeSubcategories = useMemo(() => {
    if (!currentCategory) return [];

    if (!Array.isArray(currentCategory.subcategories) || currentCategory.subcategories.length === 0) {
      return [];
    }

    return currentCategory.subcategories
      .map((s: any, idx: number) => {
        if (typeof s === 'string') {
          return {
            id: `sub-${idx}-${s.toLowerCase().replace(/\s+/g, '-')}`,
            name: s,
            slug: s.toLowerCase().replace(/\s+/g, '-'),
            imageUrl: '',
            bannerUrl: '',
            description: '',
          };
        }
        return {
          id: s.id || `sub-${idx}`,
          name: s.name || s.slug || '',
          slug: (s.slug || s.name || '').toLowerCase().replace(/\s+/g, '-'),
          imageUrl: s.imageUrl || '',
          bannerUrl: s.bannerUrl || '',
          description: s.description || '',
        };
      })
      .filter((s) => s.name && s.slug);
  }, [currentCategory]);

  const currentSubcategory = useMemo(() => {
    if (!selectedSubcategorySlug) return undefined;
    return activeSubcategories.find(
      (sub) => sub.slug.toLowerCase() === selectedSubcategorySlug.toLowerCase()
    );
  }, [activeSubcategories, selectedSubcategorySlug]);

  // Child categories / Variety styles inside active subcategory
  const activeSubSubcategories = useMemo(() => {
    if (!currentSubcategory) return [];
    const rawChildren = (currentSubcategory as any).subcategories || (currentSubcategory as any).childCategories || [];
    if (!Array.isArray(rawChildren)) return [];
    return rawChildren
      .map((child: any) =>
        typeof child === 'string'
          ? { id: child, name: child, slug: child.toLowerCase().replace(/\s+/g, '-') }
          : {
              id: child.id || child.slug,
              name: child.name,
              slug: child.slug || child.name.toLowerCase().replace(/\s+/g, '-'),
            }
      )
      .filter((c: any) => c.name);
  }, [currentSubcategory]);

  // Showcase Banners ONLY when entering from Home Page and subcategories exist:
  // When browsing from product section/navbar, or if category has no subcategories, show products directly!
  const isBrowsingSubcategoryShowcase = Boolean(
    subcategoriesShowcaseCategorySlug &&
    selectedCategorySlug &&
    subcategoriesShowcaseCategorySlug.toLowerCase() === selectedCategorySlug.toLowerCase() &&
    activeSubcategories.length > 0 &&
    !selectedSubcategorySlug
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.published)
      .filter((p) => {
        // Category filter
        if (selectedCategorySlug) {
          const catSlug = selectedCategorySlug.toLowerCase();
          const pCat = (p.category || '').toLowerCase().replace(/\s+/g, '-');
          const pSub = (p.subcategory || '').toLowerCase().replace(/\s+/g, '-');
          const pType = (p.kurtiType || p.typeStyle || '').toLowerCase().replace(/\s+/g, '-');
          const pName = (p.name || '').toLowerCase();

          let matches =
            pCat === catSlug ||
            pSub === catSlug ||
            pType === catSlug ||
            pType.includes(catSlug) ||
            pCat.includes(catSlug) ||
            catSlug.includes(pCat);

          if (!matches) {
            if (catSlug === 'short-kurti') {
              matches =
                pType.includes('short') ||
                pSub.includes('short') ||
                pName.includes('short');
            } else if (catSlug === 'long-kurti') {
              matches =
                pType.includes('long') ||
                pSub.includes('long') ||
                pName.includes('long') ||
                (p.category.toLowerCase().includes('kurti') && !pType.includes('short') && !pSub.includes('short'));
            } else if (catSlug.startsWith('tag:')) {
              const rawTag = catSlug.replace('tag:', '').trim().toLowerCase();
              const isNew = rawTag.includes('new') || rawTag.includes('launch') || rawTag.includes('arrival');
              const isBest = rawTag.includes('best') || rawTag.includes('bestseller') || rawTag.includes('hot');
              const isFest = rawTag.includes('festive') || rawTag.includes('diwali') || rawTag.includes('wedding');

              if (isNew) {
                matches = Boolean(p.isNewLaunch || p.isNewArrival || p.offerTag?.toLowerCase().includes('new') || p.offerTag?.toLowerCase().includes('launch') || true);
              } else if (isBest) {
                matches = Boolean(p.isBestseller || p.offerTag?.toLowerCase().includes('best') || (p.salesCount && p.salesCount >= 1) || (p.rating && p.rating >= 4.7));
              } else if (isFest) {
                matches = Boolean(p.isFestive || p.offerTag?.toLowerCase().includes('festive') || p.name.toLowerCase().includes('festive') || p.category.toLowerCase().includes('set') || p.subcategory?.toLowerCase().includes('festive'));
              } else {
                matches = Boolean(
                  p.offerTag?.toLowerCase().includes(rawTag) ||
                  p.tags?.some((t) => t.toLowerCase().includes(rawTag)) ||
                  p.name.toLowerCase().includes(rawTag) ||
                  p.category.toLowerCase().includes(rawTag) ||
                  p.subcategory.toLowerCase().includes(rawTag)
                );
              }
            } else if (catSlug === 'new-arrivals' || catSlug === 'new-launch') {
              matches = Boolean(p.isNewLaunch || p.isNewArrival || p.offerTag?.toLowerCase().includes('new') || p.offerTag?.toLowerCase().includes('launch') || true);
            } else if (catSlug === 'bestseller' || catSlug === 'bestsellers') {
              matches = Boolean(p.isBestseller || p.offerTag?.toLowerCase().includes('best') || (p.salesCount && p.salesCount >= 1) || (p.rating && p.rating >= 4.7));
            } else if (catSlug === 'festive' || catSlug === 'festive-collection') {
              matches = Boolean(p.isFestive || p.offerTag?.toLowerCase().includes('festive') || p.name.toLowerCase().includes('festive') || p.category.toLowerCase().includes('set'));
            } else if (catSlug === 'kurti') {
              matches =
                p.category.toLowerCase().includes('kurti') ||
                pName.includes('kurti') ||
                pSub.includes('kurti');
            } else if (catSlug === 'kurti-set' || catSlug === 'sets' || catSlug === 'kurti-sets') {
              matches =
                pCat.includes('set') ||
                pSub.includes('set') ||
                pName.includes('set') ||
                p.category.toLowerCase().includes('set');
            } else if (
              catSlug === 'trouser' ||
              catSlug === 'trousers' ||
              catSlug === 'bottom' ||
              catSlug === 'bottom-wear'
            ) {
              matches =
                p.category.toLowerCase().includes('trouser') ||
                p.category.toLowerCase().includes('bottom') ||
                pSub.includes('pant') ||
                pSub.includes('palazzo') ||
                pSub.includes('trouser') ||
                pName.includes('trouser') ||
                pName.includes('pant') ||
                pName.includes('palazzo');
            } else if (catSlug === 'jewellery' || catSlug === 'jewelry') {
              matches =
                p.category.toLowerCase().includes('jewel') ||
                pSub.includes('jewel') ||
                pName.includes('jewel') ||
                pName.includes('earring') ||
                pName.includes('necklace') ||
                pName.includes('bangle');
            } else if (
              catSlug === 'embroidered-kurti' ||
              catSlug === 'embroidery' ||
              catSlug === 'embroider'
            ) {
              matches =
                pSub.includes('embroidered') ||
                pName.includes('embroidered') ||
                pName.includes('zari') ||
                pSub.includes('chikankari') ||
                pName.includes('chikankari') ||
                p.category.toLowerCase().includes('embroidered') ||
                p.category.toLowerCase().includes('embroidery');
            }
          }

          if (!matches) return false;
        } else if (!searchQuery.trim()) {
          // When in default shop view without search, show all Kurtis
          const isKurti =
            p.category.toLowerCase().includes('kurti') ||
            p.name.toLowerCase().includes('kurti') ||
            p.subcategory.toLowerCase().includes('kurti');
          if (!isKurti) return false;
        }

        // Subcategory filter
        if (selectedSubcategorySlug) {
          const sSlug = selectedSubcategorySlug.toLowerCase().replace(/\s+/g, '-');
          const pSub = (p.subcategory || '').toLowerCase().replace(/\s+/g, '-');
          const pType = (p.kurtiType || p.typeStyle || '').toLowerCase().replace(/\s+/g, '-');
          const pCat = (p.category || '').toLowerCase().replace(/\s+/g, '-');
          const pName = (p.name || '').toLowerCase();

          let matchSub =
            pSub === sSlug ||
            pSub.includes(sSlug) ||
            sSlug.includes(pSub) ||
            pType === sSlug ||
            pType.includes(sSlug) ||
            pCat === sSlug ||
            pName.includes(sSlug.replace(/-/g, ' '));

          if (!matchSub) {
            if (sSlug === 'printed') {
              matchSub = pSub.includes('print') || pName.includes('print');
            } else if (sSlug === 'embroidered') {
              matchSub =
                pSub.includes('embroider') ||
                pName.includes('embroider') ||
                pSub.includes('zari') ||
                pSub.includes('chikankari') ||
                pName.includes('zari') ||
                pName.includes('chikankari');
            } else if (sSlug === 'solids' || sSlug === 'simple' || sSlug === 'classic-solids') {
              matchSub =
                pSub.includes('solid') ||
                pSub.includes('simple') ||
                pName.includes('solid') ||
                pSub.includes('short') ||
                pSub.includes('long') ||
                (!pSub.includes('print') && !pSub.includes('embroider') && !pName.includes('printed') && !pName.includes('embroidered'));
            } else if (sSlug === 'straight-fit') {
              matchSub =
                pSub.includes('straight') ||
                pSub.includes('cigarette') ||
                pSub.includes('tailored') ||
                pName.includes('straight');
            } else if (sSlug === 'regular-fit') {
              matchSub =
                pSub.includes('regular') ||
                pSub.includes('palazzo') ||
                pSub.includes('pocket') ||
                pName.includes('regular') ||
                pName.includes('palazzo');
            }
          }

          if (!matchSub) return false;
        }

        // Sub-subcategory / Variety filter
        if (selectedSubSubcategorySlug) {
          const subSubSlug = selectedSubSubcategorySlug.toLowerCase().replace(/\s+/g, '-');
          const pSubSub = ((p as any).subSubcategory || '').toLowerCase().replace(/\s+/g, '-');
          const pName = (p.name || '').toLowerCase();
          const matchSubSub =
            pSubSub === subSubSlug ||
            pSubSub.includes(subSubSlug) ||
            subSubSlug.includes(pSubSub) ||
            pName.includes(subSubSlug.replace(/-/g, ' '));
          if (!matchSubSub) return false;
        }

        // Size filter
        if (selectedSizeFilter) {
          if (!p.sizes.includes(selectedSizeFilter)) return false;
        }

        // Color filter
        if (selectedColorFilter) {
          const hasColor =
            (p.color && p.color.toLowerCase() === selectedColorFilter.toLowerCase()) ||
            p.colorOptions?.some((c) => c.name.toLowerCase() === selectedColorFilter.toLowerCase());
          if (!hasColor) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchSearch =
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            p.subcategory.toLowerCase().includes(query);
          if (!matchSearch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (priceSort === 'low-high') return a.price - b.price;
        if (priceSort === 'high-low') return b.price - a.price;
        if (priceSort === 'bestsellers') return (b.salesCount || 0) - (a.salesCount || 0);
        return 0; // featured default
      });
  }, [
    products,
    selectedCategorySlug,
    selectedSubcategorySlug,
    selectedSizeFilter,
    selectedColorFilter,
    searchQuery,
    priceSort,
  ]);

  // Expand multi-color products to display each color option separately (Rare Rabbit style)
  const listingItems = useMemo(() => {
    return expandProductsForListing(filteredProducts);
  }, [filteredProducts]);

  // Curated recommendations for editorial discovery (Section 10)
  const curatedRecommendations = useMemo(() => {
    return products
      .filter((p) => p.published)
      .slice(0, 4);
  }, [products]);

  // All available sizes for filter drawer
  const allAvailableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'bestsellers', label: 'Best Sellers' },
    { value: 'low-high', label: 'Price: Low to High' },
    { value: 'high-low', label: 'Price: High to Low' },
  ];

  // Helper to dynamically get image for subcategory from inventory, custom category data, or high-res fallbacks
  const getSubcategoryImage = (subSlug: string, subName: string, customImage?: string): string => {
    if (customImage && customImage.trim()) {
      return customImage.trim();
    }
    const cleanSub = subSlug.toLowerCase().replace(/\s+/g, '-');
    const cleanName = subName.toLowerCase();

    // 1. Try to find a real product image from current inventory matching this subcategory
    const prod = products.find((p) => {
      if (!p.published) return false;
      const pSub = (p.subcategory || '').toLowerCase().replace(/\s+/g, '-');
      const pCat = (p.category || '').toLowerCase().replace(/\s+/g, '-');
      const pName = (p.name || '').toLowerCase();
      return (
        pSub === cleanSub ||
        pSub.includes(cleanSub) ||
        cleanSub.includes(pSub) ||
        pName.includes(cleanName) ||
        pCat === cleanSub
      );
    });
    if (prod && prod.mainImage) {
      return prod.mainImage;
    }

    // 2. High quality fallback images for known subcategories
    const fallbackMap: Record<string, string> = {
      'printed': 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1800&q=85',
      'printed-kurti': 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1800&q=85',
      'embroidered': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1800&q=85',
      'embroidered-kurti': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1800&q=85',
      'solids': 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1800&q=85',
      'simple': 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1800&q=85',
      'classic-solids': 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1800&q=85',
      'straight-fit': 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1800&q=85',
      'cigarette-pants': 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1800&q=85',
      'regular-fit': 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1800&q=85',
      'flared-palazzos': 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1800&q=85',
      'long-kurti': 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1800&q=85',
      'short-kurti': 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1800&q=85',
      'kurti-set': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1800&q=85',
      'festive-kurti-sets': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1800&q=85',
      'jewellery': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1800&q=85',
    };

    return fallbackMap[cleanSub] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1800&q=85';
  };

  return (
    <div className="w-full bg-white font-sans text-zinc-900 pb-20 sm:pb-12">
      {isBrowsingSubcategoryShowcase ? (
        <section className="w-full bg-zinc-950 overflow-hidden">
          {/* 1. Mobile Subcategories (Stacked Full-Screen Banners) */}
          <div className="md:hidden w-full flex flex-col">
            {activeSubcategories.map((sub, idx) => {
              const rawSubImage = sub.imageUrl || sub.bannerUrl;
              const imageUrl = getCacheBustedUrl(
                getSubcategoryImage(sub.slug, sub.name, rawSubImage),
                currentCategory?.updatedAt
              );
              return (
                <div
                  key={`mobile-${sub.id}`}
                  id={`mobile-subcat-banner-${sub.slug}`}
                  onClick={() => {
                    setSelectedSubcategorySlug(sub.slug);
                    setSelectedSubSubcategorySlug(null);
                    setSubcategoriesShowcaseCategorySlug(null);
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }}
                  className="relative w-full h-[52vh] min-h-[380px] overflow-hidden bg-zinc-950 cursor-pointer select-none border-b border-zinc-900/40"
                  role="button"
                  tabIndex={0}
                  aria-label={`Explore ${sub.name}`}
                >
                  <img
                    src={imageUrl}
                    alt={sub.name}
                    className="w-full h-full object-cover object-top"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-8 px-4 text-center flex flex-col items-center justify-center pointer-events-none space-y-1">
                    <span className="text-[10px] font-semibold tracking-[0.24em] text-zinc-300 uppercase drop-shadow-md">
                      {sub.description || 'EXCLUSIVE LUXURY EDIT'}
                    </span>
                    <h2 className="text-3xl font-bold uppercase tracking-wider text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                      {sub.name.toUpperCase()}
                    </h2>
                    <span className="text-[10px] text-white/90 tracking-[0.18em] uppercase font-medium pt-1 underline underline-offset-4 decoration-white/60">
                      EXPLORE COLLECTION →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Desktop Subcategories Grid (Side-by-Side Vertical Split Banners) */}
          <div
            id="desktop-subcategory-banners"
            className="hidden md:grid w-full h-[calc(100vh-48px)] min-h-[600px] max-h-[920px] bg-zinc-950 overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${activeSubcategories.length}, minmax(0, 1fr))`,
            }}
          >
            {activeSubcategories.map((sub, idx) => {
              const rawSubImage = sub.imageUrl || sub.bannerUrl;
              const imageUrl = getCacheBustedUrl(
                getSubcategoryImage(sub.slug, sub.name, rawSubImage),
                currentCategory?.updatedAt
              );
              return (
                <div
                  key={`desktop-${sub.id}`}
                  id={`desktop-subcat-tile-${sub.slug}`}
                  onClick={() => {
                    setSelectedSubcategorySlug(sub.slug);
                    setSelectedSubSubcategorySlug(null);
                    setSubcategoriesShowcaseCategorySlug(null);
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }}
                  className="relative w-full h-full overflow-hidden bg-zinc-950 cursor-pointer select-none group border-r border-zinc-900/30 last:border-r-0 transition-transform duration-200"
                  role="button"
                  tabIndex={0}
                  aria-label={`Explore ${sub.name} Collection`}
                >
                  <img
                    src={imageUrl}
                    alt={sub.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none group-hover:from-black/90 transition-all duration-300" />
                  <div className="absolute inset-x-0 bottom-8 lg:bottom-12 px-3 text-center flex flex-col items-center justify-end pointer-events-none space-y-1">
                    <span className="text-[10px] lg:text-[11px] font-semibold tracking-[0.2em] text-zinc-300 uppercase drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 line-clamp-1">
                      {sub.description || 'EXCLUSIVE LUXURY EDIT'}
                    </span>
                    <h2 className="text-sm lg:text-base xl:text-lg font-bold tracking-[0.16em] uppercase text-white drop-shadow-md underline underline-offset-8 decoration-white/70 group-hover:decoration-white transition-all">
                      {sub.name.toUpperCase()}
                    </h2>
                    <span className="text-[10px] text-white/90 tracking-[0.18em] uppercase font-medium pt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      EXPLORE COLLECTION →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 2. MINIMAL FILTER & SORT TOOLBAR (PREMIUM FASHION EDITORIAL HEADER)        */}
          {/* Left: [🎚] FILTER   [⇅] SORT BY                                           */}
          {/* Center: {count} PRODUCTS                                                  */}
          {/* Right: [ ▢ ] (1-Col)   [ ◫ ] (2-Col)   [ ▦ ] (4-Col Grid)                */}
          {/* ========================================================================= */}
          <div className="w-full bg-white text-zinc-900 border-b border-zinc-200 relative z-20 shadow-2xs">
            <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-11 sm:h-12 flex items-center justify-between">
              {/* Left: FILTER & SORT BY */}
              <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                {/* FILTER BUTTON */}
                <button
                  type="button"
                  id="catalogue-filter-toggle-btn"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-900 hover:text-black cursor-pointer select-none transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span>FILTER</span>
                  {(selectedCategorySlug || selectedSubcategorySlug || selectedSizeFilter || selectedColorFilter) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E52229]" />
                  )}
                </button>

                {/* SORT BY DROPDOWN */}
                <div className="relative">
                  <button
                    type="button"
                    id="catalogue-sort-toggle-btn"
                    onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-zinc-900 hover:text-black cursor-pointer select-none transition"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>SORT BY</span>
                  </button>

                  {/* Sort Menu Popup */}
                  {isSortDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSortDropdownOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-52 bg-white text-zinc-900 border border-zinc-200 shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setPriceSort(opt.value as any);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between tracking-wide transition cursor-pointer ${
                              priceSort === opt.value
                                ? 'font-bold text-black bg-zinc-50'
                                : 'text-zinc-700 hover:bg-zinc-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {priceSort === opt.value && <Check className="w-3.5 h-3.5 text-black" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Center: Collection / Category Title (No product count/numbers per specification) */}
              <div className="text-center font-sans pointer-events-none select-none truncate max-w-[200px] sm:max-w-xs">
                {currentCategory && (
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900 truncate">
                    {selectedSubcategorySlug
                      ? currentSubcategory?.name || selectedSubcategorySlug.replace(/-/g, ' ')
                      : currentCategory.name}
                  </span>
                )}
              </div>

              {/* Right: Grid Controls */}
              {/* Mobile: ONLY 2 Products View Grid Icon [ ◫ ] (Default is 1 photo single preview; clicking toggles to 2 products view) */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button
                  type="button"
                  id="mobile-view-toggle-2-col"
                  onClick={() => setMobileGridColumns((prev) => (prev === 1 ? 2 : 1))}
                  className={`p-1.5 transition cursor-pointer select-none md:hidden ${
                    mobileGridColumns === 2
                      ? 'text-black'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                  title={mobileGridColumns === 1 ? 'Switch to 2 Products Grid' : 'Switch to Single Product View'}
                  aria-label="2 Column View"
                >
                  <svg
                    className={`w-4 h-4 ${
                      mobileGridColumns === 2 ? 'stroke-[2]' : 'stroke-[1.3]'
                    }`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect x="2" y="2" width="12" height="12" rx="0.5" />
                    <line x1="8" y1="2" x2="8" y2="14" />
                  </svg>
                </button>

                {/* Desktop: 4 Columns Grid */}
                <div className="hidden md:flex items-center gap-1.5 sm:gap-2.5">
                  {/* 4 Columns on desktop (Default) */}
                  <button
                    type="button"
                    id="view-toggle-4-col"
                    onClick={() => setGridColumns(4)}
                    className="p-1.5 transition select-none text-black cursor-default"
                    title="4 Column Grid View"
                    aria-label="4 Column View"
                  >
                    <svg
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                    >
                      <rect x="2" y="2" width="12" height="12" rx="0.5" />
                      <line x1="8" y1="2" x2="8" y2="14" />
                      <line x1="2" y1="8" x2="14" y2="8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2B. SUBCATEGORY QUICK FILTER CHIPS (e.g. Straight Fit, Regular Fit)        */}
          {/* ========================================================================= */}
          {activeSubcategories.length > 0 && (
            <div className="w-full bg-zinc-50/80 border-b border-zinc-200/90 py-2.5 px-3 sm:px-6 lg:px-8">
              <div className="max-w-[1920px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 mr-1 shrink-0 select-none">
                  STYLE:
                </span>
                <button
                  type="button"
                  id="subcat-chip-all"
                  onClick={() => {
                    setSelectedSubcategorySlug(null);
                    setSelectedSubSubcategorySlug(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition shrink-0 cursor-pointer ${
                    !selectedSubcategorySlug
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-black border border-zinc-200'
                  }`}
                >
                  All {currentCategory?.name || 'Styles'}
                </button>
                {activeSubcategories.map((sub) => {
                  const isSelected = selectedSubcategorySlug?.toLowerCase() === sub.slug.toLowerCase();
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      id={`subcat-chip-${sub.slug}`}
                      onClick={() => {
                        setSelectedSubcategorySlug(isSelected ? null : sub.slug);
                        setSelectedSubSubcategorySlug(null);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-950 text-white shadow-xs'
                          : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-black border border-zinc-200'
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2C. SUB-SUBCATEGORY (VARIETY / CHILD STYLES) FILTER CHIPS                 */}
          {/* ========================================================================= */}
          {activeSubSubcategories.length > 0 && (
            <div className="w-full bg-zinc-100/90 border-b border-zinc-200 py-2 px-3 sm:px-6 lg:px-8">
              <div className="max-w-[1920px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 mr-1 shrink-0 select-none">
                  VARIETY:
                </span>
                <button
                  type="button"
                  id="subsubcat-chip-all"
                  onClick={() => setSelectedSubSubcategorySlug(null)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition shrink-0 cursor-pointer ${
                    !selectedSubSubcategorySlug
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-white text-zinc-700 hover:bg-zinc-200 hover:text-black border border-zinc-300'
                  }`}
                >
                  All Varieties
                </button>
                {activeSubSubcategories.map((child: any) => {
                  const isSelected = selectedSubSubcategorySlug?.toLowerCase() === child.slug.toLowerCase();
                  return (
                    <button
                      key={child.id || child.slug}
                      type="button"
                      id={`subsubcat-chip-${child.slug}`}
                      onClick={() => setSelectedSubSubcategorySlug(isSelected ? null : child.slug)}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-white text-zinc-700 hover:bg-zinc-200 hover:text-black border border-zinc-300'
                      }`}
                    >
                      {child.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. MAIN PRODUCT FEED (PREMIUM 4-COLUMN DESKTOP / 1 OR 2-COLUMN MOBILE GRID) */}
          {/* Clean minimal spacing, identical aspect ratio portrait photography        */}
          {/* ========================================================================= */}
          <div className="w-full bg-white pt-2 sm:pt-4 pb-16">
            <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
              {isGridLoading ? (
                <ProductGridSkeleton
                  count={8}
                  gridColumns={gridColumns}
                  mobileGridColumns={mobileGridColumns}
                  hideColorOptions={false}
                />
              ) : listingItems.length > 0 ? (
                <>
                  <div
                    className={`grid w-full ${
                      mobileGridColumns === 1
                        ? 'grid-cols-1 gap-y-10 sm:gap-y-12'
                        : 'grid-cols-2 gap-x-1.5 sm:gap-x-2.5 gap-y-7 sm:gap-y-8'
                    } md:grid-cols-3 lg:grid-cols-4 md:gap-x-2.5 lg:gap-x-3 md:gap-y-10 lg:gap-y-12`}
                  >
                    {listingItems.map((item, idx) => (
                      <ProductCard
                        key={item.cardKey}
                        product={item.product}
                        variantColor={item.variantColor}
                        hideColorOptions={false}
                        priority={idx < 4}
                      />
                    ))}
                  </div>

                  {/* YOU MAY ALSO LIKE (Bottom recommendations: 4 products across 4 cols on desktop) */}
                  {curatedRecommendations.length > 0 && (
                    <div className="mt-16 sm:mt-20 pt-12 border-t border-zinc-200 w-full">
                      <div className="text-center mb-8 px-4">
                        <h2 className="text-xs sm:text-sm font-bold tracking-[0.22em] text-zinc-950 uppercase">
                          YOU MAY ALSO LIKE
                        </h2>
                      </div>
                      <div
                        className={`grid w-full ${
                          mobileGridColumns === 1
                            ? 'grid-cols-1 gap-y-10'
                            : 'grid-cols-2 gap-x-1.5 gap-y-7'
                        } md:grid-cols-4 md:gap-x-2.5 lg:gap-x-3 md:gap-y-10 px-0 sm:px-2`}
                      >
                        {curatedRecommendations.slice(0, 4).map((prod) => (
                          <ProductCard key={`cat-rec-${prod.id}`} product={prod} hideColorOptions={false} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-24 text-center">
                  <h3 className="text-base font-normal uppercase tracking-widest text-zinc-800 mb-2">
                    No products found
                  </h3>
                  <p className="text-xs text-zinc-500 mb-6">
                    Try removing some filters or exploring other collections.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategorySlug(null);
                      setSelectedSubcategorySlug(null);
                      setSelectedSizeFilter(null);
                      setSelectedColorFilter(null);
                    }}
                    className="px-8 py-3 border border-zinc-950 text-xs font-normal uppercase tracking-widest hover:bg-zinc-950 hover:text-white transition"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. SLIDE-OVER FILTER DRAWER (Rare Rabbit style clean sidebar drawer)       */}
      {/* ========================================================================= */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-overlay"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-10 animate-drawer-left">
            {/* Drawer Header */}
            <div className="h-16 px-6 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-sm font-normal uppercase tracking-[0.18em] text-zinc-950">
                FILTERS
              </span>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-black transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 divide-y divide-zinc-100">
              {/* Category Filter */}
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-950 block">
                  CATEGORY
                </span>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => {
                      setSelectedCategorySlug(null);
                      setSelectedSubcategorySlug(null);
                    }}
                    className={`w-full text-left py-1.5 px-2 flex items-center justify-between transition ${
                      !selectedCategorySlug
                        ? 'text-black font-bold bg-zinc-100'
                        : 'text-zinc-600 hover:text-black'
                    }`}
                  >
                    <span>All Silhouettes</span>
                    <span className="text-zinc-400">
                      {products.filter((p) => p.published).length}
                    </span>
                  </button>

                  {[...categories]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((cat) => {
                    const isSelected = selectedCategorySlug === cat.slug;
                    return (
                      <div key={cat.id}>
                        <button
                          onClick={() => {
                            setSelectedCategorySlug(cat.slug);
                            setSelectedSubcategorySlug(null);
                          }}
                          className={`w-full text-left py-1.5 px-2 flex items-center justify-between transition ${
                            isSelected
                              ? 'text-black font-bold bg-zinc-100'
                              : 'text-zinc-700 hover:text-black'
                          }`}
                        >
                          <span>{cat.name}</span>
                        </button>

                        {/* Subcategories */}
                        {isSelected && cat.subcategories && cat.subcategories.length > 0 && (
                          <div className="pl-4 py-1 space-y-1">
                            {cat.subcategories.map((sub) => {
                              const isSubSelected = selectedSubcategorySlug === sub.slug;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => setSelectedSubcategorySlug(sub.slug)}
                                  className={`w-full text-left py-1 px-2 text-[11px] transition ${
                                    isSubSelected
                                      ? 'text-black font-bold'
                                      : 'text-zinc-500 hover:text-zinc-900'
                                  }`}
                                >
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Size Filter */}
              <div className="pt-6 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-950 block">
                  SIZE
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {allAvailableSizes.map((sz) => {
                    const isSelected = selectedSizeFilter === sz;
                    return (
                      <button
                        key={sz}
                        onClick={() => setSelectedSizeFilter(isSelected ? null : sz)}
                        className={`py-2 text-xs text-center border transition ${
                          isSelected
                            ? 'border-black bg-black text-white font-medium'
                            : 'border-zinc-200 text-zinc-800 hover:border-zinc-500'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-zinc-200 bg-white grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategorySlug(null);
                  setSelectedSubcategorySlug(null);
                  setSelectedSizeFilter(null);
                  setSelectedColorFilter(null);
                }}
                className="py-3 text-center border border-zinc-300 text-xs font-normal uppercase tracking-wider text-zinc-800 hover:bg-zinc-50 transition"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="py-3 text-center bg-black text-white text-xs font-normal uppercase tracking-wider hover:bg-zinc-800 transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
