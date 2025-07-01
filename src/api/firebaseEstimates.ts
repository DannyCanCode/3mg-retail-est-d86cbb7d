import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { firebaseDb, isFirebaseConfigured } from '@/integrations/firebase/client';
import type { Estimate, EstimateStatus } from './estimates';

/**
 * Firestore-based Estimate persistence layer.
 * Does not alter existing Supabase logic; call these explicitly once you are ready to switch.
 */

const ESTIMATES_COL = 'estimates';

export const saveEstimateToFirebase = async (
  estimateInput: Partial<Estimate> & { id?: string },
): Promise<{ data: Estimate | null; error: Error | null }> => {
  if (!isFirebaseConfigured()) {
    return { data: null, error: new Error('Firebase not configured') };
  }
  try {
    const now = Timestamp.now();

    // Separate id presence determines create vs update
    if (estimateInput.id) {
      // UPDATE
      const ref = doc(firebaseDb, ESTIMATES_COL, estimateInput.id);
      await updateDoc(ref, {
        ...estimateInput,
        updated_at: now,
      });
      const snap = await getDoc(ref);
      return { data: snap.data() as Estimate, error: null };
    }

    // CREATE
    const colRef = collection(firebaseDb, ESTIMATES_COL);
    const docRef = await addDoc(colRef, {
      status: 'pending',
      created_at: now,
      updated_at: now,
      ...estimateInput,
    });
    const snap = await getDoc(docRef);
    return { data: snap.data() as Estimate, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown Firestore error') };
  }
};

export const getEstimatesFromFirebase = async (
  status?: EstimateStatus,
): Promise<{ data: Estimate[]; error: Error | null }> => {
  if (!isFirebaseConfigured()) {
    return { data: [], error: new Error('Firebase not configured') };
  }
  try {
    const colRef = collection(firebaseDb, ESTIMATES_COL);
    const q = status ? query(colRef, where('status', '==', status)) : colRef;
    const snap = await getDocs(q);
    const estimates: Estimate[] = snap.docs.map((d) => d.data() as Estimate);
    return { data: estimates, error: null };
  } catch (err: any) {
    return { data: [], error: err instanceof Error ? err : new Error('Unknown Firestore error') };
  }
};

export const getEstimateByIdFromFirebase = async (
  id: string,
): Promise<{ data: Estimate | null; error: Error | null }> => {
  if (!isFirebaseConfigured()) {
    return { data: null, error: new Error('Firebase not configured') };
  }
  try {
    const ref = doc(firebaseDb, ESTIMATES_COL, id);
    const snap = await getDoc(ref);
    return { data: snap.exists() ? (snap.data() as Estimate) : null, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown Firestore error') };
  }
};

export const updateEstimateStatusFirebase = async (
  id: string,
  status: EstimateStatus,
  notes?: string,
): Promise<{ data: Estimate | null; error: Error | null }> => {
  if (!isFirebaseConfigured()) {
    return { data: null, error: new Error('Firebase not configured') };
  }
  try {
    const ref = doc(firebaseDb, ESTIMATES_COL, id);
    await updateDoc(ref, {
      status,
      updated_at: serverTimestamp(),
      ...(notes ? { notes } : {}),
    });
    const snap = await getDoc(ref);
    return { data: snap.data() as Estimate, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown Firestore error') };
  }
}; 