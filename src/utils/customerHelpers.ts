import { Customer } from '../types/customer';
import { exportToExcel } from './excel';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export const handleCustomerExport = (customers: Customer[]) => {
  try {
    const exportData = customers.map(customer => ({
      Name: customer.name,
      Mobile: customer.mobile,
      Email: customer.email,
      Address: customer.address,
      'Date of Birth': customer.dateOfBirth.toLocaleDateString(),
      Age: customer.age,
      'NI Number': customer.nationalInsuranceNumber,
      'Driver License': customer.driverLicenseNumber,
      'License Valid From': customer.licenseValidFrom.toLocaleDateString(),
      'License Expiry': customer.licenseExpiry.toLocaleDateString(),
      'Badge Number': customer.badgeNumber,
      'Bill Expiry': customer.billExpiry.toLocaleDateString(),
    }));

    exportToExcel(exportData, 'customers');
    toast.success('Customers exported successfully');
  } catch (error) {
    console.error('Error exporting customers:', error);
    toast.error('Failed to export customers');
  }
};

export const handleCustomerImport = async (file: File) => {
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      const rows = text?.toString().split('\n').map(row => row.split(','));
      if (rows) {
        const importedData = rows.slice(1).map(row => ({
          name: row[0],
          mobile: row[1],
          email: row[2],
          address: row[3],
          dateOfBirth: new Date(row[4]),
          nationalInsuranceNumber: row[5],
          driverLicenseNumber: row[6],
          licenseValidFrom: new Date(row[7]),
          licenseExpiry: new Date(row[8]),
          badgeNumber: row[9],
          billExpiry: new Date(row[10]),
          age: parseInt(row[11]),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        for (const customer of importedData) {
          await addDoc(collection(db, 'customers'), customer);
        }

        toast.success(`${importedData.length} customers imported successfully`);
      }
    };
    reader.readAsText(file);
  } catch (error) {
    console.error('Error importing customers:', error);
    toast.error('Failed to import customers');
  }
};

export const validateCustomerDocument = (customer: Customer): string[] => {
  const errors: string[] = [];
  const now = new Date();

  if (customer.licenseExpiry <= now) {
    errors.push('Driver license has expired');
  }

  if (customer.billExpiry <= now) {
    errors.push('Bill has expired');
  }

  return errors;
};

export const isCustomerActive = (customer: Customer): boolean => {
  const now = new Date();
  return customer.licenseExpiry > now && customer.billExpiry > now;
};

export const getExpiringCustomers = (customers: Customer[], daysThreshold = 30): Customer[] => {
  const now = new Date();
  const threshold = new Date(now.setDate(now.getDate() + daysThreshold));

  return customers.filter(customer => 
    customer.licenseExpiry <= threshold || 
    customer.billExpiry <= threshold
  );
};