// src/utils/productHelpers.ts
import { Product } from '../types/product';
import { Category } from '../types/category';
import { exportToExcel } from './excel';
import toast from 'react-hot-toast';

export const handleProductExport = (products: Product[], categories: Category[]) => {
  try {
    const exportData = products.map((p) => {
      const categoryName = categories.find((c) => c.id === p.category)?.name ?? '';
      const qty = Number(p.quantity ?? 0);
      const price = Number(p.retailPrice ?? 0);
      const disc = Number(p.discount ?? 0);
      const total = Math.max(qty * price - disc, 0);

      return {
        'Part Number': p.partNumber,
        'Product Name': p.name,
        Category: categoryName,
        'Bin / Location': p.binLocation ?? '',
        QTY: qty,
        'Retail Price (£)': price,
        'Discount (£)': disc,
        'Total Value (£)': +total.toFixed(2),
        'Image URL': p.imageUrl ?? '',
        Description: p.description ?? '',
        'Created At': p.createdAt ? new Date(p.createdAt).toISOString() : '',
        'Updated At': p.updatedAt ? new Date(p.updatedAt).toISOString() : '',
      };
    });

    exportToExcel(exportData, 'products');
    toast.success('Products exported successfully');
  } catch (error) {
    console.error('Error exporting products:', error);
    toast.error('Failed to export products');
  }
};
