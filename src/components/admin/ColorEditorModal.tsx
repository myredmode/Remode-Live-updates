import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Palette,
  Check,
  Copy,
  Plus,
  Trash2,
  X,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Pipette,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  BASE_COLORS,
  QUICK_FANCY_PRESETS,
  getAutoColorCode,
  isValidHex,
  extractDominantColorFromImage,
} from './colorData';
import { uploadImageFile } from '../../utils/imageUpload';

export interface ColorDef {
  id: string;
  name: string;
  baseColor?: string;
  hex: string;
  code: string;
  primaryImage: string;
  galleryImages: string[];
}

interface ColorEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (color: ColorDef) => void;
  initialColor?: ColorDef | null;
  existingColors: ColorDef[];
  sampleImageFallback?: string;
}

export const ColorEditorModal: React.FC<ColorEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialColor,
  existingColors,
  sampleImageFallback = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialColor);

  // 1. Base color state
  const [baseColorName, setBaseColorName] = useState<string>(
    initialColor?.baseColor || 'Green'
  );

  // 2. Customer-facing premium name
  const [customerName, setCustomerName] = useState<string>(
    initialColor?.name || ''
  );

  // 3. HEX Color (empty by default if new, never forced to #000000)
  const [hexValue, setHexValue] = useState<string>(
    initialColor?.hex || ''
  );

  // 4. Internal SKU Code
  const [colorCode, setColorCode] = useState<string>(
    initialColor?.code || ''
  );

  // 5. Images
  const [primaryImage, setPrimaryImage] = useState<string>(
    initialColor?.primaryImage || sampleImageFallback
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    initialColor?.galleryImages && initialColor.galleryImages.length > 0
      ? initialColor.galleryImages
      : [initialColor?.primaryImage || sampleImageFallback]
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showAddUrlInput, setShowAddUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Suggestion rotation offset
  const [suggestionOffset, setSuggestionOffset] = useState<number>(0);
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [copiedHex, setCopiedHex] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get current base color metadata
  const currentBaseMeta =
    BASE_COLORS.find(
      (b) => b.name.toLowerCase() === baseColorName.toLowerCase()
    ) || BASE_COLORS[0];

  // Active suggestions with pagination / generate more
  const availableSuggestions = currentBaseMeta.suggestions;
  const pageSize = 4;
  const displayedSuggestions = availableSuggestions.slice(
    (suggestionOffset % Math.max(1, availableSuggestions.length)),
    (suggestionOffset % Math.max(1, availableSuggestions.length)) + pageSize
  );

  // If sliced list is short at end of array, wrap around
  const wrappedSuggestions =
    displayedSuggestions.length < pageSize
      ? [
          ...displayedSuggestions,
          ...availableSuggestions.slice(0, pageSize - displayedSuggestions.length),
        ]
      : displayedSuggestions;

  // Change base color
  const handleSelectBaseColor = (baseName: string) => {
    setBaseColorName(baseName);
    setSuggestionOffset(0);
    setValidationError(null);

    const baseMeta = BASE_COLORS.find(
      (b) => b.name.toLowerCase() === baseName.toLowerCase()
    );
    if (baseMeta && baseMeta.suggestions.length > 0) {
      const topSuggestion = baseMeta.suggestions[0];
      // Only set if not already set or admin hasn't customized
      if (!customerName || !isEditing) {
        setCustomerName(topSuggestion.name);
        if (!hexValue) {
          setHexValue(topSuggestion.hex);
        }
        setColorCode(topSuggestion.code);
      }
    }
  };

  // Pick a suggestion
  const handleSelectSuggestion = (sug: { name: string; hex: string; code: string }) => {
    setCustomerName(sug.name);
    // Suggest hex only if not already manually chosen or if empty
    if (!hexValue) {
      setHexValue(sug.hex);
    }
    setColorCode(sug.code);
    setValidationError(null);
  };

  // Generate more suggestions
  const handleGenerateMore = () => {
    setSuggestionOffset((prev) => prev + pageSize);
  };

  // Pick one-click quick preset
  const handleApplyPreset = (preset: { name: string; hex: string; code: string }) => {
    setCustomerName(preset.name);
    setHexValue(preset.hex);
    setColorCode(preset.code);
    // Find matching base color
    const matchedBase = BASE_COLORS.find((b) =>
      b.suggestions.some((s) => s.name.toLowerCase() === preset.name.toLowerCase())
    );
    if (matchedBase) {
      setBaseColorName(matchedBase.name);
    }
    setValidationError(null);
  };

  // Color picker change
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexValue(val);
    setValidationError(null);
  };

  // Manual hex typing
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = `#${val}`;
    }
    setHexValue(val.toUpperCase());
    setValidationError(null);
  };

  // Auto-calculate code when typing customer name if not manually modified
  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerName(val);
    setValidationError(null);
    if (!colorCode || colorCode.length <= 2) {
      setColorCode(getAutoColorCode(val));
    }
  };

  // Copy HEX to clipboard
  const handleCopyHex = () => {
    if (!hexValue) return;
    navigator.clipboard.writeText(hexValue);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  // Pick Color From Product Image (Requirement 14)
  const handleExtractFromImage = async () => {
    if (!primaryImage) {
      setValidationError('Please upload or set a primary image first.');
      return;
    }
    setIsExtractingColor(true);
    setValidationError(null);

    try {
      const result = await extractDominantColorFromImage(primaryImage);
      setHexValue(result.hex);
      setBaseColorName(result.baseColorName);
      if (result.suggestedNames.length > 0 && (!customerName || !isEditing)) {
        setCustomerName(result.suggestedNames[0]);
        setColorCode(getAutoColorCode(result.suggestedNames[0]));
      }
    } catch (err: any) {
      console.warn('Could not extract color automatically:', err);
      setValidationError(
        'Could not sample directly from external image (CORS or format). You can use the visual color picker below.'
      );
    } finally {
      setIsExtractingColor(false);
    }
  };

  // Image Upload handler (Compressed & server-persisted)
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const persistedUrl = await uploadImageFile(file);
      if (persistedUrl) {
        setPrimaryImage(persistedUrl);
        setGalleryImages((prev) => {
          if (!prev.includes(persistedUrl)) {
            return [persistedUrl, ...prev];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Add custom image URL
  const handleAddCustomImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const clean = newImageUrl.trim();
    if (!primaryImage) {
      setPrimaryImage(clean);
    }
    if (!galleryImages.includes(clean)) {
      setGalleryImages((prev) => [...prev, clean]);
    }
    setNewImageUrl('');
    setShowAddUrlInput(false);
  };

  // Remove image from gallery
  const handleRemoveGalleryImage = (img: string) => {
    const remaining = galleryImages.filter((i) => i !== img);
    setGalleryImages(remaining);
    if (primaryImage === img) {
      setPrimaryImage(remaining[0] || sampleImageFallback);
    }
  };

  // Final validation and submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Missing customer name validation
    if (!customerName.trim()) {
      setValidationError('Please enter or select a customer-facing color name.');
      return;
    }

    // 2. Missing HEX validation - NEVER ALLOW EMPTY OR SAVE AS BLACK SILENTLY
    if (!hexValue.trim()) {
      setValidationError('Please select a color using the visual color picker.');
      return;
    }

    // 3. HEX format validation
    if (!isValidHex(hexValue)) {
      setValidationError('Enter a valid HEX color code (e.g. #82976F).');
      return;
    }

    // 4. Duplicate name check for this product
    const isDuplicate = existingColors.some(
      (c) =>
        (!initialColor || c.id !== initialColor.id) &&
        c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setValidationError(
        `This color "${customerName}" already exists for this product.`
      );
      return;
    }

    // Internal code fallback
    const finalCode = (colorCode.trim() || getAutoColorCode(customerName)).toUpperCase();

    const colorDef: ColorDef = {
      id: initialColor?.id || `col-${Date.now()}`,
      name: customerName.trim(),
      baseColor: baseColorName,
      hex: hexValue.toUpperCase(),
      code: finalCode,
      primaryImage: primaryImage || sampleImageFallback,
      galleryImages: galleryImages.length > 0 ? galleryImages : [primaryImage || sampleImageFallback],
    };

    onSave(colorDef);
    onClose();
  };

  const isHexValid = isValidHex(hexValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEditing ? 'Edit Color Variation' : 'Add Color Variation'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Select a simple base color; RedMode suggests customer names, swatch & SKU code.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Quick Presets Strip */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Popular Quick Fancy Presets
              </label>
              <span className="text-[10px] text-slate-400">1-click populate</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/80">
              {QUICK_FANCY_PRESETS.map((p) => {
                const isSelected =
                  customerName.toLowerCase() === p.name.toLowerCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 1: Base Color & Customer-Facing Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            {/* Base Color Dropdown / Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Base / Actual Color <span className="text-rose-500">*</span>
              </label>
              <p className="text-[10px] text-slate-400 mb-2">
                What basic color is the garment? (e.g. Green, Pink, White)
              </p>
              <div className="relative">
                <select
                  value={baseColorName}
                  onChange={(e) => handleSelectBaseColor(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900 text-slate-800 cursor-pointer shadow-2xs appearance-none"
                >
                  {BASE_COLORS.map((base) => (
                    <option key={base.id} value={base.name}>
                      {base.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                  ▾
                </div>
              </div>

              {/* Quick Base Color Chips */}
              <div className="flex flex-wrap gap-1 mt-2">
                {['Green', 'Pink', 'White', 'Black', 'Blue', 'Beige'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleSelectBaseColor(b)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                      baseColorName.toLowerCase() === b.toLowerCase()
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer-Facing Premium Color Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Customer-Facing Premium Name <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-600 font-medium">Storefront Label</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                Displayed to customers (e.g. Sage Green, Dusty Rose).
              </p>
              <input
                type="text"
                placeholder="e.g. Sage Green"
                value={customerName}
                onChange={handleCustomerNameChange}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900 text-slate-900 shadow-2xs"
              />
            </div>
          </div>

          {/* Step 2: Automatic Premium Name Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Suggested Premium Names for &ldquo;{baseColorName}&rdquo;
              </span>
              <button
                type="button"
                onClick={handleGenerateMore}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>+ Generate More</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {wrappedSuggestions.map((sug) => {
                const isSelected =
                  customerName.toLowerCase() === sug.name.toLowerCase();
                return (
                  <button
                    key={sug.name}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: sug.hex }}
                    />
                    <span>{sug.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Actual Garment Shade & Visual Color Picker */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  Actual Garment Color &amp; Visual Color Picker
                </label>
                <p className="text-[11px] text-slate-400">
                  Pick the exact garment shade. Never forced to know or type HEX codes.
                </p>
              </div>

              {/* Sample From Image Action */}
              <button
                type="button"
                onClick={handleExtractFromImage}
                disabled={isExtractingColor}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Automatically analyze product photo to detect dominant garment color"
              >
                <Pipette className="w-3 h-3 text-indigo-600" />
                <span>{isExtractingColor ? 'Sampling...' : 'Pick Color From Image'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Visual Color Input */}
              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="color"
                  value={isHexValid ? hexValue : '#82976F'}
                  onChange={handlePickerChange}
                  className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                  title="Click to open visual color palette"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold text-slate-700 block">Visual Swatch</span>
                  <span className="text-slate-400 text-[10px]">Click circle to tune shade</span>
                </div>
              </div>

              {/* HEX Display / Manual Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-500">HEX VALUE</label>
                  {isHexValid && (
                    <button
                      type="button"
                      onClick={handleCopyHex}
                      className="text-[10px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      {copiedHex ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedHex ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. #82976F"
                    value={hexValue}
                    onChange={handleHexInputChange}
                    className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                      !hexValue
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : isHexValid
                        ? 'bg-white border-emerald-300 text-slate-900'
                        : 'bg-rose-50 border-rose-300 text-rose-700'
                    }`}
                  />
                  {isHexValid && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-2" />
                  )}
                </div>
                {!hexValue ? (
                  <span className="text-[10px] text-amber-600 block">○ Color not selected yet</span>
                ) : !isHexValid ? (
                  <span className="text-[10px] text-rose-600 block">Invalid color code</span>
                ) : null}
              </div>

              {/* Internal SKU Color Code */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-500">SKU CODE</label>
                  <span className="text-[10px] text-slate-400">Auto-suggested</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. SG"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900 text-slate-900"
                  title="Short 2-letter internal code used in variant SKUs"
                />
                <span className="text-[10px] text-slate-400 block">Used for SKU (e.g. -{colorCode || 'CL'}-S)</span>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                {isHexValid ? (
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white shadow-xs shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: hexValue }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 bg-white flex items-center justify-center shrink-0">
                    <span className="text-[9px] text-slate-400 font-mono">?</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {customerName || 'Unnamed Color'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                      {colorCode || 'CL'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {baseColorName} · {isHexValid ? hexValue : 'No HEX chosen'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Live Preview
              </span>
            </div>
          </div>

          {/* Step 4: Color-Specific Images */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                  Color-Specific Garment Images
                </label>
                <p className="text-[11px] text-slate-400">
                  Customers will see these exact photos when selecting &ldquo;{customerName || 'this color'}&rdquo;.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUrlInput(!showAddUrlInput)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add URL</span>
                </button>
              </div>
            </div>

            {showAddUrlInput && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="url"
                  placeholder="Paste image URL (https://...)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomImageUrl}
                  className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            )}

            {/* Gallery Thumbnails */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {galleryImages.map((img, idx) => {
                const isPrimary = primaryImage === img;
                return (
                  <div
                    key={img + idx}
                    className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 group transition ${
                      isPrimary ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Color photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isPrimary && (
                      <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded shadow-2xs">
                        Main
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(img)}
                          className="p-1 bg-white text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                          title="Set as Main"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      {galleryImages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(img)}
                          className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEditing ? 'Save Color Changes' : 'Add Color to Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
