// src/components/customers/CustomerForm.tsx
import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Customer, Gender, CustomerType, calculateAge } from '../../types/customer';
import { Upload, User, FileText, CreditCard, Globe, Hash } from 'lucide-react';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import CustomerSignature from './CustomerSignature';

// List of common countries for the searchable dropdown
const COUNTRIES = [
  "United Kingdom", "Somalia", "United States", "Canada", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea North", "Korea South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: customer?.type || 'customer' as CustomerType,
    name: customer?.name || '',
    mobile: customer?.mobile || '',
    email: customer?.email || '',
    address: customer?.address || '',
    
    // Company fields
    accountNumber: customer?.accountNumber || '',
    vatNumber: customer?.vatNumber || '',
    
    // Individual fields
    gender: customer?.gender || 'male' as Gender,
    dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.toISOString().split('T')[0] : '',
    nationalInsuranceNumber: customer?.nationalInsuranceNumber || '',
    
    // License fields
    driverLicenseNumber: customer?.driverLicenseNumber || '',
    issueNumber: customer?.issueNumber || '', // [NEW]
    countryOfIssue: customer?.countryOfIssue || '', // [NEW]
    
    licenseValidFrom: customer?.licenseValidFrom ? customer.licenseValidFrom.toISOString().split('T')[0] : '',
    licenseExpiry: customer?.licenseExpiry ? customer.licenseExpiry.toISOString().split('T')[0] : '',
    badgeNumber: customer?.badgeNumber || '',
    billExpiry: customer?.billExpiry ? customer.billExpiry.toISOString().split('T')[0] : '',
    signature: customer?.signature || ''
  });

  const [documents, setDocuments] = useState<{
    licenseFront: File | null;
    licenseBack: File | null;
    billDocument: File | null;
  }>({ licenseFront: null, licenseBack: null, billDocument: null });

  const [documentPreviews, setDocumentPreviews] = useState<{
    licenseFront: string | null;
    licenseBack: string | null;
    billDocument: string | null;
  }>({
    licenseFront: customer?.licenseFrontUrl || null,
    licenseBack: customer?.licenseBackUrl || null,
    billDocument: customer?.billDocumentUrl || null,
  });

  const isCompany = formData.type === 'company';

  const handleDocumentChange = (type: keyof typeof documents) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocuments(prev => ({ ...prev, [type]: file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentPreviews(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureChange = (signature: string) => {
    setFormData(prev => ({ ...prev, signature }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = (formData.email || '').trim().toLowerCase();
      const baseData = {
        type: formData.type,
        name: formData.name,
        mobile: formData.mobile,
        email: normalizedEmail,
        address: formData.address,
        createdAt: customer?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      let customerData: any = baseData;
      const documentUrls: Record<string, string> = {};

      if (isCompany) {
        // Add company specific fields
        customerData = {
          ...baseData,
          accountNumber: formData.accountNumber,
          vatNumber: formData.vatNumber,
        };
      } else {
        // Add individual specific fields
        customerData = {
          ...baseData,
          gender: formData.gender,
          dateOfBirth: new Date(formData.dateOfBirth),
          age: calculateAge(new Date(formData.dateOfBirth)),
          nationalInsuranceNumber: formData.nationalInsuranceNumber,
          
          driverLicenseNumber: formData.driverLicenseNumber,
          issueNumber: formData.issueNumber, // [NEW]
          countryOfIssue: formData.countryOfIssue, // [NEW]
          
          licenseValidFrom: new Date(formData.licenseValidFrom),
          licenseExpiry: new Date(formData.licenseExpiry),
          badgeNumber: formData.badgeNumber,
          billExpiry: new Date(formData.billExpiry),
          signature: formData.signature,
        };
        
        const docPath = customer?.id || doc(collection(db, 'customers')).id;

        if (documents.licenseFront) {
          const storageRef = ref(storage, `customers/${docPath}/license-front`);
          const snapshot = await uploadBytes(storageRef, documents.licenseFront);
          documentUrls.licenseFrontUrl = await getDownloadURL(snapshot.ref);
        }
        if (documents.licenseBack) {
          const storageRef = ref(storage, `customers/${docPath}/license-back`);
          const snapshot = await uploadBytes(storageRef, documents.licenseBack);
          documentUrls.licenseBackUrl = await getDownloadURL(snapshot.ref);
        }
        if (documents.billDocument) {
          const storageRef = ref(storage, `customers/${docPath}/bill`);
          const snapshot = await uploadBytes(storageRef, documents.billDocument);
          documentUrls.billDocumentUrl = await getDownloadURL(snapshot.ref);
        }
      }

      if (customer) {
        await updateDoc(doc(db, 'customers', customer.id), { ...customerData, ...documentUrls });
        toast.success('Customer updated successfully');
      } else {
        await addDoc(collection(db, 'customers'), { ...customerData, ...documentUrls });
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
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* SECTION 1: Basic Information */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
        <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <User className="w-4 h-4 mr-2" /> Basic Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Client Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomerType })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="customer">Customer</option>
              <option value="claim">Claim</option>
              <option value="company">Company</option>
            </select>
          </div>
          
          <FormField label="Full Name / Company Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <FormField type="tel" label="Mobile Number" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} required />
          <FormField type="email" label="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          
          <div className="md:col-span-2">
            <FormField label="Full Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
          </div>
        </div>
      </div>

      {/* SECTION 2: Company Specifics */}
      {isCompany && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-md font-semibold text-blue-800 mb-4 flex items-center">
            <CreditCard className="w-4 h-4 mr-2" /> Company Financials
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Account Number" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
            <FormField label="VAT Number" value={formData.vatNumber} onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })} />
          </div>
        </div>
      )}
      
      {/* SECTION 3: Personal & License Details (Non-Company) */}
      {!isCompany && (
        <>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
               <CreditCard className="w-4 h-4 mr-2" /> Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <FormField type="date" label="Date of Birth" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} required />
              <FormField label="National Insurance Number" value={formData.nationalInsuranceNumber} onChange={(e) => setFormData({ ...formData, nationalInsuranceNumber: e.target.value })} required />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2" /> License & Badge Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* --- NEW COUNTRY OF ISSUE FIELD --- */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                   <Globe className="w-3 h-3 mr-1 text-gray-500" /> Country of Issue
                </label>
                <input
                  list="countries"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Type to search country..."
                  value={formData.countryOfIssue}
                  onChange={(e) => setFormData({ ...formData, countryOfIssue: e.target.value })}
                />
                <datalist id="countries">
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
              </div>

              {/* --- LICENSE NUMBER & ISSUE NUMBER ROW --- */}
              <FormField 
                label="Driver License Number" 
                value={formData.driverLicenseNumber} 
                onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })} 
                required 
              />
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Hash className="w-3 h-3 mr-1 text-gray-500" /> Issue Number
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  value={formData.issueNumber}
                  onChange={(e) => setFormData({ ...formData, issueNumber: e.target.value })}
                  placeholder="e.g. 01"
                />
              </div>

              <FormField type="date" label="License Valid From" value={formData.licenseValidFrom} onChange={(e) => setFormData({ ...formData, licenseValidFrom: e.target.value })} required />
              <FormField type="date" label="License Expiry" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} required />
              
              <FormField label="Badge Number" value={formData.badgeNumber} onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })} required />
              <FormField type="date" label="Bill Expiry" value={formData.billExpiry} onChange={(e) => setFormData({ ...formData, billExpiry: e.target.value })} required />
            </div>
          </div>
        </>
      )}

      {/* SECTION 4: Uploads & Signature */}
      {!isCompany && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
           <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
              <Upload className="w-4 h-4 mr-2" /> Documents & Signature
           </h3>
          <div className="space-y-4">
            {/* License Front */}
            <div>
              <label className="block text-sm font-medium text-gray-700">License Front</label>
              <div className="mt-1 flex items-center space-x-4">
                {documentPreviews.licenseFront && <img src={documentPreviews.licenseFront} alt="License Front" className="h-20 w-32 object-cover rounded-md border" />}
                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Upload className="h-5 w-5 mr-2 text-gray-400" /> Choose File <input type="file" className="hidden" accept="image/*" onChange={handleDocumentChange('licenseFront')} />
                </label>
              </div>
            </div>
            {/* License Back */}
            <div>
              <label className="block text-sm font-medium text-gray-700">License Back</label>
              <div className="mt-1 flex items-center space-x-4">
                {documentPreviews.licenseBack && <img src={documentPreviews.licenseBack} alt="License Back" className="h-20 w-32 object-cover rounded-md border" />}
                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Upload className="h-5 w-5 mr-2 text-gray-400" /> Choose File <input type="file" className="hidden" accept="image/*" onChange={handleDocumentChange('licenseBack')} />
                </label>
              </div>
            </div>
            {/* Bill Document */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Bill Document</label>
              <div className="mt-1 flex items-center space-x-4">
                {documentPreviews.billDocument && <img src={documentPreviews.billDocument} alt="Bill Document" className="h-20 w-32 object-cover rounded-md border" />}
                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Upload className="h-5 w-5 mr-2 text-gray-400" /> Choose File <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleDocumentChange('billDocument')} />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <CustomerSignature value={formData.signature} onChange={handleSignatureChange} disabled={loading} />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400 shadow-sm">
          {loading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;