// src/hooks/useFormattedDisplay.ts
import { useFormat } from '../context/FormatContext';

export const useFormattedDisplay = () => {
  const { formatNumber, formatCurrency } = useFormat();

  const formatMileage = (value: number) => `${formatNumber(value)} Mi`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatDays = (value: number) => `${value} day${value !== 1 ? 's' : ''}`;

  return {
    formatNumber,
    formatCurrency,
    formatMileage,
    formatPercentage,
    formatDays
  };
};