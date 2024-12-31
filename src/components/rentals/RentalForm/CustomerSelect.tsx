import React, { useState, useMemo } from 'react';
import { Customer } from '../../../types';
import { Search } from 'lucide-react';

interface CustomerSelectProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelect: (customerId: string) => void;
  disabled?: boolean;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  customers,
  selectedCustomerId,
  onSelect,
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(customer => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.mobile.includes(searchQuery) ||
        customer.email.toLowerCase().includes(searchQuery)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchQuery]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Customer
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
      </div>

      <select
        value={selectedCustomerId}
        onChange={(e) => onSelect(e.target.value)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        disabled={disabled}
        required
      >
        <option value="">Select a customer</option>
        {filteredCustomers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} - {customer.mobile}
          </option>
        ))}
      </select>

      {filteredCustomers.length === 0 && searchQuery && (
        <p className="text-sm text-gray-500">No customers found matching your search</p>
      )}
    </div>
  );
};

export default CustomerSelect;