// src/utils/productHelpers.ts
import { Product } from '../types/product';
import { Category } from '../types/category';
import { exportToExcel } from './excel';
import toast from 'react-hot-toast';

export const handleProductExport = (products: Product[], categories: Category[]) => {
  try {
    const exportData = products.map((p) => {
      const categoryName = categories.find((c) => c.id === p.category)?.name ?? (p.category || '');
      const qty = Number(p.quantity ?? 0);
      const price = Number(p.retailPrice ?? 0);
      const disc = Number(p.discount ?? 0);
      const total = Math.max(qty * price - disc, 0);

      return {
        'Part Number': p.partNumber || '',
        'Product Name': p.name || '',
        Category: categoryName || '',
        'Bin / Location': p.binLocation ?? '',
        'Assigned Vehicle': p.vehicleName || '',
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

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel(exportData, `products_inventory_${dateStr}`);
    toast.success(`Exported ${products.length} products to Excel`);
  } catch (error) {
    console.error('Error exporting products:', error);
    toast.error('Failed to export products');
  }
};

/**
 * Downloads a sample pre-formatted Excel template for importing products.
 */
export const downloadProductImportTemplate = (categories: Category[] = []) => {
  try {
    const sampleCategory = categories[0]?.name || 'Maintenance & Service';
    const sampleData = [
      {
        'Part Number': 'PN-OIL-2024',
        'Product Name': '5W-30 Synthetic Engine Oil 5L',
        Category: sampleCategory,
        'Bin / Location': 'Aisle 1 / Shelf A',
        'Assigned Vehicle': 'Ford Transit (AB21 XYZ)',
        QTY: 25,
        'Retail Price (£)': 34.99,
        'Discount (£)': 0.0,
        Description: 'Full synthetic low-ash engine oil for Euro 6 fleet',
      },
      {
        'Part Number': 'PN-BRK-FRT-01',
        'Product Name': 'Front Brake Disc & Pad Kit',
        Category: sampleCategory,
        'Bin / Location': 'Aisle 2 / Bin 14',
        'Assigned Vehicle': '',
        QTY: 8,
        'Retail Price (£)': 85.5,
        'Discount (£)': 5.0,
        Description: 'Vented front brake rotor and ceramic pad set',
      },
      {
        'Part Number': 'PN-WPR-24',
        'Product Name': 'Aerodynamic Wiper Blade 24"',
        Category: 'Wipers & Vision',
        'Bin / Location': 'Rack W-03',
        'Assigned Vehicle': '',
        QTY: 40,
        'Retail Price (£)': 11.2,
        'Discount (£)': 0.0,
        Description: 'All-weather silicone wiper blade',
      },
    ];

    exportToExcel(sampleData, 'products_import_template');
    toast.success('Sample import template downloaded');
  } catch (error) {
    console.error('Error downloading template:', error);
    toast.error('Failed to download template');
  }
};
