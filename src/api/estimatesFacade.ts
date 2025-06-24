import * as supa from './estimates';

// We're only using Supabase backend now
export const saveEstimate = supa.saveEstimate;
export const getEstimates = supa.getEstimates;
export const getEstimateById = supa.getEstimateById;
export const updateEstimateStatus = supa.updateEstimateStatus;

// Export all other functions from Supabase estimates
export * from './estimates';
export const markEstimateAsSold = supa.markEstimateAsSold;
export const updateEstimateCustomerDetails = supa.updateEstimateCustomerDetails;
export const calculateEstimateTotal = supa.calculateEstimateTotal; 