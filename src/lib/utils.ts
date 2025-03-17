import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with commas and optional decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places to show (default: 0)
 * @returns Formatted string representation of the number
 */
export function formatMeasurement(value: number, decimals: number = 0): string {
  if (isNaN(value)) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
