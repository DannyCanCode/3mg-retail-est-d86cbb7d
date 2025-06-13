import * as supa from './estimates';
import * as fire from './firebaseEstimates';

// Determine backend at build/runtime.
// Values: 'firebase' | 'supabase' (default) – set via VITE_BACKEND in .env.*
const backend = (import.meta.env.VITE_BACKEND as string | undefined)?.toLowerCase();
const useFirebase = backend === 'firebase';

/*************************************
 * Type re-exports (always from supa) *
 *************************************/
export type { Estimate, EstimateStatus } from './estimates';

/*************************************
 * CRUD façade                       *
 *************************************/
export const saveEstimate = useFirebase
  ? fire.saveEstimateToFirebase
  : supa.saveEstimate;

export const getEstimates = useFirebase
  ? fire.getEstimatesFromFirebase
  : supa.getEstimates;

export const getEstimateById = useFirebase
  ? fire.getEstimateByIdFromFirebase
  : supa.getEstimateById;

export const updateEstimateStatus = useFirebase
  ? fire.updateEstimateStatusFirebase
  : supa.updateEstimateStatus;

// Functions not yet implemented on Firebase still fall back to Supabase.
export const markEstimateAsSold = supa.markEstimateAsSold;
export const updateEstimateCustomerDetails = supa.updateEstimateCustomerDetails;
export const calculateEstimateTotal = supa.calculateEstimateTotal; 