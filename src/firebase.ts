import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Optional connection check helper (not auto-executed on boot)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, '_connection_test', 'ping'));
    return true;
  } catch {
    return false;
  }
}
