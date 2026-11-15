import { Product, Category, Subcategory, Blog, StoreSettings } from '../types';
import { ActiveView } from '../context/StoreContext';

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl: string;
  robots?: 'index, follow' | 'noindex, nofollow';
  ogSiteName: string;
  ogType: 'website' | 'product' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: 'instock' | 'oos';
  productBrand?: string;
  jsonLd: Record<string, unknown>;
}

export interface CanonicalRouteInput {
  activeView: ActiveView;
  isLoginOpen?: boolean;
  selectedCategorySlug?: string | null;
  selectedSubcategorySlug?: string | null;
  selectedProductId?: string | null;
  selectedBlogId?: string | null;
  product?: Product | null;
  blog?: Blog | null;
}

/**
 * Single centralized canonical path resolver used by both the browser router (App.tsx)
 * and the dynamic SEO head manager (`buildSeoData`).
 */
export function resolveCanonicalPath({
  activeView,
  isLoginOpen,
  selectedCategorySlug,
  selectedSubcategorySlug,
  selectedProductId,
  selectedBlogId,
  product,
  blog,
}: CanonicalRouteInput): string {
  if (isLoginOpen) return '/login';
  if (activeView === 'home') return '/';

  if (activeView === 'catalogue') {
    if (selectedCategorySlug) {
      if (selectedSubcategorySlug) {
        return `/${selectedCategorySlug}/${selectedSubcategorySlug}`;
      }
      return `/${selectedCategorySlug}`;
    }
    return '/catalogue';
  }

  if (activeView === 'product-detail' && (product || selectedProductId)) {
    const slug = product?.seo?.urlSlug?.trim() || product?.slug?.trim() || selectedProductId;
    return `/product/${slug}`;
  }

  if ((activeView === 'blogs' || activeView === 'blog-detail') && (blog || selectedBlogId)) {
    if (blog || selectedBlogId) {
      return `/blogs`;
    }
  }

  if (activeView === 'blogs' || activeView === 'blog-detail') return '/blogs';
  if (activeView === 'contact' || activeView === 'contact-us') return '/contact';
  if (activeView === 'checkout') return '/checkout';
  if (activeView === 'order-success') return '/order-success';
  if (activeView === 'track-order') return '/trackyourorder';
  if (activeView === 'account') return '/account';
  if (activeView === 'wishlist') return '/wishlist';
  if (activeView === 'search') return '/search';
  if (activeView === 'privacy-policy') return '/privacy-policy';
  if (activeView === 'terms-conditions') return '/terms-conditions';
  if (activeView === 'cancellation-policy') return '/cancellation-policy';
  if (activeView === 'shipping-delivery') return '/shipping-policy';
  if (activeView === 'returns-exchange') return '/returns-exchange';
  if (activeView === 'stitching-services') return '/stitching-services';
  if (activeView === 'size-guide') return '/size-guide';
  if (activeView === 'faqs') return '/faqs';
  if (activeView === 'admin') return '/admin';

  return `/${activeView}`;
}

/**
 * Resolves any image reference (relative path, absolute URL, or data URI) to a valid URL for OpenGraph/Schema.org.
 */
function resolveSeoImageUrl(rawImage: string | undefined, origin: string, fallbackUrl: string): string {
  if (!rawImage || typeof rawImage !== 'string' || rawImage.startsWith('__img_ref:')) {
    return fallbackUrl;
  }
  const trimmed = rawImage.trim();
  if (!trimmed) return fallbackUrl;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }
  return `${origin}/${trimmed}`;
}

/**
 * Centrally manages and replaces document title, meta description, robots, canonical link,
 * OpenGraph tags, Twitter Card tags, and Schema.org JSON-LD structured data in `document.head`.
 */
export function updateHeadTags(meta: SeoMetadata) {
  if (typeof document === 'undefined') return;

  // 1. Page Title
  document.title = meta.title;

  // Helper to create or update a <meta> tag in <head>
  const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
    let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
    el.setAttribute('data-seo-managed', 'true');
  };

  // Helper to remove optional <meta> tags when not applicable to the active route
  const removeMeta = (attrName: 'name' | 'property', attrValue: string) => {
    const el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (el) {
      el.remove();
    }
  };

  // 2. Standard SEO Meta Tags
  setMeta('name', 'description', meta.description);
  setMeta('name', 'robots', meta.robots || 'index, follow');

  if (meta.keywords && meta.keywords.trim()) {
    setMeta('name', 'keywords', meta.keywords.trim());
  } else {
    removeMeta('name', 'keywords');
  }

  // 3. OpenGraph Social Metadata
  setMeta('property', 'og:site_name', meta.ogSiteName || 'REDMODE');
  setMeta('property', 'og:locale', 'en_IN');
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  setMeta('property', 'og:url', meta.canonicalUrl);
  setMeta('property', 'og:type', meta.ogType);

  if (meta.ogImage) {
    setMeta('property', 'og:image', meta.ogImage);
    setMeta('property', 'og:image:alt', meta.ogImageAlt || meta.title);
  } else {
    removeMeta('property', 'og:image');
    removeMeta('property', 'og:image:alt');
  }

  // Product-specific OpenGraph tags (cleaned up automatically on non-product routes)
  if (meta.ogType === 'product' && meta.productPrice !== undefined) {
    setMeta('property', 'product:price:amount', String(meta.productPrice));
    setMeta('property', 'product:price:currency', meta.productCurrency || 'INR');
    setMeta('property', 'product:availability', meta.productAvailability || 'instock');
    setMeta('property', 'product:brand', meta.productBrand || meta.ogSiteName || 'REDMODE');
  } else {
    removeMeta('property', 'product:price:amount');
    removeMeta('property', 'product:price:currency');
    removeMeta('property', 'product:availability');
    removeMeta('property', 'product:brand');
  }

  // 4. Twitter / X Card Metadata
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', meta.description);
  if (meta.ogImage) {
    setMeta('name', 'twitter:image', meta.ogImage);
  } else {
    removeMeta('name', 'twitter:image');
  }

  // 5. Canonical Link Element
  let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', meta.canonicalUrl);
  canonicalLink.setAttribute('data-seo-managed', 'true');

  // 6. Schema.org JSON-LD Structured Data
  let script = document.getElementById('redmode-schema-jsonld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'redmode-schema-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(meta.jsonLd);
}

/**
 * Automatically generates an SEO-optimized, high-converting dynamic meta description
 * (140–160 characters for optimal Google SERP snippet display & social share cards)
 * based directly on live product attributes (name, color, fabric, fit, pattern, price, discount).
 */
export function generateProductMetaDescription(
  product: Product,
  brandName = 'REDMODE',
  selectedColor?: string | null
): string {
  const custom = product.seo?.metaDescription?.trim();
  if (custom && custom.length >= 20) {
    return custom;
  }

  const name = (product.name || 'Designer Ethnic Garment')
    .replace(/^RedMode\s*Women'?s?\s*/i, '')
    .trim();

  const category = product.subcategory || product.category || 'Ethnic Wear';
  const color = selectedColor || product.color || product.colorOptions?.[0]?.name || '';
  const activeColorOption = product.colorOptions?.find(
    (c) => c.name.toLowerCase() === color.toLowerCase()
  );
  const fabric = activeColorOption?.material || product.material || '';
  const fit = product.fit || '';
  const pattern = product.pattern || '';
  const currentPrice = activeColorOption?.price || product.price;
  const currentMrp = activeColorOption?.mrp || product.mrp;
  const price = currentPrice ? `₹${currentPrice.toLocaleString('en-IN')}` : '';
  const discountPercent =
    currentMrp && currentPrice && currentMrp > currentPrice
      ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
      : 0;

  let lead = `Buy ${name}`;
  if (color && !name.toLowerCase().includes(color.toLowerCase())) {
    lead += ` in ${color}`;
  }
  if (price) {
    lead += ` at ${price}`;
    if (discountPercent >= 10) {
      lead += ` (${discountPercent}% OFF)`;
    }
  }
  lead += '.';

  let details = '';
  if (fabric && pattern) {
    details = ` Crafted from ${fabric} with ${pattern}.`;
  } else if (fabric && fit) {
    details = ` Premium ${fabric} in comfortable ${fit}.`;
  } else if (fabric) {
    details = ` Made with breathable ${fabric}.`;
  } else if (category) {
    details = ` Premium designer ${category} styling.`;
  }

  const trustCta = ` Free shipping across India & COD on ${brandName}.`;
  let fullDesc = `${lead}${details}${trustCta}`.replace(/\s+/g, ' ').trim();

  if (fullDesc.length > 160) {
    const compactCta = ` Free shipping & COD on ${brandName}.`;
    fullDesc = `${lead}${details}${compactCta}`.replace(/\s+/g, ' ').trim();
    if (fullDesc.length > 160) {
      const trimmed = fullDesc.substring(0, 157);
      const lastSpace = trimmed.lastIndexOf(' ');
      fullDesc = `${trimmed.substring(0, lastSpace > 120 ? lastSpace : 157)}...`;
    }
  } else if (fullDesc.length < 130) {
    fullDesc = `Shop ${name} online at ${brandName} for ${price || 'best price'}. Handcrafted ${fabric || 'ethnic wear'} with fast shipping & COD across India.`;
  }

  return fullDesc;
}

/**
 * Automatically generates a keyword-rich SEO title with brand suffix.
 */
export function generateProductMetaTitle(
  product: Product,
  brandName = 'REDMODE',
  selectedColor?: string | null
): string {
  const custom = product.seo?.title?.trim();
  if (custom && custom.length >= 5) {
    const withColor =
      selectedColor && !custom.toLowerCase().includes(selectedColor.toLowerCase())
        ? `${custom} - ${selectedColor}`
        : custom;
    if (withColor.toLowerCase().includes(brandName.toLowerCase())) {
      return withColor;
    }
    return `${withColor} | ${brandName}`;
  }

  const name = (product.name || 'Designer Ethnic Wear')
    .replace(/^RedMode\s*Women'?s?\s*/i, '')
    .trim();
  const subcategory = product.subcategory || product.category || 'Ethnic Wear';
  const color = selectedColor || product.color || product.colorOptions?.[0]?.name || '';

  let title = name;
  if (color && !name.toLowerCase().includes(color.toLowerCase())) {
    title += ` - ${color}`;
  }
  if (!title.toLowerCase().includes(subcategory.toLowerCase())) {
    title += ` – ${subcategory}`;
  }

  return `${title} | ${brandName}`;
}

export function buildSeoData({
  activeView,
  product,
  category,
  subcategory,
  blog,
  selectedColor,
  isLoginOpen,
  searchQuery,
  settings,
  origin,
}: {
  activeView: ActiveView;
  product?: Product | null;
  category?: Category | null;
  subcategory?: Subcategory | null;
  blog?: Blog | null;
  selectedColor?: string | null;
  isLoginOpen?: boolean;
  searchQuery?: string;
  settings?: StoreSettings | null;
  origin: string;
}): SeoMetadata {
  const brandName = settings?.storeName?.trim() || 'REDMODE';
  const defaultImage = `${origin}/redmode-icon.svg`;

  const canonicalPath = resolveCanonicalPath({
    activeView,
    isLoginOpen,
    selectedCategorySlug: category?.slug || null,
    selectedSubcategorySlug: subcategory?.slug || null,
    selectedProductId: product?.id || null,
    selectedBlogId: blog?.id || null,
    product,
    blog,
  });
  const canonicalUrl = `${origin}${canonicalPath}`;

  // 0. ADMIN PANEL (Protected route -> noindex, nofollow)
  if (activeView === 'admin') {
    const title = `Admin Management Console | ${brandName}`;
    const description = `Authorized store administration and operations console for ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'noindex, nofollow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        url: canonicalUrl,
      },
    };
  }

  // 1. PRODUCT DETAIL PAGE
  if (activeView === 'product-detail' && product) {
    const title = generateProductMetaTitle(product, brandName, selectedColor);
    const description = generateProductMetaDescription(product, brandName, selectedColor);

    const activeColorOption = selectedColor
      ? product.colorOptions?.find((c) => c.name.toLowerCase() === selectedColor.toLowerCase())
      : undefined;

    const rawPrimaryImage =
      activeColorOption?.images?.[0] ||
      activeColorOption?.image ||
      product.mainImage ||
      product.images?.[0];

    const image = resolveSeoImageUrl(rawPrimaryImage, origin, defaultImage);
    const currentPrice = activeColorOption?.price || product.price;
    const isInStock = product.inStock !== false;
    const keywords =
      product.seo?.keywords ||
      [product.name, product.category, product.subcategory, product.material, selectedColor || product.color, brandName]
        .filter(Boolean)
        .join(', ');

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image:
        product.images && product.images.length > 0
          ? product.images.map((img) => resolveSeoImageUrl(img, origin, defaultImage))
          : [image],
      description: product.description || description,
      sku: product.sku || product.id,
      color: selectedColor || product.color || undefined,
      material: activeColorOption?.material || product.material || undefined,
      brand: {
        '@type': 'Brand',
        name: product.brand || brandName,
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'INR',
        price: currentPrice,
        itemCondition: 'https://schema.org/NewCondition',
        availability: isInStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: brandName,
        },
      },
      ...(product.rating
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviewCount || 42,
              bestRating: '5',
              worstRating: '1',
            },
          }
        : {}),
    };

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'product',
      ogImage: image,
      ogImageAlt: product.seo?.imageAlt || title,
      productPrice: currentPrice,
      productCurrency: 'INR',
      productAvailability: isInStock ? 'instock' : 'oos',
      productBrand: product.brand || brandName,
      jsonLd,
    };
  }

  // 2. CATALOGUE / CATEGORY / SUBCATEGORY
  if (activeView === 'catalogue') {
    if (subcategory) {
      const title = `${subcategory.name} Collection – Designer ${category?.name || 'Ethnic Wear'} | ${brandName}`;
      const description = subcategory.description
        ? `${subcategory.description} Explore our curated ${subcategory.name} edit at ${brandName}.`
        : `Explore our handcrafted collection of ${subcategory.name}. Premium ethnic wear with breathable fabrics, artisanal motifs, and modern styling at ${brandName}.`;

      const image = resolveSeoImageUrl(
        subcategory.bannerUrl || subcategory.imageUrl || category?.bannerUrl || category?.imageUrl,
        origin,
        defaultImage
      );

      return {
        title,
        description,
        keywords: `${subcategory.name}, ${category?.name || 'Ethnic Wear'}, ${brandName}, buy ${subcategory.name} online`,
        canonicalUrl,
        robots: 'index, follow',
        ogSiteName: brandName,
        ogType: 'website',
        ogImage: image,
        ogImageAlt: title,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${subcategory.name} | ${brandName}`,
          description,
          url: canonicalUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: brandName,
            url: origin,
          },
        },
      };
    }

    if (category) {
      const title = `${category.name} Collection – Handcrafted Luxury Ethnic Wear | ${brandName}`;
      const description = category.tagline
        ? `${category.tagline}. Discover luxury ${category.name} at ${brandName} designed for effortless grace and contemporary festivities.`
        : `Discover luxury ${category.name} at ${brandName}. Premium fabrics, intricate embroidery, and flattering tailored cuts for modern Indian women.`;

      const image = resolveSeoImageUrl(category.bannerUrl || category.imageUrl, origin, defaultImage);

      return {
        title,
        description,
        keywords: `${category.name}, designer ${category.name}, women ethnic wear, ${brandName}`,
        canonicalUrl,
        robots: 'index, follow',
        ogSiteName: brandName,
        ogType: 'website',
        ogImage: image,
        ogImageAlt: title,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${category.name} | ${brandName}`,
          description,
          url: canonicalUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: brandName,
            url: origin,
          },
        },
      };
    }

    const title = `All Designer Collections & New Arrivals | ${brandName}`;
    const description = `Browse the complete ${brandName} ethnic wear catalogue — featuring kurtis, trousers, festive sets, and jewelry handcrafted with heritage artisanal details.`;

    return {
      title,
      description,
      keywords: `ethnic wear catalogue, designer kurtis, women trousers, festive sets, ${brandName}`,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `All Collections | ${brandName}`,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 3. BLOG POST OR JOURNAL
  if (activeView === 'blogs' || activeView === 'blog-detail') {
    if (blog) {
      const title = `${blog.seoTitle || blog.title} | ${brandName} Journal`;
      const description =
        blog.seoDescription ||
        blog.metaDescription ||
        blog.excerpt ||
        `${blog.title} — styling tips and ethnic wear trends from ${brandName}.`;
      const image = resolveSeoImageUrl(blog.featuredImage, origin, defaultImage);

      return {
        title,
        description,
        canonicalUrl,
        robots: 'index, follow',
        ogSiteName: brandName,
        ogType: 'article',
        ogImage: image,
        ogImageAlt: blog.title,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: blog.title,
          description,
          image: [image],
          datePublished: blog.createdAt,
          author: {
            '@type': 'Person',
            name: blog.author || brandName,
          },
          publisher: {
            '@type': 'Organization',
            name: brandName,
            logo: {
              '@type': 'ImageObject',
              url: defaultImage,
            },
          },
        },
      };
    }

    const title = `${brandName} Fashion Journal – Styling Guides & Ethnic Trends`;
    const description = `Explore ethnic wear style guides, festive dressing inspirations, and behind-the-scenes craft stories from the designers at ${brandName}.`;

    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${brandName} Journal`,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 4. SEARCH VIEW
  if (activeView === 'search') {
    const cleanQuery = searchQuery?.trim();
    const title = cleanQuery
      ? `Search Results for "${cleanQuery}" | ${brandName}`
      : `Search Designer Kurtis & Ethnic Wear | ${brandName}`;
    const description = cleanQuery
      ? `Explore ${brandName} products matching "${cleanQuery}". Shop handcrafted kurtis, straight-fit trousers, and festive ethnic wear.`
      : `Search the ${brandName} catalog by style, fabric, color, or SKU to find your ideal ethnic wear outfit.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 5. CUSTOMER ACCOUNT VIEW
  if (activeView === 'account') {
    const title = `My Account & Orders | ${brandName}`;
    const description = `Manage your ${brandName} profile, saved delivery addresses, and order history.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'noindex, nofollow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 6. WISHLIST
  if (activeView === 'wishlist') {
    const title = `My Saved Wishlist | ${brandName}`;
    const description = `View your saved ${brandName} favorites. Keep track of your shortlisted designer kurtis, straight-fit trousers, and festive ensembles.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 7. CHECKOUT & ORDER SUCCESS
  if (activeView === 'checkout' || activeView === 'order-success') {
    const title =
      activeView === 'order-success'
        ? `Order Confirmed | ${brandName}`
        : `Secure Checkout | ${brandName}`;
    const description = `Complete your order securely with fast pan-India delivery, verified payment gateways, and COD options on ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'noindex, nofollow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CheckoutPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 8. TRACK ORDER
  if (activeView === 'track-order') {
    const title = `Track Order & Delivery Status | ${brandName}`;
    const description = `Track your ${brandName} package in real time with live AWB courier updates across India.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 9. SIZE GUIDE
  if (activeView === 'size-guide') {
    const title = `Official Size Chart & Fit Guide | ${brandName}`;
    const description = `Find your perfect fit with ${brandName}'s detailed size guide. Bust, waist, hip, and length measurements for kurtis and trousers across sizes XS to 4XL.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 10. FAQS
  if (activeView === 'faqs') {
    const title = `Frequently Asked Questions & Customer Support | ${brandName}`;
    const description = `Answers to common questions regarding ordering, shipping timelines, returns, exchanges, custom stitching, and payments at ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // 11. POLICY & SERVICE PAGES
  if (activeView === 'shipping-delivery') {
    const title = `Shipping & Express Delivery Information | ${brandName}`;
    const description = `Learn about ${brandName}'s dispatch timelines, free shipping thresholds, and trusted pan-India courier delivery partners.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl },
    };
  }

  if (activeView === 'returns-exchange') {
    const title = `Hassle-Free Returns & Exchange Policy | ${brandName}`;
    const description = `Explore ${brandName}'s easy return and size exchange process for customer satisfaction across all ethnic wear orders.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl },
    };
  }

  if (activeView === 'privacy-policy') {
    const title = `Privacy Policy & Customer Security | ${brandName}`;
    const description = `How ${brandName} collects, protects, and respects your personal data, order details, and privacy.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl },
    };
  }

  if (activeView === 'terms-conditions') {
    const title = `Terms & Conditions | ${brandName} Official Store`;
    const description = `Terms of service, website usage guidelines, and customer purchase policies for ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl },
    };
  }

  if (activeView === 'cancellation-policy') {
    const title = `Order Cancellation Policy | ${brandName}`;
    const description = `Easy cancellation guidelines and instant refund options prior to dispatch for all ${brandName} purchases.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl },
    };
  }

  if (activeView === 'stitching-services') {
    const title = `Bespoke Stitching & Custom Alterations | ${brandName}`;
    const description = `Personalized custom stitching, sleeve alterations, and neckline tailoring handcrafted by master artisans at ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonicalUrl },
    };
  }

  if (activeView === 'contact' || activeView === 'contact-us') {
    const title = `Contact Us & Concierge Support | ${brandName}`;
    const description = `Have a question about your order, styling, or custom sizing? Reach out to ${brandName}'s customer care team.`;
    return {
      title,
      description,
      canonicalUrl,
      robots: 'index, follow',
      ogSiteName: brandName,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: title,
        description,
        url: canonicalUrl,
      },
    };
  }

  // DEFAULT / HOME VIEW
  const title = settings?.tagline?.trim()
    ? `${brandName} — ${settings.tagline.trim()}`
    : `${brandName} — Modern Ethnic Wear & Handcrafted Designer Kurtis`;
  const description = `Shop premium Indian ethnic wear from ${brandName}. Discover designer kurtis, chic straight trousers, festive ensembles, and handcrafted jewelry designed for timeless elegance.`;

  return {
    title,
    description,
    keywords: `${brandName}, modern ethnic wear, designer kurtis, women ethnic wear India, festive kurtis, straight trousers`,
    canonicalUrl,
    robots: 'index, follow',
    ogSiteName: brandName,
    ogType: 'website',
    ogImage: defaultImage,
    ogImageAlt: title,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: brandName,
      image: defaultImage,
      url: origin,
      telephone: settings?.whatsappNumber || '+91-7302797464',
      email: settings?.supportEmail || 'myredmode@gmail.com',
      priceRange: '₹₹',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  };
}
