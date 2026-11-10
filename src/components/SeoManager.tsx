import React, { useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { buildSeoData, updateHeadTags } from '../utils/seo';

export const SeoManager: React.FC = () => {
  const {
    activeView,
    selectedProductId,
    selectedProductColor,
    selectedCategorySlug,
    selectedSubcategorySlug,
    selectedBlogId,
    products,
    categories,
    blogs,
  } = useStore();

  // Find active product if on PDP
  const activeProduct = useMemo(() => {
    if (activeView !== 'product-detail' || !selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [activeView, selectedProductId, products]);

  // Find active category if on Catalogue
  const activeCategory = useMemo(() => {
    if (!selectedCategorySlug) return null;
    return categories.find(
      (c) => c.slug.toLowerCase() === selectedCategorySlug.toLowerCase()
    ) || null;
  }, [selectedCategorySlug, categories]);

  // Find active subcategory if on Catalogue
  const activeSubcategory = useMemo(() => {
    if (!activeCategory || !selectedSubcategorySlug) return null;
    return (
      activeCategory.subcategories?.find(
        (s) => s.slug.toLowerCase() === selectedSubcategorySlug.toLowerCase()
      ) || null
    );
  }, [activeCategory, selectedSubcategorySlug]);

  // Find active blog if on Blog view
  const activeBlog = useMemo(() => {
    if (activeView !== 'blogs' || !selectedBlogId) return null;
    return blogs.find((b) => b.id === selectedBlogId) || null;
  }, [activeView, selectedBlogId, blogs]);

  // Update DOM head tags on any view / product / category change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    const meta = buildSeoData({
      activeView,
      product: activeProduct,
      category: activeCategory,
      subcategory: activeSubcategory,
      blog: activeBlog,
      selectedColor: selectedProductColor,
      origin,
    });

    updateHeadTags(meta);
  }, [activeView, activeProduct, activeCategory, activeSubcategory, activeBlog, selectedProductColor]);

  return null;
};
