// Maximum recommended PDF size (will show warning)
export const MAX_RECOMMENDED_SIZE_MB = 5;

// Maximum allowed PDF size (will reject larger files)
export const MAX_ALLOWED_SIZE_MB = 10;

// Processing modes for PDF files
export type ProcessingMode = 'supabase' | 'client' | 'regular' | 'fallback';
