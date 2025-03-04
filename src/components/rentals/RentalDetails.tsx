import React, { useEffect, useState } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import RentalPaymentHistory from './RentalPaymentHistory';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, DollarSign, Tag } from 'lucide-react';
import { calculateOverdueCost } from '../../utils/rentalCalculations';
import { isAfter } from 'date-fns';
import VehicleConditionDetails from './VehicleConditionDetails';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; 

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface RentalDetailsProps {
  rental: Rental;
  vehicle: Vehicle | null;
  customer: Customer | null;
  onDownloadAgreement: () => void;
  onDownloadInvoice: () => void;
}



const Section: React.FC<SectionProps> = ({ title, children }) => (

  <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
    <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const RentalDetails: React.FC<RentalDetailsProps> = ({
  rental,
  vehicle,
  customer,
  onDownloadAgreement,
  onDownloadInvoice
}) => {
  const [ongoingCharges, setOngoingCharges] = useState(0);

  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay();
useEffect(() => {
  const fetchCreatedByName = async () => {
    if (rental.createdBy) {
      try {
        const userDoc = await getDoc(doc(db, 'users', rental.createdBy));
        if (userDoc.exists()) {
          setCreatedByName(userDoc.data().name);
        } else {
          setCreatedByName('Unknown User');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setCreatedByName('Unknown User');
      }
    }
  };

  fetchCreatedByName();
}, [rental.createdBy]);

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const validDate = ensureValidDate(date);
      return format(validDate, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };
  // Calculate ongoing charges
  const now = new Date();
  const totalCost = rental.cost + ongoingCharges;
  const remainingAmount = totalCost - rental.paidAmount - (rental.discountAmount || 0);
  // Calculate ongoing charges if rental is active and past end date
  useEffect(() => {
    if (vehicle && rental.status === 'active') {
      const endDate = new Date(rental.endDate);
      const now = new Date();
      if (isAfter(now, endDate)) {
        const extraCharges = calculateOverdueCost(rental, now, vehicle);
        setOngoingCharges(extraCharges);
      }
    }
  }, [rental, vehicle]);

  return (
  <div className="space-y-6">
    {/* Documents Section */}
    <div className="flex justify-end space-x-4">
      {rental.documents?.agreement && (
        <button
          onClick={onDownloadAgreement}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <FileText className="h-4 w-4 mr-2" />
          Hire Agreement
        </button>
      )}
      {rental.documents?.invoice && (
        <button
          onClick={onDownloadInvoice}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Invoice
        </button>
      )}
    </div>

    {/* Vehicle Information */}
    <div className="border-b pb-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
      <div className="grid grid-cols-2 gap-4">
        {vehicle ? (
          <>
            <div className="flex items-center">
              <Car className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Mileage</p>
              <p className="font-medium">{vehicle.mileage.toLocaleString()} km</p>
            </div>
          </>
        ) : (
          <div className="col-span-2 text-gray-500">Vehicle information not available</div>
        )}
      </div>
    </div>

    {/* Customer Information */}
    <div className="border-b pb-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
      <div className="grid grid-cols-2 gap-4">
        {customer ? (
          <>
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-gray-500">License: {customer.driverLicenseNumber}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="font-medium">{customer.mobile}</p>
                <p className="text-sm text-gray-500">Contact</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm">{customer.email}</p>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm">{customer.address}</p>
            </div>
          </>
        ) : (
          <div className="col-span-2 text-gray-500">Customer information not available</div>
        )}
      </div>
    </div>

    {/* Rental Details */}
    <div className="border-b pb-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Type</p>
          <div className="mt-1 space-y-1">
            <StatusBadge status={rental.type} />
            <StatusBadge status={rental.reason} />
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <div className="mt-1 space-y-1">
            <StatusBadge status={rental.status} />
            <StatusBadge status={rental.paymentStatus} />
          </div>
        </div>
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Start Date & Time</p>
            <p className="font-medium">{formatDate(rental.startDate, true)}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500">End Date & Time</p>
            <p className="font-medium">{formatDate(rental.endDate, true)}</p>
          </div>
        </div>
      </div>
    </div>

    {rental.checkOutCondition && (
  <Section title="Check-Out Condition">
    <VehicleConditionDetails 
      condition={rental.checkOutCondition}
      type="check-out"
    />
  </Section>
)}

{rental.returnCondition && (
  <Section title="Return Condition">
    <VehicleConditionDetails
      condition={rental.returnCondition} 
      type="return"
    />
  </Section>
)}

    {/* Cost Details */}
    <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Details</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Base Cost:</span>
            <span className="font-medium">{formatCurrency(rental.cost)}</span>
          </div>

          {ongoingCharges > 0 && (
            <div className="flex justify-between items-center text-red-600">
              <span>Ongoing Charges:</span>
              <span>+{formatCurrency(ongoingCharges)}</span>
            </div>
          )}

          {rental.negotiatedRate && (
            <div className="flex justify-between items-center text-blue-600">
              <span>Negotiated Rate:</span>
              <span>£{rental.negotiatedRate}/{rental.type === 'weekly' ? 'week' : 'day'}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600">Total Cost:</span>
            <span className="font-medium">{formatCurrency(totalCost)}</span>
          </div>

          <div className="flex justify-between items-center text-green-600">
            <span>Amount Paid:</span>
            <span>{formatCurrency(rental.paidAmount)}</span>
          </div>

          {rental.discountAmount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <span>Discount ({rental.discountPercentage}%):</span>
              <span>-{formatCurrency(rental.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t font-medium">
            <span>Remaining Amount:</span>
            <span className={remainingAmount > 0 ? 'text-amber-600' : 'text-green-600'}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
        </div>
      </div>

    

    {/* Payment History */}
    {rental.payments && rental.payments.length > 0 && (
      <div className="border-t pt-4">
        <RentalPaymentHistory
          payments={rental.payments}
          onDownloadDocument={(url) => window.open(url, '_blank')}
        />
      </div>
    )}

    

    {/* Customer Signature */}
    {rental.signature && (
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Signature</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <img 
            src={rental.signature} 
            alt="Customer Signature" 
            className="max-h-24 object-contain bg-white rounded border"
          />
        </div>
      </div>
    )}

    

    {/* Creation Information */}
    <div className="text-sm text-gray-500">
      <div className="flex justify-between">
      <div>Submitted by: {createdByName || rental.createdBy || 'Loading...'}</div>

        <div>Last Updated: {formatDate(rental.updatedAt, true)}</div>
      </div>
    </div>
  </div>
);

};

export default RentalDetails;