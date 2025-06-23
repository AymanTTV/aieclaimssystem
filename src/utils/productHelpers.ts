// src/utils/productHelpers.ts
import { Product } from '../types/product';
import { Category } from '../types/category';
import { exportToExcel } from './excel';
import toast from 'react-hot-toast';

/**
 * products: full array of Product records
 * categories: full array of Category records ({ id: string; name: string; ... })
 */
export const handleProductExport = (
  products: Product[],
  categories: Category[]
) => {
  try {
    const exportData = products.map((p) => {
      // Look up the category name from your categories list
      const categoryName =
        categories.find((c) => c.id === p.category)?.name ?? 'Uncategorized';

      return {
        Name: p.name,
        Price: p.price,
        Category: categoryName,
        'Image URL': p.imageUrl ?? '',
      };
    });

    exportToExcel(exportData, 'products');
    toast.success('Products exported successfully');
  } catch (error) {
    console.error('Error exporting products:', error);
    toast.error('Failed to export products');
  }
};
