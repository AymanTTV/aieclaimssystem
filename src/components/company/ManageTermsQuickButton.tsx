// src/components/company/ManageTermsQuickButton.tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  DynamicTermTemplate,
  DocumentScope,
  AgreementHireType,
  TargetPagePosition,
  RecordStatusTrigger,
} from '../../utils/documentTemplateTerms';
import toast from 'react-hot-toast';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export interface ManageTermsQuickButtonProps {
  documentType?: string;
  documentTitle?: string;
  moduleScope?: DocumentScope;
  specificDocType?: string;
  hireType?: AgreementHireType;
  targetPagePosition?: TargetPagePosition;
  statusTrigger?: RecordStatusTrigger;
  existingTemplates?: DynamicTermTemplate[];
  onTemplateSaved?: (
    savedTemplate: DynamicTermTemplate,
    allTemplates: DynamicTermTemplate[]
  ) => void;
  onSelectExistingTemplate?: (template: DynamicTermTemplate) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'toolbar';
  label?: string;
}

export const ManageTermsQuickButton: React.FC<ManageTermsQuickButtonProps> = ({
  documentTitle = 'This Document',
  moduleScope = 'rental',
  className = '',
  size = 'md',
  variant = 'toolbar',
  label = 'Document Terms & Conditions Manager',
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    const hasOverride =
      user?.allowDocumentOverrides === true ||
      user?.allow_document_overrides === true ||
      user?.permissions?.allowDocumentOverrides === true;
    return role === 'manager' || role === 'superadmin' || hasOverride;
  }, [user]);

  const safeModuleScope = useMemo(() => {
    if (Array.isArray(moduleScope)) {
      return (moduleScope[0] || 'rental') as DocumentScope;
    }
    return (moduleScope || 'rental') as DocumentScope;
  }, [moduleScope]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    navigate(`/company-managers?scope=${safeModuleScope}#dynamic-terms-engine`);
  };

  // Sizing styles
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] gap-1.5'
      : size === 'lg'
      ? 'px-4 py-2.5 text-sm gap-2'
      : 'px-3 py-1.5 text-xs sm:text-sm gap-1.5 sm:gap-2';

  // Variant styling
  let variantClasses =
    'bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 hover:text-white border border-indigo-700/60 shadow-xs';
  if (variant === 'solid') {
    variantClasses =
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm border border-indigo-500';
  } else if (variant === 'outline') {
    variantClasses =
      'bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 border border-indigo-200 shadow-2xs';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isManager
          ? `Navigate to Company Manager > Dynamic T&C Mapping Engine (${documentTitle})`
          : 'Navigate to Company Manager > Dynamic T&C Mapping Engine (Document Terms & Conditions Manager)'
      }
      className={`inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center font-semibold rounded-xl transition-all cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
    >
      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
      <span className="truncate">{label}</span>
      <ExternalLink className="w-3 h-3 text-indigo-300/80 flex-shrink-0 ml-0.5" />
    </button>
  );
};

export default ManageTermsQuickButton;
