import React from 'react';
import { Customer } from '../../types/customer';
import { formatDate } from '../../utils/dateHelpers';
import { isExpired } from '../../types/customer';
import { Eye } from 'lucide-react';

interface CustomerDetailsProps {
  customer: Customer;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer }) => {
  const handleDocumentView = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Name</h3>
          <p className="mt-1">{customer.name}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Gender</h3>
          <p className="mt-1 capitalize">{customer.gender}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Age</h3>
          <p className="mt-1">{customer.age} years</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Mobile</h3>
          <p className="mt-1">{customer.mobile}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Email</h3>
          <p className="mt-1">{customer.email}</p>
        </div>
        <div className="col-span-2">
          <h3 className="text-sm font-medium text-gray-500">Address</h3>
          <p className="mt-1">{customer.address}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
          <p className="mt-1">{formatDate(customer.dateOfBirth)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">National Insurance Number</h3>
          <p className="mt-1">{customer.nationalInsuranceNumber}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Driver License Number</h3>
          <p className="mt-1">{customer.driverLicenseNumber}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">License Valid From</h3>
          <p className="mt-1">{formatDate(customer.licenseValidFrom)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">License Expiry</h3>
          <p className={`mt-1 ${isExpired(customer.licenseExpiry) ? 'text-red-500' : ''}`}>
            {formatDate(customer.licenseExpiry)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Badge Number</h3>
          <p className="mt-1">{customer.badgeNumber}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Bill Expiry</h3>
          <p className={`mt-1 ${isExpired(customer.billExpiry) ? 'text-red-500' : ''}`}>
            {formatDate(customer.billExpiry)}
          </p>
        </div>

        {/* Documents Section */}
        <div className="col-span-2 mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* License Front */}
            {customer.licenseFrontUrl && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">License Front</h4>
                <div className="relative">
                  <img
                    src={customer.licenseFrontUrl}
                    alt="License Front"
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <button
                    onClick={() => handleDocumentView(customer.licenseFrontUrl!)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                    title="View Document"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}

            {/* License Back */}
            {customer.licenseBackUrl && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">License Back</h4>
                <div className="relative">
                  <img
                    src={customer.licenseBackUrl}
                    alt="License Back"
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <button
                    onClick={() => handleDocumentView(customer.licenseBackUrl!)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                    title="View Document"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Bill Document */}
            {customer.billDocumentUrl && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bill Document</h4>
                <div className="relative">
                  <img
                    src={customer.billDocumentUrl}
                    alt="Bill Document"
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <button
                    onClick={() => handleDocumentView(customer.billDocumentUrl!)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                    title="View Document"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;