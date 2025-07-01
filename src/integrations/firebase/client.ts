import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Grab config from Vite environment variables. These must be provided in `.env.local` or deploy env.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
};

// Safety check — aids debugging in non-configured environments (e.g., Netlify branch with old vars)
if (Object.values(firebaseConfig).some((v) => !v)) {
  // eslint-disable-next-line no-console
  console.warn('[Firebase] Missing config values. Check environment variables.');
}

// Initialize once and cache; Vite hot reload wraps modules, so singletons persist.
const firebaseApp = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

// Helper to assert config presence when performing write operations
export const isFirebaseConfigured = (): boolean =>
  !Object.values(firebaseConfig).some((v) => !v); 