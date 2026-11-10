import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../ProductCard';
import { ProductGridSkeleton } from '../ProductGridSkeleton';
import { Product } from '../../types';

interface RelatedProductsProps {
  currentProduct: Product;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ currentProduct }) => {
  const { products } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [currentProduct?.id]);

  const related = React.useMemo(() => {
    const others = products.filter(
      (p) => p.published && p.id !== currentProduct.id
    );

    // Prioritize same category first
    const sameCat = others.filter((p) => p.category === currentProduct.category);
    if (sameCat.length >= 4) {
      return sameCat.slice(0, 4);
    }
    const remainder = others.filter((p) => p.category !== currentProduct.category);
    return [...sameCat, ...remainder].slice(0, 4);
  }, [products, currentProduct.id, currentProduct.category]);

  if (related.length === 0) return null;

  return (
    <div id="similar-products-section" className="space-y-6 pt-10 pb-12 border-t border-zinc-200 w-full">
      <div className="text-center px-4">
        <h2 className="font-sans text-sm sm:text-base font-bold tracking-[0.22em] text-zinc-950 uppercase">
          YOU MAY ALSO LIKE
        </h2>
      </div>

      {isLoading ? (
        <div className="px-0 sm:px-4">
          <ProductGridSkeleton count={4} gridColumns={2} hideColorOptions={true} />
        </div>
      ) : (
        /* Exactly 4 products: 2 side-by-side on top, 2 below (Full-bleed 0 margin on outer edges, tiny 2px gap between) */
        <div className="grid grid-cols-2 w-full gap-x-[2px] sm:gap-x-2.5 gap-y-6 sm:gap-y-10 px-0 sm:px-4">
          {related.slice(0, 4).map((prod) => (
            <ProductCard key={prod.id} product={prod} hideColorOptions={true} />
          ))}
        </div>
      )}
    </div>
  );
};
