import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { getCacheBustedUrl } from '../utils/cacheBuster';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export const HeroSlider: React.FC = () => {
  const { banners, setActiveView, setSelectedCategorySlug } = useStore();
  const activeBanners = banners.filter((b) => b.active);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically every 2–3 seconds slide (2.5 seconds):
  useEffect(() => {
    if (activeBanners.length <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 2800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isHovered]);

  if (activeBanners.length === 0) return null;

  const current = activeBanners[currentIndex] || activeBanners[0];

  const handleBannerAction = () => {
    if (current.targetCategory) {
      setSelectedCategorySlug(current.targetCategory.toLowerCase());
    }
    setActiveView('catalogue');
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  return (
    <section
      id="hero-slider"
      className="relative w-full overflow-hidden bg-zinc-950 select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider Container */}
      <div className="relative h-[480px] sm:h-[580px] lg:h-[680px] w-full">
        {activeBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Image with Dark Vignette for Sharp Contrast */}
              <img
                src={getCacheBustedUrl(banner.imageUrl)}
                alt={banner.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent sm:w-3/4" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {/* Text & Action Content */}
              <div className="absolute inset-0 z-20 flex items-center">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
                  <div className="max-w-xl text-white space-y-4 sm:space-y-6">
                    {/* Tagline */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-widest uppercase text-rose-300">
                      <span>{banner.tagline || 'New Festive Arrivals'}</span>
                    </div>

                    {/* Title */}
                    <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white uppercase leading-[1.1]">
                      {banner.title}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-sm sm:text-lg text-zinc-300 font-light tracking-wide max-w-md">
                      {banner.subtitle}
                    </p>

                    {/* Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleBannerAction}
                        className="inline-flex items-center gap-3 px-7 py-3.5 bg-white text-zinc-950 font-bold text-xs sm:text-sm tracking-widest uppercase rounded-none hover:bg-zinc-200 transition shadow-lg group/btn"
                      >
                        <span>{banner.buttonText || 'EXPLORE NOW'}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-950 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Progress Dots / Bars */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {activeBanners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
