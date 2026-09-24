// src/components/customers/CustomerAvatar.tsx
import React, { useState, useEffect } from 'react';
import { Building, User } from 'lucide-react';
import { getCustomerInitials } from '../../utils/imageUtils';

export interface CustomerAvatarProps {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isCompany?: boolean;
  profilePictureUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded';
  className?: string;
  onClick?: () => void;
  status?: 'active' | 'inactive';
  showStatusDot?: boolean;
  alt?: string;
}

const SIZE_CLASSES = {
  xs: {
    container: 'w-7 h-7 min-w-[28px]',
    text: 'text-[10px] font-bold',
    icon: 'w-3.5 h-3.5',
    dot: 'w-2 h-2 -bottom-0.5 -right-0.5',
  },
  sm: {
    container: 'w-9 h-9 min-w-[36px]',
    text: 'text-xs font-bold',
    icon: 'w-4 h-4',
    dot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  },
  md: {
    container: 'w-10 h-10 min-w-[40px]',
    text: 'text-sm font-bold',
    icon: 'w-5 h-5',
    dot: 'w-2.5 h-2.5 bottom-0 right-0',
  },
  lg: {
    container: 'w-12 h-12 min-w-[48px]',
    text: 'text-base font-bold',
    icon: 'w-6 h-6',
    dot: 'w-3 h-3 bottom-0 right-0',
  },
  xl: {
    container: 'w-16 h-16 min-w-[64px]',
    text: 'text-lg font-bold',
    icon: 'w-8 h-8',
    dot: 'w-3.5 h-3.5 bottom-0.5 right-0.5',
  },
  '2xl': {
    container: 'w-20 h-20 min-w-[80px]',
    text: 'text-2xl font-black',
    icon: 'w-10 h-10',
    dot: 'w-4 h-4 bottom-1 right-1',
  },
};

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  name,
  firstName,
  lastName,
  isCompany = false,
  profilePictureUrl,
  size = 'md',
  shape = 'rounded',
  className = '',
  onClick,
  status,
  showStatusDot = false,
  alt,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset error state if the URL prop changes
  useEffect(() => {
    setImgFailed(false);
  }, [profilePictureUrl]);

  const initials = getCustomerInitials(name, firstName, lastName, isCompany);
  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  const hasValidImage = Boolean(profilePictureUrl && !imgFailed);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none transition-transform duration-200 ${
        sizeConfig.container
      } ${radiusClass} ${onClick ? 'cursor-pointer hover:scale-105' : ''} ${className}`}
      title={name || 'Member Profile'}
    >
      {hasValidImage ? (
        <img
          src={profilePictureUrl!}
          alt={alt || name || 'Customer Avatar'}
          onError={() => setImgFailed(true)}
          className={`w-full h-full object-cover ${radiusClass} border border-slate-200/80 shadow-2xs`}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center ${radiusClass} border shadow-2xs ${
            isCompany
              ? 'bg-purple-100 text-purple-700 border-purple-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'
          } ${sizeConfig.text}`}
        >
          {isCompany ? (
            <Building className={sizeConfig.icon} />
          ) : initials ? (
            <span>{initials}</span>
          ) : (
            <User className={sizeConfig.icon} />
          )}
        </div>
      )}

      {/* Optional Status Indicator Dot */}
      {showStatusDot && status && (
        <span
          className={`absolute rounded-full ring-2 ring-white ${sizeConfig.dot} ${
            status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};

export default CustomerAvatar;
