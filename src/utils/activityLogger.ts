import { AdminActivityLog, AdminRole } from '../types';

const STORAGE_KEY = 'redmode_admin_activity_logs_v1';
const EVENT_NAME = 'redmode:activity_logged';

// Realistic initial seeded activities for Label Admin & Listing + Label Admin
const now = Date.now();
const m = 60 * 1000;
const h = 60 * m;
const d = 24 * h;

const INITIAL_ACTIVITIES: AdminActivityLog[] = [
  // --- LABEL ADMIN (Shipping Desk recent actions) ---
  {
    id: 'act-label-1',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Generated AWB #60669610000088 for Order #ORD-8924',
    type: 'awb_generation',
    target: 'ORD-8924',
    timestamp: new Date(now - 6 * m).toISOString(),
  },
  {
    id: 'act-label-2',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Printed Delhivery 4x6 Thermal Shipping Label for Order #ORD-8921',
    type: 'label_print',
    target: 'ORD-8921',
    timestamp: new Date(now - 19 * m).toISOString(),
  },
  {
    id: 'act-label-3',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Generated AWB #60669610000075 for Order #ORD-8919',
    type: 'awb_generation',
    target: 'ORD-8919',
    timestamp: new Date(now - 38 * m).toISOString(),
  },
  {
    id: 'act-label-4',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Downloaded Dispatch Manifest for 6 RTD Surface Shipments',
    type: 'manifest_download',
    target: 'MFST-MEERUT-68',
    timestamp: new Date(now - 65 * m).toISOString(),
  },
  {
    id: 'act-label-5',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: "Updated status of Order #ORD-8912 to 'In Transit' (Courier Pickup Verified)",
    type: 'order_status',
    target: 'ORD-8912',
    timestamp: new Date(now - 110 * m).toISOString(),
  },

  // --- LISTING + LABEL ADMIN (Catalog & Shipping Desk recent actions) ---
  {
    id: 'act-listing-1',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Updated inventory for 'Embroidered Velvet Kurti Set' (Size XL: +15 units)",
    type: 'inventory_update',
    target: 'prod-velvet-kurti',
    timestamp: new Date(now - 12 * m).toISOString(),
  },
  {
    id: 'act-listing-2',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Created new product listing 'Georgette Anarkali Suit - Crimson Red'",
    type: 'product_create',
    target: 'prod-anarkali-crimson',
    timestamp: new Date(now - 45 * m).toISOString(),
  },
  {
    id: 'act-listing-3',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: 'Generated AWB #60669610000062 for Order #ORD-8918',
    type: 'awb_generation',
    target: 'ORD-8918',
    timestamp: new Date(now - 75 * m).toISOString(),
  },
  {
    id: 'act-listing-4',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Updated price & size chart for 'Zari Work Silk Saree'",
    type: 'product_update',
    target: 'prod-zari-silk',
    timestamp: new Date(now - 130 * m).toISOString(),
  },
  {
    id: 'act-listing-5',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: 'Printed Delhivery 4x6 Thermal Shipping Label for Order #ORD-8915',
    type: 'label_print',
    target: 'ORD-8915',
    timestamp: new Date(now - 180 * m).toISOString(),
  },

  // --- EXTENDED HISTORY: WITHIN LAST 30 DAYS ---
  {
    id: 'act-label-past-1',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Generated AWB #60669610000045 for Order #ORD-8890',
    type: 'awb_generation',
    target: 'ORD-8890',
    timestamp: new Date(now - 2 * d - 3 * h).toISOString(),
  },
  {
    id: 'act-listing-past-1',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Restocked 20 units for 'Festive Bandhani Saree' (SKU: BND-RED-01)",
    type: 'inventory_update',
    target: 'BND-RED-01',
    timestamp: new Date(now - 5 * d - 4 * h).toISOString(),
  },
  {
    id: 'act-label-past-2',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Printed Batch of 12 Thermal Labels for Morning Pickup Manifest',
    type: 'label_print',
    target: 'BATCH-SURFACE-09',
    timestamp: new Date(now - 9 * d).toISOString(),
  },
  {
    id: 'act-listing-past-2',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Added high-resolution product gallery to 'Chanderi Silk Dupatta'",
    type: 'product_update',
    target: 'prod-chanderi-silk',
    timestamp: new Date(now - 14 * d).toISOString(),
  },
  {
    id: 'act-label-past-3',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Handed over 15 packages to Delhivery rider & signed pickup slip',
    type: 'manifest_download',
    target: 'DEL-PICKUP-8902',
    timestamp: new Date(now - 22 * d).toISOString(),
  },

  // --- OLDER THAN 30 DAYS (Eligible for 1-month purge) ---
  {
    id: 'act-label-old-1',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Printed Thermal 4x6 Label for Order #ORD-8710 (Archive Cycle)',
    type: 'label_print',
    target: 'ORD-8710',
    timestamp: new Date(now - 34 * d).toISOString(),
  },
  {
    id: 'act-listing-old-1',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Initial catalog listing created for 'Pure Cotton Printed Kurta'",
    type: 'product_create',
    target: 'prod-cotton-kurta',
    timestamp: new Date(now - 38 * d).toISOString(),
  },
  {
    id: 'act-label-old-2',
    adminId: 'admin-staff-label',
    adminName: 'Rahul Sharma (Dispatch Lead)',
    role: 'Label Admin',
    action: 'Generated AWB #60669610000010 for Order #ORD-8692',
    type: 'awb_generation',
    target: 'ORD-8692',
    timestamp: new Date(now - 45 * d).toISOString(),
  },
  {
    id: 'act-listing-old-2',
    adminId: 'admin-staff-listing',
    adminName: 'Vikas Verma (Catalog & Labels)',
    role: 'Listing + Label Admin',
    action: "Set seasonal festive discounts on festive saree collection",
    type: 'product_update',
    target: 'CAT-FESTIVE-SAREE',
    timestamp: new Date(now - 52 * d).toISOString(),
  },
];

export function getAdminActivities(): AdminActivityLog[] {
  if (typeof window === 'undefined') return INITIAL_ACTIVITIES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse admin activity logs from localStorage', e);
  }
  // Store default if not present
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ACTIVITIES));
  } catch (e) {}
  return INITIAL_ACTIVITIES;
}

export function getActivitiesForRole(role: AdminRole, limit = 5): AdminActivityLog[] {
  const all = getAdminActivities();
  return all.filter((act) => act.role === role).slice(0, limit);
}

export function getActivitiesForUser(adminId: string, limit = 5): AdminActivityLog[] {
  const all = getAdminActivities();
  return all.filter((act) => act.adminId === adminId).slice(0, limit);
}

export function logAdminActivity(entry: {
  adminId?: string;
  adminName?: string;
  role?: AdminRole;
  action: string;
  type: AdminActivityLog['type'];
  target?: string;
}): AdminActivityLog {
  const all = getAdminActivities();
  
  // Try to resolve current admin from localStorage if not explicitly provided
  let adminId = entry.adminId;
  let adminName = entry.adminName;
  let role = entry.role;

  if (!adminId || !adminName || !role) {
    try {
      const storedUser = localStorage.getItem('redmode_current_admin_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed) {
          adminId = adminId || parsed.id || 'admin-super-1';
          adminName = adminName || parsed.name || 'Aamir';
          role = role || parsed.role || 'Super Admin';
        }
      }
    } catch (e) {}
  }

  const newLog: AdminActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    adminId: adminId || 'admin-staff-label',
    adminName: adminName || 'Staff Member',
    role: role || 'Label Admin',
    action: entry.action,
    type: entry.type,
    target: entry.target,
    timestamp: new Date().toISOString(),
  };

  const updated = [newLog, ...all].slice(0, 80); // Keep last 80 actions in history
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newLog }));
    }
  } catch (e) {}

  return newLog;
}

export function subscribeToActivities(callback: (logs: AdminActivityLog[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    callback(getAdminActivities());
  };

  window.addEventListener(EVENT_NAME, handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener(EVENT_NAME, handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

export function formatActivityTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

/**
 * Clear activity logs older than a given number of days (default 30 days / 1 month)
 */
export function clearActivitiesOlderThan(days = 30): { removedCount: number; remainingCount: number } {
  const all = getAdminActivities();
  const thresholdMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const remaining = all.filter((log) => {
    const logTime = new Date(log.timestamp).getTime();
    return !isNaN(logTime) && logTime >= thresholdMs;
  });

  const removedCount = all.length - remaining.length;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  } catch (e) {}

  return { removedCount, remainingCount: remaining.length };
}

/**
 * Clear activity logs for a specific role or all staff
 */
export function clearActivitiesByRole(role?: AdminRole): { removedCount: number; remainingCount: number } {
  const all = getAdminActivities();
  const remaining = role ? all.filter((log) => log.role !== role) : [];
  const removedCount = all.length - remaining.length;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  } catch (e) {}

  return { removedCount, remainingCount: remaining.length };
}

/**
 * Restore sample historical activities if needed
 */
export function restoreSampleActivities(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ACTIVITIES));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  } catch (e) {}
}

export interface ActivityDateFilterOptions {
  preset?: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
}

/**
 * Export staff activity logs to CSV
 * Supports role filter ('Label Admin' | 'Listing + Label Admin' | 'all') and Date Filtering
 */
export function exportActivitiesToCSV(
  role?: AdminRole | 'all',
  dateOptions?: ActivityDateFilterOptions
): { count: number; filename: string } {
  const all = getAdminActivities();
  let targetLogs = role && role !== 'all' ? all.filter((l) => l.role === role) : all;

  let dateSlug = '';
  if (dateOptions && dateOptions.preset && dateOptions.preset !== 'all') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    targetLogs = targetLogs.filter((l) => {
      const t = new Date(l.timestamp).getTime();
      if (isNaN(t)) return false;

      switch (dateOptions.preset) {
        case 'today':
          return t >= startOfToday;
        case 'yesterday':
          return t >= startOfToday - oneDayMs && t < startOfToday;
        case '7days':
          return t >= startOfToday - 7 * oneDayMs;
        case '30days':
          return t >= startOfToday - 30 * oneDayMs;
        case 'custom': {
          if (dateOptions.startDate) {
            const startT = new Date(dateOptions.startDate).setHours(0, 0, 0, 0);
            if (t < startT) return false;
          }
          if (dateOptions.endDate) {
            const endT = new Date(dateOptions.endDate).setHours(23, 59, 59, 999);
            if (t > endT) return false;
          }
          return true;
        }
        default:
          return true;
      }
    });

    if (dateOptions.preset === 'custom' && dateOptions.startDate && dateOptions.endDate) {
      dateSlug = `_${dateOptions.startDate}_to_${dateOptions.endDate}`;
    } else {
      dateSlug = `_${dateOptions.preset}`;
    }
  }

  const headers = [
    'Activity ID',
    'Date & Time',
    'Role',
    'Admin Staff Name',
    'Action Type',
    'Action Description',
    'Target Order / SKU',
    'ISO Timestamp',
  ];

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = targetLogs.map((l) => {
    let dateStr = l.timestamp;
    try {
      dateStr = new Date(l.timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {}

    return [
      escapeCSV(l.id),
      escapeCSV(dateStr),
      escapeCSV(l.role),
      escapeCSV(l.adminName),
      escapeCSV(l.type),
      escapeCSV(l.action),
      escapeCSV(l.target || '-'),
      escapeCSV(l.timestamp),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const roleSlug = role && role !== 'all' ? role.replace(/\s+/g, '_').toLowerCase() : 'all_staff';
  const filename = `REDMODE_${roleSlug}_activity${dateSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: targetLogs.length, filename };
}

