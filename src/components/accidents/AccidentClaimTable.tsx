import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Accident } from '../../types';
import { Eye, Edit, Trash2, FileText, MapPin, Calendar, Clock, User, Car, Phone, Shield, AlertTriangle } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface AccidentClaimTableProps {
  accidents: Accident[];
  onView: (accident: Accident) => void;
  onEdit: (accident: Accident) => void;
  onDelete: (accident: Accident) => void;
}

const AccidentClaimTable: React.FC<AccidentClaimTableProps> = ({
  accidents,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Driver Information',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <User className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <div className="font-medium">{row.original.driverName}</div>
              <div className="text-sm text-gray-500">NIN: {row.original.driverNIN}</div>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Phone className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <div>Mobile: {row.original.driverMobile}</div>
              <div>Phone: {row.original.driverPhone}</div>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <div>{row.original.driverAddress}</div>
              <div>Post Code: {row.original.driverPostCode}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Vehicle Details',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <Car className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <div className="font-medium">
                {row.original.vehicleMake} {row.original.vehicleModel}
              </div>
              <div className="text-sm text-gray-500">VRN: {row.original.vehicleVRN}</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <div>Insurance: {row.original.insuranceCompany}</div>
            <div>Policy: {row.original.policyNumber}</div>
            {row.original.policyExcess && (
              <div>Excess: £{row.original.policyExcess}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Accident Details',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <span>{row.original.accidentDate}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <span>{row.original.accidentTime}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            <span>{row.original.accidentLocation}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <div className="font-medium">Description:</div>
            <div className="line-clamp-2">{row.original.description}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Fault Party',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.faultPartyName}</div>
          <div className="text-sm text-gray-500">
            <div>Vehicle: {row.original.faultPartyVehicle}</div>
            <div>VRN: {row.original.faultPartyVRN}</div>
            {row.original.faultPartyInsurance && (
              <div>Insurance: {row.original.faultPartyInsurance}</div>
            )}
          </div>
          {row.original.faultPartyPhone && (
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="w-4 h-4 text-gray-400 mr-1" />
              {row.original.faultPartyPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Additional Info',
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.policeOfficerName && (
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-gray-400 mr-2" />
              <div className="text-sm">
                <div>Officer: {row.original.policeOfficerName}</div>
                <div className="text-gray-500">CAD: {row.original.policeIncidentNumber}</div>
              </div>
            </div>
          )}
          {row.original.paramedicNames && (
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-gray-400 mr-2" />
              <div className="text-sm">
                <div>Paramedic: {row.original.paramedicNames}</div>
                <div className="text-gray-500">Ref: {row.original.ambulanceReference}</div>
              </div>
            </div>
          )}
          {row.original.images && row.original.images.length > 0 && (
            <div className="text-sm text-gray-500">
              {row.original.images.length} image(s) attached
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.type && row.original.type !== 'pending' && (
            <StatusBadge status={row.original.type} />
          )}
          <div className="text-xs text-gray-500">
            {format(row.original.submittedAt, 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {can('accidents', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {can('accidents', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={accidents}
      columns={columns}
      onRowClick={(accident) => onView(accident)}
    />
  );
};

export default AccidentClaimTable;