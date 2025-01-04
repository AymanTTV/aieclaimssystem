import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Customer, Gender, calculateAge } from '../../types/customer';
import { Upload } from 'lucide-react';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import CustomerSignature from './CustomerSignature';

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    signature: '',
    name: customer?.name || '',
    mobile: customer?.mobile || '',
    email: customer?.email || '',
    address: customer?.address || '',
    gender: customer?.gender || 'male' as Gender,
    dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.toISOString().split('T')[0] : '',
    nationalInsuranceNumber: customer?.nationalInsuranceNumber || '',
    driverLicenseNumber: customer?.driverLicenseNumber || '',
    licenseValidFrom: customer?.licenseValidFrom ? customer.licenseValidFrom.toISOString().split('T')[0] : '',
    licenseExpiry: customer?.licenseExpiry ? customer.licenseExpiry.toISOString().split('T')[0] : '',
    badgeNumber: customer?.badgeNumber || '',
    billExpiry: customer?.billExpiry ? customer.billExpiry.toISOString().split('T')[0] : '',
  });

  const [documents, setDocuments] = useState<{
    licenseFront: File | null;
    licenseBack: File | null;
    billDocument: File | null;
  }>({
    licenseFront: null,
    licenseBack: null,
    billDocument: null,
  });

  const [documentPreviews, setDocumentPreviews] = useState<{
    licenseFront: string | null;
    licenseBack: string | null;
    billDocument: string | null;
  }>({
    licenseFront: customer?.licenseFrontUrl || null,
    licenseBack: customer?.licenseBackUrl || null,
    billDocument: customer?.billDocumentUrl || null,
  });

  const handleDocumentChange = (type: keyof typeof documents) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Update document state
    setDocuments(prev => ({ ...prev, [type]: file }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentPreviews(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dateOfBirth = new Date(formData.dateOfBirth);
      const age = calculateAge(dateOfBirth);

      const customerData = {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth),
        licenseValidFrom: new Date(formData.licenseValidFrom),
        licenseExpiry: new Date(formData.licenseExpiry),
        billExpiry: new Date(formData.billExpiry),
        age,
        createdAt: customer?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Upload documents if provided
      const documentUrls: Record<string, string> = {};

      if (documents.licenseFront) {
        const storageRef = ref(storage, `customers/${formData.driverLicenseNumber}/license-front`);
        const snapshot = await uploadBytes(storageRef, documents.licenseFront);
        documentUrls.licenseFrontUrl = await getDownloadURL(snapshot.ref);
      }

      if (documents.licenseBack) {
        const storageRef = ref(storage, `customers/${formData.driverLicenseNumber}/license-back`);
        const snapshot = await uploadBytes(storageRef, documents.licenseBack);
        documentUrls.licenseBackUrl = await getDownloadURL(snapshot.ref);
      }

      if (documents.billDocument) {
        const storageRef = ref(storage, `customers/${formData.driverLicenseNumber}/bill`);
        const snapshot = await uploadBytes(storageRef, documents.billDocument);
        documentUrls.billDocumentUrl = await getDownloadURL(snapshot.ref);
      }

      if (customer) {
        await updateDoc(doc(db, 'customers', customer.id), {
          ...customerData,
          ...documentUrls,
        });
        toast.success('Customer updated successfully');
      } else {
        await addDoc(collection(db, 'customers'), {
          ...customerData,
          ...documentUrls,
        });
        toast.success('Customer added successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <FormField
          type="tel"
          label="Mobile"
          value={formData.mobile}
          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          required
        />

        <FormField
          type="email"
          label="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="Date of Birth"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          required
        />

        <FormField
          label="National Insurance Number"
          value={formData.nationalInsuranceNumber}
          onChange={(e) => setFormData({ ...formData, nationalInsuranceNumber: e.target.value })}
          required
        />

        <FormField
          label="Driver License Number"
          value={formData.driverLicenseNumber}
          onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="License Valid From"
          value={formData.licenseValidFrom}
          onChange={(e) => setFormData({ ...formData, licenseValidFrom: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="License Expiry"
          value={formData.licenseExpiry}
          onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
          required
        />

        <FormField
          label="Badge Number"
          value={formData.badgeNumber}
          onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="Bill Expiry"
          value={formData.billExpiry}
          onChange={(e) => setFormData({ ...formData, billExpiry: e.target.value })}
          required
        />

        <div className="md:col-span-2">
          <FormField
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>

        {/* License Front */}
        <div>
          <label className="block text-sm font-medium text-gray-700">License Front</label>
          <div className="mt-1 flex items-center space-x-4">
            {documentPreviews.licenseFront && (
              <img
                src={documentPreviews.licenseFront}
                alt="License Front"
                className="h-20 w-32 object-cover rounded-md"
              />
            )}
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-5 w-5 mr-2 text-gray-400" />
              Upload License Front
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleDocumentChange('licenseFront')}
              />
            </label>
          </div>
        </div>

        {/* License Back */}
        <div>
          <label className="block text-sm font-medium text-gray-700">License Back</label>
          <div className="mt-1 flex items-center space-x-4">
            {documentPreviews.licenseBack && (
              <img
                src={documentPreviews.licenseBack}
                alt="License Back"
                className="h-20 w-32 object-cover rounded-md"
              />
            )}
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-5 w-5 mr-2 text-gray-400" />
              Upload License Back
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleDocumentChange('licenseBack')}
              />
            </label>
          </div>
        </div>

        {/* Bill Document */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Bill Document</label>
          <div className="mt-1 flex items-center space-x-4">
            {documentPreviews.billDocument && (
              <img
                src={documentPreviews.billDocument}
                alt="Bill Document"
                className="h-20 w-32 object-cover rounded-md"
              />
            )}
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-5 w-5 mr-2 text-gray-400" />
              Upload Bill Document
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleDocumentChange('billDocument')}
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <CustomerSignature
          value={formData.signature}
          onChange={(signature) => setFormData({ ...formData, signature })}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;