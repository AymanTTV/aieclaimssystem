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
import { X, Edit2, Trash2, Eye, Box } from 'lucide-react';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

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
  const [form, setForm] = useState<Partial<Product>>({ name: '', price: 0, category: '' });
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

  // Filter logic
  useEffect(() => {
    startTransition(() => {
      let arr = products;
      if (searchTerm) {
        arr = arr.filter(p =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
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
        setForm({ name: prod.name, price: prod.price, category: prod.category });
      } else {
        setEditProduct(null);
        setForm({ name: '', price: 0, category: '' });
      }
      setImageFile(null);
      setShowProductModal(true);
    });
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await productService.update(editProduct.id, {
          ...form,
          image: imageFile || undefined,
        });
      } else {
        await productService.create({ ...form, image: imageFile! });
      }
      setProducts(await productService.getAll());
      toast.success('Product saved');
      setShowProductModal(false);
    } catch {
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

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => openCatForm()}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Manage Categories
          </button>
          <button
            onClick={() => openProductForm()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-600"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Search products…"
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
      <div className="bg-white rounded shadow overflow-hidden">
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
              { header: 'Name', cell: ({ row }) => row.original.name },
              {
                header: 'Price',
                cell: ({ row }) => `£${row.original.price.toFixed(2)}`,
              },
              {
                header: 'Category',
                cell: ({ row }) =>
                  categories.find(c => c.id === row.original.category)?.name || '—',
              },
              {
                header: 'Actions',
                cell: ({ row }) => (
                  <div className="flex space-x-2">
                    {can('products', 'update') && (
                    <button onClick={() => openProductForm(row.original)}>
                      <Edit2 className="h-4 w-4" />
                    </button>
                    )}
                    {can('products', 'delete') && (
                    <button onClick={() => confirmDeleteProduct(row.original)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                    )}
                    {can('products', 'view') && (
                    <button onClick={() => openDetail(row.original)}>
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
        size="md"
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Product name"
            required
            className="w-full border rounded p-2"
          />
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))}
            placeholder="Price"
            required
            className="w-full border rounded p-2"
          />
          <select
            name="category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            required
            className="w-full border rounded p-2"
          >
            <option value="">Select category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="file"
            onChange={e => e.target.files && setImageFile(e.target.files[0])}
            accept="image/*"
          />
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
            {/* Close icon */}
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
              <DetailItem label="Name" value={detailProduct.name} />
              <DetailItem
                label="Category"
                value={
                  categories.find(c => c.id === detailProduct.category)?.name ||
                  '—'
                }
              />
              <DetailItem
                label="Price"
                value={`£${detailProduct.price.toFixed(2)}`}
              />
              <DetailItem
                label="Created At"
                value={new Date(detailProduct.createdAt).toLocaleDateString()}
              />
            </div>
            {/* Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900">Description</h3>
              <p className="mt-2 text-gray-600">
                {detailProduct.description || 'No description.'}
              </p>
            </div>
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
