// src/hooks/useInvoiceCategories.ts
import { useState, useEffect, useCallback } from 'react';
import { unifiedCategoryService } from '../services/unifiedCategory.service';
import { Category } from '../types/category';

export type InvoiceCategory = Category;

export const useInvoiceCategories = () => {
  const [categories, setCategories] = useState<InvoiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = unifiedCategoryService.subscribe((cats) => {
      setCategories(cats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addCategory = useCallback(async (name: string) => {
    return unifiedCategoryService.create({ name });
  }, []);

  const updateCategory = useCallback(async (id: string, name: string) => {
    return unifiedCategoryService.update(id, { name });
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    return unifiedCategoryService.delete(id);
  }, []);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};

export default useInvoiceCategories;
