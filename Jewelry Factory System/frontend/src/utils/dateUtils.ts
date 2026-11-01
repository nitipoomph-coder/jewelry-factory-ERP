// src/utils/dateUtils.ts

/**
 * Formats a date string into DD/MM/YY format explicitly.
 * This avoids locale-specific inconsistencies like `en-EN` falling back to `MM/DD/YY` (US format).
 */
export const formatDateDDMMYY = (d: string | Date | null | undefined): string => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
};

/**
 * Formats a date string into DD/MM/YYYY format explicitly.
 */
export const formatDateDDMMYYYY = (d: string | Date | null | undefined): string => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
};
