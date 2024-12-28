import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CompanyLogo from './CompanyLogo';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';

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
  bankAddress: string;
  iban: string;
  taxNumber: string;
  swiftBic: string;
  registrationNumber: string;
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
    bankAddress: '',
    iban: '',
    taxNumber: '',
    swiftBic: '',
    registrationNumber: ''
  });

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const docRef = doc(db, 'companySettings', 'details');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);

    try {
      await updateDoc(doc(db, 'companySettings', 'details'), {
        ...formData,
        updatedAt: new Date(),
        updatedBy: user.id
      });
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
            label="Bank Address"
            value={formData.bankAddress}
            onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
            disabled={!editing}
          />
          <FormField
            label="IBAN"
            value={formData.iban}
            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
            disabled={!editing}
            required
          />
          <FormField
            label="SWIFT/BIC"
            value={formData.swiftBic}
            onChange={(e) => setFormData({ ...formData, swiftBic: e.target.value })}
            disabled={!editing}
          />
          <FormField
            label="Tax Number"
            value={formData.taxNumber}
            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            disabled={!editing}
            required
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
      </div>
    </div>
  );
};

export default CompanyDetails;