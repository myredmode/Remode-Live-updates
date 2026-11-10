import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface AuditLogPayload {
  id: string;
  adminId: string;
  adminName: string;
  role: string;
  action: string;
  entity: 'Product' | 'User' | 'Settings' | 'Order' | 'Inventory' | 'Shipment' | 'Coupon' | 'Customer' | 'Security' | 'Return';
  entityId: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

/**
 * Log a critical admin action to Firestore 'AuditLog' collection.
 * This provides an immutable security audit trail for product updates,
 * user status changes, and settings modifications.
 */
export async function recordFirestoreAuditLog(
  action: string,
  entity: AuditLogPayload['entity'],
  entityId: string,
  options?: {
    adminId?: string;
    adminName?: string;
    role?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, any>;
  }
): Promise<AuditLogPayload> {
  const timestamp = new Date().toISOString();
  // Safe alphanumeric and underscore ID conforming to rules regex ^[a-zA-Z0-9_\-]+$
  const logId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const payload: AuditLogPayload = {
    id: logId,
    adminId: options?.adminId || 'admin-super-1',
    adminName: options?.adminName || 'Admin',
    role: options?.role || 'Super Admin',
    action,
    entity,
    entityId: entityId || 'global',
    oldValue: options?.oldValue || '',
    newValue: options?.newValue || '',
    metadata: options?.metadata || {},
    timestamp,
    createdAt: timestamp,
  };

  try {
    // Write directly to Firestore 'AuditLog' collection
    await setDoc(doc(db, 'AuditLog', logId), payload);
  } catch (error) {
    console.debug('Firestore AuditLog recording skipped/offline:', error);
  }

  return payload;
}
