// src/pages/Utilisation.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useCustomers } from '../hooks/useCustomers';
import { DataTable } from '../components/DataTable/DataTable';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { differenceInDays, startOfMonth, endOfMonth, isValid, format } from 'date-fns';
import { Activity, Car, Download, FileSpreadsheet, Search, Filter, TrendingUp, Clock, AlertTriangle, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import UtilisationBulkDocument from '../components/pdf/UtilisationBulkDocument';
import UtilisationSingleDocument from '../components/pdf/UtilisationSingleDocument';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Robust date parser to handle raw Firestore Timestamps, Dates, and Strings
// Robust date parser to handle raw Firestore Timestamps, ISO Strings, and UK Date Strings (DD/MM/YYYY)
const parseFirestoreDate = (val: any): Date => {
  if (!val) return new Date(NaN);
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
  if (typeof val === 'number') return new Date(val); // Epoch timestamp
  if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);

  if (typeof val === 'string') {
    // 1. Catch UK/European formats: DD/MM/YYYY or DD-MM-YYYY
    const ukRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const match = val.match(ukRegex);
    
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed (0-11)
      const year = parseInt(match[3], 10);
      
      // Try to extract time if present (e.g., "14/11/2025 22:18")
      const timeRegex = /\s+(\d{1,2}):(\d{2})/;
      const timeMatch = val.match(timeRegex);
      const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
      const mins = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      
      return new Date(year, month, day, hours, mins);
    }
    
    // 2. Fallback to native JS parsing (handles standard ISO strings like "2025-11-14T22:18:00Z")
    return new Date(val);
  }
  
  return new Date(val);
};

// Strict Local Date Parser to prevent UTC timezone shifts on string inputs
const parseLocal = (dStr: string) => {
  if (!dStr) return new Date();
  const parts = dStr.split('-');
  if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dStr);
};

const Utilisation = () => {
  const { vehicles, loading: vLoad } = useVehicles();
  const { rentals, loading: rLoad } = useRentals();
  const { logs, loading: mLoad } = useMaintenanceLogs();
  const { customers, loading: cLoad } = useCustomers();

  // Filters
  const [startDate, setStartDate] = useState(startOfMonth(new Date()).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(endOfMonth(new Date()).toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters
  const [selectedVehicles, setSelectedVehicles] = useState<string | string[]>(['all']);
  const [selectedModels, setSelectedModels] = useState<string | string[]>(['all']);
  const [utilMin, setUtilMin] = useState<number | ''>('');
  const [utilMax, setUtilMax] = useState<number | ''>('');
  const [showSold, setShowSold] = useState(false);
  
  // Modal State
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const loading = vLoad || rLoad || mLoad || cLoad;

  // Searchable Select Options (Vehicles by Registration)
  const vehicleOptions = useMemo(() => {
    return [
      { id: 'all', label: 'All Registrations' },
      ...vehicles.map(v => ({
        id: v.registrationNumber,
        label: v.registrationNumber,
        subLabel: `${v.make} ${v.model}`
      }))
    ];
  }, [vehicles]);

  const modelOptions = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => v.model).filter(Boolean))).sort();
    return [
      { id: 'all', label: 'All Models' },
      ...unique.map(m => ({ id: m, label: m }))
    ];
  }, [vehicles]);

  // Massive Data Calculation Engine
  const rawUtilisationData = useMemo(() => {
    const rangeStart = parseLocal(startDate);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = parseLocal(endDate);
    rangeEnd.setHours(0, 0, 0, 0);

    // Safeguard to prevent complete browser freeze
    if (!isValid(rangeStart) || !isValid(rangeEnd) || rangeStart > rangeEnd) return [];
    if (rangeStart.getFullYear() < 2000 || rangeEnd.getFullYear() > 2100) return [];

    const totalDaysInRange = differenceInDays(rangeEnd, rangeStart) + 1;
    const weeksInRange = totalDaysInRange / 7 || 1;

    // Filter out vehicles purchased AFTER the end date
    const validVehicles = vehicles.filter(v => {
      if (!showSold && v.status === 'sold') return false; 
      if (!v.purchasedDate) return true;
      const pDate = parseFirestoreDate(v.purchasedDate);
      if (isNaN(pDate.getTime())) return true;
      return pDate <= rangeEnd;
    });

    return validVehicles.map(vehicle => {
      // --- 1. Collect all rental periods ---
      const rentalPeriods: { start: Date, end: Date }[] = [];

      rentals.forEach(rental => {
        if (rental.status === 'cancelled') return;

        // Case 1: Used as the Main Vehicle
        if (rental.vehicleId === vehicle.id) {
          const rStart = parseFirestoreDate(rental.startDate);
          let rEnd = parseFirestoreDate(rental.endDate);
          
          // ✅ CRITICAL FIX: Ensure 'completed' rentals use their exact return condition date 
          // because the legacy endDate might be stuck outside the date range.
          const isCompleted = ['completed', 'complete', 'returned'].includes((rental.status || '').toLowerCase());
          if (isCompleted && rental.returnCondition && rental.returnCondition.date) {
             const actualReturnDate = parseFirestoreDate(rental.returnCondition.date);
             if (!isNaN(actualReturnDate.getTime())) {
                 rEnd = actualReturnDate;
             }
          } else if (rental.status === 'active' && rEnd.getTime() < Date.now()) {
             rEnd = new Date();
          }
          
          // Safety logic to ensure valid, forward-moving dates
          if (!isNaN(rStart.getTime()) && !isNaN(rEnd.getTime())) {
             const actualStart = rStart.getTime() <= rEnd.getTime() ? rStart : rEnd;
             const actualEnd = rStart.getTime() <= rEnd.getTime() ? rEnd : rStart;
             rentalPeriods.push({ start: actualStart, end: actualEnd });
          }
        }

        // Case 2: Used as a Substitution Vehicle
        if (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0) {
          rental.hireSubstitutionDetails.forEach(sub => {
            const subReg = (sub.registration || '').toLowerCase().replace(/\s+/g, '');
            const vehReg = (vehicle.registrationNumber || '').toLowerCase().replace(/\s+/g, '');
            
            if (subReg && subReg === vehReg) {
              const sStart = parseFirestoreDate(sub.givenAt);
              let sEnd = sub.returnCondition ? parseFirestoreDate(sub.returnCondition.date) : parseFirestoreDate(sub.expectedReturnAt);
              
              if (!sub.returnCondition && sEnd.getTime() < Date.now()) {
                 sEnd = new Date(); 
              }
              
              if (!isNaN(sStart.getTime()) && !isNaN(sEnd.getTime())) {
                 const actualStart = sStart.getTime() <= sEnd.getTime() ? sStart : sEnd;
                 const actualEnd = sStart.getTime() <= sEnd.getTime() ? sEnd : sStart;
                 rentalPeriods.push({ start: actualStart, end: actualEnd });
              }
            }
          });
        }
      });

      // --- 2. Collect all maintenance periods ---
      const maintPeriods: { start: Date, end: Date }[] = [];

      logs.forEach(log => {
        if (log.status === 'cancelled' || log.vehicleId !== vehicle.id) return;

        const mStart = parseFirestoreDate(log.date);
        let mEnd = mStart;
        
        // Prevent maintenance from falsely running infinitely
        if (log.completedDate) {
            mEnd = parseFirestoreDate(log.completedDate);
        } else if (log.status === 'in-progress') {
            mEnd = new Date(); // Extends up to today
        } else if (log.status === 'completed' || log.status === 'scheduled') {
            mEnd = mStart; // Capped to a single day event
        }
        
        if (!isNaN(mStart.getTime()) && !isNaN(mEnd.getTime())) {
          const actualStart = mStart.getTime() <= mEnd.getTime() ? mStart : mEnd;
          const actualEnd = mStart.getTime() <= mEnd.getTime() ? mEnd : mStart;
          maintPeriods.push({ start: actualStart, end: actualEnd });
        }
      });

      // --- 3. Strict Day-by-Day Math ---
      let rentedDays = 0;
      let maintenanceDays = 0;
      let unavailableDays = 0; // Tracks days that are either rented OR in maintenance

      for (let i = 0; i < totalDaysInRange; i++) {
        const currentDayStart = new Date(rangeStart);
        currentDayStart.setDate(currentDayStart.getDate() + i);
        currentDayStart.setHours(0, 0, 0, 0);

        const currentDayEnd = new Date(currentDayStart);
        currentDayEnd.setHours(23, 59, 59, 999);

        const cStart = currentDayStart.getTime();
        const cEnd = currentDayEnd.getTime();

        // Evaluate both conditions independently
        const isRented = rentalPeriods.some(p => p.start.getTime() <= cEnd && p.end.getTime() >= cStart);
        const isMaint = maintPeriods.some(p => p.start.getTime() <= cEnd && p.end.getTime() >= cStart);

        if (isRented) {
          rentedDays++;
        }
        
        if (isMaint) {
          maintenanceDays++;
        }

        // If it's rented OR in maintenance, it's unavailable for a new hire
        if (isRented || isMaint) {
          unavailableDays++;
        }
      }

      // --- 4. Final Utilisation Math ---
      // Use the combined unavailableDays to prevent double-subtracting overlapping days
      const availableDays = Math.max(0, totalDaysInRange - unavailableDays);
      
      let utilisationPct = 0;
      const possibleHireDays = totalDaysInRange - maintenanceDays;
      if (possibleHireDays > 0) {
        utilisationPct = (rentedDays / possibleHireDays) * 100;
      }
      if (utilisationPct > 100) utilisationPct = 100;

      // --- 5. Pure Historical Exact Mileage Difference ---
      let estMileageTotal = 0;
      if (vehicle.mileageUpdates && Array.isArray(vehicle.mileageUpdates) && vehicle.mileageUpdates.length > 0) {
        const updates = vehicle.mileageUpdates
          .map((u: any) => ({ ...u, parsedDate: parseFirestoreDate(u.date), mileage: Number(u.mileage) }))
          .filter((u: any) => !isNaN(u.parsedDate.getTime()) && !isNaN(u.mileage))
          .sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());

        if (updates.length > 0) {
          let startUpdate = updates.slice().reverse().find((u: any) => u.parsedDate.getTime() <= rangeStart.getTime());
          let endUpdate = updates.find((u: any) => u.parsedDate.getTime() >= rangeEnd.getTime());

          if (!startUpdate) startUpdate = updates[0]; 
          
          if (!endUpdate) {
            const insideEnd = updates.slice().reverse().find((u: any) => u.parsedDate.getTime() <= rangeEnd.getTime());
            endUpdate = insideEnd || updates[updates.length - 1]; 
          }

          if (startUpdate && endUpdate && endUpdate.parsedDate.getTime() >= startUpdate.parsedDate.getTime()) {
            const diff = endUpdate.mileage - startUpdate.mileage;
            estMileageTotal = Math.max(0, diff); 
          }
        }
      }

      // --- 6. Estimated Hours ---
      const estHoursTotal = rentedDays * 24;
      const estHoursPerWeek = Math.round(estHoursTotal / weeksInRange);
      const estMileagePerWeek = Math.round(estMileageTotal / weeksInRange);

      // --- 7. Most Recent Driver ---
      let recentDriver = 'None';
      const vehicleRentals = rentals.filter(r => r.vehicleId === vehicle.id && r.status !== 'cancelled');
      if (vehicleRentals.length > 0) {
        const sortedRentals = [...vehicleRentals].sort((a, b) => {
           const aDate = parseFirestoreDate(a.startDate);
           const bDate = parseFirestoreDate(b.startDate);
           return bDate.getTime() - aDate.getTime();
        });
        const latest = sortedRentals[0];
        const cust = customers.find(c => c.id === latest.customerId);
        recentDriver = cust ? cust.name : 'Unknown';
      }

      return {
        id: vehicle.id,
        registration: vehicle.registrationNumber,
        makeModel: `${vehicle.make} ${vehicle.model}`,
        model: vehicle.model,
        status: vehicle.status,
        image: vehicle.image,
        recentDriver,
        availableDays,
        rentedDays,
        maintenanceDays,
        estMileageTotal,
        estMileagePerWeek,
        estHoursTotal,
        estHoursPerWeek,
        utilisationPct,
        totalDaysInRange
      };
    });
  }, [vehicles, rentals, logs, customers, startDate, endDate, showSold]);

  // Apply Filters & Sorting
  const filteredData = useMemo(() => {
    let result = rawUtilisationData.filter(item => {
      const matchesSearch = item.registration.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.recentDriver.toLowerCase().includes(searchQuery.toLowerCase());
      
      const selVehs = Array.isArray(selectedVehicles) ? selectedVehicles : [selectedVehicles];
      const matchesVehicle = selVehs.includes('all') || selVehs.includes(item.registration);

      const selMods = Array.isArray(selectedModels) ? selectedModels : [selectedModels];
      const matchesModel = selMods.includes('all') || selMods.includes(item.model);

      const minU = utilMin === '' ? 0 : Number(utilMin);
      const maxU = utilMax === '' ? 100 : Number(utilMax);
      const matchesUtilRange = item.utilisationPct >= minU && item.utilisationPct <= maxU;

      return matchesSearch && matchesVehicle && matchesModel && matchesUtilRange;
    });

    return result.sort((a, b) => b.utilisationPct - a.utilisationPct);
  }, [rawUtilisationData, searchQuery, selectedVehicles, selectedModels, utilMin, utilMax]);

  const avgUtilisation = filteredData.length ? (filteredData.reduce((acc, curr) => acc + curr.utilisationPct, 0) / filteredData.length) : 0;
  const underutilisedCount = filteredData.filter(v => v.utilisationPct < 30).length;
  const totalRentedDays = filteredData.reduce((acc, curr) => acc + curr.rentedDays, 0);

  // --- RICH HTML EXCEL EXPORT ---
  const handleExportExcel = useCallback(() => {
    const formattedStart = format(parseLocal(startDate), 'dd MMM yyyy');
    const formattedEnd = format(parseLocal(endDate), 'dd MMM yyyy');

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead>
            <tr>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Registration</th>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Make/Model</th>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Recent Driver</th>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Total Days</th>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Available Days</th>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Rented Days</th>
              <th rowspan="2" style="background-color: #1E40AF; color: white; padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">Maint Days</th>
              
              <th colspan="5" style="background-color: #438BDC; color: white; padding: 10px; font-size: 16px; text-align: center; border-bottom: 2px solid white;">
                Analysis Period: ${formattedStart} to ${formattedEnd}
              </th>
            </tr>
            <tr style="color: white; font-weight: bold; text-align: center;">
              <th style="background-color: #3B82F6; padding: 10px;">Est Total Mileage</th>
              <th style="background-color: #3B82F6; padding: 10px;">Est Mileage/Wk</th>
              <th style="background-color: #3B82F6; padding: 10px;">Est Total Hours</th>
              <th style="background-color: #3B82F6; padding: 10px;">Est Hours/Wk</th>
              <th style="background-color: #3B82F6; padding: 10px;">Utilisation %</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredData.forEach(r => {
      const pct = r.utilisationPct;
      const bgColor = pct >= 60 ? '#dcfce7' : pct >= 30 ? '#fef08a' : '#fee2e2'; 
      const textColor = pct >= 60 ? '#166534' : pct >= 30 ? '#854d0e' : '#991b1b';

      tableHtml += `
        <tr style="text-align: center;">
          <td style="padding: 8px; font-weight: bold;">${r.registration}</td>
          <td style="padding: 8px;">${r.makeModel}</td>
          <td style="padding: 8px;">${r.recentDriver}</td>
          <td style="padding: 8px;">${r.totalDaysInRange}</td>
          <td style="padding: 8px;">${r.availableDays}</td>
          <td style="padding: 8px;">${r.rentedDays}</td>
          <td style="padding: 8px;">${r.maintenanceDays}</td>
          <td style="padding: 8px;">${r.estMileageTotal.toLocaleString()}</td>
          <td style="padding: 8px;">${r.estMileagePerWeek.toLocaleString()}</td>
          <td style="padding: 8px;">${r.estHoursTotal.toLocaleString()}</td>
          <td style="padding: 8px;">${r.estHoursPerWeek.toLocaleString()}</td>
          <td style="padding: 8px; background-color: ${bgColor}; color: ${textColor}; font-weight: bold;">
            ${pct.toFixed(1)}%
          </td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Fleet_Utilisation_${startDate}_to_${endDate}.xls`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Excel export downloaded successfully');
  }, [filteredData, startDate, endDate]);

  const getCompanyInfo = async () => {
    try {
      const snap = await getDoc(doc(db, 'companySettings', 'details'));
      return snap.exists() ? snap.data() : { fullName: 'AIE Skyline Limited', officialAddress: '', phone: '', email: '' };
    } catch {
      return { fullName: 'AIE Skyline Limited', officialAddress: '', phone: '', email: '' };
    }
  };

  const handleExportPDF = async () => {
    toast.loading('Generating PDF Report...', { id: 'pdf-gen' });
    try {
      const companyDetails = await getCompanyInfo();
      const docElement = <UtilisationBulkDocument records={filteredData} startDate={startDate} endDate={endDate} companyDetails={companyDetails} />;
      const asPdf = pdf([]); 
      asPdf.updateContainer(docElement);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Report generated!', { id: 'pdf-gen' });
    } catch (err) {
      toast.error('Failed to generate report', { id: 'pdf-gen' });
    }
  };

  const handleDownloadSingleRecord = async (record: any) => {
    toast.loading('Generating Document...', { id: 'pdf-single' });
    try {
      const companyDetails = await getCompanyInfo();
      const docElement = <UtilisationSingleDocument record={record} startDate={startDate} endDate={endDate} companyDetails={companyDetails} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(docElement);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Document opened!', { id: 'pdf-single' });
    } catch {
      toast.error('Failed to generate document', { id: 'pdf-single' });
    }
  };

  // --- Table Configuration ---
  const columns = [
    {
      header: 'Vehicle',
      accessorKey: 'registration',
      enableSorting: true,
      cell: ({ row }: any) => (
        <div>
          <div className="font-bold text-gray-900">{row.original.registration}</div>
          <div className="text-xs text-gray-500">{row.original.makeModel}</div>
        </div>
      )
    },
    {
      header: 'Recent Driver',
      accessorKey: 'recentDriver',
      enableSorting: true,
      cell: ({ getValue }: any) => <span className="text-sm font-medium text-gray-700">{getValue()}</span>
    },
    {
      header: 'Est Mileage',
      accessorKey: 'estMileageTotal',
      enableSorting: true,
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{row.original.estMileageTotal.toLocaleString()} mi</span>
          <span className="text-xs text-gray-500">{row.original.estMileagePerWeek.toLocaleString()} mi/wk</span>
        </div>
      )
    },
    {
      header: 'Est Hours',
      accessorKey: 'estHoursTotal',
      enableSorting: true,
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{row.original.estHoursTotal.toLocaleString()} hrs</span>
          <span className="text-xs text-gray-500">{row.original.estHoursPerWeek.toLocaleString()} hrs/wk</span>
        </div>
      )
    },
    {
      header: 'Utilisation %',
      accessorKey: 'utilisationPct',
      enableSorting: true,
      cell: ({ row }: any) => {
        const pct = row.original.utilisationPct;
        let colorClass = 'text-red-700 bg-red-50 border-red-200';
        let indicator = '閥';
        if (pct >= 60) { colorClass = 'text-green-800 bg-green-50 border-green-200'; indicator = '泙'; } 
        else if (pct >= 30) { colorClass = 'text-yellow-800 bg-yellow-50 border-yellow-200'; indicator = '泯'; }
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-bold ${colorClass}`}>
            <span className="text-xs">{indicator}</span>
            <span className="font-mono text-sm">{pct.toFixed(1)}%</span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedRecord(row.original)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Details">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => handleDownloadSingleRecord(row.original)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Download Document">
            <FileText className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          Fleet Utilisation
        </h1>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary-600 transition-all">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

     {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:border-blue-200 transition-colors">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mt-1"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Utilisation</p>
            <p className="text-2xl font-black text-gray-900">{avgUtilisation.toFixed(1)}%</p>
            <p className="text-[10px] text-gray-400 mt-1 leading-tight">Average time rented vs available time across the fleet.</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:border-purple-200 transition-colors">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mt-1"><Car className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Vehicles</p>
            <p className="text-2xl font-black text-gray-900">{filteredData.length}</p>
            <p className="text-[10px] text-gray-400 mt-1 leading-tight">Vehicles matching your current search and parameters.</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:border-green-200 transition-colors">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl mt-1"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Days Rented</p>
            <p className="text-2xl font-black text-gray-900">{totalRentedDays}</p>
            <p className="text-[10px] text-gray-400 mt-1 leading-tight">Sum of all confirmed rental days in this specific period.</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:border-red-200 transition-colors">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl mt-1"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Underutilised (&lt;30%)</p>
            <p className="text-2xl font-black text-gray-900">{underutilisedCount}</p>
            <p className="text-[10px] text-gray-400 mt-1 leading-tight">Vehicles rented for less than 30% of their available time.</p>
          </div>
        </div>
      </div>

      {/* ADVANCED FILTERS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-700">Analysis Parameters</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
           <div className="lg:col-span-3">
             <label className="block text-sm font-medium text-gray-700 mb-1">Search Keyword</label>
             <div className="relative">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
               <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" placeholder="Reg, Model, Driver..." />
             </div>
           </div>
           
           <div className="lg:col-span-2 z-20">
             <SearchableSelect
               label="Registrations"
               options={vehicleOptions}
               value={selectedVehicles}
               onChange={setSelectedVehicles}
               isMulti={true}
               placeholder="Select registrations..."
             />
           </div>

           <div className="lg:col-span-2 z-10">
             <SearchableSelect
               label="Models"
               options={modelOptions}
               value={selectedModels}
               onChange={setSelectedModels}
               isMulti={true}
               placeholder="Select models..."
             />
           </div>

           <div className="lg:col-span-2">
             <label className="block text-sm font-medium text-gray-700 mb-1">Utilisation Range (%)</label>
             <div className="flex items-center gap-2">
               <input type="number" placeholder="Min" value={utilMin} onChange={e => setUtilMin(e.target.value === '' ? '' : Number(e.target.value))} className="w-full py-1.5 px-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
               <span className="text-gray-400">-</span>
               <input type="number" placeholder="Max" value={utilMax} onChange={e => setUtilMax(e.target.value === '' ? '' : Number(e.target.value))} className="w-full py-1.5 px-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
             </div>
           </div>

           <div className="lg:col-span-3 grid grid-cols-2 gap-2">
             <FormField type="date" label="Analysis Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} />
             <FormField type="date" label="Analysis End Date" value={endDate} onChange={e => setEndDate(e.target.value)} />
           </div>

           <div className="lg:col-span-2 flex items-center mt-7">
             <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
               <input 
                 type="checkbox" 
                 checked={showSold} 
                 onChange={e => setShowSold(e.target.checked)} 
                 className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" 
               />
               Include Sold Vehicles
             </label>
           </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable data={filteredData} columns={columns} module="vehicles" tableId="utilisation-table" />
      </div>

      {/* ENHANCED XL DETAILS MODAL */}
      <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="Detailed Vehicle Utilisation Report" size="xl">
        {selectedRecord && (
          <div className="space-y-6">
            
            {/* Header / Image Row */}
            <div className="flex flex-col md:flex-row items-start gap-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              {selectedRecord.image ? (
                <img src={selectedRecord.image} alt={selectedRecord.make} className="w-48 h-48 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0" />
              ) : (
                <div className="w-48 h-48 bg-gray-50 rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm flex-shrink-0">
                   <Car className="w-12 h-12 text-gray-300 mb-2"/>
                   <span className="text-sm font-bold text-gray-400">No Image</span>
                </div>
              )}
              
              <div className="flex-1 w-full space-y-4 pt-2">
                 <div className="flex justify-between items-start">
                   <div>
                     <h3 className="text-3xl font-black text-gray-900">{selectedRecord.registration}</h3>
                     <p className="text-lg text-gray-600 font-bold mt-1">{selectedRecord.makeModel} {selectedRecord.year ? `(${selectedRecord.year})` : ''}</p>
                   </div>
                   <div className="text-right bg-blue-50 border border-blue-100 p-3 rounded-xl">
                     <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Final Utilisation</p>
                     <p className={`text-4xl font-black font-mono mt-1 ${selectedRecord.utilisationPct >= 60 ? 'text-green-600' : selectedRecord.utilisationPct >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {selectedRecord.utilisationPct.toFixed(1)}%
                     </p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                     <p className="text-xs text-gray-500 uppercase font-bold">Current Status</p>
                     <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedRecord.status.toUpperCase()}</p>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                     <p className="text-xs text-gray-500 uppercase font-bold">Most Recent Driver</p>
                     <p className="text-sm font-bold text-primary mt-0.5">{selectedRecord.recentDriver}</p>
                   </div>
                 </div>
              </div>
            </div>

            {/* Time Metrics Table Row */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
               <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-gray-500"/>
                 <h4 className="font-bold text-gray-800">Time & Activity Metrics</h4>
               </div>
               <div className="grid grid-cols-4 divide-x divide-gray-100">
                 <div className="p-5 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Analysis Period</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedRecord.totalDaysInRange} <span className="text-sm text-gray-500">Days</span></p>
                 </div>
                 <div className="p-5 text-center bg-green-50/30">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Time Rented</p>
                    <p className="text-2xl font-bold text-green-700">{selectedRecord.rentedDays} <span className="text-sm text-green-600/70">Days</span></p>
                 </div>
                 <div className="p-5 text-center bg-red-50/30">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Off-Road (Maint)</p>
                    <p className="text-2xl font-bold text-red-700">{selectedRecord.maintenanceDays} <span className="text-sm text-red-600/70">Days</span></p>
                 </div>
                 <div className="p-5 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Available For Hire</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedRecord.availableDays} <span className="text-sm text-gray-500">Days</span></p>
                 </div>
               </div>
            </div>

            {/* Usage Estimates Table Row */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
               <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5 text-gray-500"/>
                 <h4 className="font-bold text-gray-800">Calculated Usage Estimates</h4>
               </div>
               <div className="grid grid-cols-4 divide-x divide-gray-100">
                 <div className="p-5 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Hours</p>
                    <p className="text-2xl font-mono font-bold text-gray-900">{selectedRecord.estHoursTotal.toLocaleString()}</p>
                 </div>
                 <div className="p-5 text-center">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Hours / Week</p>
                    <p className="text-2xl font-mono font-bold text-gray-900">{selectedRecord.estHoursPerWeek.toLocaleString()}</p>
                 </div>
                 <div className="p-5 text-center bg-blue-50/30">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Mileage</p>
                    <p className="text-2xl font-mono font-bold text-blue-700">{selectedRecord.estMileageTotal.toLocaleString()}</p>
                 </div>
                 <div className="p-5 text-center bg-blue-50/30">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mileage / Week</p>
                    <p className="text-2xl font-mono font-bold text-blue-700">{selectedRecord.estMileagePerWeek.toLocaleString()}</p>
                 </div>
               </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
               <button onClick={() => setSelectedRecord(null)} className="px-6 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors">Close Details</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Utilisation;