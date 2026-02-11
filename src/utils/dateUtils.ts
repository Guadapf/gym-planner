/**
 * Utilities for handling dates in the application.
 * CRITICAL: All date logic must use these functions to ensure local time is used
 * and to avoid UTC offsets causing day shifts (especially in GMT-3).
 */

/**
 * Returns the current date in YYYY-MM-DD format based on the device's local time.
 * This effectively ignores UTC and returns "what the user sees on their clock".
 */
export const getToday = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string and returns a Date object set to midnight local time.
 * Useful for comparisons or UI components that require a Date object.
 */
export const parseDateLocal = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Formats a given Date object to YYYY-MM-DD using local time components.
 */
export const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Helper to get the day of the week (0-6) from a date string
 */
export const getDayOfWeek = (dateString: string): number => {
    return parseDateLocal(dateString).getDay();
};

/**
 * Helper to get a readable label (e.g. "Lunes 10 de Febrero")
 */
export const getReadableDate = (dateString: string): string => {
    const date = parseDateLocal(dateString);
    return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
};
