import { AdminRole, AdminUser } from '../types';

export type AdminPermission =
  // Dashboard & Analytics
  | 'view_dashboard'
  | 'view_analytics'
  | 'view_customers'
  | 'view_marketing'
  | 'manage_coupons'

  // Product / Catalog
  | 'view_products'
  | 'add_product'
  | 'edit_product'
  | 'delete_product'
  | 'manage_inventory'
  | 'manage_categories'

  // Orders & Shipping & Labels
  | 'view_orders'
  | 'search_orders'
  | 'view_order_details'
  | 'view_shipping_info'
  | 'view_awb'
  | 'generate_awb'
  | 'download_shipping_label'
  | 'print_shipping_label'
  | 'download_manifest'
  | 'view_shipment_status'
  | 'view_rto_ndr'
  | 'update_order_status'
  | 'delete_orders'

  // System Settings, Integrations & User Management
  | 'view_settings'
  | 'manage_store_settings'
  | 'manage_integrations'
  | 'manage_whatsapp_config'
  | 'manage_courier_config'
  | 'manage_admins';

// Permissions assigned to each role
const LABEL_ADMIN_PERMISSIONS: ReadonlySet<AdminPermission> = new Set([
  'view_orders',
  'search_orders',
  'view_order_details',
  'view_shipping_info',
  'view_awb',
  'generate_awb',
  'download_shipping_label',
  'print_shipping_label',
  'download_manifest',
  'view_shipment_status',
  'view_rto_ndr',
  'update_order_status',
]);

const LISTING_LABEL_ADMIN_PERMISSIONS: ReadonlySet<AdminPermission> = new Set([
  ...LABEL_ADMIN_PERMISSIONS,
  'view_products',
  'add_product',
  'edit_product',
  'manage_inventory',
  'manage_categories',
]);

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  if (role === 'Super Admin') {
    return true; // Super Admin has unrestricted access to everything
  }
  if (role === 'Listing + Label Admin') {
    return LISTING_LABEL_ADMIN_PERMISSIONS.has(permission);
  }
  if (role === 'Label Admin') {
    return LABEL_ADMIN_PERMISSIONS.has(permission);
  }
  return false;
}

export function isTabAllowed(role: AdminRole, tab: string): boolean {
  if (role === 'Super Admin') return true;

  if (role === 'Label Admin') {
    // Only Orders / Shipping & Labels Desk
    return tab === 'finances' || tab === 'orders';
  }

  if (role === 'Listing + Label Admin') {
    // Products (catalog, inventory, add-product) + Orders (finances)
    return (
      tab === 'catalog' ||
      tab === 'categories-banners' ||
      tab === 'inventory' ||
      tab === 'add-product' ||
      tab === 'finances' ||
      tab === 'orders'
    );
  }

  return false;
}

export function getDefaultTabForRole(role: AdminRole): 'home' | 'catalog' | 'finances' {
  if (role === 'Super Admin') return 'home';
  if (role === 'Listing + Label Admin') return 'catalog';
  return 'finances'; // Label Admin starts on Orders & Shipping desk
}

export function getRoleBadgeInfo(role: AdminRole) {
  switch (role) {
    case 'Super Admin':
      return {
        label: 'Super Admin',
        badgeBg: 'bg-red-50 border-red-200',
        badgeText: 'text-red-600',
        dotBg: 'bg-red-500',
        description: 'Complete unrestricted ownership & configuration control.',
      };
    case 'Listing + Label Admin':
      return {
        label: 'Listing + Label Admin',
        badgeBg: 'bg-blue-50 border-blue-200',
        badgeText: 'text-blue-700',
        dotBg: 'bg-blue-600',
        description: 'Product listing management, inventory, and order shipping label fulfillment.',
      };
    case 'Label Admin':
      return {
        label: 'Label Admin',
        badgeBg: 'bg-emerald-50 border-emerald-200',
        badgeText: 'text-emerald-700',
        dotBg: 'bg-emerald-600',
        description: 'Order processing, AWB generation, shipping labels, manifests & tracking only. Zero access to Live Sales, Revenue or Analytics dashboard.',
      };
    default:
      return {
        label: role,
        badgeBg: 'bg-slate-50 border-slate-200',
        badgeText: 'text-slate-700',
        dotBg: 'bg-slate-600',
        description: 'Staff member account',
      };
  }
}
