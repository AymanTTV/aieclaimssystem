import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'; // Add setDoc import
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import CompanyLogo from './CompanyLogo';
import FormField from '../ui/FormField';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import SignaturePad from "../ui/SignaturePad"


interface CompanySettings {
  logoUrl?: string;
  fullName: string;
  title: string;
  email: string;
  replyToEmail: string;
  phone: string;
  website: string;
  officialAddress: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  vatNumber: string;
  registrationNumber: string;
  termsAndConditions: string; // Text area content
  signature: string; // Base64 encoded signature
}

const CompanyDetails = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<CompanySettings>({
    fullName: '',
    title: '',
    email: '',
    replyToEmail: '',
    phone: '',
    website: '',
    officialAddress: '',
    bankName: '',
    sortCode: '',
    accountNumber: '',
    vatNumber: '',
    registrationNumber: '',
    termsAndConditions: '',
    signature: ''
  });

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const docRef = doc(db, 'companySettings', 'details');
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const defaultSettings = {
            fullName: '',
            title: '',
            email: '',
            replyToEmail: '',
            phone: '',
            website: '',
            officialAddress: '',
            bankName: '',
            sortCode: '',
            accountNumber: '',
            vatNumber: '',
            registrationNumber: '',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await setDoc(docRef, defaultSettings);
          setFormData(defaultSettings);
        } else {
          setFormData(docSnap.data() as CompanySettings);
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
        toast.error('Failed to load company details');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, []);

  const handleFileUpload = async (file: File, type: 'terms' | 'signature') => {
    try {
      const storageRef = ref(storage, `company/${type}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setFormData(prev => ({
        ...prev,
        [type === 'terms' ? 'termsAndConditionsUrl' : 'signatureUrl']: url
      }));
      
      toast.success(`${type === 'terms' ? 'Terms & Conditions' : 'Signature'} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);

    try {
      const docRef = doc(db, 'companySettings', 'details');
      
      // First check if document exists
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Create document if it doesn't exist
        await setDoc(docRef, {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.id,
          updatedBy: user.id
        });
      } else {
        // Update existing document
        await updateDoc(docRef, {
          ...formData,
          updatedAt: new Date(),
          updatedBy: user.id
        });
      }

      toast.success('Company details updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Error updating company details:', error);
      toast.error('Failed to update company details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Company Details</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
          >
            Edit Details
          </button>
        ) : (
          <div className="space-x-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Logo */}
        <div className="md:col-span-2">
          <CompanyLogo
            currentLogo={formData.logoUrl}
            onLogoUpdate={(url) => setFormData({ ...formData, logoUrl: url })}
          />
        </div>

        {/* Company Information */}
        <div className="space-y-4">
          <FormField
            label="Company Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            disabled={!editing}
            required
          />
          <FormField
            label="Trading Name"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            disabled={!editing}
            required
          />
          <FormField
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!editing}
            required
          />
          <FormField
            type="email"
            label="Reply-to Email"
            value={formData.replyToEmail}
            onChange={(e) => setFormData({ ...formData, replyToEmail: e.target.value })}
            disabled={!editing}
          />
          <FormField
            type="tel"
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!editing}
            required
          />
          <FormField
            type="url"
            label="Website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={!editing}
          />
        </div>

        {/* Bank Details */}
        <div className="space-y-4">
          <FormField
            label="Bank Name"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            disabled={!editing}
            required
          />
          <FormField
            label="Sort Code"
            value={formData.sortCode}
            onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
            disabled={!editing}
            required
            pattern="[0-9]{2}-[0-9]{2}-[0-9]{2}"
            placeholder="00-00-00"
          />
          <FormField
            label="Account Number"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            disabled={!editing}
            required
            pattern="[0-9]{8}"
            placeholder="12345678"
          />
          <FormField
            label="VAT Number"
            value={formData.vatNumber}
            onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
            disabled={!editing}
            required
            placeholder="GB123456789"
          />
          <FormField
            label="Company Registration Number"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            disabled={!editing}
            required
          />
        </div>

        {/* Official Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Official Address</label>
          <textarea
            value={formData.officialAddress}
            onChange={(e) => setFormData({ ...formData, officialAddress: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            disabled={!editing}
            required
          />
        </div>

        {/* Terms & Conditions Upload */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Terms & Conditions
          </label>
          <textarea
            value={formData.termsAndConditions}
            onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
            rows={10}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            disabled={!editing}
            placeholder="Enter your company's terms and conditions here..."
          />
        </div>

        {/* E-Signature */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700">
          Company E-Signature
        </label>
        {editing ? (
          <SignaturePad
            value={formData.signature}
            onChange={(signature) => setFormData({ ...formData, signature })}
            className="mt-1 border rounded-md"
          />
        ) : (
          formData.signature && (
            <img 
              src={formData.signature} 
              alt="Company Signature" 
              className="mt-1 h-24 object-contain"
            />
          )
        )}
      </div>
        </div>
      </div>
    
    
  );
};

export default CompanyDetails;