// src/utils/financeCategories.ts

export const FINANCE_CATEGORIES = {
  income: {
    'Vehicle Rental & Claims Income': [
      'Rental',
      'Aie Claim Vdhspi',
      'Skyline Cabs Commission Income',
      'Skyline Cabs Office Rental Income',
    ],
    'Vehicle Leasing Payments & Refunds': ['Vehicle Sold'],
    'Deposits & Refunds': [
      'Office Rent Deposit Refund',
      'New Vehicle Deposit',
      'New Vehicle Purchase',
    ],
    'Insurance & Financial Income': [
      'Vehicle Insurance',
      'Insurance Cost (Income From Insurance-Related Charges)',
      'Vat Refund',
      'Loan Repayment',
      'Vehicle Balloon Repayment',
      'Investment Income',
      'Share Income',
    ],
    'Vehicle Repair & Maintenance Income': {
      'Vehicle Repair Income': [
        'Tyre Replacement & Repairs',
        'Wheel Alignment & Balancing',
        'Battery Replacement',
        'Accident Repair',
        'Repair',
        'Mot',
        'Nsl',
        'Taxi Meter',
        'Cctv',
        'Taxi Credit Card Strip Fee',
        'Road Tax',
        'Year Service',
        'Mileage Service',
        'Emergency Repair',
        'Service',
        'Maintenance',
        'Parts Purchase',
        'Parts Refund',
        'Fuel',
        'Vehicle Cleaning & Valeting Services',
        'Windscreen & Glass Replacement Income',
      ],
    },
    'It & Software Income': ['It & Website Software Subscription Refund'],
    'Somcab Income & Refund': ['Somcab'],
    'Office Stationery & Related Income': [
      'Office Stationery Refund',
      'Office Equipment Refund',
      'Miscellaneous Income',
    ],
  },
  expense: {
    'Vehicle Insurance, Maintenance & Repair Expenses': {
      'Vehicle Insurance Expenses': [
        'Vehicle Insurance',
        'Vehicle Insurance Excess',
      ],
      'Vehicle Rental & Claims Income': [
      'Rental',
    ],
      'Routine Maintenance Costs': [
        'Tyre Replacement & Repairs',
        'Wheel Alignment & Balancing',
        'Battery Replacement',
        'Accident Repair',
        'Repair',
        'Mot Test Fee',
        'Nsl',
        'Taxi Meter',
        'Cctv Purchase',
        'Taxi Credit Card Strip Fee',
        'Road Tax',
        'Year Mileage Service',
        'Mileage Service',
        'Emergency Repair',
        'Service',
        'Maintenance',
        'Parts Purchase',
        'Fuel',
      ],
      'Breakdown & Roadside Assistance': [
        'Towing Charges',
        'Breakdown Recovery',
        'Emergency Roadside Repairs',
        'Bodywork',
        'Insurance Repair Excess Fees',
        'Third-Party Repair Payments',
      ],
      'Additional Maintenance Costs': [
        'Vehicle Cleaning & Valeting Services',
        'Windscreen & Glass Replacement',
        'Air Conditioning Servicing',
      ],
    },
    'Client-Related Expenses': [
      'Client Vd Payment',
      'Client Tl Payment',
      'Client Referral Fee',
      'Client Goodwill Payment',
    ],
    'Vehicle Leasing, Purchase & Repayments': [
      'Vehicle Leasing Payment',
      'New Vehicle Purchase',
      'New Vehicle Deposit',
      'Vehicle Balloon Repayment',
      'Loan Payment',
      'Investment',
      'Share Payment',
      'Office Insurance',
    ],
    'Tax & Vat Expenses': [
      'Vat Payment',
      'Vat Unpaid',
      'Tax Return Payment',
      'Corporate Tax Payment',
      'Income Tax Payment',
      'Tax Late Fee Payment',
      'Vat Late Fee Payment',
    ],
    'It, Software & Technology Expenses': [
      'It Service',
      'Software Subscription',
      'Domain Subscription Fee',
      'It & Website Developer',
    ],
    'Office & Administrative Expenses': [
      'Accountant Fees',
      'Telephone Bill',
      'Electricity Bill',
      'Office Rent',
      'Office Rent Deposit',
      'Business Rates Charges',
      'Vehicle Storage Charges',
      'Office Stationery Purchase',
      'Office Furniture Purchase',
    ],
    'Staff & Business Travel Expenses': [
      'Staff Travel Charges',
      'Business Trip Cost',
      'Salary & Wages Expense',
      'Aie Claims Expenses',
      'Aie Skyline Expenses',
    ],
    'Advertising, Marketing & Commission': [
      'Advertising Expense',
      'Commission Expense',
    ],
    'Penalty, Government Charges & Miscellaneous Fees': [
      'Pcn Parking Charges',
      'Pcn Appeal Fees',
      'Parking Charges',
      'Congestion Charge Payment',
      'Ulez (Ultra Low Emission Zone) Payment',
      'Tfl Penalty Payment',
    ],
    'Financial Splits & Miscellaneous': ['Vdhspi Split Jay', 'Vdhspi Split Aie'],
    'Sharing Bill Split Expenses': ['Aie Skyline – Aie Claims Share Expenses'],
    'Somcab Expenses': ['Somcab'],
  },
};

// Helper function to get all income categories as a flat array
export const getAllIncomeCategories = (): string[] => {
  const categories: string[] = [];
  Object.values(FINANCE_CATEGORIES.income).forEach((category) => {
    if (Array.isArray(category)) {
      categories.push(...category);
    } else if (typeof category === 'object') {
      Object.values(category).forEach((subcategory) => {
        if (Array.isArray(subcategory)) {
          categories.push(...subcategory);
        }
      });
    }
  });
  return categories;
};

// Helper function to get all expense categories as a flat array
export const getAllExpenseCategories = (): string[] => {
  const categories: string[] = [];
  Object.entries(FINANCE_CATEGORIES.expense).forEach(([_, category]) => {
    if (Array.isArray(category)) {
      categories.push(...category);
    } else if (typeof category === 'object') {
      Object.values(category).forEach((subcategory) => {
        if (Array.isArray(subcategory)) {
          categories.push(...subcategory);
        }
      });
    }
  });
  return categories;
};

// Helper function to get category group
export const getCategoryGroup = (category: string): string | null => {
  // Check income categories
  for (const [group, categories] of Object.entries(
    FINANCE_CATEGORIES.income
  )) {
    if (Array.isArray(categories) && categories.includes(category)) {
      return group;
    } else if (typeof categories === 'object') {
      for (const [subgroup, subcategories] of Object.entries(categories)) {
        if (Array.isArray(subcategories) && subcategories.includes(category)) {
          return `${group} - ${subgroup}`;
        }
      }
    }
  }

  // Check expense categories
  for (const [group, categories] of Object.entries(
    FINANCE_CATEGORIES.expense
  )) {
    if (Array.isArray(categories) && categories.includes(category)) {
      return group;
    } else if (typeof categories === 'object') {
      for (const [subgroup, subcategories] of Object.entries(categories)) {
        if (Array.isArray(subcategories) && subcategories.includes(category)) {
          return `${group} - ${subgroup}`;
        }
      }
    }
  }

  return null;
};