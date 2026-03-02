// src/components/rentals/AvailableVehiclesModal.tsx
import React, { useState, useMemo } from 'react';
import { Vehicle, Rental } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { formatDate } from '../../utils/dateHelpers';
import { 
  startOfDay, 
  endOfDay, 
  areIntervalsOverlapping, 
  isBefore, 
  isAfter 
} from 'date-fns';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Info, 
  Filter, 
  Car, 
  Search, 
  X,
  ArrowRight
} from 'lucide-react';

interface AvailableVehiclesModalProps {
  vehicles: Vehicle[];
  rentals: Rental[];
  onClose: () => void;
}

type FilterType = 'available' | 'returning_soon' | 'substitution' | 'all';

const AvailableVehiclesModal: React.FC<AvailableVehiclesModalProps> = ({
  vehicles,
  rentals = [],
  onClose
}) => {
  // Default to today for both start and end
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState<string>(todayStr);
  const [dateTo, setDateTo] = useState<string>(todayStr);
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('available');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate Status for ALL vehicles based on the Date Range
  const processedVehicles = useMemo(() => {
    // Safety check for invalid dates
    const start = dateFrom ? new Date(dateFrom) : new Date();
    const end = dateTo ? new Date(dateTo) : new Date();
    const now = new Date(); // Current moment for overdue checks
    
    const targetRange = {
        start: startOfDay(start),
        end: endOfDay(end)
    };

    return vehicles
      .filter(v => v.status !== 'sold' && v.status !== 'unavailable') 
      .map(vehicle => {
        let status = 'available';
        let note = '';
        let sortOrder = 1;

        // A. CHECK HIRE SUBSTITUTIONS (Overlap Check)
        const activeSubRental = rentals.find(r => 
          r.status === 'active' && 
          r.hireSubstitutionDetails?.some(sub => {
            if ((sub.registration || '').toLowerCase() !== (vehicle.registrationNumber || '').toLowerCase()) return false;
            if (!sub.givenAt || !sub.expectedReturnAt) return false;

            const subStart = new Date(sub.givenAt);
            let subEnd = new Date(sub.expectedReturnAt);
            
            // If sub is active/ongoing but end date passed, extend it to NOW
            if (isBefore(subEnd, now)) {
                subEnd = now; 
            }

            const subRange = {
                start: startOfDay(subStart),
                end: endOfDay(subEnd)
            };

            return areIntervalsOverlapping(targetRange, subRange);
          })
        );

        if (activeSubRental) {
          const subDetail = activeSubRental.hireSubstitutionDetails!.find(sub => 
            (sub.registration || '').toLowerCase() === (vehicle.registrationNumber || '').toLowerCase()
          );
          
          if (subDetail) {
            status = 'substitution';
            sortOrder = 3;
            note = `On Sub: ${formatDate(subDetail.givenAt, true)} → ${formatDate(subDetail.expectedReturnAt, true)}`;
          }
        }

        // B. CHECK RENTALS (Active OR Scheduled)
        if (status !== 'substitution') {
          const currentRental = rentals.find(r => {
             if (r.vehicleId !== vehicle.id) return false;
             // Check both Active and Scheduled to prevent double-booking
             if (r.status !== 'active' && r.status !== 'scheduled') return false; 

             const rStart = startOfDay(new Date(r.startDate));
             // We use expectedReturnDate if available for calculation, otherwise endDate
             let rEndRaw = r.expectedReturnDate || r.endDate;
             let rEndObj = new Date(rEndRaw);

             // If Rental is ACTIVE but Overdue (End Date is in past), 
             // it must block "Today" (extend end date to Now).
             if (r.status === 'active' && isBefore(rEndObj, startOfDay(now))) {
                 rEndObj = now;
             }

             const rEnd = endOfDay(rEndObj);

             return areIntervalsOverlapping(targetRange, { start: rStart, end: rEnd });
          });

          if (currentRental) {
            // It overlaps with our requested dates.
            
            // ✅ UPDATED STRICT LOGIC: 
            // 1. Must have an explicit `expectedReturnDate` set.
            // 2. That return date must fall ON or BEFORE the end of the requested view range.
            if (currentRental.expectedReturnDate && !isAfter(endOfDay(new Date(currentRental.expectedReturnDate)), targetRange.end)) {
                status = 'returning_soon';
                sortOrder = 2;
                note = `Exp. Return: ${formatDate(currentRental.expectedReturnDate, true)}`;
            } 
            else {
                // If no expected date set, OR it's set for a date later than our window -> Hide it.
                status = 'hired';
                sortOrder = 4;
                note = `Booked until ${formatDate(currentRental.expectedReturnDate || currentRental.endDate, true)}`;
            }
          } else if (vehicle.status === 'maintenance') {
             status = 'maintenance';
             sortOrder = 5;
             note = 'In Maintenance';
          }
        }

        return { vehicle, status, note, sortOrder };
      })
      // Filter out 'hired' vehicles (those strictly booked without a relevant return expectation)
      .filter(item => item.status !== 'hired') 
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [vehicles, rentals, dateFrom, dateTo]);

  // 2. Apply Filters
  const filteredData = useMemo(() => {
    let data = processedVehicles;

    if (activeFilter !== 'all') {
      if (activeFilter === 'available') {
         data = data.filter(item => item.status === 'available');
      } else if (activeFilter === 'returning_soon') {
         data = data.filter(item => item.status === 'returning_soon');
      } else if (activeFilter === 'substitution') {
         data = data.filter(item => item.status === 'substitution');
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(({ vehicle }) => 
        (vehicle.registrationNumber || '').toLowerCase().includes(q) ||
        (vehicle.make || '').toLowerCase().includes(q) ||
        (vehicle.model || '').toLowerCase().includes(q)
      );
    }

    return data;
  }, [processedVehicles, activeFilter, searchQuery]);

  const FilterButton = ({ type, label, icon: Icon, count }: { type: FilterType, label: string, icon: any, count: number }) => (
    <button
      onClick={() => setActiveFilter(type)}
      className={`
        flex items-center px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors border whitespace-nowrap
        ${activeFilter === type 
          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
      `}
    >
      <Icon className={`w-3 h-3 sm:w-4 sm:h-4 mr-1.5 ${activeFilter === type ? 'text-blue-600' : 'text-gray-400'}`} />
      {label}
      <span className={`ml-2 py-0.5 px-1.5 rounded-full text-[10px] ${activeFilter === type ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col h-[75vh]">
      {/* Header */}
      <div className="bg-gray-50 p-4 rounded-t-lg border-b border-gray-200 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Date Range Picker */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-1">
              <Calendar className="w-3 h-3" /> Check Availability Range
            </h3>
            <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="block w-full lg:w-36 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium"
                />
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="block w-full lg:w-36 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium"
                />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Vehicles free from {dateFrom} to {dateTo}
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex-1 w-full lg:max-w-md">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-1">
              <Search className="w-3 h-3" /> Search Vehicle
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Registration, Make, or Model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <FilterButton 
            type="available" 
            label="Available" 
            icon={CheckCircle} 
            count={processedVehicles.filter(v => v.status === 'available').length} 
          />
          <FilterButton 
            type="returning_soon" 
            label="Returns Soon" 
            icon={Clock} 
            count={processedVehicles.filter(v => v.status === 'returning_soon').length} 
          />
          <FilterButton 
            type="substitution" 
            label="Substitution" 
            icon={AlertTriangle} 
            count={processedVehicles.filter(v => v.status === 'substitution').length} 
          />
          <FilterButton 
            type="all" 
            label="Show All" 
            icon={Filter} 
            count={processedVehicles.length} 
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-white min-h-0">
        <table className="min-w-full divide-y divide-gray-200 relative">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%]">
                Vehicle
              </th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%]">
                Reg
              </th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%]">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[40%]">
                Note
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map(({ vehicle, status, note }) => (
              <tr key={vehicle.id} className={`hover:bg-gray-50 ${status === 'substitution' ? 'bg-yellow-50/50' : ''}`}>
                
                <td className="px-3 py-3 align-top">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 p-1.5 bg-gray-100 rounded hidden sm:block flex-shrink-0">
                      <Car className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 break-words leading-tight">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{vehicle.year}</div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3 align-top">
                  <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[11px] font-mono font-medium text-gray-700 whitespace-nowrap">
                    {vehicle.registrationNumber}
                  </span>
                </td>

                <td className="px-3 py-3 align-top">
                  {status === 'available' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                      Available
                    </span>
                  )}
                  {status === 'returning_soon' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                      Returns Soon
                    </span>
                  )}
                  {status === 'substitution' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
                      On Sub
                    </span>
                  )}
                  {status === 'hired' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                      Hired
                    </span>
                  )}
                  {status === 'maintenance' && (
                    <StatusBadge status="maintenance" />
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  {status === 'substitution' ? (
                    <div className="flex items-start gap-1.5 text-xs text-yellow-800 font-medium bg-yellow-100/50 p-1.5 rounded border border-yellow-200 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-600" />
                      <span>{note}</span>
                    </div>
                  ) : status === 'returning_soon' ? (
                     <div className="flex items-start gap-1.5 text-xs text-blue-700 font-medium leading-snug">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{note}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 leading-snug">{note || '—'}</span>
                  )}
                </td>
              </tr>
            ))}
            
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-gray-600 font-medium text-sm">No vehicles found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AvailableVehiclesModal;