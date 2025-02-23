import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import CompanyLogo from './CompanyLogo';
import FormField from '../ui/FormField';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import SignaturePad from "../ui/SignaturePad"

interface CompanySettings {
  // Basic company info
  logoUrl?: string;
  fullName: string;
  title: string;
  email: string;
  replyToEmail: string;
  phone: string;
  website: string;
  officialAddress: string;
  
  // Bank details
  bankName: string;
  sortCode: string;
  accountNumber: string;
  vatNumber: string;
  registrationNumber: string;
  
  // Document terms
  termsAndConditions: string;
  signature: string;

  // Rental document terms
  conditionOfHireText: string;
  creditHireMitigationText: string;
  noticeOfRightToCancelText: string;
  creditStorageAndRecoveryText: string;
  hireAgreementText: string;
  satisfactionNoticeText: string;

  // Vehicle document terms
  vehicleTerms: string;
  maintenanceTerms: string;
  accidentTerms: string;
  personalInjuryTerms: string;
  vdFinanceTerms: string;
  driverPayTerms: string;
  pettyCashTerms: string;
  vatRecordTerms: string;
  customerTerms: string;

  // Additional terms
  privacyPolicy: string;
  dataProtectionPolicy: string;
  disclaimerText: string;
}

const CompanyDetails = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    signature: '',
    conditionOfHireText: '',
    creditHireMitigationText: '',
    noticeOfRightToCancelText: '',
    creditStorageAndRecoveryText: '',
    hireAgreementText: '',
    satisfactionNoticeText: '',
    vehicleTerms: '',
    maintenanceTerms: '',
    accidentTerms: '',
    personalInjuryTerms: '',
    vdFinanceTerms: '',
    driverPayTerms: '',
    pettyCashTerms: '',
    vatRecordTerms: '',
    customerTerms: '',
    privacyPolicy: '',
    dataProtectionPolicy: '',
    disclaimerText: ''
  });

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const docRef = doc(db, 'companySettings', 'details');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData(data as CompanySettings);
          if (data.logoUrl) {
            setImagePreview(data.logoUrl);
          }
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
    if (!user) return;
    setLoading(true);

    try {
      const docRef = doc(db, 'companySettings', 'details');
      
      await updateDoc(docRef, {
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

        {/* Basic Company Information */}
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

        {/* Document Terms & Conditions */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Document Terms & Conditions</h3>
          
          {/* Rental Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Rental Documents</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Condition of Hire Terms</label>
                <textarea
                  value={formData.conditionOfHireText}
                  onChange={(e) => setFormData({ ...formData, conditionOfHireText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Condition of Hire document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Credit Hire Mitigation Terms</label>
                <textarea
                  value={formData.creditHireMitigationText}
                  onChange={(e) => setFormData({ ...formData, creditHireMitigationText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Credit Hire Mitigation document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notice of Right to Cancel Terms</label>
                <textarea
                  value={formData.noticeOfRightToCancelText}
                  onChange={(e) => setFormData({ ...formData, noticeOfRightToCancelText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Notice of Right to Cancel document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Credit Storage and Recovery Terms</label>
                <textarea
                  value={formData.creditStorageAndRecoveryText}
                  onChange={(e) => setFormData({ ...formData, creditStorageAndRecoveryText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Credit Storage and Recovery document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Hire Agreement Terms</label>
                <textarea
                  value={formData.hireAgreementText}
                  onChange={(e) => setFormData({ ...formData, hireAgreementText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Hire Agreement document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Satisfaction Notice Terms</label>
                <textarea
                  value={formData.satisfactionNoticeText}
                  onChange={(e) => setFormData({ ...formData, satisfactionNoticeText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Satisfaction Notice document..."
                />
              </div>
            </div>
          </div>

          {/* Vehicle Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Documents</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Terms</label>
                <textarea
                  value={formData.vehicleTerms}
                  onChange={(e) => setFormData({ ...formData, vehicleTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Vehicle documents..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Maintenance Terms</label>
                <textarea
                  value={formData.maintenanceTerms}
                  onChange={(e) => setFormData({ ...formData, maintenanceTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Maintenance documents..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Accident Terms</label>
                <textarea
                  value={formData.accidentTerms}
                  onChange={(e) => setFormData({ ...formData, accidentTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Accident documents..."
                />
              </div>
            </div>
          </div>

          {/* Claims Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Claims Documents</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Personal Injury Terms</label>
                <textarea
                  value={formData.personalInjuryTerms}
                  onChange={(e) => setFormData({ ...formData, personalInjuryTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Personal Injury documents..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">VD Finance Terms</label>
                <textarea
                  value={formData.vdFinanceTerms}
                  onChange={(e) => setFormData({ ...formData, vdFinanceTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for VD Finance documents..."
                />
              </div>
            </div>
          </div>

          {/* Financial Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Financial Documents</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver Pay Terms</label>
                <textarea
                  value={formData.driverPayTerms}
                  onChange={(e) => setFormData({ ...formData, driverPayTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Driver Pay documents..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Petty Cash Terms</label>
                <textarea
                  value={formData.pettyCashTerms}
                  onChange={(e) => setFormData({ ...formData, pettyCashTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Petty Cash documents..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">VAT Record Terms</label>
                <textarea
                  value={formData.vatRecordTerms}
                  onChange={(e) => setFormData({ ...formData, vatRecordTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for VAT Record documents..."
                />
              </div>
            </div>
          </div>

          {/* Customer Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Documents</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Terms</label>
                <textarea
                  value={formData.customerTerms}
                  onChange={(e) => setFormData({ ...formData, customerTerms: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter terms for Customer documents..."
                />
              </div>
            </div>
          </div>

          {/* Additional Terms */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Terms</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Privacy Policy</label>
                <textarea
                  value={formData.privacyPolicy}
                  onChange={(e) => setFormData({ ...formData, privacyPolicy: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter privacy policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Data Protection Policy</label>
                <textarea
                  value={formData.dataProtectionPolicy}
                  onChange={(e) => setFormData({ ...formData, dataProtectionPolicy: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter data protection policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Disclaimer</label>
                <textarea
                  value={formData.disclaimerText}
                  onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!editing}
                  placeholder="Enter disclaimer text..."
                />
              </div>
            </div>
          </div>
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
