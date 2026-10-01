// src/pages/Invoices.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import unifiedCategoryService from '../services/unifiedCategory.service';
import AssignFinanceGroupModal from '../components/finance/AssignFinanceGroupModal';

import ManageFinanceDepartmentsModal from '../components/finance/ManageFinanceDepartmentsModal';
import AssignFinanceDepartmentModal from '../components/finance/AssignFinanceDepartmentModal';

import Modal from '../components/ui/Modal';
import { Plus, Download, Upload, PoundSterling, Receipt, Users, Settings, FileText, AlertTriangle, MessageCircle, Mail, Settings2, MessageSquare, Layers, Briefcase, LayoutGrid, DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import InvoiceCommunicationModal from '../components/finance/InvoiceCommunicationModal';
import TemplateQuickAccessModal, { QuickAccessModalType } from '../components/common/TemplateQuickAccessModal';
import { doc, collection, getDocs, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import { Invoice, Account } from '../types/finance'; 
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { useSharedAccounts } from '../hooks/useSharedAccounts';
import { generateBulkDocuments, generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { InvoiceBulkDocument, InvoiceDocument } from '../components/pdf/documents';
import { useFormattedDisplay } from '../hooks/useFormattedDisplay';
import { reverseFinanceTransaction, purgeFinanceTransactionsForInvoice } from '../utils/financeTransactions';
import { invalidateFinanceLedgerCache, manuallyRefetchFinanceLedger } from '../state/financeLedgerAtom';
import { syncInvoiceRecord } from '../services/unifiedSync.service';
import { useFinancialSync } from '../hooks/useFinancialSync';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const Invoices: React.FC = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { transactions, refetchTransactions } = useFinances();
  const { accounts, loading: accountsLoading } = useSharedAccounts();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { saveAndSync: saveAndSyncFinancialRecord } = useFinancialSync();
  const { formatCurrency } = useFormattedDisplay();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'invoices' | 'accounts'>('invoices');
  const [categories, setCategories] = useState<string[]>([]);
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showManageDepartments, setShowManageDepartments] = useState(false);
  const [showAssignDepartmentModal, setShowAssignDepartmentModal] = useState(false);

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);

  // Centralized communication modal states
  const [showCommModal, setShowCommModal] = useState(false);
  const [commMode, setCommMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [commInvoice, setCommInvoice] = useState<Invoice | null>(null);

  const [quickAccessModalOpen, setQuickAccessModalOpen] = useState(false);
  const [quickAccessType, setQuickAccessType] = useState<QuickAccessModalType>('messageTemplates');
  useEffect(() => {
    const unsub = unifiedCategoryService.subscribe((cats) => {
      setCategories(cats.map((c) => c.name));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allGroups = await financeGroupService.getAll();
        setGroups(allGroups);
      } catch (err) {
        toast.error('Failed to load initial data');
      }
    };
    fetchData();
  }, [showManageGroups]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'financeDepartments'), snap => {
      setDepartments(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

  const refreshCategories = async () => {
    try {
      const cats = await unifiedCategoryService.getAll();
      setCategories(cats.map((c) => c.name));
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

  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);

  const finalFilteredInvoices = useMemo(() => {
    return filteredInvoices.filter((inv) => {
      if (departmentFilter.length > 0) {
        const dId = inv.departmentId || 'none';
        if (!departmentFilter.includes(dId)) return false;
      }
      return true;
    });
  }, [filteredInvoices, departmentFilter]);

  useEffect(() => {
    setSelectedInvoiceIds(new Set());
  }, [searchQuery, statusFilter, categoryFilter, accountFilter, groupFilter, departmentFilter, dateRange, showCompleted]);

  const summaryMetrics = useMemo(() => {
    return finalFilteredInvoices.reduce((acc, item: any) => {
      // 1. Extract values safely
      const paymentsSum = Array.isArray(item.payments)
        ? item.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : 0;
      const paidAmount = Math.max(Number(item.paid ?? item.paidAmount ?? 0), paymentsSum); 
      const billedAmount = Number(item.amount ?? item.billed ?? item.total ?? 0);
      const rawDealerCost = item.dealerCost != null 
        ? Number(item.dealerCost) 
        : (item.subcontractorCost != null 
            ? Number(item.subcontractorCost) 
            : (Array.isArray(item.lineItems) ? item.lineItems.reduce((s: number, li: any) => s + (Number(li.subcontractorCost) || 0), 0) : 0));
      const dealerCost = isNaN(rawDealerCost) ? 0 : rawDealerCost;
      
      // 2. CRITICAL FIX: ALWAYS count collected cash as Income, regardless of invoice type
      acc.totalIncome += paidAmount;

      // 3. Bucket the expenses
      const isExpense = item.type === 'EXPENSE' || item.type === 'LOAN' || item.isLoan === true || item.type?.includes?.('Expense') || String(item.type || '').toUpperCase() === 'EXPENSE' || String(item.type || '').toUpperCase() === 'LOAN';

      if (isExpense) {
        // For expense/loan invoices, the billed amount and dealer cost are expenses
        acc.totalExpenses += billedAmount; 
        acc.totalExpenses += dealerCost;
      } else {
        // For standard income invoices, only the dealer cost counts as an expense
        acc.totalExpenses += dealerCost; 
      }

      return acc;
    }, { totalIncome: 0, totalExpenses: 0 });
  }, [finalFilteredInvoices]);

  // Calculate Balance
  const balance = summaryMetrics.totalIncome - summaryMetrics.totalExpenses;
  const netProfit = balance;
  const dynamicProfitMargin = summaryMetrics.totalIncome > 0
    ? Number(((balance / summaryMetrics.totalIncome) * 100).toFixed(1))
    : 0;

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
    setSelectedInvoiceIds(checked ? new Set(finalFilteredInvoices.map(i => i.id)) : new Set());
  }, [finalFilteredInvoices]);

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

      // Purge finance transactions for all deleted invoices
      for (const id of selectedInvoiceIds) {
        await purgeFinanceTransactionsForInvoice(id);
      }
      
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

    const exportData = finalFilteredInvoices.map((inv) => ({
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
      'Department Name': inv.departmentName || '',
      'Account From Name': accounts.find(a => a.id === (inv as any).accountFrom)?.name || '',
      'Account To Name': accounts.find(a => a.id === ((inv as any).accountTo || inv.accountId))?.name || '',
      'Is Loan': inv.isLoan ? (inv.loanTransactionType === 'income' ? 'Yes (Income)' : 'Yes (Expense)') : 'No',
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

            const deptName = row['Department Name'] || row['Department'];
            const department = deptName ? departments.find(d => d.name.toLowerCase() === deptName.toLowerCase()) : null;

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
              departmentId: department ? department.id : null,
              departmentName: department ? department.name : null,
              isLoan: String(row['Is Loan'] || '').toLowerCase().startsWith('yes'),
              loanTransactionType: String(row['Is Loan'] || '').toLowerCase().includes('income') ? 'income' : 'expense',
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
                groupId: group ? group.id : vehicle?.assignedGroupId || null,
                departmentId: department ? department.id : null,
                departmentName: department ? department.name : null,
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

      await reverseFinanceTransaction({
        referenceId: invoice.id,
        invoiceId: invoice.id,
        paymentId: paymentId,
        amount: paymentToDelete.amount
      });

      // Synchronize updated invoice payment status and amounts to Finance
      await syncInvoiceRecord(invoice.id, {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining < 0 ? 0 : newRemaining,
        paymentStatus: newStatus,
      }).catch((syncErr) => console.warn('Sync invoice on payment delete notice:', syncErr));

      // Purge from backend server payment ledger
      try {
        const apiRes = await fetch(`/api/invoices/${invoice.id}/payments/${paymentId}`, {
          method: 'DELETE',
        });
        if (!apiRes.ok) {
          console.warn(`Backend delete payment API returned status ${apiRes.status}`);
        }
      } catch (apiErr) {
        console.warn('Backend server payment delete notice:', apiErr);
      }

      // Immediately invalidate finance ledger global cache atom and trigger manual re-fetch
      invalidateFinanceLedgerCache(paymentId);
      await manuallyRefetchFinanceLedger().catch((fetchErr) => {
        console.warn('Manual ledger re-fetch notice:', fetchErr);
      });
      if (refetchTransactions) {
        await refetchTransactions().catch(() => {});
      }

      // Cache invalidation across Finance Ledger & Summary Cards
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('financeRecordUpdated', {
            detail: {
              entityId: invoice.id,
              deletedPaymentId: paymentId,
              paymentId: paymentId,
              referenceId: invoice.id,
              invoiceId: invoice.id,
              action: 'DELETE_PAYMENT',
              timestamp: Date.now(),
            },
          })
        );
        window.dispatchEvent(
          new CustomEvent('invoiceRecordUpdated', {
            detail: {
              id: invoice.id,
              paidAmount: newPaidAmount,
              remainingAmount: newRemaining < 0 ? 0 : newRemaining,
              paymentStatus: newStatus,
              payments: updatedPayments,
              deletedPaymentId: paymentId,
            },
          })
        );
      }
      
      toast.success('Payment deleted and removed from Finance Ledger');
      const updatedInvoiceObj = { ...invoice, payments: updatedPayments, paidAmount: newPaidAmount, remainingAmount: newRemaining, paymentStatus: newStatus as any };
      setSelectedInvoice(prev => prev ? {...prev, payments: updatedPayments, paidAmount: newPaidAmount, remainingAmount: newRemaining, paymentStatus: newStatus as any} : null);

      // Automatically update the invoice document on payment delete
      try {
        const companyDetails = await getCompanyDetails();
        const vehicle = vehicles.find(v => v.id === invoice.vehicleId);
        const customer = customers.find(c => c.id === invoice.customerId) || (invoice.customerName ? { name: invoice.customerName, mobile: invoice.customerPhone } : undefined);
        await generateAndUploadDocument(
          InvoiceDocument,
          { ...updatedInvoiceObj, vehicle, customer },
          'invoices',
          invoice.id,
          'invoices',
          companyDetails
        );
      } catch (docErr) {
        console.warn('Background invoice document update error:', docErr);
      }
    } catch (err) {
      toast.error('Failed to delete payment');
    }
  };

  const handleOpenLatestInvoicePDF = async (inv: Invoice) => {
    try {
      toast.loading('Generating latest invoice PDF…');
      const companyDetails = await getCompanyDetails();
      const vehicle = vehicles.find(v => v.id === inv.vehicleId);
      const customer = customers.find(c => c.id === inv.customerId) || (inv.customerName ? { name: inv.customerName, mobile: inv.customerPhone } : undefined);

      const url = await generateAndUploadDocument(
        InvoiceDocument,
        { ...inv, vehicle, customer }, 
        'invoices',
        inv.id,
        'invoices',
        companyDetails,
        'documentUrl'
      );
      toast.dismiss();
      toast.success('Latest invoice PDF opened');
      if (url) {
        const finalUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
        window.open(finalUrl, '_blank');
      }
    } catch (err) {
      toast.dismiss();
      console.error('Failed to generate latest invoice PDF:', err);
      if (inv.documentUrl) {
        const fallbackUrl = inv.documentUrl.includes('?') ? `${inv.documentUrl}&_t=${Date.now()}` : `${inv.documentUrl}?_t=${Date.now()}`;
        window.open(fallbackUrl, '_blank');
      } else {
        toast.error('Failed to generate latest invoice PDF');
      }
    }
  };

  const handleGenerateDocument = handleOpenLatestInvoicePDF;

  const handleGenerateBulkPDF = async () => {
    try {
      if (finalFilteredInvoices.length === 0) {
        toast.error("No invoices match the current filters to generate a PDF.");
        return;
      }
      toast.loading("Generating summary PDF...");
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const blob = await generateBulkDocuments(
        InvoiceBulkDocument,
        finalFilteredInvoices,
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
      await saveAndSyncFinancialRecord('INVOICE', { paymentStatus: newStatus }, invoice.id);
      toast.success(`Invoice status updated to ${newStatus.replace('_', ' ')}`);

      // Update invoice document with new status in background
      try {
        const companyDetails = await getCompanyDetails();
        const vehicle = vehicles.find(v => v.id === invoice.vehicleId);
        const customer = customers.find(c => c.id === invoice.customerId) || (invoice.customerName ? { name: invoice.customerName, mobile: invoice.customerPhone } : undefined);
        await generateAndUploadDocument(
          InvoiceDocument,
          { ...invoice, paymentStatus: newStatus as any, vehicle, customer },
          'invoices',
          invoice.id,
          'invoices',
          companyDetails,
          'documentUrl'
        );
      } catch (e) {
        console.warn('Background invoice document update error:', e);
      }
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

      {/* ── 3-Card Profit & Loss (P&L) Summary on Top ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: INCOME (Soft Green) */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-xs p-4 sm:p-5 hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                INCOME
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/90 border border-emerald-300/80 text-emerald-800 shadow-2xs flex items-center justify-center font-bold text-sm">
                £
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 block tracking-tight">
                {formatCurrency(summaryMetrics.totalIncome)}
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Collected Cash
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: EXPENSES (Soft Red) */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl shadow-xs p-4 sm:p-5 hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                EXPENSES
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100/90 border border-rose-300/80 text-rose-800 shadow-2xs flex items-center justify-center font-bold text-sm">
                £
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-rose-700 block tracking-tight">
                -{formatCurrency(summaryMetrics.totalExpenses)}
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                Expenses, Loans &amp; Costs
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: BALANCE (Emerald Green / Red) */}
        <div className={`border rounded-2xl shadow-xs p-4 sm:p-5 transition-all flex flex-col justify-between ${
          balance >= 0
            ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400'
            : 'bg-rose-50 border-rose-300 hover:border-rose-400'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                balance >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}>
                BALANCE
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  balance >= 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  {balance >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {dynamicProfitMargin}%
                </span>
                <div className={`w-8 h-8 rounded-xl border shadow-2xs flex items-center justify-center font-bold text-sm ${
                  balance >= 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  £
                </div>
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black font-mono block tracking-tight ${
                balance >= 0 ? 'text-emerald-950' : 'text-rose-950'
              }`}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </span>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                balance >= 0 ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100/80 text-rose-800'
              }`}>
                Income - Expenses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar Below Summary Cards ── */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#E2E8F0] space-y-4 text-[#0F172A]">
        {/* Top Header: Title, Subtitle, and Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Invoices & Accounts</h1>
            <p className="text-sm text-[#64748B] mt-0.5 font-medium">Billing, accounts receivable, and customer statements.</p>
          </div>
          
          {/* Account Invoices & Customer Accounts Tab Switcher */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'invoices' ? 'bg-white text-[#2563EB] shadow-xs font-bold' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Account Invoices
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'accounts' ? 'bg-white text-[#2563EB] shadow-xs font-bold' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Customer Accounts
            </button>
          </div>
        </div>

        {/* Action Bars in ONE LINE with + Create Invoice to the Right */}
        <div className="flex items-center justify-end gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-[#F1F5F9]">
          {(can('invoices', 'accounts') || can('finance', 'accounts')) && (
            <button
              onClick={() => setShowManageAccounts(true)}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-indigo-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800 active:scale-95 transition-all cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-1.5 text-indigo-600 pointer-events-none" /> Accounts
            </button>
          )}

          {(can('invoices', 'groups') || can('finance', 'groups')) && (
            <button
              onClick={() => setShowManageGroups(true)}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-purple-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-800 active:scale-95 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4 mr-1.5 text-purple-600 pointer-events-none" /> Groups
            </button>
          )}

          {(can('invoices', 'departments') || can('finance', 'departments')) && (
            <button
              onClick={() => setShowManageDepartments(true)}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-teal-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 hover:text-teal-800 active:scale-95 transition-all cursor-pointer"
            >
              <Briefcase className="h-4 w-4 mr-1.5 text-teal-600 pointer-events-none" /> Depts
            </button>
          )}

          {can('invoices', 'categories') && (
            <button
              onClick={() => setShowManageCategories(true)}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-violet-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 hover:text-violet-800 active:scale-95 transition-all cursor-pointer"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5 text-violet-600 pointer-events-none" /> Categories
            </button>
          )}

          {activeTab === 'invoices' && (
            <>
              {can('invoices', 'import') && (
                <button
                  onClick={handleImportClick}
                  className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-amber-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900 active:scale-95 transition-all cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-1.5 text-amber-600 pointer-events-none" /> Import
                </button>
              )}
              {can('invoices', 'export') && (
                <button
                  onClick={handleExport}
                  className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-blue-200 rounded-xl shadow-xs text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-1.5 text-blue-600 pointer-events-none" /> Export
                </button>
              )}
              {(can('invoices', 'singleDoc') || can('invoices', 'export')) && (
                <button
                  onClick={handleGenerateBulkPDF}
                  className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-rose-200 rounded-xl shadow-xs text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-1.5 text-rose-600 pointer-events-none" /> Bulk PDF
                </button>
              )}
            </>
          )}

          {can('invoices', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2 border border-emerald-600 rounded-xl shadow-xs text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5 pointer-events-none" /> Create Invoice
            </button>
          )}
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
            departmentFilter={departmentFilter} onDepartmentFilterChange={setDepartmentFilter} 
            dateRange={dateRange} onDateRangeChange={setDateRange}
            categories={categories} accounts={accounts} groups={groups} departments={departments}
            showCompleted={showCompleted} onShowCompletedChange={setShowCompleted}
          />

          {selectedInvoiceIds.size > 0 && (can('invoices', 'assign') || can('invoices', 'delete')) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-center justify-between shadow-sm">
              <span className="font-medium text-sm text-red-800">{selectedInvoiceIds.size} invoice(s) selected</span>
              <div className="flex flex-wrap gap-3">
                {can('invoices', 'assign') && (
                  <>
                    <button 
                      onClick={() => setShowAssignGroupModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-sm transition-colors"
                    >
                      Assign Group
                    </button>
                    <button 
                      onClick={() => setShowAssignDepartmentModal(true)}
                      className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors"
                    >
                      Assign Dept
                    </button>
                  </>
                )}
                {can('invoices', 'delete') && (
                  <button 
                    onClick={handleBulkDeleteClick}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors"
                  >
                    Delete {selectedInvoiceIds.size} Records
                  </button>
                )}
              </div>
            </div>
          )}

          <InvoiceTable
            invoices={finalFilteredInvoices} vehicles={vehicles} customers={customers}
            accounts={accounts} groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            onView={(inv) => setSelectedInvoice(inv)} onEdit={(inv) => setEditingInvoice(inv)}
            onDelete={(inv) => setDeletingInvoiceId(inv.id)} onDownload={(inv) => handleOpenLatestInvoicePDF(inv)}
            onRecordPayment={(inv) => setPayingInvoice(inv)} onApplyDiscount={() => {}}
            onDeletePayment={handleDeletePayment} onGenerateDocument={handleOpenLatestInvoicePDF}
            onViewDocument={(inv) => handleOpenLatestInvoicePDF(inv)} onStatusChange={handleStatusChange}
            onAssignDepartment={(inv) => { setSelectedInvoice(inv); setShowAssignDepartmentModal(true); }}
            isManager={can('invoices', 'assign') || can('invoices', 'delete')}
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
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Invoice"
        size="xl"
        className="max-w-[860px] w-full h-[94vh] max-h-[96vh] flex flex-col"
        contentClassName="p-0 overflow-hidden flex flex-col flex-1 min-h-0 text-[#0F172A]"
      >
        <InvoiceForm
          customers={customers}
          vehicles={vehicles}
          accounts={accounts}
          groups={groups}
          departments={departments}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal 
        isOpen={!!selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
        title="Invoice Details" 
        size="xl"
        className="max-w-[860px] w-full h-[94vh] max-h-[96vh] flex flex-col"
        contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0 text-[#0F172A]"
      >
        {selectedInvoice && (
          <InvoiceDetails 
            invoice={selectedInvoice} 
            vehicle={vehicles.find((v) => v.id === selectedInvoice.vehicleId)} 
            customer={customers.find((c) => c.id === selectedInvoice.customerId)} 
            accounts={accounts} 
            groups={groups}
            departments={departments}
            onDownload={() => handleOpenLatestInvoicePDF(selectedInvoice)} 
            onDeletePayment={handleDeletePayment}
          />
        )}
      </Modal>

      <Modal 
        isOpen={!!editingInvoice} 
        onClose={() => setEditingInvoice(null)} 
        title="Edit Invoice" 
        size="xl"
        className="max-w-[860px] w-full h-[94vh] max-h-[96vh] flex flex-col"
        contentClassName="p-0 overflow-hidden flex flex-col flex-1 min-h-0 text-[#0F172A]"
      >
        {editingInvoice && (
          <InvoiceEditModal 
            invoice={editingInvoice} 
            vehicles={vehicles} 
            customers={customers} 
            accounts={accounts} 
            groups={groups} 
            departments={departments} 
            onClose={() => setEditingInvoice(null)} 
          />
        )}
      </Modal>

      <Modal isOpen={!!deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} title="Delete Invoice">
        {deletingInvoiceId && <InvoiceDeleteModal invoiceId={deletingInvoiceId} onClose={() => setDeletingInvoiceId(null)} />}
      </Modal>

     <Modal isOpen={!!payingInvoice} onClose={() => setPayingInvoice(null)} title="Record Payment" size="xl">
        {payingInvoice && (
          <InvoicePaymentModal 
            invoice={payingInvoice} 
            vehicle={vehicles.find((v) => v.id === payingInvoice.vehicleId)}
            vehicles={vehicles} 
            customers={customers} 
            accounts={accounts}
            groups={groups} // <--- ADD THIS LINE
            onClose={() => setPayingInvoice(null)} 
          />
        )}
      </Modal>

      <ManageFinanceDepartmentsModal isOpen={showManageDepartments} onClose={() => setShowManageDepartments(false)} />
      
      <AssignFinanceDepartmentModal
        isOpen={showAssignDepartmentModal}
        onClose={() => setShowAssignDepartmentModal(false)}
        selectedIds={selectedInvoiceIds}
        departments={departments}
        collectionName="invoices"
        onSuccess={() => {
          setShowAssignDepartmentModal(false);
          setSelectedInvoiceIds(new Set()); 
        }}
      />
      <AssignFinanceGroupModal
        isOpen={showAssignGroupModal}
        onClose={() => setShowAssignGroupModal(false)}
        selectedIds={selectedInvoiceIds}
        groups={groups}
        collectionName="invoices"
        onSuccess={() => {
          setShowAssignGroupModal(false);
          setSelectedInvoiceIds(new Set()); 
        }}
      />

      <Modal isOpen={showManageCategories} onClose={() => { setShowManageCategories(false); refreshCategories(); }} title="Manage Invoice Categories" size="lg">
        <ManageCategoriesModal onClose={() => { setShowManageCategories(false); refreshCategories(); }} />
      </Modal>

      <Modal isOpen={showManageAccounts} onClose={() => setShowManageAccounts(false)} title="Manage Accounts" size="xl">
        <ManageAccountsModal onClose={() => setShowManageAccounts(false)} accounts={accounts} transactions={transactions} />
      </Modal>

      {showCommModal && (
        <InvoiceCommunicationModal
          isOpen={showCommModal}
          onClose={() => {
            setShowCommModal(false);
            setCommInvoice(null);
          }}
          invoice={commInvoice}
          invoices={finalFilteredInvoices && finalFilteredInvoices.length > 0 ? finalFilteredInvoices : invoices}
          initialMode={commMode}
        />
      )}

      <ManageGroupsModal open={showManageGroups} onClose={() => setShowManageGroups(false)} />

      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Confirm Bulk Delete" size="xl">
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