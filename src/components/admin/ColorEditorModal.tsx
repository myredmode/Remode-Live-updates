import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Check,
  Copy,
  Plus,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Pipette,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link as LinkIcon,
  Star,
} from 'lucide-react';
import {
  BASE_COLORS,
  QUICK_FANCY_PRESETS,
  MULTI_COLOR_GRADIENT,
  isMultiColorName,
  getAutoColorCode,
  isValidHex,
  extractDominantColorFromImage,
} from './colorData';
import { uploadImageFile } from '../../utils/imageUpload';
import { deleteSavedUploadedImage } from '../../utils/userUploadedImages';

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
}) => {
  const isEditing = Boolean(initialColor);

  // 1. Base color state
  const [baseColorName, setBaseColorName] = useState<string>('Green');

  // 2. Customer-facing premium name
  const [customerName, setCustomerName] = useState<string>('');

  // 3. HEX Color
  const [hexValue, setHexValue] = useState<string>('#82976F');
  const [hasManualHex, setHasManualHex] = useState<boolean>(false);

  // 4. Internal SKU Code
  const [colorCode, setColorCode] = useState<string>('');
  const [hasManualCode, setHasManualCode] = useState<boolean>(false);

  // 5. Images
  const [primaryImage, setPrimaryImage] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showAddUrlInput, setShowAddUrlInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // UI state for compact layout
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [copiedHex, setCopiedHex] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Reset / populate state whenever modal opens or initialColor changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialColor) {
      const initBase = initialColor.baseColor || 'Green';
      const validInitGallery = (initialColor.galleryImages || []).filter(Boolean);
      const initPrimary = initialColor.primaryImage || validInitGallery[0] || '';
      const mergedGallery =
        validInitGallery.length > 0
          ? validInitGallery
          : initPrimary
          ? [initPrimary]
          : [];

      setBaseColorName(initBase);
      setCustomerName(initialColor.name || '');
      setHexValue(initialColor.hex || '#82976F');
      setHasManualHex(Boolean(initialColor.hex));
      setColorCode(initialColor.code || getAutoColorCode(initialColor.name || ''));
      setHasManualCode(Boolean(initialColor.code));
      setPrimaryImage(initPrimary);
      setGalleryImages(mergedGallery);
      setShowAdvancedDetails(false);
    } else {
      const defaultBase = BASE_COLORS[0];
      setBaseColorName(defaultBase.name);
      setCustomerName('');
      setHexValue(defaultBase.suggestions[0]?.hex || defaultBase.sampleHex);
      setHasManualHex(false);
      setColorCode('');
      setHasManualCode(false);
      setPrimaryImage('');
      setGalleryImages([]);
      setShowAdvancedDetails(false);
    }

    setNewImageUrl('');
    setShowAddUrlInput(false);
    setShowSuggestionsDropdown(false);
    setShowAllPresets(false);
    setValidationError(null);
    setBrokenImages({});
  }, [isOpen, initialColor]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestionsDropdown(false);
      }
    };
    if (showSuggestionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestionsDropdown]);

  if (!isOpen) return null;

  // Current base color metadata
  const currentBaseMeta =
    BASE_COLORS.find(
      (b) => b.name.toLowerCase() === baseColorName.toLowerCase()
    ) || BASE_COLORS[0];

  const availableSuggestions = currentBaseMeta.suggestions;

  // Filter suggestions when user types, or show all for selected base color
  const filteredSuggestions = customerName.trim()
    ? availableSuggestions.filter((s) =>
        s.name.toLowerCase().includes(customerName.trim().toLowerCase())
      )
    : availableSuggestions;

  const suggestionsToDisplay =
    filteredSuggestions.length > 0 ? filteredSuggestions : availableSuggestions;

  // Compact palette presets (top 10 by default, expandable to all 20)
  const visiblePresets = showAllPresets
    ? QUICK_FANCY_PRESETS
    : QUICK_FANCY_PRESETS.slice(0, 10);

  // Change base color
  const handleSelectBaseColor = (baseName: string) => {
    setBaseColorName(baseName);
    setValidationError(null);

    const baseMeta = BASE_COLORS.find(
      (b) => b.name.toLowerCase() === baseName.toLowerCase()
    );
    if (baseMeta) {
      if (!hasManualHex) {
        setHexValue(baseMeta.suggestions[0]?.hex || baseMeta.sampleHex);
      }
    }
  };

  // Pick a suggestion for Customer-Facing Premium Name
  const handleSelectSuggestion = (sug: {
    name: string;
    hex: string;
    code: string;
  }) => {
    setCustomerName(sug.name);
    if (!hasManualHex) {
      setHexValue(sug.hex);
    }
    if (!hasManualCode) {
      setColorCode(sug.code);
    }
    setShowSuggestionsDropdown(false);
    setValidationError(null);
  };

  // Pick a quick color preset from Section A
  const handleApplyPreset = (preset: {
    name: string;
    hex: string;
    code: string;
  }) => {
    setCustomerName(preset.name);
    setHexValue(preset.hex);
    setHasManualHex(false);
    setColorCode(preset.code);
    setHasManualCode(false);

    const matchedBase = BASE_COLORS.find((b) =>
      b.suggestions.some(
        (s) => s.name.toLowerCase() === preset.name.toLowerCase()
      )
    );
    if (matchedBase) {
      setBaseColorName(matchedBase.name);
    }
    setValidationError(null);
  };

  // Visual color picker change
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexValue(val);
    setHasManualHex(true);
    setValidationError(null);
  };

  // Manual hex typing
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = `#${val}`;
    }
    setHexValue(val.toUpperCase());
    setHasManualHex(true);
    setValidationError(null);
  };

  // Customer-Facing Premium Name input change
  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerName(val);
    setValidationError(null);
    setShowSuggestionsDropdown(true);

    if (!hasManualCode) {
      setColorCode(val.trim() ? getAutoColorCode(val) : '');
    }

    // If user typed a known suggestion name, sync hex unless manually overridden
    if (!hasManualHex && val.trim()) {
      const exactMatch = availableSuggestions.find(
        (s) => s.name.toLowerCase() === val.trim().toLowerCase()
      );
      if (exactMatch) {
        setHexValue(exactMatch.hex);
      }
    }
  };

  // Copy HEX to clipboard
  const handleCopyHex = () => {
    if (!hexValue) return;
    navigator.clipboard.writeText(hexValue);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  // Pick Color From Product Image
  const handleExtractFromImage = async () => {
    const targetImg = primaryImage || galleryImages[0];
    if (!targetImg) {
      setValidationError('Please upload or add a product image first to sample its color.');
      return;
    }
    setIsExtractingColor(true);
    setValidationError(null);

    try {
      const result = await extractDominantColorFromImage(targetImg);
      setHexValue(result.hex);
      setHasManualHex(true);
      setBaseColorName(result.baseColorName);
      if (result.suggestedNames.length > 0 && (!customerName || !isEditing)) {
        setCustomerName(result.suggestedNames[0]);
        if (!hasManualCode) {
          setColorCode(getAutoColorCode(result.suggestedNames[0]));
        }
      }
    } catch (err) {
      console.warn('Could not extract color automatically:', err);
      setValidationError(
        'Could not sample from external image (CORS). Use the visual color swatch picker instead.'
      );
    } finally {
      setIsExtractingColor(false);
    }
  };

  // Image File Upload (supports single or multiple files)
  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    setValidationError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const persistedUrl = await uploadImageFile(files[i]);
        if (persistedUrl) {
          uploadedUrls.push(persistedUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setGalleryImages((prev) => {
          const cleanPrev = prev.filter(
            (url) =>
              url &&
              !url.includes('images.unsplash.com') &&
              !url.startsWith('/uploads/') &&
              !uploadedUrls.includes(url)
          );
          return [...uploadedUrls, ...cleanPrev];
        });
        setPrimaryImage(uploadedUrls[0]);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      setValidationError('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Add custom image URL
  const handleAddCustomImageUrl = () => {
    const clean = newImageUrl.trim();
    if (!clean) return;
    setPrimaryImage(clean);
    setGalleryImages((prev) => [
      clean,
      ...prev.filter(
        (u) =>
          u &&
          u !== clean &&
          !u.includes('images.unsplash.com') &&
          !u.startsWith('/uploads/')
      ),
    ]);
    setNewImageUrl('');
    setShowAddUrlInput(false);
  };

  // Remove image from gallery
  const handleRemoveGalleryImage = (img: string) => {
    deleteSavedUploadedImage(img);
    const remaining = galleryImages.filter((i) => i !== img);
    setGalleryImages(remaining);
    if (primaryImage === img) {
      setPrimaryImage(remaining[0] || '');
    }
  };

  // Reorder image in gallery (left/right)
  const handleMoveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= galleryImages.length) return;
    const updated = [...galleryImages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setGalleryImages(updated);
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate customer-facing color name
    if (!customerName.trim()) {
      setValidationError('Please enter or select a customer-facing color name.');
      return;
    }

    // 2. Fallback HEX to current base color sampleHex if left empty
    const resolvedHex = hexValue.trim() || currentBaseMeta.sampleHex || '#82976F';

    // 3. Validate HEX format
    if (!isValidHex(resolvedHex)) {
      setShowAdvancedDetails(true);
      setValidationError('Please enter a valid HEX color code (e.g. #82976F).');
      return;
    }

    // 4. Duplicate color name check for this product
    const isDuplicate = existingColors.some(
      (c) =>
        (!initialColor || c.id !== initialColor.id) &&
        c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setValidationError(
        `The color "${customerName.trim()}" already exists for this product.`
      );
      return;
    }

    const finalCode = (
      colorCode.trim() || getAutoColorCode(customerName)
    ).toUpperCase();

    const rawValidGallery = galleryImages.filter((img) => img && !brokenImages[img]);
    const hasRealImg = rawValidGallery.some(
      (u) => !u.includes('images.unsplash.com') && !u.startsWith('/uploads/')
    );
    const validGallery = hasRealImg
      ? rawValidGallery.filter(
          (u) => !u.includes('images.unsplash.com') && !u.startsWith('/uploads/')
        )
      : rawValidGallery;

    const finalPrimary =
      primaryImage &&
      !brokenImages[primaryImage] &&
      (!hasRealImg || (!primaryImage.includes('images.unsplash.com') && !primaryImage.startsWith('/uploads/')))
        ? primaryImage
        : validGallery[0] || '';

    const orderedGallery = Array.from(
      new Set([finalPrimary, ...validGallery].filter(Boolean))
    );

    const colorDef: ColorDef = {
      id: initialColor?.id || `col-${Date.now()}`,
      name: customerName.trim(),
      baseColor: baseColorName,
      hex: resolvedHex.toUpperCase(),
      code: finalCode,
      primaryImage: finalPrimary,
      galleryImages: orderedGallery,
    };

    onSave(colorDef);
    onClose();
  };

  const isHexValid = isValidHex(hexValue);
  const displayHex = isHexValid ? hexValue : currentBaseMeta.sampleHex;
  const effectiveCode = (
    colorCode.trim() ||
    (customerName.trim() ? getAutoColorCode(customerName) : 'CL')
  ).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-modal-title"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full border border-black/15 shrink-0 transition-colors"
              style={
                isMultiColorName(customerName, baseColorName)
                  ? { background: MULTI_COLOR_GRADIENT }
                  : { backgroundColor: displayHex }
              }
            />
            <h3
              id="color-modal-title"
              className="text-sm font-semibold text-slate-900 tracking-tight"
            >
              {isEditing ? 'Edit Color Variation' : 'Add Color Variation'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form
          id="color-variation-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5 divide-y divide-slate-100"
        >
          {/* Validation Alert */}
          {validationError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION A — COLOR SELECTION (Compact Color Palette) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Quick Color Palette
              </span>
              <button
                type="button"
                onClick={() => setShowAllPresets((prev) => !prev)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {showAllPresets
                  ? 'Show less'
                  : `All presets (${QUICK_FANCY_PRESETS.length})`}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {visiblePresets.map((preset) => {
                const isSelected =
                  customerName.trim().toLowerCase() ===
                  preset.name.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer truncate ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title={`${preset.name} (${preset.hex})`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                      style={
                        isMultiColorName(preset.name)
                          ? { background: MULTI_COLOR_GRADIENT }
                          : { backgroundColor: preset.hex }
                      }
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION B — COLOR INFORMATION */}
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
              {/* 1. Base / Actual Color */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Base / Actual Color <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 absolute left-3 pointer-events-none"
                    style={
                      isMultiColorName(baseColorName)
                        ? { background: MULTI_COLOR_GRADIENT }
                        : { backgroundColor: currentBaseMeta.sampleHex }
                    }
                  />
                  <select
                    value={baseColorName}
                    onChange={(e) => handleSelectBaseColor(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-slate-900 cursor-pointer appearance-none transition-colors"
                  >
                    {BASE_COLORS.map((base) => (
                      <option key={base.id} value={base.name}>
                        {base.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>

              {/* 2. Customer-Facing Premium Name + Compact Autocomplete Dropdown */}
              <div ref={suggestionsRef} className="relative">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Customer-Facing Premium Name{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder={`e.g. ${
                      availableSuggestions[0]?.name || 'Sage Green'
                    }`}
                    value={customerName}
                    onFocus={() => setShowSuggestionsDropdown(true)}
                    onChange={handleCustomerNameChange}
                    className="w-full pl-3 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 text-slate-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowSuggestionsDropdown((prev) => !prev)
                    }
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="View color name suggestions"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compact Autocomplete / Dropdown Menu */}
                {showSuggestionsDropdown && suggestionsToDisplay.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto py-1">
                    <div className="px-2.5 py-1 text-[10px] font-medium text-slate-400 flex items-center justify-between border-b border-slate-100">
                      <span>Suggestions for {baseColorName}</span>
                      <span>SKU</span>
                    </div>
                    {suggestionsToDisplay.map((sug) => {
                      const isCurrent =
                        customerName.trim().toLowerCase() ===
                        sug.name.toLowerCase();
                      return (
                        <button
                          key={sug.name}
                          type="button"
                          onClick={() => handleSelectSuggestion(sug)}
                          className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-slate-50 font-semibold text-slate-900'
                              : 'text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                              style={
                                isMultiColorName(sug.name, baseColorName)
                                  ? { background: MULTI_COLOR_GRADIENT }
                                  : { backgroundColor: sug.hex }
                              }
                            />
                            <span className="truncate">{sug.name}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 ml-2 shrink-0">
                            {sug.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Compact Inline Top Suggestions Below Name Input */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {availableSuggestions.slice(0, 4).map((sug) => {
                    const isSelected =
                      customerName.trim().toLowerCase() ===
                      sug.name.toLowerCase();
                    return (
                      <button
                        key={sug.name}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full border border-black/15 shrink-0"
                          style={
                            isMultiColorName(sug.name, baseColorName)
                              ? { background: MULTI_COLOR_GRADIENT }
                              : { backgroundColor: sug.hex }
                          }
                        />
                        <span>{sug.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C — ADVANCED COLOR DETAILS (Collapsible) */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedDetails((prev) => !prev)}
              className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
            >
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Advanced Color Details</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Shade picker, HEX &amp; SKU)
                </span>
              </span>

              <div className="flex items-center gap-2">
                {/* Compact Live Color Preview Summary */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                    style={
                      isMultiColorName(customerName, baseColorName)
                        ? { background: MULTI_COLOR_GRADIENT }
                        : { backgroundColor: displayHex }
                    }
                  />
                  <span className="font-mono text-[10px]">{displayHex}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-[10px] font-semibold text-slate-700">
                    {effectiveCode}
                  </span>
                </div>
                {showAdvancedDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {showAdvancedDetails && (
              <div className="mt-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  {/* Visual Swatch & Color Picker */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Visual Swatch
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                      <input
                        type="color"
                        value={displayHex}
                        onChange={handlePickerChange}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                        title="Select exact garment shade"
                      />
                      <span className="text-xs text-slate-700 font-medium truncate">
                        Pick Shade
                      </span>
                    </label>
                  </div>

                  {/* Exact HEX Color Value */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-slate-600">
                        HEX Value
                      </label>
                      {isHexValid && (
                        <button
                          type="button"
                          onClick={handleCopyHex}
                          className="text-[10px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          {copiedHex ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                          <span>{copiedHex ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="#82976F"
                      value={hexValue}
                      onChange={handleHexInputChange}
                      className={`w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border outline-none transition-colors ${
                        !hexValue || isHexValid
                          ? 'bg-white border-slate-200 focus:border-slate-900 text-slate-900'
                          : 'bg-rose-50 border-rose-300 text-rose-700'
                      }`}
                    />
                  </div>

                  {/* Internal SKU Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-slate-600">
                        SKU Code
                      </label>
                      <span className="text-[10px] text-slate-400">Auto</span>
                    </div>
                    <input
                      type="text"
                      placeholder="SG"
                      value={colorCode}
                      onChange={(e) => {
                        setColorCode(e.target.value.toUpperCase());
                        setHasManualCode(true);
                      }}
                      maxLength={4}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-medium uppercase rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900 text-slate-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Compact Live Color Preview & Sample From Image Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full border border-black/15 shrink-0"
                      style={
                        isMultiColorName(customerName, baseColorName)
                          ? { background: MULTI_COLOR_GRADIENT }
                          : { backgroundColor: displayHex }
                      }
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        {customerName.trim() || baseColorName}
                      </span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {displayHex}
                      </span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        SKU: -{effectiveCode}
                      </span>
                    </div>
                  </div>

                  {(primaryImage || galleryImages.length > 0) && (
                    <button
                      type="button"
                      onClick={handleExtractFromImage}
                      disabled={isExtractingColor}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Pipette className="w-3 h-3 text-slate-500" />
                      <span>
                        {isExtractingColor ? 'Sampling...' : 'Sample From Image'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION D — COLOR-SPECIFIC PRODUCT IMAGES */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">
                  Color-Specific Images
                </span>
                {galleryImages.length > 0 && (
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    ({galleryImages.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  <span>{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUrlInput((prev) => !prev)}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Add URL</span>
                </button>
              </div>
            </div>

            {showAddUrlInput && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/garment-image.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomImageUrl();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomImageUrl}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {/* Thumbnail Grid or Compact Empty State */}
            {galleryImages.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {galleryImages.map((img, idx) => {
                  const isPrimary =
                    primaryImage === img || (!primaryImage && idx === 0);
                  const isBroken = brokenImages[img];

                  return (
                    <div
                      key={`${img}-${idx}`}
                      className={`relative aspect-3/4 rounded-lg overflow-hidden border group bg-slate-50 transition-all ${
                        isPrimary
                          ? 'border-slate-900 ring-1 ring-slate-900'
                          : 'border-slate-200'
                      }`}
                    >
                      {!isBroken ? (
                        <img
                          src={img}
                          alt={`${customerName || baseColorName} view ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [img]: true }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-100 text-slate-400">
                          <ImageIcon className="w-4 h-4 mb-1" />
                          <span className="text-[9px] leading-tight">
                            Unavailable
                          </span>
                        </div>
                      )}

                      {isPrimary && (
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/90 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                          Main
                        </span>
                      )}

                      {/* Hover Controls: Set Main, Reorder Left/Right, Delete */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5 transition-opacity">
                        <div className="flex items-center justify-end gap-1">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => {
                                setPrimaryImage(img);
                                setGalleryImages((prev) => [
                                  img,
                                  ...prev.filter((i) => i !== img),
                                ]);
                              }}
                              className="p-1 bg-white/95 text-slate-900 rounded hover:bg-white cursor-pointer"
                              title="Set as Main Image"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(img)}
                            className="p-1 bg-white/95 text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {galleryImages.length > 1 && (
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveImage(idx, -1)}
                              className="p-0.5 bg-white/90 text-slate-800 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === galleryImages.length - 1}
                              onClick={() => handleMoveImage(idx, 1)}
                              className="p-0.5 bg-white/90 text-slate-800 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-3 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-500 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                <span>Upload images for this color variation (optional)</span>
              </button>
            )}
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="color-variation-form"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Save Color' : 'Save Color'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
