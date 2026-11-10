import React from 'react';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductGridSkeletonProps {
  count?: number;
  gridColumns?: 1 | 2 | 4;
  mobileGridColumns?: 1 | 2;
  hideColorOptions?: boolean;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 8,
  gridColumns = 4,
  mobileGridColumns = 1,
  hideColorOptions,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const mobileCls = mobileGridColumns === 1 ? 'grid-cols-1 gap-y-10' : 'grid-cols-2 gap-x-1.5 gap-y-7';
  const desktopCls =
    gridColumns === 1
      ? 'md:grid-cols-1 md:gap-y-14'
      : gridColumns === 2
      ? 'md:grid-cols-2 md:gap-x-4 md:gap-y-10'
      : 'md:grid-cols-3 lg:grid-cols-4 md:gap-x-2.5 lg:gap-x-3 md:gap-y-10 lg:gap-y-12';

  return (
    <div
      className={`grid w-full ${mobileCls} ${desktopCls}`}
      aria-busy="true"
      aria-label="Loading products"
    >
      {items.map((key) => (
        <ProductCardSkeleton
          key={`product-skeleton-${key}`}
          gridColumns={gridColumns}
          hideColorOptions={hideColorOptions !== undefined ? hideColorOptions : false}
        />
      ))}
    </div>
  );
};
