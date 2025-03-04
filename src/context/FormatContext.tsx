// src/context/FormatContext.tsx
import React, { createContext, useContext } from 'react';
import { formatNumber, formatCurrency } from '../utils/numberFormat';

interface FormatContextType {
  formatNumber: (value: number | string | undefined | null) => string;
  formatCurrency: (value: number | string | undefined | null) => string;
}

const FormatContext = createContext<FormatContextType>({
  formatNumber,
  formatCurrency
});

export const FormatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <FormatContext.Provider value={{ formatNumber, formatCurrency }}>
      {children}
    </FormatContext.Provider>
  );
};

export const useFormat = () => useContext(FormatContext);