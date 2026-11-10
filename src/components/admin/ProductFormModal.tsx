import React, { useState, useEffect } from 'react';
import { Product, ColorVariant, Category, SizeChartEntry } from '../../types';
import { useStore } from '../../context/StoreContext';
import { uploadImageFile } from '../../utils/imageUpload';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Palette,
  Layers,
  Sparkles,
  Check,
  Upload,
  Copy,
  Ruler,
} from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => void;
  initialProduct?: Product | null;
  initialSelectedColorIndex?: number;
  categories: Category[];
}

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProduct,
  initialSelectedColorIndex = 0,
  categories,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialProduct);

  // Form Fields (Empty state for new products; populated only when editing an existing product)
  const [name, setName] = useState(initialProduct?.name || '');
  const [category, setCategory] = useState(initialProduct?.category || '');
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory || '');
  const [kurtiType, setKurtiType] = useState(initialProduct?.kurtiType || initialProduct?.typeStyle || '');
  const [typeStyle, setTypeStyle] = useState(initialProduct?.typeStyle || initialProduct?.kurtiType || '');
  const [price, setPrice] = useState(initialProduct?.price !== undefined ? String(initialProduct.price) : '');
  const [mrp, setMrp] = useState(initialProduct?.mrp !== undefined ? String(initialProduct.mrp) : '');
  const [gstRate, setGstRate] = useState(initialProduct?.gstRate ? String(initialProduct.gstRate) : '5');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState<boolean>(Boolean(initialProduct?.sku));
  const [skuSeq] = useState<string>(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [material, setMaterial] = useState(initialProduct?.material || '');
  const [fit, setFit] = useState(initialProduct?.fit || '');
  const [pattern, setPattern] = useState(initialProduct?.pattern || '');
  const [offerTag, setOfferTag] = useState(initialProduct?.offerTag || '');
  const [isNewLaunch, setIsNewLaunch] = useState(Boolean(initialProduct?.isNewLaunch || initialProduct?.isNewArrival));
  const [isBestseller, setIsBestseller] = useState(Boolean(initialProduct?.isBestseller));
  const [isFestive, setIsFestive] = useState(Boolean(initialProduct?.isFestive));
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [highlights, setHighlights] = useState<string[]>(() => {
    if (initialProduct?.highlights && Array.isArray(initialProduct.highlights)) {
      return initialProduct.highlights;
    }
    return [];
  });
  const [newBulletInput, setNewBulletInput] = useState<string>('');

  const handleAddHighlight = () => {
    const trimmed = newBulletInput.trim();
    if (!trimmed) return;
    setHighlights((prev) => [...prev, trimmed]);
    setNewBulletInput('');
  };

  const handleUpdateHighlight = (index: number, value: string) => {
    setHighlights((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Main Images list
  const [mainImage, setMainImage] = useState(initialProduct?.mainImage || '');
  const [extraImages, setExtraImages] = useState<string[]>(
    initialProduct?.images && initialProduct.images.length > 0
      ? initialProduct.images.filter((img) => img !== initialProduct.mainImage)
      : []
  );
  const [newExtraImageUrl, setNewExtraImageUrl] = useState('');

  // Selected Sizes & Stock per Size (Unselected by default for new products)
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    initialProduct?.sizes && initialProduct.sizes.length > 0
      ? initialProduct.sizes
      : []
  );
  const [stockBySize, setStockBySize] = useState<Record<string, number>>(
    initialProduct?.stockBySize || {}
  );

  // Color Variations (Empty by default for new products)
  const [primaryColorName, setPrimaryColorName] = useState(initialProduct?.color || '');
  const [colorOptions, setColorOptions] = useState<ColorVariant[]>(() => {
    if (initialProduct?.colorOptions && initialProduct.colorOptions.length > 0) {
      return JSON.parse(JSON.stringify(initialProduct.colorOptions));
    }
    if (initialProduct?.color) {
      return [
        {
          name: initialProduct.color,
          hex: '#dc2626',
          image: initialProduct.mainImage || '',
          images: initialProduct.images || (initialProduct.mainImage ? [initialProduct.mainImage] : []),
          price: initialProduct.price || 0,
          mrp: initialProduct.mrp || 0,
          stockBySize: initialProduct.stockBySize || {},
          description: '',
        },
      ];
    }
    return [];
  });

  const [activeVariantTab, setActiveVariantTab] = useState<number>(initialSelectedColorIndex || 0);

  // Store products for size chart copying
  const { products } = useStore();
  const [selectedCopyProductId, setSelectedCopyProductId] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Per-product custom size chart state
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>(() => {
    if (initialProduct?.sizeChart && initialProduct.sizeChart.length > 0) {
      return JSON.parse(JSON.stringify(initialProduct.sizeChart));
    }
    return [
      { size: 'XS', bust: '34"', waist: '30"', hip: '37"', length: '44"' },
      { size: 'S', bust: '36"', waist: '32"', hip: '39"', length: '44"' },
      { size: 'M', bust: '38"', waist: '34"', hip: '41"', length: '44"' },
      { size: 'L', bust: '40"', waist: '36"', hip: '43"', length: '45"' },
      { size: 'XL', bust: '42"', waist: '38"', hip: '45"', length: '45"' },
      { size: 'XXL', bust: '44"', waist: '40"', hip: '47"', length: '46"' },
    ];
  });

  const handleCopyFromProduct = () => {
    if (!selectedCopyProductId) return;
    const sourceProd = products.find((p) => p.id === selectedCopyProductId);
    if (sourceProd?.sizeChart && sourceProd.sizeChart.length > 0) {
      setSizeChart(JSON.parse(JSON.stringify(sourceProd.sizeChart)));
      setCopyFeedback(`Copied size chart from "${sourceProd.name}"!`);
      setTimeout(() => setCopyFeedback(null), 2500);
    } else {
      setCopyFeedback(`Selected product has standard size chart.`);
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleCopyClipboard = () => {
    try {
      navigator.clipboard?.writeText(JSON.stringify(sizeChart, null, 2));
      setCopyFeedback('Size chart JSON copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch (e) {
      // fallback
    }
  };

  const handleApplyTemplate = (type: 'kurti' | 'anarkali' | 'short' | 'bottom') => {
    if (type === 'kurti') {
      setSizeChart([
        { size: 'XS', bust: '34"', waist: '30"', hip: '37"', length: '44"' },
        { size: 'S', bust: '36"', waist: '32"', hip: '39"', length: '44"' },
        { size: 'M', bust: '38"', waist: '34"', hip: '41"', length: '44"' },
        { size: 'L', bust: '40"', waist: '36"', hip: '43"', length: '45"' },
        { size: 'XL', bust: '42"', waist: '38"', hip: '45"', length: '45"' },
        { size: 'XXL', bust: '44"', waist: '40"', hip: '47"', length: '46"' },
      ]);
    } else if (type === 'anarkali') {
      setSizeChart([
        { size: 'S', bust: '36"', waist: '32"', hip: '42"', length: '48"' },
        { size: 'M', bust: '38"', waist: '34"', hip: '44"', length: '48"' },
        { size: 'L', bust: '40"', waist: '36"', hip: '46"', length: '49"' },
        { size: 'XL', bust: '42"', waist: '38"', hip: '48"', length: '49"' },
        { size: 'XXL', bust: '44"', waist: '40"', hip: '50"', length: '50"' },
      ]);
    } else if (type === 'short') {
      setSizeChart([
        { size: 'XS', bust: '34"', waist: '30"', hip: '36"', length: '30"' },
        { size: 'S', bust: '36"', waist: '32"', hip: '38"', length: '30"' },
        { size: 'M', bust: '38"', waist: '34"', hip: '40"', length: '31"' },
        { size: 'L', bust: '40"', waist: '36"', hip: '42"', length: '31"' },
        { size: 'XL', bust: '42"', waist: '38"', hip: '44"', length: '32"' },
      ]);
    } else {
      setSizeChart([
        { size: 'S', bust: '-', waist: '28-30"', hip: '38"', length: '38"' },
        { size: 'M', bust: '-', waist: '30-32"', hip: '40"', length: '38"' },
        { size: 'L', bust: '-', waist: '32-34"', hip: '42"', length: '39"' },
        { size: 'XL', bust: '-', waist: '34-36"', hip: '44"', length: '39"' },
        { size: 'XXL', bust: '-', waist: '36-38"', hip: '46"', length: '40"' },
      ]);
    }
    setCopyFeedback(`Applied ${type.toUpperCase()} template!`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleUpdateChartRow = (index: number, field: keyof SizeChartEntry, val: string) => {
    setSizeChart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddChartRow = () => {
    setSizeChart((prev) => [
      ...prev,
      { size: '3XL', bust: '46"', waist: '42"', hip: '49"', length: '46"' },
    ]);
  };

  const handleRemoveChartRow = (index: number) => {
    setSizeChart((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    if (typeof initialSelectedColorIndex === 'number' && initialSelectedColorIndex >= 0) {
      setActiveVariantTab(initialSelectedColorIndex);
    }
  }, [initialSelectedColorIndex, initialProduct]);

  // Subcategory list based on selected category
  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase() || c.slug === category.toLowerCase()
  );
  const availableSubcategories = activeCategoryObj?.subcategories || [
    { id: 'sub-long', name: 'Long Kurti', slug: 'long-kurti' },
    { id: 'sub-short', name: 'Short Kurti', slug: 'short-kurti' },
    { id: 'sub-kurti-set', name: 'Kurti Set', slug: 'kurti-set' },
    { id: 'sub-printed', name: 'Printed Kurti', slug: 'printed-kurti' },
    { id: 'sub-embroidered', name: 'Embroidered Kurti', slug: 'embroidered-kurti' },
  ];

  useEffect(() => {
    if (!isEditing && !isSkuManuallyEdited) {
      const hasInput = Boolean(
        name.trim() || category.trim() || subcategory.trim() || kurtiType.trim() || typeStyle.trim() || colorOptions.length > 0
      );
      if (!hasInput) {
        setSku('');
        return;
      }
      const cleanAlpha = (str: string, len: number, fallback: string) => {
        const cleaned = (str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return cleaned.length >= 2 ? cleaned.slice(0, len) : fallback;
      };
      const catPart = cleanAlpha(category, 3, 'PRD');
      const typeSource = typeStyle || kurtiType || subcategory || name;
      const typeWord = (typeSource || '').trim().split(/\s+/)[0] || '';
      const typePart = cleanAlpha(typeWord, 5, 'STD');
      const colorPart = cleanAlpha(colorOptions[0]?.name || primaryColorName, 3, 'CLR');
      setSku(`RM-${catPart}-${typePart}-${colorPart}-${skuSeq}`);
    }
  }, [name, category, subcategory, kurtiType, typeStyle, colorOptions, primaryColorName, isEditing, isSkuManuallyEdited, skuSeq]);

  const toggleSize = (sz: string) => {
    if (selectedSizes.includes(sz)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== sz));
      const nextStock = { ...stockBySize };
      delete nextStock[sz];
      setStockBySize(nextStock);
    } else {
      setSelectedSizes([...selectedSizes, sz]);
      setStockBySize({ ...stockBySize, [sz]: 0 });
    }
  };

  const handleStockChange = (sz: string, val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    setStockBySize((prev) => ({ ...prev, [sz]: isNaN(num) ? 0 : Math.max(0, num) }));
  };

  // Color variant management
  const addColorVariant = () => {
    const newIndex = colorOptions.length + 1;
    const defaultColorNames = ['Blue', 'Black', 'Green', 'Yellow', 'Pink', 'White', 'Purple', 'Maroon'];
    const colName = defaultColorNames[newIndex % defaultColorNames.length] || `Color ${newIndex}`;
    const defaultHexes: Record<string, string> = {
      Blue: '#2563eb',
      Black: '#09090b',
      Green: '#16a34a',
      Yellow: '#ca8a04',
      Pink: '#db2777',
      White: '#f8fafc',
      Purple: '#9333ea',
      Maroon: '#881337',
    };

    const newVariant: ColorVariant = {
      name: colName,
      hex: defaultHexes[colName] || '#475569',
      image: mainImage,
      images: mainImage ? [mainImage] : [],
      price: parseInt(price) || 0,
      mrp: parseInt(mrp) || 0,
      stockBySize: { ...stockBySize },
      description: '',
    };

    const updated = [...colorOptions, newVariant];
    setColorOptions(updated);
    setActiveVariantTab(updated.length - 1);
  };

  const removeColorVariant = (index: number) => {
    const updated = colorOptions.filter((_, idx) => idx !== index);
    setColorOptions(updated);
    if (activeVariantTab >= updated.length) {
      setActiveVariantTab(Math.max(0, updated.length - 1));
    }
  };

  const updateActiveVariantField = (field: keyof ColorVariant, value: any) => {
    setColorOptions((prev) =>
      prev.map((col, idx) => {
        if (idx !== activeVariantTab) return col;
        return { ...col, [field]: value };
      })
    );
  };

  const addVariantImage = (index: number, imgUrl: string) => {
    if (!imgUrl.trim()) return;
    setColorOptions((prev) =>
      prev.map((col, idx) => {
        if (idx !== index) return col;
        const currentImgs = col.images || (col.image ? [col.image] : []);
        return {
          ...col,
          images: [...currentImgs, imgUrl.trim()],
          image: col.image || imgUrl.trim(),
        };
      })
    );
  };

  const removeVariantImage = (variantIndex: number, imgIndex: number) => {
    setColorOptions((prev) =>
      prev.map((col, idx) => {
        if (idx !== variantIndex) return col;
        const currentImgs = (col.images || []).filter((_, i) => i !== imgIndex);
        return {
          ...col,
          images: currentImgs,
          image: currentImgs[0] || '',
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    const numericPrice = Math.max(0, parseInt(price) || 0);
    const numericMrp = Math.max(numericPrice, parseInt(mrp) || numericPrice);
    const numericGst = parseInt(gstRate) || 5;

    // Generate url slug
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure all colorOptions have at least the variant image
    const normalizedColorOptions = colorOptions.map((c) => ({
      ...c,
      image: c.image || c.images?.[0] || mainImage,
      images: c.images && c.images.length > 0 ? c.images : (c.image || mainImage ? [c.image || mainImage] : []),
      price: c.price || numericPrice,
      mrp: c.mrp || numericMrp,
      stockBySize: c.stockBySize || stockBySize,
    }));

    const allImages = [
      mainImage,
      ...extraImages,
      ...normalizedColorOptions.flatMap((c) => c.images || []),
    ].filter(Boolean);
    const uniqueImages = Array.from(new Set(allImages));

    const finalProductData = {
      name: name.trim(),
      slug: generatedSlug,
      brand: brand.trim(),
      sku: sku.trim() || `RM-${(category || 'PRD').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      price: numericPrice,
      mrp: numericMrp,
      gstRate: numericGst,
      offerTag: offerTag.trim() || undefined,
      isNewLaunch: isNewLaunch,
      isNewArrival: isNewLaunch,
      isBestseller: isBestseller,
      isFestive: isFestive,
      mainImage: mainImage || normalizedColorOptions[0]?.image || '',
      images: uniqueImages.length > 0 ? uniqueImages : (mainImage ? [mainImage] : []),
      category: category.trim(),
      subcategory: subcategory.trim(),
      kurtiType: kurtiType.trim(),
      typeStyle: (typeStyle || kurtiType).trim(),
      sizes: selectedSizes.length > 0 ? selectedSizes : ['Free size'],
      defaultSize: selectedSizes.length > 0 ? selectedSizes[0] : 'Free size',
      stockBySize: stockBySize,
      color: normalizedColorOptions[0]?.name || primaryColorName || '',
      colorOptions: normalizedColorOptions,
      material: material.trim(),
      fit: fit.trim(),
      pattern: pattern.trim(),
      description: description.trim(),
      highlights: highlights.filter((h) => h.trim().length > 0),
      published: initialProduct ? initialProduct.published : true,
      returnPolicy: initialProduct?.returnPolicy || '',
      deliveryInfo: initialProduct?.deliveryInfo || '',
      sizeChart: sizeChart && sizeChart.length > 0 ? sizeChart : [
        { size: 'S', bust: '36"', waist: '32"', hip: '39"', length: '44"' },
        { size: 'M', bust: '38"', waist: '34"', hip: '41"', length: '44"' },
        { size: 'L', bust: '40"', waist: '36"', hip: '43"', length: '45"' },
        { size: 'XL', bust: '42"', waist: '38"', hip: '45"', length: '45"' },
        { size: 'XXL', bust: '44"', waist: '40"', hip: '47"', length: '46"' },
      ],
      seo: {
        title: `${name.trim()} | REDMODE Official Store`,
        metaDescription: description.trim().slice(0, 160),
        keywords: `${name}, ${category}, ${subcategory}, redmode clothing`,
        urlSlug: generatedSlug,
        imageAlt: `${name.trim()} - REDMODE`,
      },
    };

    onSave(finalProductData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[24px] md:rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header matching Admin Panel theme */}
        <div className="p-5 sm:p-6 px-6 sm:px-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Sparkles className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `Update specifications, categories, and color variations for ${initialProduct?.name}`
                  : 'Add title, category, pricing, size stock, and multi-color variations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-8 text-xs font-sans">
          {/* SECTION 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. General Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="font-semibold text-slate-700">Product Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-medium"
                />
              </div>

              {/* 1. Category Select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">1. Product Category *</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCategory(newCat);
                    setSubcategory('');
                    setKurtiType('');
                    setTypeStyle('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition bg-white text-slate-900 text-xs font-medium cursor-pointer"
                >
                  <option value="">-- Select Product Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {!categories.some((c) => c.name.toLowerCase() === 'shirt') && (
                    <option value="Shirt">Shirt</option>
                  )}
                  {!categories.some((c) => c.name.toLowerCase() === 't-shirt') && (
                    <option value="T-Shirt">T-Shirt</option>
                  )}
                  {!categories.some((c) => c.name.toLowerCase() === 'gym lower') && (
                    <option value="Gym Lower">Gym Lower</option>
                  )}
                </select>
              </div>

              {/* 2. Subcategory Select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">2. Subcategory</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition bg-white text-slate-900 text-xs font-medium cursor-pointer"
                >
                  <option value="">-- Select Subcategory --</option>
                  {category &&
                    !availableSubcategories.some(
                      (s) => s.name.toLowerCase() === category.toLowerCase()
                    ) && <option value={category}>{category}</option>}
                  {availableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Independent Product Type Options */}
              <div className="md:col-span-2 space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    3. Product Type
                  </label>
                  <span className="text-[10px] text-emerald-600 font-semibold">Independent Selection</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(category.toLowerCase().includes('trouser') || category.toLowerCase().includes('bottom') || category.toLowerCase().includes('lower')
                    ? category.toLowerCase().includes('gym')
                      ? ['Track Pant', 'Sports Jogger', 'Compression Lower', 'Relaxed Fit Lower']
                      : ['Straight Fit', 'Regular Fit', 'Flared Palazzo', 'Cigarette Pant']
                    : category.toLowerCase().includes('set')
                    ? ['2-Piece Kurti Set', '3-Piece Kurti Set', 'Anarkali Suit Set', 'Festive Kurti Set']
                    : category.toLowerCase().includes('jewel')
                    ? ['Earrings & Jhumkas', 'Necklace Set', 'Bangles & Kada', 'Statement Rings']
                    : category.toLowerCase().includes('t-shirt') || category.toLowerCase().includes('tshirt')
                    ? ['Oversized T-Shirt', 'Regular Fit T-Shirt', 'Polo T-Shirt', 'Crop T-Shirt']
                    : category.toLowerCase().includes('shirt')
                    ? ['Half Sleeve Shirt', 'Full Sleeve Shirt', 'Casual Shirt', 'Formal Shirt']
                    : ['Short Kurti', 'Long Kurti', 'Anarkali Kurti', 'Regular Straight Kurti']
                  ).map((styleOption) => {
                    const isSelected = (kurtiType || typeStyle) === styleOption;
                    return (
                      <button
                        key={styleOption}
                        type="button"
                        onClick={() => {
                          const nextVal = isSelected ? '' : styleOption;
                          setKurtiType(nextVal);
                          setTypeStyle(nextVal);
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-black'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{styleOption}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selling Price (₹) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Selling Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter selling price"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-medium"
                  />
                </div>
              </div>

              {/* MRP (₹) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">MRP (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    placeholder="Enter MRP"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-medium"
                  />
                </div>
              </div>

              {/* SKU & Brand */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">SKU Code (Auto-Generated)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value.toUpperCase());
                    setIsSkuManuallyEdited(true);
                  }}
                  placeholder="Auto-generates as you enter product details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-mono font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Fabric & Material</label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. 100% Pure Mulmul Cotton"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-medium"
                />
              </div>

              {/* Collection Flags & Launch Badges */}
              <div className="space-y-2 md:col-span-2 pt-1 border-t border-slate-100">
                <label className="font-semibold text-slate-800 text-xs block">
                  Listing Tags &amp; Collection Highlights (Shows in Menu &amp; Badges)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isNewLaunch;
                      setIsNewLaunch(next);
                      if (next && !offerTag) setOfferTag('NEW ARRIVAL');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isNewLaunch
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-3xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>✨ New Launch / Arrival</span>
                    {isNewLaunch && <span className="text-[10px]">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isBestseller;
                      setIsBestseller(next);
                      if (next && !offerTag) setOfferTag('BESTSELLER');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isBestseller
                        ? 'bg-zinc-900 text-white border-black shadow-3xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>🔥 Bestseller Badge</span>
                    {isBestseller && <span className="text-[10px]">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isFestive;
                      setIsFestive(next);
                      if (next && !offerTag) setOfferTag('FESTIVE EDIT');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isFestive
                        ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-3xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>🪔 Festive Collection</span>
                    {isFestive && <span className="text-[10px]">✓</span>}
                  </button>
                </div>
              </div>

              {/* Badge Tag */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-700">Special Badge / Ribbon Text (Optional)</label>
                <input
                  type="text"
                  value={offerTag}
                  onChange={(e) => setOfferTag(e.target.value)}
                  placeholder="e.g. FESTIVE EDIT, BEST SELLER, NEW ARRIVAL, 40% OFF"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-700">Product Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description for customers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-normal"
                />
              </div>

              {/* Product Highlights (Bullet Points) */}
              <div className="space-y-2.5 md:col-span-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-700">Product Highlights (Bullet Points)</label>
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
                        onClick={() => setHighlights([])}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick-Select Bullet Point Chips */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Click to add/remove quick bullet points:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
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
                    ].map((presetBullet) => {
                      const isAdded = highlights.some(
                        (h) => h.trim().toLowerCase() === presetBullet.toLowerCase()
                      );
                      return (
                        <button
                          key={presetBullet}
                          type="button"
                          onClick={() => {
                            setHighlights((prev) =>
                              isAdded
                                ? prev.filter((b) => b.trim().toLowerCase() !== presetBullet.toLowerCase())
                                : [...prev, presetBullet]
                            );
                          }}
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

                {highlights.length > 0 && (
                  <div className="space-y-2">
                    {highlights.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
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

                <div className="flex items-center gap-2 pt-1">
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
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bullet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Sizes & Stock Inventory */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Size Variations &amp; Stock
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Click to enable/disable sizes</span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ALL_SIZES.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{sz}</span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {selectedSizes.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
                  {selectedSizes.map((sz) => (
                    <div key={sz} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <span className="font-bold text-slate-700 text-[11px]">Size {sz} Units</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={String(stockBySize[sz] ?? 0)}
                        onChange={(e) => handleStockChange(sz, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 text-center outline-none focus:border-black"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2B: Custom Size Guide & Copy Feature (Per User Request) */}
          <div className="space-y-4 p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-800" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    2B. Size Guide & Measurements
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Har product ke liye alag size chart set karein ya kisi aur product se 1-click copy karein.
                  </p>
                </div>
              </div>

              {/* Quick Template Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('kurti')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                  title="Apply Standard Kurti measurements"
                >
                  Kurti Template
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('anarkali')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                  title="Apply Anarkali Gown measurements"
                >
                  Anarkali/Gown
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('short')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                  title="Apply Short Kurti measurements"
                >
                  Short Kurti
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('bottom')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                  title="Apply Bottomwear measurements"
                >
                  Pants/Plazo
                </button>
              </div>
            </div>

            {/* Copy Size Chart from another product Bar */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                Copy Size Chart from Another Product:
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedCopyProductId}
                  onChange={(e) => setSelectedCopyProductId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium outline-none focus:border-black cursor-pointer"
                >
                  <option value="">Select a product to copy size chart...</option>
                  {products
                    .filter((p) => p.id !== initialProduct?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedCopyProductId}
                  onClick={handleCopyFromProduct}
                  className="px-4 py-2 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Size Chart</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
                  title="Copy size chart JSON to clipboard"
                >
                  Copy JSON
                </button>
              </div>

              {copyFeedback && (
                <p className="text-[11px] font-semibold text-emerald-700 animate-in fade-in duration-150">
                  ✓ {copyFeedback}
                </p>
              )}
            </div>

            {/* Editable Size Chart Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Bust / Chest</th>
                    <th className="py-2.5 px-3">Waist</th>
                    <th className="py-2.5 px-3">Hip</th>
                    <th className="py-2.5 px-3">Garment Length</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sizeChart.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.size}
                          onChange={(e) => handleUpdateChartRow(idx, 'size', e.target.value)}
                          placeholder="e.g. M"
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900 focus:border-black outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.bust}
                          onChange={(e) => handleUpdateChartRow(idx, 'bust', e.target.value)}
                          placeholder='e.g. 38"'
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 focus:border-black outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.waist}
                          onChange={(e) => handleUpdateChartRow(idx, 'waist', e.target.value)}
                          placeholder='e.g. 34"'
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 focus:border-black outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.hip}
                          onChange={(e) => handleUpdateChartRow(idx, 'hip', e.target.value)}
                          placeholder='e.g. 41"'
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 focus:border-black outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.length}
                          onChange={(e) => handleUpdateChartRow(idx, 'length', e.target.value)}
                          placeholder='e.g. 44"'
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 focus:border-black outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveChartRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Remove size row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Total {sizeChart.length} size measurements configured.
                </span>
                <button
                  type="button"
                  onClick={handleAddChartRow}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Size Row</span>
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ImageIcon className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Primary Cover Image
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Cover Image URL *</label>
                  <label className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition">
                    <Upload className="w-3 h-3" />
                    <span>Upload Device Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadImageFile(file);
                          if (url) setMainImage(url);
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="url"
                  required
                  value={mainImage}
                  onChange={(e) => setMainImage(e.target.value)}
                  placeholder="https://images.unsplash.com/... or uploaded photo data"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition text-slate-900 text-xs font-medium"
                />
                <p className="text-[10px] text-slate-400">
                  Storefront listing cards me default thumbnail ke roop me dikhegi.
                </p>
              </div>

              <div className="flex items-center justify-center p-2 border border-slate-200 rounded-2xl bg-slate-50 h-28 w-24 mx-auto overflow-hidden">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: COLOR VARIATIONS (Complete multi-color support) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-rose-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    4. Color Variations
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Storefront par har color ka card alag dikhega, aur customer click karega toh us color ke photo, details, price load ho jayenge.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addColorVariant}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Color</span>
              </button>
            </div>

            {/* Variation Tab Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
              {colorOptions.map((col, idx) => {
                const isActive = activeVariantTab === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveVariantTab(idx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: col.hex || '#000000' }}
                    />
                    <span>{col.name || `Color ${idx + 1}`}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Color Variant Config Box */}
            {colorOptions[activeVariantTab] && (
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Editing Variation #{activeVariantTab + 1}: {colorOptions[activeVariantTab].name}
                  </span>
                  {colorOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColorVariant(activeVariantTab)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Color</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Color Name *</label>
                    <input
                      type="text"
                      required
                      value={colorOptions[activeVariantTab].name}
                      onChange={(e) => updateActiveVariantField('name', e.target.value)}
                      placeholder="e.g. Navy Blue, Crimson Red, Olive"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-black"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Color Hex Swatch *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorOptions[activeVariantTab].hex || '#000000'}
                        onChange={(e) => updateActiveVariantField('hex', e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={colorOptions[activeVariantTab].hex || '#000000'}
                        onChange={(e) => updateActiveVariantField('hex', e.target.value)}
                        placeholder="#2563eb"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 outline-none focus:border-black uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Variant Price (₹)</label>
                    <input
                      type="number"
                      value={colorOptions[activeVariantTab].price ?? price}
                      onChange={(e) => updateActiveVariantField('price', parseInt(e.target.value) || 0)}
                      placeholder={price}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-black"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700">
                        Variant Primary Photo URL (Shows when this color is clicked) *
                      </label>
                      <label className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition">
                        <Upload className="w-3 h-3" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await uploadImageFile(file);
                              if (url) updateActiveVariantField('image', url);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      value={colorOptions[activeVariantTab].image || ''}
                      onChange={(e) => updateActiveVariantField('image', e.target.value)}
                      placeholder="https://images.unsplash.com/... or uploaded photo data"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-black"
                    />
                  </div>

                  {/* Multiple Gallery Photos for this specific Color */}
                  <div className="space-y-2 md:col-span-3">
                    <label className="font-semibold text-slate-700">
                      Additional Gallery Images for this Color ({colorOptions[activeVariantTab].name})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        id="new-variant-img-input"
                        placeholder="Add extra angle/view photo URL..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-black"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value;
                            addVariantImage(activeVariantTab, val);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-variant-img-input') as HTMLInputElement;
                          if (input && input.value) {
                            addVariantImage(activeVariantTab, input.value);
                            input.value = '';
                          }
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Add Photo
                      </button>
                    </div>

                    {/* Image thumbnails preview */}
                    <div className="flex items-center gap-3 flex-wrap pt-2">
                      {(colorOptions[activeVariantTab].images || [colorOptions[activeVariantTab].image]).filter(Boolean).map((img, i) => (
                        <div key={i} className="relative w-14 h-16 rounded-lg overflow-hidden border border-slate-200 bg-white group shadow-2xs">
                          <img src={img} alt="Variant view" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeVariantImage(activeVariantTab, i)}
                            className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <label className="font-semibold text-slate-700">Variant Description / Color Notes</label>
                    <input
                      type="text"
                      value={colorOptions[activeVariantTab].description || ''}
                      onChange={(e) => updateActiveVariantField('description', e.target.value)}
                      placeholder="e.g. Rich Indigo dye with subtle metallic zari accents"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-black hover:bg-slate-800 text-white font-semibold transition cursor-pointer shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isEditing ? 'Save Changes' : 'Publish Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
