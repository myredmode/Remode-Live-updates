import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Search,
  X,
  Bookmark,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface SearchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  asPageView?: boolean;
}

interface RecommendedPhotoItem {
  id: string;
  image: string;
  productId: string;
  productName: string;
  price: number;
  mrp: number;
  offerTag?: string;
  colorName?: string;
  categoryName: string;
  categorySlug: string;
}

// 10 high-fashion editorial photoshoot images for each of RedMode's 4 core categories
// to guarantee 10 recommended looks per category under all data states
const CURATED_CATEGORY_PHOTOS: Record<string, string[]> = {
  kurti: [
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85',
  ],
  trouser: [
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1000&q=85',
  ],
  'kurti-set': [
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
  ],
  jewellery: [
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1611591475871-3310702cae43?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1598560917505-59a3ad559071?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=1000&q=85',
  ],
};

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, asPageView = false }) => {
  const {
    products,
    setActiveView,
    activeView,
    isSearchOpen,
    setIsSearchOpen,
    openProductDetail,
    formatPrice,
    wishlist,
    toggleWishlist,
    addToCart,
    setIsCartOpen,
    setCartDrawerView,
    userProfile,
    setIsLoginOpen,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  // Active category tab: 'kurti' | 'trouser' | 'kurti-set' | 'jewellery'
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('kurti');
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveViewRef = useRef(activeView);

  // Prevent duplicate rendering: if activeView is 'search', the main view router renders this component
  if (!asPageView && activeView === 'search') return null;

  const show = asPageView ? activeView === 'search' : (isOpen !== undefined ? isOpen : isSearchOpen);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsSearchOpen(false);
      if (activeView === 'search') {
        setActiveView('home');
      }
    }
  };

  // When activeView changes away from search (e.g. user clicked Footer link), close search
  useEffect(() => {
    if (show && activeView !== 'search' && activeView !== previousActiveViewRef.current) {
      if (isSearchOpen) {
        setIsSearchOpen(false);
      }
    }
    previousActiveViewRef.current = activeView;
  }, [activeView, show, isSearchOpen, setIsSearchOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  const handleProductSelect = (productId: string, initialColor?: string) => {
    openProductDetail(productId, initialColor);
    setIsSearchOpen(false);
  };

  const handleQuickAddToCart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    e.preventDefault();

    // Mandatory login check
    if (!userProfile.isLoggedIn) {
      setIsSearchOpen(false);
      setIsLoginOpen(true);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const isFree =
      !product.sizes ||
      product.sizes.length === 0 ||
      (product.sizes.length === 1 &&
        ['free size', 'freesize', 'free-size', 'free'].includes(product.sizes[0].trim().toLowerCase()));

    const candidateSizes = isFree ? ['Free size'] : product.sizes;
    const inStockSize = candidateSizes.find((sz) => (Number(product.stockBySize?.[sz] ?? 1) || 0) > 0);
    if (!inStockSize || product.inStock === false) {
      handleProductSelect(product.id);
      return;
    }

    const res = addToCart(product, inStockSize, 1);
    if (res.success) {
      setCartDrawerView('full-cart');
      setIsCartOpen(true);
    } else {
      handleProductSelect(product.id);
    }
  };

  const handleQuickWishlist = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    e.preventDefault();
    toggleWishlist(productId);
  };

  // Core 4 categories for RedMode
  const coreCategoryTabs = useMemo(() => [
    { name: 'KURTI', slug: 'kurti' },
    { name: 'TROUSER', slug: 'trouser' },
    { name: 'KURTI SETS', slug: 'kurti-set' },
    { name: 'JEWELLERY', slug: 'jewellery' },
  ], []);

  // Filtered products when user types in search bar
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return products.filter((p) => {
      if (p.published === false) return false;
      const matchText = `${p.name} ${p.category} ${p.subcategory} ${p.description || ''} ${p.material || ''}`.toLowerCase();
      const matchesQuery = matchText.includes(query);

      if (selectedCategoryTab === 'all') return matchesQuery;
      return matchesQuery && (
        p.category.toLowerCase() === selectedCategoryTab.toLowerCase() ||
        (selectedCategoryTab === 'trouser' && (p.category.toLowerCase().includes('trouser') || p.category.toLowerCase().includes('bottom'))) ||
        (selectedCategoryTab === 'kurti-set' && p.category.toLowerCase().includes('set')) ||
        (selectedCategoryTab === 'jewellery' && p.category.toLowerCase().includes('jewel'))
      );
    });
  }, [products, searchTerm, selectedCategoryTab]);

  // Exact 10 recommended photos for EACH category
  const categoryRecommendations = useMemo(() => {
    const map: Record<string, RecommendedPhotoItem[]> = {};

    for (const cat of coreCategoryTabs) {
      const slug = cat.slug.toLowerCase();
      const photos: RecommendedPhotoItem[] = [];
      const seenImages = new Set<string>();

      // Matched products in database
      const matchedProducts = products.filter((p) => {
        if (p.published === false) return false;
        const pCat = p.category.toLowerCase();
        if (slug === 'kurti') return pCat.includes('kurti') && !pCat.includes('set');
        if (slug === 'trouser') return pCat.includes('trouser') || pCat.includes('bottom');
        if (slug === 'kurti-set') return pCat.includes('set');
        if (slug === 'jewellery') return pCat.includes('jewel');
        return pCat === slug;
      });

      const primaryProduct = matchedProducts[0] || products[0] || {
        id: 'prod-fallback',
        name: `${cat.name} Signature Collection`,
        price: 899,
        mrp: 1499,
        offerTag: 'Best Seller',
      };

      for (const prod of matchedProducts) {
        if (prod.mainImage && !seenImages.has(prod.mainImage)) {
          seenImages.add(prod.mainImage);
          photos.push({
            id: `${prod.id}-main`,
            image: prod.mainImage,
            productId: prod.id,
            productName: prod.name,
            price: prod.price,
            mrp: prod.mrp,
            offerTag: prod.offerTag || 'Best Seller',
            categoryName: cat.name,
            categorySlug: cat.slug,
          });
        }

        if (Array.isArray(prod.colorOptions)) {
          for (const opt of prod.colorOptions) {
            const vImg = opt.image || opt.images?.[0];
            if (vImg && !seenImages.has(vImg)) {
              seenImages.add(vImg);
              photos.push({
                id: `${prod.id}-var-${opt.name}`,
                image: vImg,
                productId: prod.id,
                productName: prod.name,
                price: opt.price || prod.price,
                mrp: opt.mrp || prod.mrp,
                offerTag: 'Best Seller',
                colorName: opt.name,
                categoryName: cat.name,
                categorySlug: cat.slug,
              });
            }
          }
        }
      }

      // If this category has fewer than 10 items, include real published products from other categories rather than fake duplicates
      if (photos.length < 10) {
        for (const prod of products) {
          if (photos.length >= 10) break;
          if (prod.published === false) continue;
          if (prod.mainImage && !seenImages.has(prod.mainImage)) {
            seenImages.add(prod.mainImage);
            photos.push({
              id: `${prod.id}-fallback-main`,
              image: prod.mainImage,
              productId: prod.id,
              productName: prod.name,
              price: prod.price,
              mrp: prod.mrp,
              offerTag: prod.offerTag || 'Best Seller',
              categoryName: prod.category || cat.name,
              categorySlug: cat.slug,
            });
          }
        }
      }

      map[slug] = photos.slice(0, 10);
    }

    return map;
  }, [coreCategoryTabs, products]);

  if (!show) return null;

  // Determine which 10 photos to show based on active category tab
  const activeRecommendedPhotos = categoryRecommendations[selectedCategoryTab] || categoryRecommendations['kurti'] || [];

  return (
    <div
      role="main"
      className="w-full min-h-screen bg-white font-sans text-zinc-900 pb-20 md:pb-0"
    >
      {/* ========================================================================= */}
      {/* 1. EXACT UNDERLINE MINIMAL SEARCH BAR (MATCHING SCREENSHOT)                */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-center border-b border-zinc-200 pb-2.5">
          <Search className="w-4 h-4 text-zinc-500 mr-2.5 shrink-0 stroke-[1.8]" />
          <input
            ref={inputRef}
            id="search-input-field"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClose();
              }
            }}
            placeholder="SEARCH FOR KURTIS, TROUSERS, SETS..."
            className="w-full bg-transparent text-xs sm:text-sm uppercase tracking-[0.14em] font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 text-zinc-400 hover:text-black transition"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORIES ROW: NO TEXT BOLD, NO CHANGE, SMALL HORIZONTAL LINE ONLY    */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-1">
        <div className="flex items-center gap-6 sm:gap-10 overflow-x-auto no-scrollbar">
          {coreCategoryTabs.map((cat) => {
            const isActive = selectedCategoryTab === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setSelectedCategoryTab(cat.slug)}
                className="group relative pb-1 text-left cursor-pointer shrink-0"
              >
                {/* Text styling stays identical: NO text bold, NO change */}
                <span className="text-xs sm:text-sm font-medium uppercase tracking-[0.16em] text-zinc-900">
                  {cat.name}
                </span>

                {/* Small subtle horizontal line underneath on click with zero layout shift */}
                <div
                  className={`w-5 h-[1.5px] bg-black mt-1 mx-auto transition-opacity duration-150 ${
                    isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>



      {/* ========================================================================= */}
      {/* LIVE SEARCH RESULTS (IF SEARCH TERM TYPED)                                */}
      {/* ========================================================================= */}
      {searchTerm.trim() ? (
        <div className="w-full max-w-7xl mx-auto px-0 sm:px-1.5 pt-4 pb-8">
          <div className="px-3 sm:px-4 mb-3 pb-2 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-medium uppercase tracking-[0.16em] text-zinc-900">
              RESULTS ({filteredProducts.length})
            </h3>
          </div>

          {filteredProducts.length > 0 ? (
            /* Photos grid: Left & right gap removed, middle gap reduced */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-1 gap-y-4 sm:gap-x-2 sm:gap-y-6">
              {filteredProducts.map((product) => {
                const isWishlisted = wishlist.includes(product.id);
                const discountPercent =
                  product.mrp > product.price
                    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                    : 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product.id)}
                    className="group cursor-pointer flex flex-col"
                  >
                    {/* Top Overlays + Image */}
                    <div className="relative w-full aspect-[3/4] bg-[#f5f5f5] overflow-hidden">
                      {/* Top-Left Badge: Best Seller */}
                      <span className="absolute top-2 left-2 z-10 bg-[#333333] text-white text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-[2px] tracking-wide">
                        {product.offerTag || 'Best Seller'}
                      </span>

                      {/* Top-Right Bookmark / Wishlist Icon */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickWishlist(e, product.id)}
                        className="absolute top-2 right-2 z-10 p-1 text-zinc-800 hover:text-black transition"
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-label="Wishlist"
                      >
                        <Bookmark
                          className={`w-4 h-4 stroke-[1.5] ${
                            isWishlisted ? 'fill-black text-black' : 'text-zinc-800'
                          }`}
                        />
                      </button>

                      {/* Studio Product Shot with Lazy Loading */}
                      <img
                        src={product.mainImage}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Card Content Below Image (No Color Options) */}
                    <div className="pt-2 px-1.5 sm:px-2 flex flex-col">
                      {/* Line 1: Title & Shopping Bag */}
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs sm:text-sm font-medium text-zinc-900 truncate">
                          {product.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => handleQuickAddToCart(e, product.id)}
                          className="p-0.5 text-zinc-800 hover:text-black transition shrink-0"
                          title="Quick add to bag"
                          aria-label="Add to bag"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 stroke-[1.6]" />
                        </button>
                      </div>

                      {/* Line 2: Subtitle / Shade */}
                      <p className="text-[11px] sm:text-xs text-zinc-500 truncate mt-0.5">
                        {product.color ? `Close - ${product.color}` : `Pure Fabric - ${product.category}`}
                      </p>

                      {/* Line 3: Pricing (MRP strikethrough, Sale price, Discount % in red) */}
                      <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-[13px]">
                        {product.mrp > product.price && (
                          <span className="line-through text-zinc-400 font-normal">
                            {formatPrice(product.mrp)}
                          </span>
                        )}
                        <span className="font-semibold text-zinc-900">
                          {formatPrice(product.price)}
                        </span>
                        {discountPercent > 0 && (
                          <span className="text-[#E52229] font-medium">
                            {discountPercent}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 mx-3">
              <p className="text-zinc-600 text-sm font-medium">
                No items found matching &quot;{searchTerm}&quot;
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                Explore our recommended looks below.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 3. "YOU MAY ALSO LIKE" SECTION (NO COLOR OPTIONS, EDGE-TO-EDGE GRID)      */}
      {/* 10 Recommended photos for each category                                   */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-1.5 pt-4 pb-12">
        <div className="px-3 sm:px-4 mb-3">
          <h3 className="text-xs sm:text-sm font-medium uppercase tracking-[0.16em] text-zinc-900">
            YOU MAY ALSO LIKE
          </h3>
        </div>

        {/* 10 Photos Grid for Selected Category: side gap removed, middle gap reduced */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-1 gap-y-4 sm:gap-x-2 sm:gap-y-6">
          {activeRecommendedPhotos.map((item, idx) => {
            const isWishlisted = wishlist.includes(item.productId);
            const discountPercent =
              item.mrp > item.price
                ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
                : 15;

            return (
              <div
                key={item.id}
                onClick={() => handleProductSelect(item.productId, item.colorName)}
                className="group cursor-pointer flex flex-col"
              >
                {/* Image Container with Badges */}
                <div className="relative w-full aspect-[3/4] bg-[#f5f5f5] overflow-hidden">
                  {/* Top-Left Badge: Best Seller */}
                  <span className="absolute top-2 left-2 z-10 bg-[#333333] text-white text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-[2px] tracking-wide">
                    {item.offerTag || 'Best Seller'}
                  </span>

                  {/* Top-Right Bookmark / Wishlist Icon */}
                  <button
                    type="button"
                    onClick={(e) => handleQuickWishlist(e, item.productId)}
                    className="absolute top-2 right-2 z-10 p-1 text-zinc-800 hover:text-black transition"
                    title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-label="Wishlist"
                  >
                    <Bookmark
                      className={`w-4 h-4 stroke-[1.5] ${
                        isWishlisted ? 'fill-black text-black' : 'text-zinc-800'
                      }`}
                    />
                  </button>

                  {/* Studio Image with Lazy Loading */}
                  <img
                    src={item.image}
                    alt={`${item.productName} look ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Card Details Directly Below Image (No Color Options) */}
                <div className="pt-2 px-1.5 sm:px-2 flex flex-col">
                  {/* Line 1: Title & Shopping Bag */}
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs sm:text-sm font-medium text-zinc-900 truncate pr-1">
                      {item.productName}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleQuickAddToCart(e, item.productId)}
                      className="p-0.5 text-zinc-800 hover:text-black transition shrink-0"
                      title="Quick add to bag"
                      aria-label="Add to bag"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 stroke-[1.6]" />
                    </button>
                  </div>

                  {/* Line 2: Subtitle / Color Shade */}
                  <p className="text-[11px] sm:text-xs text-zinc-500 truncate mt-0.5">
                    {item.colorName ? `Close - ${item.colorName}` : `Pure ${item.categoryName} - Look #${idx + 1}`}
                  </p>

                  {/* Line 3: Pricing with Strike-through MRP & Red Discount */}
                  <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-[13px]">
                    {item.mrp > item.price && (
                      <span className="line-through text-zinc-400 font-normal">
                        {formatPrice(item.mrp)}
                      </span>
                    )}
                    <span className="font-semibold text-zinc-900">
                      {formatPrice(item.price)}
                    </span>
                    {discountPercent > 0 && (
                      <span className="text-[#E52229] font-medium">
                        {discountPercent}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
