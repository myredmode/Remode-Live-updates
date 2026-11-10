import React, { useState, useEffect } from 'react';
import {
  Layers,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  Eye,
  Sliders,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Sparkles,
  Link as LinkIcon,
  Tag,
  FolderPlus,
  CheckCircle2,
  X,
  Play,
  Pause,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Cloud,
  Loader2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Category, Subcategory, HeroBanner, MenuHighlightItem } from '../../types';
import { getCacheBustedUrl } from '../../utils/cacheBuster';
import { compressImage } from '../../utils/imageUpload';
import { useUploadedImages } from '../../utils/userUploadedImages';

interface CategoriesAndBannersManagerProps {
  onSaveNotification?: (msg: string) => void;
}

export const CategoriesAndBannersManager: React.FC<CategoriesAndBannersManagerProps> = ({
  onSaveNotification,
}) => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    syncCategoriesToCloud,
    addSubcategory,
    deleteSubcategory,
    addSubSubcategory,
    deleteSubSubcategory,
    banners,
    addBanner,
    updateBanner,
    deleteBanner,
    menuHighlights,
    updateMenuHighlights,
    toggleMenuHighlight,
    addMenuHighlight,
    deleteMenuHighlight,
    products,
  } = useStore();

  const { images: uploadedImages, addImage, removeImage } = useUploadedImages();

  // If no uploaded photos yet in recommendation library, auto-seed from existing products
  useEffect(() => {
    if (uploadedImages.length === 0 && products && products.length > 0) {
      products.slice(0, 15).forEach((p) => {
        if (p.mainImage) {
          addImage(p.mainImage, p.name);
        }
      });
    }
  }, [products, uploadedImages.length, addImage]);

  const [activeTab, setActiveTab] = useState<'categories' | 'banners' | 'menu-highlights'>('categories');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dedicated in-app Delete Confirmation Modal state (Iframe-safe)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'subcategory' | 'banner' | 'menu-highlight';
    id: string;
    name: string;
    parentCatId?: string;
  } | null>(null);

  // Menu Highlights Modal state
  const [editingHighlight, setEditingHighlight] = useState<MenuHighlightItem | null>(null);
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [highlightTitleInput, setHighlightTitleInput] = useState('');
  const [highlightBadgeInput, setHighlightBadgeInput] = useState('');
  const [highlightBadgeColor, setHighlightBadgeColor] = useState<'rose' | 'dark' | 'emerald' | 'amber' | 'blue'>('rose');
  const [highlightTargetType, setHighlightTargetType] = useState<'tag' | 'category' | 'all'>('tag');
  const [highlightTargetValue, setHighlightTargetValue] = useState('new-launch');
  const [highlightIsEnabled, setHighlightIsEnabled] = useState(true);

  // Category Edit / Create Modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catSlugInput, setCatSlugInput] = useState('');
  const [catImageInput, setCatImageInput] = useState('');
  const [catBannerInput, setCatBannerInput] = useState('');
  const [catTaglineInput, setCatTaglineInput] = useState('');
  const [catShowOnHome, setCatShowOnHome] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Subcategory Edit / Create Modal state
  const [subModalTargetCat, setSubModalTargetCat] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [subNameInput, setSubNameInput] = useState('');
  const [subSlugInput, setSubSlugInput] = useState('');
  const [subImageInput, setSubImageInput] = useState('');
  const [subBannerInput, setSubBannerInput] = useState('');
  const [subSubList, setSubSubList] = useState<Subcategory[]>([]);
  const [newSubSubName, setNewSubSubName] = useState('');

  // Hero Banner Edit / Create Modal state
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [bannerTitleInput, setBannerTitleInput] = useState('');
  const [bannerTaglineInput, setBannerTaglineInput] = useState('');
  const [bannerSubtitleInput, setBannerSubtitleInput] = useState('');
  const [bannerImageInput, setBannerImageInput] = useState('');
  const [bannerTargetCatInput, setBannerTargetCatInput] = useState('');
  const [bannerActiveInput, setBannerActiveInput] = useState(true);

  // Banner Live Carousel Preview State
  const [previewBannerIndex, setPreviewBannerIndex] = useState(0);
  const [isPreviewBannerPlaying, setIsPreviewBannerPlaying] = useState(true);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    if (onSaveNotification && type === 'success') {
      onSaveNotification(text);
    }
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // -------------------------------------------------------------
  // HELPER: FILE TO COMPRESSED BASE64 DATA URL
  // -------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1200, 800, 0.75);
      if (compressed) {
        setter(compressed);
        addImage(compressed, file.name.replace(/\.[^/.]+$/, ''));
        showStatus('Photo uploaded successfully!', 'success');
      }
    } catch {
      showStatus('Failed to process image file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // -------------------------------------------------------------
  // CATEGORY ACTIONS
  // -------------------------------------------------------------
  const openCreateCategory = () => {
    setCatNameInput('');
    setCatSlugInput('');
    setCatImageInput('');
    setCatBannerInput('');
    setCatTaglineInput('');
    setCatShowOnHome(true);
    setEditingCategory(null);
    setIsCreatingCategory(true);
  };

  const openEditCategory = (cat: Category) => {
    setCatNameInput(cat.name);
    setCatSlugInput(cat.slug);
    setCatImageInput(cat.imageUrl || '');
    setCatBannerInput(cat.bannerUrl || '');
    setCatTaglineInput(cat.tagline || '');
    setCatShowOnHome(cat.showOnHome !== false);
    setEditingCategory(cat);
    setIsCreatingCategory(false);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catNameInput.trim();
    if (!cleanName) {
      showStatus('Category Name is required.', 'error');
      return;
    }
    const cleanSlug = (catSlugInput.trim() || cleanName.toLowerCase().replace(/\s+/g, '-')).replace(/[^a-z0-9-]/g, '');

    setIsSavingCategory(true);
    try {
      if (isCreatingCategory) {
        const newCategory: Category = {
          id: `cat-${Date.now()}`,
          name: cleanName,
          slug: cleanSlug,
          order: categories.length + 1,
          imageUrl: catImageInput.trim(),
          bannerUrl: catBannerInput.trim() || catImageInput.trim(),
          tagline: catTaglineInput.trim(),
          showOnHome: catShowOnHome,
          subcategories: [],
        };
        await addCategory(cleanName, newCategory);
        setIsCreatingCategory(false);
        showStatus(`Category "${cleanName}" created and synced to Cloud! ☁️✅`);
      } else if (editingCategory) {
        const updatedImg = catImageInput.trim();
        await updateCategory(editingCategory.id, {
          name: cleanName,
          slug: cleanSlug,
          imageUrl: updatedImg,
          bannerUrl: updatedImg || catBannerInput.trim(),
          tagline: catTaglineInput.trim(),
          showOnHome: catShowOnHome,
        });
        setEditingCategory(null);
        showStatus(`Category "${cleanName}" photo saved & live on all devices! ☁️✅`);
      }
    } catch (err) {
      console.error('Failed to save category:', err);
      showStatus('Failed to save category. Please try again.', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    setDeleteTarget({
      type: 'category',
      id: cat.id,
      name: cat.name,
    });
  };

  // Consistently sorted categories list by order index
  const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Reorder Category Up/Down
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sortedCategories.length) return;

    const reordered = [...sortedCategories];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    // Persist new sequence atomically across state, localStorage, IndexedDB, and Cloud Firestore
    await reorderCategories(reordered);
    showStatus('Category sequence updated & synced to Cloud! ✅');
  };

  // -------------------------------------------------------------
  // SUBCATEGORY ACTIONS
  // -------------------------------------------------------------
  const openAddSubcategory = (cat: Category) => {
    setSubModalTargetCat(cat);
    setEditingSubcategory(null);
    setSubNameInput('');
    setSubSlugInput('');
    setSubImageInput('');
    setSubBannerInput('');
    setSubSubList([]);
    setNewSubSubName('');
  };

  const openEditSubcategory = (cat: Category, sub: Subcategory) => {
    setSubModalTargetCat(cat);
    setEditingSubcategory(sub);
    setSubNameInput(sub.name);
    setSubSlugInput(sub.slug);
    setSubImageInput(sub.imageUrl || '');
    setSubBannerInput(sub.bannerUrl || '');
    setSubSubList(Array.isArray(sub.subcategories) ? sub.subcategories : (sub as any).childCategories || []);
    setNewSubSubName('');
  };

  const handleSaveSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subModalTargetCat) return;

    const cleanName = subNameInput.trim();
    if (!cleanName) {
      showStatus('Subcategory Name is required.', 'error');
      return;
    }
    const cleanSlug = (subSlugInput.trim() || cleanName.toLowerCase().replace(/\s+/g, '-')).replace(/[^a-z0-9-]/g, '');

    const currentSubs = Array.isArray(subModalTargetCat.subcategories) ? [...subModalTargetCat.subcategories] : [];
    const finalImage = subImageInput.trim();
    const finalBanner = subBannerInput.trim() || finalImage;

    if (editingSubcategory) {
      // Update existing subcategory
      const updatedSubs = currentSubs.map((s) =>
        s.id === editingSubcategory.id
          ? {
              ...s,
              name: cleanName,
              slug: cleanSlug,
              imageUrl: finalImage,
              bannerUrl: finalBanner,
              subcategories: subSubList,
            }
          : s
      );
      updateCategory(subModalTargetCat.id, { subcategories: updatedSubs });
      showStatus(`Subcategory "${cleanName}" and varieties updated! ✅`);
    } else {
      // Add new subcategory
      const newSub: Subcategory = {
        id: `sub-${Date.now()}`,
        name: cleanName,
        slug: cleanSlug,
        imageUrl: finalImage,
        bannerUrl: finalBanner,
        subcategories: subSubList,
      };
      updateCategory(subModalTargetCat.id, { subcategories: [...currentSubs, newSub] });
      showStatus(`Subcategory "${cleanName}" added successfully! ✅`);
    }

    setSubModalTargetCat(null);
    setEditingSubcategory(null);
  };

  const handleDeleteSubcategory = (cat: Category, subId: string, subName?: string) => {
    setDeleteTarget({
      type: 'subcategory',
      id: subId,
      name: subName || 'Subcategory',
      parentCatId: cat.id,
    });
  };

  // -------------------------------------------------------------
  // HERO SLIDE BANNER ACTIONS
  // -------------------------------------------------------------
  const openCreateBanner = () => {
    setBannerTitleInput('');
    setBannerTaglineInput("AUTUMN / WINTER '26");
    setBannerSubtitleInput('Curated Festive & Handcrafted Kurtis');
    setBannerImageInput('');
    setBannerTargetCatInput(categories[0]?.slug || 'kurti');
    setBannerActiveInput(true);
    setEditingBanner(null);
    setIsCreatingBanner(true);
  };

  const openEditBanner = (banner: HeroBanner) => {
    setBannerTitleInput(banner.title);
    setBannerTaglineInput(banner.tagline || '');
    setBannerSubtitleInput(banner.subtitle || '');
    setBannerImageInput(banner.imageUrl);
    setBannerTargetCatInput(banner.targetCategory || 'kurti');
    setBannerActiveInput(banner.active !== false);
    setEditingBanner(banner);
    setIsCreatingBanner(false);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageInput.trim()) {
      showStatus('Please provide a banner image URL or upload a file.', 'error');
      return;
    }

    const bannerData = {
      title: bannerTitleInput.trim() || 'THE WALK 7.0 AW’26',
      tagline: bannerTaglineInput.trim() || "AUTUMN / WINTER '26",
      subtitle: bannerSubtitleInput.trim(),
      imageUrl: bannerImageInput.trim(),
      targetCategory: bannerTargetCatInput.trim() || 'Kurti',
      active: bannerActiveInput,
      order: editingBanner ? editingBanner.order : banners.length + 1,
      buttonText: 'EXPLORE COLLECTION',
    };

    if (isCreatingBanner) {
      addBanner(bannerData);
      setIsCreatingBanner(false);
      showStatus('New Home Slide Banner created! ✅');
    } else if (editingBanner) {
      updateBanner({
        ...editingBanner,
        ...bannerData,
      });
      setEditingBanner(null);
      showStatus('Home Slide Banner updated successfully! ✅');
    }
  };

  const handleDeleteBanner = (banner: HeroBanner) => {
    if (banners.length <= 1) {
      showStatus('At least 1 hero banner must remain active.', 'error');
      return;
    }
    setDeleteTarget({
      type: 'banner',
      id: banner.id,
      name: banner.title,
    });
  };

  const confirmExecuteDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'category') {
      deleteCategory(deleteTarget.id);
      showStatus(`Category "${deleteTarget.name}" deleted successfully.`);
    } else if (deleteTarget.type === 'subcategory' && deleteTarget.parentCatId) {
      deleteSubcategory(deleteTarget.parentCatId, deleteTarget.id);
      showStatus(`Subcategory "${deleteTarget.name}" deleted successfully.`);
    } else if (deleteTarget.type === 'banner') {
      deleteBanner(deleteTarget.id);
      showStatus(`Slide banner "${deleteTarget.name}" deleted successfully.`);
    } else if (deleteTarget.type === 'menu-highlight') {
      deleteMenuHighlight(deleteTarget.id);
      showStatus(`Menu highlight "${deleteTarget.name}" deleted successfully.`);
    }

    setDeleteTarget(null);
  };

  const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const reordered = [...banners];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    reordered.forEach((b, idx) => {
      updateBanner({ ...b, order: idx + 1 });
    });
    showStatus('Slide banner order updated! ✅');
  };

  // -------------------------------------------------------------
  // MENU HIGHLIGHTS & LAUNCHES ACTIONS
  // -------------------------------------------------------------
  const openCreateHighlight = () => {
    setIsCreatingHighlight(true);
    setEditingHighlight(null);
    setHighlightTitleInput('');
    setHighlightBadgeInput('');
    setHighlightBadgeColor('rose');
    setHighlightTargetType('tag');
    setHighlightTargetValue('new-launch');
    setHighlightIsEnabled(true);
  };

  const openEditHighlight = (item: MenuHighlightItem) => {
    setEditingHighlight(item);
    setIsCreatingHighlight(false);
    setHighlightTitleInput(item.title);
    setHighlightBadgeInput(item.badge || '');
    setHighlightBadgeColor(item.badgeColor || 'rose');
    setHighlightTargetType(item.targetType || 'tag');
    setHighlightTargetValue(item.targetValue || '');
    setHighlightIsEnabled(item.isEnabled);
  };

  const handleSaveHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = highlightTitleInput.trim();
    if (!cleanTitle) {
      showStatus('Menu Highlight Title is required.', 'error');
      return;
    }

    const itemData: Omit<MenuHighlightItem, 'id'> = {
      title: cleanTitle,
      badge: highlightBadgeInput.trim() || undefined,
      badgeColor: highlightBadgeColor,
      targetType: highlightTargetType,
      targetValue: highlightTargetValue.trim() || undefined,
      isEnabled: highlightIsEnabled,
      order: editingHighlight ? editingHighlight.order : menuHighlights.length + 1,
    };

    if (isCreatingHighlight) {
      addMenuHighlight(itemData);
      setIsCreatingHighlight(false);
      showStatus(`Menu Highlight "${cleanTitle}" created! ✅`);
    } else if (editingHighlight) {
      const updated = menuHighlights.map((h) =>
        h.id === editingHighlight.id ? { ...h, ...itemData } : h
      );
      updateMenuHighlights(updated);
      setEditingHighlight(null);
      showStatus(`Menu Highlight "${cleanTitle}" updated! ✅`);
    }
  };

  const handleDeleteHighlight = (item: MenuHighlightItem) => {
    setDeleteTarget({
      type: 'menu-highlight',
      id: item.id,
      name: item.title,
    });
  };

  const handleMoveHighlight = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= menuHighlights.length) return;

    const reordered = [...menuHighlights];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const updated = reordered.map((h, idx) => ({ ...h, order: idx + 1 }));
    updateMenuHighlights(updated);
    showStatus('Menu highlights sequence updated! ✅');
  };

  const applyHighlightPreset = (
    title: string,
    badge: string,
    color: 'rose' | 'dark' | 'emerald' | 'amber' | 'blue',
    targetType: 'tag' | 'category' | 'all',
    targetValue: string
  ) => {
    addMenuHighlight({
      title,
      badge,
      badgeColor: color,
      targetType,
      targetValue,
      isEnabled: true,
      order: menuHighlights.length + 1,
    });
    showStatus(`Added "${title}" highlight to menu! ✅`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
              Categories &amp; Visual Media
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Organize catalog categories, subcategory image tiles, and promotional hero banners
            </p>
          </div>
        </div>

        {/* Action Buttons depending on active tab */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'categories' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  showStatus('Syncing categories to Cloud across all devices...', 'success');
                  const res = await syncCategoriesToCloud();
                  if (res.success) {
                    showStatus(`All ${res.count} categories synced to Cloud & mobile! ☁️✅`, 'success');
                  } else {
                    showStatus('Sync encountered an issue.', 'error');
                  }
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                title="Push current categories to cloud for mobile and visitors"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Sync to Cloud</span>
              </button>
              <button
                type="button"
                onClick={openCreateCategory}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          )}
          {activeTab === 'banners' && (
            <button
              type="button"
              onClick={openCreateBanner}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Slide Banner</span>
            </button>
          )}
          {activeTab === 'menu-highlights' && (
            <button
              type="button"
              onClick={openCreateHighlight}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Menu Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-zinc-100 text-zinc-800 border border-zinc-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TABS NAVIGATION                                           */}
      {/* ========================================================= */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
            activeTab === 'categories'
              ? 'border-zinc-900 text-zinc-900 font-semibold bg-zinc-50/70'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
          }`}
        >
          <Layers className="w-4 h-4 text-zinc-500" />
          <span>Categories &amp; Subcategories ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
            activeTab === 'banners'
              ? 'border-zinc-900 text-zinc-900 font-semibold bg-zinc-50/70'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-zinc-500" />
          <span>Hero Banners ({banners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu-highlights')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
            activeTab === 'menu-highlights'
              ? 'border-zinc-900 text-zinc-900 font-semibold bg-zinc-50/70'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-zinc-500" />
          <span>Menu Highlights ({menuHighlights.length})</span>
          {menuHighlights.some((h) => h.isEnabled) && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active in customer menu" />
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CATEGORIES & SUBCATEGORIES MANAGER                 */}
      {/* ========================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5">
            {sortedCategories.map((cat, catIdx) => (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5 hover:border-zinc-300 transition duration-150"
              >
                {/* Category Main Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                  <div className="flex items-center gap-4">
                    {/* Category Photo Thumbnail with clean preview overlay */}
                    <div className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200 group">
                      {cat.imageUrl ? (
                        <img
                          src={getCacheBustedUrl(cat.imageUrl, cat.updatedAt || cat.order)}
                          alt={cat.name}
                          className="w-full h-full object-cover object-top transition duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 p-1 text-center">
                          <ImageIcon className="w-5 h-5 opacity-40 mb-1" />
                          <span className="text-[9px] font-medium leading-tight">No photo</span>
                        </div>
                      )}
                      {cat.imageUrl && (
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* Name, Index & Minimal Status */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-medium text-zinc-400">
                          #{String(catIdx + 1).padStart(2, '0')}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-wide uppercase">
                          {cat.name}
                        </h3>

                        {/* Subtle unboxed status indicator */}
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-medium ml-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cat.showOnHome !== false ? 'bg-emerald-500' : 'bg-zinc-300'
                            }`}
                          />
                          {cat.showOnHome !== false ? 'Live on Home' : 'Hidden'}
                        </span>
                      </div>

                      {/* Clean metadata line */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500">
                        <span className="font-mono text-zinc-600">/{cat.slug}</span>
                        {cat.tagline && (
                          <>
                            <span className="text-zinc-300">•</span>
                            <span className="text-zinc-500">{cat.tagline}</span>
                          </>
                        )}
                        {cat.bannerUrl && (
                          <>
                            <span className="text-zinc-300">•</span>
                            <span className="inline-flex items-center gap-1 text-zinc-600 font-medium">
                              <ImageIcon className="w-3 h-3 text-zinc-400" /> Hero banner
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unified, sleek action toolbar */}
                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    {/* Reorder control segment */}
                    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50/70 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(catIdx, 'up')}
                        disabled={catIdx === 0}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-md disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(catIdx, 'down')}
                        disabled={catIdx === sortedCategories.length - 1}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-md disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit Category Info */}
                    <button
                      type="button"
                      onClick={() => openEditCategory(cat)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-lg transition shadow-2xs cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Category */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Section */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                        Subcategories ({cat.subcategories?.length || 0})
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Customer photo tiles
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddSubcategory(cat)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200/80 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Add Subcategory</span>
                    </button>
                  </div>

                  {(!cat.subcategories || cat.subcategories.length === 0) ? (
                    <div className="p-4 rounded-xl bg-zinc-50/70 border border-dashed border-zinc-200 text-center text-xs text-zinc-400">
                      No subcategories added yet. Click &quot;Add Subcategory&quot; to add styles like Long Kurti, Anarkali, etc.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {cat.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="group relative bg-white border border-zinc-200/90 rounded-lg overflow-hidden p-2 hover:border-zinc-300 transition duration-150"
                        >
                          {/* Subcategory Photo Thumbnail */}
                          <div className="w-full aspect-[4/5] rounded-md overflow-hidden bg-zinc-100 mb-2 relative">
                            <img
                              src={getCacheBustedUrl(
                                sub.imageUrl ||
                                  cat.imageUrl ||
                                  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=400&q=80',
                                cat.updatedAt || cat.order
                              )}
                              alt={sub.name}
                              className="w-full h-full object-cover object-top transition duration-200 group-hover:scale-105"
                            />
                            {/* Hover Action Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditSubcategory(cat, sub)}
                                className="p-1.5 rounded-md bg-white text-zinc-800 hover:bg-zinc-100 shadow-sm transition cursor-pointer"
                                title="Edit Subcategory"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcategory(cat, sub.id, sub.name)}
                                className="p-1.5 rounded-md bg-zinc-900 text-white hover:bg-rose-600 shadow-sm transition cursor-pointer"
                                title="Delete Subcategory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-0.5 px-0.5">
                            <h5 className="text-xs font-medium text-zinc-900 truncate">
                              {sub.name}
                            </h5>
                            <p className="text-[10px] text-zinc-400 font-mono truncate">
                              /{sub.slug}
                            </p>

                            {/* Sub-Subcategory / Variety Styles */}
                            <div className="pt-1.5 border-t border-zinc-100 mt-1">
                              {sub.subcategories && sub.subcategories.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {sub.subcategories.map((child: any) => (
                                      <span
                                        key={child.id || child.slug}
                                        className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200"
                                      >
                                        <span>{child.name}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSubSubcategory(cat.id, sub.id, child.id || child.slug);
                                          }}
                                          className="text-zinc-400 hover:text-rose-600 cursor-pointer"
                                          title="Remove style"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] text-zinc-400 italic block">No variety styles</span>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditSubcategory(cat, sub)}
                                className="w-full mt-1.5 text-center text-[10px] font-semibold text-zinc-700 hover:text-black py-0.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-300 transition cursor-pointer"
                              >
                                + Variety
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HOME TOP SLIDER (HERO BANNERS CAROUSEL)            */}
      {/* ========================================================= */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          {/* Top Banner Slider Live Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Home Top Slider Live Preview
                </h3>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                  Slides every 3.8s on Website
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewBannerPlaying(!isPreviewBannerPlaying)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  {isPreviewBannerPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Preview
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600" /> Auto-Play Preview
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Slider Mockup */}
            {banners.length > 0 && (
              <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden bg-zinc-950 border border-slate-200 shadow-inner group">
                <img
                  src={banners[previewBannerIndex]?.imageUrl || banners[0]?.imageUrl}
                  alt={banners[previewBannerIndex]?.title || 'Hero Banner'}
                  className="w-full h-full object-cover object-center transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-6 px-6 text-center text-white pointer-events-none">
                  <span className="text-[10px] sm:text-xs tracking-[0.25em] font-semibold text-zinc-300 uppercase mb-1 drop-shadow">
                    {banners[previewBannerIndex]?.tagline || "AUTUMN / WINTER '26"}
                  </span>
                  <h3 className="text-xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-white drop-shadow">
                    {banners[previewBannerIndex]?.title || 'THE WALK 7.0 AW’26'}
                  </h3>
                  {banners[previewBannerIndex]?.subtitle && (
                    <p className="text-xs sm:text-sm text-zinc-200 tracking-wider uppercase mt-1 font-light max-w-md mx-auto drop-shadow">
                      {banners[previewBannerIndex]?.subtitle}
                    </p>
                  )}
                  <div className="mt-3">
                    <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white border border-white/30">
                      Target: {banners[previewBannerIndex]?.targetCategory || 'Kurti'}
                    </span>
                  </div>
                </div>

                {/* Slider Dot Selectors */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {banners.map((_, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={() => setPreviewBannerIndex(bIdx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        bIdx === previewBannerIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List of Hero Banners */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#E52229]" />
                All Sliding Campaign Banners ({banners.length})
              </h3>
              <button
                type="button"
                onClick={openCreateBanner}
                className="px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Banner</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {banners.map((b, bIdx) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-sm transition flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/9] w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/75 text-white backdrop-blur-xs">
                        Slide #{bIdx + 1}
                      </span>
                      {b.active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600/90 text-white backdrop-blur-xs">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-700/90 text-zinc-300 backdrop-blur-xs">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-2 flex-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      {b.tagline || 'NO TAGLINE'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 uppercase">
                      {b.title}
                    </h4>
                    {b.subtitle && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {b.subtitle}
                      </p>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>Click Destination:</span>
                      <span className="font-bold text-black uppercase">
                        {b.targetCategory || 'Kurti'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveBanner(bIdx, 'up')}
                        disabled={bIdx === 0}
                        className={`p-1.5 rounded-lg border border-slate-200 bg-white transition cursor-pointer ${
                          bIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        title="Move Earlier in Slide Show"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBanner(bIdx, 'down')}
                        disabled={bIdx === banners.length - 1}
                        className={`p-1.5 rounded-lg border border-slate-200 bg-white transition cursor-pointer ${
                          bIdx === banners.length - 1
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        title="Move Later in Slide Show"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditBanner(b)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-black bg-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(b)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MENU HIGHLIGHTS & NEW LAUNCHES MANAGER             */}
      {/* ========================================================= */}
      {activeTab === 'menu-highlights' && (
        <div className="space-y-6">
          {/* Header & Quick Explanation Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Menu Highlights, New Launches &amp; Campaign Tags
                </h3>
              </div>

              <button
                type="button"
                onClick={openCreateHighlight}
                className="px-4 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Menu Launch</span>
              </button>
            </div>

            {/* Quick 1-Click Launch Presets */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Quick 1-Click Templates:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyHighlightPreset('NEW LAUNCH • FRESH ARRIVALS', 'NEW', 'rose', 'tag', 'new-launch')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-black text-xs font-semibold text-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>+ New Launch</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyHighlightPreset('BESTSELLERS', 'HOT', 'dark', 'tag', 'bestseller')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-black text-xs font-semibold text-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Tag className="w-3.5 h-3.5 text-zinc-900" />
                  <span>+ Bestsellers</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyHighlightPreset("FESTIVE EDIT '26", 'FESTIVE', 'amber', 'tag', 'festive')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-black text-xs font-semibold text-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>+ Festive Collection</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyHighlightPreset('EXCLUSIVE DROP', 'VIP', 'emerald', 'tag', 'exclusive')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-black text-xs font-semibold text-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Exclusive Drop</span>
                </button>
              </div>
            </div>
          </div>

          {/* Highlights List & Controls */}
          <div className="space-y-3">
            {menuHighlights.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No Menu Highlights Created</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The menu drawer currently displays clean categories only. You can add a new launch or festive tag to showcase above categories whenever you run a campaign.
                </p>
                <button
                  type="button"
                  onClick={openCreateHighlight}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Menu Highlight</span>
                </button>
              </div>
            ) : (
              menuHighlights.map((item, idx) => {
                const matchingProductsCount = products.filter((p) => {
                  if (p.published === false) return false;
                  if (item.targetType === 'category' && item.targetValue) {
                    return p.category.toLowerCase().includes(item.targetValue.toLowerCase());
                  }
                  if (item.targetType === 'tag' && item.targetValue) {
                    const tv = item.targetValue.toLowerCase();
                    if (tv.includes('new') || tv.includes('launch')) return p.isNewLaunch || p.isNewArrival || p.offerTag?.toLowerCase().includes('new');
                    if (tv.includes('best')) return p.isBestseller || p.offerTag?.toLowerCase().includes('best');
                    if (tv.includes('fest')) return p.isFestive || p.offerTag?.toLowerCase().includes('festive') || p.category.toLowerCase().includes('set');
                    return p.offerTag?.toLowerCase().includes(tv) || p.tags?.some((t) => t.toLowerCase().includes(tv));
                  }
                  return true;
                }).length;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      item.isEnabled ? 'border-slate-300/90' : 'border-slate-200/60 opacity-70 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Sequence Buttons */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveHighlight(idx, 'up')}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === menuHighlights.length - 1}
                          onClick={() => handleMoveHighlight(idx, 'down')}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Info & Live Badge Preview */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 tracking-wide uppercase">
                            {item.title}
                          </span>

                          {item.badge && (
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-extrabold tracking-wider ${
                                item.badgeColor === 'rose'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : item.badgeColor === 'dark'
                                  ? 'bg-zinc-900 text-white'
                                  : item.badgeColor === 'emerald'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.badgeColor === 'amber'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-mono">
                            (Position #{idx + 1})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>
                              Target:{' '}
                              <strong>
                                {item.targetType === 'tag'
                                  ? `Tagged: "${item.targetValue || 'all'}"`
                                  : item.targetType === 'category'
                                  ? `Category: "${item.targetValue}"`
                                  : 'All Products'}
                              </strong>
                            </span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">
                            {matchingProductsCount} matching products in catalog
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Show/Hide Switch + Edit + Delete */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      {/* 1-Click Show / Hide Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleMenuHighlight(item.id);
                          showStatus(
                            `Menu item "${item.title}" is now ${
                              !item.isEnabled ? 'SHOWN in menu ✅' : 'HIDDEN from menu ⛔'
                            }`
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                          item.isEnabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/80'
                        }`}
                        title={item.isEnabled ? 'Click to HIDE from customer menu' : 'Click to SHOW in customer menu'}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{item.isEnabled ? 'SHOWN IN MENU' : 'HIDDEN FROM MENU'}</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditHighlight(item)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-black bg-white text-xs font-semibold text-slate-700 transition flex items-center gap-1 cursor-pointer"
                        title="Edit Menu Highlight"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(item)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Menu Highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}



      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT CATEGORY                             */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* FULL PAGE STUDIO: CREATE / EDIT CATEGORY                   */}
      {/* ========================================================= */}
      {(isCreatingCategory || editingCategory) && (
        <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* STICKY TOP HEADER */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCategory(false);
                  setEditingCategory(null);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-700" />
                <span>Back to Categories</span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {isCreatingCategory ? 'Add New Category' : `Edit Category: ${editingCategory?.name}`}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCategory(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="category-fullpage-form"
                disabled={isSavingCategory}
                className="px-5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isSavingCategory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{isCreatingCategory ? 'Save & Create Category' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* SCROLLABLE FULL PAGE BODY */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              <form id="category-fullpage-form" onSubmit={handleSaveCategory} className="space-y-6">

                {/* CARD 1: Identity & Slug */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-black" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Category Identity
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={catNameInput}
                        onChange={(e) => setCatNameInput(e.target.value)}
                        placeholder="e.g. Kurti, Trouser, Co-Ord Sets"
                        className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none transition"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Shown in customer navigation, header, and home editorial tiles.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={catSlugInput}
                        onChange={(e) => setCatSlugInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="e.g. kurti, trouser"
                        className="w-full text-xs font-mono px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Tagline / Catchphrase (Optional)
                    </label>
                    <input
                      type="text"
                      value={catTaglineInput}
                      onChange={(e) => setCatTaglineInput(e.target.value)}
                      placeholder="e.g. Timeless Silhouettes & Handcrafted Kurtis"
                      className="w-full text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none transition"
                    />
                  </div>
                </div>

                {/* CARD 2: Home Tile Image */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-black" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Home Tile Image *
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Live Preview Box */}
                    <div className="md:col-span-4 flex flex-col items-center">
                      <div className="w-full max-w-[220px] aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-slate-200 shadow-md relative group">
                        {catImageInput ? (
                          <img
                            src={catImageInput}
                            alt="Preview"
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                            <ImageIcon className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                            <span className="text-xs font-medium">No Photo Selected</span>
                            <span className="text-[10px] text-slate-500 mt-1">Upload an image below</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-300 block">
                            Home Category Tile
                          </span>
                          <span className="text-xs font-bold uppercase truncate block">
                            {catNameInput || 'Category Name'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-2">
                        Preview Ratio: 4:5 Portrait
                      </span>
                    </div>

                    {/* Direct Upload Controls */}
                    <div className="md:col-span-8 flex flex-col justify-center items-start gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-xs">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>{catImageInput ? 'Change Photo from Device' : 'Upload Photo from Device'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setCatImageInput)}
                          />
                        </label>
                        {catImageInput && (
                          <button
                            type="button"
                            onClick={() => setCatImageInput('')}
                            className="px-4 py-3 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 3: Home Page Visibility Toggle */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-bold text-slate-900">
                      Show on Home Page 2-Column Grid
                    </span>
                    <span className="text-xs text-slate-500">
                      Visible in the editorial photo grid on the customer home page
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catShowOnHome}
                      onChange={(e) => setCatShowOnHome(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                {/* Form In-Flow Action Row */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCategory(false);
                        setEditingCategory(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:text-black hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCategory}
                      className="px-6 py-2.5 bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      {isSavingCategory ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Saving to Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>{isCreatingCategory ? 'Save & Create Category' : 'Save Changes'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FULL PAGE STUDIO: ADD / EDIT SUBCATEGORY                   */}
      {/* ========================================================= */}
      {subModalTargetCat && (
        <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* STICKY TOP HEADER */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubModalTargetCat(null);
                  setEditingSubcategory(null);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-700" />
                <span>Back to Categories</span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingSubcategory ? `Edit Subcategory: ${editingSubcategory.name}` : 'Add New Subcategory'}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                    {subModalTargetCat.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubModalTargetCat(null);
                  setEditingSubcategory(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="subcategory-fullpage-form"
                className="px-5 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{editingSubcategory ? 'Save Changes' : 'Add Subcategory'}</span>
              </button>
            </div>
          </header>

          {/* SCROLLABLE FULL PAGE BODY */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              <form id="subcategory-fullpage-form" onSubmit={handleSaveSubcategory} className="space-y-6">

                {/* CARD 1: Identity & Slug */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-black" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Subcategory Details
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                      Parent Category: <strong className="text-slate-900 uppercase">{subModalTargetCat.name}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Subcategory Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={subNameInput}
                        onChange={(e) => setSubNameInput(e.target.value)}
                        placeholder="e.g. Long Kurti, Cigarette Pants, Anarkali Sets"
                        className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={subSlugInput}
                        onChange={(e) => setSubSlugInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="e.g. long-kurti"
                        className="w-full text-xs font-mono px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 2: Subcategory Photo Tile */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-black" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Subcategory Photo Tile (Customer Catalogue)
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Live Preview Box */}
                    <div className="md:col-span-4 flex flex-col items-center">
                      <div className="w-full max-w-[220px] aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-slate-200 shadow-md relative group">
                        {subImageInput ? (
                          <img
                            src={subImageInput}
                            alt="Preview"
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                            <ImageIcon className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                            <span className="text-xs font-medium">No Photo Selected</span>
                            <span className="text-[10px] text-slate-500 mt-1">Upload or pick a preset</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-300 block">
                            Catalogue Tile
                          </span>
                          <span className="text-xs font-bold truncate block">
                            {subNameInput || 'Subcategory Title'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-2">
                        Preview Ratio: 4:5 Portrait
                      </span>
                    </div>

                    {/* Direct Upload Controls */}
                    <div className="md:col-span-8 flex flex-col justify-center items-start gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-xs">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>{subImageInput ? 'Change Photo from Device' : 'Upload Photo from Device'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setSubImageInput)}
                          />
                        </label>
                        {subImageInput && (
                          <button
                            type="button"
                            onClick={() => setSubImageInput('')}
                            className="px-4 py-3 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Child Categories / Variety Styles (Sub-Subcategories) */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Child Categories / Varieties (Sub-Subcategories)</h4>
                      <p className="text-[11px] text-slate-500">
                        Add specific variety cuts or styles under this subcategory (e.g. Straight Fit, Anarkali, A-Line, Flared)
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {subSubList.length} varieties
                    </span>
                  </div>

                  {/* Existing Varieties Pill Tags */}
                  {subSubList.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {subSubList.map((child, idx) => (
                        <span
                          key={child.id || idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-slate-800 text-xs font-medium border border-slate-200 shadow-2xs"
                        >
                          <span>{child.name}</span>
                          <button
                            type="button"
                            onClick={() => setSubSubList((prev) => prev.filter((_, i) => i !== idx))}
                            className="w-4 h-4 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                            title="Remove variety"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Add Variety Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. Anarkali, Straight Cut, Flared, A-Line"
                      value={newSubSubName}
                      onChange={(e) => setNewSubSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSubSubName.trim()) {
                            const name = newSubSubName.trim();
                            setSubSubList((prev) => [
                              ...prev,
                              {
                                id: `child-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                name,
                                slug:
                                  name
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, '-')
                                    .replace(/^-+|-+$/g, '') || `child-${Date.now()}`,
                              },
                            ]);
                            setNewSubSubName('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:border-black outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubSubName.trim()) {
                          const name = newSubSubName.trim();
                          setSubSubList((prev) => [
                            ...prev,
                            {
                              id: `child-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                              name,
                              slug:
                                name
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, '-')
                                  .replace(/^-+|-+$/g, '') || `child-${Date.now()}`,
                            },
                          ]);
                          setNewSubSubName('');
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      + Add Variety
                    </button>
                  </div>
                </div>

                {/* Form In-Flow Action Row */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Category: <strong className="text-slate-800 uppercase">{subModalTargetCat.name}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSubModalTargetCat(null);
                        setEditingSubcategory(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:text-black hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{editingSubcategory ? 'Save Changes' : 'Add Subcategory'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT HOME HERO SLIDE BANNER               */}
      {/* ========================================================= */}
      {(isCreatingBanner || editingBanner) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#E52229]" />
                <h3 className="text-base font-bold text-slate-900">
                  {isCreatingBanner ? 'Add Home Top Slide Banner' : `Edit Slide: ${editingBanner?.title}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingBanner(false);
                  setEditingBanner(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              {/* Banner Image Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Slide Banner Photo * (High-Resolution / 16:9 or 21:9)
                </label>
                <div className="w-full aspect-[16/7] rounded-xl overflow-hidden bg-zinc-950 border border-slate-300 relative shadow-inner">
                  {bannerImageInput ? (
                    <img
                      src={bannerImageInput}
                      alt="Banner Preview"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs font-semibold">No Banner Photo Selected</span>
                      <span className="text-[11px] text-slate-500">Upload a photo below or paste a URL</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={bannerImageInput}
                    onChange={(e) => setBannerImageInput(e.target.value)}
                    placeholder="Paste High-Res Banner URL (https://...)"
                    className="flex-1 text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setBannerImageInput)}
                    />
                  </label>
                </div>
              </div>

              {/* Typography overlay fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Main Banner Title
                  </label>
                  <input
                    type="text"
                    required
                    value={bannerTitleInput}
                    onChange={(e) => setBannerTitleInput(e.target.value)}
                    placeholder="e.g. THE WALK 7.0 AW’26"
                    className="w-full text-xs font-bold uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tagline (Top small text)
                  </label>
                  <input
                    type="text"
                    value={bannerTaglineInput}
                    onChange={(e) => setBannerTaglineInput(e.target.value)}
                    placeholder="e.g. AUTUMN / WINTER '26"
                    className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Subtitle (Under title)
                  </label>
                  <input
                    type="text"
                    value={bannerSubtitleInput}
                    onChange={(e) => setBannerSubtitleInput(e.target.value)}
                    placeholder="e.g. Timeless Silhouettes & Handcrafted Kurtis"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Target Category Destination
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    When customer taps anywhere on the banner, it opens this category directly:
                  </p>
                  <select
                    value={bannerTargetCatInput}
                    onChange={(e) => setBannerTargetCatInput(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name.toUpperCase()} (/{c.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Active in Slide Show
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Include this slide in the automatic home page rotation
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerActiveInput}
                    onChange={(e) => setBannerActiveInput(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingBanner(false);
                    setEditingBanner(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isCreatingBanner ? 'Add to Slide Carousel' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT MENU HIGHLIGHT & LAUNCH              */}
      {/* ========================================================= */}
      {(isCreatingHighlight || editingHighlight) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  {isCreatingHighlight ? 'Add Menu Launch / Highlight' : `Edit Menu Highlight: ${editingHighlight?.title}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingHighlight(false);
                  setEditingHighlight(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHighlight} className="space-y-4">
              {/* Highlight Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Menu Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={highlightTitleInput}
                  onChange={(e) => setHighlightTitleInput(e.target.value.toUpperCase())}
                  placeholder="e.g. NEW LAUNCH, FESTIVE '26, BESTSELLERS"
                  className="w-full text-xs font-bold tracking-wider px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                />
              </div>

              {/* Badge Text & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={highlightBadgeInput}
                    onChange={(e) => setHighlightBadgeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. NEW, HOT, LIVE"
                    className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Badge Color Theme
                  </label>
                  <select
                    value={highlightBadgeColor}
                    onChange={(e) => setHighlightBadgeColor(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  >
                    <option value="rose">Rose Red (Signature)</option>
                    <option value="dark">Pure Black</option>
                    <option value="amber">Amber / Festive Gold</option>
                    <option value="emerald">Emerald Green</option>
                    <option value="blue">Royal Blue</option>
                  </select>
                </div>
              </div>

              {/* Target Type */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  When Customer Clicks in Menu:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightTargetType('tag');
                      if (!highlightTargetValue || highlightTargetValue === 'kurti') {
                        setHighlightTargetValue('new-launch');
                      }
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                      highlightTargetType === 'tag'
                        ? 'border-black bg-black text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Tagged Products
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightTargetType('category');
                      setHighlightTargetValue(categories[0]?.slug || 'kurti');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                      highlightTargetType === 'category'
                        ? 'border-black bg-black text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Specific Category
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightTargetType('all');
                      setHighlightTargetValue('');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                      highlightTargetType === 'all'
                        ? 'border-black bg-black text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All Products
                  </button>
                </div>
              </div>

              {/* Target Value Input */}
              {highlightTargetType === 'tag' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tag / Collection Keyword (matches product offer tags or marked tags):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={highlightTargetValue}
                      onChange={(e) => setHighlightTargetValue(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="e.g. new-launch, bestseller, festive"
                      className="w-full text-xs font-mono px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 font-medium">Quick suggestions:</span>
                    {['new-launch', 'bestseller', 'festive', 'exclusive'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setHighlightTargetValue(s)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                          highlightTargetValue === s
                            ? 'bg-black text-white border-black'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-black'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {highlightTargetType === 'category' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Target Category:
                  </label>
                  <select
                    value={highlightTargetValue}
                    onChange={(e) => setHighlightTargetValue(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-black outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show / Hide Toggle in Menu */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Show in Customer Mobile Menu
                  </span>
                  <span className="text-[11px] text-slate-500">
                    When enabled, this link appears at the top of the menu drawer.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highlightIsEnabled}
                    onChange={(e) => setHighlightIsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingHighlight(false);
                    setEditingHighlight(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isCreatingHighlight ? 'Create Menu Highlight' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION (IFRAME & SANDBOX SAFE)       */}
      {/* ========================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete {deleteTarget.type === 'category' ? 'Category' : deleteTarget.type === 'subcategory' ? 'Subcategory' : 'Slide Banner'}?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-black font-bold">"{deleteTarget.name}"</strong>
                {deleteTarget.type === 'category' ? ' and all its subcategories' : ''}?
                This action will immediately update the live store.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExecuteDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
