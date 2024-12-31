import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { generateRentalDocuments } from '../../../utils/pdfGeneration';
import { uploadRentalDocuments } from '../../../utils/documentUpload';
import { validateRentalDates } from '../../../utils/rentalValidation';
import toast from 'react-hot-toast';

interface FormData {
  vehicleId: string;
  customerId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  type: 'daily' | 'weekly' | 'claim';
  reason: 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'c-substitute' | 'h-substitute';
  numberOfWeeks: number;
  signature: string;
  paidAmount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  paymentReference: string;
}

interface FormErrors {
  vehicleId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  signature?: string;
}

export const useRentalForm = (onClose: () => void) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    vehicleId: '',
    customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '',
    endTime: '',
    type: 'daily',
    reason: 'hired',
    numberOfWeeks: 1,
    signature: '',
    paidAmount: 0,
    paymentMethod: 'cash',
    paymentReference: ''
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = 'Please select a vehicle';
    }

    if (!formData.customerId) {
      newErrors.customerId = 'Please select a customer';
    }

    const dateValidation = validateRentalDates(
      formData.startDate,
      formData.startTime,
      formData.endDate,
      formData.endTime
    );

    if (!dateValidation.isValid) {
      newErrors.startDate = dateValidation.error;
    }

    if (!formData.signature) {
      newErrors.signature = 'Signature is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateForm()) return;

    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const rentalData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        status: 'scheduled',
        createdAt: new Date(),
        createdBy: user.id
      };

      const docRef = await addDoc(collection(db, 'rentals'), rentalData);
      
      // Generate and upload documents
      const documents = await generateRentalDocuments(docRef.id, rentalData);
      await uploadRentalDocuments(docRef.id, documents);

      toast.success('Rental created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating rental:', error);
      toast.error('Failed to create rental');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignatureCapture = (signature: string) => {
    setFormData(prev => ({ ...prev, signature }));
  };

  return {
    formData,
    loading,
    errors,
    handleSubmit,
    handleInputChange,
    handleSignatureCapture
  };
};