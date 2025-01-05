import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimFormSchema, type ClaimFormData } from './schema';
import { useAuth } from '../../../context/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { calculateRentalCost } from '../../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../../utils/documentUpload';
import toast from 'react-hot-toast';

interface RentalFormProps {
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const methods = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      type: 'daily',
      reason: 'hired',
      numberOfWeeks: 1,
      paidAmount: 0,
      paymentMethod: 'cash',
      payments: []
    }
  });

  const handleSubmit = async (data: ClaimFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
      
      // Calculate costs
      const standardCost = calculateRentalCost(
        startDateTime,
        endDateTime,
        data.type,
        data.reason,
        data.numberOfWeeks
      );

      const finalCost = data.customRate ? parseFloat(data.customRate) : standardCost;
      const remainingAmount = finalCost - (data.paidAmount || 0);

      // Create initial payment record if amount paid
      const payments = [];
      if (data.paidAmount > 0) {
        payments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: data.paidAmount,
          method: data.paymentMethod,
          reference: data.paymentReference,
          notes: data.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      // Create rental record
      const rentalData = {
        ...data,
        startDate: startDateTime,
        endDate: endDateTime,
        cost: finalCost,
        standardCost,
        paidAmount: data.paidAmount || 0,
        remainingAmount,
        paymentStatus: data.paidAmount >= finalCost ? 'paid' : 
                      data.paidAmount > 0 ? 'partially_paid' : 'pending',
        status: 'scheduled',
        payments,
        createdAt: new Date(),
        createdBy: user.id,
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'rentals'), rentalData);

      // Generate and upload documents
      const documents = await generateRentalDocuments(
        { id: docRef.id, ...rentalData },
        vehicle,
        customer
      );
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

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Form sections */}
        {/* ... rest of your form JSX ... */}
      </form>
    </FormProvider>
  );
};

export default RentalForm;