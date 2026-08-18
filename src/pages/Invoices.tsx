// src/pages/Invoices.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useCustomers } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';
import { useInvoiceFilters } from '../hooks/useInvoiceFilters';
import { useFinances } from '../hooks/useFinances';
import InvoiceTable from '../components/finance/InvoiceTable';
import InvoiceForm from '../components/finance/InvoiceForm';
import InvoiceDetails from '../components/finance/InvoiceDetails';
import InvoiceEditModal from '../components/finance/InvoiceEditModal';
import InvoiceDeleteModal from '../components/finance/InvoiceDeleteModal';
import InvoicePaymentModal from '../components/finance/InvoicePaymentModal';
import InvoiceFilters from '../components/finance/InvoiceFilters';
import CustomerAccounts from '../components/finance/CustomerAccounts';
import ManageCategoriesModal from '../components/finance/ManageCategoriesModal';
import ManageAccountsModal from '../components/finance/ManageAccountsModal';
import ManageGroupsModal from '../components/finance/ManageGroupsModal';
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service'; 
import Modal from '../components/ui/Modal';
import { Plus, Download, Upload, PoundSterling, Receipt, Users, Settings, FileText, AlertTriangle } from 'lucide-react';
import { doc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import { Invoice, Account } from '../types/finance'; 
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { generateBulkDocuments, generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { InvoiceBulkDocument, InvoiceDocument } from '../components/pdf/documents';
import { useFormattedDisplay } from '../hooks/useFormattedDisplay';
import { createFinanceTransaction } from '../utils/financeTransactions';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const Invoices: React.FC = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { transactions } = useFinances();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'invoices' | 'accounts'>('invoices');
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'invoiceCategories'));
        const cats: string[] = [];
        catSnap.forEach((docSnap) => cats.push(docSnap.data().name));
        cats.sort((a, b) => a.localeCompare(b));
        setCategories(cats);

        const accSnap = await getDocs(collection(db, 'accounts'));
        const accs: Account[] = [];
        accSnap.forEach((docSnap) => accs.push({ id: docSnap.id, ...docSnap.data() } as Account));
        setAccounts(accs);

        const allGroups = await financeGroupService.getAll();
        setGroups(allGroups);
      } catch (err) {
        toast.error('Failed to load initial data');
      }
    };
    fetchData();
  }, [showManageAccounts, showManageGroups]);

  const refreshCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'invoiceCategories'));
      const cats: string[] = [];
      snapshot.forEach((docSnap) => cats.push(docSnap.data().name));
      cats.sort((a, b) => a.localeCompare(b));
      setCategories(cats);
    } catch (err) {
      console.error('Error refreshing categories:', err);
    }
  };

  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    categoryFilter, setCategoryFilter,
    accountFilter, setAccountFilter, 
    groupFilter, setGroupFilter, 
    dateRange, setDateRange,
    showCompleted, setShowCompleted,
    filteredInvoices,
  } = useInvoiceFilters(invoices, vehicles);

  useEffect(() => {
    setSelectedInvoiceIds(new Set());
  }, [searchQuery, statusFilter, categoryFilter, accountFilter, groupFilter, dateRange, showCompleted]);

  const totalInvoicesAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaidAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalLookingAmount = filteredInvoices.reduce((sum, inv) => sum + ((inv.remainingAmount || 0) > 0 ? inv.remainingAmount : 0), 0);

  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const handleToggleOne = useCallback((id: string) => {
    setSelectedInvoiceIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedInvoiceIds(checked ? new Set(filteredInvoices.map(i => i.id)) : new Set());
  }, [filteredInvoices]);

  const handleBulkDeleteClick = () => {
    if (selectedInvoiceIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteLoading(true);
    const toastId = toast.loading(`Deleting ${selectedInvoiceIds.size} invoices...`);
    try {
      const batch = writeBatch(db);
      selectedInvoiceIds.forEach(id => {
        batch.delete(doc(db, 'invoices', id));
      });
      await batch.commit();
      
      toast.success('Invoices deleted successfully', { id: toastId });
      setSelectedInvoiceIds(new Set()); 
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete invoices', { id: toastId });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleExport = () => {
    const safeFormatDate = (date: any): string => { if (!date) return ''; if (date instanceof Date) return date.toISOString(); if (date.toDate) return date.toDate().toISOString(); try { return new Date(date).toISOString(); } catch { return ''; } };

    const exportData = filteredInvoices.map((inv) => ({
      'Invoice ID': inv.id,
      'Invoice Number': inv.invoiceNumber || '',
      'Date (ISO)': safeFormatDate(inv.date),
      'Due Date (ISO)': safeFormatDate(inv.dueDate),
      'Customer Name': inv.customerName || '',
      'Customer Phone': inv.customerPhone || '',
      'Vehicle Reg': vehicles.find(v => v.id === inv.vehicleId)?.registrationNumber || '',
      'Vehicle Details': inv.vehicleName || '',
      'Gross Amount': inv.total || 0,
      'Net Amount': inv.subTotal || 0,
      'VAT Amount': inv.vatAmount || 0,
      'Amount Paid': inv.paidAmount || 0,
      'Remaining Amount': inv.remainingAmount || 0,
      'Status': inv.paymentStatus || 'unpaid',
      'Category': inv.category || '',
      'Custom Category': inv.customCategory || '',
      'Group Name': groups.find(g => g.id === (inv as any).groupId)?.name || '',
      'Account From Name': accounts.find(a => a.id === (inv as any).accountFrom)?.name || '',
      'Account To Name': accounts.find(a => a.id === ((inv as any).accountTo || inv.accountId))?.name || '',
      'Is Loan': inv.isLoan ? 'Yes' : 'No',
      'Description': inv.description || ''
    }));
    exportToExcel(exportData, 'invoices');
    toast.success('Invoices exported successfully');
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Processing billing import data...');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          toast.error("No importable data fields found", { id: toastId });
          return;
        }

        const chunkSize = 450;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const batch = writeBatch(db);

          chunk.forEach((row: any) => {
            const custName = row['Customer Name'] || row['Customer'];
            const customer = custName ? customers.find(c => c.name.toLowerCase() === custName.toLowerCase()) : null;

            const reg = row['Vehicle Reg'] || row['Vehicle'];
            const vehicle = reg ? vehicles.find(v => v.registrationNumber.toLowerCase() === reg.toLowerCase()) : null;

            const accFromName = row['Account From Name'] || row['Account From'];
            const accountFrom = accFromName ? accounts.find(a => a.name.toLowerCase() === accFromName.toLowerCase()) : null;

            const accToName = row['Account To Name'] || row['Account To'] || row['Finance Account'] || row['Account Name'];
            const accountTo = accToName ? accounts.find(a => a.name.toLowerCase() === accToName.toLowerCase()) : null;

            const groupName = row['Group Name'] || row['Group'];
            const group = groupName ? groups.find(g => g.name.toLowerCase() === groupName.toLowerCase()) : null;

            const totalVal = parseFloat((row['Gross Amount'] || row['Amount'])?.toString().replace(/[^\d.-]/g, '')) || 0;
            const netVal = parseFloat(row['Net Amount']?.toString().replace(/[^\d.-]/g, '')) || totalVal;
            const vatVal = parseFloat(row['VAT Amount']?.toString().replace(/[^\d.-]/g, '')) || 0;
            const paidVal = parseFloat((row['Amount Paid'] || row['Paid'])?.toString().replace(/[^\d.-]/g, '')) || 0;
            const remainingVal = parseFloat(row['Remaining Amount']?.toString().replace(/[^\d.-]/g, '')) || Math.max(0, totalVal - paidVal);

            const isUpdate = !!row['Invoice ID'];
            const invRef = isUpdate ? doc(db, 'invoices', row['Invoice ID']) : doc(collection(db, 'invoices'));
            
            const payload: any = {
              invoiceNumber: row['Invoice Number'] || `INV-${invRef.id.slice(-6).toUpperCase()}`,
              date: row['Date (ISO)'] ? new Date(row['Date (ISO)']) : (row['Date'] ? new Date(row['Date']) : new Date()),
              dueDate: row['Due Date (ISO)'] ? new Date(row['Due Date (ISO)']) : (row['Due Date'] ? new Date(row['Due Date']) : new Date()),
              customerName: customer ? customer.name : (custName || 'Manual Entry Client'),
              customerId: customer ? customer.id : null,
              customerPhone: row['Customer Phone'] || (customer ? customer.mobile : ''),
              vehicleId: vehicle ? vehicle.id : null,
              vehicleName: row['Vehicle Details'] || (vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : (reg || 'General / Unallocated')),
              total: totalVal,
              amount: totalVal,
              subTotal: netVal,
              vatAmount: vatVal,
              paidAmount: paidVal,
              remainingAmount: remainingVal < 0 ? 0 : remainingVal,
              paymentStatus: row['Status']?.toString().toLowerCase().replace(' ', '_') || (remainingVal <= 0.001 ? 'paid' : 'unpaid'),
              category: row['Category'] || 'Import Migration',
              customCategory: row['Custom Category'] || null,
              accountFrom: accountFrom ? accountFrom.id : null,
              accountTo: accountTo ? accountTo.id : null,
              accountId: accountTo ? accountTo.id : null,
              accountName: accountTo ? accountTo.name : null,
              groupId: group ? group.id : null,
              isLoan: row['Is Loan'] === 'Yes',
              description: row['Description'] || '',
              updatedAt: new Date(),
            };

            if (!isUpdate) {
                payload.lineItems = [{ id: uuidv4(), description: row['Category'] || 'Migration Entry Line Item', quantity: 1, unitPrice: totalVal, discount: 0, includeVAT: false }];
                payload.payments = paidVal > 0 ? [{
                    id: uuidv4(),
                    date: row['Date (ISO)'] ? new Date(row['Date (ISO)']) : new Date(),
                    amount: paidVal,
                    method: 'bank_transfer',
                    createdAt: new Date(),
                    createdBy: user?.id || 'system_import'
                }] : [];
                payload.createdAt = new Date();
                payload.createdBy = user?.id || 'system_import';
            }

            batch.set(invRef, payload, { merge: true });

            if (!isUpdate && paidVal > 0) {
              const txRef = doc(collection(db, 'transactions'));
              const vehicleOwner = vehicle?.owner ? { name: vehicle.owner.name, isDefault: vehicle.owner.isDefault ?? false } : { name: 'AIE Skyline Limited', isDefault: true };
              
              batch.set(txRef, {
                type: 'income',
                category: payload.category,
                amount: paidVal,
                description: `Migration baseline check for ${payload.invoiceNumber}`,
                referenceId: invRef.id,
                vehicleId: payload.vehicleId,
                vehicleName: payload.vehicleName,
                vehicleOwner,
                paymentMethod: 'bank_transfer',
                paymentStatus: payload.paymentStatus,
                status: 'completed',
                date: payload.date,
                createdAt: new Date(),
                createdBy: user?.name || 'Import System',
                accountsTo: accountTo ? [accountTo.id] : [],
                groupId: group ? group.id : vehicle?.assignedGroupId || null // ✅ Add Group to import
              });
            }
          });
          await batch.commit();
        }

        toast.success(`Successfully processed ${data.length} invoices`, { id: toastId });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error("Import failure: ", err);
        toast.error("Format configuration failure. Check spreadsheet metrics.", { id: toastId });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeletePayment = async (invoice: Invoice, paymentId: string) => {
    try {
      const paymentToDelete = invoice.payments?.find(p => p.id === paymentId);
      if (!paymentToDelete) return;
      
      const updatedPayments = invoice.payments.filter(p => p.id !== paymentId);
      const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = invoice.total - newPaidAmount;
      
      let newStatus = 'unpaid';
      if (newPaidAmount >= invoice.total - 0.01 && invoice.total > 0) newStatus = 'paid';
      else if (newPaidAmount > 0) newStatus = 'partially_paid';

      await updateDoc(doc(db, 'invoices', invoice.id), {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining < 0 ? 0 : newRemaining,
        paymentStatus: newStatus,
        updatedAt: new Date()
      });

      const totalLogCost = invoice.total || 1;
      const vatRatio = (invoice.vatAmount || 0) / totalLogCost;
      const netRatio = (invoice.subTotal || invoice.total || 0) / totalLogCost;
      const revVatAmount = paymentToDelete.amount * vatRatio;
      const revNetAmount = paymentToDelete.amount * netRatio;

      const reversalAccounts: string[] = [];
      
      const mainAcc = (invoice as any).accountTo || invoice.accountId;
      if (mainAcc) reversalAccounts.push(mainAcc);
      
      const secondaryAcc = (invoice as any).accountFrom;
      if (secondaryAcc) reversalAccounts.push(secondaryAcc);

      if (reversalAccounts.length === 0) {
        const defaultAcc = accounts.find(a => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT'));
        if (defaultAcc) reversalAccounts.push(defaultAcc.id);
      }

      const revVehicle = vehicles.find(v => v.id === invoice.vehicleId);
      let mappedVehicleOwner = undefined;
      if (invoice.vehicleId) {
        if (revVehicle && revVehicle.owner) {
            mappedVehicleOwner = { name: revVehicle.owner.name, isDefault: revVehicle.owner.isDefault ?? false };
        } else {
            mappedVehicleOwner = { name: 'AIE Skyline Limited', isDefault: true };
        }
      }

      const actualCategory = invoice.category === 'Other' && invoice.customCategory 
        ? invoice.customCategory 
        : (invoice.category || 'Invoice Payment Reversal');

      // ✅ Reversal Finance Transaction
      await createFinanceTransaction({
        type: 'expense', 
        category: actualCategory,
        amount: paymentToDelete.amount,
        netAmount: parseFloat(revNetAmount.toFixed(2)),
        vatAmount: parseFloat(revVatAmount.toFixed(2)),
        description: `REVERSAL: Payment for ${invoice.invoiceNumber || 'Invoice'}`,
        referenceId: invoice.id,
        vehicleId: invoice.vehicleId,
        vehicleName: invoice.vehicleName || undefined,
        vehicleOwner: mappedVehicleOwner,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        groupId: invoice.groupId || revVehicle?.assignedGroupId || undefined, // ✅ Include Vehicle's Group Fallback
        paymentMethod: paymentToDelete.method,
        paymentReference: `REV-${paymentToDelete.reference || paymentId}`,
        status: 'completed',
        date: new Date(),
        accountsFrom: reversalAccounts 
      });
      
      toast.success('Payment deleted and reversed in Finance');
      setSelectedInvoice(prev => prev ? {...prev, payments: updatedPayments, paidAmount: newPaidAmount, remainingAmount: newRemaining, paymentStatus: newStatus as any} : null);
    } catch (err) {
      toast.error('Failed to delete payment');
    }
  };

  const handleGenerateDocument = async (inv: Invoice) => {
    try {
      toast.loading('Generating invoice PDF…');
      const companyDetails = await getCompanyDetails();
      const vehicle = vehicles.find(v => v.id === inv.vehicleId);
      const customer = customers.find(c => c.id === inv.customerId);

      const url = await generateAndUploadDocument(
        InvoiceDocument,
        { ...inv, vehicle, customer }, 
        'invoices',
        inv.id,
        'invoices',
        companyDetails
      );
      toast.dismiss();
      toast.success('Invoice PDF generated');
      if (url) window.open(url, '_blank');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleGenerateBulkPDF = async () => {
    try {
      if (filteredInvoices.length === 0) {
        toast.error("No invoices match the current filters to generate a PDF.");
        return;
      }
      toast.loading("Generating summary PDF...");
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const blob = await generateBulkDocuments(
        InvoiceBulkDocument,
        filteredInvoices,
        companyDetails
      );
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.dismiss();
      toast.success('Invoice summary PDF generated');
    } catch (err) {
      console.error('Error generating bulk Invoice PDF:', err);
      toast.dismiss();
      toast.error('Failed to generate Invoice summary PDF');
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), { paymentStatus: newStatus, updatedAt: new Date() });
      toast.success(`Invoice status updated to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (vehiclesLoading || customersLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileImport} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Accounts</h1>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'invoices' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Manage Invoices
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'accounts' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Customer Accounts
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'invoices' && can('invoices', 'export') && (
            <>
              <button onClick={handleImportClick} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" /> Import
              </button>
              <button onClick={handleExport} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" /> Export
              </button>
              <button onClick={handleGenerateBulkPDF} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <FileText className="h-4 w-4 mr-2" /> Bulk PDF
              </button>
            </>
          )}

          {can('finance', 'accounts') && (
            <button onClick={() => setShowManageAccounts(true)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Settings className="h-4 w-4 mr-2" /> Accounts
            </button>
          )}
          {can('finance', 'groups') && (
            <button onClick={() => setShowManageGroups(true)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Settings className="h-4 w-4 mr-2" /> Groups
            </button>
          )}

          {can('invoices', 'categories') && (
            <button onClick={() => setShowManageCategories(true)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Categories
            </button>
          )}
          {can('invoices', 'create') && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600">
              <Plus className="h-4 w-4 mr-2" /> Create Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="rounded-full p-3 bg-blue-50"><PoundSterling className="h-6 w-6 text-blue-600" /></div>
          <div><h4 className="text-xs font-semibold text-gray-500 uppercase">Gross Billing</h4><p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvoicesAmount)}</p></div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="rounded-full p-3 bg-green-50"><PoundSterling className="h-6 w-6 text-green-600" /></div>
          <div><h4 className="text-xs font-semibold text-gray-500 uppercase">Total Received</h4><p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidAmount)}</p></div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="rounded-full p-3 bg-red-50"><PoundSterling className="h-6 w-6 text-red-600" /></div>
          <div><h4 className="text-xs font-semibold text-gray-500 uppercase">Total Outstanding</h4><p className="text-2xl font-bold text-red-600">{formatCurrency(totalLookingAmount)}</p></div>
        </div>
      </div>

      {activeTab === 'invoices' ? (
        <div className="space-y-4 animate-fadeIn">
          <InvoiceFilters
            searchQuery={searchQuery} onSearchChange={setSearchQuery}
            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter}
            accountFilter={accountFilter} onAccountFilterChange={setAccountFilter} 
            groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} 
            dateRange={dateRange} onDateRangeChange={setDateRange}
            categories={categories} accounts={accounts} groups={groups} 
            showCompleted={showCompleted} onShowCompletedChange={setShowCompleted}
          />

          {selectedInvoiceIds.size > 0 && user?.role === 'manager' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-center justify-between shadow-sm">
              <span className="font-medium text-sm text-red-800">{selectedInvoiceIds.size} invoice(s) selected</span>
              <div className="flex gap-3">
                <button 
                  onClick={handleBulkDeleteClick}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors"
                >
                  Delete {selectedInvoiceIds.size} Records
                </button>
              </div>
            </div>
          )}

          <InvoiceTable
            invoices={filteredInvoices} vehicles={vehicles} customers={customers}
            onView={(inv) => setSelectedInvoice(inv)} onEdit={(inv) => setEditingInvoice(inv)}
            onDelete={(inv) => setDeletingInvoiceId(inv.id)} onDownload={(inv) => window.open(inv.documentUrl || '', '_blank')}
            onRecordPayment={(inv) => setPayingInvoice(inv)} onApplyDiscount={() => {}}
            onDeletePayment={handleDeletePayment} onGenerateDocument={handleGenerateDocument}
            onViewDocument={(inv) => window.open(inv.documentUrl || '', '_blank')} onStatusChange={handleStatusChange}
            
            isManager={user?.role === 'manager'}
            selectedIds={selectedInvoiceIds}
            onToggleOne={handleToggleOne}
            onToggleAll={handleToggleAll}
          />
        </div>
      ) : (
        <div className="animate-fadeIn">
          <CustomerAccounts invoices={invoices} customers={customers} />
        </div>
      )}

      {/* --- Modals --- */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Invoice" size="xl">
        <InvoiceForm customers={customers} vehicles={vehicles} accounts={accounts} groups={groups} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Invoice Details" size="3xl">
        {selectedInvoice && (
          <InvoiceDetails 
            invoice={selectedInvoice} 
            vehicle={vehicles.find((v) => v.id === selectedInvoice.vehicleId)} 
            customer={customers.find((c) => c.id === selectedInvoice.customerId)} 
            accounts={accounts} 
            groups={groups}
            onDownload={() => window.open(selectedInvoice.documentUrl || '', '_blank')} 
          />
        )}
      </Modal>

      <Modal isOpen={!!editingInvoice} onClose={() => setEditingInvoice(null)} title="Edit Invoice" size="xl">
        {editingInvoice && <InvoiceEditModal invoice={editingInvoice} vehicles={vehicles} customers={customers} accounts={accounts} groups={groups} onClose={() => setEditingInvoice(null)} />}
      </Modal>

      <Modal isOpen={!!deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} title="Delete Invoice">
        {deletingInvoiceId && <InvoiceDeleteModal invoiceId={deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} />}
      </Modal>

      <Modal isOpen={!!payingInvoice} onClose={() => setPayingInvoice(null)} title="Record Payment" size="xl">
        {payingInvoice && (
          <InvoicePaymentModal 
            invoice={payingInvoice} 
            vehicle={vehicles.find((v) => v.id === payingInvoice.vehicleId)} 
            customers={customers} 
            accounts={accounts}
            onClose={() => setPayingInvoice(null)} 
          />
        )}
      </Modal>

      <Modal isOpen={showManageCategories} onClose={() => { setShowManageCategories(false); refreshCategories(); }} title="Manage Invoice Categories" size="lg">
        <ManageCategoriesModal onClose={() => { setShowManageCategories(false); refreshCategories(); }} />
      </Modal>

      <Modal isOpen={showManageAccounts} onClose={() => setShowManageAccounts(false)} title="Manage Accounts" size="xl">
        <ManageAccountsModal onClose={() => setShowManageAccounts(false)} accounts={accounts} transactions={transactions} />
      </Modal>

      <ManageGroupsModal open={showManageGroups} onClose={() => setShowManageGroups(false)} />

      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Confirm Bulk Delete" size="sm">
       <div className="p-1">
         <div className="flex items-start">
           <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
             <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
           </div>
           <div className="ml-4 mt-0 text-left">
             <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Invoices</h3>
             <div className="mt-2">
               <p className="text-sm text-gray-500">
                 Are you sure you want to delete these <span className="font-bold">{selectedInvoiceIds.size}</span> invoices? This action cannot be undone.
               </p>
             </div>
           </div>
         </div>
         <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
           <button type="button" disabled={bulkDeleteLoading} onClick={confirmBulkDelete} className="inline-flex w-full justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto disabled:opacity-50">
             {bulkDeleteLoading ? 'Deleting...' : 'Delete'}
           </button>
           <button type="button" disabled={bulkDeleteLoading} onClick={() => setShowBulkDeleteConfirm(false)} className="mt-3 inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50">
             Cancel
           </button>
         </div>
       </div>
      </Modal>
      
    </div>
  );
};

export default Invoices;