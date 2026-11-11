import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ColorVariant, Category } from '../../types';
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Palette,
  Upload,
  Layers,
  Sparkles,
  Tag,
  ShieldCheck,
  Truck,
  Eye,
  Info,
  DollarSign,
  Package,
  Sliders,
  CheckCircle2,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkle,
  Link,
  Save,
  CheckCircle,
  ListPlus,
  ListChecks,
  Edit3,
} from 'lucide-react';
import { ColorEditorModal, ColorDef } from './ColorEditorModal';
import { DeleteColorModal } from './DeleteColorModal';
import {
  BASE_COLORS,
  QUICK_FANCY_PRESETS,
  getAutoColorCode,
  isValidHex,
  extractDominantColorFromImage,
} from './colorData';
import { uploadImageFile } from '../../utils/imageUpload';
import { useUploadedImages } from '../../utils/userUploadedImages';

interface AddProductPageProps {
  initialProduct?: Product | null;
  initialSelectedColorIndex?: number;
  categories: Category[];
  onSave: (productData: any) => void;
  onCancel: () => void;
}

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const SAMPLE_CLOTHING_PRESETS = [
  {
    name: 'Puffer Sage Jacket / Kurti',
    url: 'https://images.unsplash.com/photo-1596783049448-f8602b9e7c5d?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Teal Emerald A-Line Kurti',
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Crimson Festive Silk Kurti',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'White Straight Tailored Trouser',
    url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Midnight Black Cigarette Pants',
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Royal Blue Printed Kurti Set',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
  },
];

export const POPULAR_FANCY_COLORS = QUICK_FANCY_PRESETS;
export { getAutoColorCode };
export type { ColorDef };

interface VariantRow {
  key: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  colorCode: string;
  size: string;
  sku: string;
  stock: number;
  priceOverride: string;
  active: boolean;
}

export const AddProductPage: React.FC<AddProductPageProps> = ({
  initialProduct,
  initialSelectedColorIndex = 0,
  categories,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(initialProduct);

  // Form dirty tracking for Unsaved Changes dialog
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Saving lock to prevent duplicate submissions
  const [isSaving, setIsSaving] = useState(false);

  // General Information State (Clean, empty state by default for new products)
  const [name, setName] = useState(initialProduct?.name || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [highlights, setHighlights] = useState<string[]>(
    initialProduct?.highlights && initialProduct.highlights.length > 0
      ? initialProduct.highlights
      : []
  );
  const [newBulletInput, setNewBulletInput] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (initialProduct?.sizes && initialProduct.sizes.length > 0) {
      return initialProduct.sizes.filter(
        (s) => !['free size', 'freesize', 'free-size', 'free'].includes(s.trim().toLowerCase())
      );
    }
    return [];
  });
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [showAddSizeInput, setShowAddSizeInput] = useState(false);
  const [gender, setGender] = useState<string>(
    initialProduct ? (initialProduct as any)?.gender || '' : ''
  );
  const [brand, setBrand] = useState(initialProduct?.brand || '');

  // Track whether admin manually customized Parent SKU
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState<boolean>(Boolean(initialProduct?.sku));
  const [skuSequence] = useState<string>(() => {
    if (initialProduct?.sku) {
      const parts = initialProduct.sku.split('-');
      const last = parts[parts.length - 1];
      if (/^\d{3,5}$/.test(last)) return last;
    }
    return String(Math.floor(1000 + Math.random() * 9000));
  });
  const [parentSku, setParentSku] = useState(initialProduct?.sku || '');

  // Pricing & Stock State (Empty by default for new products)
  const [basePrice, setBasePrice] = useState(
    initialProduct?.price ? String(initialProduct.price) : ''
  );
  const [mrp, setMrp] = useState(
    initialProduct?.mrp ? String(initialProduct.mrp) : ''
  );
  const [costPrice, setCostPrice] = useState(
    (initialProduct as any)?.costPrice ? String((initialProduct as any).costPrice) : ''
  );
  const [gstRate, setGstRate] = useState(
    initialProduct?.gstRate ? String(initialProduct.gstRate) : '5'
  );

  // Category, Subcategory & Product Type State (Independent & never auto-selecting unrelated defaults)
  const [category, setCategory] = useState(
    initialProduct?.category || ''
  );
  const [subcategory, setSubcategory] = useState(
    initialProduct?.subcategory || ''
  );
  const [subSubcategory, setSubSubcategory] = useState(
    initialProduct?.subSubcategory || ''
  );
  const [kurtiType, setKurtiType] = useState<string>(
    initialProduct?.kurtiType || initialProduct?.typeStyle || ''
  );
  const [typeStyle, setTypeStyle] = useState<string>(
    initialProduct?.typeStyle || initialProduct?.kurtiType || ''
  );
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  // Storefront & Flags
  const [isFeatured, setIsFeatured] = useState(Boolean((initialProduct as any)?.featured));
  const [isNewArrival, setIsNewArrival] = useState(Boolean((initialProduct as any)?.newArrival || initialProduct?.isNewArrival || initialProduct?.isNewLaunch));
  const [isBestseller, setIsBestseller] = useState(Boolean((initialProduct as any)?.bestseller || initialProduct?.isBestseller));
  const [isTrending, setIsTrending] = useState(Boolean((initialProduct as any)?.trending));
  const [isFestive, setIsFestive] = useState(Boolean((initialProduct as any)?.isFestive));
  const [offerTag, setOfferTag] = useState(initialProduct?.offerTag || '');

  // Shipping & Returns (Collapsible)
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [dispatchTime, setDispatchTime] = useState(
    initialProduct?.deliveryInfo || ''
  );
  const [returnWindow, setReturnWindow] = useState(
    initialProduct?.returnPolicy || ''
  );
  const [isCodAvailable, setIsCodAvailable] = useState(true);

  // SEO & Search (Collapsible)
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState(initialProduct?.seo?.title || '');
  const [metaDescription, setMetaDescription] = useState(initialProduct?.seo?.metaDescription || '');
  const [urlSlug, setUrlSlug] = useState(initialProduct?.slug || '');

  // Advanced Details (Collapsible)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [material, setMaterial] = useState(initialProduct?.material || '');
  const [fit, setFit] = useState(initialProduct?.fit || '');
  const [barcode, setBarcode] = useState((initialProduct as any)?.barcode || '');
  const [hsnCode, setHsnCode] = useState((initialProduct as any)?.hsnCode || '');

  // Unassigned media buffer ONLY when no color variation exists yet
  const hasInitialColorSetup = Boolean(
    initialProduct &&
      ((initialProduct.colorOptions && initialProduct.colorOptions.length > 0) ||
        initialProduct.color)
  );
  const [unassignedPrimaryImage, setUnassignedPrimaryImage] = useState<string>(
    !initialProduct || hasInitialColorSetup ? '' : initialProduct.mainImage || ''
  );
  const [unassignedGalleryImages, setUnassignedGalleryImages] = useState<string[]>(
    !initialProduct || hasInitialColorSetup
      ? []
      : initialProduct.images && initialProduct.images.length > 0
      ? initialProduct.images
      : initialProduct.mainImage
      ? [initialProduct.mainImage]
      : []
  );

  // Color Definitions & Color-Specific Media (Empty for new products — no default "Sage Green")
  const [colors, setColors] = useState<ColorDef[]>(() => {
    if (!initialProduct) {
      return [];
    }
    if (initialProduct.colorOptions && initialProduct.colorOptions.length > 0) {
      return initialProduct.colorOptions.map((c, idx) => ({
        id: `col-${idx}`,
        name: c.name || `Color ${idx + 1}`,
        hex: c.hex || '#10b981',
        code: (c as any).code || c.name.slice(0, 2).toUpperCase(),
        primaryImage: c.image || initialProduct.mainImage || '',
        galleryImages:
          c.images && c.images.length > 0
            ? c.images
            : c.image || initialProduct.mainImage
            ? [c.image || initialProduct.mainImage]
            : [],
      }));
    }
    if (initialProduct.color) {
      return [
        {
          id: 'col-0',
          name: initialProduct.color,
          hex: '#10b981',
          code: getAutoColorCode(initialProduct.color),
          primaryImage: initialProduct.mainImage || '',
          galleryImages:
            initialProduct.images && initialProduct.images.length > 0
              ? initialProduct.images
              : initialProduct.mainImage
              ? [initialProduct.mainImage]
              : [],
        },
      ];
    }
    return [];
  });

  const [activeColorIndex, setActiveColorIndex] = useState<number>(
    Math.max(0, Math.min(initialSelectedColorIndex, (initialProduct?.colorOptions?.length || 1) - 1))
  );

  // Color Modals & Management
  const [showColorModal, setShowColorModal] = useState(false);
  const [editingColor, setEditingColor] = useState<ColorDef | null>(null);
  const [colorToDelete, setColorToDelete] = useState<ColorDef | null>(null);

  // Image Upload / Add URL Modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { images: uploadedImages, addImage: saveToLibrary, removeImage: removeFromLibrary } = useUploadedImages();

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper for generating readable structured Parent SKU & Variant SKU
  const buildStructuredParentSku = (
    catName: string,
    prodType: string,
    subCat: string,
    prodTitle: string,
    colCode: string,
    seq: string
  ) => {
    const cleanAlpha = (str: string, len: number, fallback: string) => {
      const cleaned = (str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return cleaned.length >= 2 ? cleaned.slice(0, len) : fallback;
    };
    const catSegment = cleanAlpha(catName, 3, 'PRD');
    const typeSource = prodType || subCat || prodTitle;
    const typeFirstWord = (typeSource || '').trim().split(/\s+/)[0] || '';
    const typeSegment = cleanAlpha(typeFirstWord, 5, 'STD');
    const colorSegment = cleanAlpha(colCode, 3, 'CLR');
    return `RM-${catSegment}-${typeSegment}-${colorSegment}-${seq}`;
  };

  const generateSku = (pSku: string, cCode: string, size: string) => {
    const cleanParent = (pSku || 'RM-PRD').trim().toUpperCase();
    const cleanColor = (cCode || 'CL').trim().toUpperCase();
    const cleanSize = (size || 'STD').trim().toUpperCase();
    if (cleanParent.includes(`-${cleanColor}-`)) {
      return `${cleanParent}-${cleanSize}`;
    }
    return `${cleanParent}-${cleanColor}-${cleanSize}`;
  };

  // Variants Matrix: Color × Size
  const [variants, setVariants] = useState<VariantRow[]>(() => {
    if (!initialProduct) {
      return [];
    }
    const initialRows: VariantRow[] = [];
    const colorsList =
      initialProduct.colorOptions && initialProduct.colorOptions.length > 0
        ? initialProduct.colorOptions
        : initialProduct.color
        ? [
            {
              name: initialProduct.color,
              hex: '#10b981',
              stockBySize: initialProduct.stockBySize || {},
            },
          ]
        : [];

    const currentSizes =
      initialProduct.sizes && initialProduct.sizes.length > 0
        ? initialProduct.sizes.filter(
            (s) => !['free size', 'freesize', 'free-size', 'free'].includes(s.trim().toLowerCase())
          )
        : [];

    const parent =
      initialProduct.sku ||
      `RM-${(initialProduct.category || 'PRD').slice(0, 3).toUpperCase()}-${skuSequence}`;

    colorsList.forEach((c, cIdx) => {
      const cCode = (c as any).code || c.name.slice(0, 2).toUpperCase();
      if (currentSizes.length === 0) {
        const key = `var_${cIdx}_freesize`;
        const existingStock =
          c.stockBySize?.['Free size'] !== undefined
            ? c.stockBySize['Free size']
            : initialProduct.stockBySize?.['Free size'] !== undefined
            ? initialProduct.stockBySize['Free size']
            : 0;
        const existingSku =
          (c as any).skuBySize?.['Free size'] ||
          initialProduct.skuBySize?.['Free size'] ||
          generateSku(parent, cCode, 'FS');
        const isInactive = initialProduct.inactiveRowKeys?.includes(key);

        initialRows.push({
          key,
          colorId: `col-${cIdx}`,
          colorName: c.name,
          colorHex: c.hex || '#10b981',
          colorCode: cCode,
          size: 'Free size',
          sku: existingSku,
          stock: Number(existingStock) || 0,
          priceOverride: '',
          active: !isInactive,
        });
      } else {
        currentSizes.forEach((sz) => {
          const key = `var_${cIdx}_${sz}`;
          const existingStock =
            c.stockBySize?.[sz] !== undefined
              ? c.stockBySize[sz]
              : initialProduct.stockBySize?.[sz] !== undefined
              ? initialProduct.stockBySize[sz]
              : 0;
          const existingSku =
            (c as any).skuBySize?.[sz] ||
            initialProduct.skuBySize?.[sz] ||
            generateSku(parent, cCode, sz);
          const isInactive = initialProduct.inactiveRowKeys?.includes(key);

          initialRows.push({
            key,
            colorId: `col-${cIdx}`,
            colorName: c.name,
            colorHex: c.hex || '#10b981',
            colorCode: cCode,
            size: sz,
            sku: existingSku,
            stock: Number(existingStock) || 0,
            priceOverride: '',
            active: !isInactive,
          });
        });
      }
    });

    return initialRows;
  });

  // Re-sync variants whenever colors or sizes change, preserving existing entered values
  useEffect(() => {
    setVariants((prevVariants) => {
      if (colors.length === 0 && selectedSizes.length === 0) {
        return [];
      }
      const newRows: VariantRow[] = [];
      const parent = parentSku || `RM-PRD-${skuSequence}`;
      const effectiveColors: ColorDef[] =
        colors.length > 0
          ? colors
          : [
              {
                id: 'col-0',
                name: 'Standard',
                hex: '#94a3b8',
                code: 'STD',
                primaryImage: unassignedPrimaryImage,
                galleryImages: unassignedGalleryImages,
              },
            ];

      effectiveColors.forEach((col) => {
        if (selectedSizes.length === 0) {
          const key = `var_${col.id}_freesize`;
          const existing = prevVariants.find(
            (v) =>
              (v.colorId === col.id || v.colorName.toLowerCase() === col.name.toLowerCase()) &&
              (v.size === 'Free size' || v.size === '')
          );

          if (existing) {
            newRows.push({
              ...existing,
              key,
              colorId: col.id,
              colorName: col.name,
              colorHex: col.hex,
              colorCode: col.code,
              size: 'Free size',
              sku: !isEditing ? generateSku(parent, col.code, 'FS') : existing.sku,
            });
          } else {
            newRows.push({
              key,
              colorId: col.id,
              colorName: col.name,
              colorHex: col.hex,
              colorCode: col.code,
              size: 'Free size',
              sku: generateSku(parent, col.code, 'FS'),
              stock: 0,
              priceOverride: '',
              active: true,
            });
          }
        } else {
          selectedSizes.forEach((sz) => {
            const key = `var_${col.id}_${sz}`;
            const existing = prevVariants.find(
              (v) =>
                (v.colorId === col.id || v.colorName.toLowerCase() === col.name.toLowerCase()) &&
                v.size === sz
            );

            if (existing) {
              newRows.push({
                ...existing,
                key,
                colorId: col.id,
                colorName: col.name,
                colorHex: col.hex,
                colorCode: col.code,
                sku: !isEditing ? generateSku(parent, col.code, sz) : existing.sku,
              });
            } else {
              newRows.push({
                key,
                colorId: col.id,
                colorName: col.name,
                colorHex: col.hex,
                colorCode: col.code,
                size: sz,
                sku: generateSku(parent, col.code, sz),
                stock: 0,
                priceOverride: '',
                active: true,
              });
            }
          });
        }
      });

      return newRows;
    });
  }, [colors, selectedSizes, parentSku, isEditing, skuSequence, unassignedPrimaryImage, unassignedGalleryImages]);

  // Automatically update Parent SKU dynamically before first save ONLY once product details are being entered
  useEffect(() => {
    if (!isEditing && !isSkuManuallyEdited) {
      const hasAnyInput = Boolean(
        name.trim() ||
          category.trim() ||
          subcategory.trim() ||
          kurtiType.trim() ||
          typeStyle.trim() ||
          colors.length > 0
      );
      if (!hasAnyInput) {
        setParentSku('');
        return;
      }
      const primaryColCode = colors[0]?.code || (colors[0]?.name ? getAutoColorCode(colors[0].name) : 'CLR');
      const autoSku = buildStructuredParentSku(
        category,
        typeStyle || kurtiType,
        subcategory,
        name,
        primaryColCode,
        skuSequence
      );
      setParentSku(autoSku);
    }
  }, [name, category, subcategory, kurtiType, typeStyle, colors, isEditing, isSkuManuallyEdited, skuSequence]);

  // Fancy Product Naming & Dynamic Fancy Colour Naming State (No default colour pre-selected for new products)
  const [selectedBaseColorFamily, setSelectedBaseColorFamily] = useState<string>(() => {
    if (!initialProduct?.color) return '';
    const initialColName = initialProduct.color.toLowerCase();
    const foundBase = BASE_COLORS.find(
      (b) =>
        initialColName.includes(b.name.toLowerCase()) ||
        b.suggestions.some((s) => s.name.toLowerCase() === initialColName)
    );
    return foundBase?.name || '';
  });
  const [fancyNameSeed, setFancyNameSeed] = useState<number>(0);
  const [showMoreNameIdeas, setShowMoreNameIdeas] = useState<boolean>(false);

  const dynamicFancyColorSuggestions = useMemo(() => {
    if (!selectedBaseColorFamily) return [];
    const baseObj = BASE_COLORS.find(
      (b) => b.name.toLowerCase() === selectedBaseColorFamily.toLowerCase()
    );
    return baseObj ? baseObj.suggestions : [];
  }, [selectedBaseColorFamily]);

  const suggestedFancyProductNames = useMemo(() => {
    const activeColName = (colors[activeColorIndex]?.name || colors[0]?.name || '').trim();
    const cleanCat = category.trim() || 'Kurti';
    const cleanSub = subcategory.trim();
    const cleanType = (typeStyle || kurtiType).trim();
    const cleanMat = material.trim().split(/\s+/)[0] || '';

    const styleDescriptor = cleanType || cleanSub || cleanCat;
    const colorPart = activeColName ? `${activeColName} ` : '';
    const matPart = cleanMat && !styleDescriptor.toLowerCase().includes(cleanMat.toLowerCase()) ? `${cleanMat} ` : '';

    const craftAdjectives = [
      'Royal',
      'Signature',
      'Handcrafted',
      'Festive',
      'Classic',
      'Heritage',
      'Artisanal',
      'Everyday Elegance',
    ];
    const adj1 = craftAdjectives[fancyNameSeed % craftAdjectives.length];
    const adj2 = craftAdjectives[(fancyNameSeed + 2) % craftAdjectives.length];
    const adj3 = craftAdjectives[(fancyNameSeed + 4) % craftAdjectives.length];

    const pool: string[] = [
      `${colorPart}${styleDescriptor}`.trim(),
      `${adj1} ${colorPart}${styleDescriptor}`.replace(/\s+/g, ' ').trim(),
      `${colorPart}${matPart}${styleDescriptor}`.replace(/\s+/g, ' ').trim(),
      `${adj2} ${colorPart}${cleanCat}`.replace(/\s+/g, ' ').trim(),
      `${adj3} ${colorPart}${styleDescriptor}`.replace(/\s+/g, ' ').trim(),
    ].filter((s) => s.length > 2);

    return Array.from(new Set(pool));
  }, [colors, activeColorIndex, category, subcategory, kurtiType, typeStyle, material, fancyNameSeed]);

  // Handle URL slug auto generation from product name
  useEffect(() => {
    if (!urlSlug || urlSlug === initialProduct?.slug || !isEditing) {
      const generated = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setUrlSlug(generated);
    }
  }, [name, isEditing]);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateSkus, setDuplicateSkus] = useState<string[]>([]);

  // Duplicate SKU validation in real-time
  useEffect(() => {
    const skuCounts: Record<string, number> = {};
    const duplicates: string[] = [];

    variants.forEach((v) => {
      if (!v.active) return;
      const normalized = v.sku.trim().toUpperCase();
      if (!normalized) return;
      skuCounts[normalized] = (skuCounts[normalized] || 0) + 1;
      if (skuCounts[normalized] > 1 && !duplicates.includes(normalized)) {
        duplicates.push(normalized);
      }
    });

    setDuplicateSkus(duplicates);
  }, [variants]);

  // Discount calculation
  const numericBasePrice = parseFloat(basePrice) || 0;
  const numericMrp = parseFloat(mrp) || 0;
  const discountPercent = useMemo(() => {
    if (numericMrp > numericBasePrice && numericMrp > 0) {
      return Math.round(((numericMrp - numericBasePrice) / numericMrp) * 100);
    }
    return 0;
  }, [numericBasePrice, numericMrp]);

  // Total stock calculation across all active variants
  const totalStock = useMemo(() => {
    return variants.reduce((sum, v) => (v.active ? sum + (Number(v.stock) || 0) : sum), 0);
  }, [variants]);

  // Active color or fallback to unassigned media slot when no color is chosen yet
  const activeColor: ColorDef | undefined = colors[activeColorIndex] || colors[0];
  const currentPrimaryImage = activeColor ? activeColor.primaryImage : unassignedPrimaryImage;
  const currentGalleryImages = activeColor ? activeColor.galleryImages : unassignedGalleryImages;

  // Completion Status Calculations
  const completionStats = useMemo(() => {
    const checks = [
      { name: 'General Information', valid: Boolean(name.trim()) },
      { name: 'Product Media', valid: Boolean(currentPrimaryImage || currentGalleryImages.length > 0) },
      { name: 'Pricing & MRP', valid: Boolean(numericBasePrice > 0 && numericMrp >= numericBasePrice) },
      { name: 'Category Selected', valid: Boolean(category.trim()) },
      { name: 'Variants & SKUs', valid: Boolean(duplicateSkus.length === 0 && (variants.length > 0 || Boolean(parentSku.trim()))) },
      { name: 'SEO & Search', valid: Boolean(urlSlug.trim()) },
    ];

    const completed = checks.filter((c) => c.valid).length;
    const remaining = checks.length - completed;
    return { checks, completed, total: checks.length, remaining };
  }, [name, currentPrimaryImage, currentGalleryImages, numericBasePrice, numericMrp, category, variants, duplicateSkus, parentSku, urlSlug]);

  // Browser Back & Popstate Handling
  useEffect(() => {
    window.history.pushState({ page: 'admin-product-editor' }, '', window.location.href);

    const handlePopState = () => {
      if (isDirty) {
        setShowUnsavedModal(true);
      } else {
        onCancel();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty, onCancel]);

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onCancel();
    }
  };

  const handleOpenAddColor = () => {
    setEditingColor(null);
    setShowColorModal(true);
  };

  const handleOpenEditColor = (col: ColorDef) => {
    setEditingColor(col);
    setShowColorModal(true);
  };

  const handleSaveColor = (savedColor: ColorDef) => {
    setIsDirty(true);
    if (editingColor) {
      // Permanently purge any photo that was removed inside ColorEditorModal
      const prevImgs = new Set([editingColor.primaryImage, ...(editingColor.galleryImages || [])].filter(Boolean));
      const nextImgs = new Set([savedColor.primaryImage, ...(savedColor.galleryImages || [])].filter(Boolean));
      prevImgs.forEach((oldUrl) => {
        if (oldUrl && !nextImgs.has(oldUrl)) {
          removeFromLibrary(oldUrl);
          setUnassignedGalleryImages((prev) => prev.filter((u) => u !== oldUrl));
          setUnassignedPrimaryImage((curr) => (curr === oldUrl ? '' : curr));
        }
      });

      setColors((prev) =>
        prev.map((c) => (c.id === savedColor.id ? savedColor : c))
      );
      setVariants((prev) =>
        prev.map((row) => {
          if (row.colorId === savedColor.id || row.colorName.toLowerCase() === editingColor.name.toLowerCase()) {
            return {
              ...row,
              colorId: savedColor.id,
              colorName: savedColor.name,
              colorHex: savedColor.hex,
              colorCode: savedColor.code,
            };
          }
          return row;
        })
      );
      showToast(`Updated color "${savedColor.name}"`);
    } else {
      const colorWithInheritedMedia: ColorDef =
        colors.length === 0 && (!savedColor.galleryImages || savedColor.galleryImages.length === 0) && unassignedGalleryImages.length > 0
          ? {
              ...savedColor,
              primaryImage: savedColor.primaryImage || unassignedPrimaryImage || unassignedGalleryImages[0] || '',
              galleryImages: unassignedGalleryImages,
            }
          : savedColor;
      if (colors.length === 0) {
        setUnassignedGalleryImages([]);
        setUnassignedPrimaryImage('');
      }
      setColors((prev) => [...prev, colorWithInheritedMedia]);
      setActiveColorIndex(colors.length);
      showToast(`Added color "${savedColor.name}" (${savedColor.code})`);
    }
  };

  const handlePromptDeleteColor = (col: ColorDef) => {
    const colorVariants = variants.filter(
      (v) => v.colorId === col.id || v.colorName.toLowerCase() === col.name.toLowerCase()
    );
    const colStock = colorVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    if (colorVariants.length > 0 && colStock > 0) {
      setColorToDelete(col);
    } else {
      performDeleteColor(col);
    }
  };

  const performDeleteColor = (col: ColorDef) => {
    const idx = colors.findIndex((c) => c.id === col.id);
    const updated = colors.filter((c) => c.id !== col.id);
    const remainingColorUrls = new Set(
      updated.flatMap((c) => [c.primaryImage, ...(c.galleryImages || [])]).filter(Boolean)
    );
    [col.primaryImage, ...(col.galleryImages || [])].forEach((u) => {
      if (u && !remainingColorUrls.has(u)) {
        removeFromLibrary(u);
        setUnassignedGalleryImages((prev) => prev.filter((img) => img !== u));
        setUnassignedPrimaryImage((curr) => (curr === u ? '' : curr));
      }
    });
    setColors(updated);
    setActiveColorIndex(Math.max(0, idx - 1));
    setVariants((prev) =>
      prev.filter(
        (v) => v.colorId !== col.id && v.colorName.toLowerCase() !== col.name.toLowerCase()
      )
    );
    setColorToDelete(null);
    setIsDirty(true);
    showToast(`Deleted color "${col.name}" and its photos`);
  };

  const handleDeactivateColor = (col: ColorDef) => {
    setIsDirty(true);
    setVariants((prev) =>
      prev.map((v) =>
        v.colorId === col.id || v.colorName.toLowerCase() === col.name.toLowerCase()
          ? { ...v, active: false }
          : v
      )
    );
    setColorToDelete(null);
    showToast(`Deactivated variants for "${col.name}"`);
  };

  // Size toggling
  const handleToggleSize = (size: string) => {
    setIsDirty(true);
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleAddCustomSize = () => {
    if (!customSizeInput.trim()) return;
    const clean = customSizeInput.trim().toUpperCase();
    if (!selectedSizes.includes(clean)) {
      setSelectedSizes([...selectedSizes, clean]);
    }
    setCustomSizeInput('');
    setShowAddSizeInput(false);
    setIsDirty(true);
  };

  // Variant Row updates
  const updateVariant = (key: string, field: keyof VariantRow, val: any) => {
    setIsDirty(true);
    setVariants((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: val } : row))
    );
  };

  // Bulk set stock for all active variants
  const handleApplyBulkStock = (amount: number) => {
    setIsDirty(true);
    setTotalStockInput(String(amount * Math.max(1, variants.filter((v) => v.active).length)));
    setVariants((prev) =>
      prev.map((row) => (row.active ? { ...row, stock: Math.max(0, amount) } : row))
    );
    showToast(`Updated stock to ${amount} for all active variants`);
  };

  // Direct Total Stock input management: empty for new products, allows smooth typing (0, 1, 10, 100, 250, 1000)
  const isTotalStockFocused = useRef(false);
  const [totalStockInput, setTotalStockInput] = useState<string>(() =>
    initialProduct ? String(totalStock) : ''
  );

  useEffect(() => {
    if (!isTotalStockFocused.current) {
      if (variants.length > 0 && totalStock > 0) {
        setTotalStockInput(String(totalStock));
      } else if (initialProduct) {
        setTotalStockInput(String(totalStock));
      }
    }
  }, [totalStock, variants.length, initialProduct]);

  const applyTotalStockDistribution = (total: number) => {
    setIsDirty(true);
    const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
    setVariants((prev) => {
      if (prev.length === 0) return prev;
      const hasActive = prev.some((v) => v.active);
      const targetRows = hasActive ? prev.filter((v) => v.active) : prev;
      const count = targetRows.length;
      if (count === 0) return prev;
      const base = Math.floor(safeTotal / count);
      let rem = safeTotal % count;

      return prev.map((v) => {
        if (hasActive && !v.active) return v;
        const extra = rem > 0 ? 1 : 0;
        if (rem > 0) rem--;
        return {
          ...v,
          active: true,
          stock: Math.max(0, base + extra),
        };
      });
    });
  };

  // Highlights / Bullet Points Management
  const suggestedBulletPoints = useMemo(() => {
    const coreBullets = [
      'Premium Quality Fabric',
      'Comfortable Everyday Wear',
      'Elegant Floral Design',
      'Breathable Fabric',
      'Stylish 3/4 Sleeves',
      'Perfect for Casual Wear',
      'Soft & Skin-Friendly',
      'Colorfast & Fade Resistant',
      'Ideal for Office & Festive Wear',
      'Easy Hand & Machine Wash',
      '100% Pure Cotton Feel',
      'Flattering Regular Fit',
    ];
    const lowerCat = (category || '').toLowerCase();
    if (lowerCat.includes('shirt') && !lowerCat.includes('t-shirt')) {
      return [
        'Premium Quality Fabric',
        'Comfortable Everyday Wear',
        'Breathable Fabric',
        'Crisp Collar & Tailored Fit',
        'Perfect for Casual & Formal Wear',
        'Soft & Skin-Friendly',
        'Easy Iron & Wrinkle Resistant',
        'Colorfast & Fade Resistant',
      ];
    }
    if (lowerCat.includes('t-shirt') || lowerCat.includes('tshirt')) {
      return [
        'Premium Quality Fabric',
        'Comfortable Everyday Wear',
        'Breathable Cotton Jersey',
        'Soft & Skin-Friendly',
        'Perfect for Casual Wear',
        'Durable Ribbed Crew Neck',
        'Colorfast & Pre-Shrunk Fabric',
        'Relaxed All-Day Fit',
      ];
    }
    if (lowerCat.includes('lower') || lowerCat.includes('trouser') || lowerCat.includes('bottom')) {
      return [
        'Premium Quality Fabric',
        'Comfortable Everyday Wear',
        'Breathable & Stretchable Fabric',
        'Elasticated Waistband with Drawstring',
        'Deep Side Pockets for Convenience',
        'Perfect for Casual & Active Wear',
        'Soft & Skin-Friendly',
        'Easy Hand & Machine Wash',
      ];
    }
    return coreBullets;
  }, [category]);

  const handleToggleBulletPreset = (bulletText: string) => {
    setHighlights((prev) => {
      const exists = prev.some((b) => b.trim().toLowerCase() === bulletText.toLowerCase());
      if (exists) {
        return prev.filter((b) => b.trim().toLowerCase() !== bulletText.toLowerCase());
      }
      return [...prev, bulletText];
    });
    setIsDirty(true);
  };

  const handleAddHighlight = () => {
    if (!newBulletInput.trim()) return;
    setHighlights((prev) => [...prev, newBulletInput.trim()]);
    setNewBulletInput('');
    setIsDirty(true);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleUpdateHighlight = (index: number, text: string) => {
    setHighlights((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
    setIsDirty(true);
  };

  // Regenerate all variant SKUs
  const handleRegenerateAllSkus = () => {
    setIsDirty(true);
    const primaryColCode = colors[0]?.code || (colors[0]?.name ? getAutoColorCode(colors[0].name) : 'CLR');
    const parent =
      parentSku ||
      buildStructuredParentSku(
        category,
        typeStyle || kurtiType,
        subcategory,
        name,
        primaryColCode,
        skuSequence
      );
    if (!parentSku) {
      setParentSku(parent);
    }
    setVariants((prev) =>
      prev.map((row) => ({
        ...row,
        sku: generateSku(parent, row.colorCode, row.size),
      }))
    );
    showToast('All variant SKUs regenerated');
  };

  // Active color gallery updates: works whether colors are added or still in unassigned state
  const setPrimaryImageForActiveColor = (imgUrl: string) => {
    if (!imgUrl) return;
    setIsDirty(true);
    if (colors.length === 0) {
      setUnassignedPrimaryImage(imgUrl);
      setUnassignedGalleryImages((prev) => [imgUrl, ...prev.filter((i) => i !== imgUrl)]);
      showToast('Cover photo set as main!');
      return;
    }
    setColors((prev) =>
      prev.map((col, idx) => {
        if (idx !== activeColorIndex) return col;
        const remaining = (col.galleryImages || []).filter((img) => img !== imgUrl);
        return {
          ...col,
          primaryImage: imgUrl,
          galleryImages: [imgUrl, ...remaining],
        };
      })
    );
    showToast('Cover photo set as main!');
  };

  const isSampleOrEphemeralUrl = (img?: string): boolean => {
    if (!img || typeof img !== 'string') return true;
    if (img.startsWith('/uploads/')) return true;
    if (img.includes('images.unsplash.com')) return true;
    if (SAMPLE_CLOTHING_PRESETS.some((preset) => preset.url === img)) return true;
    return false;
  };

  const addImageToActiveColor = (imgUrl: string) => {
    const cleanUrl = imgUrl.trim();
    if (!cleanUrl) return;
    setIsDirty(true);
    if (colors.length === 0) {
      setUnassignedGalleryImages((prev) => {
        const cleaned = prev.filter((img) => !isSampleOrEphemeralUrl(img) && img !== cleanUrl);
        return [cleanUrl, ...cleaned];
      });
      setUnassignedPrimaryImage(cleanUrl);
      showToast('Photo added as main cover!');
      return;
    }
    setColors((prev) =>
      prev.map((col, idx) => {
        if (idx !== activeColorIndex) return col;
        const currentGallery = (col.galleryImages || []).filter(
          (img) => !isSampleOrEphemeralUrl(img) && img !== cleanUrl
        );
        const updatedGallery = [cleanUrl, ...currentGallery];
        return {
          ...col,
          galleryImages: updatedGallery,
          primaryImage: cleanUrl,
        };
      })
    );
    showToast('Photo added as main cover!');
  };

  const removeImageFromActiveColor = (imgUrl: string) => {
    if (!imgUrl) return;
    setIsDirty(true);
    // Permanently remove from local uploaded image library and unassigned buffer as well
    removeFromLibrary(imgUrl);
    setUnassignedGalleryImages((prev) => {
      const remaining = prev.filter((img) => img !== imgUrl);
      setUnassignedPrimaryImage((curr) => (curr === imgUrl ? remaining[0] || '' : curr));
      return remaining;
    });

    if (colors.length > 0) {
      setColors((prev) =>
        prev.map((col, idx) => {
          if (idx !== activeColorIndex) return col;
          const remaining = (col.galleryImages || []).filter((img) => img !== imgUrl);
          return {
            ...col,
            galleryImages: remaining,
            primaryImage:
              col.primaryImage === imgUrl
                ? remaining[0] || ''
                : col.primaryImage,
          };
        })
      );
    }
    showToast('Photo permanently deleted');
  };

  // Direct native File Upload Handler
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const persistedUrl = await uploadImageFile(file);
        if (persistedUrl) {
          uploadedUrls.push(persistedUrl);
          saveToLibrary(persistedUrl, file.name.replace(/\.[^/.]+$/, ''));
        }
      }

      if (uploadedUrls.length > 0) {
        setIsDirty(true);
        if (colors.length === 0) {
          setUnassignedGalleryImages((prev) => {
            const cleanPrev = prev.filter(
              (img) => !isSampleOrEphemeralUrl(img) && !uploadedUrls.includes(img)
            );
            return [...uploadedUrls, ...cleanPrev];
          });
          // Always make the newly uploaded photo the primary cover image
          setUnassignedPrimaryImage(uploadedUrls[0]);
        } else {
          setColors((prev) =>
            prev.map((col, idx) => {
              if (idx !== activeColorIndex) return col;
              const currentGallery = (col.galleryImages || []).filter(
                (img) => !isSampleOrEphemeralUrl(img) && !uploadedUrls.includes(img)
              );
              const combined = [...uploadedUrls, ...currentGallery];
              return {
                ...col,
                galleryImages: combined,
                // Always promote the newly uploaded photo to primaryImage so old placeholders are replaced
                primaryImage: uploadedUrls[0] || combined[0] || '',
              };
            })
          );
        }
        showToast(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded & set as main cover!`);
      }
    } catch (err) {
      console.error('Failed to upload images:', err);
      showToast('Error uploading photos. Please retry.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Form Save Execution
  const executeSave = (isDraft: boolean) => {
    if (isSaving) return;
    const validationErrors: Record<string, string> = {};

    const hasAnyPhoto =
      Boolean(unassignedPrimaryImage) ||
      unassignedGalleryImages.length > 0 ||
      colors.some((c) => c.primaryImage || (c.galleryImages && c.galleryImages.length > 0));

    if (!isDraft) {
      if (!name.trim()) {
        validationErrors.name = 'Product Name is required.';
      }
      if (!category.trim()) {
        validationErrors.category = 'Please select a Category.';
      }
      if (numericBasePrice <= 0) {
        validationErrors.basePrice = 'Please provide a valid Selling Price.';
      }
      if (numericMrp < numericBasePrice) {
        validationErrors.mrp = 'MRP cannot be less than Selling Price.';
      }
      if (!hasAnyPhoto) {
        validationErrors.media = 'Please upload at least one product photo.';
      }
      if (duplicateSkus.length > 0) {
        validationErrors.sku = `SKU already exists: ${duplicateSkus.join(', ')}. Please use unique SKUs.`;
      }

      const hasEmptySku = variants.some((v) => v.active && !v.sku.trim());
      if (hasEmptySku) {
        validationErrors.skuEmpty = 'All active variants must have a valid SKU.';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      showToast(`Validation: ${firstError}`);
      return;
    }

    const candidateCovers = (
      colors.length > 0
        ? [
            activeColor?.primaryImage,
            colors[0]?.primaryImage,
            ...(activeColor?.galleryImages || []),
            ...(colors[0]?.galleryImages || []),
          ]
        : [unassignedPrimaryImage, ...unassignedGalleryImages]
    ).filter(Boolean) as string[];

    // Prefer a real uploaded image (data:image/ or non-Unsplash URL) over any sample placeholder
    const mainCover =
      candidateCovers.find((u) => !isSampleOrEphemeralUrl(u)) ||
      candidateCovers[0] ||
      '';

    const effectiveParentSku =
      parentSku.trim() ||
      buildStructuredParentSku(
        category,
        typeStyle || kurtiType,
        subcategory,
        name,
        colors[0]?.code || 'STD',
        skuSequence
      );

    const typedTotalStock = Math.max(0, parseInt(totalStockInput, 10) || 0);
    const effectiveTotalStock = totalStock > 0 ? totalStock : typedTotalStock;

    // Aggregate stock by size
    const stockBySize: Record<string, number> = {};
    const skuBySize: Record<string, string> = {};
    if (variants.length > 0) {
      variants.forEach((v) => {
        if (v.active) {
          stockBySize[v.size] = (stockBySize[v.size] || 0) + (Number(v.stock) || 0);
          skuBySize[v.size] = v.sku.trim();
        }
      });
      // If user typed a Total Stock number but variant rows are still 0, distribute typedTotalStock across sizes
      const sumInMap = Object.values(stockBySize).reduce((a, b) => a + b, 0);
      if (sumInMap === 0 && typedTotalStock > 0) {
        const sizeKeys = Object.keys(stockBySize);
        if (sizeKeys.length > 0) {
          const base = Math.floor(typedTotalStock / sizeKeys.length);
          let rem = typedTotalStock % sizeKeys.length;
          sizeKeys.forEach((sz) => {
            stockBySize[sz] = base + (rem > 0 ? 1 : 0);
            if (rem > 0) rem--;
          });
        }
      }
    } else {
      const targetSizes = selectedSizes.length > 0 ? selectedSizes : ['Free size'];
      const base = Math.floor(effectiveTotalStock / targetSizes.length);
      let rem = effectiveTotalStock % targetSizes.length;
      targetSizes.forEach((sz) => {
        stockBySize[sz] = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        skuBySize[sz] = generateSku(effectiveParentSku, 'STD', sz === 'Free size' ? 'FS' : sz);
      });
    }

    // Build colorOptions compatible with StoreContext
    const colorOptionsData: ColorVariant[] =
      colors.length > 0
        ? colors.map((c) => {
            const colorVariants = variants.filter(
              (v) => v.colorId === c.id || v.colorName.toLowerCase() === c.name.toLowerCase()
            );
            const stockMap: Record<string, number> = {};
            const skuMap: Record<string, string> = {};
            const priceMap: Record<string, number> = {};

            colorVariants.forEach((v) => {
              stockMap[v.size] = Number(v.stock) || 0;
              skuMap[v.size] = v.sku.trim();
              if (v.priceOverride && !isNaN(Number(v.priceOverride))) {
                priceMap[v.size] = Number(v.priceOverride);
              }
            });

            if (Object.keys(stockMap).length === 0) {
              Object.assign(stockMap, stockBySize);
            }

            const rawColorImgs = [
              c.primaryImage,
              ...(c.galleryImages || []),
            ].filter(Boolean) as string[];
            const hasRealColorImg = rawColorImgs.some((u) => !isSampleOrEphemeralUrl(u));
            const filteredColorImgs = hasRealColorImg
              ? rawColorImgs.filter((u) => !isSampleOrEphemeralUrl(u))
              : rawColorImgs;
            const primaryColorImg = filteredColorImgs[0] || mainCover;
            const orderedColorGallery = Array.from(
              new Set([primaryColorImg, ...filteredColorImgs].filter(Boolean))
            );

            return {
              name: c.name,
              hex: c.hex,
              image: primaryColorImg,
              images: orderedColorGallery.length > 0 ? orderedColorGallery : mainCover ? [mainCover] : [],
              stockBySize: stockMap,
              skuBySize: skuMap,
              priceBySize: priceMap,
              price: numericBasePrice,
              mrp: numericMrp,
              code: c.code,
            } as any;
          })
        : [];

    const inactiveRowKeys = variants.filter((v) => !v.active).map((v) => v.key);

    const allRawProductImages = Array.from(
      new Set(
        (colors.length > 0
          ? [mainCover, ...colors.flatMap((c) => [c.primaryImage, ...(c.galleryImages || [])])]
          : [mainCover, ...unassignedGalleryImages]
        ).filter(Boolean)
      )
    );
    const hasRealProductImg = allRawProductImages.some((u) => !isSampleOrEphemeralUrl(u));
    const finalProductImages = hasRealProductImg
      ? allRawProductImages.filter((u) => !isSampleOrEphemeralUrl(u))
      : allRawProductImages;

    const productPayload: Partial<Product> = {
      name: name.trim() || 'Untitled Product',
      slug: urlSlug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: brand.trim() || 'REDMODE',
      sku: effectiveParentSku,
      price: numericBasePrice,
      mrp: numericMrp,
      category: category.trim(),
      subcategory: subcategory.trim(),
      subSubcategory: subSubcategory.trim(),
      kurtiType: kurtiType.trim(),
      typeStyle: typeStyle.trim() || kurtiType.trim(),
      gender: gender,
      color: colors[0]?.name || '',
      colorOptions: colorOptionsData,
      sizes: selectedSizes.length > 0 ? selectedSizes : ['Free size'],
      defaultSize: selectedSizes.length > 0 ? selectedSizes[0] : 'Free size',
      stockBySize,
      skuBySize,
      inactiveRowKeys,
      inStock: effectiveTotalStock > 0,
      mainImage: finalProductImages[0] || mainCover,
      images: finalProductImages,
      description: description.trim(),
      highlights: highlights.filter((h) => h.trim().length > 0),
      offerTag: offerTag.trim() || (discountPercent > 0 ? `${discountPercent}% OFF` : ''),
      gstRate: Number(gstRate) || 5,
      costPrice: costPrice ? Number(costPrice) : undefined,
      published: !isDraft,
      featured: isFeatured,
      newArrival: isNewArrival,
      isNewArrival: isNewArrival,
      isNewLaunch: isNewArrival,
      bestseller: isBestseller,
      isBestseller: isBestseller,
      trending: isTrending,
      isFestive: isFestive,
      material: material.trim(),
      fit: fit.trim(),
      deliveryInfo: dispatchTime.trim(),
      returnPolicy: returnWindow.trim(),
      barcode: barcode.trim(),
      hsnCode: hsnCode.trim(),
      seo: {
        title: seoTitle.trim() || name.trim(),
        metaDescription: metaDescription.trim() || description.trim().slice(0, 160),
        keywords: `${category}, ${subcategory}, ${kurtiType || ''}, ${typeStyle || ''}, RedMode clothing`,
        urlSlug: urlSlug.trim(),
        imageAlt: name.trim(),
      },
      rating: initialProduct?.rating || 4.8,
      reviewCount: initialProduct?.reviewCount || 12,
    } as any;

    setIsSaving(true);
    try {
      onSave(productPayload);
    } finally {
      setTimeout(() => setIsSaving(false), 600);
    }
  };

  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase() || c.slug === category.toLowerCase()
  );

  const activeSubcategoryObj = useMemo(() => {
    if (!activeCategoryObj || !Array.isArray(activeCategoryObj.subcategories)) return null;
    return activeCategoryObj.subcategories.find((s) => {
      const sName = typeof s === 'string' ? s : s.name;
      const sSlug = typeof s === 'string' ? s : s.slug;
      return (
        sName?.toLowerCase() === subcategory?.toLowerCase() ||
        sSlug?.toLowerCase() === subcategory?.toLowerCase()
      );
    });
  }, [activeCategoryObj, subcategory]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* STICKY TOP PAGE HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back Link & Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Products</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-700" />
              <span>{isEditing ? `Edit Product` : 'Add New Product'}</span>
            </h1>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => executeSave(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition shadow-2xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => executeSave(false)}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? 'Saving Product...' : isEditing ? 'Save Changes' : 'Save Product'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8">
        {/* DUPLICATE SKU ERROR BANNER */}
        {duplicateSkus.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Duplicate SKU Alert: </span>
              SKU already exists ({duplicateSkus.join(', ')}). Please use a unique SKU for each variant before publishing.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: MAIN CONTENT (~67% width) */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. GENERAL INFORMATION CARD */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">General Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Basic product identity, styling attributes, and size matrix.
                </p>
              </div>

              {/* Product Name + Minimal Fancy Product Name Suggestions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Name Product <span className="text-rose-500">*</span>
                  </label>
                  {errors.name && <span className="text-[11px] text-rose-500 font-medium">{errors.name}</span>}
                </div>
                <input
                  type="text"
                  placeholder="Enter product name..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-normal text-slate-900 bg-slate-50 border ${
                    errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:bg-white'
                  } focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition`}
                />
              </div>

              {/* Description (Completely empty by default for new products) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Description Product</label>
                <textarea
                  rows={4}
                  placeholder="Write product description, fabric feel, styling notes, and care instructions..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-4 py-3 rounded-xl text-xs font-normal text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition leading-relaxed resize-y"
                />
              </div>

              {/* Bullet Points / Key Highlights (Customer-facing feature bullets) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-bold text-slate-800">
                      Product Highlights (Bullet Points)
                    </label>
                    {highlights.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {highlights.length} Added
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Shown to customers on product page</span>
                    {highlights.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setHighlights([]);
                          setIsDirty(true);
                        }}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick-Select Bullet Point Suggestions */}
                <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Click to add/remove quick bullet points:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedBulletPoints.map((presetBullet) => {
                      const isAdded = highlights.some(
                        (h) => h.trim().toLowerCase() === presetBullet.toLowerCase()
                      );
                      return (
                        <button
                          key={presetBullet}
                          type="button"
                          onClick={() => handleToggleBulletPreset(presetBullet)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition inline-flex items-center gap-1.5 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isAdded ? (
                            <Check className="w-3 h-3 text-white shrink-0" />
                          ) : (
                            <Plus className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                          <span>{presetBullet}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Existing Added Bullets List */}
                {highlights.length > 0 && (
                  <div className="space-y-2 pt-0.5">
                    {highlights.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2 group">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                          placeholder={`Bullet point #${idx + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remove bullet point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Custom Bullet Field */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBulletInput}
                    onChange={(e) => setNewBulletInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHighlight();
                      }
                    }}
                    placeholder="Type a custom bullet point (e.g. Premium Quality Fabric) and click Add Bullet..."
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs text-slate-900 bg-white border border-slate-200 focus:border-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bullet</span>
                  </button>
                </div>
              </div>

              {/* Size and Gender Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Size Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Size</label>
                      <p className="text-[11px] text-slate-400">Pick Available Size (Click to toggle)</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {DEFAULT_SIZES.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleToggleSize(sz)}
                          className={`w-11 h-10 rounded-xl text-xs font-semibold border flex items-center justify-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-400 text-slate-950 font-bold border-emerald-500 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}

                    {/* Custom Size Pills if added */}
                    {selectedSizes
                      .filter((s) => !DEFAULT_SIZES.includes(s))
                      .map((customSz) => (
                        <button
                          key={customSz}
                          type="button"
                          onClick={() => handleToggleSize(customSz)}
                          className="px-3 h-10 rounded-xl text-xs font-bold border flex items-center gap-1.5 bg-emerald-400 text-slate-950 border-emerald-500 shadow-2xs"
                        >
                          <span>{customSz}</span>
                          <X className="w-3 h-3 text-slate-800" />
                        </button>
                      ))}

                    {/* + Add Size button */}
                    {showAddSizeInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="e.g. 4XL"
                          value={customSizeInput}
                          onChange={(e) => setCustomSizeInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSize()}
                          className="w-14 h-10 px-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-900 outline-none text-center"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomSize}
                          className="w-8 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddSizeInput(true)}
                        className="w-10 h-10 rounded-xl text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                        title="Add custom size"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Gender / Target Group */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Gender</label>
                    <p className="text-[11px] text-slate-400">Pick Available Gender</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {['Men', 'Woman', 'Unisex'].map((g) => {
                      const isSelected = gender === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setGender(isSelected ? '' : g);
                            setIsDirty(true);
                          }}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition cursor-pointer ${
                            isSelected
                              ? 'bg-white border-emerald-500 text-slate-900 shadow-2xs ring-1 ring-emerald-500/30'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <span>{g}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Brand & Parent SKU Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. REDMODE"
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Parent SKU (Auto-Generated)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newSeq = String(Math.floor(1000 + Math.random() * 9000));
                        const primaryColCode = colors[0]?.code || (colors[0]?.name ? getAutoColorCode(colors[0].name) : 'CLR');
                        const newSku = buildStructuredParentSku(
                          category,
                          typeStyle || kurtiType,
                          subcategory,
                          name,
                          primaryColCode,
                          newSeq
                        );
                        setParentSku(newSku);
                        setIsSkuManuallyEdited(false);
                        setIsDirty(true);
                      }}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      Auto-Generate SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    value={parentSku}
                    onChange={(e) => {
                      setParentSku(e.target.value.toUpperCase());
                      setIsSkuManuallyEdited(true);
                      setIsDirty(true);
                    }}
                    placeholder="Auto-generates as you enter product details..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* 2. PRICING AND STOCK CARD */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pricing And Stock</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selling price, listing MRP, automatic discount rate, and aggregate inventory.
                  </p>
                </div>
                {discountPercent > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Base Pricing */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Base Pricing (Selling Price) <span className="text-rose-500">*</span>
                    </label>
                    {errors.basePrice && <span className="text-[11px] text-rose-500">{errors.basePrice}</span>}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="Enter selling price"
                      value={basePrice}
                      onChange={(e) => {
                        setBasePrice(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Total Stock */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Total Stock</label>
                    <span className="text-[11px] text-emerald-600 font-medium">All Variants Combined</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter total stock"
                      value={totalStockInput}
                      onFocus={() => {
                        isTotalStockFocused.current = true;
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setTotalStockInput(raw);
                        if (raw === '') {
                          applyTotalStockDistribution(0);
                        } else {
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed)) {
                            applyTotalStockDistribution(parsed);
                          }
                        }
                      }}
                      onBlur={() => {
                        isTotalStockFocused.current = false;
                        if (variants.length > 0) {
                          setTotalStockInput(totalStock > 0 ? String(totalStock) : totalStockInput);
                        }
                      }}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                      title="Total aggregated stock across all variants. You can type any number directly here or edit individual sizes in the table below."
                    />
                    <Package className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* MRP / Listing Price */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      MRP (Listing Price) <span className="text-rose-500">*</span>
                    </label>
                    {errors.mrp && <span className="text-[11px] text-rose-500">{errors.mrp}</span>}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="Enter MRP"
                      value={mrp}
                      onChange={(e) => {
                        setMrp(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Discount Percentage (Auto-Calculated) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Discount</label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span>{discountPercent > 0 ? `${discountPercent}%` : '0%'}</span>
                    <span className="text-[11px] font-normal text-slate-400">Computed from MRP vs Base Price</span>
                  </div>
                </div>

                {/* Cost Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Cost Price (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="Enter cost price"
                      value={costPrice}
                      onChange={(e) => {
                        setCostPrice(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs font-normal text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* GST Rate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">GST Rate</label>
                  <select
                    value={gstRate}
                    onChange={(e) => {
                      setGstRate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none cursor-pointer"
                  >
                    <option value="5">5% (Standard Apparel & Garments)</option>
                    <option value="12">12% (Premium Apparel & Accessories)</option>
                    <option value="18">18% (Luxury & Fabric Goods)</option>
                    <option value="0">0% (Tax Exempt)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 3. CLOTHING VARIANTS & SKU MANAGEMENT CARD */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Clothing Variants & SKUs</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Colors & Sizes automatically generate unique combinations with independent SKUs and stock.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateAllSkus}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1.5 cursor-pointer"
                  title="Auto-regenerate unique SKUs for all variants based on Parent SKU"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate SKUs</span>
                </button>
              </div>

              {/* Color Management Section */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-600" />
                      Available Colors &amp; Variations
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select a base colour and fancy shade, or add custom colour variations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      {colors.length} color{colors.length !== 1 ? 's' : ''} configured
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenAddColor}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add Color Variation</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Colour Family & Fancy Colour Name Selector */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-emerald-600" />
                        <span>1. Select Product Base Colour:</span>
                      </span>
                      {selectedBaseColorFamily ? (
                        <button
                          type="button"
                          onClick={() => setSelectedBaseColorFamily('')}
                          className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Choose a base colour to view fancy shades
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {BASE_COLORS.map((base) => {
                        const isSelectedFamily =
                          selectedBaseColorFamily.toLowerCase() === base.name.toLowerCase();
                        return (
                          <button
                            key={base.id}
                            type="button"
                            onClick={() =>
                              setSelectedBaseColorFamily(isSelectedFamily ? '' : base.name)
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                              isSelectedFamily
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs ring-2 ring-slate-900/15'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: base.sampleHex }}
                            />
                            <span>{base.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedBaseColorFamily && dynamicFancyColorSuggestions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>2. Fancy {selectedBaseColorFamily} Shades:</span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Click a shade to add or select variation
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dynamicFancyColorSuggestions.map((preset) => {
                          const isCurrentlyActive =
                            activeColor?.name.toLowerCase() === preset.name.toLowerCase();
                          const alreadyAdded = colors.some(
                            (c) => c.name.toLowerCase() === preset.name.toLowerCase()
                          );

                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setIsDirty(true);
                                if (alreadyAdded) {
                                  const foundIdx = colors.findIndex(
                                    (c) => c.name.toLowerCase() === preset.name.toLowerCase()
                                  );
                                  if (foundIdx >= 0) {
                                    setActiveColorIndex(foundIdx);
                                    showToast(`Selected "${preset.name}"`);
                                  }
                                  return;
                                }
                                const inheritedPrimary =
                                  colors.length === 0
                                    ? unassignedPrimaryImage
                                    : activeColor?.primaryImage || '';
                                const inheritedGallery =
                                  colors.length === 0
                                    ? unassignedGalleryImages
                                    : activeColor?.primaryImage
                                    ? [activeColor.primaryImage]
                                    : [];
                                const newCol: ColorDef = {
                                  id: `col-${Date.now()}`,
                                  name: preset.name,
                                  baseColor: selectedBaseColorFamily,
                                  hex: preset.hex,
                                  code: preset.code,
                                  primaryImage: inheritedPrimary,
                                  galleryImages: inheritedGallery,
                                };
                                setColors((prev) => [...prev, newCol]);
                                setActiveColorIndex(colors.length);
                                showToast(`Added colour "${preset.name}" (${preset.code})`);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                                isCurrentlyActive
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs ring-2 ring-emerald-500/30'
                                  : alreadyAdded
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: preset.hex }}
                              />
                              <span>{preset.name}</span>
                              {isCurrentlyActive ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : alreadyAdded ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {colors.map((col, idx) => {
                    const isActiveColor = activeColorIndex === idx;
                    const colVariants = variants.filter(
                      (v) => v.colorId === col.id || v.colorName.toLowerCase() === col.name.toLowerCase()
                    );
                    const activeCount = colVariants.filter((v) => v.active).length;
                    const colStock = colVariants.reduce(
                      (sum, v) => (v.active ? sum + (Number(v.stock) || 0) : sum),
                      0
                    );

                    return (
                      <div
                        key={col.id}
                        onClick={() => setActiveColorIndex(idx)}
                        className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isActiveColor
                            ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Top Row: Swatch, Name & Code */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-2xs"
                                style={{ backgroundColor: col.hex }}
                              />
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {col.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                              {col.code}
                            </span>
                          </div>

                          {/* Middle Row: Base color, HEX, Variants stock */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                            <span className="truncate">
                              {col.baseColor ? `${col.baseColor} · ` : ''}{col.hex}
                            </span>
                            <span className="font-medium text-slate-600 shrink-0">
                              {colStock} in stock ({activeCount} sizes)
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Selected Status and Action Controls */}
                        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/80">
                          <span
                            className={`text-[10px] font-semibold flex items-center gap-1 ${
                              isActiveColor ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {isActiveColor ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active media color
                              </>
                            ) : (
                              'Click to view & edit media'
                            )}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditColor(col);
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
                              title="Edit Color Details & Swatch"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromptDeleteColor(col);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Color"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Color Card */}
                  <button
                    type="button"
                    onClick={handleOpenAddColor}
                    className="p-3.5 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/70 transition-all flex flex-col items-center justify-center gap-1.5 text-center min-h-[105px] cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Add New Color</span>
                    <span className="text-[10px] text-slate-400">Pick base &amp; fancy shade</span>
                  </button>
                </div>
              </div>

              {/* Scannable Variant Table */}
              {variants.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>
                        Generated Variants ({variants.filter((v) => v.active).length} Active of {variants.length})
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {selectedSizes.length > 0
                          ? `(${colors.length} Color${colors.length !== 1 ? 's' : ''} × ${selectedSizes.length} Sizes)`
                          : `(${colors.length} Color${colors.length !== 1 ? 's' : ''} · Free size)`}
                      </span>
                    </div>

                    {/* Quick Fill Stock buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-normal text-slate-500">Quick Fill Stock:</span>
                      {[10, 25, 50, 100].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => handleApplyBulkStock(qty)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          <th className="py-2.5 px-3">Color</th>
                          <th className="py-2.5 px-3">Size</th>
                          <th className="py-2.5 px-3">
                            Unique SKU <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3">
                            Stock <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3">Price Override</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {variants.map((v) => {
                          const isDup = duplicateSkus.includes(v.sku.trim().toUpperCase());
                          return (
                            <tr
                              key={v.key}
                              className={`transition hover:bg-slate-50/70 ${!v.active ? 'opacity-40 bg-slate-50/50' : ''}`}
                            >
                              {/* Color */}
                              <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                                    style={{ backgroundColor: v.colorHex }}
                                  />
                                  <span>{v.colorName}</span>
                                </div>
                              </td>

                              {/* Size */}
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {v.size === 'Free size' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] italic font-medium">
                                    Free size
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] border border-slate-200">
                                    {v.size}
                                  </span>
                                )}
                              </td>

                              {/* SKU */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) => updateVariant(v.key, 'sku', e.target.value.toUpperCase())}
                                  disabled={!v.active}
                                  className={`w-40 sm:w-48 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                                    isDup
                                      ? 'border-rose-400 bg-rose-50 text-rose-700'
                                      : 'border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:border-slate-900'
                                  } outline-none`}
                                />
                              </td>

                              {/* Stock */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={String(v.stock ?? 0)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    const num = raw === '' ? 0 : parseInt(raw, 10);
                                    updateVariant(v.key, 'stock', isNaN(num) ? 0 : Math.max(0, num));
                                  }}
                                  disabled={!v.active}
                                  className="w-20 px-2 py-1 rounded-lg text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none text-center"
                                />
                              </td>

                              {/* Price Override */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  placeholder={numericBasePrice ? `₹${numericBasePrice}` : 'Default'}
                                  value={v.priceOverride}
                                  onChange={(e) => updateVariant(v.key, 'priceOverride', e.target.value)}
                                  disabled={!v.active}
                                  className="w-24 px-2 py-1 rounded-lg text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none placeholder:text-slate-400"
                                />
                              </td>

                              {/* Status */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => updateVariant(v.key, 'active', !v.active)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                                    v.active
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  {v.active ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Select a colour variation and available sizes above to generate variant SKUs and stock rows.
                </div>
              )}
            </section>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: MEDIA, CATEGORY, STOREFRONT (~33% width) */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. PRODUCT MEDIA CARD (Clean, uncluttered photo upload) */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Product Photos</h2>
              </div>

              {/* Color Switcher if multiple colors exist */}
              {colors.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {colors.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveColorIndex(i)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 cursor-pointer ${
                        activeColorIndex === i
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                      <span className="text-[10px] opacity-70">({c.galleryImages?.length || 0})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Large Image Area / Simple File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative aspect-square w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-400 overflow-hidden flex items-center justify-center group cursor-pointer transition"
                title="Click to upload photos"
              >
                {currentPrimaryImage ? (
                  <>
                    <img
                      src={currentPrimaryImage}
                      alt={name || 'Product Image'}
                      className="w-full h-full object-cover object-center"
                    />
                    {/* Direct Delete Cover Photo button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageFromActiveColor(currentPrimaryImage);
                      }}
                      className="absolute top-2.5 right-2.5 z-10 p-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white shadow-md transition cursor-pointer"
                      title="Permanently Delete Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* Subtle hover overlay only when image exists */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-md">
                        Change Cover Photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                      <Upload className="w-5 h-5 stroke-2" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Add Photos</p>
                    <p className="text-[11px] text-slate-400 mt-1">Select from computer or phone</p>
                  </div>
                )}

                {isUploadingImage && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10">
                    <span className="text-xs font-bold text-slate-900 animate-pulse">Uploading...</span>
                  </div>
                )}
              </div>

              {/* Thumbnails Row: [img][img][ + ] */}
              {currentGalleryImages.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {currentGalleryImages.length}{' '}
                      {currentGalleryImages.length === 1 ? 'photo' : 'photos'}
                    </span>
                    <span className="text-emerald-600 font-medium">Click photo to set as cover</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {currentGalleryImages.map((imgUrl, thumbIdx) => {
                      const isMain = currentPrimaryImage === imgUrl;
                      return (
                        <div
                          key={thumbIdx}
                          className={`relative group/thumb w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                            isMain
                              ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                          onClick={() => setPrimaryImageForActiveColor(imgUrl)}
                        >
                          <img
                            src={imgUrl}
                            alt={`Thumbnail ${thumbIdx + 1}`}
                            className="w-full h-full object-cover object-center"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImageFromActiveColor(imgUrl);
                            }}
                            className="absolute top-0.5 right-0.5 p-1 rounded-md bg-black/70 text-white hover:bg-rose-600 opacity-0 group-hover/thumb:opacity-100 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                          {isMain && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-bold text-center py-0.5 leading-none">
                              COVER
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-600 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                      title="Add more photos"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 2. CATEGORY CARD */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Category &amp; Classification</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select where this product will display on website navigation and filters.
                  </p>
                </div>
                <Tag className="w-4 h-4 text-slate-400" />
              </div>

              {/* 1. Product Category Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    1. Product Category <span className="text-rose-500">*</span>
                  </label>
                  {errors.category && <span className="text-[11px] text-rose-500">{errors.category}</span>}
                </div>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      setSubcategory('');
                      setSubSubcategory('');
                      setKurtiType('');
                      setTypeStyle('');
                      setIsDirty(true);
                      if (errors.category && newCat) {
                        setErrors((prev) => ({ ...prev, category: '' }));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none appearance-none cursor-pointer pr-10"
                  >
                    <option value="">-- Select Product Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {![
                      'shirt',
                      't-shirt',
                      'gym lower',
                    ].every((extra) =>
                      categories.some((c) => c.name.toLowerCase() === extra)
                    ) && (
                      <>
                        {!categories.some((c) => c.name.toLowerCase() === 'shirt') && (
                          <option value="Shirt">Shirt</option>
                        )}
                        {!categories.some((c) => c.name.toLowerCase() === 't-shirt') && (
                          <option value="T-Shirt">T-Shirt</option>
                        )}
                        {!categories.some((c) => c.name.toLowerCase() === 'gym lower') && (
                          <option value="Gym Lower">Gym Lower</option>
                        )}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 2. Subcategory Dropdown (Never auto-selected or overwritten by Product Type) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">2. Subcategory</label>
                <div className="relative">
                  {activeCategoryObj?.subcategories && activeCategoryObj.subcategories.length > 0 ? (
                    <select
                      value={subcategory}
                      onChange={(e) => {
                        setSubcategory(e.target.value);
                        setSubSubcategory('');
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none appearance-none cursor-pointer pr-10"
                    >
                      <option value="">-- Select Subcategory --</option>
                      {!activeCategoryObj.subcategories.some(
                        (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === category.toLowerCase()
                      ) &&
                        category && <option value={category}>{category}</option>}
                      {activeCategoryObj.subcategories.map((sub) => {
                        const subId = typeof sub === 'string' ? sub : sub.id || sub.slug || sub.name;
                        const subName = typeof sub === 'string' ? sub : sub.name;
                        return (
                          <option key={subId} value={subName}>
                            {subName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={category ? `e.g. ${category}, Printed ${category}` : 'Select a category first or type subcategory'}
                      value={subcategory}
                      onChange={(e) => {
                        setSubcategory(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white outline-none"
                    />
                  )}
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Sub-Subcategory (Variety / Child Style) Dropdown if configured */}
              {activeSubcategoryObj &&
                typeof activeSubcategoryObj !== 'string' &&
                activeSubcategoryObj.subcategories &&
                activeSubcategoryObj.subcategories.length > 0 && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">Sub-Subcategory (Optional)</label>
                    </div>
                    <div className="relative">
                      <select
                        value={subSubcategory}
                        onChange={(e) => {
                          setSubSubcategory(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none appearance-none cursor-pointer pr-10"
                      >
                        <option value="">-- Select Sub-Subcategory (Optional) --</option>
                        {activeSubcategoryObj.subcategories.map((child: any) => {
                          const childId = typeof child === 'string' ? child : child.id || child.slug || child.name;
                          const childName = typeof child === 'string' ? child : child.name;
                          return (
                            <option key={childId} value={childName}>
                              {childName}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

              {/* 3. Independent Product Type Selector (Hierarchy: Category -> Subcategory -> Product Type) */}
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    3. Product Type
                  </label>
                  {(kurtiType || typeStyle) && (
                    <button
                      type="button"
                      onClick={() => {
                        setKurtiType('');
                        setTypeStyle('');
                        setIsDirty(true);
                      }}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Clear Type
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(() => {
                    const lowerCat = category.toLowerCase();
                    if (lowerCat.includes('trouser') || lowerCat.includes('bottom') || lowerCat.includes('lower')) {
                      if (lowerCat.includes('gym')) {
                        return ['Track Pant', 'Sports Jogger', 'Compression Lower', 'Relaxed Fit Lower'];
                      }
                      return ['Straight Fit', 'Regular Fit', 'Flared Palazzo', 'Cigarette Pant'];
                    }
                    if (lowerCat.includes('set')) {
                      return ['2-Piece Kurti Set', '3-Piece Kurti Set', 'Anarkali Suit Set', 'Festive Kurti Set'];
                    }
                    if (lowerCat.includes('jewel')) {
                      return ['Earrings & Jhumkas', 'Necklace Set', 'Bangles & Kada', 'Statement Rings'];
                    }
                    if (lowerCat.includes('t-shirt') || lowerCat.includes('tshirt')) {
                      return ['Oversized T-Shirt', 'Regular Fit T-Shirt', 'Polo T-Shirt', 'Crop T-Shirt'];
                    }
                    if (lowerCat.includes('shirt')) {
                      return ['Half Sleeve Shirt', 'Full Sleeve Shirt', 'Casual Shirt', 'Formal Shirt'];
                    }
                    return ['Short Kurti', 'Long Kurti', 'Anarkali Kurti', 'Regular Straight Kurti'];
                  })().map((styleOption) => {
                    const currentType = kurtiType || typeStyle;
                    const isSelected = currentType === styleOption;
                    return (
                      <button
                        key={styleOption}
                        type="button"
                        onClick={() => {
                          const nextVal = isSelected ? '' : styleOption;
                          setKurtiType(nextVal);
                          setTypeStyle(nextVal);
                          setIsDirty(true);
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border text-center ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-black'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <span className="truncate">{styleOption}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={kurtiType || typeStyle}
                  onChange={(e) => {
                    setKurtiType(e.target.value);
                    setTypeStyle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Or type custom Product Type (e.g. Short Kurti, Half Sleeve Shirt)..."
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {/* Add Category Button */}
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition text-center cursor-pointer shadow-2xs"
              >
                + Add Category
              </button>
            </section>

            {/* 3. STOREFRONT SETTINGS */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Storefront</h2>
                <Sparkles className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Featured on Home', state: isFeatured, setter: setIsFeatured },
                  { label: 'New Arrival', state: isNewArrival, setter: setIsNewArrival },
                  { label: 'Bestseller Badge', state: isBestseller, setter: setIsBestseller },
                  { label: 'Trending', state: isTrending, setter: setIsTrending },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition cursor-pointer text-xs font-medium text-slate-700"
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => {
                        item.setter(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* Special Offer Ribbon */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-slate-700">Special Offer Ribbon</label>
                <input
                  type="text"
                  placeholder="e.g. 42% OFF, FESTIVE DEAL"
                  value={offerTag}
                  onChange={(e) => {
                    setOfferTag(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white outline-none"
                />
              </div>
            </section>

            {/* 4. PRODUCT STATUS / COMPLETION CARD */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product Status</h2>
                <span className="text-[11px] font-semibold text-slate-500">
                  {completionStats.completed} of {completionStats.total} Completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(completionStats.completed / completionStats.total) * 100}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="space-y-1.5 pt-1 text-xs">
                {completionStats.checks.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          item.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {item.valid ? '✓' : '○'}
                      </span>
                      <span>{item.name}</span>
                    </span>
                    <span className={`text-[10px] font-medium ${item.valid ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {item.valid ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. COLLAPSIBLE ACCORDIONS (Shipping, SEO, Advanced) */}
            <div className="space-y-3">
              {/* Shipping & Returns */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsShippingOpen(!isShippingOpen)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-500" />
                    <span>Shipping & Returns</span>
                  </span>
                  {isShippingOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isShippingOpen && (
                  <div className="p-5 pt-0 space-y-3 border-t border-slate-100 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Dispatch Time</label>
                      <input
                        type="text"
                        placeholder="e.g. Dispatched within 24–48 hours"
                        value={dispatchTime}
                        onChange={(e) => {
                          setDispatchTime(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Return Policy</label>
                      <input
                        type="text"
                        placeholder="e.g. 7-Day Easy Exchange & Returns"
                        value={returnWindow}
                        onChange={(e) => {
                          setReturnWindow(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={isCodAvailable}
                        onChange={(e) => {
                          setIsCodAvailable(e.target.checked);
                          setIsDirty(true);
                        }}
                        className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-500"
                      />
                      <span>Cash on Delivery (COD) Available</span>
                    </label>
                  </div>
                )}
              </div>

              {/* SEO & Search */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsSeoOpen(!isSeoOpen)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-slate-500" />
                    <span>SEO & Search</span>
                  </span>
                  {isSeoOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isSeoOpen && (
                  <div className="p-5 pt-0 space-y-3 border-t border-slate-100 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">SEO Title</label>
                      <input
                        type="text"
                        placeholder={name || 'Product Title'}
                        value={seoTitle}
                        onChange={(e) => {
                          setSeoTitle(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">URL Slug</label>
                      <input
                        type="text"
                        value={urlSlug}
                        onChange={(e) => {
                          setUrlSlug(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Meta Description</label>
                      <textarea
                        rows={2}
                        value={metaDescription}
                        onChange={(e) => {
                          setMetaDescription(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Brief summary for Google search engines..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Attributes */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span>Advanced Details</span>
                  </span>
                  {isAdvancedOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isAdvancedOpen && (
                  <div className="p-5 pt-0 space-y-3 border-t border-slate-100 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Material / Fabric</label>
                        <input
                          type="text"
                          placeholder="e.g. 100% Pure Cotton"
                          value={material}
                          onChange={(e) => {
                            setMaterial(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Fit Type</label>
                        <input
                          type="text"
                          placeholder="e.g. Regular Fit"
                          value={fit}
                          onChange={(e) => {
                            setFit(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Barcode / EAN</label>
                        <input
                          type="text"
                          placeholder="e.g. 8901234567890"
                          value={barcode}
                          onChange={(e) => {
                            setBarcode(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">HSN Code</label>
                        <input
                          type="text"
                          placeholder="e.g. 6204"
                          value={hsnCode}
                          onChange={(e) => {
                            setHsnCode(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>



      {/* ========================================================= */}
      {/* MODAL: ADD CATEGORY */}
      {/* ========================================================= */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Category</h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Co-ord Set"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Subcategory (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Printed Co-ords"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCategoryName.trim()) return;
                  setCategory(newCategoryName.trim());
                  if (newSubcategoryName.trim()) {
                    setSubcategory(newSubcategoryName.trim());
                  }
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                  setNewSubcategoryName('');
                  setIsDirty(true);
                  showToast('Category selected');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
              >
                Set Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UNSAVED CHANGES PROMPT */}
      {/* ========================================================= */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Unsaved Changes</h3>
              <p className="text-xs text-slate-500">
                You have modifications that haven't been saved. What would you like to do?
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  executeSave(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  onCancel();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Leave Without Saving
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: COLOR CREATION & EDITING MODAL */}
      {/* ========================================================= */}
      <ColorEditorModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        onSave={handleSaveColor}
        initialColor={editingColor}
        existingColors={colors}
        sampleImageFallback={activeColor?.primaryImage || ''}
      />

      {/* ========================================================= */}
      {/* MODAL: DELETE COLOR CONFIRMATION MODAL */}
      {/* ========================================================= */}
      <DeleteColorModal
        isOpen={Boolean(colorToDelete)}
        color={colorToDelete}
        activeVariantsCount={
          colorToDelete
            ? variants.filter(
                (v) =>
                  (v.colorId === colorToDelete.id ||
                    v.colorName.toLowerCase() === colorToDelete.name.toLowerCase()) &&
                  v.active
              ).length
            : 0
        }
        totalStockCount={
          colorToDelete
            ? variants
                .filter(
                  (v) =>
                    (v.colorId === colorToDelete.id ||
                      v.colorName.toLowerCase() === colorToDelete.name.toLowerCase()) &&
                    v.active
                )
                .reduce((s, v) => s + (Number(v.stock) || 0), 0)
            : 0
        }
        onCancel={() => setColorToDelete(null)}
        onDeactivate={handleDeactivateColor}
        onPermanentDelete={performDeleteColor}
      />
    </div>
  );
};
