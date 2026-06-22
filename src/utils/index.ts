/**
 * Utility functions
 *
 * Example utility functions for your project
 */

export {
  prepareImage,
  isImageFile,
  type PreparedImage,
} from "./image";

/**
 * Format a date to a readable string (e.g. "January 1, 2025").
 *
 * @param date - Date to format
 * @returns Formatted string in en-US long date style
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Capitalize the first letter of a string.
 *
 * @param str - Input string
 * @returns String with first character uppercased
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns a debounced version of the given function that delays invocation until `wait` ms after the last call.
 *
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds
 * @returns Debounced function with the same parameter types as `func`
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
