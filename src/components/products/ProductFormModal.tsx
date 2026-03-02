// src/components/products/ProductFormModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import productService from '../../services/product.service';
import categoryService from '../../services/category.service';
import { Category } from '../../types/category';
import { Product } from '../../types/product';
import toast from 'react-hot-toast';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onProductCreated }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [form, setForm] = useState<Partial<Product>>({
    partNumber: '',
    name: '',
    category: '',
    binLocation: '',
    quantity: 0,
    retailPrice: 0,
    discount: 0,
    description: '',
  });

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      categoryService.getAll().then(setCategories).catch(console.error);
      // Reset form
      setForm({
        partNumber: '',
        name: '',
        category: '',
        binLocation: '',
        quantity: 0,
        retailPrice: 0,
        discount: 0,
        description: '',
      });
      setImageFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.partNumber?.trim()) {
        toast.error('Part Number is required');
        return;
      }
      if (!form.name?.trim()) {
        toast.error('Product Name is required');
        return;
      }
      if (!form.category) {
        toast.error('Category is required');
        return;
      }

      // 1. Create product and get the new ID
      const docId = await productService.create({ ...form, image: imageFile ?? null });
      
      // 2. FIX: Construct the object manually instead of calling getById
      // This prevents the "getById is not a function" error.
      const newProduct: Product = {
        id: docId,
        partNumber: form.partNumber!,
        name: form.name!,
        category: form.category,
        binLocation: form.binLocation,
        quantity: form.quantity || 0,
        retailPrice: form.retailPrice || 0,
        discount: form.discount || 0,
        description: form.description,
        // Calculate total value if needed, or leave undefined
        totalValue: (form.quantity || 0) * (form.retailPrice || 0) - (form.discount || 0),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Note: Image URL might not be available immediately if handled by service, 
        // but it is not critical for the dropdown selection.
      };
      
      toast.success('Product created successfully');
      onProductCreated(newProduct); // Pass back to parent
      onClose();
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Product" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BASIC INFO */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Basic Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Part Number"
              value={form.partNumber ?? ''}
              onChange={e => setForm(f => ({ ...f, partNumber: e.target.value }))}
              required
              placeholder="e.g., PN-000123"
            />
            <FormField
              label="Product Name"
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g., Fuel Filter"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category ?? ''}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <FormField
              label="Bin / Location"
              value={form.binLocation ?? ''}
              onChange={e => setForm(f => ({ ...f, binLocation: e.target.value }))}
              placeholder="e.g., Aisle 3 / Bin B"
            />
          </div>
        </div>

        {/* STOCK & PRICING */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Stock & Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              type="number"
              min={0}
              label="Quantity (QTY)"
              value={String(form.quantity ?? 0)}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value || 0) }))}
              placeholder="0"
            />
            <FormField
              type="number"
              step="0.01"
              min={0}
              label="Retail Price (£)"
              value={String(form.retailPrice ?? 0)}
              onChange={e => setForm(f => ({ ...f, retailPrice: parseFloat(e.target.value || '0') }))}
              placeholder="0.00"
            />
            <FormField
              type="number"
              step="0.01"
              min={0}
              label="Discount (£)"
              value={String(form.discount ?? 0)}
              onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value || '0') }))}
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Total value = <strong>Retail Price × QTY − Discount</strong>.
          </p>
        </div>

        {/* MEDIA & NOTES */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
           <h3 className="text-base font-semibold text-gray-900 mb-3">Media & Notes</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700">Product Image</label>
               <input
                  type="file"
                  onChange={e => e.target.files && setImageFile(e.target.files[0])}
                  accept="image/*"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                />
             </div>
             <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Optional notes about this product"
                />
             </div>
           </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;