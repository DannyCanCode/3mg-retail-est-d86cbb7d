import * as supa from './estimates';

// We're only using Supabase backend now
export const saveEstimate = supa.saveEstimate;
export const getEstimateById = supa.getEstimateById;
export const updateEstimateStatus = supa.updateEstimateStatus;
export const deleteEstimate = supa.deleteEstimate;
export const trackAdminAction = supa.trackAdminAction;
export const getEstimates = supa.getEstimates;
export const markEstimateAsSold = supa.markEstimateAsSold;
export const generateEstimatePdf = supa.generateEstimatePdf;
export const updateEstimateCustomerDetails = supa.updateEstimateCustomerDetails;
export const calculateEstimateTotal = supa.calculateEstimateTotal;

// Soft delete management functions
export const getDeletedEstimates = supa.getDeletedEstimates;
export const restoreEstimate = supa.restoreEstimate;
export const permanentlyDeleteEstimate = supa.permanentlyDeleteEstimate;

// Re-export types
export type { Estimate, EstimateStatus } from './estimates'; 