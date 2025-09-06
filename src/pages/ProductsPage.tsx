// src/pages/ProductsPage.tsx
import React, {
  useState,
  useEffect,
  useTransition,
  Suspense,
  lazy,
  ChangeEvent,
  FormEvent,
} from 'react';
import { Product } from '../types/product';
import { Category } from '../types/category';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import productService from '../services/product.service';
import categoryService from '../services/category.service';
import { X, Edit2, Trash2, Eye, Box, Download } from 'lucide-react';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { handleProductExport } from '../utils/productHelpers';
import FormField from '../components/ui/FormField';

// Inline spinner so no external UI import is needed
const Spinner: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Lazy-load your DataTable component properly
const LazyDataTable = lazy(() =>
  import('../components/DataTable/DataTable').then(mod => ({ default: mod.DataTable }))
);

const ProductsPage: React.FC = () => {
  const [isPending, startTransition] = useTransition();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [filtered, setFiltered] = useState<Product[]>([]);

  // Product form
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
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
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');

  // Load categories & products
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cats, prods] = await Promise.all([
          categoryService.getAll(),
          productService.getAll(),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter logic — primary search by Part Number
// Replace your current filter useEffect with this:
useEffect(() => {
  startTransition(() => {
    let arr = products;

    if (searchTerm.trim()) {
      const norm = (s: any) => (s ?? '').toString().toLowerCase();
      const terms = norm(searchTerm).split(/\s+/).filter(Boolean);

      arr = arr.filter(p => {
        const haystack = `${norm(p.partNumber)} ${norm(p.name)}`;
        // require all words to appear somewhere in partNumber or name
        return terms.every(t => haystack.includes(t));
      });
    }

    if (filterCat) {
      arr = arr.filter(p => p.category === filterCat);
    }

    setFiltered(arr);
  });
}, [products, searchTerm, filterCat]);


  // Handlers
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const handleFilter = (e: ChangeEvent<HTMLSelectElement>) => setFilterCat(e.target.value);
  const { can } = usePermissions();
  const { user } = useAuth();

  const openProductForm = (prod?: Product) => {
    startTransition(() => {
      if (prod) {
        setEditProduct(prod);
        setForm({
          partNumber: prod.partNumber,
          name: prod.name,
          category: prod.category,
          binLocation: prod.binLocation,
          quantity: prod.quantity,
          retailPrice: prod.retailPrice,
          discount: prod.discount ?? 0,
          description: prod.description ?? '',
        });
      } else {
        setEditProduct(null);
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
      }
      setImageFile(null);
      setShowProductModal(true);
    });
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

      if (editProduct) {
        await productService.update(editProduct.id, {
          ...form,
          image: imageFile || undefined,
        });
      } else {
        await productService.create({ ...form, image: imageFile ?? null });
      }
      setProducts(await productService.getAll());
      toast.success('Product saved');
      setShowProductModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save product');
    }
  };

  const confirmDeleteProduct = (prod: Product) => {
    setDeleteTarget(prod);
    setShowDeleteModal(true);
  };
  const handleProductDelete = async () => {
    if (!deleteTarget) return;
    try {
      await productService.delete(deleteTarget.id);
      setProducts(ps => ps.filter(p => p.id !== deleteTarget.id));
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const openDetail = (prod: Product) => {
    setDetailProduct(prod);
    setShowDetailModal(true);
  };

  const openCatForm = (cat?: Category) => {
    startTransition(() => {
      if (cat) {
        setEditCat(cat);
        setCatName(cat.name);
      } else {
        setEditCat(null);
        setCatName('');
      }
      setShowCatModal(true);
    });
  };
  const handleCatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editCat) {
        await categoryService.update(editCat.id, { name: catName });
      } else {
        await categoryService.create({ name: catName });
      }
      setCategories(await categoryService.getAll());
      toast.success('Category saved');
      setShowCatModal(false);
    } catch {
      toast.error('Failed to save category');
    }
  };
  const handleCatDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await categoryService.delete(cat.id);
      setCategories(cs => cs.filter(c => c.id !== cat.id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  if (loading) return <Spinner />;

  // Helper for detail fields
  const DetailItem: React.FC<{ label: string; value: any }> = ({ label, value }) => (
    <div>
      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      <p className="mt-1 text-gray-900">{value}</p>
    </div>
  );

  const getCategoryName = (id?: string) =>
    categories.find(c => c.id === id)?.name || '—';

  const calcTotal = (p: Product) => {
  const qty = Number(p.quantity ?? 0);
  const price = Number(p.retailPrice ?? 0);
  const disc = Number(p.discount ?? 0); // absolute £
  const val = qty * price - disc;
  return `£${Math.max(val, 0).toFixed(2)}`;
};


  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
            <button
              onClick={() => openCatForm()}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Manage Categories
            </button>
          )}
          {can('products', 'create') && (
            <button
              onClick={() => openProductForm()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-600"
            >
              + Add Product
            </button>
          )}
          {can('products', 'export') && (
            <button
              onClick={() => handleProductExport(products, categories)}
              className="inline-flex items-center px-4 py-2 rounded-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
  className="flex-1 px-3 py-2 border rounded"
  placeholder="Search by Part Number or Product Name…"
  value={searchTerm}
  onChange={handleSearch}
/>

        <select
          className="w-48 px-3 py-2 border rounded"
          value={filterCat}
          onChange={handleFilter}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded shadow overflow-auto">
        <Suspense fallback={<div className="p-8 text-center">{isPending ? 'Updating…' : 'Loading…'}</div>}>
          <LazyDataTable
            data={filtered}
            onRowClick={openDetail}
            columns={[
              {
                header: 'Image',
                cell: ({ row }) =>
                  row.original.imageUrl ? (
                    <img
                      src={row.original.imageUrl}
                      className="h-10 w-10 object-cover rounded"
                      alt=""
                    />
                  ) : (
                    <Box className="h-8 w-8 text-gray-400" />
                  ),
              },
              { header: 'Part Number', cell: ({ row }) => row.original.partNumber },
              { header: 'Product Name', cell: ({ row }) => row.original.name },
              {
                header: 'Category',
                cell: ({ row }) => getCategoryName(row.original.category),
              },
              { header: 'Bin / Location', cell: ({ row }) => row.original.binLocation ?? '—' },
              { header: 'QTY', cell: ({ row }) => String(row.original.quantity ?? 0) },
              {
                header: 'Retail Price',
                cell: ({ row }) => `£${(row.original.retailPrice ?? 0).toFixed(2)}`,
              },
              {
  header: 'Discount (£)',
  cell: ({ row }) => `£${Number(row.original.discount ?? 0).toFixed(2)}`,
},
{
  header: 'Total Value',
  cell: ({ row }) => {
    const qty = Number(row.original.quantity ?? 0);
    const price = Number(row.original.retailPrice ?? 0);
    const disc = Number(row.original.discount ?? 0); // absolute £
    const total = qty * price - disc;
    return `£${Math.max(total, 0).toFixed(2)}`;
  },
},
              {
                header: 'Actions',
                cell: ({ row }) => (
                  <div className="flex space-x-2">
                    {can('products', 'update') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // prevent opening details
                          openProductForm(row.original);
                        }}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {can('products', 'delete') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // prevent opening details
                          confirmDeleteProduct(row.original);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                    {can('products', 'view') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // keep consistent, though this opens details anyway
                          openDetail(row.original);
                        }}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Suspense>
      </div>

      {/* Product Form Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleProductSubmit} className="space-y-6">
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
                {editProduct?.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={editProduct.imageUrl}
                      alt={editProduct.name}
                      className="h-20 w-20 object-cover rounded border"
                    />
                  </div>
                )}
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

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowProductModal(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleProductDelete}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title="Manage Categories"
        size="md"
      >
        <form onSubmit={handleCatSubmit} className="flex mb-4 space-x-2">
          <input
            value={catName}
            onChange={e => setCatName(e.target.value)}
            placeholder="Category name"
            required
            className="flex-1 border rounded p-2"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded"
          >
            {editCat ? 'Update' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCatModal(false);
              setEditCat(null);
              setCatName('');
            }}
            className="px-4 py-2 border rounded ml-2"
          >
            Cancel
          </button>
        </form>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {categories.map(c => (
            <li key={c.id} className="flex justify-between items-center border-b pb-2">
              <span>{c.name}</span>
              <div className="space-x-2">
                <button onClick={() => openCatForm(c)}>
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleCatDelete(c)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Modal>

      {/* Enhanced Details Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Product Details"
        size="lg"
      >
        {detailProduct && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => setShowDetailModal(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Product image */}
            <div className="flex justify-center">
              {detailProduct.imageUrl ? (
                <img
                  src={detailProduct.imageUrl}
                  alt={detailProduct.name}
                  className="h-48 w-auto object-cover rounded-lg shadow-md cursor-pointer"
                  onClick={() => setSelectedImage(detailProduct.imageUrl!)}
                />
              ) : (
                <div className="h-48 w-96 bg-gray-100 rounded-lg flex items-center justify-center shadow-md">
                  <Box className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Key fields */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
              <DetailItem label="Part Number" value={detailProduct.partNumber} />
              <DetailItem label="Product Name" value={detailProduct.name} />
              <DetailItem label="Category" value={getCategoryName(detailProduct.category)} />
              <DetailItem label="Bin / Location" value={detailProduct.binLocation || '—'} />
              <DetailItem label="QTY" value={detailProduct.quantity} />
              <DetailItem label="Retail Price" value={`£${(detailProduct.retailPrice ?? 0).toFixed(2)}`} />
              <DetailItem label="Discount (%)" value={`${detailProduct.discount ?? 0}%`} />
              <DetailItem
                label="Total Value"
                value={
                  detailProduct.totalValue !== undefined
                    ? `£${(detailProduct.totalValue ?? 0).toFixed(2)}`
                    : calcTotal(detailProduct)
                }
              />
              <DetailItem
                label="Created At"
                value={
                  detailProduct.createdAt
                    ? new Date(detailProduct.createdAt).toLocaleDateString()
                    : '—'
                }
              />
            </div>

            {/* Description */}
            {detailProduct.description ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900">Description</h3>
                <p className="mt-2 text-gray-600">
                  {detailProduct.description}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Fullscreen image preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded"
          />
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
