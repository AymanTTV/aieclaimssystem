// src/hooks/useDriverPayFilters.ts

import { useState, useMemo } from 'react';
import { DriverPay } from '../types/driverPay';
// Import necessary date-fns functions
import { isWithinInterval, startOfDay, endOfDay, isValid } from 'date-fns'; // Added isValid


export const useDriverPayFilters = (records: DriverPay[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  // Existing state for filtering *payment periods* by exact date match
  const [periodDateRange, setPeriodDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  // New state for filtering *records* based on payment period *overlap*
  const [periodOverlapDateRange, setPeriodOverlapDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });


  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        record.driverNo?.toLowerCase().includes(searchLower) ||
        record.tidNo?.toString().includes(searchLower) ||
        record.name?.toLowerCase().includes(searchLower) ||
        record.phoneNumber?.includes(searchLower);

      // Collection filter
      const matchesCollection = collectionFilter === 'all' || record.collection === collectionFilter;


      // New: Period Overlap Filter
      let matchesPeriodOverlapDateRange = true;
      if (periodOverlapDateRange.start || periodOverlapDateRange.end) {
          // If either start or end of the overlap filter is set,
          // the record must have at least one period that overlaps with the filter range.
          matchesPeriodOverlapDateRange = record.paymentPeriods.some(period => {
              try {
                  const periodStartDate = period.startDate instanceof Date ? period.startDate : period.startDate.toDate();
                  const periodEndDate = period.endDate instanceof Date ? period.endDate : period.endDate.toDate();

                   // Ensure both dates are valid before checking overlap
                  if (!isValid(periodStartDate) || !isValid(periodEndDate)) {
                       console.warn('Invalid period date found for overlap check:', period.startDate, period.endDate);
                       return false; // This period is invalid, doesn't match
                  }


                  // Check for overlap: The periods overlap if the period starts before the filter ends
                  // AND the period ends after the filter starts.
                  // We'll use startOfDay and endOfDay for the filter range to make it inclusive.
                  const filterStart = periodOverlapDateRange.start ? startOfDay(periodOverlapDateRange.start) : null;
                  const filterEnd = periodOverlapDateRange.end ? endOfDay(periodOverlapDateRange.end) : null;

                  if (filterStart && filterEnd) {
                       // Filter has both start and end dates
                       return periodStartDate <= filterEnd && periodEndDate >= filterStart;
                  } else if (filterStart) {
                       // Filter has only a start date
                       // Period must start on or after the filter start date OR end on or after the filter start date
                       return periodEndDate >= filterStart; // A period overlaps if it ends on or after the filter start
                  } else if (filterEnd) {
                       // Filter has only an end date
                       // Period must start on or before the filter end date OR end on or before the filter end date
                       return periodStartDate <= filterEnd; // A period overlaps if it starts on or before the filter end
                  }

                  return false; // Should not reach here if either start or end is set
              } catch (error) {
                  console.error('Error processing period date for overlap check:', period.startDate, period.endDate, error);
                  return false; // Exclude this period if date processing fails
              }
          });
      }
       // If periodOverlapDateRange.start and end are both null, matchesPeriodOverlapDateRange remains true.


      // Existing: Filter *payment periods* based on status and *exact* period date match
      // Records must match overall filters AND have at least one payment period matching the *exact* period filters.
      // We chain the filters here.
      if (!matchesSearch || !matchesCollection || !matchesPeriodOverlapDateRange) {
          return false; // Exclude record early if overall filters don't match
      }


      // Now, filter the payment periods *within* the matching records
      // This ensures that when we map the records later, they only contain the periods
      // that specifically matched the 'Exact Period Date' filter and status filter.
      const filteredPeriods = record.paymentPeriods.filter(period => {
        const matchesStatus = statusFilter === 'all' || period.status === statusFilter;

        // Existing: Period Date Range Filter (exact match)
        let matchesPeriodDateRange = true; // Assume true if no exact period filter is set
        if (periodDateRange.start || periodDateRange.end) { // Apply this filter only if dates are set
             try {
                  const periodStartDate = period.startDate instanceof Date ?
                    period.startDate :
                    period.startDate.toDate();

                  const periodEndDate = period.endDate instanceof Date ?
                    period.endDate :
                    period.endDate.toDate();

                  // Ensure both dates are valid before checking exact match
                  if (!isValid(periodStartDate) || !isValid(periodEndDate)) {
                      console.warn('Invalid period date found for exact match check:', period.startDate, period.endDate);
                      matchesPeriodDateRange = false; // This period is invalid, doesn't match
                  } else {
                      const pStart = startOfDay(periodStartDate);
                      const pEnd = startOfDay(periodEndDate); // Still using startOfDay for exact period date match logic
                      const filterStart = periodDateRange.start ? startOfDay(periodDateRange.start) : null;
                      const filterEnd = periodDateRange.end ? startOfDay(periodDateRange.end) : null; // Use startOfDay for end filter date too for exact match comparison


                       // Check for exact match based on start of day
                       const matchesExactStart = filterStart ? pStart.getTime() === filterStart.getTime() : true;
                       const matchesExactEnd = filterEnd ? pEnd.getTime() === filterEnd.getTime() : true;

                       matchesPeriodDateRange = matchesExactStart && matchesExactEnd;

                       // Refined logic: If *only* exact start is set, period start must match.
                       // If *only* exact end is set, period end must match.
                       // If *both* are set, both must match.
                       if (periodDateRange.start && !periodDateRange.end) {
                            matchesPeriodDateRange = pStart.getTime() === startOfDay(periodDateRange.start).getTime();
                       } else if (!periodDateRange.start && periodDateRange.end) {
                             matchesPeriodDateRange = pEnd.getTime() === startOfDay(periodDateRange.end).getTime();
                       } else if (periodDateRange.start && periodDateRange.end) {
                             matchesPeriodDateRange = pStart.getTime() === startOfDay(periodDateRange.start).getTime() &&
                                                      pEnd.getTime() === startOfDay(periodDateRange.end).getTime();
                       } else {
                           matchesPeriodDateRange = true; // No exact date filter applied
                       }
                  }
            } catch (error) {
               console.error('Error processing period date for exact match check:', period.startDate, period.endDate, error);
               matchesPeriodDateRange = false; // Exclude if date is invalid
            }
        }


        return matchesStatus && matchesPeriodDateRange;
      });

      // Only include records that matched overall filters AND have at least one payment period matching the *exact* period filters
      return filteredPeriods.length > 0;

    }).map(record => ({
        // Return a new record object, containing only the payment periods that matched
        // the 'Exact Period Date' filter and status filter.
        ...record,
        paymentPeriods: record.paymentPeriods.filter(period => {
            const matchesStatus = statusFilter === 'all' || period.status === statusFilter;

            let matchesPeriodDateRange = true; // Assume true if no exact period filter is set
            if (periodDateRange.start || periodDateRange.end) { // Apply this filter only if dates are set
                try {
                     const periodStartDate = period.startDate instanceof Date ? period.startDate : period.startDate.toDate();
                     const periodEndDate = period.endDate instanceof Date ? period.endDate : period.endDate.toDate();

                     if (!isValid(periodStartDate) || !isValid(periodEndDate)) {
                         return false; // This period is invalid, doesn't match exact filter
                     }

                     const pStart = startOfDay(periodStartDate);
                     const pEnd = startOfDay(periodEndDate);
                     const filterStart = periodDateRange.start ? startOfDay(periodDateRange.start) : null;
                     const filterEnd = periodDateRange.end ? startOfDay(periodDateRange.end) : null;

                      // Check for exact match based on start of day
                      if (periodDateRange.start && !periodDateRange.end) {
                           matchesPeriodDateRange = pStart.getTime() === startOfDay(periodDateRange.start).getTime();
                      } else if (!periodDateRange.start && periodDateRange.end) {
                            matchesPeriodDateRange = pEnd.getTime() === startOfDay(periodDateRange.end).getTime();
                      } else if (periodDateRange.start && periodDateRange.end) {
                            matchesPeriodDateRange = pStart.getTime() === startOfDay(periodDateRange.start).getTime() &&
                                                     pEnd.getTime() === startOfDay(periodDateRange.end).getTime();
                      } else {
                          matchesPeriodDateRange = true; // No exact date filter applied
                      }
               } catch (error) {
                  console.error('Error processing period date for mapping filter:', period.startDate, period.endDate, error);
                  matchesPeriodDateRange = false; // Exclude if date is invalid
               }
            }


            return matchesStatus && matchesPeriodDateRange;
        })
    }));
  }, [records, searchQuery, statusFilter, collectionFilter, periodDateRange, periodOverlapDateRange]); // Add periodOverlapDateRange to dependencies


  const summary = useMemo(() => {
    // Summary calculation remains based on the *filtered* payment periods within the filtered records
    const totalPaid = filteredRecords.reduce((sum, record) => {
      return sum + record.paymentPeriods.reduce((periodSum, period) => periodSum + (period.paidAmount || 0), 0);
    }, 0);

    const totalRemaining = filteredRecords.reduce((sum, record) => {
      return sum + record.paymentPeriods.reduce((periodSum, period) => periodSum + (period.remainingAmount || 0), 0);
    }, 0);

    return filteredRecords.reduce(
      (acc, record) => {
        record.paymentPeriods.forEach(period => {
          const totalAmount = Number(period.totalAmount) || 0;
          const commissionAmount = Number(period.commissionAmount) || 0;
          const netPay = totalAmount - commissionAmount;

          acc.total += totalAmount;
          acc.commission += commissionAmount;
          acc.netPay += netPay;
        });
        return acc;
      },
      {
        total: 0,
        commission: 0,
        netPay: 0,
        totalPaid,
        totalRemaining
      }
    );
  }, [filteredRecords]); // summary depends on filteredRecords


  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    collectionFilter,
    setCollectionFilter,
    periodDateRange,
    setPeriodDateRange,
    periodOverlapDateRange, // Updated name
    setPeriodOverlapDateRange, // Updated name
    filteredRecords,
    summary,
  };
};