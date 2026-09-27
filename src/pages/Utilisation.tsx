// src/pages/Utilisation.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useCustomers } from '../hooks/useCustomers';
import { usePermissions } from '../hooks/usePermissions';
import { DataTable } from '../components/DataTable/DataTable';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { differenceInDays, startOfMonth, endOfMonth, isValid, format } from 'date-fns';
import { Activity, Car, Download, FileSpreadsheet, Search, Filter, TrendingUp, Clock, AlertTriangle, Eye, FileText, User, RotateCcw, History, Users, BarChart3, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import UtilisationBulkDocument from '../components/pdf/UtilisationBulkDocument';
import UtilisationSingleDocument from '../components/pdf/UtilisationSingleDocument';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import VehicleAssignmentHistoryTable, { DriverAssignmentRecord } from '../components/utilisation/VehicleAssignmentHistoryTable';
import FleetHoursWorkedIdleChart from '../components/utilisation/FleetHoursWorkedIdleChart';

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
  const { can } = usePermissions();
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

  // Tab View State: 'metrics' (Utilisation table), 'hoursChart' (7-Day Worked vs Idle Hours), or 'driverLog' (Historical Driver Assignment Log)
  const [activeTab, setActiveTab] = useState<'metrics' | 'hoursChart' | 'driverLog'>('metrics');

  // Uniform random average daily mileage between 76 and 100 applied to all vehicles whose mileage was not updated
  const [defaultDailyMileageRate] = useState<number>(() => Math.floor(Math.random() * (100 - 76 + 1)) + 76);

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

      // Check if vehicle status or active log indicates maintenance
      const vStatus = (vehicle.status || '').toLowerCase().trim();
      const isStatusMaintenance = vStatus === 'maintenance' || vStatus === 'repair' || vStatus === 'scheduled-maintenance' || vStatus === 'in-maintenance';
      const hasActiveMaintLog = logs.some(l => l.vehicleId === vehicle.id && (l.status === 'in-progress' || (l.status !== 'cancelled' && !l.completedDate)));
      const isVehicleInMaintenance = isStatusMaintenance || hasActiveMaintLog;

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
        const isLogMaint = maintPeriods.some(p => p.start.getTime() <= cEnd && p.end.getTime() >= cStart);
        // If the vehicle is in maintenance, any day it is not rented is an off-road maintenance day
        const isMaint = isLogMaint || (isVehicleInMaintenance && !isRented);

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
      // RULE: If the vehicle is in maintenance, that means the vehicle is NOT available, so available is ZERO (0).
      let availableDays = Math.max(0, totalDaysInRange - unavailableDays);
      if (isVehicleInMaintenance) {
        availableDays = 0;
        maintenanceDays = Math.max(maintenanceDays, totalDaysInRange - rentedDays);
      }
      
      let utilisationPct = 0;
      const possibleHireDays = totalDaysInRange - maintenanceDays;
      if (possibleHireDays > 0) {
        utilisationPct = (rentedDays / possibleHireDays) * 100;
      } else if (rentedDays > 0) {
        utilisationPct = (rentedDays / totalDaysInRange) * 100;
      }
      if (utilisationPct > 100) utilisationPct = 100;

      // --- 5. Pure Historical Exact Mileage Difference with 76 mi/day Fallback ---
      let estMileageTotal = 0;
      let hasUpdatedMileage = false;

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
            if (diff > 0) {
              estMileageTotal = diff;
              hasUpdatedMileage = true;
            }
          }
        }
      }

      // RULE: If the mileage of the vehicle is not updated, utilisation automatically adds
      // a uniform randomly chosen average mileage between 76 and 100 per day (all vehicles without updated mileage share this same rate)
      // UNLESS the vehicle is available (which means the vehicle was not rented and was available for rent, where no average mileage is added).
      if (!hasUpdatedMileage) {
        estMileageTotal = rentedDays * defaultDailyMileageRate;
      }

      // --- 6. Driving Hours ---
      const AVG_COMMERCIAL_SPEED_MPH = 22; // Commercial mixed/urban driving average speed
      let estHoursTotal = 0;
      let hoursBasis: 'mileage' | 'days' = 'days';

      if (estMileageTotal > 0) {
        estHoursTotal = Math.round(estMileageTotal / AVG_COMMERCIAL_SPEED_MPH);
        hoursBasis = hasUpdatedMileage ? 'mileage' : 'days';
      } else {
        estHoursTotal = 0;
        hoursBasis = 'days';
      }

      const estHoursPerWeek = Math.round(estHoursTotal / weeksInRange);
      const estMileagePerWeek = Math.round(estMileageTotal / weeksInRange);

      // --- 7. Historical Driver Assignment Log & Previous Driver Tracking ---
      const driverHistory: DriverAssignmentRecord[] = [];

      rentals.forEach(rental => {
        if (rental.status === 'cancelled') return;

        // Case 1: Primary assigned vehicle
        if (rental.vehicleId === vehicle.id) {
          const rStart = parseFirestoreDate(rental.startDate);
          let rEnd = parseFirestoreDate(rental.endDate);
          const isCompleted = ['completed', 'complete', 'returned'].includes((rental.status || '').toLowerCase());
          if (isCompleted && rental.returnCondition && rental.returnCondition.date) {
            const actualReturn = parseFirestoreDate(rental.returnCondition.date);
            if (!isNaN(actualReturn.getTime())) {
              rEnd = actualReturn;
            }
          } else if (rental.status === 'active' && rEnd.getTime() < Date.now()) {
            rEnd = new Date();
          }

          if (!isNaN(rStart.getTime())) {
            const cust = customers.find(c => c.id === rental.customerId);
            const isOngoing = rental.status === 'active' || (!isCompleted && rEnd.getTime() >= Date.now());
            const durationDays = !isNaN(rEnd.getTime())
              ? Math.max(1, Math.round(Math.abs(rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)))
              : 1;

            driverHistory.push({
              id: rental.id,
              vehicleId: vehicle.id,
              vehicleRegistration: vehicle.registrationNumber,
              vehicleMakeModel: `${vehicle.make} ${vehicle.model}`,
              customerId: rental.customerId,
              driverName: cust ? cust.name : 'Unknown Driver',
              driverPhone: cust?.mobile || (cust as any)?.phone,
              driverEmail: cust?.email,
              startDate: rStart,
              endDate: rEnd,
              isCurrent: false, // will mark after sorting
              isOngoing,
              durationDays,
              assignmentType: 'Rental',
              agreementNumber: rental.rentalAgreementNumber,
              status: rental.status || 'active',
              notes: rental.notes && rental.notes.length > 0 ? rental.notes[0].text : undefined
            });
          }
        }

        // Case 2: Substitution vehicle
        if (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0) {
          rental.hireSubstitutionDetails.forEach((sub, sIdx) => {
            const subReg = (sub.registration || '').toLowerCase().replace(/\s+/g, '');
            const vehReg = (vehicle.registrationNumber || '').toLowerCase().replace(/\s+/g, '');

            if (subReg && subReg === vehReg) {
              const sStart = parseFirestoreDate(sub.givenAt);
              let sEnd = sub.returnCondition ? parseFirestoreDate(sub.returnCondition.date) : parseFirestoreDate(sub.expectedReturnAt);
              const isSubCompleted = !!sub.returnCondition;
              if (!isSubCompleted && sEnd.getTime() < Date.now()) {
                sEnd = new Date();
              }

              if (!isNaN(sStart.getTime())) {
                const cust = customers.find(c => c.id === rental.customerId);
                const isOngoing = !isSubCompleted && sEnd.getTime() >= Date.now();
                const durationDays = !isNaN(sEnd.getTime())
                  ? Math.max(1, Math.round(Math.abs(sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24)))
                  : 1;

                driverHistory.push({
                  id: `${rental.id}-sub-${sIdx}`,
                  vehicleId: vehicle.id,
                  vehicleRegistration: vehicle.registrationNumber,
                  vehicleMakeModel: `${vehicle.make} ${vehicle.model}`,
                  customerId: rental.customerId,
                  driverName: cust ? cust.name : 'Unknown Driver',
                  driverPhone: cust?.mobile || (cust as any)?.phone,
                  driverEmail: cust?.email,
                  startDate: sStart,
                  endDate: sEnd,
                  isCurrent: false,
                  isOngoing,
                  durationDays,
                  assignmentType: 'Substitution',
                  agreementNumber: rental.rentalAgreementNumber,
                  status: isSubCompleted ? 'returned' : 'active'
                });
              }
            }
          });
        }
      });

      // Sort assignments descending by start date (newest first)
      driverHistory.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

      if (driverHistory.length > 0) {
        driverHistory[0].isCurrent = true;
      }

      const currentDriverRecord = driverHistory[0] || null;
      const recentDriver = currentDriverRecord ? currentDriverRecord.driverName : 'None';

      // Keep record of the previous driver when vehicle is assigned to another driver
      const previousDriverRecord = driverHistory.length > 1 ? driverHistory[1] : null;
      const previousDriver = previousDriverRecord ? previousDriverRecord.driverName : 'None';
      const previousDriverDates = previousDriverRecord && isValid(previousDriverRecord.startDate) && isValid(previousDriverRecord.endDate)
        ? `${format(previousDriverRecord.startDate, 'dd/MM/yyyy')} - ${format(previousDriverRecord.endDate, 'dd/MM/yyyy')}`
        : null;

      return {
        id: vehicle.id,
        registration: vehicle.registrationNumber,
        makeModel: `${vehicle.make} ${vehicle.model}`,
        model: vehicle.model,
        status: vehicle.status,
        image: vehicle.image,
        year: vehicle.year,
        recentDriver,
        previousDriver,
        previousDriverDates,
        currentDriverRecord,
        previousDriverRecord,
        driverHistory,
        availableDays,
        rentedDays,
        maintenanceDays,
        estMileageTotal,
        hasUpdatedMileage,
        defaultDailyMileageRate,
        estMileagePerWeek,
        estHoursTotal,
        estHoursPerWeek,
        utilisationPct,
        totalDaysInRange,
        hoursBasis
      };
    });
  }, [vehicles, rentals, logs, customers, startDate, endDate, showSold, defaultDailyMileageRate]);

  // Apply Filters & Sorting
  const filteredData = useMemo(() => {
    let result = rawUtilisationData.filter(item => {
      const matchesSearch = item.registration.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.recentDriver.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.previousDriver.toLowerCase().includes(searchQuery.toLowerCase());
      
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

  // Aggregate all driver assignments across the fleet for the historical log table
  const allDriverAssignments = useMemo(() => {
    return rawUtilisationData.flatMap(item => item.driverHistory || []);
  }, [rawUtilisationData]);

  const avgUtilisation = filteredData.length ? (filteredData.reduce((acc, curr) => acc + curr.utilisationPct, 0) / filteredData.length) : 0;
  const underutilisedCount = filteredData.filter(v => v.utilisationPct < 30).length;
  const totalRentedDays = filteredData.reduce((acc, curr) => acc + curr.rentedDays, 0);

  // --- ENHANCED RICH HTML EXCEL EXPORT ---
  const handleExportExcel = useCallback(async () => {
    const formattedStart = format(parseLocal(startDate), 'dd MMM yyyy');
    const formattedEnd = format(parseLocal(endDate), 'dd MMM yyyy');
    const companyDetails = await getCompanyInfo();

    const totalVehicles = filteredData.length;
    const sumTotalDays = filteredData.reduce((acc, curr) => acc + (curr.totalDaysInRange || 0), 0);
    const sumAvailableDays = filteredData.reduce((acc, curr) => acc + (curr.availableDays || 0), 0);
    const sumRentedDays = filteredData.reduce((acc, curr) => acc + (curr.rentedDays || 0), 0);
    const sumMaintDays = filteredData.reduce((acc, curr) => acc + (curr.maintenanceDays || 0), 0);
    const sumMileageTotal = filteredData.reduce((acc, curr) => acc + (curr.estMileageTotal || 0), 0);
    const sumMileageWk = filteredData.reduce((acc, curr) => acc + (curr.estMileagePerWeek || 0), 0);
    const sumHoursTotal = filteredData.reduce((acc, curr) => acc + (curr.estHoursTotal || 0), 0);
    const sumHoursWk = filteredData.reduce((acc, curr) => acc + (curr.estHoursPerWeek || 0), 0);
    const overallAvgUtil = totalVehicles > 0 ? (filteredData.reduce((acc, curr) => acc + curr.utilisationPct, 0) / totalVehicles) : 0;

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { font-size: 11pt; font-weight: bold; }
          td { font-size: 10pt; vertical-align: middle; }
        </style>
      </head>
      <body>
        <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif;">
          <!-- Report Header Banner -->
          <tr>
            <td colspan="15" style="background-color: #16192B; color: #FFFFFF; font-size: 16pt; font-weight: bold; padding: 14px 10px; text-align: left;">
              ${companyDetails.fullName || 'AIE Skyline Limited'} — Fleet Utilisation & Driver Assignment Report
            </td>
          </tr>
          <tr>
            <td colspan="15" style="background-color: #F8FAFC; color: #334155; font-size: 10pt; padding: 8px 10px; border-bottom: 2px solid #CBD5E1;">
              <strong>Period:</strong> ${formattedStart} to ${formattedEnd} &nbsp;|&nbsp; 
              <strong>Generated:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')} &nbsp;|&nbsp; 
              <strong>Vehicles:</strong> ${totalVehicles} &nbsp;|&nbsp; 
              <strong>Fleet Avg Utilisation:</strong> ${overallAvgUtil.toFixed(1)}% &nbsp;|&nbsp; 
              <strong>Standard:</strong> Average Driving Model: 8 to 12 hours/day, 5 to 6 days/week (~55 hrs/wk full-time active hire — not 24h continuous)
            </td>
          </tr>
          <thead>
            <tr>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Registration</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Make / Model</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Status</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Current Driver</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Previous Driver</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Driver Dates</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Total Days</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Available Days</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Rented Days</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Off-Road Days</th>
              
              <th colspan="2" style="background-color: #2B314E; color: #FFFFFF; padding: 8px; font-size: 11pt; text-align: center; text-transform: uppercase;">Mileage</th>
              <th colspan="2" style="background-color: #1E3A8A; color: #FFFFFF; padding: 8px; font-size: 11pt; text-align: center; text-transform: uppercase;">Avg Driving Hours</th>
              <th rowspan="2" style="background-color: #1E293B; color: #FFFFFF; padding: 12px 8px; font-size: 11pt; text-align: center; vertical-align: middle; text-transform: uppercase;">Utilisation %</th>
            </tr>
            <tr style="color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="background-color: #2B314E; color: #FFFFFF; padding: 8px; font-size: 10pt; text-transform: uppercase;">Total (mi)</th>
              <th style="background-color: #2B314E; color: #FFFFFF; padding: 8px; font-size: 10pt; text-transform: uppercase;">Per Week</th>
              <th style="background-color: #1E3A8A; color: #FFFFFF; padding: 8px; font-size: 10pt; text-transform: uppercase;">Total Hours</th>
              <th style="background-color: #1E3A8A; color: #FFFFFF; padding: 8px; font-size: 10pt; text-transform: uppercase;">Hours / Wk</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredData.forEach((r, idx) => {
      const pct = r.utilisationPct;
      const rowBg = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
      const badgeBg = pct >= 60 ? '#DCFCE7' : pct >= 30 ? '#FEF3C7' : '#FEE2E2'; 
      const textColor = pct >= 60 ? '#15803D' : pct >= 30 ? '#B45309' : '#B91C1C';
      const prevDriverText = r.previousDriver && r.previousDriver !== 'None' 
        ? `${r.previousDriver}${r.previousDriverDates ? ` (${r.previousDriverDates})` : ''}` 
        : '-';

      tableHtml += `
        <tr style="text-align: center; background-color: ${rowBg};">
          <td style="padding: 7px; font-weight: bold; border: 1px solid #CBD5E1;">${r.registration}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${r.makeModel}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1; text-transform: uppercase; font-size: 9pt;">${r.status || 'Active'}</td>
          <td style="padding: 7px; font-weight: bold; border: 1px solid #CBD5E1;">${r.recentDriver}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${prevDriverText}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1; font-size: 9pt;">${r.previousDriverDates || '-'}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${r.totalDaysInRange}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${r.availableDays}</td>
          <td style="padding: 7px; font-weight: bold; color: #047857; border: 1px solid #CBD5E1;">${r.rentedDays}</td>
          <td style="padding: 7px; color: ${r.maintenanceDays > 0 ? '#B91C1C' : '#64748B'}; border: 1px solid #CBD5E1;">${r.maintenanceDays}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${r.estMileageTotal.toLocaleString()}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${r.estMileagePerWeek.toLocaleString()}</td>
          <td style="padding: 7px; font-weight: bold; border: 1px solid #CBD5E1;">${r.estHoursTotal.toLocaleString()}</td>
          <td style="padding: 7px; border: 1px solid #CBD5E1;">${r.estHoursPerWeek.toLocaleString()}</td>
          <td style="padding: 7px; background-color: ${badgeBg}; color: ${textColor}; font-weight: bold; border: 1px solid #CBD5E1;">
            ${pct.toFixed(1)}%
          </td>
        </tr>
      `;
    });

    // Summary Totals Row at the bottom of the table
    tableHtml += `
          <tr style="background-color: #16192B; color: #FFFFFF; font-weight: bold; text-align: center; border-top: 2px solid #0F172A;">
            <td colspan="6" style="padding: 10px; text-align: left; font-size: 11pt; border: 1px solid #0F172A;">
              FLEET TOTALS & AVERAGES (${totalVehicles} Vehicles)
            </td>
            <td style="padding: 10px; border: 1px solid #0F172A;">${sumTotalDays.toLocaleString()}</td>
            <td style="padding: 10px; border: 1px solid #0F172A;">${sumAvailableDays.toLocaleString()}</td>
            <td style="padding: 10px; color: #34D399; border: 1px solid #0F172A;">${sumRentedDays.toLocaleString()}</td>
            <td style="padding: 10px; color: #F87171; border: 1px solid #0F172A;">${sumMaintDays.toLocaleString()}</td>
            <td style="padding: 10px; border: 1px solid #0F172A;">${sumMileageTotal.toLocaleString()}</td>
            <td style="padding: 10px; border: 1px solid #0F172A;">${sumMileageWk.toLocaleString()}</td>
            <td style="padding: 10px; color: #93C5FD; border: 1px solid #0F172A;">${sumHoursTotal.toLocaleString()}</td>
            <td style="padding: 10px; color: #93C5FD; border: 1px solid #0F172A;">${sumHoursWk.toLocaleString()}</td>
            <td style="padding: 10px; font-size: 11pt; color: #FCD34D; border: 1px solid #0F172A;">
              ${overallAvgUtil.toFixed(1)}%
            </td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Fleet_Utilisation_Report_${startDate}_to_${endDate}.xls`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Enhanced Excel export downloaded successfully');
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
      const docElement = (
        <UtilisationBulkDocument 
          records={filteredData} 
          startDate={startDate} 
          endDate={endDate} 
          companyDetails={companyDetails}
          vehicles={vehicles}
          rentals={rentals}
          logs={logs}
          showSold={showSold}
        />
      );
      const asPdf = pdf([]); 
      asPdf.updateContainer(docElement);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fleet_Utilisation_Report_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('PDF report downloaded successfully!', { id: 'pdf-gen' });
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
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Utilisation_Report_${record.registration}_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Vehicle report downloaded!', { id: 'pdf-single' });
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
        <div className="flex items-center gap-2 min-w-0">
          {row.original.image ? (
            <img
              src={row.original.image}
              alt={row.original.registration}
              className="w-7 h-7 rounded-lg object-cover border border-[#2B314E]/30 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#EEF5FD] border border-[#CBD5E1] flex items-center justify-center text-slate-500 shrink-0">
              <Car className="w-3.5 h-3.5 text-blue-600" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-black text-slate-900 tracking-tight text-xs uppercase leading-tight truncate">
              {row.original.registration}
            </div>
            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[110px] leading-tight">
              {row.original.makeModel}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      enableSorting: true,
      cell: ({ row }: any) => {
        const s = (row.original.status || 'unknown').toLowerCase();
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
        if (s === 'active' || s === 'rented') {
          badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        } else if (s === 'available') {
          badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';
        } else if (s === 'maintenance' || s === 'repair') {
          badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
        } else if (s === 'sold') {
          badgeStyle = 'bg-slate-100 text-slate-600 border-slate-300';
        }
        return (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${badgeStyle}`}>
            {row.original.status || 'Unknown'}
          </span>
        );
      }
    },
    {
      header: 'Driver & History',
      accessorKey: 'recentDriver',
      enableSorting: true,
      cell: ({ row }: any) => {
        const driver = row.original.recentDriver || 'None';
        const prev = row.original.previousDriver;
        const hasPrev = prev && prev !== 'None';
        return (
          <div className="flex flex-col min-w-0 py-0.5 leading-tight">
            <div className="flex items-center gap-1 min-w-0" title={`Current Driver: ${driver}`}>
              <User className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{driver}</span>
            </div>
            {hasPrev ? (
              <div 
                className="flex items-center gap-1 min-w-0 text-[10px] text-slate-500 font-medium mt-0.5" 
                title={`Previous Driver: ${prev}${row.original.previousDriverDates ? ` (${row.original.previousDriverDates})` : ''}`}
              >
                <RotateCcw className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[100px]">Prev: {prev}</span>
              </div>
            ) : (
              <span className="text-[9.5px] text-slate-400 mt-0.5">
                {row.original.driverHistory?.length <= 1 ? '1st driver' : 'None'}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Period',
      accessorKey: 'totalDaysInRange',
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="text-xs font-bold text-slate-700 font-mono whitespace-nowrap">
          {row.original.totalDaysInRange}d
        </span>
      )
    },
    {
      header: 'Rented',
      accessorKey: 'rentedDays',
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          {row.original.rentedDays}d
        </span>
      )
    },
    {
      header: 'Off-Road',
      accessorKey: 'maintenanceDays',
      enableSorting: true,
      cell: ({ row }: any) => {
        const m = row.original.maintenanceDays;
        return (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border whitespace-nowrap ${m > 0 ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {m}d
          </span>
        );
      }
    },
    {
      header: 'Avail',
      accessorKey: 'availableDays',
      enableSorting: true,
      cell: ({ row }: any) => {
        const avail = row.original.availableDays;
        return (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border whitespace-nowrap ${
            avail > 0 ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}>
            {avail}d
          </span>
        );
      }
    },
    {
      header: 'Mileage',
      accessorKey: 'estMileageTotal',
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="font-bold text-slate-900 font-mono text-xs whitespace-nowrap">
          {row.original.estMileageTotal.toLocaleString()} mi
        </span>
      )
    },
    {
      header: 'Avg Driving Hours',
      accessorKey: 'estHoursTotal',
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="font-bold text-slate-900 font-mono text-xs whitespace-nowrap">
          {row.original.estHoursTotal.toLocaleString()} h
        </span>
      )
    },
    {
      header: 'Utilisation',
      accessorKey: 'utilisationPct',
      enableSorting: true,
      cell: ({ row }: any) => {
        const pct = row.original.utilisationPct;
        let badgeStyle = 'text-rose-800 bg-rose-50 border-rose-200';
        let barColor = 'bg-rose-500';
        if (pct >= 60) {
          badgeStyle = 'text-emerald-800 bg-emerald-50 border-emerald-200';
          barColor = 'bg-emerald-500';
        } else if (pct >= 30) {
          badgeStyle = 'text-amber-800 bg-amber-50 border-amber-200';
          barColor = 'bg-amber-500';
        }
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black border ${badgeStyle}`}>
              {pct.toFixed(1)}%
            </span>
            <div className="w-10 bg-slate-200 rounded-full h-1.5 overflow-hidden shrink-0 hidden sm:block">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }: any) => (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          <button
            onClick={() => setSelectedRecord(row.original)}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {can('utilisation', 'singleDoc') && (
            <button
              onClick={() => handleDownloadSingleRecord(row.original)}
              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors cursor-pointer"
              title="Download Document"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-[#2563EB]" />
            Fleet Utilisation
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Fleet utilisation percentages, rental active days, off-road maintenance, and mileage tracking.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Action bar button to view Fleet Worked vs. Idle Hours in separate section */}
          <button
            onClick={() => setActiveTab(activeTab === 'hoursChart' ? 'metrics' : 'hoursChart')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs ${
              activeTab === 'hoursChart'
                ? 'bg-[#2563EB] text-white shadow-blue-200'
                : 'bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-[#F8FAFC]'
            }`}
            title="View 7-Day Fleet Worked vs. Idle Hours Analysis"
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'hoursChart' ? 'text-white' : 'text-blue-600'}`} />
            <span>7-Day Hours Analysis</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              activeTab === 'hoursChart' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'
            }`}>
              7D
            </span>
          </button>

          {can('utilisation', 'export') && (
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-semibold text-[#1E293B] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
          )}
          {can('utilisation', 'export') && (
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-bold shadow-xs hover:bg-[#1D4ED8] transition-colors cursor-pointer">
              <Download className="w-4 h-4" /> Export Report
            </button>
          )}
        </div>
      </div>

     {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#F0F9FF] p-5 rounded-2xl shadow-xs border border-[#BAE6FD] flex items-start gap-4 hover:border-sky-300 transition-colors">
          <div className="p-3 bg-white border border-[#BAE6FD] text-[#0284C7] rounded-xl mt-1 shrink-0 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">Avg Utilisation</p>
            <p className="text-2xl font-black text-[#0369A1]">{avgUtilisation.toFixed(1)}%</p>
            <p className="text-[10px] text-[#64748B] mt-1 leading-tight">Average time rented vs available time across the fleet.</p>
          </div>
        </div>
        
        <div className="bg-[#FAF5FF] p-5 rounded-2xl shadow-xs border border-[#E9D5FF] flex items-start gap-4 hover:border-purple-300 transition-colors">
          <div className="p-3 bg-white border border-[#E9D5FF] text-[#7E22CE] rounded-xl mt-1 shrink-0 shadow-xs">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#7E22CE] uppercase tracking-wider">Active Vehicles</p>
            <p className="text-2xl font-black text-[#6B21A8]">{filteredData.length}</p>
            <p className="text-[10px] text-[#64748B] mt-1 leading-tight">Vehicles matching your current search and parameters.</p>
          </div>
        </div>

        <div className="bg-[#ECFDF5] p-5 rounded-2xl shadow-xs border border-[#A7F3D0] flex items-start gap-4 hover:border-emerald-300 transition-colors">
          <div className="p-3 bg-white border border-[#A7F3D0] text-[#059669] rounded-xl mt-1 shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Total Days Rented</p>
            <p className="text-2xl font-black text-[#047857]">{totalRentedDays}</p>
            <p className="text-[10px] text-[#64748B] mt-1 leading-tight">Sum of all confirmed rental days in this specific period.</p>
          </div>
        </div>
        
        <div className="bg-[#FEF2F2] p-5 rounded-2xl shadow-xs border border-[#FECACA] flex items-start gap-4 hover:border-red-300 transition-colors">
          <div className="p-3 bg-white border border-[#FECACA] text-[#DC2626] rounded-xl mt-1 shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Underutilised (&lt;30%)</p>
            <p className="text-2xl font-black text-[#B91C1C]">{underutilisedCount}</p>
            <p className="text-[10px] text-[#64748B] mt-1 leading-tight">Vehicles rented for less than 30% of their available time.</p>
          </div>
        </div>
      </div>

      {/* VIEW TABS & SECTION ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Fleet Utilisation & Mileage</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'metrics' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {filteredData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hoursChart')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'hoursChart'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Fleet Worked vs. Idle Hours (Last 7 Days)</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'hoursChart' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              7 Days
            </span>
          </button>

          <button
            onClick={() => setActiveTab('driverLog')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'driverLog'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historical Driver Assignment Log</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'driverLog' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {allDriverAssignments.length}
            </span>
          </button>
        </div>

        {activeTab === 'hoursChart' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" /> Return to Fleet Table
            </button>
          </div>
        )}
      </div>

      {activeTab === 'metrics' ? (
        <>
          {/* ADVANCED FILTERS */}
          <div className="rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
            <div className="bg-[#F8FAFC] text-[#0F172A] px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#0F172A]">
                <Filter className="w-4 h-4 text-[#2563EB]" />
                <span>Analysis Parameters</span>
              </div>
              <span className="text-xs text-[#64748B] font-medium">Filter by keyword, vehicle, model, utilisation range & date range</span>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
               <div className="lg:col-span-3">
                 <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Search Keyword</label>
                 <div className="relative">
                   <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]"/>
                   <input 
                     value={searchQuery} 
                     onChange={(e) => setSearchQuery(e.target.value)} 
                     className="w-full pl-9 py-2 bg-white text-[#0F172A] border-[1.5px] border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-[#94A3B8] shadow-xs" 
                     placeholder="Reg, Model, Driver..." 
                   />
                 </div>
               </div>
               
               <div className="lg:col-span-2 z-20">
                 <SearchableSelect
                   label="Registrations"
                   labelClassName="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1"
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
                   labelClassName="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1"
                   options={modelOptions}
                   value={selectedModels}
                   onChange={setSelectedModels}
                   isMulti={true}
                   placeholder="Select models..."
                 />
               </div>

               <div className="lg:col-span-2">
                 <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Utilisation Range (%)</label>
                 <div className="flex items-center gap-2">
                   <input 
                     type="number" 
                     placeholder="Min" 
                     value={utilMin} 
                     onChange={e => setUtilMin(e.target.value === '' ? '' : Number(e.target.value))} 
                     className="w-full py-2 px-2 bg-white text-[#0F172A] border-[1.5px] border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-center placeholder-[#94A3B8] shadow-xs" 
                   />
                   <span className="text-[#94A3B8] font-bold">-</span>
                   <input 
                     type="number" 
                     placeholder="Max" 
                     value={utilMax} 
                     onChange={e => setUtilMax(e.target.value === '' ? '' : Number(e.target.value))} 
                     className="w-full py-2 px-2 bg-white text-[#0F172A] border-[1.5px] border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-center placeholder-[#94A3B8] shadow-xs" 
                   />
                 </div>
               </div>

               <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                 <div>
                   <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Start Date</label>
                   <input
                     type="date"
                     value={startDate}
                     onChange={e => setStartDate(e.target.value)}
                     className="w-full py-2 px-3 bg-white text-[#0F172A] border-[1.5px] border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">End Date</label>
                   <input
                     type="date"
                     value={endDate}
                     onChange={e => setEndDate(e.target.value)}
                     className="w-full py-2 px-3 bg-white text-[#0F172A] border-[1.5px] border-[#CBD5E1] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                   />
                 </div>
               </div>

               <div className="lg:col-span-12 flex items-center mt-4 pt-3 border-t border-[#E2E8F0]">
                 <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#475569] uppercase tracking-wider hover:text-[#0F172A] transition-colors">
                   <input 
                     type="checkbox" 
                     checked={showSold} 
                     onChange={e => setShowSold(e.target.checked)} 
                     className="rounded border-[#CBD5E1] bg-white text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                   />
                   Include Sold Vehicles
                 </label>
               </div>
              </div>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="w-full max-w-full overflow-hidden">
            <DataTable compact data={filteredData} columns={columns} module="vehicles" tableId="utilisation-table" onRowClick={record => setSelectedRecord(record)} />
          </div>
        </>
      ) : activeTab === 'hoursChart' ? (
        <div className="space-y-4">
          <FleetHoursWorkedIdleChart
            vehicles={vehicles}
            rentals={rentals}
            logs={logs}
            showSold={showSold}
          />
        </div>
      ) : (
        <VehicleAssignmentHistoryTable 
          assignments={allDriverAssignments} 
          selectedVehicleReg={selectedVehicles !== 'all' && typeof selectedVehicles === 'string' ? selectedVehicles : undefined}
        />
      )}

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
                 
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                     <p className="text-xs text-gray-500 uppercase font-bold">Current Status</p>
                     <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedRecord.status.toUpperCase()}</p>
                   </div>
                   <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                     <p className="text-xs text-emerald-800 uppercase font-bold flex items-center gap-1">
                       <User className="w-3.5 h-3.5 text-emerald-600" /> Current Driver
                     </p>
                     <p className="text-sm font-bold text-emerald-950 mt-0.5 truncate">{selectedRecord.recentDriver}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                     <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1">
                       <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Previous Driver
                     </p>
                     <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">
                       {selectedRecord.previousDriver !== 'None' ? selectedRecord.previousDriver : 'No previous driver'}
                     </p>
                     {selectedRecord.previousDriverDates && (
                       <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedRecord.previousDriverDates}</p>
                     )}
                   </div>
                 </div>
              </div>
            </div>

            {/* Time Metrics Table Row */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
               <div className="bg-[#F8FAFC] px-5 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                 <Clock className="w-4 h-4 text-blue-600"/>
                 <h4 className="font-bold text-xs uppercase tracking-wider text-[#334155]">Time & Activity Metrics</h4>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                 <div className="p-4 text-center bg-white">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Analysis Period</p>
                    <p className="text-2xl font-black text-slate-900">{selectedRecord.totalDaysInRange} <span className="text-xs text-slate-500 font-medium">Days</span></p>
                 </div>
                 <div className="p-4 text-center bg-[#EEF5FD]">
                    <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Time Rented</p>
                    <p className="text-2xl font-black text-emerald-700">{selectedRecord.rentedDays} <span className="text-xs text-emerald-600/70 font-medium">Days</span></p>
                 </div>
                 <div className="p-4 text-center bg-white">
                    <p className="text-xs font-bold text-rose-800 uppercase mb-1">Off-Road (Maint)</p>
                    <p className="text-2xl font-black text-rose-700">{selectedRecord.maintenanceDays} <span className="text-xs text-rose-600/70 font-medium">Days</span></p>
                 </div>
                 <div className="p-4 text-center bg-[#EEF5FD]">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Available For Hire</p>
                    <p className="text-2xl font-black text-blue-700">{selectedRecord.availableDays} <span className="text-xs text-blue-600/70 font-medium">Days</span></p>
                 </div>
               </div>
            </div>

            {/* Usage Estimates Table Row */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
               <div className="bg-[#F8FAFC] px-5 py-3 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <div className="flex items-center gap-2">
                   <TrendingUp className="w-4 h-4 text-emerald-600"/>
                   <h4 className="font-bold text-xs uppercase tracking-wider text-[#334155]">Calculated Driving Hours & Mileage Estimates</h4>
                 </div>
                 <span className="text-[11px] font-semibold text-slate-500">
                   {selectedRecord.hasUpdatedMileage
                     ? `Derived from ${selectedRecord.estMileageTotal.toLocaleString()} recorded miles (~22 mph commercial speed)`
                     : `Estimated at fleet average ${selectedRecord.defaultDailyMileageRate || defaultDailyMileageRate} miles/day for ${selectedRecord.rentedDays} rented days (0 miles for available days)`}
                 </span>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                 <div className="p-4 text-center bg-white">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Driving Hours</p>
                    <p className="text-2xl font-mono font-black text-slate-900">{selectedRecord.estHoursTotal.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {selectedRecord.hasUpdatedMileage ? 'From actual mileage' : `Average ${selectedRecord.defaultDailyMileageRate || defaultDailyMileageRate} mi/day pace`}
                    </p>
                 </div>
                 <div className="p-4 text-center bg-[#EEF5FD]">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Hours / Week</p>
                    <p className="text-2xl font-mono font-black text-slate-900">{selectedRecord.estHoursPerWeek.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Average driving pace</p>
                 </div>
                 <div className="p-4 text-center bg-white">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Total Mileage</p>
                    <p className="text-2xl font-mono font-black text-blue-700">{selectedRecord.estMileageTotal.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {selectedRecord.hasUpdatedMileage ? 'Odometer difference' : `Average ${selectedRecord.defaultDailyMileageRate || defaultDailyMileageRate} mi/day (rented)`}
                    </p>
                 </div>
                 <div className="p-4 text-center bg-[#EEF5FD]">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Mileage / Week</p>
                    <p className="text-2xl font-mono font-black text-blue-700">{selectedRecord.estMileagePerWeek.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Average weekly miles</p>
                 </div>
               </div>
               <div className="p-3 bg-amber-50/70 border-t border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                 <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                 <span>
                   <strong>Rental Commitment Rule:</strong> When assigned to a driver, this vehicle is rented and unavailable to hire until returned with no driver assigned. Even if the driver rests 1–2 days a week (working 5 to 6 days), the vehicle remains in their possession and not available to the fleet.
                 </span>
               </div>
            </div>

            {/* Historical Driver Assignment Log Sub-Component for this Vehicle */}
            <div className="pt-2">
              <VehicleAssignmentHistoryTable 
                assignments={selectedRecord.driverHistory || []} 
                compact={true} 
                selectedVehicleReg={selectedRecord.registration} 
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
               <button onClick={() => setSelectedRecord(null)} className="px-6 py-2.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer shadow-xs">Close Details</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Utilisation;