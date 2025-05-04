// src/components/finance/InvoiceFilters.tsx

import React from 'react';
import { Search } from 'lucide-react';

interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
}

const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by customer name, invoice number, or category..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Categories</option>
<option value="Rental">Rental</option>
<option value="Maintenance Income">Maintenance Income</option>
<option value="Refunded Income">Refunded Income</option>
<option value="Insurance Income">Insurance Income</option>
<option value="Advertising Income">Advertising Income</option>
<option value="VD Payment Income">VD Payment Income</option>
<option value="Road Tax Refund Income">Road Tax Refund Income</option>
<option value="Commission Income">Commission Income</option>
<option value="Investment Income">Investment Income</option>
<option value="Loan Repayments Income">Loan Repayments Income</option>
<option value="AIE Claims VD Income">AIE Claims VD Income</option>
<option value="AIE Claims Hire Income">AIE Claims Hire Income</option>
<option value="AIE Claims PI Income">AIE Claims PI Income</option>
<option value="AIE Claims Domestic Income">AIE Claims Domestic Income</option>
<option value="AIE Claims PH Income">AIE Claims PH Income</option>
<option value="Skyline Cabs Commission Income">Skyline Cabs Commission Income</option>
<option value="Vehicle Insurance">Vehicle Insurance</option>
<option value="Road Tax">Road Tax</option>
<option value="VAT Referral">VAT Referral</option>
<option value="MOT">MOT</option>
<option value="Fuel">Fuel</option>
<option value="Vehicle Finance">Vehicle Finance (Loan or Lease Payments)</option>
<option value="Maintenance">Maintenance</option>
<option value="Registration Fee">Registration Fee</option>
<option value="NSL">NSL</option>
<option value="Repair">Repair</option>
<option value="Parts">Parts</option>
<option value="Cleaning">Cleaning</option>
<option value="Breakdown Cover">Breakdown Cover</option>
<option value="Tyres & Wheel Alignment">Tyres & Wheel Alignment</option>
<option value="Toll Charges & Congestion Fees">Toll Charges & Congestion Fees</option>
<option value="Parking Fees">Parking Fees (PCN)</option>
<option value="Fleet Management Software">Fleet Management Software</option>
<option value="Telematics & Tracking System">Telematics & Tracking System</option>
<option value="Vehicle Depreciation">Vehicle Depreciation</option>
<option value="Replacement Vehicle Costs">Replacement Vehicle Costs</option>
<option value="Taxi Meter">Taxi Meter</option>
<option value="CCTV Installation & Monitoring">CCTV Installation & Monitoring</option>
<option value="Office Rent">Office Rent</option>
<option value="Phone & Internet Bill">Phone & Internet Bill</option>
<option value="Office Stationery & Supplies">Office Stationery & Supplies</option>
<option value="Staff Salaries & Wages">Staff Salaries & Wages</option>
<option value="Staff Travel Expenses">Staff Travel Expenses</option>
<option value="IT & Software Expenses">IT & Software Expenses</option>
<option value="Bank Fees & Transaction Charges">Bank Fees & Transaction Charges</option>
<option value="Loan Repayments & Interest">Loan Repayments & Interest</option>
<option value="Advertising & Marketing">Advertising & Marketing</option>
<option value="Legal & Compliance Fees">Legal & Compliance Fees</option>
<option value="Training & Certification for Staff">Training & Certification for Staff</option>
<option value="Call Centre & Customer Support Costs">Call Centre & Customer Support Costs</option>
<option value="Other">Other</option>
<option value="AIE Claim VDH SPI">AIE Claim VDH SPI</option>
<option value="Skyline Cabs Office Rental Income">Skyline Cabs Office Rental Income</option>
<option value="Vehicle Sold">Vehicle Sold</option>
<option value="Office Rent Deposit Refund">Office Rent Deposit Refund</option>
<option value="New Vehicle Deposit">New Vehicle Deposit</option>
<option value="New Vehicle Purchase">New Vehicle Purchase</option>
<option value="Insurance Cost Income From Insurance-Related Charges">Insurance Cost (Income From Insurance-Related Charges)</option>
<option value="VAT Refund">VAT Refund</option>
<option value="Loan Repayment">Loan Repayment</option>
<option value="Vehicle Balloon Repayment">Vehicle Balloon Repayment</option>
<option value="Share Income">Share Income</option>
<option value="Tyre Replacement & Repairs">Tyre Replacement & Repairs</option>
<option value="Wheel Alignment & Balancing">Wheel Alignment & Balancing</option>
<option value="Battery Replacement">Battery Replacement</option>
<option value="Accident Repair">Accident Repair</option>
<option value="MOT Test Fee">MOT Test Fee</option>
<option value="Taxi Credit Card Strip Fee">Taxi Credit Card Strip Fee</option>
<option value="Year Service">Year Service</option>
<option value="Mileage Service">Mileage Service</option>
<option value="Emergency Repair">Emergency Repair</option>
<option value="Vehicle Cleaning & Valeting Services">Vehicle Cleaning & Valeting Services</option>
<option value="Windscreen & Glass Replacement Income">Windscreen & Glass Replacement Income</option>
<option value="IT & Website Software Subscription Refund">IT & Website Software Subscription Refund</option>
<option value="Somcab">Somcab</option>
<option value="Office Stationery Refund">Office Stationery Refund</option>
<option value="Office Equipment Refund">Office Equipment Refund</option>
<option value="Miscellaneous Income">Miscellaneous Income</option>
<option value="Vehicle Insurance Excess">Vehicle Insurance Excess</option>
<option value="Towing Charges">Towing Charges</option>
<option value="Breakdown Recovery">Breakdown Recovery</option>
<option value="Emergency Roadside Repairs">Emergency Roadside Repairs</option>
<option value="Bodywork">Bodywork</option>
<option value="Insurance Repair Excess Fees">Insurance Repair Excess Fees</option>
<option value="Third-Party Repair Payments">Third-Party Repair Payments</option>
<option value="Air Conditioning Servicing">Air Conditioning Servicing</option>
<option value="Client VD Payment">Client VD Payment</option>
<option value="Client TL Payment">Client TL Payment</option>
<option value="Client Referral Fee">Client Referral Fee</option>
<option value="Client Goodwill Payment">Client Goodwill Payment</option>
<option value="Vehicle Leasing Payment">Vehicle Leasing Payment</option>
<option value="Loan Payment">Loan Payment</option>
<option value="Investment">Investment</option>
<option value="Share Payment">Share Payment</option>
<option value="Office Insurance">Office Insurance</option>
<option value="VAT Payment">VAT Payment</option>
<option value="VAT Unpaid">VAT Unpaid</option>
<option value="Tax Return Payment">Tax Return Payment</option>
<option value="Corporate Tax Payment">Corporate Tax Payment</option>
<option value="Income Tax Payment">Income Tax Payment</option>
<option value="Tax Late Fee Payment">Tax Late Fee Payment</option>
<option value="VAT Late Fee Payment">VAT Late Fee Payment</option>
<option value="IT Service">IT Service</option>
<option value="Software Subscription">Software Subscription</option>
<option value="Domain Subscription Fee">Domain Subscription Fee</option>
<option value="IT & Website Developer">IT & Website Developer</option>
<option value="Accountant Fees">Accountant Fees</option>
<option value="Telephone Bill">Telephone Bill</option>
<option value="Other">Other</option>

        </select>

        {/* Date Range Filters */}
        <input
          type="date"
          value={dateRange.start?.toISOString().split('T')[0] || ''}
          onChange={(e) =>
            onDateRangeChange({
              ...dateRange,
              start: e.target.value ? new Date(e.target.value) : null,
            })
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Start Date"
        />

        <input
          type="date"
          value={dateRange.end?.toISOString().split('T')[0] || ''}
          onChange={(e) =>
            onDateRangeChange({
              ...dateRange,
              end: e.target.value ? new Date(e.target.value) : null,
            })
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="End Date"
          min={dateRange.start?.toISOString().split('T')[0]}
        />
      </div>
    </div>
  );
};

export default InvoiceFilters;
