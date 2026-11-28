import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

let cachedDb: Firestore | null = null;
let initAttempted = false;
let firestoreConnected = false;
let lastFirestoreError: string | null = null;
let loadedConfig: FirebaseAppletConfig = {};
let warnedOnce = false;

function readFirebaseConfig(): FirebaseAppletConfig {
  const candidates = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(__dirname, '..', 'firebase-applet-config.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
  }
  return {};
}

export function isServerFirestoreEnabled(): boolean {
  if (process.env.REDMODE_DISABLE_FIRESTORE === 'true') return false;
  if (process.env.ALLOW_LOCAL_TEST_ENDPOINTS === 'true') return false;
  return true;
}

export function toFirestoreOrderDocId(orderId: string): string {
  return String(orderId || '').replace(/[^a-zA-Z0-9_-]/g, '') || `ord_${Date.now()}`;
}

export function toFirestoreProductDocId(productId: string): string {
  return String(productId || '').replace(/[^a-zA-Z0-9_-]/g, '') || `prod_${Date.now()}`;
}

/**
 * Recursively removes `undefined` values so Firestore set/merge writes never throw.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function noteFirestoreError(context: string, err: any) {
  const msg = String(err?.message || err || 'Unknown Firestore error');
  lastFirestoreError = `${context}: ${msg}`;
  if (!warnedOnce) {
    warnedOnce = true;
    const isPreviewIamDenial =
      process.env.REDMODE_STANDALONE_CLOUD_RUN !== 'true' &&
      (err?.code === 7 || msg.includes('PERMISSION_DENIED'));
    if (isPreviewIamDenial) {
      console.log(
        '[Firestore Admin] Preview sandbox running with local cache (production Cloud Run connects directly to Firestore).'
      );
    } else {
      console.warn(`[Firestore Admin] ${context} failed (falling back to local cache): ${msg}`);
    }
  }
}

export function getAdminFirestore(): Firestore | null {
  if (!isServerFirestoreEnabled()) return null;
  if (initAttempted) return cachedDb;
  initAttempted = true;

  loadedConfig = readFirebaseConfig();
  const projectId = (process.env.GOOGLE_CLOUD_PROJECT || loadedConfig.projectId || '').trim();
  const databaseId = (process.env.FIRESTORE_DATABASE_ID || loadedConfig.firestoreDatabaseId || '').trim();

  if (!projectId || projectId === 'remixed-project-id') {
    lastFirestoreError = 'Firebase projectId not configured.';
    return null;
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp({ projectId });
    cachedDb =
      databaseId && databaseId !== '(default)'
        ? getFirestore(app, databaseId)
        : getFirestore(app);
    return cachedDb;
  } catch (err: any) {
    noteFirestoreError('initializeApp/getFirestore', err);
    cachedDb = null;
    return null;
  }
}

export function getFirestoreStoreStatus() {
  return {
    enabled: isServerFirestoreEnabled(),
    connected: firestoreConnected,
    projectId: loadedConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT || null,
    databaseId: loadedConfig.firestoreDatabaseId || '(default)',
    lastError: lastFirestoreError,
  };
}

export async function hydrateAllFromFirestore(): Promise<{
  connected: boolean;
  orders: any[] | null;
  products: any[] | null;
  integrations: Record<string, any> | null;
  whatsappLogs: any[] | null;
  whatsappProcessed: Record<string, any> | null;
  confirmationAuditLogs: any[] | null;
  webhookLogs: any[] | null;
}> {
  const db = getAdminFirestore();
  if (!db) {
    return {
      connected: false,
      orders: null,
      products: null,
      integrations: null,
      whatsappLogs: null,
      whatsappProcessed: null,
      confirmationAuditLogs: null,
      webhookLogs: null,
    };
  }

  try {
    const [
      ordersSnap,
      productsSnap,
      integrationsDoc,
      waLogsDoc,
      waProcessedDoc,
      auditLogsDoc,
      webhookLogsDoc,
    ] = await Promise.all([
      db.collection('orders').get(),
      db.collection('products').get(),
      db.collection('settings_private').doc('integrations_config').get(),
      db.collection('settings_private').doc('whatsapp_logs').get(),
      db.collection('settings_private').doc('whatsapp_processed').get(),
      db.collection('settings_private').doc('confirmation_audit_logs').get(),
      db.collection('settings_private').doc('webhook_logs').get(),
    ]);

    firestoreConnected = true;
    lastFirestoreError = null;

    const orders = ordersSnap.docs
      .map((d) => d.data())
      .filter((o) => o && typeof o === 'object' && o.id)
      .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));

    const products = productsSnap.docs
      .map((d) => d.data())
      .filter((p) => p && typeof p === 'object' && p.id);

    const integrations = integrationsDoc.exists ? (integrationsDoc.data() as Record<string, any>) : null;
    const whatsappLogs = waLogsDoc.exists && Array.isArray(waLogsDoc.data()?.items) ? waLogsDoc.data()!.items : null;
    const whatsappProcessed = waProcessedDoc.exists ? (waProcessedDoc.data() as Record<string, any>) : null;
    const confirmationAuditLogs =
      auditLogsDoc.exists && Array.isArray(auditLogsDoc.data()?.items) ? auditLogsDoc.data()!.items : null;
    const webhookLogs =
      webhookLogsDoc.exists && Array.isArray(webhookLogsDoc.data()?.items) ? webhookLogsDoc.data()!.items : null;

    console.log(
      `[Firestore Admin] Connected to ${loadedConfig.projectId}/${loadedConfig.firestoreDatabaseId || '(default)'} — hydrated ${orders.length} order(s), ${products.length} product(s).`
    );

    return {
      connected: true,
      orders,
      products,
      integrations,
      whatsappLogs,
      whatsappProcessed,
      confirmationAuditLogs,
      webhookLogs,
    };
  } catch (err: any) {
    firestoreConnected = false;
    noteFirestoreError('hydrateAllFromFirestore', err);
    return {
      connected: false,
      orders: null,
      products: null,
      integrations: null,
      whatsappLogs: null,
      whatsappProcessed: null,
      confirmationAuditLogs: null,
      webhookLogs: null,
    };
  }
}

export async function fetchOrderFromFirestore(orderId: string): Promise<any | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const docId = toFirestoreOrderDocId(orderId);
    const snap = await db.collection('orders').doc(docId).get();
    firestoreConnected = true;
    if (snap.exists) {
      return snap.data() || null;
    }
    // Fallback query by exact `id` field in case docId differed
    const q = await db.collection('orders').where('id', '==', orderId).limit(1).get();
    if (!q.empty) return q.docs[0].data() || null;
    return null;
  } catch (err: any) {
    noteFirestoreError('fetchOrderFromFirestore', err);
    return null;
  }
}

export async function fetchAllOrdersFromFirestore(): Promise<any[] | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection('orders').get();
    firestoreConnected = true;
    return snap.docs
      .map((d) => d.data())
      .filter((o) => o && typeof o === 'object' && o.id)
      .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  } catch (err: any) {
    noteFirestoreError('fetchAllOrdersFromFirestore', err);
    return null;
  }
}

export async function persistOrderToFirestore(order: any): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db || !order?.id) return false;
  try {
    const docId = toFirestoreOrderDocId(order.id);
    const clean = stripUndefinedDeep(order);
    await db.collection('orders').doc(docId).set(clean, { merge: true });
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistOrderToFirestore', err);
    return false;
  }
}

export async function persistProductToFirestore(product: any): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db || !product?.id) return false;
  try {
    const docId = toFirestoreProductDocId(product.id);
    const clean = stripUndefinedDeep(product);
    await db.collection('products').doc(docId).set(clean, { merge: true });
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistProductToFirestore', err);
    return false;
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db || !productId) return false;
  try {
    const docId = toFirestoreProductDocId(productId);
    await db.collection('products').doc(docId).delete();
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('deleteProductFromFirestore', err);
    return false;
  }
}

export async function persistIntegrationsToFirestore(cfg: Record<string, any>): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db || !cfg || typeof cfg !== 'object') return false;
  try {
    const clean = stripUndefinedDeep({
      ...cfg,
      _updatedAt: new Date().toISOString(),
    });
    await db.collection('settings_private').doc('integrations_config').set(clean, { merge: true });
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistIntegrationsToFirestore', err);
    return false;
  }
}

export async function persistWhatsAppLogsToFirestore(logs: any[]): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) return false;
  try {
    const cleanItems = stripUndefinedDeep(logs.slice(0, 300));
    await db.collection('settings_private').doc('whatsapp_logs').set({
      items: cleanItems,
      updatedAt: new Date().toISOString(),
    });
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistWhatsAppLogsToFirestore', err);
    return false;
  }
}

export async function persistWhatsAppProcessedToFirestore(state: Record<string, any>): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) return false;
  try {
    const clean = stripUndefinedDeep({
      ...state,
      updatedAt: new Date().toISOString(),
    });
    await db.collection('settings_private').doc('whatsapp_processed').set(clean);
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistWhatsAppProcessedToFirestore', err);
    return false;
  }
}

export async function persistConfirmationAuditLogsToFirestore(logs: any[]): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) return false;
  try {
    const cleanItems = stripUndefinedDeep(logs.slice(0, 300));
    await db.collection('settings_private').doc('confirmation_audit_logs').set({
      items: cleanItems,
      updatedAt: new Date().toISOString(),
    });
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistConfirmationAuditLogsToFirestore', err);
    return false;
  }
}

export async function persistWebhookLogsToFirestore(logs: any[]): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) return false;
  try {
    const cleanItems = stripUndefinedDeep(logs.slice(0, 150));
    await db.collection('settings_private').doc('webhook_logs').set({
      items: cleanItems,
      updatedAt: new Date().toISOString(),
    });
    firestoreConnected = true;
    return true;
  } catch (err: any) {
    noteFirestoreError('persistWebhookLogsToFirestore', err);
    return false;
  }
}
