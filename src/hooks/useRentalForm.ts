import { useState } from 'react';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { calculateRentalCost } from '../utils/rentalCalculations';
import { generateRentalAgreement, generateRentalInvoice } from '../utils/pdfGeneration';
import { uploadPDF } from '../utils/pdfStorage';
import toast from 'react-hot-toast';

export const useRentalForm = (onClose: () => void) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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
    paymentMethod: 'cash',
    paymentReference: '',
    paidAmount: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Get vehicle and customer details
      const [vehicleDoc, customerDoc, companyDoc] = await Promise.all([
        getDoc(doc(db, 'vehicles', formData.vehicleId)),
        getDoc(doc(db, 'customers', formData.customerId)),
        getDoc(doc(db, 'companySettings', 'details'))
      ]);

      if (!vehicleDoc.exists() || !customerDoc.exists() || !companyDoc.exists()) {
        throw new Error('Required data not found');
      }

      const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
      const customer = { id: customerDoc.id, ...customerDoc.data() };
      const companyDetails = companyDoc.data();

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      const cost = calculateRentalCost(startDateTime, endDateTime, formData.type);
      const remainingAmount = cost - formData.paidAmount;

      const rentalData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        cost,
        remainingAmount,
        paymentStatus: formData.paidAmount >= cost ? 'paid' : 'pending',
        status: 'scheduled',
        createdAt: new Date(),
        createdBy: user.id
      };

      // Create rental record
      const rentalRef = await addDoc(collection(db, 'rentals'), rentalData);
      const rental = { id: rentalRef.id, ...rentalData };

      // Generate and upload documents
      const [agreementPDF, invoicePDF] = await Promise.all([
        generateRentalAgreement(rental, vehicle, customer, companyDetails),
        generateRentalInvoice(rental, vehicle, customer, companyDetails)
      ]);

      const [agreementURL, invoiceURL] = await Promise.all([
        uploadPDF(agreementPDF, `rentals/${rental.id}/agreement.pdf`),
        uploadPDF(invoicePDF, `rentals/${rental.id}/invoice.pdf`)
      ]);

      // Update rental with document URLs
      await updateDoc(doc(db, 'rentals', rental.id), {
        documents: {
          agreement: agreementURL,
          invoice: invoiceURL
        }
      });

      toast.success('Rental created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating rental:', error);
      toast.error('Failed to create rental');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    loading,
    handleSubmit
  };
};