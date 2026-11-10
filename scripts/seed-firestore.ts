import { db } from '../src/firebase';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_BANNERS,
  INITIAL_SETTINGS,
} from '../src/data/initialData';

function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res;
  }
  return obj;
}

async function seed() {
  console.log('--- Starting Firestore Cloud Seeding ---');

  // 1. Check system_deletions
  const delDocRef = doc(db, 'settings', 'system_deletions');
  const delSnap = await getDoc(delDocRef);
  let deletedProductIds: string[] = [];
  if (delSnap.exists()) {
    deletedProductIds = delSnap.data().deletedProductIds || [];
    console.log('Existing deleted products count:', deletedProductIds.length);
  } else {
    await setDoc(delDocRef, {
      deletedProductIds: [],
      deletedCategoryIds: [],
      deletedBannerIds: [],
      updatedAt: new Date().toISOString(),
    });
    console.log('Created settings/system_deletions doc.');
  }

  // 2. Seed Products
  const prodSnap = await getDocs(collection(db, 'products'));
  const existingProdIds = new Set(prodSnap.docs.map((d) => d.id));
  console.log(`Found ${existingProdIds.size} existing products in Firestore.`);

  let seededProds = 0;
  for (const prod of INITIAL_PRODUCTS) {
    if (!existingProdIds.has(prod.id) && !deletedProductIds.includes(prod.id)) {
      await setDoc(doc(db, 'products', prod.id), cleanForFirestore(prod), { merge: true });
      seededProds++;
    }
  }
  console.log(`Seeded ${seededProds} initial products into Firestore.`);

  // 3. Seed Categories
  const catSnap = await getDocs(collection(db, 'categories'));
  const existingCatIds = new Set(catSnap.docs.map((d) => d.id));
  console.log(`Found ${existingCatIds.size} existing categories in Firestore.`);

  let seededCats = 0;
  for (const cat of INITIAL_CATEGORIES) {
    if (!existingCatIds.has(cat.id)) {
      await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat), { merge: true });
      seededCats++;
    }
  }
  console.log(`Seeded ${seededCats} initial categories into Firestore.`);

  // 4. Seed Banners
  const bannerSnap = await getDocs(collection(db, 'banners'));
  const existingBannerIds = new Set(bannerSnap.docs.map((d) => d.id));
  console.log(`Found ${existingBannerIds.size} existing banners in Firestore.`);

  let seededBanners = 0;
  for (const banner of INITIAL_BANNERS) {
    if (!existingBannerIds.has(banner.id)) {
      await setDoc(doc(db, 'banners', banner.id), cleanForFirestore(banner), { merge: true });
      seededBanners++;
    }
  }
  console.log(`Seeded ${seededBanners} initial banners into Firestore.`);

  // 5. Seed / Update Official Store Settings
  const settingsDocRef = doc(db, 'settings', 'store_settings');
  const settingsSnap = await getDoc(settingsDocRef);
  if (!settingsSnap.exists()) {
    await setDoc(settingsDocRef, cleanForFirestore(INITIAL_SETTINGS));
    console.log('Seeded initial settings to settings/store_settings.');
  } else {
    await setDoc(
      settingsDocRef,
      cleanForFirestore({
        storeName: 'RedMode',
        storeAddress: '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India',
        whatsappNumber: '7302797464',
        supportEmail: 'MyRedMode@gmail.com',
      }),
      { merge: true }
    );
    console.log('Updated official company details in settings/store_settings.');
  }

  console.log('--- Firestore Cloud Seeding Complete! ---');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
