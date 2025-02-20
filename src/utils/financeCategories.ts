export const FINANCE_CATEGORIES = {
  income: [
    'AIE CLAIMS',
    'Rent',
    'Vehicle Finance',
    'Insurance Claims',
    'Other Income'
  ],
  expense: {
    'Vehicle-Related Costs': [
      'Vehicle Finance',
      'Insurance',
      'Maintenance',
      'Fuel',
      'Registration Fee',
      'MOT',
      'Road Tax',
      'NSL Test',
      'Repair',
      'Parts',
      'Cleaning',
      'Breakdown Cover',
      'Tyres & Wheel Alignment',
      'Toll Charges & Congestion Fees',
      'Parking Fees',
      'Fleet Management Software',
      'Telematics & Tracking System',
      'Vehicle Depreciation',
      'Replacement Vehicle Costs'
    ],
    'Business & Operational Costs': [
      'Meter Installation & Maintenance',
      'CCTV Installation & Monitoring',
      'Office Rent & Utilities',
      'Office Stationery & Supplies',
      'Staff Salaries & Wages',
      'Staff Travel Expenses',
      'IT & Software Expenses',
      'Bank Fees & Transaction Charges',
      'Loan Repayments & Interest',
      'Advertising & Marketing',
      'Legal & Compliance Fees',
      'Training & Certification',
      'Call Centre & Customer Support'
    ]
  }
};

// Helper function to get all expense categories as a flat array
export const getAllExpenseCategories = (): string[] => {
  return Object.values(FINANCE_CATEGORIES.expense).flat();
};

// Helper function to get category group
export const getCategoryGroup = (category: string): string | null => {
  for (const [group, categories] of Object.entries(FINANCE_CATEGORIES.expense)) {
    if (categories.includes(category)) {
      return group;
    }
  }
  return null;
};
