import React from 'react';

interface ProductCardSkeletonProps {
  hideColorOptions?: boolean;
  gridColumns?: 1 | 2 | 4;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({
  hideColorOptions = false,
}) => {
  return (
    <div
      className="flex flex-col bg-transparent rounded-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 3:4 Aspect Ratio Image Skeleton with Shimmer */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-150 sm:bg-zinc-100 animate-shimmer">
        {/* Subtle Top-Left Offer Badge Placeholder */}
        <div className="absolute top-2 left-2 w-14 sm:w-16 h-3.5 sm:h-4 bg-zinc-200/80" />
      </div>

      {/* Product Information Skeleton (Matching exact reference hierarchy) */}
      <div className="pt-2 sm:pt-2.5 px-0.5 sm:px-1 pb-1 flex-1 flex flex-col justify-between bg-white space-y-1.5">
        <div className="space-y-1.5">
          {/* Row 1: Title and Bag Placeholder */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 sm:h-3.5 bg-zinc-200 w-3/4 rounded-none animate-shimmer" />
            <div className="w-3.5 h-3.5 bg-zinc-200 rounded-none shrink-0" />
          </div>

          {/* Row 2: Subtitle / Detail Placeholder */}
          <div className="h-2.5 w-1/2 bg-zinc-150 rounded-none animate-shimmer" />

          {/* Row 3: Pricing Line Placeholder */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <div className="h-3 w-10 bg-zinc-150 rounded-none" />
            <div className="h-3.5 sm:h-4 w-16 bg-zinc-200 rounded-none animate-shimmer" />
            <div className="h-3 w-8 bg-red-100/70 rounded-none" />
          </div>

          {/* Row 4: Square Color Swatches Placeholder (Desktop only) */}
          {!hideColorOptions && (
            <div className="hidden md:flex items-center gap-1.5 pt-0.5">
              <div className="w-3 h-3 rounded-[1px] bg-zinc-200" />
              <div className="w-3 h-3 rounded-[1px] bg-zinc-200" />
              <div className="w-3 h-3 rounded-[1px] bg-zinc-200" />
              <div className="h-2.5 w-4 bg-zinc-150 rounded-none ml-0.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
