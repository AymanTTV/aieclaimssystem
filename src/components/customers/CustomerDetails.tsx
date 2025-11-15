// src/components/customers/CustomerDetails.tsx
import React from 'react';
import { Eye, FileText } from 'lucide-react';

// --- Type Definitions (moved from external file to prevent path errors) ---

export type Gender = 'male' | 'female' | 'other';
export type CustomerType = 'customer' | 'claim' | 'company';

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gender?: Gender;
  dateOfBirth?: Date;
  nationalInsuranceNumber?: string;
  driverLicenseNumber?: string;
  licenseValidFrom?: Date;
  licenseExpiry?: Date;
  badgeNumber?: string;
  billExpiry?: Date;
  age?: number;
  signature?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  billDocumentUrl?: string;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Helper Functions (moved from external files to prevent path errors) ---

/**
 * Formats a Date object into a readable string (e.g., "5 Oct 2024").
 */
export const formatDate = (date: Date | undefined | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Checks if a given date is in the past.
 */
export const isExpired = (date: Date): boolean => {
  return new Date() > date;
};


// --- Components ---

interface CustomerDetailsProps {
  customer: Customer;
}

/**
 * A reusable component to display a document thumbnail.
 * It shows an image for image files and a generic icon for PDFs.
 */
const DocumentItem: React.FC<{ title: string; url: string; onView: (url: string) => void; }> = ({ title, url, onView }) => {
  const isPdf = url.toLowerCase().includes('.pdf');

  return (
    <div className="border rounded-lg p-4 relative group">
      <h4 className="text-sm font-medium text-gray-700 mb-2 truncate">{title}</h4>
      <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 rounded-md text-center overflow-hidden">
        {isPdf ? (
          <>
            <FileText className="h-10 w-10 text-gray-400" />
            <p className="text-xs text-gray-500 mt-2">PDF Document</p>
          </>
        ) : (
          <img src={url} alt={title} className="w-full h-full object-cover" />
        )}
      </div>
      <button 
        onClick={() => onView(url)} 
        className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-opacity opacity-0 group-hover:opacity-100" 
        title="View Document"
      >
        <Eye className="h-4 w-4 text-gray-600" />
      </button>
    </div>
  );
};

/**
 * Displays all details for a given customer.
 */
const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer }) => {
  const isCompany = customer.type === 'company';

  const handleDocumentView = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const hasDocuments = customer.licenseFrontUrl || customer.licenseBackUrl || customer.billDocumentUrl || customer.documentUrl;

  return (
    <div className="space-y-6">
      {/* --- Main Details --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Type</h3>
          <p className="mt-1 capitalize">{customer.type}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Name</h3>
          <p className="mt-1">{customer.name}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Mobile</h3>
          <p className="mt-1">
            <a href={`tel:${customer.mobile}`} className="text-blue-600 hover:underline">{customer.mobile}</a>
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Email</h3>
          <p className="mt-1">
            {customer.email ? <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a> : 'N/A'}
          </p>
        </div>
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500">Address</h3>
          <p className="mt-1">{customer.address}</p>
        </div>
        
        {!isCompany && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Gender</h3>
              <p className="mt-1 capitalize">{customer.gender || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Age</h3>
              <p className="mt-1">{customer.age ? `${customer.age} years` : 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
              <p className="mt-1">{customer.dateOfBirth ? formatDate(customer.dateOfBirth) : 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">National Insurance Number</h3>
              <p className="mt-1">{customer.nationalInsuranceNumber || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Driver License Number</h3>
              <p className="mt-1">{customer.driverLicenseNumber || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">License Valid From</h3>
              <p className="mt-1">{customer.licenseValidFrom ? formatDate(customer.licenseValidFrom) : 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">License Expiry</h3>
              <p className={`mt-1 ${customer.licenseExpiry && isExpired(customer.licenseExpiry) ? 'text-red-500' : ''}`}>
                {customer.licenseExpiry ? formatDate(customer.licenseExpiry) : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Badge Number</h3>
              <p className="mt-1">{customer.badgeNumber || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Bill Expiry</h3>
              <p className={`mt-1 ${customer.billExpiry && isExpired(customer.billExpiry) ? 'text-red-500' : ''}`}>
                {customer.billExpiry ? formatDate(customer.billExpiry) : 'N/A'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* --- Documents Section --- */}
      {!isCompany && hasDocuments && (
        <div className="pt-6 border-t">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {customer.licenseFrontUrl && (
              <DocumentItem title="License Front" url={customer.licenseFrontUrl} onView={handleDocumentView} />
            )}
            {customer.licenseBackUrl && (
              <DocumentItem title="License Back" url={customer.licenseBackUrl} onView={handleDocumentView} />
            )}
            {customer.billDocumentUrl && (
              <DocumentItem title="Bill Document" url={customer.billDocumentUrl} onView={handleDocumentView} />
            )}
             {customer.documentUrl && (
              <DocumentItem title="General Document" url={customer.documentUrl} onView={handleDocumentView} />
            )}
          </div>
        </div>
      )}

      {/* --- Signature Section --- */}
      {!isCompany && customer.signature && (
        <div className="pt-6 border-t">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Signature</h3>
          <div className="bg-gray-50 p-4 rounded-lg flex justify-start">
            <img src={customer.signature} alt="Customer Signature" className="max-h-32 object-contain bg-white rounded border" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;

