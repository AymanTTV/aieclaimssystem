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
          <option value="rental">Rental</option>
          <option value="maintenance_income">Maintenance Income</option>
          <option value="refunded_income">Refunded Income</option>
          <option value="insurance_income">Insurance Income</option>
          <option value="advertising_income">Advertising Income</option>
          <option value="vd_payment_income">VD Payment Income</option>
          <option value="road_tax_refund_income">Road Tax Refund Income</option>
          <option value="commission_income">Commission Income</option>
          <option value="investment_income">Investment Income</option>
          <option value="loan_repayments_income">Loan Repayments Income</option>
          <option value="aie_claims_vd_income">AIE Claims VD Income</option>
          <option value="aie_claims_hire_income">AIE Claims Hire Income</option>
          <option value="aie_claims_pi_income">AIE Claims PI Income</option>
          <option value="aie_claims_domestic_income">AIE Claims Domestic Income</option>
          <option value="aie_claims_ph_income">AIE Claims PH Income</option>
          <option value="skyline_cabs_commission_income">Skyline Cabs Commission Income</option>
          <option value="vehicle_insurance">Vehicle Insurance</option>
          <option value="road_tax">Road Tax</option>
          <option value="vat_referral">VAT Referral</option>
          <option value="mot">MOT</option>
          <option value="fuel">Fuel</option>
          <option value="vehicle_finance">Vehicle Finance (Loan or Lease Payments)</option>
          <option value="maintenance">Maintenance</option>
          <option value="registration_fee">Registration Fee</option>
          <option value="nsl">NSL</option>
          <option value="repair">Repair</option>
          <option value="parts">Parts</option>
          <option value="cleaning">Cleaning</option>
          <option value="breakdown_cover">Breakdown Cover</option>
          <option value="tyres_wheel_alignment">Tyres & Wheel Alignment</option>
          <option value="toll_charges_congestion_fees">Toll Charges & Congestion Fees</option>
          <option value="parking_fees">Parking Fees (PCN)</option>
          <option value="fleet_management_software">Fleet Management Software</option>
          <option value="telematics_tracking_system">Telematics & Tracking System</option>
          <option value="vehicle_depreciation">Vehicle Depreciation</option>
          <option value="replacement_vehicle_costs">Replacement Vehicle Costs</option>
          <option value="taxi_meter">Taxi Meter</option>
          <option value="cctv_installation_monitoring">CCTV Installation & Monitoring</option>
          <option value="office_rent">Office Rent</option>
          <option value="phone_internet_bill">Phone & Internet Bill</option>
          <option value="office_stationery_supplies">Office Stationery & Supplies</option>
          <option value="staff_salaries_wages">Staff Salaries & Wages</option>
          <option value="staff_travel_expenses">Staff Travel Expenses</option>
          <option value="it_software_expenses">IT & Software Expenses</option>
          <option value="bank_fees_transaction_charges">Bank Fees & Transaction Charges</option>
          <option value="loan_repayments_interest">Loan Repayments & Interest</option>
          <option value="advertising_marketing">Advertising & Marketing</option>
          <option value="legal_compliance_fees">Legal & Compliance Fees</option>
          <option value="training_certification_staff">Training & Certification for Staff</option>
          <option value="call_centre_customer_support_costs">Call Centre & Customer Support Costs</option>
          <option value="other">Other</option>
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
