import React, { useState, useEffect } from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { formatDate, ensureValidDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { Wrench, DollarSign, MapPin, Calendar, FileText } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface MaintenanceDetailsProps {
  log: MaintenanceLog;
  vehicle: Vehicle;
}

const MaintenanceDetails: React.FC<MaintenanceDetailsProps> = ({ log, vehicle }) => {
  const serviceDate = ensureValidDate(log.date);
  const nextServiceDate = ensureValidDate(log.nextServiceDate);
  const [createdByName, setCreatedByName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (log.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', log.createdBy)); // Assuming 'users' collection
          if (userDoc.exists()) {
            setCreatedByName(userDoc.data().name); // Assuming 'name' field in user document
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
  }, [log.createdBy]);

  const DetailItem = ({ label, value, isDate = false, isExpiring = false }: { 
      label: string;
      value: any;
      isDate?: boolean;
      isExpiring?: boolean;
    }) => (
      <div>
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <p className={`mt-1 ${isExpiring ? 'text-red-600 font-medium' : ''}`}>
          {isDate ? formatDate(value) : value}
        </p>
      </div>
    );
    const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
          <div className="mt-1 flex items-center">
            {vehicle.image && (
              <img 
                src={vehicle.image} 
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-10 w-10 object-cover rounded-md mr-2"
              />
            )}
            <div>
              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
              <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <div className="mt-1 space-y-1">
            <StatusBadge status={log.status} />
            <StatusBadge status={log.paymentStatus} />
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center">
          <Wrench className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Service Details</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Type</h4>
            <p className="mt-1 capitalize">{log.type.replace('-', ' ')}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Service Date</h4>
            <p className="mt-1">{formatDate(serviceDate)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Next Service Date</h4>
            <p className="mt-1">{formatDate(nextServiceDate)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Service Provider</h4>
            <p className="mt-1">{log.serviceProvider}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Location</h4>
            <p className="mt-1">{log.location}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500">Description</h4>
          <p className="mt-1">{log.description}</p>
        </div>

        {log.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Notes</h4>
            <p className="mt-1">{log.notes}</p>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
        
        {/* Parts List */}
        {log.parts && log.parts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Parts</h4>
            <div className="space-y-2">
              {log.parts.map((part, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{part.name}</span>
                    <span className="text-gray-500 ml-2">x{part.quantity}</span>
                  </div>
                  <div className="text-right">
                    <div>{formatCurrency(part.cost * part.quantity)}</div>
                    {log.vatDetails?.partsVAT[index].includeVAT && (
                      <div className="text-sm text-gray-500">+VAT</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Labor Cost */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Labor</h4>
          <div className="bg-gray-50 p-2 rounded flex justify-between items-center">
            <div>
              <span>Labor Cost</span>
              <span className="text-sm text-gray-500 ml-2">
                ({log.laborHours} hours @ £{log.laborRate}/hour)
              </span>
            </div>
            <div className="text-right">
              <div>{formatCurrency(log.laborCost)}</div>
              {log.vatDetails?.laborVAT && (
                <div className="text-sm text-gray-500">+VAT</div>
              )}
            </div>
          </div>
        </div>

        {log.attachments?.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-medium text-gray-900 mb-2">Attachments</h3>
    <div className="grid grid-cols-2 gap-4">
      {log.attachments.map((att, i) => (
        <a
          key={i}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50"
        >
          {att.type.startsWith('image/') ? (
            <img src={att.url} alt={att.name} className="h-12 w-12 object-cover rounded" />
          ) : (
            <FileText className="h-6 w-6 text-gray-500" />
          )}
          <span className="text-sm truncate">{att.name}</span>
        </a>
      ))}
    </div>
  </div>
)}


        {/* Payment Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">{formatCurrency(log.cost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">{formatCurrency(log.paidAmount || 0)}</span>
          </div>
          {log.remainingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Remaining Amount:</span>
              <span className="text-amber-600">{formatCurrency(log.remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
        <DetailItem
          label="Created At"
          value={log.updatedAt}
          isDate
        />
        <DetailItem
          label="Created By"
          value={createdByName || log.createdBy || 'Loading...'} // Display fetched name or ID
        />
      </div>
      
    </div>
  );
};

export default MaintenanceDetails;