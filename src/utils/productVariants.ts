import { Product, ColorVariant } from '../types';

export interface ProductListingItem {
  product: Product;
  variantColor?: string;
  variant?: ColorVariant;
  cardKey: string;
}

/**
 * Expands products with multiple color options into distinct browsable cards
 * (Amazon & Flipkart style listing with combined variant page).
 */
export function expandProductsForListing(products: Product[]): ProductListingItem[] {
  const list: ProductListingItem[] = [];

  for (const prod of products) {
    if (prod.colorOptions && prod.colorOptions.length > 1) {
      for (const col of prod.colorOptions) {
        list.push({
          product: prod,
          variantColor: col.name,
          variant: col,
          cardKey: `${prod.id}__col_${col.name.toLowerCase().replace(/\s+/g, '_')}`,
        });
      }
    } else {
      list.push({
        product: prod,
        variantColor: prod.colorOptions?.[0]?.name || prod.color,
        variant: prod.colorOptions?.[0],
        cardKey: prod.id,
      });
    }
  }

  return list;
}
