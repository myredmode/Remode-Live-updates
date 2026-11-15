import { AdminRole, AdminUser } from '../types';

/**
 * REDMODE — Enterprise Granular Permission Management System (RBAC)
 *
 * Supported Roles:
 * 1. Super Admin
 *    - Full access to all system modules, financial analytics, store settings, integrations, and staff governance.
 *
 * 2. Listing Admin
 *    - Dedicated Catalog & Merchandising specialist.
 *    - Access to: All Products, Add/Edit Products, Bulk Product Edits, Inventory Stock Management, Categories & Banners.
 *    - Strictly Restricted from: Orders & Shipping Labels, Live Store Overview, Revenue/Financials, Business Analytics,
 *      Deleting Products (unless explicitly granted), Integrations, Store Settings, and Admin Management.
 *
 * 3. Label Admin
 *    - Dedicated Order Fulfillment & Dispatch specialist.
 *    - Access to: Orders & Shipping Desk, Order Search, Order Details, Status Updates, AWB Generation,
 *      Thermal Shipping Label Printing, Manifest Download, and RTO/NDR Intelligence.
 *    - Strictly Restricted from: Product Catalog, Inventory, Categories, Live Store Overview, Revenue/Financials,
 *      Business Analytics, Integrations, Store Settings, and Admin Management.
 *
 * 4. Listing + Label Admin
 *    - Combined Catalog Merchandising + Order Fulfillment operations role.
 *    - Access to: All Listing Admin permissions + All Label Admin permissions.
 *    - Strictly Restricted from: Live Store Overview, Revenue/Financials, Business Analytics, Deleting Products
 *      (unless explicitly granted), Integrations, Store Settings, and Admin Management.
 */

export type AdminPermission =
  // Overview & Business Intelligence
  | 'view_dashboard'
  | 'view_analytics'
  | 'view_revenue_metrics'
  | 'manage_festive_campaigns'
  // Catalog, Listings & Inventory ('Listing Admin' core domain)
  | 'view_products'
  | 'add_product'
  | 'edit_product'
  | 'delete_product'
  | 'bulk_edit_products'
  | 'manage_inventory'
  | 'manage_categories'
  // Orders, Dispatch & Shipping Labels ('Label Admin' core domain)
  | 'view_orders'
  | 'search_orders'
  | 'view_order_details'
  | 'update_order_status'
  | 'generate_awb'
  | 'print_shipping_label'
  | 'download_manifest'
  | 'view_rto_ndr'
  // Customer & Growth Operations
  | 'view_customers'
  | 'view_marketing'
  // System, Integrations & Governance ('Super Admin' exclusive domain)
  | 'view_settings'
  | 'manage_store_settings'
  | 'manage_integrations'
  | 'manage_domain_dns'
  | 'manage_admins';

export type PermissionCategory =
  | 'Catalog & Listings'
  | 'Orders & Label Dispatch'
  | 'Overview & Analytics'
  | 'Customers & Growth'
  | 'System & Governance';

export interface PermissionDefinition {
  key: AdminPermission;
  label: string;
  description: string;
  category: PermissionCategory;
  superAdminOnly?: boolean;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Catalog & Listings
  {
    key: 'view_products',
    label: 'View Product Catalog',
    description: 'Browse all products, SKUs, pricing, and color variants in the catalog.',
    category: 'Catalog & Listings',
  },
  {
    key: 'add_product',
    label: 'Create New Listings',
    description: 'Add new garment products, upload photos/videos, and configure size variants.',
    category: 'Catalog & Listings',
  },
  {
    key: 'edit_product',
    label: 'Edit Existing Listings',
    description: 'Modify product titles, descriptions, prices, color variants, and promotional tags.',
    category: 'Catalog & Listings',
  },
  {
    key: 'bulk_edit_products',
    label: 'Bulk Catalog Actions',
    description: 'Perform bulk status updates and bulk category reassignments across selected listings.',
    category: 'Catalog & Listings',
  },
  {
    key: 'delete_product',
    label: 'Delete Products',
    description: 'Permanently delete single or bulk product listings from the store catalog.',
    category: 'Catalog & Listings',
  },
  {
    key: 'manage_inventory',
    label: 'Manage Inventory & Stock',
    description: 'Update size-wise stock quantities and manage low-stock/sold-out alerts.',
    category: 'Catalog & Listings',
  },
  {
    key: 'manage_categories',
    label: 'Manage Categories & Banners',
    description: 'Create, edit, and reorder storefront categories and promotional hero banners.',
    category: 'Catalog & Listings',
  },

  // Orders & Label Dispatch
  {
    key: 'view_orders',
    label: 'Access Orders Desk',
    description: 'View incoming customer orders, payment modes (Prepaid/COD), and dispatch queues.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'search_orders',
    label: 'Search & Filter Orders',
    description: 'Search orders by Order ID, customer phone number, or courier AWB number.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'view_order_details',
    label: 'View Customer & Shipping Info',
    description: 'Inspect delivery addresses, item breakdowns, and COD verification status.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'update_order_status',
    label: 'Update Order Status',
    description: 'Mark orders as Confirmed, Packed, Shipped, Delivered, or Cancelled.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'generate_awb',
    label: 'Generate Courier AWB',
    description: 'Assign Delhivery/courier AWB tracking numbers to confirmed orders.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'print_shipping_label',
    label: 'Print Shipping Labels & Invoices',
    description: 'Generate and print thermal shipping labels and GST tax invoices.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'download_manifest',
    label: 'Download Dispatch Manifests',
    description: 'Export daily courier pickup manifests and scan-based dispatch sheets.',
    category: 'Orders & Label Dispatch',
  },
  {
    key: 'view_rto_ndr',
    label: 'View RTO & NDR Intelligence',
    description: 'Monitor Return-to-Origin (RTO) risk indicators and non-delivery reports.',
    category: 'Orders & Label Dispatch',
  },

  // Overview & Analytics
  {
    key: 'view_dashboard',
    label: 'Access Live Store Overview',
    description: 'View executive home dashboard, live store pulse, and operational summaries.',
    category: 'Overview & Analytics',
  },
  {
    key: 'view_revenue_metrics',
    label: 'View Revenue & Financial Metrics',
    description: 'See gross order value, confirmed revenue, collected payments, and AOV.',
    category: 'Overview & Analytics',
  },
  {
    key: 'view_analytics',
    label: 'Access Business Analytics',
    description: 'View conversion funnels, traffic sources, and top-performing category insights.',
    category: 'Overview & Analytics',
  },
  {
    key: 'manage_festive_campaigns',
    label: 'Manage Festive Campaigns',
    description: 'Configure Indian festival calendar alerts and seasonal sale campaigns.',
    category: 'Overview & Analytics',
  },

  // Customers & Growth
  {
    key: 'view_customers',
    label: 'Access Customers & WhatsApp Hub',
    description: 'View customer profiles, order history, COD overrides, and WhatsApp support chat.',
    category: 'Customers & Growth',
  },
  {
    key: 'view_marketing',
    label: 'Manage Marketing & Coupons',
    description: 'Create and manage discount codes, promotional offers, and marketing rules.',
    category: 'Customers & Growth',
  },

  // System & Governance
  {
    key: 'view_settings',
    label: 'View Store Settings',
    description: 'Access store configuration, policies, and operational preferences.',
    category: 'System & Governance',
    superAdminOnly: true,
  },
  {
    key: 'manage_store_settings',
    label: 'Modify Store Settings',
    description: 'Update store branding, checkout rules, tax settings, and security policies.',
    category: 'System & Governance',
    superAdminOnly: true,
  },
  {
    key: 'manage_integrations',
    label: 'Manage API Integrations',
    description: 'Configure Razorpay, PayPal, Delhivery, Meta WhatsApp Cloud API, and 2Factor SMS.',
    category: 'System & Governance',
    superAdminOnly: true,
  },
  {
    key: 'manage_domain_dns',
    label: 'Manage Domain & DNS',
    description: 'Configure custom domain routing, SSL verification, and DNS records.',
    category: 'System & Governance',
    superAdminOnly: true,
  },
  {
    key: 'manage_admins',
    label: 'Manage Admin Staff & Roles',
    description: 'Create, edit, disable, or delete staff accounts and customize granular permissions.',
    category: 'System & Governance',
    superAdminOnly: true,
  },
];

export const ALL_PERMISSIONS: AdminPermission[] = PERMISSION_CATALOG.map((p) => p.key);

export const LISTING_ADMIN_PERMISSIONS: AdminPermission[] = [
  'view_products',
  'add_product',
  'edit_product',
  'bulk_edit_products',
  'manage_inventory',
  'manage_categories',
];

export const LABEL_ADMIN_PERMISSIONS: AdminPermission[] = [
  'view_orders',
  'search_orders',
  'view_order_details',
  'update_order_status',
  'generate_awb',
  'print_shipping_label',
  'download_manifest',
  'view_rto_ndr',
];

export const LISTING_LABEL_ADMIN_PERMISSIONS: AdminPermission[] = Array.from(
  new Set<AdminPermission>([...LISTING_ADMIN_PERMISSIONS, ...LABEL_ADMIN_PERMISSIONS])
);

export const SUPER_ADMIN_PERMISSIONS: AdminPermission[] = [...ALL_PERMISSIONS];

export const ROLE_PERMISSIONS_MAP: Record<AdminRole, AdminPermission[]> = {
  'Super Admin': SUPER_ADMIN_PERMISSIONS,
  'Listing Admin': LISTING_ADMIN_PERMISSIONS,
  'Label Admin': LABEL_ADMIN_PERMISSIONS,
  'Listing + Label Admin': LISTING_LABEL_ADMIN_PERMISSIONS,
};

/**
 * Returns the default preset permissions for a given AdminRole.
 */
export function getDefaultPermissionsForRole(role: AdminRole): AdminPermission[] {
  return [...(ROLE_PERMISSIONS_MAP[role] || [])];
}

/**
 * Resolves the effective permissions for either an AdminUser object (supporting custom per-user overrides)
 * or an AdminRole string.
 */
export function getEffectivePermissions(
  userOrRole: AdminUser | AdminRole | null | undefined
): AdminPermission[] {
  if (!userOrRole) return [];

  const role: AdminRole = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;

  // Super Admin always retains full permissions and cannot be restricted
  if (role === 'Super Admin') {
    return SUPER_ADMIN_PERMISSIONS;
  }

  // If an AdminUser object has explicit custom permissions configured, honor them
  // (while ensuring superAdminOnly governance permissions cannot be escalated to non-Super Admins)
  if (
    typeof userOrRole === 'object' &&
    Array.isArray(userOrRole.permissions) &&
    userOrRole.permissions.length > 0
  ) {
    const validKeys = new Set<string>(ALL_PERMISSIONS);
    const superAdminOnlyKeys = new Set<string>(
      PERMISSION_CATALOG.filter((p) => p.superAdminOnly).map((p) => p.key)
    );
    return userOrRole.permissions.filter(
      (p): p is AdminPermission => validKeys.has(p) && !superAdminOnlyKeys.has(p)
    );
  }

  return ROLE_PERMISSIONS_MAP[role] || [];
}

/**
 * Checks whether a user (or role) holds a specific granular permission.
 */
export function hasPermission(
  userOrRole: AdminUser | AdminRole | null | undefined,
  permission: AdminPermission
): boolean {
  if (!userOrRole) return false;
  const role: AdminRole = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  if (role === 'Super Admin') return true;

  const effective = getEffectivePermissions(userOrRole);
  return effective.includes(permission);
}

/**
 * Checks whether a user (or role) holds AT LEAST ONE of the specified permissions.
 */
export function hasAnyPermission(
  userOrRole: AdminUser | AdminRole | null | undefined,
  permissions: AdminPermission[]
): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((perm) => hasPermission(userOrRole, perm));
}

/**
 * Checks whether a user (or role) holds ALL of the specified permissions.
 */
export function hasAllPermissions(
  userOrRole: AdminUser | AdminRole | null | undefined,
  permissions: AdminPermission[]
): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.every((perm) => hasPermission(userOrRole, perm));
}

/**
 * Maps each AdminPanel tab ID to the granular permissions required to access it.
 */
export function getTabRequiredPermissions(tab: string): AdminPermission[] {
  switch (tab) {
    case 'home':
      return ['view_dashboard'];
    case 'catalog':
      return ['view_products'];
    case 'add-product':
      return ['add_product', 'edit_product'];
    case 'inventory':
      return ['manage_inventory'];
    case 'categories-banners':
      return ['manage_categories'];
    case 'finances':
    case 'orders':
      return ['view_orders'];
    case 'customers':
      return ['view_customers'];
    case 'marketing':
      return ['view_marketing'];
    case 'analytics':
      return ['view_analytics'];
    case 'integrations':
    case 'payment-settings':
      return ['manage_integrations'];
    case 'domain-dns':
      return ['manage_domain_dns'];
    case 'settings':
      return ['view_settings', 'manage_store_settings'];
    case 'admin-management':
      return ['manage_admins'];
    default:
      return ['view_dashboard'];
  }
}

/**
 * Evaluates whether a given AdminUser or AdminRole is allowed to view a specific AdminPanel tab.
 */
export function isTabAllowed(
  userOrRole: AdminUser | AdminRole | null | undefined,
  tab: string
): boolean {
  if (!userOrRole) return false;
  const role: AdminRole = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  if (role === 'Super Admin') return true;

  const requiredPermissions = getTabRequiredPermissions(tab);
  return hasAnyPermission(userOrRole, requiredPermissions);
}

/**
 * Returns the appropriate landing tab in AdminPanel for a given AdminUser or AdminRole.
 */
export function getDefaultTabForRole(
  userOrRole: AdminUser | AdminRole | null | undefined
): 'home' | 'catalog' | 'finances' {
  if (hasPermission(userOrRole, 'view_dashboard')) return 'home';
  if (hasPermission(userOrRole, 'view_products')) return 'catalog';
  if (hasPermission(userOrRole, 'view_orders')) return 'finances';
  return 'catalog';
}

export function getRoleBadgeInfo(role: AdminRole) {
  switch (role) {
    case 'Super Admin':
      return {
        label: 'Super Admin',
        shortDesc: 'Full System Access',
        colorClass: 'bg-red-50 text-red-600 border-red-200 font-normal',
        dotClass: 'bg-red-500',
        badgeBg: 'bg-red-50 border-red-200',
        badgeText: 'text-red-600',
        dotBg: 'bg-red-500',
      };
    case 'Listing Admin':
      return {
        label: 'Listing Admin',
        shortDesc: 'Catalog, Products, Variants, Inventory & Categories',
        colorClass: 'bg-violet-50 text-violet-700 border-violet-200 font-medium',
        dotClass: 'bg-violet-600',
        badgeBg: 'bg-violet-50 border-violet-200',
        badgeText: 'text-violet-700',
        dotBg: 'bg-violet-600',
      };
    case 'Listing + Label Admin':
      return {
        label: 'Listing + Label Admin',
        shortDesc: 'Products, Inventory & Order Labels',
        colorClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
        dotClass: 'bg-blue-600',
        badgeBg: 'bg-blue-50 border-blue-200',
        badgeText: 'text-blue-700',
        dotBg: 'bg-blue-600',
      };
    case 'Label Admin':
      return {
        label: 'Label Admin',
        shortDesc: 'Orders, AWB, Labels & Manifests Only',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
        dotClass: 'bg-emerald-600',
        badgeBg: 'bg-emerald-50 border-emerald-200',
        badgeText: 'text-emerald-700',
        dotBg: 'bg-emerald-600',
      };
  }
}
