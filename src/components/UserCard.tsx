import React from 'react';
import { User } from '../types';
import { format } from 'date-fns';
import { UserCircle, Mail, Calendar, Trash2 } from 'lucide-react';

interface UserCardProps {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
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
            <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
            <div className="flex items-center text-sm text-gray-500">
              <Mail className="w-4 h-4 mr-1" />
              {user.email}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
          ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'}`}
        >
          {user.role}
        </span>
      </div>

      <div className="mt-4">
        {user.phoneNumber && (
          <p className="text-sm text-gray-500">
            Phone: {user.phoneNumber}
          </p>
        )}
        {user.address && (
          <p className="text-sm text-gray-500 mt-1">
            Address: {user.address}
          </p>
        )}
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