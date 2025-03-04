// src/utils/numberFormat.ts
export const formatNumber = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-GB');
};

export const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '£0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `£${num.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};