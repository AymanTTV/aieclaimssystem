// src/components/company/DynamicTermsRedirectButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sliders, ExternalLink, ShieldCheck } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';

export interface DynamicTermsRedirectButtonProps {
  label?: string;
  documentScope?: 'vehicle' | 'maintenance' | 'claims' | 'rental' | 'invoices' | 'finance';
  documentTitle?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'toolbar' | 'solid' | 'outline' | 'subtle';
}

export const DynamicTermsRedirectButton: React.FC<DynamicTermsRedirectButtonProps> = ({
  label = 'Document Terms & Conditions Manager',
  documentScope,
  documentTitle,
  className = '',
  size = 'md',
  variant = 'toolbar',
}) => {
  const navigate = useNavigate();
  const { can } = usePermissions();

  const handleRedirect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if user has permission to access Company Manager
    const hasCompanyAccess = can('company', 'view') || can('settings', 'manageDynamicTerms') || can('users', 'view');

    if (!hasCompanyAccess) {
      toast.error("Access restricted: Requires 'Company' or 'Manage Dynamic T&Cs' permission under Company Settings.");
      return;
    }

    toast.success(
      documentTitle
        ? `Redirecting to Dynamic T&C Mapping Engine for ${documentTitle}...`
        : 'Redirecting to Company Manager > Dynamic T&C Mapping Engine...',
      {
        id: 'tc-redirect',
        duration: 2500,
        icon: '⚖️',
      }
    );

    const queryParams = new URLSearchParams();
    if (documentScope) {
      queryParams.set('scope', documentScope);
    }
    const targetUrl = `/company-managers${queryParams.toString() ? `?${queryParams.toString()}` : ''}#dynamic-terms-engine`;
    
    navigate(targetUrl);
  };

  // Sizing styles
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] gap-1.5'
      : size === 'lg'
      ? 'px-4 py-2.5 text-sm gap-2'
      : 'px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm gap-1.5 sm:gap-2';

  // Variant styling matching design guidelines
  let variantClasses =
    'bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 hover:text-white border border-indigo-700/60 shadow-xs';
  if (variant === 'solid') {
    variantClasses =
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm border border-indigo-500';
  } else if (variant === 'outline') {
    variantClasses =
      'bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 border border-indigo-200 shadow-2xs';
  } else if (variant === 'subtle') {
    variantClasses =
      'bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700/80 shadow-xs';
  }

  return (
    <button
      type="button"
      onClick={handleRedirect}
      title={
        documentTitle
          ? `Navigate to Company Manager > Dynamic T&C Mapping Engine (${documentTitle})`
          : 'Navigate to Company Manager > Dynamic T&C Mapping Engine (Document Terms & Conditions Manager)'
      }
      className={`inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center font-semibold rounded-xl transition-all cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
    >
      <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 pointer-events-none" />
      <span className="truncate">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-indigo-300/80 flex-shrink-0 pointer-events-none ml-0.5" />
    </button>
  );
};

export default DynamicTermsRedirectButton;
