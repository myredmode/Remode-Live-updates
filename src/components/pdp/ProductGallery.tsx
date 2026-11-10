import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Share2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { getCacheBustedUrl } from '../../utils/cacheBuster';

interface ProductGalleryProps {
  product: Product;
  images?: string[];
  selectedColor?: string;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  discountPercent: number;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  product,
  images,
  selectedColor,
  isWishlisted,
  onToggleWishlist,
  discountPercent,
}) => {
  // Collect all unique gallery images (prioritizes color-specific images if provided) with cache-busting
  const allImages = React.useMemo(() => {
    const rawList = images && images.length > 0 ? images : [product.mainImage, ...(product.images || [])];
    const unique = Array.from(new Set(rawList.filter(Boolean))) as string[];
    return unique.map((img) => getCacheBustedUrl(img, product.updatedAt));
  }, [images, product.mainImage, product.images, product.updatedAt]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Zoom / Pan State
  const [isZooming, setIsZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);

  const currentImage = allImages[activeIndex] || getCacheBustedUrl(product.mainImage, product.updatedAt);

  // Reset active index when product, color, or image set changes
  useEffect(() => {
    setActiveIndex(0);
  }, [product.id, selectedColor, images]);

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomCoords({ x, y });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  return (
    <div
      id="product-gallery-container"
      className="w-full flex flex-col lg:sticky lg:top-24 lg:self-start transition-all"
    >
      {/* Desktop Layout: Vertical Thumbnail Rail (left) + Main Image Stage (right) */}
      <div className="flex flex-col-reverse lg:flex-row gap-3.5 xl:gap-4 items-start">
        {/* Vertical Thumbnails Rail (Desktop) & Horizontal Rail (Mobile) */}
        <div className="w-full lg:w-20 xl:w-24 shrink-0 flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[min(600px,calc(100vh-8rem))] scrollbar-thin py-1 select-none">
          {allImages.map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={`${selectedColor || 'col'}-${idx}-${img}`}
                id={`product-thumbnail-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`group relative aspect-[3/4] w-16 sm:w-20 lg:w-full shrink-0 border-2 overflow-hidden transition-all bg-zinc-100 ${
                  isSelected
                    ? 'border-zinc-950 ring-2 ring-zinc-950/20 opacity-100'
                    : 'border-zinc-200 hover:border-zinc-400 opacity-75 hover:opacity-100'
                }`}
                aria-label={`View product image ${idx + 1}`}
              >
                <img
                  src={img}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Image Stage */}
        <div className="relative flex-1 w-full">
          <div
            id="product-main-image-stage"
            ref={imageContainerRef}
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setIsLightboxOpen(true)}
            className="relative aspect-[3/4] max-h-[min(600px,calc(100vh-8rem))] w-full bg-zinc-100 border border-zinc-200 overflow-hidden cursor-zoom-in group select-none flex items-center justify-center"
          >
            {/* Standard Image */}
            <img
              key={currentImage}
              src={currentImage}
              alt={product.seo?.imageAlt || product.name}
              className={`w-full h-full object-cover object-top transition-opacity duration-150 ${
                isZooming ? 'opacity-0 lg:opacity-0' : 'opacity-100'
              }`}
            />

            {/* Desktop Zoom Magnifier View (shows high-res texture on hover) */}
            {isZooming && (
              <div
                className="absolute inset-0 hidden lg:block pointer-events-none bg-no-repeat transition-all duration-75"
                style={{
                  backgroundImage: `url(${currentImage})`,
                  backgroundPosition: `${zoomCoords.x}% ${zoomCoords.y}%`,
                  backgroundSize: '240%',
                }}
              />
            )}

            {/* Badges Overlays */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
              {product.offerTag && (
                <span className="bg-zinc-950 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 shadow-sm">
                  {product.offerTag}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="bg-rose-700 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 shadow-sm">
                  Save {discountPercent}%
                </span>
              )}
            </div>

            {/* Floating Action Buttons: Wishlist, Share, Fullscreen */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                id="gallery-wishlist-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWishlist();
                }}
                className={`p-2.5 rounded-full shadow-sm backdrop-blur-xs transition-all duration-200 ${
                  isWishlisted
                    ? 'bg-white/95 text-rose-600'
                    : 'bg-white/85 text-zinc-700 hover:text-rose-600 hover:bg-white'
                }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                aria-label="Wishlist"
              >
                <Heart
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isWishlisted
                      ? 'fill-rose-600 stroke-rose-600 scale-105'
                      : 'stroke-[1.75] fill-none stroke-current'
                  }`}
                />
              </button>

              <button
                id="gallery-share-btn"
                type="button"
                onClick={handleShare}
                className="p-2.5 bg-white/90 hover:bg-white text-zinc-800 hover:text-zinc-950 rounded-full shadow-md backdrop-blur-sm transition relative"
                title="Share product link"
              >
                <Share2 className="w-4 h-4" />
                {copiedLink && (
                  <span className="absolute right-full mr-2 top-1.5 bg-zinc-950 text-white text-[10px] font-bold px-2 py-1 whitespace-nowrap shadow-lg">
                    Link Copied!
                  </span>
                )}
              </button>

              <button
                id="gallery-lightbox-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="p-2.5 bg-white/90 hover:bg-white text-zinc-800 hover:text-zinc-950 rounded-full shadow-md backdrop-blur-sm transition"
                title="Full Screen Lightbox"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Left & Right Stage Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white text-zinc-900 flex items-center justify-center rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white text-zinc-900 flex items-center justify-center rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Bottom Counter and Zoom Instruction Pill */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <span className="bg-black/60 backdrop-blur-sm text-white text-[11px] font-mono px-2.5 py-1 rounded">
                {activeIndex + 1} / {allImages.length}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded">
                <ZoomIn className="w-3 h-3 text-zinc-300" />
                <span>Hover to zoom • Click for full screen</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Fullscreen Modal */}
      {isLightboxOpen && (
        <div
          id="product-lightbox-modal"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200 select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Control Bar */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 text-white z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">
                Image {activeIndex + 1} of {allImages.length}
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="text-xs text-zinc-300 hidden sm:inline truncate max-w-md">
                {product.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLightboxScale((s) => Math.min(2.5, s + 0.5))}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLightboxScale((s) => Math.max(1, s - 0.5))}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition ml-2"
                title="Close (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Lightbox Stage */}
          <div
            className="relative flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={product.name}
              className="max-h-[82vh] max-w-[90vw] object-contain transition-transform duration-200"
              style={{ transform: `scale(${lightboxScale})` }}
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Bar */}
          <div
            className="p-4 bg-black/60 border-t border-zinc-800 flex justify-center gap-3 overflow-x-auto z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveIndex(i);
                  setLightboxScale(1);
                }}
                className={`relative w-14 h-16 shrink-0 border-2 overflow-hidden transition ${
                  i === activeIndex
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : 'border-zinc-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover object-top"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
