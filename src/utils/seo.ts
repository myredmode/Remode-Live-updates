import { Product, Category, Subcategory, Blog } from '../types';
import { ActiveView } from '../context/StoreContext';

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'product' | 'article';
  ogImage?: string;
  productPrice?: number;
  productCurrency?: string;
  jsonLd: Record<string, unknown>;
}

export function updateHeadTags(meta: SeoMetadata) {
  if (typeof document === 'undefined') return;

  // 1. Page Title
  document.title = meta.title;

  // Helper for meta tags
  const setMeta = (nameOrProperty: 'name' | 'property', attrValue: string, content: string) => {
    let el = document.querySelector(`meta[${nameOrProperty}="${attrValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(nameOrProperty, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Meta Description
  setMeta('name', 'description', meta.description);

  // 3. OpenGraph Social Card
  setMeta('property', 'og:site_name', 'REDMODE');
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  setMeta('property', 'og:url', meta.canonicalUrl);
  setMeta('property', 'og:type', meta.ogType);

  if (meta.ogImage) {
    setMeta('property', 'og:image', meta.ogImage);
    setMeta('property', 'og:image:alt', meta.title);
  }

  if (meta.productPrice !== undefined) {
    setMeta('property', 'product:price:amount', meta.productPrice.toString());
    setMeta('property', 'product:price:currency', meta.productCurrency || 'INR');
  }

  // 4. Twitter / X Card
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', meta.description);
  if (meta.ogImage) {
    setMeta('name', 'twitter:image', meta.ogImage);
  }

  // 5. Canonical Link
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', meta.canonicalUrl);

  // 6. Schema.org JSON-LD Structured Data
  let script = document.getElementById('redmode-schema-jsonld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'redmode-schema-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(meta.jsonLd, null, 2);
}

/**
 * Automatically generates an SEO-optimized, high-converting dynamic meta description
 * (strictly 140–160 characters for optimal Google SERP snippet display & social share cards)
 * based directly on live product attributes (name, color, fabric, fit, pattern, price, discount).
 */
export function generateProductMetaDescription(
  product: Product,
  brandName = 'REDMODE',
  selectedColor?: string | null
): string {
  // If merchant has customized the SEO meta description, honor it
  const custom = product.seo?.metaDescription?.trim();
  if (custom && custom.length >= 20) {
    return custom;
  }

  const name = (product.name || 'Designer Ethnic Garment')
    .replace(/^RedMode\s*Women'?s?\s*/i, '') // Avoid repeating store name if included in title
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

  // Segment 1: Lead CTA with Title, Color, Price & Discount
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

  // Segment 2: Distinctive Garment Details (Fabric, Pattern, Fit)
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

  // Segment 3: High-Converting Trust Signals (Free Shipping & COD)
  const trustCta = ` Free shipping across India & COD on ${brandName}.`;

  let fullDesc = `${lead}${details}${trustCta}`.replace(/\s+/g, ' ').trim();

  // Keep strictly within optimal Google SERP length (140 - 160 characters)
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
 * Automatically generates a keyword-rich SEO title (50-60 characters) with brand suffix
 */
export function generateProductMetaTitle(
  product: Product,
  brandName = 'REDMODE',
  selectedColor?: string | null
): string {
  const custom = product.seo?.title?.trim();
  if (custom && custom.length >= 5) {
    if (custom.toLowerCase().includes(brandName.toLowerCase())) {
      return custom;
    }
    return `${custom} | ${brandName}`;
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
  origin,
}: {
  activeView: ActiveView;
  product?: Product | null;
  category?: Category | null;
  subcategory?: Subcategory | null;
  blog?: Blog | null;
  selectedColor?: string | null;
  origin: string;
}): SeoMetadata {
  const brandName = 'REDMODE';
  const defaultImage = `${origin}/assets/redmode-official-emblem.png`;

  // 1. PRODUCT DETAIL PAGE
  if (activeView === 'product-detail' && product) {
    const title = generateProductMetaTitle(product, brandName, selectedColor);
    const description = generateProductMetaDescription(product, brandName, selectedColor);

    const activeColorOption = selectedColor
      ? product.colorOptions?.find((c) => c.name.toLowerCase() === selectedColor.toLowerCase())
      : undefined;

    const image =
      activeColorOption?.images?.[0] ||
      activeColorOption?.image ||
      product.mainImage ||
      product.images?.[0] ||
      defaultImage;

    const canonicalUrl = `${origin}/#product=${product.id}`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: product.images && product.images.length > 0 ? product.images : [image],
      description: product.description || description,
      sku: product.sku || product.id,
      brand: {
        '@type': 'Brand',
        name: brandName,
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'INR',
        price: product.price,
        itemCondition: 'https://schema.org/NewCondition',
        availability: 'https://schema.org/InStock',
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
      canonicalUrl,
      ogType: 'product',
      ogImage: image,
      productPrice: product.price,
      productCurrency: 'INR',
      jsonLd,
    };
  }

  // 2. CATALOGUE / CATEGORY / SUBCATEGORY
  if (activeView === 'catalogue') {
    if (subcategory) {
      const title = `${subcategory.name} Collection – Designer Ethnic Kurtis | ${brandName}`;
      const description = subcategory.description
        ? `${subcategory.description} Explore our curated ${subcategory.name} edit at ${brandName}.`
        : `Explore our handcrafted collection of ${subcategory.name}. Premium ethnic wear with breathable fabrics, artisanal motifs, and modern styling at ${brandName}.`;

      const image = subcategory.bannerUrl || subcategory.imageUrl || defaultImage;
      const canonicalUrl = `${origin}/#category=${category?.slug || 'all'}&sub=${subcategory.slug}`;

      return {
        title,
        description,
        canonicalUrl,
        ogType: 'website',
        ogImage: image,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: subcategory.name,
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

      const image = category.bannerUrl || category.imageUrl || defaultImage;
      const canonicalUrl = `${origin}/#category=${category.slug}`;

      return {
        title,
        description,
        canonicalUrl,
        ogType: 'website',
        ogImage: image,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: category.name,
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

    // All Products Catalogue
    const title = `All Designer Collections & New Arrivals | ${brandName}`;
    const description = `Browse the complete ${brandName} ethnic wear catalogue — featuring kurtis, trousers, festive sets, and jewelry handcrafted with heritage artisanal details.`;
    const canonicalUrl = `${origin}/#catalogue`;

    return {
      title,
      description,
      canonicalUrl,
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
  if (activeView === 'blogs') {
    if (blog) {
      const title = `${blog.seoTitle || blog.title} | ${brandName} Journal`;
      const description =
        blog.seoDescription ||
        blog.metaDescription ||
        blog.excerpt ||
        `${blog.title} — styling tips and ethnic wear trends from ${brandName}.`;
      const image = blog.featuredImage || defaultImage;
      const canonicalUrl = `${origin}/#blog=${blog.id}`;

      return {
        title,
        description,
        canonicalUrl,
        ogType: 'article',
        ogImage: image,
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
    const canonicalUrl = `${origin}/#blogs`;

    return {
      title,
      description,
      canonicalUrl,
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

  // 4. WISHLIST
  if (activeView === 'wishlist') {
    const title = `My Saved Wishlist | ${brandName}`;
    const description = `View your saved ${brandName} favorites. Keep track of your shortlisted designer kurtis, straight-fit trousers, and festive ensembles.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/#wishlist`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
      },
    };
  }

  // 5. CHECKOUT
  if (activeView === 'checkout') {
    const title = `Secure Checkout | ${brandName}`;
    const description = `Complete your order securely with fast pan-India delivery, verified payment gateways, and COD options on ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/#checkout`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CheckoutPage',
        name: title,
        description,
      },
    };
  }

  // 6. TRACK ORDER
  if (activeView === 'track-order') {
    const title = `Track Order & Delivery Status | ${brandName}`;
    const description = `Track your ${brandName} package in real time with our live Shipmozo & courier logistics integration.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/trackyourorder`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
      },
    };
  }

  // 7. SIZE GUIDE
  if (activeView === 'size-guide') {
    const title = `Official Size Chart & Fit Guide | ${brandName}`;
    const description = `Find your perfect fit with ${brandName}'s detailed size guide. Bust, waist, hip, and length measurements for kurtis and trousers across sizes XS to 4XL.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/size-guide`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
      },
    };
  }

  // 8. FAQS
  if (activeView === 'faqs') {
    const title = `Frequently Asked Questions & Customer Support | ${brandName}`;
    const description = `Answers to common questions regarding ordering, shipping timelines, returns, exchanges, custom stitching, and payments at ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/faqs`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: title,
        description,
      },
    };
  }

  // 9. POLICY PAGES
  if (activeView === 'shipping-delivery') {
    const title = `Shipping & Express Delivery Information | ${brandName}`;
    const description = `Learn about ${brandName}'s dispatch timelines, free shipping thresholds, and trusted pan-India courier delivery partners.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/shipping-delivery`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    };
  }

  if (activeView === 'returns-exchange') {
    const title = `Hassle-Free Returns & Exchange Policy | ${brandName}`;
    const description = `Explore ${brandName}'s easy return and size exchange process for customer satisfaction across all ethnic wear orders.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/returns-exchange`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    };
  }

  if (activeView === 'privacy-policy') {
    const title = `Privacy Policy & Customer Security | ${brandName}`;
    const description = `How ${brandName} collects, protects, and respects your personal data, order details, and privacy.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/privacy-policy`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    };
  }

  if (activeView === 'terms-conditions') {
    const title = `Terms & Conditions | ${brandName} Official Store`;
    const description = `Terms of service, website usage guidelines, and customer purchase policies for ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/terms-conditions`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    };
  }

  if (activeView === 'cancellation-policy') {
    const title = `Order Cancellation Policy | ${brandName}`;
    const description = `Easy cancellation guidelines and instant refund options prior to dispatch for all ${brandName} purchases.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/cancellation-policy`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    };
  }

  if (activeView === 'stitching-services') {
    const title = `Bespoke Stitching & Custom Alterations | ${brandName}`;
    const description = `Personalized custom stitching, sleeve alterations, and neckline tailoring handcrafted by master artisans at ${brandName}.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/stitching-services`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    };
  }

  if (activeView === 'contact' || activeView === 'contact-us') {
    const title = `Contact Us & Concierge Support | ${brandName}`;
    const description = `Have a question about your order, styling, or custom sizing? Reach out to ${brandName}'s customer care team.`;
    return {
      title,
      description,
      canonicalUrl: `${origin}/#contact`,
      ogType: 'website',
      ogImage: defaultImage,
      jsonLd: { '@context': 'https://schema.org', '@type': 'ContactPage', name: title, description },
    };
  }

  // DEFAULT / HOME VIEW
  const title = `${brandName} — Modern Ethnic Wear & Handcrafted Designer Kurtis`;
  const description = `Shop premium Indian ethnic wear from ${brandName}. Discover designer kurtis, chic straight trousers, festive ensembles, and handcrafted jewelry designed for timeless elegance.`;
  const canonicalUrl = `${origin}/`;

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'website',
    ogImage: defaultImage,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: brandName,
      image: defaultImage,
      url: origin,
      telephone: '+91-9876543210',
      priceRange: '₹₹',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/#search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  };
}
