import React from 'react';
import { User } from '../types';
import { format } from 'date-fns';
import { UserCircle, Mail, Calendar, Trash2 } from 'lucide-react';
import { resolveNameFields, resolveAddressFields } from '../utils/nameAddressUtils';

interface UserCardProps {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  const nameFields = resolveNameFields(user);
  const addressFields = resolveAddressFields(user);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <UserCircle className="w-10 h-10 text-gray-400" />
          )}
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              <span>First Name: {nameFields.firstName || '-'}</span>
              {nameFields.middleName && <span className="ml-2">Middle Name: {nameFields.middleName}</span>}
              <span className="ml-2">Last Name: {nameFields.lastName || '-'}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Mail className="w-4 h-4 mr-1" />
              {user.email}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
          ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
            user.role === 'admin' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
            user.role === 'manager' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
            user.role === 'supervisor' ? 'bg-teal-100 text-teal-900 border border-teal-200' :
            user.role === 'accountant' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
            user.role === 'staff' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
            'bg-green-100 text-green-800'}`}
        >
          {user.role === 'superadmin' ? 'Super Admin' : user.role}
        </span>
      </div>

      <div className="mt-4 text-xs text-gray-600 space-y-0.5 border-t pt-2">
        {user.phoneNumber && (
          <p className="text-sm text-gray-500 mb-1">
            Phone: {user.phoneNumber}
          </p>
        )}
        <p><span className="font-medium text-gray-700">Building Name / Flat Number:</span> {addressFields.buildingFlat || '-'}</p>
        <p><span className="font-medium text-gray-700">Street Name:</span> {addressFields.streetName || '-'}</p>
        <p><span className="font-medium text-gray-700">Town / City:</span> {addressFields.townCity || '-'}</p>
        <p><span className="font-medium text-gray-700">Postcode:</span> {addressFields.postcode || '-'}</p>
        <p><span className="font-medium text-gray-700">Country:</span> {addressFields.country || '-'}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          Joined {format(user.createdAt, 'MMM dd, yyyy')}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="text-sm text-primary hover:text-primary-600 font-medium"
          >
            Edit Role
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;