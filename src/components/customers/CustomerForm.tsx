// src/components/customers/CustomerForm.tsx
import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Customer, Gender, CustomerType, calculateAge } from '../../types/customer';
import { Upload, User, FileText, CreditCard, Globe, Hash, Camera, Eye, Trash2, RefreshCw } from 'lucide-react';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import CustomerSignature from './CustomerSignature';
import { combineFullName, combineFullAddress, splitFullName, splitFullAddress } from '../../utils/nameAddressUtils';
import { formatSignatureTimestamp, stampSignatureImage } from '../../utils/signatureStamp';
import { CustomerAvatar } from './CustomerAvatar';
import { uploadProfilePicture, compressImageFile } from '../../utils/imageUtils';

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

  const initialName = customer?.firstName
    ? { firstName: customer.firstName, middleName: customer.middleName || '', lastName: customer.lastName || '' }
    : splitFullName(customer?.name);

  const initialAddress = (customer?.buildingFlat || customer?.streetName)
    ? {
        buildingFlat: customer.buildingFlat || '',
        streetName: customer.streetName || '',
        townCity: customer.townCity || '',
        postcode: customer.postcode || '',
        country: customer.country || 'United Kingdom',
      }
    : splitFullAddress(customer?.address);

  const [formData, setFormData] = useState({
    type: customer?.type || 'customer' as CustomerType,
    name: customer?.name || '',
    firstName: initialName.firstName,
    middleName: initialName.middleName,
    lastName: initialName.lastName,
    mobile: customer?.mobile || '',
    email: customer?.email || '',
    address: customer?.address || '',
    buildingFlat: initialAddress.buildingFlat,
    streetName: initialAddress.streetName,
    townCity: initialAddress.townCity,
    postcode: initialAddress.postcode,
    country: initialAddress.country || 'United Kingdom',
    
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

  const handleFirstNameChange = (firstName: string) => {
    setFormData(prev => {
      const name = combineFullName(firstName, prev.middleName, prev.lastName);
      return { ...prev, firstName, name };
    });
  };

  const handleMiddleNameChange = (middleName: string) => {
    setFormData(prev => {
      const name = combineFullName(prev.firstName, middleName, prev.lastName);
      return { ...prev, middleName, name };
    });
  };

  const handleLastNameChange = (lastName: string) => {
    setFormData(prev => {
      const name = combineFullName(prev.firstName, prev.middleName, lastName);
      return { ...prev, lastName, name };
    });
  };

  const handleBuildingFlatChange = (buildingFlat: string) => {
    setFormData(prev => {
      const address = combineFullAddress(buildingFlat, prev.streetName, prev.townCity, prev.postcode, prev.country);
      return { ...prev, buildingFlat, address };
    });
  };

  const handleStreetNameChange = (streetName: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, streetName, prev.townCity, prev.postcode, prev.country);
      return { ...prev, streetName, address };
    });
  };

  const handleTownCityChange = (townCity: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, townCity, prev.postcode, prev.country);
      return { ...prev, townCity, address };
    });
  };

  const handlePostcodeChange = (postcode: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, prev.townCity, postcode, prev.country);
      return { ...prev, postcode, address };
    });
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, prev.townCity, prev.postcode, country);
      return { ...prev, country, address };
    });
  };

  const [documents, setDocuments] = useState<{
    licenseFront: File | null;
    licenseBack: File | null;
    billDocument: File | null;
  }>({ licenseFront: null, licenseBack: null, billDocument: null });

  const [termsAccepted, setTermsAccepted] = useState<boolean>(
    Boolean(customer?.termsAccepted || (customer?.signature && customer?.signature.length > 0))
  );

  // Profile Picture state
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    customer?.profilePictureUrl || null
  );
  const [profilePictureRemoved, setProfilePictureRemoved] = useState(false);
  const [isViewingPicture, setIsViewingPicture] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const profileFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleProfilePictureSelect = async (file: File) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validMimes.includes(file.type) && !validExtensions.includes(ext)) {
      toast.error('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    try {
      const preview = await compressImageFile(file, 600, 600, 0.82);
      setProfilePictureFile(file);
      setProfilePicturePreview(preview);
      setProfilePictureRemoved(false);
      toast.success('Profile picture selected');
    } catch (err) {
      console.error('Image compression error:', err);
      toast.error('Failed to process image file');
    }
  };

  const handleProfilePictureRemove = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setProfilePictureRemoved(true);
    if (profileFileInputRef.current) profileFileInputRef.current.value = '';
    toast.success('Profile picture removed');
  };

  const handleProfileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProfilePictureSelect(file);
  };

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

    if (formData.signature && !termsAccepted) {
      toast.error('You must accept the Terms & Conditions to submit the signature.');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = (formData.email || '').trim().toLowerCase();
      let finalSignature = formData.signature;
      let sigTimestamp = customer?.signatureTimestamp;
      let signedAt = customer?.signedAt;

      // If a new or updated signature is present, stamp timestamp & metadata
      if (formData.signature && formData.signature !== customer?.signature) {
        const now = new Date();
        sigTimestamp = formatSignatureTimestamp(now);
        signedAt = now;
        finalSignature = await stampSignatureImage(formData.signature, sigTimestamp, formData.name);
      }

      // Handle Customer Profile Picture upload / removal
      let finalProfilePictureUrl: string | null = customer?.profilePictureUrl || null;
      if (profilePictureRemoved) {
        finalProfilePictureUrl = null;
      } else if (profilePictureFile) {
        const docPath = customer?.id || doc(collection(db, 'customers')).id;
        try {
          finalProfilePictureUrl = await uploadProfilePicture(profilePictureFile, docPath);
        } catch (uploadErr) {
          console.warn('Profile picture upload failed, using preview URL:', uploadErr);
          finalProfilePictureUrl = profilePicturePreview;
        }
      }

      const baseData = {
        type: formData.type,
        name: formData.name,
        profilePictureUrl: finalProfilePictureUrl,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        mobile: formData.mobile,
        email: normalizedEmail,
        address: formData.address,
        buildingFlat: formData.buildingFlat,
        streetName: formData.streetName,
        townCity: formData.townCity,
        postcode: formData.postcode,
        country: formData.country,
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
          signature: finalSignature,
          signatureTimestamp: sigTimestamp || null,
          signedAt: signedAt || null,
          termsAccepted: Boolean(finalSignature && termsAccepted),
          termsAcceptedAt: Boolean(finalSignature && termsAccepted) ? (customer?.termsAcceptedAt || new Date()) : null,
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
          signature: finalSignature,
          signatureTimestamp: sigTimestamp || null,
          signedAt: signedAt || null,
          termsAccepted: Boolean(finalSignature && termsAccepted),
          termsAcceptedAt: Boolean(finalSignature && termsAccepted) ? (customer?.termsAcceptedAt || new Date()) : null,
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
      
      {/* SECTION: Customer Profile Picture */}
      <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center">
            <Camera className="w-4 h-4 mr-2 text-blue-600" /> Member Profile Picture
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            JPG, PNG, or WEBP
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Preview */}
          <div className="relative group shrink-0">
            <CustomerAvatar
              name={formData.name || combineFullName(formData.firstName, formData.middleName, formData.lastName)}
              firstName={formData.firstName}
              lastName={formData.lastName}
              isCompany={isCompany}
              profilePictureUrl={profilePicturePreview}
              size="2xl"
              shape="rounded"
              className={profilePicturePreview ? 'ring-2 ring-blue-500/30 shadow-md' : 'shadow-xs'}
            />
            {profilePicturePreview && (
              <button
                type="button"
                onClick={() => setIsViewingPicture(true)}
                className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1 cursor-pointer"
                title="View full picture"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
            )}
          </div>

          {/* Upload Dropzone & Controls */}
          <div className="flex-1 w-full space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleProfileDrop}
              onClick={() => profileFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-white'
              }`}
            >
              <input
                ref={profileFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfilePictureSelect(file);
                }}
              />
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">
                Click to choose or drag & drop profile picture
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Recommended max size 5MB (JPG, PNG, or WEBP)
              </p>
            </div>

            {/* Action Controls: Upload, View, Remove */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => profileFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>{profilePicturePreview ? 'Change Picture' : 'Upload Profile Picture'}</span>
              </button>

              {profilePicturePreview && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsViewingPicture(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Size</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleProfilePictureRemove}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Picture</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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
          
          {isCompany ? (
            <div className="md:col-span-2">
              <FormField label="Company Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
          ) : (
            <>
              <div className="md:col-span-2">
                <FormField label="First Name" value={formData.firstName} onChange={(e) => handleFirstNameChange(e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <FormField label="Middle Name" value={formData.middleName} onChange={(e) => handleMiddleNameChange(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <FormField label="Last Name" value={formData.lastName} onChange={(e) => handleLastNameChange(e.target.value)} required />
              </div>
            </>
          )}
          
          <FormField type="tel" label="Mobile Number" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} required />
          <FormField type="email" label="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          
          <div className="md:col-span-2">
            <FormField label="Building Name / Flat Number" value={formData.buildingFlat} onChange={(e) => handleBuildingFlatChange(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <FormField label="Street Name" value={formData.streetName} onChange={(e) => handleStreetNameChange(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <FormField label="Town / City" value={formData.townCity} onChange={(e) => handleTownCityChange(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <FormField label="Postcode" value={formData.postcode} onChange={(e) => handlePostcodeChange(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <FormField label="Country" value={formData.country} onChange={(e) => handleCountryChange(e.target.value)} required />
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
            <CustomerSignature
              value={formData.signature}
              onChange={handleSignatureChange}
              termsAccepted={termsAccepted}
              onTermsAcceptedChange={setTermsAccepted}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button
          type="submit"
          disabled={loading || Boolean(formData.signature && !termsAccepted)}
          className="px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          {loading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
      {/* Full Size Picture Preview Lightbox */}
      {isViewingPicture && profilePicturePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsViewingPicture(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Profile Picture Preview</h3>
              <button
                type="button"
                onClick={() => setIsViewingPicture(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={profilePicturePreview}
                alt="Profile Preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsViewingPicture(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default CustomerForm;