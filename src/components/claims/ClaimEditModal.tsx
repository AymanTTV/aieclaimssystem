// src/components/claims/ClaimEditModal.tsx
import React from 'react';
import { Claim } from '../../types';
import ClaimDetailsModal from './ClaimDetailsModal';

interface ClaimEditModalProps {
  claim: Claim;
  onClose: () => void;
  onDownloadDocument?: (url: string) => void;
  onWhatsApp?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  onEmail?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
}

export const ClaimEditModal: React.FC<ClaimEditModalProps> = ({
  claim,
  onClose,
  onDownloadDocument,
  onWhatsApp,
  onEmail,
}) => {
  return (
    <ClaimDetailsModal
      claim={claim}
      initialEditMode={true}
      onClose={onClose}
      onDownloadDocument={onDownloadDocument}
      onWhatsApp={onWhatsApp}
      onEmail={onEmail}
    />
  );
};

export default ClaimEditModal;
