// src/components/claims/ClaimDetailsModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Claim, LegalHandler } from '../../types';
import { format, differenceInDays, isValid } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import {
  FileText,
  Download,
  Car,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  MessageCircle,
  Scale,
  ChevronDown,
  Shield,
  Clock,
  Paperclip,
  Users,
  Camera,
  Film,
  Building,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Edit2,
  Save,
  Eye,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Check,
  X
} from 'lucide-react';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, or, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { isLegacyClaimProgress, deriveDisplayStatus, PROGRESS_OPTIONS } from '../../utils/claimProgress';
import {
  resolveNameFields,
  resolveAddressFields,
  combineFullName,
  combineFullAddress,
  splitFullName,
  splitFullAddress
} from '../../utils/nameAddressUtils';
import { resolveLegalHandlerDetails } from '../../utils/claimCommunication';
import ClaimCommunicationModal from './ClaimCommunicationModal';
import CommunicationHistoryTimeline from '../common/CommunicationHistoryTimeline';
import { uploadFile } from '../../utils/uploadFile';
import { uploadAllFiles } from '../../utils/uploadAllFiles';
import { generateClaimProgressDocument } from '../../utils/documentGenerator';
import { ensureValidDate } from '../../utils/dateHelpers';

interface ClaimDetailsProps {
  claim: Claim;
  initialEditMode?: boolean;
  onClose?: () => void;
  onDownloadDocument?: (url: string) => void;
  onWhatsApp?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  onEmail?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
}

function toJsDate(v?: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') {
    try {
      return v.toDate();
    } catch {
      return null;
    }
  }
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  return null;
}

const formatDate = (date: any): string => {
  const jsDate = toJsDate(date);
  if (!jsDate) return 'N/A';
  return format(jsDate, 'dd/MM/yyyy');
};

const formatDateForInput = (date: any): string => {
  const jsDate = toJsDate(date);
  if (!jsDate) return '';
  return format(jsDate, 'yyyy-MM-dd');
};

const formatDateTime = (date: any): string => {
  const jsDate = toJsDate(date);
  if (!jsDate) return 'N/A';
  return format(jsDate, 'dd/MM/yyyy HH:mm');
};

const checkIsExpiring = (dateVal: any) => {
  const d = toJsDate(dateVal);
  if (!d) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return differenceInDays(d, now) <= 7;
};

export const ClaimDetailsModal: React.FC<ClaimDetailsProps> = ({
  claim: initialClaim,
  initialEditMode = false,
  onClose,
  onDownloadDocument,
  onWhatsApp,
  onEmail,
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [currentClaim, setCurrentClaim] = useState<Claim>(initialClaim);
  const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode);
  const [saving, setSaving] = useState(false);
  const [createdByName, setCreatedByName] = useState<string | null>(null);

  // Active top tab state
  type TabId = 'client_vehicle' | 'incident' | 'third_party' | 'evidence' | 'progress';
  const [activeTab, setActiveTab] = useState<TabId>('client_vehicle');

  // Communication modal state
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commChannel, setCommChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [commCategory, setCommCategory] = useState<'general' | 'progress' | 'legal_handler' | 'custom'>('general');
  const [commRecipient, setCommRecipient] = useState<'client' | 'legalHandler'>('client');
  const [activeCommDropdown, setActiveCommDropdown] = useState<'whatsapp' | 'email' | null>(null);
  const commDropdownRef = useRef<HTMLDivElement>(null);

  // Sync initial claim updates
  useEffect(() => {
    setCurrentClaim(initialClaim);
  }, [initialClaim]);

  // Sync initial edit mode changes
  useEffect(() => {
    setIsEditMode(!!initialEditMode);
  }, [initialEditMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (commDropdownRef.current && !commDropdownRef.current.contains(e.target as Node)) {
        setActiveCommDropdown(null);
      }
    };
    if (activeCommDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeCommDropdown]);

  // Fetch creator name
  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (currentClaim.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentClaim.createdBy));
          if (userDoc.exists()) setCreatedByName(userDoc.data().name);
          else setCreatedByName('Unknown User');
        } catch {
          setCreatedByName('Unknown User');
        }
      } else {
        setCreatedByName(null);
      }
    };
    fetchCreatedByName();
  }, [currentClaim.createdBy]);

  // ==========================================
  // EDIT FORM STATE INITIALIZATION
  // ==========================================
  // 1. Client fields (Granular)
  const initialClientName = useMemo(() => resolveNameFields(currentClaim.clientInfo), [currentClaim]);
  const initialClientAddr = useMemo(() => resolveAddressFields(currentClaim.clientInfo), [currentClaim]);

  const [clientFirstName, setClientFirstName] = useState(initialClientName.firstName || '');
  const [clientMiddleName, setClientMiddleName] = useState(initialClientName.middleName || '');
  const [clientLastName, setClientLastName] = useState(initialClientName.lastName || '');
  const [clientPhone, setClientPhone] = useState(currentClaim.clientInfo?.phone || '');
  const [clientEmail, setClientEmail] = useState(currentClaim.clientInfo?.email || '');
  const [clientDOB, setClientDOB] = useState(formatDateForInput(currentClaim.clientInfo?.dateOfBirth));
  const [clientNI, setClientNI] = useState(currentClaim.clientInfo?.nationalInsuranceNumber || '');
  const [clientDriverLicense, setClientDriverLicense] = useState(currentClaim.clientInfo?.driverLicenseNumber || '');
  const [clientLicenseExpiry, setClientLicenseExpiry] = useState(formatDateForInput(currentClaim.clientInfo?.licenseExpiry));
  const [clientOccupation, setClientOccupation] = useState(currentClaim.clientInfo?.occupation || '');
  const [clientInjuryDetails, setClientInjuryDetails] = useState(currentClaim.clientInfo?.injuryDetails || '');

  // Address inputs (Granular)
  const [clientBuildingFlat, setClientBuildingFlat] = useState(initialClientAddr.buildingFlat || '');
  const [clientStreetName, setClientStreetName] = useState(initialClientAddr.streetName || '');
  const [clientTownCity, setClientTownCity] = useState(initialClientAddr.townCity || '');
  const [clientPostcode, setClientPostcode] = useState(initialClientAddr.postcode || '');
  const [clientCountry, setClientCountry] = useState(initialClientAddr.country || 'United Kingdom');

  // Registered Keeper
  const initialRkName = useMemo(() => resolveNameFields(currentClaim.registerKeeper), [currentClaim]);
  const initialRkAddr = useMemo(() => resolveAddressFields(currentClaim.registerKeeper), [currentClaim]);

  const [rkEnabled, setRkEnabled] = useState(!!currentClaim.registerKeeper?.enabled);
  const [rkFirstName, setRkFirstName] = useState(initialRkName.firstName || '');
  const [rkMiddleName, setRkMiddleName] = useState(initialRkName.middleName || '');
  const [rkLastName, setRkLastName] = useState(initialRkName.lastName || '');
  const [rkBuildingFlat, setRkBuildingFlat] = useState(initialRkAddr.buildingFlat || '');
  const [rkStreetName, setRkStreetName] = useState(initialRkAddr.streetName || '');
  const [rkTownCity, setRkTownCity] = useState(initialRkAddr.townCity || '');
  const [rkPostcode, setRkPostcode] = useState(initialRkAddr.postcode || '');
  const [rkCountry, setRkCountry] = useState(initialRkAddr.country || 'United Kingdom');
  const [rkPhone, setRkPhone] = useState(currentClaim.registerKeeper?.phone || '');
  const [rkEmail, setRkEmail] = useState(currentClaim.registerKeeper?.email || '');
  const [rkDOB, setRkDOB] = useState(formatDateForInput(currentClaim.registerKeeper?.dateOfBirth));

  // Client Vehicle
  const [vehicleReg, setVehicleReg] = useState(currentClaim.clientVehicle?.registration || '');
  const [vehicleMake, setVehicleMake] = useState(currentClaim.clientVehicle?.make || '');
  const [vehicleModel, setVehicleModel] = useState(currentClaim.clientVehicle?.model || '');
  const [vehicleYear, setVehicleYear] = useState(currentClaim.clientVehicle?.year || '');
  const [vehicleColor, setVehicleColor] = useState(currentClaim.clientVehicle?.color || '');
  const [motExpiry, setMotExpiry] = useState(formatDateForInput(currentClaim.clientVehicle?.motExpiry));
  const [roadTaxExpiry, setRoadTaxExpiry] = useState(formatDateForInput(currentClaim.clientVehicle?.roadTaxExpiry));
  const [nslExpiry, setNslExpiry] = useState(formatDateForInput(currentClaim.clientVehicle?.nslExpiry));
  const [insuranceExpiry, setInsuranceExpiry] = useState(formatDateForInput(currentClaim.clientVehicle?.insuranceExpiry));

  // Submitter & Reference
  const [submitterType, setSubmitterType] = useState(currentClaim.submitterType || 'client');
  const [clientRef, setClientRef] = useState(currentClaim.clientRef || '');
  const [claimType, setClaimType] = useState(currentClaim.claimType || 'Standard');
  const [claimReason, setClaimReason] = useState<string[]>(Array.isArray(currentClaim.claimReason) ? currentClaim.claimReason : ['VD']);

  // Incident Details
  const [incidentDate, setIncidentDate] = useState(formatDateForInput(currentClaim.incidentDetails?.date));
  const [incidentTime, setIncidentTime] = useState(currentClaim.incidentDetails?.time || '');
  const [incidentLocation, setIncidentLocation] = useState(currentClaim.incidentDetails?.location || '');
  const [incidentDescription, setIncidentDescription] = useState(currentClaim.incidentDetails?.description || '');
  const [incidentDamage, setIncidentDamage] = useState(currentClaim.incidentDetails?.damageDetails || '');
  const [incidentWeather, setIncidentWeather] = useState(currentClaim.incidentDetails?.weather || '');
  const [incidentRoadConditions, setIncidentRoadConditions] = useState(currentClaim.incidentDetails?.roadConditions || '');
  const [incidentSpeed, setIncidentSpeed] = useState(currentClaim.incidentDetails?.speed || '');

  // Police Involvement
  const [policeOfficerName, setPoliceOfficerName] = useState(currentClaim.policeOfficerName || '');
  const [policeBadgeNumber, setPoliceBadgeNumber] = useState(currentClaim.policeBadgeNumber || '');
  const [policeStation, setPoliceStation] = useState(currentClaim.policeStation || '');
  const [policeIncidentNumber, setPoliceIncidentNumber] = useState(currentClaim.policeIncidentNumber || '');
  const [policeContactInfo, setPoliceContactInfo] = useState(currentClaim.policeContactInfo || '');

  // Paramedics & Ambulance
  const [paramedicNames, setParamedicNames] = useState(currentClaim.paramedicNames || '');
  const [ambulanceService, setAmbulanceService] = useState(currentClaim.ambulanceService || '');
  const [ambulanceReference, setAmbulanceReference] = useState(currentClaim.ambulanceReference || '');

  // Hire / Storage / Recovery
  const [hireEnabled, setHireEnabled] = useState(!!currentClaim.hireDetails?.enabled);
  const [hireCompany, setHireCompany] = useState(currentClaim.hireDetails?.hireCompany || '');
  const [hireRate, setHireRate] = useState(String(currentClaim.hireDetails?.dailyRate || ''));
  const [hireStartDate, setHireStartDate] = useState(formatDateForInput(currentClaim.hireDetails?.startDate));
  const [hireEndDate, setHireEndDate] = useState(formatDateForInput(currentClaim.hireDetails?.endDate));

  const [storageEnabled, setStorageEnabled] = useState(!!currentClaim.storage?.enabled);
  const [storageGarage, setStorageGarage] = useState(currentClaim.storage?.garage || '');
  const [storageRate, setStorageRate] = useState(String(currentClaim.storage?.dailyRate || ''));

  const [recoveryEnabled, setRecoveryEnabled] = useState(!!currentClaim.recovery?.enabled);
  const [recoveryOperator, setRecoveryOperator] = useState(currentClaim.recovery?.operator || '');
  const [recoveryCost, setRecoveryCost] = useState(String(currentClaim.recovery?.cost || ''));

  // Medical (GP & Hospital)
  const [gpVisited, setGpVisited] = useState(!!currentClaim.gpInformation?.visited);
  const [gpName, setGpName] = useState(currentClaim.gpInformation?.gpName || '');
  const [gpDoctorName, setGpDoctorName] = useState(currentClaim.gpInformation?.gpDoctorName || '');
  const [gpAddress, setGpAddress] = useState(currentClaim.gpInformation?.gpAddress || '');
  const [gpContactNumber, setGpContactNumber] = useState(currentClaim.gpInformation?.gpContactNumber || '');
  const [gpNotes, setGpNotes] = useState(currentClaim.gpInformation?.gpNotes || '');

  const [hospitalVisited, setHospitalVisited] = useState(!!currentClaim.hospitalInformation?.visited);
  const [hospitalName, setHospitalName] = useState(currentClaim.hospitalInformation?.hospitalName || '');
  const [hospitalDoctorName, setHospitalDoctorName] = useState(currentClaim.hospitalInformation?.hospitalDoctorName || '');
  const [hospitalAddress, setHospitalAddress] = useState(currentClaim.hospitalInformation?.hospitalAddress || '');
  const [hospitalContactNumber, setHospitalContactNumber] = useState(currentClaim.hospitalInformation?.hospitalContactNumber || '');
  const [hospitalNotes, setHospitalNotes] = useState(currentClaim.hospitalInformation?.hospitalNotes || '');

  // Third Party (Granular)
  const initialTpName = useMemo(() => resolveNameFields(currentClaim.thirdParty), [currentClaim]);
  const initialTpAddr = useMemo(() => resolveAddressFields(currentClaim.thirdParty), [currentClaim]);

  const [tpFirstName, setTpFirstName] = useState(initialTpName.firstName || '');
  const [tpMiddleName, setTpMiddleName] = useState(initialTpName.middleName || '');
  const [tpLastName, setTpLastName] = useState(initialTpName.lastName || '');
  const [tpBuildingFlat, setTpBuildingFlat] = useState(initialTpAddr.buildingFlat || '');
  const [tpStreetName, setTpStreetName] = useState(initialTpAddr.streetName || '');
  const [tpTownCity, setTpTownCity] = useState(initialTpAddr.townCity || '');
  const [tpPostcode, setTpPostcode] = useState(initialTpAddr.postcode || '');
  const [tpCountry, setTpCountry] = useState(initialTpAddr.country || 'United Kingdom');
  const [tpPhone, setTpPhone] = useState(currentClaim.thirdParty?.phone || '');
  const [tpEmail, setTpEmail] = useState(currentClaim.thirdParty?.email || '');
  const [tpRegistration, setTpRegistration] = useState(currentClaim.thirdParty?.registration || '');
  const [tpMake, setTpMake] = useState(currentClaim.thirdParty?.make || '');
  const [tpModel, setTpModel] = useState(currentClaim.thirdParty?.model || '');
  const [tpInsurer, setTpInsurer] = useState(currentClaim.thirdParty?.insurer || '');
  const [tpPolicyNumber, setTpPolicyNumber] = useState(currentClaim.thirdParty?.policyNumber || '');

  // Passengers & Witnesses
  const [passengers, setPassengers] = useState<any[]>(currentClaim.passengers || []);
  const [witnesses, setWitnesses] = useState<any[]>(currentClaim.witnesses || []);

  // Evidence Staging & Management (Existing URLs + New staged Files)
  const [existingEvidence, setExistingEvidence] = useState<{
    images: string[];
    videos: string[];
    clientVehiclePhotos: string[];
    engineerReport: string[];
    bankStatement: string[];
    adminDocuments: string[];
  }>({
    images: initialClaim.evidence?.images || [],
    videos: initialClaim.evidence?.videos || [],
    clientVehiclePhotos: initialClaim.evidence?.clientVehiclePhotos || [],
    engineerReport: initialClaim.evidence?.engineerReport || [],
    bankStatement: initialClaim.evidence?.bankStatement || [],
    adminDocuments: initialClaim.evidence?.adminDocuments || [],
  });

  const [stagedFiles, setStagedFiles] = useState<{
    images: File[];
    videos: File[];
    clientVehiclePhotos: File[];
    engineerReport: File[];
    bankStatement: File[];
    adminDocuments: File[];
  }>({
    images: [],
    videos: [],
    clientVehiclePhotos: [],
    engineerReport: [],
    bankStatement: [],
    adminDocuments: [],
  });

  // Customer Profile Synchronization helper
  const upsertCustomerFromClaimData = async (clientInfo: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    dateOfBirth?: Date | null;
    nationalInsuranceNumber?: string;
    signature?: string;
  }) => {
    if (!clientInfo.email && !clientInfo.phone) return;
    try {
      const customersRef = collection(db, 'customers');
      const conditions: any[] = [];
      if (clientInfo.email) conditions.push(where('email', '==', clientInfo.email));
      if (clientInfo.phone) conditions.push(where('mobile', '==', clientInfo.phone));

      const q = query(customersRef, or(...conditions));
      const existingCustomerSnapshot = await getDocs(q);

      if (existingCustomerSnapshot.empty) {
        await addDoc(customersRef, {
          type: 'claim',
          name: clientInfo.name || '',
          mobile: clientInfo.phone || '',
          email: clientInfo.email || '',
          address: clientInfo.address || '',
          dateOfBirth: clientInfo.dateOfBirth || null,
          nationalInsuranceNumber: clientInfo.nationalInsuranceNumber || '',
          signature: clientInfo.signature || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success('Customer profile synced from claim details.');
      }
    } catch (error) {
      console.warn('Customer upsert notification:', error);
    }
  };

  // Progress & Handlers
  const [caseProgress, setCaseProgress] = useState(currentClaim.caseProgress || 'Your Claim Has Started');
  const [aieHandler, setAieHandler] = useState(
    typeof currentClaim.fileHandlers === 'string'
      ? currentClaim.fileHandlers
      : currentClaim.fileHandlers?.aieHandler || ''
  );

  const initialLegalHandler = typeof currentClaim.fileHandlers === 'object' ? currentClaim.fileHandlers?.legalHandler : null;
  const [legalHandlerFirm, setLegalHandlerFirm] = useState(initialLegalHandler?.firm || '');
  const [legalHandlerName, setLegalHandlerName] = useState(initialLegalHandler?.handlerName || '');
  const [legalHandlerEmail, setLegalHandlerEmail] = useState(initialLegalHandler?.email || '');
  const [legalHandlerPhone, setLegalHandlerPhone] = useState(initialLegalHandler?.phone || '');
  const [legalHandlerAddress, setLegalHandlerAddress] = useState(initialLegalHandler?.address || '');

  // Re-sync form inputs when currentClaim changes
  useEffect(() => {
    const cn = resolveNameFields(currentClaim.clientInfo);
    const ca = resolveAddressFields(currentClaim.clientInfo);
    setClientFirstName(cn.firstName);
    setClientMiddleName(cn.middleName);
    setClientLastName(cn.lastName);
    setClientBuildingFlat(ca.buildingFlat);
    setClientStreetName(ca.streetName);
    setClientTownCity(ca.townCity);
    setClientPostcode(ca.postcode);
    setClientCountry(ca.country || 'United Kingdom');
    setClientPhone(currentClaim.clientInfo?.phone || '');
    setClientEmail(currentClaim.clientInfo?.email || '');
    setClientDOB(formatDateForInput(currentClaim.clientInfo?.dateOfBirth));
    setClientNI(currentClaim.clientInfo?.nationalInsuranceNumber || '');
    setClientDriverLicense(currentClaim.clientInfo?.driverLicenseNumber || '');
    setClientLicenseExpiry(formatDateForInput(currentClaim.clientInfo?.licenseExpiry));
    setClientOccupation(currentClaim.clientInfo?.occupation || '');
    setClientInjuryDetails(currentClaim.clientInfo?.injuryDetails || '');

    const rn = resolveNameFields(currentClaim.registerKeeper);
    const ra = resolveAddressFields(currentClaim.registerKeeper);
    setRkEnabled(!!currentClaim.registerKeeper?.enabled);
    setRkFirstName(rn.firstName);
    setRkMiddleName(rn.middleName);
    setRkLastName(rn.lastName);
    setRkBuildingFlat(ra.buildingFlat);
    setRkStreetName(ra.streetName);
    setRkTownCity(ra.townCity);
    setRkPostcode(ra.postcode);
    setRkCountry(ra.country || 'United Kingdom');
    setRkPhone(currentClaim.registerKeeper?.phone || '');
    setRkEmail(currentClaim.registerKeeper?.email || '');
    setRkDOB(formatDateForInput(currentClaim.registerKeeper?.dateOfBirth));

    const tn = resolveNameFields(currentClaim.thirdParty);
    const ta = resolveAddressFields(currentClaim.thirdParty);
    setTpFirstName(tn.firstName);
    setTpMiddleName(tn.middleName);
    setTpLastName(tn.lastName);
    setTpBuildingFlat(ta.buildingFlat);
    setTpStreetName(ta.streetName);
    setTpTownCity(ta.townCity);
    setTpPostcode(ta.postcode);
    setTpCountry(ta.country || 'United Kingdom');
    setTpPhone(currentClaim.thirdParty?.phone || '');
    setTpEmail(currentClaim.thirdParty?.email || '');
    setTpRegistration(currentClaim.thirdParty?.registration || '');
    setTpMake(currentClaim.thirdParty?.make || '');
    setTpModel(currentClaim.thirdParty?.model || '');
    setTpInsurer(currentClaim.thirdParty?.insurer || '');
    setTpPolicyNumber(currentClaim.thirdParty?.policyNumber || '');

    setVehicleReg(currentClaim.clientVehicle?.registration || '');
    setVehicleMake(currentClaim.clientVehicle?.make || '');
    setVehicleModel(currentClaim.clientVehicle?.model || '');
    setVehicleYear(currentClaim.clientVehicle?.year || '');
    setVehicleColor(currentClaim.clientVehicle?.color || '');
    setMotExpiry(formatDateForInput(currentClaim.clientVehicle?.motExpiry));
    setRoadTaxExpiry(formatDateForInput(currentClaim.clientVehicle?.roadTaxExpiry));
    setNslExpiry(formatDateForInput(currentClaim.clientVehicle?.nslExpiry));
    setInsuranceExpiry(formatDateForInput(currentClaim.clientVehicle?.insuranceExpiry));

    setSubmitterType(currentClaim.submitterType || 'client');
    setClientRef(currentClaim.clientRef || '');
    setClaimType(currentClaim.claimType || 'Standard');
    setClaimReason(Array.isArray(currentClaim.claimReason) ? currentClaim.claimReason : ['VD']);

    setIncidentDate(formatDateForInput(currentClaim.incidentDetails?.date));
    setIncidentTime(currentClaim.incidentDetails?.time || '');
    setIncidentLocation(currentClaim.incidentDetails?.location || '');
    setIncidentDescription(currentClaim.incidentDetails?.description || '');
    setIncidentDamage(currentClaim.incidentDetails?.damageDetails || '');

    setPoliceOfficerName(currentClaim.policeOfficerName || '');
    setPoliceBadgeNumber(currentClaim.policeBadgeNumber || '');
    setPoliceStation(currentClaim.policeStation || '');
    setPoliceIncidentNumber(currentClaim.policeIncidentNumber || '');
    setPoliceContactInfo(currentClaim.policeContactInfo || '');

    setParamedicNames(currentClaim.paramedicNames || '');
    setAmbulanceService(currentClaim.ambulanceService || '');
    setAmbulanceReference(currentClaim.ambulanceReference || '');

    setHireEnabled(!!currentClaim.hireDetails?.enabled);
    setHireCompany(currentClaim.hireDetails?.hireCompany || '');
    setHireRate(String(currentClaim.hireDetails?.dailyRate || ''));
    setHireStartDate(formatDateForInput(currentClaim.hireDetails?.startDate));
    setHireEndDate(formatDateForInput(currentClaim.hireDetails?.endDate));

    setStorageEnabled(!!currentClaim.storage?.enabled);
    setStorageGarage(currentClaim.storage?.garage || '');
    setStorageRate(String(currentClaim.storage?.dailyRate || ''));

    setRecoveryEnabled(!!currentClaim.recovery?.enabled);
    setRecoveryOperator(currentClaim.recovery?.operator || '');
    setRecoveryCost(String(currentClaim.recovery?.cost || ''));

    setGpVisited(!!currentClaim.gpInformation?.visited);
    setGpName(currentClaim.gpInformation?.gpName || '');
    setGpDoctorName(currentClaim.gpInformation?.gpDoctorName || '');
    setGpAddress(currentClaim.gpInformation?.gpAddress || '');
    setGpContactNumber(currentClaim.gpInformation?.gpContactNumber || '');
    setGpNotes(currentClaim.gpInformation?.gpNotes || '');

    setHospitalVisited(!!currentClaim.hospitalInformation?.visited);
    setHospitalName(currentClaim.hospitalInformation?.hospitalName || '');
    setHospitalDoctorName(currentClaim.hospitalInformation?.hospitalDoctorName || '');
    setHospitalAddress(currentClaim.hospitalInformation?.hospitalAddress || '');
    setHospitalContactNumber(currentClaim.hospitalInformation?.hospitalContactNumber || '');
    setHospitalNotes(currentClaim.hospitalInformation?.hospitalNotes || '');

    setExistingEvidence({
      images: currentClaim.evidence?.images || [],
      videos: currentClaim.evidence?.videos || [],
      clientVehiclePhotos: currentClaim.evidence?.clientVehiclePhotos || [],
      engineerReport: currentClaim.evidence?.engineerReport || [],
      bankStatement: currentClaim.evidence?.bankStatement || [],
      adminDocuments: currentClaim.evidence?.adminDocuments || [],
    });
    setStagedFiles({
      images: [],
      videos: [],
      clientVehiclePhotos: [],
      engineerReport: [],
      bankStatement: [],
      adminDocuments: [],
    });

    setCaseProgress(currentClaim.caseProgress || 'Your Claim Has Started');
    setPassengers(currentClaim.passengers || []);
    setWitnesses(currentClaim.witnesses || []);
  }, [currentClaim]);

  // Derived values for view
  const legalDetails = useMemo(() => resolveLegalHandlerDetails(currentClaim), [currentClaim]);
  const legacy = useMemo(() => isLegacyClaimProgress(currentClaim), [currentClaim]);
  const displayStatus = useMemo(() => deriveDisplayStatus(currentClaim) ?? 'N/A', [currentClaim]);
  const historyToShow = currentClaim.progressHistory || [];

  // ==========================================
  // TOP TAB DEFINITION (Standardized 5 Tabs)
  // ==========================================
  const tabs = useMemo(
    () => [
      {
        id: 'client_vehicle' as const,
        number: '1',
        title: 'Client & Vehicle',
        icon: User,
      },
      {
        id: 'incident' as const,
        number: '2',
        title: 'Incident',
        icon: Calendar,
      },
      {
        id: 'third_party' as const,
        number: '3',
        title: 'Third Party',
        icon: Users,
      },
      {
        id: 'evidence' as const,
        number: '4',
        title: 'Evidence',
        icon: Camera,
      },
      {
        id: 'progress' as const,
        number: '5',
        title: 'Progress & Notes',
        icon: Activity,
      },
    ],
    []
  );

  // Communication Handler
  const handleOpenComm = (
    channel: 'whatsapp' | 'email',
    category: 'general' | 'progress' | 'legal_handler' | 'custom',
    recipient: 'client' | 'legalHandler'
  ) => {
    setActiveCommDropdown(null);
    if (channel === 'whatsapp' && onWhatsApp) {
      onWhatsApp(currentClaim, recipient);
      return;
    }
    if (channel === 'email' && onEmail) {
      onEmail(currentClaim, recipient);
      return;
    }
    setCommChannel(channel);
    setCommCategory(category);
    setCommRecipient(recipient);
    setCommModalOpen(true);
  };

  // ==========================================
  // SAVE CLAIM FUNCTION (Updates Granular + Combined)
  // ==========================================
  const handleSaveClaim = async () => {
    if (!user) {
      toast.error('You must be logged in to save claim changes');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving claim changes...');

    try {
      // Upload any newly staged evidence files
      const uploadedImages = await uploadAllFiles(stagedFiles.images, 'claims/images');
      const uploadedVideos = await uploadAllFiles(stagedFiles.videos, 'claims/videos');
      const uploadedVehiclePhotos = await uploadAllFiles(stagedFiles.clientVehiclePhotos, 'claims/vehicle-photos');
      const uploadedReports = await uploadAllFiles(stagedFiles.engineerReport, 'claims/engineer-reports');
      const uploadedStatements = await uploadAllFiles(stagedFiles.bankStatement, 'claims/bank-statements');
      const uploadedAdminDocs = await uploadAllFiles(stagedFiles.adminDocuments, 'claims/admin-documents');

      const finalEvidence = {
        images: [...(existingEvidence.images || []), ...uploadedImages],
        videos: [...(existingEvidence.videos || []), ...uploadedVideos],
        clientVehiclePhotos: [...(existingEvidence.clientVehiclePhotos || []), ...uploadedVehiclePhotos],
        engineerReport: [...(existingEvidence.engineerReport || []), ...uploadedReports],
        bankStatement: [...(existingEvidence.bankStatement || []), ...uploadedStatements],
        adminDocuments: [...(existingEvidence.adminDocuments || []), ...uploadedAdminDocs],
      };

      // Recombine Names
      const combinedClientName = combineFullName(clientFirstName, clientMiddleName, clientLastName);
      const combinedClientAddress = combineFullAddress(
        clientBuildingFlat,
        clientStreetName,
        clientTownCity,
        clientPostcode,
        clientCountry
      );

      const combinedRkName = rkEnabled ? combineFullName(rkFirstName, rkMiddleName, rkLastName) : '';
      const combinedRkAddress = rkEnabled
        ? combineFullAddress(rkBuildingFlat, rkStreetName, rkTownCity, rkPostcode, rkCountry)
        : '';

      const combinedTpName = combineFullName(tpFirstName, tpMiddleName, tpLastName);
      const combinedTpAddress = combineFullAddress(
        tpBuildingFlat,
        tpStreetName,
        tpTownCity,
        tpPostcode,
        tpCountry
      );

      const payload: any = {
        submitterType,
        clientRef: clientRef.trim(),
        claimType,
        claimReason,
        caseProgress,
        updatedAt: new Date(),
        updatedBy: user.id,

        clientInfo: {
          ...currentClaim.clientInfo,
          firstName: clientFirstName.trim(),
          middleName: clientMiddleName.trim(),
          lastName: clientLastName.trim(),
          name: combinedClientName || clientFirstName.trim(),
          fullName: combinedClientName || clientFirstName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          dateOfBirth: clientDOB ? new Date(clientDOB) : null,
          nationalInsuranceNumber: clientNI.trim(),
          driverLicenseNumber: clientDriverLicense.trim(),
          licenseExpiry: clientLicenseExpiry ? new Date(clientLicenseExpiry) : null,
          occupation: clientOccupation.trim(),
          injuryDetails: clientInjuryDetails.trim(),
          buildingFlat: clientBuildingFlat.trim(),
          streetName: clientStreetName.trim(),
          townCity: clientTownCity.trim(),
          postcode: clientPostcode.trim(),
          country: clientCountry.trim() || 'United Kingdom',
          address: combinedClientAddress,
        },

        registerKeeper: rkEnabled
          ? {
              enabled: true,
              firstName: rkFirstName.trim(),
              middleName: rkMiddleName.trim(),
              lastName: rkLastName.trim(),
              name: combinedRkName,
              phone: rkPhone.trim(),
              email: rkEmail.trim(),
              dateOfBirth: rkDOB ? new Date(rkDOB) : null,
              buildingFlat: rkBuildingFlat.trim(),
              streetName: rkStreetName.trim(),
              townCity: rkTownCity.trim(),
              postcode: rkPostcode.trim(),
              country: rkCountry.trim() || 'United Kingdom',
              address: combinedRkAddress,
            }
          : { enabled: false },

        clientVehicle: {
          ...currentClaim.clientVehicle,
          registration: vehicleReg.trim().toUpperCase(),
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          year: vehicleYear.trim(),
          color: vehicleColor.trim(),
          motExpiry: motExpiry ? new Date(motExpiry) : null,
          roadTaxExpiry: roadTaxExpiry ? new Date(roadTaxExpiry) : null,
          nslExpiry: nslExpiry ? new Date(nslExpiry) : null,
          insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        },

        incidentDetails: {
          ...currentClaim.incidentDetails,
          date: incidentDate ? new Date(incidentDate) : new Date(),
          time: incidentTime.trim(),
          location: incidentLocation.trim(),
          description: incidentDescription.trim(),
          damageDetails: incidentDamage.trim(),
          weather: incidentWeather.trim(),
          roadConditions: incidentRoadConditions.trim(),
          speed: incidentSpeed.trim(),
        },

        policeOfficerName: policeOfficerName.trim(),
        policeBadgeNumber: policeBadgeNumber.trim(),
        policeStation: policeStation.trim(),
        policeIncidentNumber: policeIncidentNumber.trim(),
        policeContactInfo: policeContactInfo.trim(),

        paramedicNames: paramedicNames.trim(),
        ambulanceService: ambulanceService.trim(),
        ambulanceReference: ambulanceReference.trim(),

        hireDetails: hireEnabled
          ? {
              enabled: true,
              hireCompany: hireCompany.trim(),
              dailyRate: parseFloat(hireRate) || 0,
              startDate: hireStartDate ? new Date(hireStartDate) : null,
              endDate: hireEndDate ? new Date(hireEndDate) : null,
            }
          : { enabled: false },

        storage: storageEnabled
          ? {
              enabled: true,
              garage: storageGarage.trim(),
              dailyRate: parseFloat(storageRate) || 0,
            }
          : { enabled: false },

        recovery: recoveryEnabled
          ? {
              enabled: true,
              operator: recoveryOperator.trim(),
              cost: parseFloat(recoveryCost) || 0,
            }
          : { enabled: false },

        gpInformation: gpVisited
          ? {
              visited: true,
              gpName: gpName.trim(),
              gpDoctorName: gpDoctorName.trim(),
              gpAddress: gpAddress.trim(),
              gpContactNumber: gpContactNumber.trim(),
              gpNotes: gpNotes.trim(),
            }
          : { visited: false },

        hospitalInformation: hospitalVisited
          ? {
              visited: true,
              hospitalName: hospitalName.trim(),
              hospitalDoctorName: hospitalDoctorName.trim(),
              hospitalAddress: hospitalAddress.trim(),
              hospitalContactNumber: hospitalContactNumber.trim(),
              hospitalNotes: hospitalNotes.trim(),
            }
          : { visited: false },

        thirdParty: {
          ...currentClaim.thirdParty,
          firstName: tpFirstName.trim(),
          middleName: tpMiddleName.trim(),
          lastName: tpLastName.trim(),
          name: combinedTpName,
          phone: tpPhone.trim(),
          email: tpEmail.trim(),
          buildingFlat: tpBuildingFlat.trim(),
          streetName: tpStreetName.trim(),
          townCity: tpTownCity.trim(),
          postcode: tpPostcode.trim(),
          country: tpCountry.trim() || 'United Kingdom',
          address: combinedTpAddress,
          registration: tpRegistration.trim().toUpperCase(),
          make: tpMake.trim(),
          model: tpModel.trim(),
          insurer: tpInsurer.trim(),
          policyNumber: tpPolicyNumber.trim(),
        },

        passengers,
        witnesses,

        fileHandlers: {
          aieHandler: aieHandler.trim(),
          legalHandler: legalHandlerFirm || legalHandlerName ? {
            firm: legalHandlerFirm.trim(),
            handlerName: legalHandlerName.trim(),
            email: legalHandlerEmail.trim(),
            phone: legalHandlerPhone.trim(),
            address: legalHandlerAddress.trim(),
          } : null,
        },

        evidence: finalEvidence,
      };

      // Ensure customer profile is synchronized
      await upsertCustomerFromClaimData(payload.clientInfo);

      const claimRef = doc(db, 'claims', currentClaim.id);
      await updateDoc(claimRef, payload);

      const updated = { ...currentClaim, ...payload };
      setCurrentClaim(updated);
      setExistingEvidence(finalEvidence);
      setStagedFiles({
        images: [],
        videos: [],
        clientVehiclePhotos: [],
        engineerReport: [],
        bankStatement: [],
        adminDocuments: [],
      });

      try {
        await generateClaimProgressDocument(updated);
      } catch (docErr) {
        console.warn('PDF document regeneration notice:', docErr);
      }

      toast.success('Claim updated successfully!', { id: toastId });
      setIsEditMode(false);
    } catch (err: any) {
      console.error('Save Claim error:', err);
      toast.error(`Failed to update claim: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Section Card Component
  const FormalSectionCard: React.FC<{
    sectionId?: string;
    sectionNumber?: string;
    title: string;
    icon: React.ElementType;
    badge?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }> = ({ sectionId, sectionNumber, title, icon: Icon, badge, action, children, className = '' }) => (
    <div id={sectionId} className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs ${className}`}>
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Icon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-center gap-2">
            {sectionNumber && (
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                {sectionNumber}
              </span>
            )}
            <h3 className="text-base font-bold text-slate-900 tracking-wide">{title}</h3>
          </div>
          {badge}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5 space-y-6 text-slate-800">{children}</div>
    </div>
  );

  const SubSection = ({
    title,
    icon: SubIcon,
    children,
  }: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
  }) => (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
        {SubIcon && <SubIcon className="w-4 h-4 text-indigo-600" />}
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number | React.ReactNode | null | undefined }) => (
    <div className="mb-2">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{value ?? 'N/A'}</dd>
    </div>
  );

  const DocumentLink = ({ url, label }: { url?: string; label: string }) =>
    url ? (
      <button
        type="button"
        onClick={() => (onDownloadDocument ? onDownloadDocument(url) : window.open(url, '_blank'))}
        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 transition-colors text-left group w-full shadow-xs cursor-pointer"
        title={`View ${label}`}
      >
        <FileText className="w-4 h-4 flex-shrink-0 text-indigo-600 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold truncate capitalize text-slate-800 group-hover:text-slate-900">
          {label}
        </span>
      </button>
    ) : (
      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>No {label}</span>
      </div>
    );

  return (
    <div className="space-y-6 text-slate-900 claim-details-modal text-left">
      {/* ========================================================================= */}
      {/* TOP HEADER BAR: Claim Ref, Status Pills, Fast Actions, Edit Mode Toggle    */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
              <span>Claim #{currentClaim.id.slice(-8).toUpperCase()}</span>
              {isEditMode ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Editing Mode
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  View Mode
                </span>
              )}
            </h2>

            {/* Quick Action Bar (WhatsApp / Email) - VISIBLE IN BOTH MODES */}
            <div className="flex items-center gap-2 relative" ref={commDropdownRef}>
              {/* WhatsApp Dropdown */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setActiveCommDropdown(activeCommDropdown === 'whatsapp' ? null : 'whatsapp')}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition shadow-xs gap-1 cursor-pointer"
                  title="WhatsApp Communication"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                  <ChevronDown className="w-3 h-3 text-emerald-600" />
                </button>

                {activeCommDropdown === 'whatsapp' && (
                  <div className="absolute left-0 mt-1 w-64 rounded-xl shadow-xl bg-white border border-slate-200 z-50 py-1 text-xs divide-y divide-slate-100 animate-in fade-in">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-50">
                      Send WhatsApp To:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('whatsapp', 'general', 'client')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-emerald-50 transition text-slate-700 cursor-pointer"
                    >
                      <User className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900">Send to Client</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {currentClaim.clientInfo?.name || 'Client'} ({currentClaim.clientInfo?.phone || 'No phone'})
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('whatsapp', 'legal_handler', 'legalHandler')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-emerald-50 transition text-slate-700 cursor-pointer"
                    >
                      <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-purple-700">Send to Legal Handler</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {legalDetails.legal_handler_name || legalDetails.legal_handler_firm || 'Legal Handler'}{' '}
                          {legalDetails.legal_handler_phone ? `(${legalDetails.legal_handler_phone})` : ''}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Email Dropdown */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setActiveCommDropdown(activeCommDropdown === 'email' ? null : 'email')}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-xs gap-1 cursor-pointer"
                  title="Send Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                  <ChevronDown className="w-3 h-3 text-indigo-600" />
                </button>

                {activeCommDropdown === 'email' && (
                  <div className="absolute left-0 mt-1 w-64 rounded-xl shadow-xl bg-white border border-slate-200 z-50 py-1 text-xs divide-y divide-slate-100 animate-in fade-in">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-50">
                      Send Email To:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('email', 'general', 'client')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-indigo-50 transition text-slate-700 cursor-pointer"
                    >
                      <User className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900">Send to Client</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {currentClaim.clientInfo?.name || 'Client'} ({currentClaim.clientInfo?.email || 'No email'})
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('email', 'legal_handler', 'legalHandler')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 transition text-slate-700 cursor-pointer"
                    >
                      <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-purple-700">Send to Legal Handler</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {legalDetails.legal_handler_name || legalDetails.legal_handler_firm || 'Legal Handler'}{' '}
                          {legalDetails.legal_handler_email ? `(${legalDetails.legal_handler_email})` : ''}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-1 space-y-0.5 text-xs text-slate-500">
            {currentClaim.clientRef && (
              <p>
                Client Ref: <span className="text-slate-900 font-semibold">{currentClaim.clientRef}</span>
              </p>
            )}
            {createdByName && (
              <p>
                Created by: <span className="text-slate-700 font-medium">{createdByName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right side: Status Pills & Edit Mode Toggle Button */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* Status Badges - VISIBLE IN BOTH MODES */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={currentClaim.claimType} />
            {Array.isArray(currentClaim.claimReason) &&
              currentClaim.claimReason.map((reason) => <StatusBadge key={reason} status={reason} />)}
            <StatusBadge status={currentClaim.caseProgress} />
            <StatusBadge status={displayStatus} />
          </div>

          {/* Edit Mode Toggle & Save Buttons */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs ${
                isEditMode
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
              title={isEditMode ? 'Switch to View Mode' : 'Switch to Edit Mode'}
            >
              {isEditMode ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-700" />
                  <span>View Mode</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Claim</span>
                </>
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={handleSaveClaim}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
                title="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STANDARDIZED 5-TAB NAVIGATION BAR (PINNED AT THE TOP FOR BOTH MODES)       */}
      {/* ========================================================================= */}
      <div className="flex flex-nowrap items-stretch w-full border border-slate-200 shrink-0 bg-slate-100/90 select-none divide-x divide-slate-200 rounded-xl overflow-x-auto no-scrollbar shadow-2xs h-13 min-h-[52px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 cursor-pointer transition text-xs font-bold whitespace-nowrap min-w-[130px] ${
                isActive
                  ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.number}
              </span>
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.title}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLIENT & VEHICLE                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'client_vehicle' && (
        <FormalSectionCard
          sectionId="section-client-vehicle"
          sectionNumber="1"
          title="Client & Vehicle Details"
          icon={User}
        >
          {isEditMode ? (
            /* ── EDIT MODE: CLIENT & VEHICLE ── */
            <div className="space-y-6">
              {/* Submitter & Client Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Submitter Type</label>
                  <select
                    value={submitterType}
                    onChange={(e) => setSubmitterType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="client">Client</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Client Reference</label>
                  <input
                    type="text"
                    value={clientRef}
                    onChange={(e) => setClientRef(e.target.value)}
                    placeholder="e.g. REF-2026-001"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Client Information: Granular Name & Granular Address */}
              <SubSection title="Client Personal Details (Granular Inputs)" icon={User}>
                <div className="space-y-4">
                  {/* Name Fields: First, Middle, Last */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={clientFirstName}
                        onChange={(e) => setClientFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={clientMiddleName}
                        onChange={(e) => setClientMiddleName(e.target.value)}
                        placeholder="Middle Name (Optional)"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last Name</label>
                      <input
                        type="text"
                        value={clientLastName}
                        onChange={(e) => setClientLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Contact & Verification */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="07123 456789"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={clientDOB}
                        onChange={(e) => setClientDOB(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* National Insurance & License */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">National Insurance</label>
                      <input
                        type="text"
                        value={clientNI}
                        onChange={(e) => setClientNI(e.target.value)}
                        placeholder="QQ 12 34 56 A"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Driving License Number</label>
                      <input
                        type="text"
                        value={clientDriverLicense}
                        onChange={(e) => setClientDriverLicense(e.target.value)}
                        placeholder="SMITH902148..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">License Expiry Date</label>
                      <input
                        type="date"
                        value={clientLicenseExpiry}
                        onChange={(e) => setClientLicenseExpiry(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Structured Address Fields */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Client Residential Address (Structured Fields)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Building / Flat Number</label>
                        <input
                          type="text"
                          value={clientBuildingFlat}
                          onChange={(e) => setClientBuildingFlat(e.target.value)}
                          placeholder="Flat 4B / Unit 12"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Street Name</label>
                        <input
                          type="text"
                          value={clientStreetName}
                          onChange={(e) => setClientStreetName(e.target.value)}
                          placeholder="High Street / North Road"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Town / City</label>
                        <input
                          type="text"
                          value={clientTownCity}
                          onChange={(e) => setClientTownCity(e.target.value)}
                          placeholder="London"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Postcode</label>
                        <input
                          type="text"
                          value={clientPostcode}
                          onChange={(e) => setClientPostcode(e.target.value)}
                          placeholder="N7 9DP"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Injury Extra Details */}
                  {claimReason.includes('PI') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Occupation</label>
                        <input
                          type="text"
                          value={clientOccupation}
                          onChange={(e) => setClientOccupation(e.target.value)}
                          placeholder="e.g. Delivery Driver"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Injury Details</label>
                        <textarea
                          rows={2}
                          value={clientInjuryDetails}
                          onChange={(e) => setClientInjuryDetails(e.target.value)}
                          placeholder="Whiplash, soft tissue damage..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </SubSection>

              {/* Registered Keeper (If enabled) */}
              <SubSection title="Registered Keeper Details" icon={Building}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={rkEnabled}
                      onChange={(e) => setRkEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Registered Keeper is different from Client/Driver</span>
                  </label>

                  {rkEnabled && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">First Name</label>
                          <input
                            type="text"
                            value={rkFirstName}
                            onChange={(e) => setRkFirstName(e.target.value)}
                            placeholder="First Name"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Middle Name</label>
                          <input
                            type="text"
                            value={rkMiddleName}
                            onChange={(e) => setRkMiddleName(e.target.value)}
                            placeholder="Middle Name"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Last Name</label>
                          <input
                            type="text"
                            value={rkLastName}
                            onChange={(e) => setRkLastName(e.target.value)}
                            placeholder="Last Name"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Building / Flat</label>
                          <input
                            type="text"
                            value={rkBuildingFlat}
                            onChange={(e) => setRkBuildingFlat(e.target.value)}
                            placeholder="Flat / Building"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Street</label>
                          <input
                            type="text"
                            value={rkStreetName}
                            onChange={(e) => setRkStreetName(e.target.value)}
                            placeholder="Street Name"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Town / City</label>
                          <input
                            type="text"
                            value={rkTownCity}
                            onChange={(e) => setRkTownCity(e.target.value)}
                            placeholder="Town / City"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Postcode</label>
                          <input
                            type="text"
                            value={rkPostcode}
                            onChange={(e) => setRkPostcode(e.target.value)}
                            placeholder="Postcode"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SubSection>

              {/* Vehicle Specifications */}
              <SubSection title="Vehicle Specifications & Regulatory Dates" icon={Car}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registration</label>
                      <input
                        type="text"
                        value={vehicleReg}
                        onChange={(e) => setVehicleReg(e.target.value)}
                        placeholder="BD18 XYZ"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Make</label>
                      <input
                        type="text"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        placeholder="Toyota"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Model</label>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Prius"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Year</label>
                      <input
                        type="text"
                        value={vehicleYear}
                        onChange={(e) => setVehicleYear(e.target.value)}
                        placeholder="2022"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Color</label>
                      <input
                        type="text"
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                        placeholder="Silver"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">MOT Expiry</label>
                      <input
                        type="date"
                        value={motExpiry}
                        onChange={(e) => setMotExpiry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Road Tax Expiry</label>
                      <input
                        type="date"
                        value={roadTaxExpiry}
                        onChange={(e) => setRoadTaxExpiry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">NSL License Expiry</label>
                      <input
                        type="date"
                        value={nslExpiry}
                        onChange={(e) => setNslExpiry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Insurance Expiry</label>
                      <input
                        type="date"
                        value={insuranceExpiry}
                        onChange={(e) => setInsuranceExpiry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              </SubSection>
            </div>
          ) : (
            /* ── VIEW MODE: CLIENT & VEHICLE ── */
            <div className="space-y-6">
              {/* Client Information */}
              <SubSection title="Client Information" icon={User}>
                {(() => {
                  const clientName = resolveNameFields(currentClaim.clientInfo);
                  const clientAddress = resolveAddressFields(currentClaim.clientInfo);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Field label="First Name" value={clientName.firstName || 'N/A'} />
                      <Field label="Middle Name" value={clientName.middleName || 'N/A'} />
                      <Field label="Last Name" value={clientName.lastName || 'N/A'} />
                      <Field label="Date of Birth" value={formatDate(currentClaim.clientInfo?.dateOfBirth)} />

                      <div>
                        <dt className="text-xs font-medium text-slate-500">Phone</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {currentClaim.clientInfo?.phone ? (
                            <a href={`tel:${currentClaim.clientInfo?.phone}`} className="text-indigo-600 hover:underline">
                              {currentClaim.clientInfo?.phone}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-medium text-slate-500">Email</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900 truncate">
                          {currentClaim.clientInfo?.email ? (
                            <a href={`mailto:${currentClaim.clientInfo?.email}`} className="text-indigo-600 hover:underline truncate">
                              {currentClaim.clientInfo?.email}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </dd>
                      </div>

                      <Field label="National Insurance" value={currentClaim.clientInfo?.nationalInsuranceNumber || 'N/A'} />
                      <Field label="Driving License" value={currentClaim.clientInfo?.driverLicenseNumber || 'N/A'} />

                      <Field label="Building / Flat" value={clientAddress.buildingFlat || 'N/A'} />
                      <Field label="Street Name" value={clientAddress.streetName || 'N/A'} />
                      <Field label="Town / City" value={clientAddress.townCity || 'N/A'} />
                      <Field label="Postcode" value={clientAddress.postcode || 'N/A'} />

                      {Array.isArray(currentClaim.claimReason) && currentClaim.claimReason.includes('PI') && (
                        <>
                          <div className="col-span-2">
                            <Field label="Occupation" value={currentClaim.clientInfo?.occupation || 'N/A'} />
                          </div>
                          <div className="col-span-2">
                            <dt className="text-xs font-medium text-slate-500">Injury Details</dt>
                            <dd className="mt-1 text-sm text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              {currentClaim.clientInfo?.injuryDetails || 'N/A'}
                            </dd>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </SubSection>

              {/* Registered Keeper (if enabled) */}
              {currentClaim.registerKeeper?.enabled && (
                <SubSection title="Registered Keeper" icon={Building}>
                  {(() => {
                    const rkName = resolveNameFields(currentClaim.registerKeeper);
                    const rkAddress = resolveAddressFields(currentClaim.registerKeeper);
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <Field label="First Name" value={rkName.firstName || 'N/A'} />
                        <Field label="Last Name" value={rkName.lastName || 'N/A'} />
                        <Field label="Phone" value={currentClaim.registerKeeper?.phone || 'N/A'} />
                        <Field label="Email" value={currentClaim.registerKeeper?.email || 'N/A'} />
                        <Field label="Building / Flat" value={rkAddress.buildingFlat || 'N/A'} />
                        <Field label="Street" value={rkAddress.streetName || 'N/A'} />
                        <Field label="Town / City" value={rkAddress.townCity || 'N/A'} />
                        <Field label="Postcode" value={rkAddress.postcode || 'N/A'} />
                      </div>
                    );
                  })()}
                </SubSection>
              )}

              {/* Vehicle Details */}
              <SubSection title="Vehicle Details & Regulatory Status" icon={Car}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Registration</p>
                    <p className="font-semibold text-base text-slate-900 mt-0.5 font-mono">
                      {currentClaim.clientVehicle?.registration || 'N/A'}
                    </p>
                  </div>
                  <Field label="Make & Model" value={`${currentClaim.clientVehicle?.make || ''} ${currentClaim.clientVehicle?.model || ''}`.trim() || 'N/A'} />
                  <Field label="Year" value={currentClaim.clientVehicle?.year || 'N/A'} />
                  <Field label="Color" value={currentClaim.clientVehicle?.color || 'N/A'} />

                  <div>
                    <p className="text-xs font-medium text-slate-500">MOT Expiry</p>
                    <p className={`font-semibold text-sm mt-0.5 ${checkIsExpiring(currentClaim.clientVehicle?.motExpiry) ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                      {formatDate(currentClaim.clientVehicle?.motExpiry)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Road Tax Expiry</p>
                    <p className={`font-semibold text-sm mt-0.5 ${checkIsExpiring(currentClaim.clientVehicle?.roadTaxExpiry) ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                      {formatDate(currentClaim.clientVehicle?.roadTaxExpiry)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">NSL License Expiry</p>
                    <p className={`font-semibold text-sm mt-0.5 ${checkIsExpiring(currentClaim.clientVehicle?.nslExpiry) ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                      {formatDate(currentClaim.clientVehicle?.nslExpiry)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Insurance Expiry</p>
                    <p className={`font-semibold text-sm mt-0.5 ${checkIsExpiring(currentClaim.clientVehicle?.insuranceExpiry) ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                      {formatDate(currentClaim.clientVehicle?.insuranceExpiry)}
                    </p>
                  </div>
                </div>

                {/* Vehicle Documents */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase mb-2">Attached Vehicle Documents</p>
                  {Object.entries(currentClaim.clientVehicle?.documents || {}).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(currentClaim.clientVehicle?.documents || {}).map(([key, url]) => (
                        <DocumentLink key={key} url={typeof url === 'string' ? url : undefined} label={key} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No vehicle documents attached</p>
                  )}
                </div>
              </SubSection>
            </div>
          )}
        </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCIDENT                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'incident' && (
        <FormalSectionCard
          sectionId="section-incident-details"
          sectionNumber="2"
          title="Incident Details & Circumstances"
          icon={Calendar}
        >
          {isEditMode ? (
            /* ── EDIT MODE: INCIDENT ── */
            <div className="space-y-6">
              <SubSection title="Incident Details" icon={Calendar}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Incident Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Incident Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Location <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={incidentLocation}
                        onChange={(e) => setIncidentLocation(e.target.value)}
                        placeholder="Street / Junction / Postcode"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Incident Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={incidentDescription}
                        onChange={(e) => setIncidentDescription(e.target.value)}
                        placeholder="Describe how the accident occurred..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Damage Details <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={incidentDamage}
                        onChange={(e) => setIncidentDamage(e.target.value)}
                        placeholder="Specify vehicle and property damage..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              </SubSection>

              {/* Police Information */}
              <SubSection title="Police Information" icon={Shield}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Officer Name</label>
                    <input
                      type="text"
                      value={policeOfficerName}
                      onChange={(e) => setPoliceOfficerName(e.target.value)}
                      placeholder="Officer Name"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Badge Number</label>
                    <input
                      type="text"
                      value={policeBadgeNumber}
                      onChange={(e) => setPoliceBadgeNumber(e.target.value)}
                      placeholder="Badge #"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Police Station</label>
                    <input
                      type="text"
                      value={policeStation}
                      onChange={(e) => setPoliceStation(e.target.value)}
                      placeholder="Station"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CAD / Incident Number</label>
                    <input
                      type="text"
                      value={policeIncidentNumber}
                      onChange={(e) => setPoliceIncidentNumber(e.target.value)}
                      placeholder="CAD-1234"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={policeContactInfo}
                      onChange={(e) => setPoliceContactInfo(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </SubSection>

              {/* Hire, Storage, Recovery */}
              <SubSection title="Hire, Storage & Recovery Operations" icon={Car}>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hireEnabled}
                        onChange={(e) => setHireEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Hire Vehicle Arranged</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storageEnabled}
                        onChange={(e) => setStorageEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Storage Incurred</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recoveryEnabled}
                        onChange={(e) => setRecoveryEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Recovery Vehicle Service</span>
                    </label>
                  </div>

                  {/* Hire Vehicle Inputs */}
                  {hireEnabled && (
                    <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Hire Vehicle Specification
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hire Company</label>
                          <input
                            type="text"
                            value={hireCompany}
                            onChange={(e) => setHireCompany(e.target.value)}
                            placeholder="Enterprise, Hertz..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Daily Rate (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={hireRate}
                            onChange={(e) => setHireRate(e.target.value)}
                            placeholder="45.00"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={hireStartDate}
                            onChange={(e) => setHireStartDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
                          <input
                            type="date"
                            value={hireEndDate}
                            onChange={(e) => setHireEndDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Storage Details Inputs */}
                  {storageEnabled && (
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                        Storage Garage & Facility
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Garage / Facility Name</label>
                          <input
                            type="text"
                            value={storageGarage}
                            onChange={(e) => setStorageGarage(e.target.value)}
                            placeholder="Central Depository"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Daily Storage Rate (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={storageRate}
                            onChange={(e) => setStorageRate(e.target.value)}
                            placeholder="25.00"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recovery Service Inputs */}
                  {recoveryEnabled && (
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                        Recovery Service Specification
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recovery Operator / Towing Co</label>
                          <input
                            type="text"
                            value={recoveryOperator}
                            onChange={(e) => setRecoveryOperator(e.target.value)}
                            placeholder="AA / RAC / Express Recovery"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Total Recovery Cost (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={recoveryCost}
                            onChange={(e) => setRecoveryCost(e.target.value)}
                            placeholder="150.00"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SubSection>

              {/* Medical, GP & Hospital Information (Edit) */}
              <SubSection title="Medical, GP & Hospital Information" icon={Activity}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gpVisited}
                        onChange={(e) => setGpVisited(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-800">GP Consultation Visited</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hospitalVisited}
                        onChange={(e) => setHospitalVisited(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Hospital Attended / A&E</span>
                    </label>
                  </div>

                  {gpVisited && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        GP Surgery Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Surgery / Practice Name</label>
                          <input
                            type="text"
                            value={gpName}
                            onChange={(e) => setGpName(e.target.value)}
                            placeholder="Riverside Health Centre"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Doctor Name</label>
                          <input
                            type="text"
                            value={gpDoctorName}
                            onChange={(e) => setGpDoctorName(e.target.value)}
                            placeholder="Dr. Smith"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                          <input
                            type="tel"
                            value={gpContactNumber}
                            onChange={(e) => setGpContactNumber(e.target.value)}
                            placeholder="020 7946 0123"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Address</label>
                          <input
                            type="text"
                            value={gpAddress}
                            onChange={(e) => setGpAddress(e.target.value)}
                            placeholder="Practice Address"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="col-span-full">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">GP Notes / Diagnosis</label>
                          <textarea
                            rows={2}
                            value={gpNotes}
                            onChange={(e) => setGpNotes(e.target.value)}
                            placeholder="Whiplash diagnosed, physiotherapy recommended..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {hospitalVisited && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Hospital Attendance Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hospital Name</label>
                          <input
                            type="text"
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            placeholder="St Thomas Hospital"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attending Doctor</label>
                          <input
                            type="text"
                            value={hospitalDoctorName}
                            onChange={(e) => setHospitalDoctorName(e.target.value)}
                            placeholder="Dr. Johnson"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                          <input
                            type="tel"
                            value={hospitalContactNumber}
                            onChange={(e) => setHospitalContactNumber(e.target.value)}
                            placeholder="020 7188 7188"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hospital Address</label>
                          <input
                            type="text"
                            value={hospitalAddress}
                            onChange={(e) => setHospitalAddress(e.target.value)}
                            placeholder="Westminster Bridge Rd"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="col-span-full">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clinical Notes & Discharge Summary</label>
                          <textarea
                            rows={2}
                            value={hospitalNotes}
                            onChange={(e) => setHospitalNotes(e.target.value)}
                            placeholder="X-Ray completed, cervical spine sprain..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SubSection>
            </div>
          ) : (
            /* ── VIEW MODE: INCIDENT ── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Date & Time</p>
                    <p className="font-semibold text-sm text-slate-900 mt-0.5">
                      {formatDate(currentClaim.incidentDetails?.date)}{' '}
                      {currentClaim.incidentDetails?.time ? `at ${currentClaim.incidentDetails?.time}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Location</p>
                    <p className="font-semibold text-sm text-slate-900 mt-0.5">
                      {currentClaim.incidentDetails?.location || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase mb-1">Incident Description</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {currentClaim.incidentDetails?.description || 'N/A'}
                  </p>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <p className="text-xs font-bold text-slate-700 uppercase mb-1">Damage Details</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {currentClaim.incidentDetails?.damageDetails || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Police Information */}
              {(currentClaim.policeOfficerName || currentClaim.policeIncidentNumber) && (
                <SubSection title="Police Information" icon={Shield}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <Field label="Officer Name" value={currentClaim.policeOfficerName} />
                    <Field label="Badge Number" value={currentClaim.policeBadgeNumber} />
                    <Field label="Station" value={currentClaim.policeStation} />
                    <Field label="Incident / CAD Number" value={currentClaim.policeIncidentNumber} />
                  </div>
                </SubSection>
              )}

              {/* Paramedic Involvement */}
              {(currentClaim.paramedicNames || currentClaim.ambulanceReference || currentClaim.ambulanceService) && (
                <SubSection title="Paramedic & Ambulance Service" icon={Activity}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <Field label="Paramedic Personnel" value={currentClaim.paramedicNames} />
                    <Field label="Ambulance Service" value={currentClaim.ambulanceService} />
                    <Field label="Ambulance Ref" value={currentClaim.ambulanceReference} />
                  </div>
                </SubSection>
              )}

              {/* Hire, Storage & Recovery Operations (View) */}
              {(currentClaim.hireDetails?.enabled || currentClaim.storage?.enabled || currentClaim.recovery?.enabled) && (
                <SubSection title="Hire, Storage & Recovery Operations" icon={Car}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentClaim.hireDetails?.enabled && (
                      <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-indigo-900 block">Hire Vehicle</span>
                        <Field label="Hire Company" value={currentClaim.hireDetails.hireCompany} />
                        <Field label="Daily Rate" value={formatCurrency(currentClaim.hireDetails.dailyRate || 0)} />
                        <Field label="Period" value={`${formatDate(currentClaim.hireDetails.startDate)} - ${formatDate(currentClaim.hireDetails.endDate)}`} />
                      </div>
                    )}
                    {currentClaim.storage?.enabled && (
                      <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-amber-900 block">Storage Facility</span>
                        <Field label="Garage" value={currentClaim.storage.garage} />
                        <Field label="Daily Rate" value={formatCurrency(currentClaim.storage.dailyRate || 0)} />
                      </div>
                    )}
                    {currentClaim.recovery?.enabled && (
                      <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-emerald-900 block">Recovery Service</span>
                        <Field label="Operator" value={currentClaim.recovery.operator} />
                        <Field label="Total Cost" value={formatCurrency(currentClaim.recovery.cost || 0)} />
                      </div>
                    )}
                  </div>
                </SubSection>
              )}

              {/* Medical Information (View) */}
              {(currentClaim.gpInformation?.visited || currentClaim.hospitalInformation?.visited) && (
                <SubSection title="Medical & Hospital Consultations" icon={Activity}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentClaim.gpInformation?.visited && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-slate-800 block">GP Consultation</span>
                        <Field label="Surgery Name" value={currentClaim.gpInformation.gpName} />
                        <Field label="Doctor" value={currentClaim.gpInformation.gpDoctorName} />
                        <Field label="Contact" value={currentClaim.gpInformation.gpContactNumber} />
                        <Field label="Address" value={currentClaim.gpInformation.gpAddress} />
                        <Field label="Notes" value={currentClaim.gpInformation.gpNotes} />
                      </div>
                    )}
                    {currentClaim.hospitalInformation?.visited && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-slate-800 block">Hospital Consultation</span>
                        <Field label="Hospital Name" value={currentClaim.hospitalInformation.hospitalName} />
                        <Field label="Doctor" value={currentClaim.hospitalInformation.hospitalDoctorName} />
                        <Field label="Contact" value={currentClaim.hospitalInformation.hospitalContactNumber} />
                        <Field label="Address" value={currentClaim.hospitalInformation.hospitalAddress} />
                        <Field label="Clinical Notes" value={currentClaim.hospitalInformation.hospitalNotes} />
                      </div>
                    )}
                  </div>
                </SubSection>
              )}
            </div>
          )}
        </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: THIRD PARTY                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'third_party' && (
        <FormalSectionCard
          sectionId="section-third-party"
          sectionNumber="3"
          title="Third Party, Passengers & Witnesses"
          icon={Users}
        >
          {isEditMode ? (
            /* ── EDIT MODE: THIRD PARTY ── */
            <div className="space-y-6">
              <SubSection title="Third Party Details (Granular Inputs)" icon={Users}>
                <div className="space-y-4">
                  {/* Third Party Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Name</label>
                      <input
                        type="text"
                        value={tpFirstName}
                        onChange={(e) => setTpFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={tpMiddleName}
                        onChange={(e) => setTpMiddleName(e.target.value)}
                        placeholder="Middle Name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last Name</label>
                      <input
                        type="text"
                        value={tpLastName}
                        onChange={(e) => setTpLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Third Party Contact & Vehicle */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        value={tpPhone}
                        onChange={(e) => setTpPhone(e.target.value)}
                        placeholder="Phone"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        value={tpEmail}
                        onChange={(e) => setTpEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vehicle Registration</label>
                      <input
                        type="text"
                        value={tpRegistration}
                        onChange={(e) => setTpRegistration(e.target.value)}
                        placeholder="Reg Number"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Third Party Address (Structured) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Third Party Address (Structured Fields)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Building / Flat</label>
                        <input
                          type="text"
                          value={tpBuildingFlat}
                          onChange={(e) => setTpBuildingFlat(e.target.value)}
                          placeholder="Building / Flat"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Street</label>
                        <input
                          type="text"
                          value={tpStreetName}
                          onChange={(e) => setTpStreetName(e.target.value)}
                          placeholder="Street"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Town / City</label>
                        <input
                          type="text"
                          value={tpTownCity}
                          onChange={(e) => setTpTownCity(e.target.value)}
                          placeholder="Town / City"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Postcode</label>
                        <input
                          type="text"
                          value={tpPostcode}
                          onChange={(e) => setTpPostcode(e.target.value)}
                          placeholder="Postcode"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Insurer & Policy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Insurer Company</label>
                      <input
                        type="text"
                        value={tpInsurer}
                        onChange={(e) => setTpInsurer(e.target.value)}
                        placeholder="e.g. Admiral, Aviva"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Policy Number</label>
                      <input
                        type="text"
                        value={tpPolicyNumber}
                        onChange={(e) => setTpPolicyNumber(e.target.value)}
                        placeholder="Policy Ref"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>
              </SubSection>

              {/* Passengers Information (Edit Mode) */}
              <SubSection title="Passengers Information" icon={Users}>
                <div className="space-y-3">
                  {passengers.map((p, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Passenger #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPassengers(passengers.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={p.name || ''}
                            onChange={(e) => {
                              const updated = [...passengers];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setPassengers(updated);
                            }}
                            placeholder="Name"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                          <input
                            type="tel"
                            value={p.contactNumber || p.phone || ''}
                            onChange={(e) => {
                              const updated = [...passengers];
                              updated[idx] = { ...updated[idx], contactNumber: e.target.value, phone: e.target.value };
                              setPassengers(updated);
                            }}
                            placeholder="07123..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Address</label>
                          <input
                            type="text"
                            value={p.address || ''}
                            onChange={(e) => {
                              const updated = [...passengers];
                              updated[idx] = { ...updated[idx], address: e.target.value };
                              setPassengers(updated);
                            }}
                            placeholder="Address"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Postcode</label>
                          <input
                            type="text"
                            value={p.postCode || ''}
                            onChange={(e) => {
                              const updated = [...passengers];
                              updated[idx] = { ...updated[idx], postCode: e.target.value };
                              setPassengers(updated);
                            }}
                            placeholder="Postcode"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={p.dob || ''}
                            onChange={(e) => {
                              const updated = [...passengers];
                              updated[idx] = { ...updated[idx], dob: e.target.value };
                              setPassengers(updated);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPassengers([...passengers, { name: '', contactNumber: '', address: '', postCode: '', dob: '' }])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Passenger</span>
                  </button>
                </div>
              </SubSection>

              {/* Witnesses Information (Edit Mode) */}
              <SubSection title="Witnesses Information" icon={Users}>
                <div className="space-y-3">
                  {witnesses.map((w, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Witness #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWitnesses(witnesses.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={w.name || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setWitnesses(updated);
                            }}
                            placeholder="Name"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                          <input
                            type="tel"
                            value={w.contactNumber || w.phone || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx] = { ...updated[idx], contactNumber: e.target.value, phone: e.target.value };
                              setWitnesses(updated);
                            }}
                            placeholder="07123..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Address</label>
                          <input
                            type="text"
                            value={w.address || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx] = { ...updated[idx], address: e.target.value };
                              setWitnesses(updated);
                            }}
                            placeholder="Address"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Postcode</label>
                          <input
                            type="text"
                            value={w.postCode || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx] = { ...updated[idx], postCode: e.target.value };
                              setWitnesses(updated);
                            }}
                            placeholder="Postcode"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={w.dob || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx] = { ...updated[idx], dob: e.target.value };
                              setWitnesses(updated);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWitnesses([...witnesses, { name: '', contactNumber: '', address: '', postCode: '', dob: '' }])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Witness</span>
                  </button>
                </div>
              </SubSection>
            </div>
          ) : (
            /* ── VIEW MODE: THIRD PARTY ── */
            <div className="space-y-6">
              {(() => {
                const tpName = resolveNameFields(currentClaim.thirdParty);
                const tpAddr = resolveAddressFields(currentClaim.thirdParty);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="First Name" value={tpName.firstName || 'N/A'} />
                    <Field label="Middle Name" value={tpName.middleName || 'N/A'} />
                    <Field label="Last Name" value={tpName.lastName || 'N/A'} />
                    <Field label="Vehicle Registration" value={currentClaim.thirdParty?.registration || 'N/A'} />

                    <Field label="Phone" value={currentClaim.thirdParty?.phone || 'N/A'} />
                    <Field label="Email" value={currentClaim.thirdParty?.email || 'N/A'} />
                    <Field label="Insurer" value={currentClaim.thirdParty?.insurer || 'N/A'} />
                    <Field label="Policy Number" value={currentClaim.thirdParty?.policyNumber || 'N/A'} />

                    <Field label="Building / Flat" value={tpAddr.buildingFlat || 'N/A'} />
                    <Field label="Street" value={tpAddr.streetName || 'N/A'} />
                    <Field label="Town / City" value={tpAddr.townCity || 'N/A'} />
                    <Field label="Postcode" value={tpAddr.postcode || 'N/A'} />
                  </div>
                );
              })()}

              {/* Passengers (View Mode) */}
              {currentClaim.passengers && currentClaim.passengers.length > 0 && (
                <SubSection title="Passengers in Vehicle" icon={Users}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentClaim.passengers.map((p: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-xs font-bold text-slate-800 block">Passenger #{idx + 1}: {p.name || 'Unknown'}</span>
                        <p className="text-xs text-slate-600">Phone: {p.contactNumber || p.phone || 'N/A'}</p>
                        <p className="text-xs text-slate-600">Address: {p.address || ''} {p.postCode || ''}</p>
                        {p.dob && <p className="text-xs text-slate-600">DOB: {formatDate(p.dob)}</p>}
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}

              {/* Witnesses (View Mode) */}
              {currentClaim.witnesses && currentClaim.witnesses.length > 0 && (
                <SubSection title="Witnesses" icon={Users}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentClaim.witnesses.map((w: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-xs font-bold text-slate-800 block">Witness #{idx + 1}: {w.name || 'Unknown'}</span>
                        <p className="text-xs text-slate-600">Phone: {w.contactNumber || w.phone || 'N/A'}</p>
                        <p className="text-xs text-slate-600">Address: {w.address || ''} {w.postCode || ''}</p>
                        {w.dob && <p className="text-xs text-slate-600">DOB: {formatDate(w.dob)}</p>}
                      </div>
                    ))}
                  </div>
                </SubSection>
              )}
            </div>
          )}
        </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EVIDENCE                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'evidence' && (
        <FormalSectionCard
          sectionId="section-evidence"
          sectionNumber="4"
          title="Evidence, Media & Documents"
          icon={Camera}
        >
          {isEditMode ? (
            /* ── EDIT MODE: EVIDENCE UPLOAD & MANAGEMENT ── */
            <div className="space-y-6">
              {/* Photographs Upload & Management */}
              <SubSection title="Vehicle & Accident Media" icon={Camera}>
                <div className="space-y-4">
                  {/* Staged new images */}
                  {stagedFiles.images.length > 0 && (
                    <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-indigo-900 block">Staged for Upload ({stagedFiles.images.length} new)</span>
                      <div className="flex flex-wrap gap-2">
                        {stagedFiles.images.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs">
                            <span className="font-medium text-slate-800 truncate max-w-[150px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setStagedFiles({ ...stagedFiles, images: stagedFiles.images.filter((_, idx) => idx !== i) })}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing Images */}
                  {existingEvidence.images.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 block mb-2">Existing Uploaded Photographs</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {existingEvidence.images.map((img, i) => (
                          <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={img} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setExistingEvidence({ ...existingEvidence, images: existingEvidence.images.filter((_, idx) => idx !== i) })}
                              className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs opacity-90 group-hover:opacity-100 transition cursor-pointer"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-xl cursor-pointer transition">
                    <Upload className="w-6 h-6 text-indigo-600 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Click to Select Photographs</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">JPG, PNG, WebP files accepted</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setStagedFiles({ ...stagedFiles, images: [...stagedFiles.images, ...Array.from(e.target.files)] });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </SubSection>

              {/* Engineer Reports */}
              <SubSection title="Engineer Reports" icon={FileText}>
                <div className="space-y-3">
                  {existingEvidence.engineerReport.map((url, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="flex items-center gap-2 text-indigo-700 font-semibold truncate">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Engineer Report {i + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExistingEvidence({ ...existingEvidence, engineerReport: existingEvidence.engineerReport.filter((_, idx) => idx !== i) })}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {stagedFiles.engineerReport.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs">
                      <span className="font-semibold text-indigo-900 truncate">New: {file.name}</span>
                      <button
                        type="button"
                        onClick={() => setStagedFiles({ ...stagedFiles, engineerReport: stagedFiles.engineerReport.filter((_, idx) => idx !== i) })}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Engineer Report</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files) {
                          setStagedFiles({ ...stagedFiles, engineerReport: [...stagedFiles.engineerReport, ...Array.from(e.target.files)] });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </SubSection>

              {/* Bank Statements & Admin Documents */}
              <SubSection title="Bank Statements & Admin Documents" icon={FileText}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bank Statements */}
                  <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-800 block">Bank Statements</span>
                    {existingEvidence.bankStatement.map((url, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                        <span className="truncate text-slate-700">Statement {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => setExistingEvidence({ ...existingEvidence, bankStatement: existingEvidence.bankStatement.filter((_, idx) => idx !== i) })}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {stagedFiles.bankStatement.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                        <span className="truncate text-indigo-900">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setStagedFiles({ ...stagedFiles, bankStatement: stagedFiles.bankStatement.filter((_, idx) => idx !== i) })}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Add Bank Statement</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          if (e.target.files) {
                            setStagedFiles({ ...stagedFiles, bankStatement: [...stagedFiles.bankStatement, ...Array.from(e.target.files)] });
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Admin Documents */}
                  <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-800 block">Admin / Formal Documents</span>
                    {existingEvidence.adminDocuments.map((url, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                        <span className="truncate text-slate-700">Admin Doc {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => setExistingEvidence({ ...existingEvidence, adminDocuments: existingEvidence.adminDocuments.filter((_, idx) => idx !== i) })}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {stagedFiles.adminDocuments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                        <span className="truncate text-indigo-900">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setStagedFiles({ ...stagedFiles, adminDocuments: stagedFiles.adminDocuments.filter((_, idx) => idx !== i) })}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Add Admin Document</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          if (e.target.files) {
                            setStagedFiles({ ...stagedFiles, adminDocuments: [...stagedFiles.adminDocuments, ...Array.from(e.target.files)] });
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </SubSection>
            </div>
          ) : (
            /* ── VIEW MODE: EVIDENCE ── */
            <div className="space-y-6">
              {/* Image & Video Gallery */}
              <SubSection title="Vehicle & Accident Media" icon={Camera}>
                {currentClaim.evidence?.images && currentClaim.evidence.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {currentClaim.evidence.images.map((img: string, i: number) => (
                      <a
                        key={i}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs block"
                      >
                        <img src={img} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-semibold">
                          View Photo
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No evidence photographs uploaded</p>
                )}
              </SubSection>

              {/* Reports & Statements */}
              <SubSection title="Formal Reports & Documents" icon={FileText}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentClaim.evidence?.engineerReport?.map((url: string, idx: number) => (
                    <DocumentLink key={idx} url={url} label={`Engineer Report ${idx + 1}`} />
                  ))}
                  {currentClaim.evidence?.bankStatement?.map((url: string, idx: number) => (
                    <DocumentLink key={idx} url={url} label={`Bank Statement ${idx + 1}`} />
                  ))}
                  {currentClaim.evidence?.adminDocuments?.map((url: string, idx: number) => (
                    <DocumentLink key={idx} url={url} label={`Admin Document ${idx + 1}`} />
                  ))}
                </div>
              </SubSection>
            </div>
          )}
        </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PROGRESS & NOTES                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
        <FormalSectionCard
          sectionId="section-progress"
          sectionNumber="5"
          title="Case Progress, File Handlers & Communication Audit"
          icon={Activity}
        >
          {isEditMode ? (
            /* ── EDIT MODE: PROGRESS & HANDLERS ── */
            <div className="space-y-6">
              <SubSection title="Case Progress Stage" icon={Activity}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Current Case Progress
                    </label>
                    <select
                      value={caseProgress}
                      onChange={(e) => setCaseProgress(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {PROGRESS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Claim Type</label>
                    <select
                      value={claimType}
                      onChange={(e) => setClaimType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Fault">Fault</option>
                      <option value="Non-Fault">Non-Fault</option>
                      <option value="Split">Split</option>
                    </select>
                  </div>
                </div>
              </SubSection>

              <SubSection title="Assigned Handlers" icon={Scale}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">AIE File Handler</label>
                    <input
                      type="text"
                      value={aieHandler}
                      onChange={(e) => setAieHandler(e.target.value)}
                      placeholder="Handler Name"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Legal Handler Firm</label>
                    <input
                      type="text"
                      value={legalHandlerFirm}
                      onChange={(e) => setLegalHandlerFirm(e.target.value)}
                      placeholder="Solicitors / Firm Name"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Legal Handler Name</label>
                    <input
                      type="text"
                      value={legalHandlerName}
                      onChange={(e) => setLegalHandlerName(e.target.value)}
                      placeholder="Contact Solicitor"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Legal Handler Email</label>
                    <input
                      type="email"
                      value={legalHandlerEmail}
                      onChange={(e) => setLegalHandlerEmail(e.target.value)}
                      placeholder="solicitor@legal.co.uk"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </SubSection>
            </div>
          ) : (
            /* ── VIEW MODE: PROGRESS & HANDLERS ── */
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block">Current Progress</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{currentClaim.caseProgress || 'Your Claim Has Started'}</p>
                </div>
                <StatusBadge status={displayStatus} />
              </div>

              {/* Progress History */}
              <SubSection title="Progress Timeline" icon={Clock}>
                <div className="space-y-3">
                  {historyToShow.length > 0 ? (
                    historyToShow.map((h: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                        <div className="flex items-center justify-between">
                          <StatusBadge status={h.status} />
                          <span className="text-[11px] text-slate-400 font-mono">{formatDateTime(h.date)}</span>
                        </div>
                        {h.note && <p className="text-xs text-slate-700 mt-2">{h.note}</p>}
                        {h.author && <p className="text-[10px] text-slate-400 mt-1 text-right">— {h.author}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No progress events logged yet</p>
                  )}
                </div>
              </SubSection>

              {/* Communication Audit Trail */}
              <SubSection title="Communication History Trail" icon={MessageSquare}>
                <CommunicationHistoryTimeline
                  recordId={currentClaim.claimId || currentClaim.id}
                  sourceModule="Claim"
                  matchKeys={[currentClaim.id, currentClaim.claimId, currentClaim.clientPhone].filter(Boolean) as string[]}
                />
              </SubSection>
            </div>
          )}
        </FormalSectionCard>
      )}

      {/* Floating Save Bar in Edit Mode */}
      {isEditMode && (
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-4 rounded-b-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                if (initialEditMode && onClose) {
                  onClose();
                }
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel Edit
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveClaim}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Claim...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Claim Changes</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Integrated Claim Communication Modal */}
      {commModalOpen && (
        <ClaimCommunicationModal
          claim={currentClaim}
          isOpen={commModalOpen}
          onClose={() => setCommModalOpen(false)}
          initialChannel={commChannel}
          initialCategory={commCategory}
          recipient={commRecipient}
        />
      )}
    </div>
  );
};

export default ClaimDetailsModal;
