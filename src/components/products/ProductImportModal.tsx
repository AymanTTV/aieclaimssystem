// src/components/products/ProductImportModal.tsx
import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, AlertTriangle, XCircle, X, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../../types/product';
import { Category } from '../../types/category';
import { Vehicle } from '../../types';
import { importFromExcel } from '../../utils/excel';
import { downloadProductImportTemplate } from '../../utils/productHelpers';
import productService from '../../services/product.service';
import categoryService from '../../services/category.service';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  categories: Category[];
  vehicles?: Vehicle[];
  onImportComplete: () => Promise<void> | void;
}

interface ParsedNewProduct {
  partNumber: string;
  name: string;
  category: string;
  categoryName: string;
  binLocation: string;
  quantity: number;
  retailPrice: number;
  discount: number;
  totalValue: number;
  vehicleId: string;
  vehicleName: string;
  description: string;
  imageUrl: string;
}

interface SkippedItem {
  partNumber: string;
  name: string;
  category: string;
  reason: string;
}

interface InvalidItem {
  rowNumber: number;
  data: any;
  reason: string;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  categories,
  vehicles = [],
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [newProducts, setNewProducts] = useState<ParsedNewProduct[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState<SkippedItem[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidItem[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'duplicates' | 'invalid'>('new');
  const [unrecognizedCategories, setUnrecognizedCategories] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setNewProducts([]);
    setSkippedDuplicates([]);
    setInvalidRows([]);
    setUnrecognizedCategories(new Set());
    setActiveTab('new');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (uploadedFile: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = uploadedFile.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(uploadedFile);
    setParsing(true);

    try {
      const rawRows = await importFromExcel(uploadedFile);

      if (!rawRows || rawRows.length === 0) {
        toast.error('The uploaded file is empty or has no readable rows');
        resetState();
        return;
      }

      // 1. Build lookup sets of existing inventory (case-insensitive & trimmed)
      // This guarantees existing products are NEVER duplicated and NEVER modified
      const existingPartNumbers = new Map<string, Product>();
      const existingNames = new Map<string, Product>();

      existingProducts.forEach((p) => {
        if (p.partNumber && p.partNumber.trim()) {
          existingPartNumbers.set(p.partNumber.trim().toLowerCase(), p);
        }
        if (p.name && p.name.trim()) {
          existingNames.set(p.name.trim().toLowerCase(), p);
        }
      });

      // 2. Build lookup maps for categories and vehicles
      const categoryMap = new Map<string, Category>();
      categories.forEach((c) => {
        categoryMap.set(c.name.trim().toLowerCase(), c);
        categoryMap.set(c.id.toLowerCase(), c);
      });

      const vehicleMap = new Map<string, Vehicle>();
      vehicles.forEach((v) => {
        if (v.registrationNumber) {
          vehicleMap.set(v.registrationNumber.trim().toLowerCase(), v);
          vehicleMap.set(v.registrationNumber.replace(/\s+/g, '').toLowerCase(), v);
        }
      });

      // 3. Process each row with strict deduplication
      const parsedNew: ParsedNewProduct[] = [];
      const skipped: SkippedItem[] = [];
      const invalid: InvalidItem[] = [];
      const inBatchPartNumbers = new Set<string>();
      const newCatSet = new Set<string>();

      rawRows.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // +1 for 0-index, +1 for header row

        // Flexible column mapping
        const partNumberRaw =
          row['Part Number'] ??
          row['partNumber'] ??
          row['PartNumber'] ??
          row['Part #'] ??
          row['Part#'] ??
          row['SKU'] ??
          row['sku'] ??
          row['Code'] ??
          row['code'] ??
          '';

        const nameRaw =
          row['Product Name'] ??
          row['productName'] ??
          row['ProductName'] ??
          row['Name'] ??
          row['name'] ??
          row['Title'] ??
          row['Item Name'] ??
          '';

        const partNumber = String(partNumberRaw).trim();
        const name = String(nameRaw).trim();

        // Check for empty/invalid row
        if (!partNumber && !name) {
          invalid.push({
            rowNumber,
            data: row,
            reason: 'Missing both Part Number and Product Name',
          });
          return;
        }

        const partNumberLower = partNumber.toLowerCase();
        const nameLower = name.toLowerCase();

        // DEDUPLICATION CHECK 1: Check against existing products in inventory by Part Number
        if (partNumber && existingPartNumbers.has(partNumberLower)) {
          const existing = existingPartNumbers.get(partNumberLower)!;
          skipped.push({
            partNumber: partNumber || '—',
            name: name || existing.name,
            category: existing.category || '',
            reason: `Matches existing product in inventory: "${existing.partNumber} - ${existing.name}"`,
          });
          return;
        }

        // DEDUPLICATION CHECK 2: Check for duplicate Part Number within the file itself
        if (partNumber && inBatchPartNumbers.has(partNumberLower)) {
          skipped.push({
            partNumber,
            name: name || '—',
            category: row['Category'] || '',
            reason: `Duplicate Part Number within this uploaded file (first occurrence kept)`,
          });
          return;
        }

        // DEDUPLICATION CHECK 3: Check against existing products in inventory by Name (if no partNumber)
        if (!partNumber && name && existingNames.has(nameLower)) {
          const existing = existingNames.get(nameLower)!;
          skipped.push({
            partNumber: '—',
            name,
            category: existing.category || '',
            reason: `Matches existing product name in inventory: "${existing.name}"`,
          });
          return;
        }

        // Mark as seen in this batch
        if (partNumber) {
          inBatchPartNumbers.add(partNumberLower);
        }

        // Parse category
        const categoryRaw = String(
          row['Category'] ??
          row['category'] ??
          row['Category Name'] ??
          row['categoryName'] ??
          ''
        ).trim();

        let categoryId = '';
        let categoryName = categoryRaw;

        if (categoryRaw) {
          const matchedCat = categoryMap.get(categoryRaw.toLowerCase());
          if (matchedCat) {
            categoryId = matchedCat.id;
            categoryName = matchedCat.name;
          } else {
            newCatSet.add(categoryRaw);
          }
        }

        // Parse vehicle assignment
        const vehicleRaw = String(
          row['Assigned Vehicle'] ??
          row['Vehicle'] ??
          row['vehicle'] ??
          row['Registration'] ??
          row['Reg'] ??
          ''
        ).trim();

        let vehicleId = '';
        let vehicleName = vehicleRaw;

        if (vehicleRaw) {
          const cleanVeh = vehicleRaw.replace(/\s+/g, '').toLowerCase();
          const matchedVeh = vehicleMap.get(vehicleRaw.toLowerCase()) || vehicleMap.get(cleanVeh);
          if (matchedVeh) {
            vehicleId = matchedVeh.id;
            vehicleName = `${matchedVeh.make} ${matchedVeh.model} (${matchedVeh.registrationNumber})`;
          }
        }

        // Parse numbers & financial values
        const binLocation = String(
          row['Bin / Location'] ??
          row['Bin Location'] ??
          row['binLocation'] ??
          row['Location'] ??
          row['Bin'] ??
          ''
        ).trim();

        const qtyRaw = row['QTY'] ?? row['Quantity'] ?? row['quantity'] ?? row['qty'] ?? row['Stock'] ?? 0;
        const quantity = Math.max(0, parseInt(String(qtyRaw).replace(/[^0-9.-]/g, ''), 10) || 0);

        const priceRaw = row['Retail Price (£)'] ?? row['Retail Price'] ?? row['retailPrice'] ?? row['Price'] ?? row['price'] ?? 0;
        const retailPrice = Math.max(0, parseFloat(String(priceRaw).replace(/[^0-9.-]/g, '')) || 0);

        const discRaw = row['Discount (£)'] ?? row['Discount'] ?? row['discount'] ?? 0;
        const discount = Math.max(0, parseFloat(String(discRaw).replace(/[^0-9.-]/g, '')) || 0);

        const totalValue = Math.max(quantity * retailPrice - discount, 0);

        const description = String(row['Description'] ?? row['description'] ?? row['Notes'] ?? '').trim();
        const imageUrl = String(row['Image URL'] ?? row['imageUrl'] ?? row['Image'] ?? '').trim();

        parsedNew.push({
          partNumber: partNumber || `PN-${Date.now().toString().slice(-6)}-${index}`,
          name: name || `Product ${partNumber}`,
          category: categoryId,
          categoryName,
          binLocation,
          quantity,
          retailPrice,
          discount,
          totalValue: +totalValue.toFixed(2),
          vehicleId,
          vehicleName,
          description,
          imageUrl,
        });
      });

      setNewProducts(parsedNew);
      setSkippedDuplicates(skipped);
      setInvalidRows(invalid);
      setUnrecognizedCategories(newCatSet);

      if (parsedNew.length > 0) {
        setActiveTab('new');
        toast.success(`Found ${parsedNew.length} new products to import. ${skipped.length} duplicates skipped.`);
      } else if (skipped.length > 0) {
        setActiveTab('duplicates');
        toast('All products in the file already exist in inventory. No duplicates will be created.', {
          icon: 'ℹ️',
        });
      } else {
        toast.error('No valid products found in the file.');
      }
    } catch (err: any) {
      console.error('Error parsing file:', err);
      toast.error('Failed to parse file: ' + (err.message || 'Unknown format'));
      resetState();
    } finally {
      setParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleCommitImport = async () => {
    if (newProducts.length === 0) {
      toast.error('No new products to import');
      return;
    }

    setImporting(true);
    try {
      // 1. If there are new categories that don't exist yet, create them and link IDs
      const categoryIdByName = new Map<string, string>();
      categories.forEach((c) => categoryIdByName.set(c.name.toLowerCase(), c.id));

      if (unrecognizedCategories.size > 0) {
        for (const catName of Array.from(unrecognizedCategories)) {
          if (catName.trim() && !categoryIdByName.has(catName.toLowerCase())) {
            try {
              const newCat = await categoryService.create({ name: catName.trim() });
              categoryIdByName.set(catName.toLowerCase(), newCat.id);
            } catch (catErr) {
              console.warn('Could not auto-create category:', catName, catErr);
            }
          }
        }
      }

      // 2. Prepare payload with resolved category IDs
      const toCreate: Partial<Product>[] = newProducts.map((p) => {
        let finalCategoryId = p.category;
        if (!finalCategoryId && p.categoryName && categoryIdByName.has(p.categoryName.toLowerCase())) {
          finalCategoryId = categoryIdByName.get(p.categoryName.toLowerCase())!;
        }

        return {
          partNumber: p.partNumber,
          name: p.name,
          category: finalCategoryId || p.categoryName || '',
          binLocation: p.binLocation,
          quantity: p.quantity,
          retailPrice: p.retailPrice,
          discount: p.discount,
          totalValue: p.totalValue,
          vehicleId: p.vehicleId,
          vehicleName: p.vehicleName,
          description: p.description,
          imageUrl: p.imageUrl,
        };
      });

      // 3. Bulk create new products safely
      const count = await productService.bulkCreate(toCreate);

      toast.success(
        `Successfully imported ${count} new products! ${skippedDuplicates.length} duplicates were skipped safely.`
      );

      await onImportComplete();
      handleClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Import failed: ' + (err.message || 'Unknown database error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Import Products & Inventory</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
              Add new inventory parts from Excel or CSV. Existing products are protected and never changed or deleted.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ZERO-RISK GUARANTEE BANNER */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold">Zero-Risk Protection Active:</span> Your existing inventory is 100% safe.
              Any rows matching existing Part Numbers or Names will be automatically filtered out to ensure zero duplication and prevent accidental overwrites.
            </div>
          </div>

          {/* DROPZONE / FILE SELECTION */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop your spreadsheet here
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports Excel (.xlsx, .xls) and CSV files</p>

              <div className="mt-5 inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadProductImportTemplate(categories);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Download Sample Template (.xlsx)
                </button>
              </div>
            </div>
          ) : (
            /* FILE LOADED & SUMMARY VIEW */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-700 shadow-2xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {newProducts.length + skippedDuplicates.length + invalidRows.length} total rows parsed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadProductImportTemplate(categories)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Template
                  </button>
                  <button
                    type="button"
                    onClick={resetState}
                    disabled={importing}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 hover:border-rose-200 cursor-pointer shadow-2xs"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {parsing && (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-sm font-medium">Checking duplicates and parsing spreadsheet…</p>
                </div>
              )}

              {!parsing && (
                <>
                  {/* STAT SUMMARY BADGES */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('new')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'new'
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Ready to Import
                        </span>
                        <span className="text-lg font-black text-emerald-700 font-mono">
                          {newProducts.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700/80 mt-1 font-medium">
                        New products to be added to inventory
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('duplicates')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'duplicates'
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Duplicates Skipped
                        </span>
                        <span className="text-lg font-black text-amber-700 font-mono">
                          {skippedDuplicates.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700/80 mt-1 font-medium">
                        Already in inventory or file (no duplication)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('invalid')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'invalid'
                          ? 'border-slate-400 bg-slate-100 shadow-xs ring-2 ring-slate-400/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          Invalid Rows
                        </span>
                        <span className="text-lg font-black text-slate-700 font-mono">
                          {invalidRows.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Missing required part number or name
                      </p>
                    </button>
                  </div>

                  {/* PREVIEW TABLES */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {/* TAB 1: NEW PRODUCTS */}
                    {activeTab === 'new' && (
                      <div className="max-h-64 overflow-y-auto">
                        {newProducts.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            No new products detected in this file. All rows were either duplicates or invalid.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                              <tr>
                                <th className="p-2.5">Part Number</th>
                                <th className="p-2.5">Product Name</th>
                                <th className="p-2.5">Category</th>
                                <th className="p-2.5">Location</th>
                                <th className="p-2.5 text-right">QTY</th>
                                <th className="p-2.5 text-right">Price</th>
                                <th className="p-2.5 text-right">Total (£)</th>
                                <th className="p-2.5">Assigned Vehicle</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {newProducts.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-2.5 font-mono font-bold text-slate-900">{p.partNumber}</td>
                                  <td className="p-2.5 font-medium text-slate-800">{p.name}</td>
                                  <td className="p-2.5 text-slate-600">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                                      {p.categoryName || 'General'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-600">{p.binLocation || '—'}</td>
                                  <td className="p-2.5 text-right font-mono font-semibold text-slate-800">{p.quantity}</td>
                                  <td className="p-2.5 text-right font-mono text-slate-700">£{p.retailPrice.toFixed(2)}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-emerald-700">£{p.totalValue.toFixed(2)}</td>
                                  <td className="p-2.5 text-slate-600 text-[11px] truncate max-w-[140px]">
                                    {p.vehicleName || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* TAB 2: SKIPPED DUPLICATES */}
                    {activeTab === 'duplicates' && (
                      <div className="max-h-64 overflow-y-auto">
                        {skippedDuplicates.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            No duplicate products found. All rows are brand new!
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {skippedDuplicates.map((item, idx) => (
                              <div key={idx} className="p-3 flex items-start justify-between gap-3 hover:bg-amber-50/30">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                      {item.partNumber}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">— {item.name}</span>
                                  </div>
                                  <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                                    Reason: {item.reason}
                                  </p>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Skipped
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: INVALID ROWS */}
                    {activeTab === 'invalid' && (
                      <div className="max-h-64 overflow-y-auto">
                        {invalidRows.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            No invalid rows found in this file.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {invalidRows.map((item, idx) => (
                              <div key={idx} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50">
                                <div>
                                  <span className="font-bold text-slate-800 text-xs">
                                    Spreadsheet Row #{item.rowNumber}
                                  </span>
                                  <p className="text-[11px] text-rose-600 mt-0.5 font-medium">
                                    {item.reason}
                                  </p>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Ignored
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            {newProducts.length > 0 ? (
              <span className="text-emerald-700 font-bold">
                ✓ Ready to safely import {newProducts.length} unique products
              </span>
            ) : (
              <span>Upload a spreadsheet to preview items before adding</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={importing || parsing || newProducts.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing Products…
                </>
              ) : (
                <>
                  Import {newProducts.length} New Products
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImportModal;
