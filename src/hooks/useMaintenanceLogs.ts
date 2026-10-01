// src/hooks/useMaintenanceLogs.ts

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog } from '../types';
import { useAuth } from '../context/AuthContext'; 

function safeToDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return !isNaN(d.getTime()) ? d : undefined;
    } catch {
      return undefined;
    }
  }
  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val : undefined;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return !isNaN(d.getTime()) ? d : undefined;
  }
  return undefined;
}

export const useMaintenanceLogs = (vehicleId?: string) => {
  const { user } = useAuth(); 
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until the user object is fully loaded
    if (!user) return;

    const handleMaintenanceEvent = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;

      setLogs((prev) => {
        if (detail.action === 'DELETE_MAINTENANCE' && detail.logId) {
          return prev.filter((l) => l.id !== detail.logId);
        }
        if (detail.action === 'CREATE_MAINTENANCE' && detail.logId) {
          const exists = prev.some((l) => l.id === detail.logId);
          if (exists) return prev;
          return [{ id: detail.logId, ...detail } as MaintenanceLog, ...prev];
        }

        const idx = prev.findIndex(
          (l) =>
            l.id === detail.logId ||
            (detail.orderNumber && (l.orderNumber === detail.orderNumber || l.orderId === detail.orderNumber))
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            ...detail,
            status: detail.status || updated[idx].status,
            completedDate: detail.completedDate ? (detail.completedDate instanceof Date ? detail.completedDate : new Date(detail.completedDate)) : updated[idx].completedDate,
            paidAmount: detail.paidAmount !== undefined ? Number(detail.paidAmount) : updated[idx].paidAmount,
            remainingAmount: detail.remainingAmount !== undefined ? Number(detail.remainingAmount) : updated[idx].remainingAmount,
            paymentStatus: detail.paymentStatus || updated[idx].paymentStatus,
            payments: detail.payments || updated[idx].payments,
          };
          return updated;
        }
        return prev;
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('maintenanceRecordUpdated', handleMaintenanceEvent);
    }

    let q = query(collection(db, 'maintenanceLogs'), orderBy('date', 'desc'));
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsData: MaintenanceLog[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          // Ensure all Timestamp, Date, or string fields are safely converted to JS Date objects
          const date = safeToDate(data.date) || safeToDate(data.createdAt) || new Date();
          const nextServiceDate = safeToDate(data.nextServiceDate);

          const costNum = data.cost !== undefined ? Number(data.cost) : 0;
          const customerBilledNum = data.customerBilled !== undefined ? Number(data.customerBilled) : costNum;
          const isProfitEdited = data.isProfitEdited === true;

          // Default Dealer Cost to match Total price (or set Profit to £0.00 / 0.0% Margin)
          // The system must IGNORE any profit calculation for a record UNTIL a user manually opens the record, clicks "Edit", updates the information, and hits "Save" / "Update".
          const rawSubCost = data.dealerCost !== undefined
            ? Number(data.dealerCost)
            : (data.subcontractorCost !== undefined ? Number(data.subcontractorCost) : customerBilledNum);
          const subCostNum = isProfitEdited
            ? rawSubCost
            : customerBilledNum;
          let netProfit = isProfitEdited
            ? (data.netProfit !== undefined ? Number(data.netProfit) : Number((customerBilledNum - subCostNum).toFixed(2)))
            : 0;
          let profitMarginPercent = isProfitEdited
            ? (data.profitMarginPercent !== undefined ? Number(data.profitMarginPercent) : (customerBilledNum > 0 ? Number(((netProfit / customerBilledNum) * 100).toFixed(2)) : 0))
            : 0;

          logsData.push({
            id: doc.id,
            ...data,
            isProfitEdited,
            isEdited: isProfitEdited,
            orderId: data.orderId || data.orderNumber,
            orderNumber: data.orderNumber || data.orderId,
            invoiceNumber: data.invoiceNumber,
            cost: costNum,
            customerBilled: customerBilledNum,
            subcontractorCost: subCostNum,
            dealerCost: subCostNum,
            netProfit,
            profitMarginPercent,
            date: date,
            nextServiceDate: nextServiceDate,
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            invoiceDate: safeToDate(data.invoiceDate),
            invoiceDueDate: safeToDate(data.invoiceDueDate),
            completedDate: safeToDate(data.completedDate),
          } as MaintenanceLog);
        });
        setLogs(logsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching maintenance logs:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('maintenanceRecordUpdated', handleMaintenanceEvent);
      }
    };
  }, [vehicleId, user]); 

  return { logs, loading, error };
};