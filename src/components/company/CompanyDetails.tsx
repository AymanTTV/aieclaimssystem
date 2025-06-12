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

  // Array of border colors for the "condition terms bords" when editing
  const borderColors = ['border-red-500', 'border-green-500', 'border-blue-500'];
  const [currentBorderColorIndex, setCurrentBorderColorIndex] = useState(0);

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

  // Effect to cycle border colors when editing is true
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (editing) {
      interval = setInterval(() => {
        setCurrentBorderColorIndex((prevIndex) => (prevIndex + 1) % borderColors.length);
      }, 1000); // Change color every 1 second
    }
    return () => clearInterval(interval); // Clear interval on unmount or when editing becomes false
  }, [editing, borderColors.length]);


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

  const getBorderClasses = (isTermsField: boolean) => {
    const baseClasses = 'mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 transition-colors duration-300 ease-in-out';
    if (editing) {
      // Apply the cycling border color for terms fields when editing
      if (isTermsField) {
        return `${baseClasses} ${borderColors[currentBorderColorIndex]} focus:ring-primary focus:border-primary`;
      }
      // For non-terms fields, just a standard focus color when editing
      return `${baseClasses} border-gray-300 focus:ring-primary focus:border-primary`;
    } else {
      // Consistent subtle border when not editing
      return `${baseClasses} border-gray-200 focus:ring-transparent focus:border-gray-200 cursor-not-allowed`;
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
    <div className="space-y-6 p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Company Details</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-6 py-2 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit Details
          </button>
        ) : (
          <div className="space-x-3">
            <button
              onClick={() => setEditing(false)}
              className="px-6 py-2 text-base font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Company Logo */}
        <div className="md:col-span-2 lg:col-span-3 mb-6">
          <CompanyLogo
            currentLogo={formData.logoUrl}
            onLogoUpdate={(url) => setFormData({ ...formData, logoUrl: url })}
          />
        </div>

        {/* Basic Company Information */}
        <div className="space-y-5 p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Basic Information</h3>
          <FormField
            label="Company Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            disabled={!editing}
            required
            className={getBorderClasses(false)} // Apply general styles for FormField
          />
          <FormField
            label="Trading Name"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            disabled={!editing}
            required
            className={getBorderClasses(false)}
          />
          <FormField
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!editing}
            required
            className={getBorderClasses(false)}
          />
          <FormField
            type="email"
            label="Reply-to Email"
            value={formData.replyToEmail}
            onChange={(e) => setFormData({ ...formData, replyToEmail: e.target.value })}
            disabled={!editing}
            className={getBorderClasses(false)}
          />
          <FormField
            type="tel"
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!editing}
            required
            className={getBorderClasses(false)}
          />
          <FormField
            type="url"
            label="Website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={!editing}
            className={getBorderClasses(false)}
          />
        </div>

        {/* Bank Details */}
        <div className="space-y-5 p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Bank Details</h3>
          <FormField
            label="Bank Name"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            disabled={!editing}
            required
            className={getBorderClasses(false)}
          />
          <FormField
            label="Sort Code"
            value={formData.sortCode}
            onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
            disabled={!editing}
            required
            pattern="[0-9]{2}-[0-9]{2}-[0-9]{2}"
            placeholder="00-00-00"
            className={getBorderClasses(false)}
          />
          <FormField
            label="Account Number"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            disabled={!editing}
            required
            pattern="[0-9]{8}"
            placeholder="12345678"
            className={getBorderClasses(false)}
          />
          <FormField
            label="VAT Number"
            value={formData.vatNumber}
            onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
            disabled={!editing}
            required
            placeholder="GB123456789"
            className={getBorderClasses(false)}
          />
          <FormField
            label="Company Registration Number"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            disabled={!editing}
            required
            className={getBorderClasses(false)}
          />
        </div>

        {/* Official Address */}
        <div className="md:col-span-2 lg:col-span-1 space-y-5 p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Official Address</h3>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea
            value={formData.officialAddress}
            onChange={(e) => setFormData({ ...formData, officialAddress: e.target.value })}
            rows={4} // Slightly increased for better address visibility
            className={getBorderClasses(false)} // Apply general styles, not cycling
            disabled={!editing}
            required
            placeholder="Enter official company address..."
          />
        </div>

        {/* Document Terms & Conditions */}
        <div className="md:col-span-2 lg:col-span-3 space-y-8 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-2xl font-semibold text-gray-900 border-b pb-4">Document Terms & Conditions</h3>

          {/* General Terms & Conditions */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <label className="block text-lg font-bold text-gray-800 mb-3">General Terms & Conditions</label>
            <textarea
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              rows={12}
              className={getBorderClasses(true)} // Apply cycling border
              disabled={!editing}
              placeholder="Enter general terms and conditions..."
            />
          </div>

          {/* Rental Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Rental Documents Terms</h4>
            <div className="space-y-6">
              <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Condition of Hire Terms</label>
                <textarea
                  value={formData.conditionOfHireText}
                  onChange={(e) => setFormData({ ...formData, conditionOfHireText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Condition of Hire document..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Credit Hire Mitigation Terms</label>
                <textarea
                  value={formData.creditHireMitigationText}
                  onChange={(e) => setFormData({ ...formData, creditHireMitigationText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Credit Hire Mitigation document..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Notice of Right to Cancel Terms</label>
                <textarea
                  value={formData.noticeOfRightToCancelText}
                  onChange={(e) => setFormData({ ...formData, noticeOfRightToCancelText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Notice of Right to Cancel document..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Credit Storage and Recovery Terms</label>
                <textarea
                  value={formData.creditStorageAndRecoveryText}
                  onChange={(e) => setFormData({ ...formData, creditStorageAndRecoveryText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Credit Storage and Recovery document..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Hire Agreement Terms</label>
                <textarea
                  value={formData.hireAgreementText}
                  onChange={(e) => setFormData({ ...formData, hireAgreementText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Hire Agreement document..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Satisfaction Notice Terms</label>
                <textarea
                  value={formData.satisfactionNoticeText}
                  onChange={(e) => setFormData({ ...formData, satisfactionNoticeText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Satisfaction Notice document..."
                />
              </div>
            </div>
          </div>

          {/* Vehicle Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Vehicle Documents Terms</h4>
            <div className="space-y-6">
               <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Vehicle Terms</label>
                <textarea
                  value={formData.vehicleTerms}
                  onChange={(e) => setFormData({ ...formData, vehicleTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Vehicle documents..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Maintenance Terms</label>
                <textarea
                  value={formData.maintenanceTerms}
                  onChange={(e) => setFormData({ ...formData, maintenanceTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Maintenance documents..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Accident Terms</label>
                <textarea
                  value={formData.accidentTerms}
                  onChange={(e) => setFormData({ ...formData, accidentTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Accident documents..."
                />
              </div>
            </div>
          </div>

          {/* Claims Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Claims Documents Terms</h4>
            <div className="space-y-6">
              <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Personal Injury Terms</label>
                <textarea
                  value={formData.personalInjuryTerms}
                  onChange={(e) => setFormData({ ...formData, personalInjuryTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Personal Injury documents..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">VD Finance Terms</label>
                <textarea
                  value={formData.vdFinanceTerms}
                  onChange={(e) => setFormData({ ...formData, vdFinanceTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for VD Finance documents..."
                />
              </div>
            </div>
          </div>

          {/* Financial Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Financial Documents Terms</h4>
            <div className="space-y-6">
              <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Driver Pay Terms</label>
                <textarea
                  value={formData.driverPayTerms}
                  onChange={(e) => setFormData({ ...formData, driverPayTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Driver Pay documents..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Petty Cash Terms</label>
                <textarea
                  value={formData.pettyCashTerms}
                  onChange={(e) => setFormData({ ...formData, pettyCashTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Petty Cash documents..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">VAT Record Terms</label>
                <textarea
                  value={formData.vatRecordTerms}
                  onChange={(e) => setFormData({ ...formData, vatRecordTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for VAT Record documents..."
                />
              </div>
            </div>
          </div>

          {/* Customer Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Customer Documents Terms</h4>
            <div className="space-y-6">
              <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Customer Terms</label>
                <textarea
                  value={formData.customerTerms}
                  onChange={(e) => setFormData({ ...formData, customerTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter terms for Customer documents..."
                />
              </div>
            </div>
          </div>

          {/* Additional Terms */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Additional Terms</h4>
            <div className="space-y-6">
              <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Privacy Policy</label>
                <textarea
                  value={formData.privacyPolicy}
                  onChange={(e) => setFormData({ ...formData, privacyPolicy: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter privacy policy..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Data Protection Policy</label>
                <textarea
                  value={formData.dataProtectionPolicy}
                  onChange={(e) => setFormData({ ...formData, dataProtectionPolicy: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter data protection policy..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Disclaimer</label>
                <textarea
                  value={formData.disclaimerText}
                  onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} // Apply cycling border
                  disabled={!editing}
                  placeholder="Enter disclaimer text..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* E-Signature */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 p-4 border border-gray-200 rounded-lg shadow-sm">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Company E-Signature
          </label>
          {editing ? (
            <SignaturePad
              value={formData.signature}
              onChange={(signature) => setFormData({ ...formData, signature })}
              className="mt-1 border border-gray-300 rounded-md shadow-inner"
            />
          ) : (
            formData.signature && (
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 flex justify-center items-center">
                <img
                  src={formData.signature}
                  alt="Company Signature"
                  className="mt-1 max-h-36 w-auto object-contain"
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;