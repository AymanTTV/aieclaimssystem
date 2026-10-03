// src/utils/safePdfImage.ts

/**
 * Validates whether a given value is a safe, valid image source for @react-pdf/renderer.
 * Prevents canvas preview crashes when URLs are undefined, null, invalid, 404, or malformed.
 */
export const isValidPdfImageSrc = (v: any): boolean => {
  if (!v) return false;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s.length < 5) return false;
    if (s === 'null' || s === 'undefined') return false;
    if (s.includes('undefined') || s.includes('null')) return false;
    return (
      s.startsWith('data:image/') ||
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('/') ||
      s.startsWith('blob:')
    );
  }
  return typeof v === 'object' && v !== null;
};

/**
 * Safe string conversion for any text fields in @react-pdf/renderer.
 * Ensures undefined, null, or accidental object bindings do not crash the PDF canvas.
 */
export const safePdfString = (val: any, fallback: string = 'N/A'): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : String(val);
  }
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val.toLocaleDateString('en-GB');
  }
  if (typeof val === 'object') {
    return fallback;
  }
  return String(val);
};
