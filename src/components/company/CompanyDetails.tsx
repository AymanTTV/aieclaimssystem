
// src/components/company/CompanyDetails.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CompanyLogo from './CompanyLogo';
import FormField from '../ui/FormField';
import {
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Landmark,
  Building2,
  CreditCard,
  Shield,
  Star,
  Image as ImageIcon,
  Globe,
  Phone,
  Mail,
  Link as LinkIcon,
  Layers,
  Loader2,
  X,
  Lock,
  Unlock,
  FileCheck,
  FileSignature,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SignaturePad from "../ui/SignaturePad";
import { usePermissions } from '../../hooks/usePermissions'; // Added Permissions
import { CompanyBankAccount, DEFAULT_COMPANY_BANK_ACCOUNTS } from '../../utils/bankAccountAllocation';
import {
  CompanyEntity,
  PRESET_COMPANY_ENTITIES,
  DocumentModuleEntityMapping,
  DEFAULT_MODULE_ENTITY_MAPPING,
  DocumentTypeDefaultSettings,
  ManagerDocumentDefaults,
  DEFAULT_MANAGER_DOCUMENT_DEFAULTS,
  getPageLayoutOptions,
} from '../../utils/entityBranding';
import { fileToBase64, validateImage, uploadImage } from '../../utils/imageUpload';

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

  // Bank details (legacy single fields)
  bankName: string;
  sortCode: string;
  accountNumber: string;
  vatNumber: string;
  registrationNumber: string;

  // Multi-bank accounts allocation
  bankAccounts?: CompanyBankAccount[];

  // Entity & branding profiles
  entities?: CompanyEntity[];

  // Module entity routing
  moduleEntityMapping?: DocumentModuleEntityMapping;

  // Manager Document Defaults & Role Locking
  managerDocumentDefaults?: ManagerDocumentDefaults;

  // Document terms
  termsAndConditions: string;
  signature: string;

  // Rental document terms
  conditionOfHireText: string;
  creditHireMitigationText: string;
  noticeOfRightToCancelText: string;
  creditStorageAndRecoveryText: string;
  hireAgreementText: string;
  rentalInvoiceTerms: string;
  satisfactionNoticeText: string;

  // Vehicle document terms
  vehicleTerms: string;
  vehicleTermsAIESkyline: string; // ✅ NEW FIELD
  vehicleTermsOtherOwners: string; // ✅ NEW FIELD
  maintenanceTerms: string;
  accidentTerms: string;
  personalInjuryTerms: string;
  vdFinanceTerms: string;
  driverPayTerms: string;
  pettyCashTerms: string;
  vatRecordTerms: string;
  customerTerms: string;
  generalInvoiceTerms: string; // ✅ ADDED THIS FIELD

  

  // Additional terms
  privacyPolicy: string;
  dataProtectionPolicy: string;
  disclaimerText: string;
}

const defaultState: CompanySettings = {
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
  bankAccounts: DEFAULT_COMPANY_BANK_ACCOUNTS,
  entities: PRESET_COMPANY_ENTITIES,
  moduleEntityMapping: DEFAULT_MODULE_ENTITY_MAPPING,
  managerDocumentDefaults: DEFAULT_MANAGER_DOCUMENT_DEFAULTS,
  termsAndConditions: '',
  signature: '',
  conditionOfHireText: '',
  creditHireMitigationText: '',
  noticeOfRightToCancelText: '',
  creditStorageAndRecoveryText: '',
  hireAgreementText: '',
  rentalInvoiceTerms: '',
  satisfactionNoticeText: '',
  vehicleTerms: '',
  vehicleTermsAIESkyline: '', // ✅ NEW DEFAULT
  vehicleTermsOtherOwners: '', // ✅ NEW DEFAULT
  maintenanceTerms: '',
  accidentTerms: '',
  personalInjuryTerms: '',
  vdFinanceTerms: '',
  driverPayTerms: '',
  pettyCashTerms: '',
  vatRecordTerms: '',
  customerTerms: '',
  generalInvoiceTerms: '', 
  privacyPolicy: '',
  dataProtectionPolicy: '',
  disclaimerText: ''
};

const CompanyDetails = () => {
  const { user } = useAuth();
  const { can } = usePermissions(); // Initialize Permissions
  
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanySettings>(defaultState);

  const borderColors = ['border-red-500', 'border-green-500', 'border-blue-500'];
  const [currentBorderColorIndex, setCurrentBorderColorIndex] = useState(0);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const docRef = doc(db, 'companySettings', 'details');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // ✅ Merge with default state to prevent uncontrolled input warnings for new fields
          setFormData({
            ...defaultState,
            ...data
          } as CompanySettings);
          
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (editing) {
      interval = setInterval(() => {
        setCurrentBorderColorIndex((prevIndex) => (prevIndex + 1) % borderColors.length);
      }, 1000); 
    }
    return () => clearInterval(interval); 
  }, [editing, borderColors.length]);


  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBank, setNewBank] = useState<Partial<CompanyBankAccount>>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    sortCode: '',
    iban: '',
    currency: 'GBP (£)',
    notes: '',
    isDefault: false,
  });

  const handleSetDefaultBank = (bankId: string) => {
    if (!editing) return;
    const currentBanks = formData.bankAccounts || DEFAULT_COMPANY_BANK_ACCOUNTS;
    const updated = currentBanks.map((b) => ({
      ...b,
      isDefault: b.id === bankId,
    }));
    const selected = updated.find((b) => b.id === bankId);
    setFormData({
      ...formData,
      bankAccounts: updated,
      bankName: selected?.bankName || formData.bankName,
      accountNumber: selected?.accountNumber || formData.accountNumber,
      sortCode: selected?.sortCode || formData.sortCode,
    });
    toast.success(`${selected?.bankName || 'Account'} set as primary payment default.`);
  };

  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.sortCode) {
      toast.error('Please enter Bank Name, Account Number, and Sort Code.');
      return;
    }
    const bankId = `bank_${Date.now()}`;
    const currentBanks = formData.bankAccounts || DEFAULT_COMPANY_BANK_ACCOUNTS;
    const accountToAdd: CompanyBankAccount = {
      id: bankId,
      bankName: newBank.bankName,
      accountName: newBank.accountName || formData.fullName || 'AIE Skyline Limited',
      accountNumber: newBank.accountNumber,
      sortCode: newBank.sortCode,
      iban: newBank.iban || '',
      currency: newBank.currency || 'GBP (£)',
      notes: newBank.notes || '',
      isDefault: currentBanks.length === 0,
    };
    setFormData({
      ...formData,
      bankAccounts: [...currentBanks, accountToAdd],
    });
    setNewBank({
      bankName: '',
      accountName: '',
      accountNumber: '',
      sortCode: '',
      iban: '',
      currency: 'GBP (£)',
      notes: '',
    });
    setShowAddBankModal(false);
    toast.success('Company bank account added.');
  };

  const handleDeleteBank = (bankId: string) => {
    if (!editing) return;
    const currentBanks = formData.bankAccounts || DEFAULT_COMPANY_BANK_ACCOUNTS;
    if (currentBanks.length <= 1) {
      toast.error('At least one bank account must remain.');
      return;
    }
    const updated = currentBanks.filter((b) => b.id !== bankId);
    if (!updated.some((b) => b.isDefault) && updated.length > 0) {
      updated[0].isDefault = true;
    }
    setFormData({
      ...formData,
      bankAccounts: updated,
    });
    toast.success('Bank account removed.');
  };

  const handleUpdateEntity = (entityIndex: number, field: keyof CompanyEntity, value: any) => {
    if (!editing) return;
    const currentEntities = [...(formData.entities || PRESET_COMPANY_ENTITIES)];
    if (currentEntities[entityIndex]) {
      currentEntities[entityIndex] = {
        ...currentEntities[entityIndex],
        [field]: value,
      };
      setFormData({
        ...formData,
        entities: currentEntities,
      });
    }
  };

  const [uploadingLogoIdx, setUploadingLogoIdx] = useState<number | null>(null);

  const handleEntityLogoUpload = async (idx: number, file: File) => {
    if (!editing) return;
    if (!file) return;
    if (!validateImage(file)) return;

    setUploadingLogoIdx(idx);
    try {
      // 1. Convert to Base64 data URI (downscaled to max 512x512) for instant live preview and rock-solid persistence
      const base64Uri = await fileToBase64(file, 512, 512);

      // Immediately save to the entity's logoUrl property
      handleUpdateEntity(idx, 'logoUrl', base64Uri);

      // 2. Attempt Firebase Storage upload in background if available
      try {
        const storageUrl = await uploadImage(file, 'company/entities');
        if (storageUrl) {
          handleUpdateEntity(idx, 'logoUrl', storageUrl);
        }
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, keeping Base64 data URI:', storageErr);
      }

      toast.success('Entity logo uploaded successfully');
    } catch (err: any) {
      console.error('Failed to process entity logo:', err);
      toast.error('Failed to process logo image');
    } finally {
      setUploadingLogoIdx(null);
    }
  };

  const handleAddEntity = () => {
    if (!editing) return;
    const current = formData.entities || PRESET_COMPANY_ENTITIES;
    const ts = Date.now();
    const newEnt: CompanyEntity = {
      id: `entity_${ts}`,
      key: `custom_entity_${ts}`,
      fullName: 'New Corporate Entity Ltd',
      tradingName: 'New Entity',
      registrationNumber: '',
      vatNumber: '',
      officialAddress: formData.officialAddress || 'United House, 39-41 North Road, London, N7 9DP',
      phone: formData.phone || '',
      email: formData.email || '',
      website: '',
      logoUrl: '',
      headerDisclaimer: '',
      footerDisclaimer: '',
      isDefault: false,
      assignedModules: [],
    };
    setFormData({
      ...formData,
      entities: [...current, newEnt],
    });
    toast.success('New entity profile added. Customize details and click Save Changes.');
  };

  const handleDeleteEntity = (id: string) => {
    if (!editing) return;
    const current = formData.entities || PRESET_COMPANY_ENTITIES;
    if (current.length <= 1) {
      toast.error('At least one corporate entity profile must remain.');
      return;
    }
    const updated = current.filter((e) => e.id !== id);
    if (!updated.some((e) => e.isDefault) && updated.length > 0) {
      updated[0].isDefault = true;
    }
    setFormData({
      ...formData,
      entities: updated,
    });
    toast.success('Entity profile removed.');
  };

  const handleSetDefaultEntity = (id: string) => {
    if (!editing) return;
    const current = formData.entities || PRESET_COMPANY_ENTITIES;
    const updated = current.map((e) => ({
      ...e,
      isDefault: e.id === id,
    }));
    setFormData({
      ...formData,
      entities: updated,
    });
    toast.success('Default corporate entity set.');
  };

  const handleModuleMappingChange = (module: keyof DocumentModuleEntityMapping, entityKey: string) => {
    if (!editing) return;
    const current = formData.moduleEntityMapping || DEFAULT_MODULE_ENTITY_MAPPING;
    setFormData({
      ...formData,
      moduleEntityMapping: {
        ...current,
        [module]: entityKey,
      },
    });
    toast.success(`Default entity for ${module.replace('EntityKey', '')} updated.`);
  };

  const [activeDefaultDocType, setActiveDefaultDocType] = useState<'rental' | 'claim' | 'invoice' | 'vehicle'>('rental');

  const handleManagerDocDefaultChange = (
    docType: 'rental' | 'claim' | 'invoice' | 'vehicle',
    field: keyof DocumentTypeDefaultSettings,
    value: any
  ) => {
    if (!editing) return;
    const currentDefaults = formData.managerDocumentDefaults || DEFAULT_MANAGER_DOCUMENT_DEFAULTS;
    const currentDocDefaults = currentDefaults[docType] || DEFAULT_MANAGER_DOCUMENT_DEFAULTS[docType];

    const updatedDocDefaults = {
      ...currentDocDefaults,
      [field]: value,
    };

    const updatedDefaults = {
      ...currentDefaults,
      [docType]: updatedDocDefaults,
    };

    // Also sync moduleEntityMapping if entityKey changed
    let updatedModuleMapping = formData.moduleEntityMapping || DEFAULT_MODULE_ENTITY_MAPPING;
    if (field === 'entityKey') {
      const mappingKey =
        docType === 'rental' ? 'rentalsEntityKey' :
        docType === 'claim' ? 'claimsEntityKey' :
        docType === 'invoice' ? 'invoicesEntityKey' : 'vehiclesEntityKey';
      updatedModuleMapping = {
        ...updatedModuleMapping,
        [mappingKey]: value,
      };
    }

    setFormData({
      ...formData,
      managerDocumentDefaults: updatedDefaults,
      moduleEntityMapping: updatedModuleMapping,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const docRef = doc(db, 'companySettings', 'details');

      await setDoc(docRef, {
        ...formData,
        updatedAt: new Date(),
        updatedBy: user.id
      }, { merge: true });

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
      if (isTermsField) {
        return `${baseClasses} ${borderColors[currentBorderColorIndex]} focus:ring-primary focus:border-primary`;
      }
      return `${baseClasses} border-gray-300 focus:ring-primary focus:border-primary`;
    } else {
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
        
        {/* Permission Check on Edit Button */}
        {!editing ? (
          can('company', 'update') && (
            <button
              onClick={() => setEditing(true)}
              className="px-6 py-2 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit Details
            </button>
          )
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
        
        {/* Company Logo - Blocks clicks if not editing */}
        <div className={`md:col-span-2 lg:col-span-3 mb-6 ${!editing ? 'pointer-events-none' : ''}`}>
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
            className={getBorderClasses(false)} 
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

        {/* Bank Details & Multi-Account Allocation */}
        <div className="md:col-span-2 lg:col-span-2 space-y-5 p-5 border border-gray-200 rounded-xl shadow-xs bg-white">
          <div className="flex flex-wrap items-center justify-between border-b pb-3 gap-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <span>Company Bank Accounts (Multi-Account Allocation)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Register multiple company banking accounts (Barclays, Lloyds, etc.). On Invoice and Document creation, select which account details print.
              </p>
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => setShowAddBankModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bank Account</span>
              </button>
            )}
          </div>

          {/* List of Registered Bank Accounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(formData.bankAccounts || DEFAULT_COMPANY_BANK_ACCOUNTS).map((acc) => (
              <div
                key={acc.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  acc.isDefault
                    ? 'border-indigo-400 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-200'
                    : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-500" />
                      <span>{acc.bankName}</span>
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium block">
                      {acc.accountName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {acc.isDefault ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white rounded-md shadow-xs">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Primary Default</span>
                      </span>
                    ) : (
                      editing && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultBank(acc.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-gray-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-gray-200 rounded-md transition cursor-pointer"
                          title="Set as Default Account"
                        >
                          Set Default
                        </button>
                      )
                    )}

                    {editing && !acc.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(acc.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Remove Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-gray-100 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 font-sans block">Account Number</span>
                    <span className="font-bold text-gray-800">{acc.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-sans block">Sort Code</span>
                    <span className="font-bold text-gray-800">{acc.sortCode}</span>
                  </div>
                  {acc.iban && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-400 font-sans block">IBAN</span>
                      <span className="text-[11px] text-gray-700 truncate block">{acc.iban}</span>
                    </div>
                  )}
                </div>

                {acc.notes && (
                  <div className="text-[11px] text-gray-500 italic mt-2 px-1">
                    {acc.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Bank Account Inline Modal/Form */}
          {showAddBankModal && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="font-bold text-xs text-indigo-900">Add New Company Bank Account</span>
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    value={newBank.bankName}
                    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                    placeholder="e.g. Barclays Bank UK PLC"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={newBank.accountName}
                    onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                    placeholder="e.g. AIE Skyline Limited"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">Account Number *</label>
                  <input
                    type="text"
                    value={newBank.accountNumber}
                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                    placeholder="8-digit account number"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">Sort Code *</label>
                  <input
                    type="text"
                    value={newBank.sortCode}
                    onChange={(e) => setNewBank({ ...newBank, sortCode: e.target.value })}
                    placeholder="00-00-00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">IBAN (Optional)</label>
                  <input
                    type="text"
                    value={newBank.iban}
                    onChange={(e) => setNewBank({ ...newBank, iban: e.target.value })}
                    placeholder="GB00XXXX00000000000000"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">Notes / Purpose</label>
                  <input
                    type="text"
                    value={newBank.notes}
                    onChange={(e) => setNewBank({ ...newBank, notes: e.target.value })}
                    placeholder="e.g. Rental payments, Claims recoveries"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddBank}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </div>
          )}

          {/* Primary Legal Tax Identifiers */}
          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              placeholder="14592207"
              className={getBorderClasses(false)}
            />
          </div>
        </div>

        {/* Corporate Entity & Page-Specific Branding Profiles */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-5 p-5 border border-gray-200 rounded-xl shadow-xs bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Entity &amp; Logo Manager (Multi-Brand Profiles)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Create and save multiple Corporate Entity Profiles (e.g. AIE Skyline Limited, AIE Claims Ltd, Skyline Cabs, or custom third-party brands) with distinct logos, registration numbers, VAT, and contact details.
              </p>
            </div>
            {editing && (
              <button
                type="button"
                onClick={handleAddEntity}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entity Profile</span>
              </button>
            )}
          </div>

          {/* Manager Document Defaults & Role Locking Engine Card */}
          <div className="p-5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Manager Document Defaults &amp; Role-Locking Capability
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Configure and lock the system default Entity Profile, Bank Account, and Page Template mappings per document type. When locked, users without override permissions are restricted from modifying these parameters during document preview and generation.
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Manager Controls</span>
                </span>
              </div>
            </div>

            {/* Document Type Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'rental', label: '🚗 Rentals & Hire Agreements' },
                { key: 'claim', label: '⚖️ Claims & Incident Records' },
                { key: 'invoice', label: '🧾 Commercial Invoices' },
                { key: 'vehicle', label: '📋 Fleet & Vehicle Records' },
              ].map((tab) => {
                const isSelected = activeDefaultDocType === tab.key;
                const docDefaults = (formData.managerDocumentDefaults || DEFAULT_MANAGER_DOCUMENT_DEFAULTS)[tab.key as 'rental' | 'claim' | 'invoice' | 'vehicle'] || DEFAULT_MANAGER_DOCUMENT_DEFAULTS[tab.key as 'rental' | 'claim' | 'invoice' | 'vehicle'];
                const isLocked = docDefaults?.isLocked ?? true;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveDefaultDocType(tab.key as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                      isSelected
                        ? isLocked ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-700 text-emerald-100'
                        : isLocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                      <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Document Type Defaults Form */}
            {(() => {
              const docType = activeDefaultDocType;
              const defaults = (formData.managerDocumentDefaults || DEFAULT_MANAGER_DOCUMENT_DEFAULTS)[docType] || DEFAULT_MANAGER_DOCUMENT_DEFAULTS[docType];
              const layoutOpts = getPageLayoutOptions(
                docType === 'rental' ? 'rental_agreement' :
                docType === 'claim' ? 'condition_of_hire' :
                docType === 'invoice' ? 'invoice' : 'rental_agreement'
              );
              const isLocked = defaults.isLocked ?? true;

              return (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  {/* Lock Switch Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isLocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Lock Overrides for Non-Managers:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isLocked ? 'STRICTLY ENFORCED' : 'ALLOW USER OVERRIDES'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isLocked
                            ? 'Admins & non-managers will see inputs disabled and locked to these exact defaults in document preview.'
                            : 'Users with override permissions can adjust entity, bank, and page layouts during preview.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!editing}
                        onClick={() => handleManagerDocDefaultChange(docType, 'isLocked', !isLocked)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          isLocked
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{isLocked ? 'Locked (Click to Unlock)' : 'Unlocked (Click to Lock)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Main Configuration Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Entity Profile */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                        <Building2 className="w-4 h-4" />
                        <span>Default Corporate Entity</span>
                      </div>
                      <select
                        disabled={!editing}
                        value={defaults.entityKey || 'aie_skyline'}
                        onChange={(e) => handleManagerDocDefaultChange(docType, 'entityKey', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white py-2 px-2.5 font-medium text-slate-800 disabled:bg-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        {(formData.entities || PRESET_COMPANY_ENTITIES).map((ent) => (
                          <option key={ent.key} value={ent.key}>
                            {ent.tradingName} ({ent.fullName.slice(0, 24)}...)
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Applies company registration, VAT number, official registered address, and corporate logo.
                      </p>
                    </div>

                    {/* 2. Bank Account Allocation */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                        <Landmark className="w-4 h-4" />
                        <span>Default Bank Account</span>
                      </div>
                      <select
                        disabled={!editing}
                        value={defaults.bankAccountId || (formData.bankAccounts?.[0]?.id || '')}
                        onChange={(e) => handleManagerDocDefaultChange(docType, 'bankAccountId', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white py-2 px-2.5 font-medium text-slate-800 disabled:bg-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        {(formData.bankAccounts || DEFAULT_COMPANY_BANK_ACCOUNTS).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.accountName} - {b.bankName} (•••{b.accountNumber.slice(-4)})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Directs settlement wires, payment instructions, and dynamic payment QR codes to this account.
                      </p>
                    </div>

                    {/* 3. Page Template Mappings */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                        <FileSignature className="w-4 h-4" />
                        <span>Page Template Mappings</span>
                      </div>

                      {/* Page 1 */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Page 1 Layout:</label>
                        <select
                          disabled={!editing}
                          value={defaults.page1Template || layoutOpts.page1Options[0]?.id}
                          onChange={(e) => handleManagerDocDefaultChange(docType, 'page1Template', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2 font-medium text-slate-800 disabled:bg-slate-100"
                        >
                          {layoutOpts.page1Options.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Page 2 */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-600">Page 2 Schedule:</label>
                          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!editing}
                              checked={defaults.includePage2 ?? true}
                              onChange={(e) => handleManagerDocDefaultChange(docType, 'includePage2', e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span>Include Page 2</span>
                          </label>
                        </div>
                        <select
                          disabled={!editing || !(defaults.includePage2 ?? true)}
                          value={defaults.page2Template || layoutOpts.page2Options[0]?.id}
                          onChange={(e) => handleManagerDocDefaultChange(docType, 'page2Template', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2 font-medium text-slate-800 disabled:bg-slate-100"
                        >
                          {layoutOpts.page2Options.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Page 3 */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-600">Page 3 T&amp;C Binding:</label>
                          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!editing}
                              checked={defaults.includePage3 ?? true}
                              onChange={(e) => handleManagerDocDefaultChange(docType, 'includePage3', e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span>Include Page 3</span>
                          </label>
                        </div>
                        <select
                          disabled={!editing || !(defaults.includePage3 ?? true)}
                          value={defaults.page3Template || layoutOpts.page3Options[0]?.id}
                          onChange={(e) => handleManagerDocDefaultChange(docType, 'page3Template', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2 font-medium text-slate-800 disabled:bg-slate-100"
                        >
                          {layoutOpts.page3Options.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Grid of Entity Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(formData.entities || PRESET_COMPANY_ENTITIES).map((entity, idx) => {
              const assignedTo: string[] = [];
              const map = formData.moduleEntityMapping || DEFAULT_MODULE_ENTITY_MAPPING;
              if (map.rentalsEntityKey === entity.key) assignedTo.push('Rentals');
              if (map.claimsEntityKey === entity.key) assignedTo.push('Claims');
              if (map.invoicesEntityKey === entity.key) assignedTo.push('Invoices');
              if (map.vehiclesEntityKey === entity.key) assignedTo.push('Vehicles');

              return (
                <div
                  key={entity.id}
                  className={`p-4 rounded-xl border transition-all ${
                    entity.isDefault
                      ? 'border-indigo-400 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-200'
                      : 'border-gray-200 bg-gray-50/60'
                  } space-y-3.5`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{entity.tradingName || 'Entity Profile'}</span>
                      {entity.isDefault && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          Primary Default
                        </span>
                      )}
                    </div>
                    {editing && (
                      <div className="flex items-center gap-1">
                        {!entity.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultEntity(entity.id)}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                            title="Set as Default Entity"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(formData.entities || PRESET_COMPANY_ENTITIES).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEntity(entity.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete Entity Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Logo Image Preview, URL & Upload Action */}
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center gap-3">
                      {/* Live Preview Thumbnail */}
                      <div className="relative w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 group shadow-2xs">
                        {entity.logoUrl ? (
                          <>
                            <img
                              src={entity.logoUrl}
                              alt={entity.tradingName}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            {editing && (
                              <button
                                type="button"
                                onClick={() => handleUpdateEntity(idx, 'logoUrl', '')}
                                className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                                title="Remove Logo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="w-5 h-5 mb-0.5" />
                            <span className="text-[8px] uppercase tracking-wider font-semibold">No Logo</span>
                          </div>
                        )}
                      </div>

                      {/* Text Input + Upload Button */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                            Logo Image (File or URL)
                          </label>
                          {entity.logoUrl && entity.logoUrl.startsWith('data:image') && (
                            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                              Base64 URI
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={entity.logoUrl || ''}
                            onChange={(e) => handleUpdateEntity(idx, 'logoUrl', e.target.value)}
                            disabled={!editing}
                            placeholder="https://... or click Upload"
                            className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100 focus:outline-none focus:border-indigo-500 truncate"
                          />

                          {/* Hidden File Input */}
                          <input
                            type="file"
                            id={`entity-logo-file-${idx}`}
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleEntityLogoUpload(idx, file);
                                e.target.value = '';
                              }
                            }}
                            className="hidden"
                            disabled={!editing || uploadingLogoIdx === idx}
                          />

                          {/* Upload Logo Button */}
                          <label
                            htmlFor={`entity-logo-file-${idx}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded border transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
                              !editing || uploadingLogoIdx === idx
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed pointer-events-none'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300 active:scale-95'
                            }`}
                            title="Upload PNG / JPEG logo from device"
                          >
                            {uploadingLogoIdx === idx ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3 text-indigo-600" />
                                <span>Upload Logo</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Module Routing Badges */}
                  {assignedTo.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-gray-500">Default for:</span>
                      {assignedTo.map((m) => (
                        <span
                          key={m}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Core Details Form */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Full Legal Company Name</label>
                      <input
                        type="text"
                        value={entity.fullName}
                        onChange={(e) => handleUpdateEntity(idx, 'fullName', e.target.value)}
                        disabled={!editing}
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Trading Name</label>
                        <input
                          type="text"
                          value={entity.tradingName}
                          onChange={(e) => handleUpdateEntity(idx, 'tradingName', e.target.value)}
                          disabled={!editing}
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Entity Key</label>
                        <input
                          type="text"
                          value={entity.key}
                          onChange={(e) => handleUpdateEntity(idx, 'key', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                          disabled={!editing}
                          className="w-full px-2 py-1 text-xs font-mono rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Company Reg Number</label>
                        <input
                          type="text"
                          value={entity.registrationNumber}
                          onChange={(e) => handleUpdateEntity(idx, 'registrationNumber', e.target.value)}
                          disabled={!editing}
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">VAT Number</label>
                        <input
                          type="text"
                          value={entity.vatNumber || ''}
                          onChange={(e) => handleUpdateEntity(idx, 'vatNumber', e.target.value)}
                          disabled={!editing}
                          placeholder="GB123456789"
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Official Registered Address</label>
                      <input
                        type="text"
                        value={entity.officialAddress}
                        onChange={(e) => handleUpdateEntity(idx, 'officialAddress', e.target.value)}
                        disabled={!editing}
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Contact Phone</label>
                        <input
                          type="text"
                          value={entity.phone || ''}
                          onChange={(e) => handleUpdateEntity(idx, 'phone', e.target.value)}
                          disabled={!editing}
                          placeholder="020 1234 5678"
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Contact Email</label>
                        <input
                          type="email"
                          value={entity.email || ''}
                          onChange={(e) => handleUpdateEntity(idx, 'email', e.target.value)}
                          disabled={!editing}
                          placeholder="info@brand.co.uk"
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Website</label>
                      <input
                        type="text"
                        value={entity.website || ''}
                        onChange={(e) => handleUpdateEntity(idx, 'website', e.target.value)}
                        disabled={!editing}
                        placeholder="www.brand.co.uk"
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Header Disclaimer / Tagline</label>
                      <input
                        type="text"
                        value={entity.headerDisclaimer || ''}
                        onChange={(e) => handleUpdateEntity(idx, 'headerDisclaimer', e.target.value)}
                        disabled={!editing}
                        placeholder="Tagline printed beneath header"
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Statutory Footer Disclaimer</label>
                      <textarea
                        rows={2}
                        value={entity.footerDisclaimer || ''}
                        onChange={(e) => handleUpdateEntity(idx, 'footerDisclaimer', e.target.value)}
                        disabled={!editing}
                        placeholder="Dual-line statutory footer"
                        className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100 font-mono text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* Official Address */}
        <div className="md:col-span-2 lg:col-span-1 space-y-5 p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Official Address</h3>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea
            value={formData.officialAddress}
            onChange={(e) => setFormData({ ...formData, officialAddress: e.target.value })}
            rows={4} 
            className={getBorderClasses(false)} 
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
              className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter terms for Hire Agreement document..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Rental Invoice Terms</label>
                <textarea
                  value={formData.rentalInvoiceTerms}
                  onChange={(e) => setFormData({ ...formData, rentalInvoiceTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)}
                  disabled={!editing}
                  placeholder="Enter terms and conditions for the Rental Invoice..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Satisfaction Notice Terms</label>
                <textarea
                  value={formData.satisfactionNoticeText}
                  onChange={(e) => setFormData({ ...formData, satisfactionNoticeText: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter terms for Satisfaction Notice document..."
                />
              </div>
            </div>
          </div>

          {/* Vehicle Documents */}
          {/* Vehicle Documents */}
          <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
            <h4 className="text-xl font-semibold text-gray-800 mb-5 border-b pb-3">Vehicle Documents Terms</h4>
            <div className="space-y-6">
              
              {/* ✅ NEW: AIE Skyline Terms */}
               <div className="pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">Vehicle Terms (AIE Skyline Limited)</label>
                <textarea
                  value={formData.vehicleTermsAIESkyline}
                  onChange={(e) => setFormData({ ...formData, vehicleTermsAIESkyline: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter terms for vehicles owned by AIE Skyline Limited..."
                />
              </div>

              {/* ✅ NEW: Other Owners Terms */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Vehicle Terms (Other Owners)</label>
                <textarea
                  value={formData.vehicleTermsOtherOwners}
                  onChange={(e) => setFormData({ ...formData, vehicleTermsOtherOwners: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter terms for vehicles owned by other owners..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Maintenance Terms</label>
                <textarea
                  value={formData.maintenanceTerms}
                  onChange={(e) => setFormData({ ...formData, maintenanceTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter terms for VAT Record documents..."
                />
              </div>

              {/* ✅ NEW FINANCE INVOICE TERMS ADDED HERE */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-base font-medium text-gray-700 mb-2">Finance Invoice Terms</label>
                <textarea
                  value={formData.generalInvoiceTerms}
                  onChange={(e) => setFormData({ ...formData, generalInvoiceTerms: e.target.value })}
                  rows={10}
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter general finance invoice terms..."
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
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
                  className={getBorderClasses(true)} 
                  disabled={!editing}
                  placeholder="Enter disclaimer text..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* E-Signature */}
        <div className={`col-span-1 md:col-span-2 lg:col-span-3 p-4 border border-gray-200 rounded-lg shadow-sm ${!editing ? 'pointer-events-none' : ''}`}>
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
