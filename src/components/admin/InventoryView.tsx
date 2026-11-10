import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ColorVariant } from '../../types';
import { getCacheBustedUrl } from '../../utils/cacheBuster';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Edit2,
  Plus,
  X,
  Sparkles,
  Download,
  Filter,
  Check,
  Package,
  Layers,
  CheckSquare,
  Square,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Copy,
  Trash2,
  EyeOff,
  Eye,
  Lock,
} from 'lucide-react';

interface InventoryViewProps {
  onEditProduct: (product: Product, colorIndex?: number) => void;
}

interface SizeMeta {
  sizeKey: string;
  sizeNumber: number;
  label: string;
  order: number;
}

const SIZE_MAP: Record<string, { number: number; label: string; order: number }> = {
  '34': { number: 34, label: 'Size 34 (XS)', order: 1 },
  'XS': { number: 34, label: 'Size 34 (XS)', order: 1 },
  '36': { number: 36, label: 'Size 36 (S)', order: 2 },
  'S': { number: 36, label: 'Size 36 (S)', order: 2 },
  '38': { number: 38, label: 'Size 38 (M)', order: 3 },
  'M': { number: 38, label: 'Size 38 (M)', order: 3 },
  '40': { number: 40, label: 'Size 40 (L)', order: 4 },
  'L': { number: 40, label: 'Size 40 (L)', order: 4 },
  '42': { number: 42, label: 'Size 42 (XL)', order: 5 },
  'XL': { number: 42, label: 'Size 42 (XL)', order: 5 },
  '44': { number: 44, label: 'Size 44 (XXL)', order: 6 },
  'XXL': { number: 44, label: 'Size 44 (XXL)', order: 6 },
  '2XL': { number: 44, label: 'Size 44 (XXL)', order: 6 },
  '46': { number: 46, label: 'Size 46 (3XL)', order: 7 },
  '3XL': { number: 46, label: 'Size 46 (3XL)', order: 7 },
  'XXXL': { number: 46, label: 'Size 46 (3XL)', order: 7 },
  '48': { number: 48, label: 'Size 48 (4XL)', order: 8 },
  '4XL': { number: 48, label: 'Size 48 (4XL)', order: 8 },
};

function normalizeSize(rawSize: string): SizeMeta {
  const clean = rawSize.trim().toUpperCase();
  if (SIZE_MAP[clean]) {
    return {
      sizeKey: rawSize,
      sizeNumber: SIZE_MAP[clean].number,
      label: SIZE_MAP[clean].label,
      order: SIZE_MAP[clean].order,
    };
  }
  const numericVal = parseInt(clean, 10);
  if (!isNaN(numericVal)) {
    return {
      sizeKey: rawSize,
      sizeNumber: numericVal,
      label: `Size ${numericVal}`,
      order: numericVal,
    };
  }
  return {
    sizeKey: rawSize,
    sizeNumber: 99,
    label: `Size ${rawSize}`,
    order: 99,
  };
}

function getVariantSizeSku(
  prod: Product,
  col: ColorVariant,
  sizeKey: string,
  sizeNumber: number
): string {
  // 1. Explicit size SKU override on color option
  if (col.skuBySize && col.skuBySize[sizeKey]) {
    return col.skuBySize[sizeKey];
  }
  // 2. Explicit size SKU override on product
  if (prod.skuBySize && prod.skuBySize[sizeKey]) {
    return prod.skuBySize[sizeKey];
  }

  // 3. Clean base SKU prefix (e.g., RM-T-00-36 -> RM-T-00, RM-KRT-BLK-01 -> RM-KRT-BLK)
  const rawSku = (col.sku || prod.sku || 'RM-PRD').trim();
  const baseSku = rawSku.replace(/-(\d{2}|01|S|M|L|XL|XXL|3XL|4XL)$/i, '');
  return `${baseSku}-${sizeNumber}`;
}

export interface SizeInventoryItem {
  rowKey: string;
  productId: string;
  colorIndex: number;
  product: Product;
  colorVariant: ColorVariant;
  category: string;
  productTitle: string;
  colorName: string;
  colorHex: string;
  sizeKey: string;
  sizeNumber: number;
  sizeLabel: string;
  sizeOrder: number;
  sku: string;
  listingPrice: number; // MRP
  salePrice: number;    // Final / Selling Price
  settlementPrice: number; // Est. Payout (~72% after GST & fees)
  stock: number;
  image: string;
}

type SortType = 'sequence' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { id: SortType; label: string; shortLabel: string }[] = [
  { id: 'sequence', label: 'Sequence: Category > Product > Color > Size (Default)', shortLabel: 'Default Sequence' },
  { id: 'stock-asc', label: 'Stock: Low to High', shortLabel: 'Stock: Low to High' },
  { id: 'stock-desc', label: 'Stock: High to Low', shortLabel: 'Stock: High to Low' },
  { id: 'price-asc', label: 'Price: Low to High', shortLabel: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low', shortLabel: 'Price: High to Low' },
];

export const InventoryView: React.FC<InventoryViewProps> = ({ onEditProduct }) => {
  const { products, updateProduct, deleteProduct } = useStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'out-of-stock'>('all');
  const [sortBy, setSortBy] = useState<SortType>('sequence');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Bulk Listing Action Dropdown states
  const [isActionOpen, setIsActionOpen] = useState(false);
  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setIsSortOpen(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(target)) {
        setIsActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSort = (targetSort: SortType) => {
    if (sortBy === targetSort) {
      // Reselect: deselect and revert to default sequence!
      setSortBy('sequence');
    } else {
      // Select
      setSortBy(targetSort);
    }
    setIsSortOpen(false);
  };

  // Multi-item selection for bulk updates
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // Item-level Inactive Status: Only specifically selected & deactivated SKU rowKeys are inactive
  const [inactiveRowKeys, setInactiveRowKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('redmode_inactive_row_keys');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const saveInactiveRowKeys = (keys: string[]) => {
    setInactiveRowKeys(keys);
    try {
      localStorage.setItem('redmode_inactive_row_keys', JSON.stringify(keys));
    } catch (e) {}
  };

  // Helper to determine if a specific SKU row is inactive
  const isItemInactive = (rowKey: string, prod?: Product) => {
    if (inactiveRowKeys.includes(rowKey)) return true;
    if (prod?.inactiveRowKeys?.includes(rowKey)) return true;
    return false;
  };

  // Ensure products don't stay globally unpublished from previous bulk operations,
  // restoring published: true so unselected sibling variants remain active.
  useEffect(() => {
    products.forEach((p) => {
      if (p.published === false) {
        updateProduct(p.id, { published: true });
      }
    });
  }, [products]);

  // Inline Price Edit State (no modal, directly editable inline from table)
  const [priceEditingRowKey, setPriceEditingRowKey] = useState<string | null>(null);
  const [editInlineListing, setEditInlineListing] = useState<string>('');
  const [editInlineSale, setEditInlineSale] = useState<string>('');

  // Inline Stock Edit State
  const [stockEditingKey, setStockEditingKey] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<string>('');

  // Add Variant / SKU Modal State
  const [isAddSkuModalOpen, setIsAddSkuModalOpen] = useState(false);
  const [addSkuProductId, setAddSkuProductId] = useState<string>(products[0]?.id || '');
  const [addSkuColorIndex, setAddSkuColorIndex] = useState<number>(0);
  const [addSkuSize, setAddSkuSize] = useState<string>('38');
  const [addSkuCustomCode, setAddSkuCustomCode] = useState<string>('');
  const [addSkuListingPrice, setAddSkuListingPrice] = useState<number>(1499);
  const [addSkuSalePrice, setAddSkuSalePrice] = useState<number>(899);
  const [addSkuStock, setAddSkuStock] = useState<number>(25);

  // Quick feedback banner / toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Build the complete flattened Size-level Inventory list in sequence
  const inventoryItems = useMemo<SizeInventoryItem[]>(() => {
    const items: SizeInventoryItem[] = [];

    products.forEach((prod) => {
      if (prod.colorOptions && prod.colorOptions.length > 0) {
        prod.colorOptions.forEach((col, cIdx) => {
          // Identify all sizes configured for this variant
          const declaredSizes = col.sizes && col.sizes.length > 0 ? col.sizes : Object.keys(col.stockBySize || {});
          const sizeList = declaredSizes.length > 0 ? declaredSizes : ['38', '40', '42', '44', '46'];

          sizeList.forEach((sz) => {
            const meta = normalizeSize(sz);
            const sku = getVariantSizeSku(prod, col, sz, meta.sizeNumber);
            const stock = col.stockBySize?.[sz] ?? 0;
            const listingPrice = col.mrpBySize?.[sz] ?? col.mrp ?? prod.mrpBySize?.[sz] ?? prod.mrp ?? 1499;
            const salePrice = col.priceBySize?.[sz] ?? col.price ?? prod.priceBySize?.[sz] ?? prod.price ?? 899;
            const settlementPrice = Math.round(salePrice * 0.72); // ~72% seller payout

            const colorDisplayName = col.name ? ` - ${col.name}` : '';
            const productTitle = `${prod.name}${colorDisplayName}`;

            items.push({
              rowKey: `${prod.id}__${cIdx}__${sz}`,
              productId: prod.id,
              colorIndex: cIdx,
              product: prod,
              colorVariant: col,
              category: prod.category || 'Kurti',
              productTitle,
              colorName: col.name || 'Default',
              colorHex: col.hex || '#000000',
              sizeKey: sz,
              sizeNumber: meta.sizeNumber,
              sizeLabel: meta.label,
              sizeOrder: meta.order,
              sku,
              listingPrice,
              salePrice,
              settlementPrice,
              stock,
              image: col.image || prod.mainImage || '',
            });
          });
        });
      } else {
        // Fallback for product without explicit colorOptions
        const declaredSizes = prod.sizes && prod.sizes.length > 0 ? prod.sizes : Object.keys(prod.stockBySize || {});
        const sizeList = declaredSizes.length > 0 ? declaredSizes : ['38', '40', '42', '44', '46'];

        sizeList.forEach((sz) => {
          const meta = normalizeSize(sz);
          const sku = getVariantSizeSku(prod, {} as ColorVariant, sz, meta.sizeNumber);
          const stock = prod.stockBySize?.[sz] ?? 0;
          const listingPrice = prod.mrpBySize?.[sz] ?? prod.mrp ?? 1499;
          const salePrice = prod.priceBySize?.[sz] ?? prod.price ?? 899;
          const settlementPrice = Math.round(salePrice * 0.72);

          items.push({
            rowKey: `${prod.id}__0__${sz}`,
            productId: prod.id,
            colorIndex: 0,
            product: prod,
            colorVariant: { name: 'Standard', hex: '#000000', stockBySize: prod.stockBySize },
            category: prod.category || 'Kurti',
            productTitle: prod.name,
            colorName: 'Standard',
            colorHex: '#000000',
            sizeKey: sz,
            sizeNumber: meta.sizeNumber,
            sizeLabel: meta.label,
            sizeOrder: meta.order,
            sku,
            listingPrice,
            salePrice,
            settlementPrice,
            stock,
            image: prod.mainImage || '',
          });
        });
      }
    });

    return items;
  }, [products]);

  // Distinct categories for filter
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered and Sorted list
  const filteredItems = useMemo(() => {
    let list = [...inventoryItems];

    // 1. Search Query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.sku.toLowerCase().includes(q) ||
          item.productTitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.sizeLabel.toLowerCase().includes(q) ||
          item.colorName.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (categoryFilter !== 'all') {
      list = list.filter((item) => item.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // 3. Stock Filter
    if (stockFilter === 'low') {
      list = list.filter((item) => item.stock > 0 && item.stock < 10);
    } else if (stockFilter === 'in-stock') {
      list = list.filter((item) => item.stock >= 10);
    } else if (stockFilter === 'out-of-stock') {
      list = list.filter((item) => item.stock === 0);
    }

    // 4. Sorting
    if (sortBy === 'sequence') {
      list.sort((a, b) => {
        // Group by Category
        const catCmp = a.category.localeCompare(b.category);
        if (catCmp !== 0) return catCmp;

        // Group by Product
        if (a.productId !== b.productId) {
          return a.product.name.localeCompare(b.product.name);
        }

        // Group by Color Variant
        if (a.colorIndex !== b.colorIndex) {
          return a.colorIndex - b.colorIndex;
        }

        // Sequence by Size: 36 -> 38 -> 40 -> 42 -> 44 -> 46
        return a.sizeOrder - b.sizeOrder;
      });
    } else if (sortBy === 'stock-asc') {
      list.sort((a, b) => a.stock - b.stock);
    } else if (sortBy === 'stock-desc') {
      list.sort((a, b) => b.stock - a.stock);
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => a.salePrice - b.salePrice);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.salePrice - a.salePrice);
    }

    return list;
  }, [inventoryItems, search, categoryFilter, stockFilter, sortBy]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalSkus = inventoryItems.length;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyCount = 0;

    inventoryItems.forEach((item) => {
      totalUnits += item.stock;
      if (item.stock === 0) {
        outOfStockCount++;
      } else if (item.stock < 10) {
        lowStockCount++;
      } else {
        healthyCount++;
      }
    });

    return { totalSkus, totalUnits, lowStockCount, outOfStockCount, healthyCount };
  }, [inventoryItems]);

  // Checkbox helpers
  const isAllSelected = filteredItems.length > 0 && selectedRowKeys.length === filteredItems.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowKeys([]);
    } else {
      setSelectedRowKeys(filteredItems.map((i) => i.rowKey));
    }
  };

  const toggleSelectRow = (rowKey: string) => {
    setSelectedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey]
    );
  };

  // Start Inline Price Edit
  const handleStartPriceEdit = (item: SizeInventoryItem) => {
    if (isItemInactive(item.rowKey, item.product)) {
      showToast('Listing is inactive. Activate listing to update price.');
      return;
    }
    setPriceEditingRowKey(item.rowKey);
    setEditInlineListing(String(item.listingPrice));
    setEditInlineSale(String(item.salePrice));
  };

  // Save Inline Price (Listing Price & Final/Sale Price with auto-calculated discount)
  const handleSaveInlinePrice = (item: SizeInventoryItem) => {
    const target = products.find((p) => p.id === item.productId);
    if (!target) return;
    if (isItemInactive(item.rowKey, target)) {
      showToast('Listing is inactive. Activate listing to update price.');
      return;
    }

    const numSale = parseFloat(editInlineSale);
    const numListing = parseFloat(editInlineListing);

    if (isNaN(numSale) || numSale <= 0) {
      showToast('Please enter a valid final / sale price.');
      return;
    }

    const validSalePrice = Math.max(1, Math.round(numSale));
    const validListingPrice = Math.max(validSalePrice, Math.round(isNaN(numListing) ? validSalePrice : numListing));

    // Calculate customer discount percentage automatically
    const discountPercent =
      validListingPrice > validSalePrice
        ? Math.round(((validListingPrice - validSalePrice) / validListingPrice) * 100)
        : 0;

    const offerTag = discountPercent > 0 ? `${discountPercent}% OFF` : undefined;

    if (target.colorOptions && target.colorOptions.length > 0) {
      const updatedColorOptions = target.colorOptions.map((c, cIdx) => {
        if (cIdx !== item.colorIndex) return c;
        return {
          ...c,
          price: validSalePrice,
          mrp: validListingPrice,
          priceBySize: { ...(c.priceBySize || {}), [item.sizeKey]: validSalePrice },
          mrpBySize: { ...(c.mrpBySize || {}), [item.sizeKey]: validListingPrice },
        };
      });

      updateProduct(target.id, {
        colorOptions: updatedColorOptions,
        price: validSalePrice,
        mrp: validListingPrice,
        offerTag: offerTag ?? target.offerTag,
        priceBySize: { ...(target.priceBySize || {}), [item.sizeKey]: validSalePrice },
        mrpBySize: { ...(target.mrpBySize || {}), [item.sizeKey]: validListingPrice },
      });
    } else {
      updateProduct(target.id, {
        price: validSalePrice,
        mrp: validListingPrice,
        offerTag: offerTag ?? target.offerTag,
        priceBySize: { ...(target.priceBySize || {}), [item.sizeKey]: validSalePrice },
        mrpBySize: { ...(target.mrpBySize || {}), [item.sizeKey]: validListingPrice },
      });
    }

    setPriceEditingRowKey(null);
    showToast(`Price updated: Listing ₹${validListingPrice}, Sale ₹${validSalePrice} (${discountPercent}% OFF)`);
  };

  // Save Stock
  const handleSaveStock = (productId: string, colorIndex: number, sizeKey: string, newQty: number) => {
    const rowKey = `${productId}__${colorIndex}__${sizeKey}`;
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    if (isItemInactive(rowKey, target)) {
      showToast('Listing is inactive. Activate listing to update stock.');
      return;
    }
    const validQty = Math.max(0, newQty);

    if (target.colorOptions && target.colorOptions.length > 0) {
      const updatedColorOptions = target.colorOptions.map((c, cIdx) => {
        if (cIdx !== colorIndex) return c;
        const sbs = { ...(c.stockBySize || {}) };
        sbs[sizeKey] = validQty;
        return { ...c, stockBySize: sbs };
      });

      // Recalculate combined product stock
      const allStockBySize: Record<string, number> = {};
      updatedColorOptions.forEach((c) => {
        Object.entries(c.stockBySize || {}).forEach(([sz, q]) => {
          allStockBySize[sz] = (allStockBySize[sz] || 0) + (Number(q) || 0);
        });
      });
      const total = Object.values(allStockBySize).reduce<number>((a, b) => a + (Number(b) || 0), 0);

      updateProduct(target.id, {
        colorOptions: updatedColorOptions,
        stockBySize: allStockBySize,
        stock: total,
        inStock: total > 0,
      });
    } else {
      const sbs = { ...(target.stockBySize || {}) };
      sbs[sizeKey] = validQty;
      const total = Object.values(sbs).reduce<number>((a, b) => a + (Number(b) || 0), 0);

      updateProduct(target.id, {
        stockBySize: sbs,
        stock: total,
        inStock: total > 0,
      });
    }

    setStockEditingKey(null);
    showToast(`Stock updated to ${validQty} units`);
  };

  // Helper to extract unique selected products & items
  const getSelectedProducts = () => {
    const selectedItems = inventoryItems.filter((i) => selectedRowKeys.includes(i.rowKey));
    const productMap = new Map<string, Product>();
    selectedItems.forEach((item) => {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, item.product);
      }
    });
    return {
      selectedItems,
      uniqueProducts: Array.from(productMap.values()),
      uniqueProductIds: Array.from(productMap.keys()),
    };
  };

  // Bulk Activate Selected Listings / SKUs
  const handleBulkActivate = () => {
    if (selectedRowKeys.length === 0) {
      showToast('Please select at least 1 item / SKU from the table first.');
      return;
    }
    const newInactive = inactiveRowKeys.filter((k) => !selectedRowKeys.includes(k));
    saveInactiveRowKeys(newInactive);

    const { uniqueProducts } = getSelectedProducts();
    uniqueProducts.forEach((prod) => {
      const remaining = (prod.inactiveRowKeys || []).filter((k) => !selectedRowKeys.includes(k));
      updateProduct(prod.id, { published: true, inactiveRowKeys: remaining });
    });

    setIsActionOpen(false);
    showToast(`Activated ${selectedRowKeys.length} selected SKU(s). Status is now Live.`);
  };

  // Bulk Deactivate Selected Listings / SKUs
  const handleBulkDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      showToast('Please select at least 1 item / SKU from the table first.');
      return;
    }
    const combined = Array.from(new Set([...inactiveRowKeys, ...selectedRowKeys]));
    saveInactiveRowKeys(combined);

    const { uniqueProducts } = getSelectedProducts();
    uniqueProducts.forEach((prod) => {
      const keysForThisProd = selectedRowKeys.filter((k) => k.startsWith(prod.id));
      const updatedKeys = Array.from(new Set([...(prod.inactiveRowKeys || []), ...keysForThisProd]));
      updateProduct(prod.id, { published: true, inactiveRowKeys: updatedKeys });
    });

    setIsActionOpen(false);
    showToast(`Deactivated ${selectedRowKeys.length} selected SKU(s). Status is now Inactive.`);
  };

  // Bulk Delete Prompt
  const handleBulkDeletePrompt = () => {
    const { uniqueProductIds } = getSelectedProducts();
    if (uniqueProductIds.length === 0) {
      showToast('Please select at least 1 product / SKU from the table first.');
      return;
    }
    setIsActionOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  // Bulk Delete Confirm
  const handleConfirmDelete = () => {
    const { uniqueProductIds, selectedItems } = getSelectedProducts();
    uniqueProductIds.forEach((prodId) => {
      deleteProduct(prodId);
    });
    setSelectedRowKeys([]);
    setIsDeleteConfirmOpen(false);
    showToast(`Deleted ${uniqueProductIds.length} listing(s) (${selectedItems.length} SKUs).`);
  };

  // Export CSV of Inventory SKUs
  const handleExportCsv = () => {
    const rows = [
      ['Category', 'Product Title', 'Color', 'Size', 'SKU', 'Listing Price (₹)', 'Sale Price (₹)', 'Est. Settlement (₹)', 'Stock Units', 'Stock Status'],
      ...filteredItems.map((i) => [
        `"${i.category}"`,
        `"${i.productTitle.replace(/"/g, '""')}"`,
        `"${i.colorName}"`,
        `"${i.sizeLabel}"`,
        `"${i.sku}"`,
        i.listingPrice,
        i.salePrice,
        i.settlementPrice,
        i.stock,
        i.stock >= 10 ? 'In Stock' : i.stock > 0 ? 'Low Stock' : 'Out of Stock',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `redmode_inventory_skus_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Inventory CSV exported successfully!');
  };

  // Save new SKU / Size Variant
  const handleSaveNewSizeSku = () => {
    const target = products.find((p) => p.id === addSkuProductId);
    if (!target) return;

    const cleanSize = addSkuSize.trim().toUpperCase();
    const meta = normalizeSize(cleanSize);
    const autoSku = addSkuCustomCode.trim() || `${target.sku || 'RM-PRD'}-${meta.sizeNumber}`;
    const validListing = Math.max(1, addSkuListingPrice);
    const validSale = Math.max(1, addSkuSalePrice);
    const validStock = Math.max(0, addSkuStock);

    if (target.colorOptions && target.colorOptions.length > 0) {
      const updatedColorOptions = target.colorOptions.map((c, cIdx) => {
        if (cIdx !== addSkuColorIndex) return c;
        const sbs = { ...(c.stockBySize || {}), [cleanSize]: validStock };
        const sizes = c.sizes && c.sizes.includes(cleanSize) ? c.sizes : [...(c.sizes || Object.keys(sbs)), cleanSize];
        return {
          ...c,
          sizes,
          stockBySize: sbs,
          priceBySize: { ...(c.priceBySize || {}), [cleanSize]: validSale },
          mrpBySize: { ...(c.mrpBySize || {}), [cleanSize]: validListing },
          skuBySize: { ...(c.skuBySize || {}), [cleanSize]: autoSku },
        };
      });

      // Recalculate combined product stock
      const allStockBySize: Record<string, number> = {};
      updatedColorOptions.forEach((c) => {
        Object.entries(c.stockBySize || {}).forEach(([sz, q]) => {
          allStockBySize[sz] = (allStockBySize[sz] || 0) + (Number(q) || 0);
        });
      });
      const total = Object.values(allStockBySize).reduce<number>((a, b) => a + (Number(b) || 0), 0);

      updateProduct(target.id, {
        colorOptions: updatedColorOptions,
        stockBySize: allStockBySize,
        stock: total,
        inStock: total > 0,
      });
    }

    setIsAddSkuModalOpen(false);
    showToast(`Added new size SKU: ${autoSku} (${cleanSize}) with ${validStock} units`);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Seller Inventory Management</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {stats.totalSkus} Size SKUs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sequence-grouped by Category, Product, Color & Size. Manage live Listing Price, Sale Price, and Stock units.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (products.length > 0) {
                setAddSkuProductId(products[0].id);
                setAddSkuColorIndex(0);
                setAddSkuSize('38');
                setAddSkuListingPrice(products[0].mrp || 1499);
                setAddSkuSalePrice(products[0].price || 899);
                setAddSkuCustomCode('');
                setIsAddSkuModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Size / SKU</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-normal">Total Listed SKUs</div>
          <div className="text-base text-slate-800 font-medium mt-0.5">{stats.totalSkus}</div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Across all colors & sizes</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-normal">Total Warehouse Stock</div>
          <div className="text-base text-slate-800 font-medium mt-0.5">{stats.totalUnits.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Available units</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-amber-700 font-normal">Low Stock Alert (&lt; 10)</div>
          <div className="text-base text-amber-600 font-medium mt-0.5">{stats.lowStockCount}</div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Reorder recommended</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-red-700 font-normal">Out of Stock (0)</div>
          <div className="text-base text-red-600 font-medium mt-0.5">{stats.outOfStockCount}</div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">Immediate action needed</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU (e.g. RM-T-00-38, RM-KRT-BLK-40), Product Name, or Category..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none text-slate-800 font-semibold outline-none cursor-pointer text-xs"
              >
                <option value="all">All Categories ({distinctCategories.length})</option>
                {distinctCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {categoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="text-slate-400 hover:text-slate-600 ml-0.5 cursor-pointer"
                  title="Deselect category filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom Sort Dropdown with Reselect-to-Deselect */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition cursor-pointer ${
                  sortBy !== 'sequence'
                    ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
                title="Click to sort. Selecting the active option deselects it and reverts to default sequence."
              >
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy !== 'sequence' ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className="truncate max-w-[190px] sm:max-w-none">
                  {SORT_OPTIONS.find((o) => o.id === sortBy)?.shortLabel || 'Default Sequence'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? 'rotate-180' : ''} ${sortBy !== 'sequence' ? 'text-blue-600' : 'text-slate-400'}`} />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Sorting Order</span>
                    <span className="text-[10px] text-blue-600 font-medium">Click active to deselect</span>
                  </div>

                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleToggleSort(opt.id)}
                        className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer ${
                          isSelected ? 'bg-blue-50/80 font-bold text-blue-900' : 'text-slate-700 font-medium hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stock Filter Quick Tabs */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All SKUs ({inventoryItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'in-stock' ? 'all' : 'in-stock')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stockFilter === 'in-stock'
                ? 'bg-emerald-700 text-white ring-2 ring-emerald-500/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={stockFilter === 'in-stock' ? 'Click to deselect (back to All)' : 'Filter In Stock 10+'}
          >
            In Stock 10+ ({stats.healthyCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={stockFilter === 'low' ? 'Click to deselect (back to All)' : 'Filter Low Stock < 10'}
          >
            Low Stock &lt; 10 ({stats.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'out-of-stock' ? 'all' : 'out-of-stock')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              stockFilter === 'out-of-stock'
                ? 'bg-red-600 text-white ring-2 ring-red-500/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={stockFilter === 'out-of-stock' ? 'Click to deselect (back to All)' : 'Filter Out of Stock'}
          >
            Out of Stock ({stats.outOfStockCount})
          </button>

          {/* Action Button right beside Out of Stock button */}
          <div className="relative" ref={actionDropdownRef}>
            <button
              type="button"
              onClick={() => setIsActionOpen(!isActionOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                selectedRowKeys.length > 0
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Listing Actions (Activate, Deactivate, Delete)"
            >
              <span>Action</span>
              {selectedRowKeys.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold text-white">
                  {selectedRowKeys.length}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionOpen ? 'rotate-180' : ''}`} />
            </button>

            {isActionOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100">
                <div className="px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Listing Actions</span>
                  <span className="text-slate-600 font-medium lowercase">
                    {selectedRowKeys.length > 0 ? `${selectedRowKeys.length} selected` : '0 selected'}
                  </span>
                </div>

                <div className="py-1">
                  {/* Activate */}
                  <button
                    type="button"
                    onClick={handleBulkActivate}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Activate Listing</div>
                      <div className="text-[10px] text-slate-500">Make listing active and live on store</div>
                    </div>
                  </button>

                  {/* Deactivate */}
                  <button
                    type="button"
                    onClick={handleBulkDeactivate}
                    className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-800 transition flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <EyeOff className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Deactivate Listing</div>
                      <div className="text-[10px] text-slate-500">Hide listing from customer store</div>
                    </div>
                  </button>
                </div>

                <div className="py-1">
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={handleBulkDeletePrompt}
                    className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-slate-700 hover:text-red-700 transition flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-md bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-red-600">Delete Listing</div>
                      <div className="text-[10px] text-slate-500">Permanently delete selected listings</div>
                    </div>
                  </button>
                </div>

                {selectedRowKeys.length > 0 && (
                  <div className="py-1 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRowKeys([]);
                        setIsActionOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-slate-500 hover:text-red-600 transition cursor-pointer flex items-center justify-between"
                    >
                      <span>Clear Selection</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-400">({selectedRowKeys.length})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedRowKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedRowKeys([])}
              className="text-[11px] font-medium text-slate-500 hover:text-red-600 cursor-pointer transition px-2 py-1 rounded-md hover:bg-slate-100 border border-slate-200"
              title="Clear selected SKUs"
            >
              Clear ({selectedRowKeys.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Flipkart-Style Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-slate-500 hover:text-slate-800"
                    title={isAllSelected ? 'Deselect All' : 'Select All'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-slate-900" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[250px]">Product Details</th>
                <th className="py-3 px-4 min-w-[210px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === 'price-asc') {
                        setSortBy('price-desc');
                      } else if (sortBy === 'price-desc') {
                        // Reselect: Deselect and revert to default sequence!
                        setSortBy('sequence');
                      } else {
                        setSortBy('price-asc');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider transition cursor-pointer py-1 px-1.5 rounded-lg ${
                      sortBy === 'price-asc' || sortBy === 'price-desc'
                        ? 'text-blue-700 bg-blue-50 border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Click to sort by Price. Click again to toggle, or reselect to deselect back to default sequence."
                  >
                    <span>Price &amp; Discount</span>
                    {sortBy === 'price-asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                    ) : sortBy === 'price-desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[150px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === 'stock-asc') {
                        setSortBy('stock-desc');
                      } else if (sortBy === 'stock-desc') {
                        // Reselect: Deselect and revert to default sequence!
                        setSortBy('sequence');
                      } else {
                        setSortBy('stock-asc');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider transition cursor-pointer py-1 px-1.5 rounded-lg ${
                      sortBy === 'stock-asc' || sortBy === 'stock-desc'
                        ? 'text-blue-700 bg-blue-50 border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Click to sort by Stock. Click again to toggle, or reselect to deselect back to default sequence."
                  >
                    <span>Stock</span>
                    {sortBy === 'stock-asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                    ) : sortBy === 'stock-desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 w-20 text-left">Edit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No SKU items found matching your filters.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting search keywords or category filters.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedRowKeys.includes(item.rowKey);
                  const isLowStock = item.stock > 0 && item.stock < 10;
                  const isOutOfStock = item.stock === 0;
                  const isInactive = isItemInactive(item.rowKey, item.product);

                  return (
                    <tr
                      key={item.rowKey}
                      className={`group transition ${
                        isInactive
                          ? 'bg-slate-50/40 hover:bg-slate-100/50 text-slate-400 select-none'
                          : 'hover:bg-slate-50/70 text-slate-700'
                      } ${isSelected ? 'bg-indigo-50/30' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(item.rowKey)}
                          className="cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-900" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Product Details: Category on top, Product Title middle, Size SKU bottom */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          {/* Image Thumbnail - natural colors (no black & white), unclickable when inactive */}
                          <div
                            onClick={(e) => {
                              if (isInactive) {
                                e.preventDefault();
                                e.stopPropagation();
                                showToast('Listing is inactive.');
                              }
                            }}
                            className={`w-12 h-14 rounded-lg bg-slate-100 border overflow-hidden shrink-0 relative transition select-none ${
                              isInactive ? 'border-slate-200 cursor-not-allowed' : 'border-slate-200 cursor-pointer'
                            }`}
                            title={isInactive ? 'Listing is inactive' : item.productTitle}
                          >
                            <img
                              src={getCacheBustedUrl(item.image, item.product.updatedAt) || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80'}
                              alt={item.productTitle}
                              draggable={false}
                              className={`w-full h-full object-cover object-top select-none ${
                                isInactive ? 'pointer-events-none' : ''
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80';
                              }}
                            />
                          </div>

                          {/* Stacked Info */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            {/* 1. Category in muted small font above title */}
                            <span
                              className={`block text-[11px] uppercase tracking-wider leading-tight select-none ${
                                isInactive ? 'text-slate-300 font-normal' : 'text-slate-400 font-medium'
                              }`}
                            >
                              {item.category}
                            </span>

                            {/* 2. Product Title - Truncated showcase e.g. RedMode Straight Fit W... */}
                            <h3
                              onCopy={(e) => {
                                if (isInactive) {
                                  e.preventDefault();
                                  showToast('Cannot copy text of an inactive listing');
                                }
                              }}
                              className={`text-xs leading-snug select-none max-w-[210px] truncate ${
                                isInactive ? 'text-slate-400 font-normal cursor-not-allowed' : 'text-slate-800 font-normal'
                              }`}
                              title={isInactive ? 'Inactive listing - copying disabled' : item.productTitle}
                            >
                              {item.productTitle.length > 24 ? `${item.productTitle.slice(0, 24)}...` : item.productTitle}
                            </h3>

                            {/* 3. Specific Size SKU and size badge */}
                            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isInactive) {
                                    showToast('Listing is inactive. SKU copying disabled.');
                                    return;
                                  }
                                  navigator.clipboard.writeText(item.sku);
                                  showToast(`Copied SKU: ${item.sku}`);
                                }}
                                className={`font-mono text-xs border-b border-dashed transition flex items-center gap-1 group/sku select-none ${
                                  isInactive
                                    ? 'text-slate-400 border-slate-300 font-normal cursor-not-allowed'
                                    : 'font-normal text-slate-700 border-slate-300 hover:border-slate-800 hover:text-black cursor-pointer'
                                }`}
                                title={isInactive ? 'Listing is inactive - copying disabled' : 'Click to copy SKU'}
                              >
                                <span>{item.sku}</span>
                                {!isInactive && (
                                  <Copy className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/sku:opacity-100 transition" />
                                )}
                              </button>

                              <span
                                className={`text-[10px] font-normal px-2 py-0.5 rounded-md border select-none ${
                                  isInactive
                                    ? 'text-slate-400 bg-slate-100/80 border-slate-200 font-normal'
                                    : 'text-slate-600 bg-slate-100 border-slate-200'
                                }`}
                              >
                                {item.sizeLabel}
                              </span>

                              {isInactive && (
                                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none">
                                  <EyeOff className="w-2.5 h-2.5" />
                                  <span>Inactive</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price & Discount (Normal, Inline Editable without Box) */}
                      <td className="py-3.5 px-4">
                        {isInactive ? (
                          <div
                            onClick={() => showToast('Listing is inactive. Activate listing to update price.')}
                            className="space-y-0.5 select-none cursor-not-allowed opacity-60"
                            title="Listing is inactive. Activate listing to update price."
                          >
                            <div className="text-xs text-slate-400">
                              Listing: <span className="font-mono">₹{item.listingPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <span>
                                Final: <span className="font-mono">₹{item.salePrice.toLocaleString('en-IN')}</span>
                              </span>
                              <Lock className="w-3 h-3 text-slate-400 inline ml-0.5" />
                            </div>
                          </div>
                        ) : priceEditingRowKey === item.rowKey ? (
                          /* Inline Price Inputs */
                          <div className="space-y-1.5 py-0.5 min-w-[210px]">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500 w-14 shrink-0 text-[11px]">Listing (₹):</span>
                              <input
                                type="number"
                                min="1"
                                value={editInlineListing}
                                onChange={(e) => setEditInlineListing(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePrice(item);
                                  if (e.key === 'Escape') setPriceEditingRowKey(null);
                                }}
                                className="w-20 px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-xs text-slate-900 outline-none focus:border-slate-800"
                                placeholder="Listing"
                                autoFocus
                              />
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500 w-14 shrink-0 text-[11px]">Final (₹):</span>
                              <input
                                type="number"
                                min="1"
                                value={editInlineSale}
                                onChange={(e) => setEditInlineSale(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePrice(item);
                                  if (e.key === 'Escape') setPriceEditingRowKey(null);
                                }}
                                className="w-20 px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-xs text-emerald-700 font-semibold outline-none focus:border-emerald-600"
                                placeholder="Final"
                              />

                              {/* Live calculated customer discount */}
                              {(() => {
                                const l = parseFloat(editInlineListing) || 0;
                                const s = parseFloat(editInlineSale) || 0;
                                const disc = l > s && l > 0 ? Math.round(((l - s) / l) * 100) : 0;
                                return (
                                  <span className="text-[11px] font-semibold text-emerald-600 whitespace-nowrap">
                                    {disc > 0 ? `${disc}% OFF` : '0%'}
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(item)}
                                className="px-2.5 py-0.5 rounded bg-black text-white text-[11px] font-medium hover:bg-slate-800 transition cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setPriceEditingRowKey(null)}
                                className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 text-[11px] hover:bg-slate-100 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal Display - Plain text, outside editable */
                          <div className="space-y-0.5">
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span>Listing:</span>
                              <span className="font-mono text-slate-800">₹{item.listingPrice.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500">Final:</span>
                              <span className="font-mono font-normal text-emerald-700">₹{item.salePrice.toLocaleString('en-IN')}</span>

                              {(() => {
                                const disc =
                                  item.listingPrice > item.salePrice
                                    ? Math.round(((item.listingPrice - item.salePrice) / item.listingPrice) * 100)
                                    : 0;
                                return disc > 0 ? (
                                  <span className="text-[11px] font-normal text-emerald-600">
                                    ({disc}% OFF)
                                  </span>
                                ) : null;
                              })()}

                              <button
                                type="button"
                                onClick={() => handleStartPriceEdit(item)}
                                className="text-slate-400 hover:text-slate-900 transition p-0.5 rounded cursor-pointer ml-1 inline-flex items-center"
                                title="Click to edit prices inline"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Stock Column with Units & Inline Quick Edit */}
                      <td className="py-3.5 px-4">
                        {isInactive ? (
                          <div
                            onClick={() => showToast('Listing is inactive. Activate listing to update stock.')}
                            className="space-y-1 select-none cursor-not-allowed opacity-60"
                            title="Listing is inactive. Activate listing to update stock."
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm font-normal text-slate-400 flex items-center gap-1">
                                {item.stock} units
                                <Lock className="w-3 h-3 text-slate-400 inline ml-0.5" />
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span>Listing Inactive</span>
                            </div>
                          </div>
                        ) : stockEditingKey === item.rowKey ? (
                          <div className="flex items-center gap-1 max-w-[130px]">
                            <input
                              type="number"
                              min="0"
                              value={editStockValue}
                              onChange={(e) => setEditStockValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveStock(item.productId, item.colorIndex, item.sizeKey, parseInt(editStockValue, 10) || 0);
                                } else if (e.key === 'Escape') {
                                  setStockEditingKey(null);
                                }
                              }}
                              autoFocus
                              className="w-16 px-2 py-1 bg-white border border-slate-400 rounded-lg text-xs font-mono text-center outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveStock(item.productId, item.colorIndex, item.sizeKey, parseInt(editStockValue, 10) || 0)
                              }
                              className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center hover:bg-slate-800 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setStockEditingKey(null)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {/* Stock units number */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setStockEditingKey(item.rowKey);
                                  setEditStockValue(item.stock.toString());
                                }}
                                className={`font-mono text-sm font-normal hover:underline cursor-pointer ${
                                  item.stock >= 10 ? 'text-slate-800' : 'text-red-600'
                                }`}
                                title="Click to update stock directly"
                              >
                                {item.stock} units
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStockEditingKey(item.rowKey);
                                  setEditStockValue(item.stock.toString());
                                }}
                                className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                title="Edit stock"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Stock status (Low stock / Out of stock indicator only, DoH removed) */}
                            {isOutOfStock ? (
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="inline-flex items-center gap-1 font-normal text-red-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                  <span>Out of stock</span>
                                </span>
                              </div>
                            ) : isLowStock ? (
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="inline-flex items-center gap-1 font-normal text-amber-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Low stock</span>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Quick Actions - Normal text without box right in front of stock */}
                      <td className="py-3.5 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => {
                            if (isInactive) {
                              showToast('Listing is inactive. Activate listing to edit product details.');
                              return;
                            }
                            onEditProduct(item.product, item.colorIndex);
                          }}
                          className={`text-xs font-normal transition inline-flex items-center gap-1 select-none ${
                            isInactive
                              ? 'text-slate-400 cursor-not-allowed opacity-60'
                              : 'text-slate-600 hover:text-black hover:underline cursor-pointer'
                          }`}
                          title={isInactive ? 'Listing is inactive' : 'Edit product'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-slate-900">{filteredItems.length}</strong> of{' '}
            <strong className="text-slate-900">{inventoryItems.length}</strong> total size SKUs
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-black" />
              <span>10+ units: Healthy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>&lt; 10 units: Low Stock</span>
            </span>
          </div>
        </div>
      </div>



      {/* Add Size / SKU Modal */}
      {isAddSkuModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-900">Add New Size / SKU Variant</h3>
              <button
                type="button"
                onClick={() => setIsAddSkuModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {/* Product selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Product</label>
                <select
                  value={addSkuProductId}
                  onChange={(e) => {
                    setAddSkuProductId(e.target.value);
                    setAddSkuColorIndex(0);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Color variant selector */}
              {(() => {
                const selProd = products.find((p) => p.id === addSkuProductId);
                if (!selProd || !selProd.colorOptions || selProd.colorOptions.length === 0) return null;
                return (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Color Variant</label>
                    <select
                      value={addSkuColorIndex}
                      onChange={(e) => setAddSkuColorIndex(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 outline-none"
                    >
                      {selProd.colorOptions.map((c, idx) => (
                        <option key={c.name + idx} value={idx}>
                          {c.name} ({c.sku || 'No SKU'})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {/* Size & SKU Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Size (e.g. 38, 40, 42)</label>
                  <input
                    type="text"
                    value={addSkuSize}
                    onChange={(e) => setAddSkuSize(e.target.value)}
                    placeholder="38, 40, 42, 44..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom SKU (Optional)</label>
                  <input
                    type="text"
                    value={addSkuCustomCode}
                    onChange={(e) => setAddSkuCustomCode(e.target.value)}
                    placeholder="e.g. RM-T-00-38"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Listing (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={addSkuListingPrice}
                    onChange={(e) => setAddSkuListingPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sale (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={addSkuSalePrice}
                    onChange={(e) => setAddSkuSalePrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-emerald-700 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={addSkuStock}
                    onChange={(e) => setAddSkuStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none text-center"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsAddSkuModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewSizeSku}
                className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                Save Size SKU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Selected Listing(s)?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to permanently delete{' '}
                <strong className="text-slate-800 font-semibold">{getSelectedProducts().uniqueProducts.length} listing(s)</strong>{' '}
                ({selectedRowKeys.length} SKUs). This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer shadow-xs"
              >
                Yes, Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
