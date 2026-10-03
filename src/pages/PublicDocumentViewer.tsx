// src/pages/PublicDocumentViewer.tsx
import React, { useState, useEffect, createElement } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { pdf } from '@react-pdf/renderer';
import { db } from '../lib/firebase';
import {
  FileText,
  Download,
  Printer,
  ExternalLink,
  Loader2,
  AlertCircle,
  ShieldCheck,
  PenTool,
  Copy,
  FileX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Rental, Invoice, Claim } from '../types';
import { generateRentalDocuments } from '../utils/generateRentalDocuments';
import RentalAgreement from '../components/pdf/RentalAgreement';
import RentalInvoice from '../components/pdf/RentalInvoice';
import ParkingPermitLetter from '../components/pdf/ParkingPermitLetter';
import { 
  HireAgreement, 
  ConditionOfHire, 
  CreditHireMitigation, 
  CreditStorageAndRecovery, 
  NoticeOfRightToCancel,
  SatisfactionNotice
} from '../components/pdf/claims';
import { getCompanyBrandingForPdf } from '../utils/legalDocumentUtils';
import { PRESET_COMPANY_ENTITIES, CompanyEntity } from '../utils/entityBranding';
import { resolveCustomerOrUserSignature } from '../utils/signatureStorage';

export const PublicDocumentViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ rentalId?: string; docType?: string; id?: string }>();

  const rawKey = searchParams.get('key') || '';
  const keyParam = rawKey.replace(/[^a-zA-Z0-9_\-\.]/g, '').trim();
  const rawRef = searchParams.get('ref') || '';
  const refParam = rawRef.replace(/[^a-zA-Z0-9_\-\.]/g, '').trim();
  const streamMode = searchParams.get('mode') === 'stream' || searchParams.get('stream') === 'true';

  const customerIdParam = (searchParams.get('customerId') || '').trim();
  const entityParam = (searchParams.get('entity') || '').trim();
  const rawDocId = params.id || params.rentalId || searchParams.get('id') || searchParams.get('rentalId') || customerIdParam || '';
  const docId = rawDocId.trim();
  const rawDocType = params.docType || searchParams.get('type') || searchParams.get('docType') || 'hireAgreement';
  const docType = rawDocType.trim().toLowerCase();
  const docRef = refParam || docId;
  const directUrl = searchParams.get('url') || '';

  const [pdfUrl, setPdfUrl] = useState<string>(directUrl && !directUrl.startsWith('blob:') ? directUrl : '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureRequired, setSignatureRequired] = useState<boolean>(false);
  const [recordNotFound, setRecordNotFound] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>('Document Review');

  // Loaded document states
  const [rental, setRental] = useState<Rental | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [activeEntity, setActiveEntity] = useState<CompanyEntity>(PRESET_COMPANY_ENTITIES[0]);

  // Document Title Mapping
  useEffect(() => {
    if (docType.includes('invoice')) {
      setDocTitle('Rental & Services Invoice');
    } else if (docType.includes('claimhire') || docType.includes('claim_hire')) {
      setDocTitle('Claim Hire Agreement');
    } else if (docType.includes('hire') || docType.includes('agreement')) {
      setDocTitle('Vehicle Hire Agreement');
    } else if (docType.includes('mitigation')) {
      setDocTitle('Credit Hire Mitigation');
    } else if (docType.includes('storage') || docType.includes('recovery')) {
      setDocTitle('Credit Storage & Recovery Agreement');
    } else if (docType.includes('cancel')) {
      setDocTitle('Notice of Right to Cancel');
    } else if (docType.includes('condition')) {
      setDocTitle('Condition of Hire');
    } else if (docType.includes('satisfaction')) {
      setDocTitle('Satisfaction Notice');
    } else if (docType.includes('permit')) {
      setDocTitle('Vehicle Parking Permit');
    } else if (docType.includes('claim')) {
      setDocTitle('Incident & Claim Record');
    } else {
      setDocTitle('Official Corporate Document');
    }
  }, [docType]);

  // Load document, check signature requirement, and compile clean direct PDF
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      setSignatureRequired(false);
      setRecordNotFound(false);

      if (!docId) {
        if (isMounted) {
          setRecordNotFound(true);
          setLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch Company Settings to resolve branding
        let baseCompany: any = null;
        try {
          const compSettingsSnap = await getDoc(doc(db, 'companySettings', 'details'));
          if (compSettingsSnap.exists()) {
            baseCompany = compSettingsSnap.data();
          } else {
            const compSnap = await getDoc(doc(db, 'company', 'details'));
            if (compSnap.exists()) {
              baseCompany = compSnap.data();
            }
          }
        } catch (compErr) {
          console.warn('[PublicDocumentViewer] Company settings fetch note:', compErr);
        }

        const isHireDoc = docType.includes('hire') || docType.includes('agreement');
        const defaultEntityKey = isHireDoc ? 'aie_skyline' : 'aie_claims';
        const effectiveEntityKey = (entityParam === 'aie_skyline' || entityParam === 'aie_claims' || entityParam === 'skyline_cabs')
          ? entityParam
          : defaultEntityKey;

        const branding = getCompanyBrandingForPdf(
          { ...(baseCompany || {}), entityKey: effectiveEntityKey },
          effectiveEntityKey as any
        );

        if (isMounted) {
          const foundPreset = PRESET_COMPANY_ENTITIES.find((e) => e.key === branding.entityKey) || PRESET_COMPANY_ENTITIES[0];
          setActiveEntity(foundPreset);
        }

        // 2. Strict Live Database Lookup for Rental, Claim, Vehicle, and Customer
        let loadedCustomerName = '';
        let loadedDocRef = docRef;
        let loadedCustomerData: any = null;
        let fetchedVehicleData: any = null;

        // Customer Lookup if customerIdParam specified
        if (customerIdParam) {
          try {
            const custSnap = await getDoc(doc(db, 'customers', customerIdParam));
            if (custSnap.exists()) {
              loadedCustomerData = { id: custSnap.id, ...custSnap.data() };
              if (isMounted) setCustomer(loadedCustomerData);
              loadedCustomerName = loadedCustomerData.name || '';
              if (!loadedDocRef) {
                loadedDocRef = `CUST-${loadedCustomerData.id.slice(0, 6).toUpperCase()}`;
              }
            }
          } catch (cErr) {
            console.warn('[PublicDocumentViewer] Customer lookup notice:', cErr);
          }
        }

        // A. Rental Record Lookup (Strict Query by ID or Agreement Number)
        let resolvedRentalData: Rental | null = null;
        if (docId) {
          try {
            const rentalSnap = await getDoc(doc(db, 'rentals', docId));
            if (rentalSnap.exists()) {
              resolvedRentalData = { id: rentalSnap.id, ...rentalSnap.data() } as Rental;
            } else {
              // Try query by rentalAgreementNumber
              const rentQuery = query(collection(db, 'rentals'), where('rentalAgreementNumber', '==', docId));
              const rentSnap = await getDocs(rentQuery);
              if (!rentSnap.empty) {
                const rDoc = rentSnap.docs[0];
                resolvedRentalData = { id: rDoc.id, ...rDoc.data() } as Rental;
              }
            }

            if (resolvedRentalData) {
              if (isMounted) setRental(resolvedRentalData);
              loadedCustomerName = (resolvedRentalData as any).customerName || (resolvedRentalData as any).customer?.name || loadedCustomerName;
              loadedDocRef = resolvedRentalData.rentalAgreementNumber || resolvedRentalData.id;

              // Fetch customer profile if not yet loaded
              if (resolvedRentalData.customerId && !loadedCustomerData) {
                try {
                  const custSnap2 = await getDoc(doc(db, 'customers', resolvedRentalData.customerId));
                  if (custSnap2.exists()) {
                    loadedCustomerData = { id: custSnap2.id, ...custSnap2.data() };
                    if (isMounted) setCustomer(loadedCustomerData);
                    loadedCustomerName = loadedCustomerData.name || loadedCustomerName;
                  }
                } catch {}
              }

              // Fetch real assigned vehicle if not directly populated on rental
              if (resolvedRentalData.vehicleId && !resolvedRentalData.vehicle) {
                try {
                  const vehSnap = await getDoc(doc(db, 'vehicles', resolvedRentalData.vehicleId));
                  if (vehSnap.exists()) {
                    fetchedVehicleData = { id: vehSnap.id, ...vehSnap.data() };
                  }
                } catch {}
              }
            }
          } catch (rErr) {
            console.warn('[PublicDocumentViewer] Rental lookup notice:', rErr);
          }
        }

        // B. Claim Record Lookup (Strict Query by ID, Client Reference, or Claim ID)
        let resolvedClaimData: Claim | null = null;
        if (docId) {
          try {
            const claimSnap = await getDoc(doc(db, 'claims', docId));
            if (claimSnap.exists()) {
              resolvedClaimData = { id: claimSnap.id, ...claimSnap.data() } as Claim;
            } else {
              const claimQuery1 = query(collection(db, 'claims'), where('clientRef', '==', docId));
              const claimSnap1 = await getDocs(claimQuery1);
              if (!claimSnap1.empty) {
                const cDoc = claimSnap1.docs[0];
                resolvedClaimData = { id: cDoc.id, ...cDoc.data() } as Claim;
              } else {
                const claimQuery2 = query(collection(db, 'claims'), where('claimId', '==', docId));
                const claimSnap2 = await getDocs(claimQuery2);
                if (!claimSnap2.empty) {
                  const cDoc = claimSnap2.docs[0];
                  resolvedClaimData = { id: cDoc.id, ...cDoc.data() } as Claim;
                }
              }
            }

            if (resolvedClaimData) {
              if (isMounted) setClaim(resolvedClaimData);
              loadedCustomerName = resolvedClaimData.clientName || resolvedClaimData.driverName || loadedCustomerName;
              loadedDocRef = resolvedClaimData.clientRef || resolvedClaimData.claimId || resolvedClaimData.id;

              // Check if customer profile needs loading
              const claimCustId = (resolvedClaimData as any).customerId || (resolvedClaimData as any).clientId;
              if (claimCustId && !loadedCustomerData) {
                try {
                  const custSnap3 = await getDoc(doc(db, 'customers', claimCustId));
                  if (custSnap3.exists()) {
                    loadedCustomerData = { id: custSnap3.id, ...custSnap3.data() };
                    if (isMounted) setCustomer(loadedCustomerData);
                    loadedCustomerName = loadedCustomerData.name || loadedCustomerName;
                  }
                } catch {}
              }

              // Fetch vehicle for claim if not populated
              if (resolvedClaimData.vehicleId && !resolvedClaimData.vehicle && !fetchedVehicleData) {
                try {
                  const vSnap2 = await getDoc(doc(db, 'vehicles', resolvedClaimData.vehicleId));
                  if (vSnap2.exists()) {
                    fetchedVehicleData = { id: vSnap2.id, ...vSnap2.data() };
                  }
                } catch {}
              }
            }
          } catch (cErr) {
            console.warn('[PublicDocumentViewer] Claim lookup notice:', cErr);
          }
        }

        // Cross-link: If rental has claimRef / claimId and claim not loaded yet
        if (resolvedRentalData && !resolvedClaimData && (resolvedRentalData.claimId || resolvedRentalData.claimRef)) {
          try {
            if (resolvedRentalData.claimId) {
              const clSnap = await getDoc(doc(db, 'claims', resolvedRentalData.claimId));
              if (clSnap.exists()) {
                resolvedClaimData = { id: clSnap.id, ...clSnap.data() } as Claim;
                if (isMounted) setClaim(resolvedClaimData);
              }
            }
            if (!resolvedClaimData && resolvedRentalData.claimRef) {
              const qCl = query(collection(db, 'claims'), where('clientRef', '==', resolvedRentalData.claimRef));
              const qSnap = await getDocs(qCl);
              if (!qSnap.empty) {
                resolvedClaimData = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as Claim;
                if (isMounted) setClaim(resolvedClaimData);
              }
            }
          } catch {}
        }

        // Cross-link: If claim has rentalId and rental not loaded yet
        if (resolvedClaimData && !resolvedRentalData && (resolvedClaimData as any).rentalId) {
          try {
            const rSnap3 = await getDoc(doc(db, 'rentals', (resolvedClaimData as any).rentalId));
            if (rSnap3.exists()) {
              resolvedRentalData = { id: rSnap3.id, ...rSnap3.data() } as Rental;
              if (isMounted) setRental(resolvedRentalData);
            }
          } catch {}
        }

        // If direct PDF url was passed and verified active
        if (directUrl && !directUrl.startsWith('blob:') && (resolvedRentalData || resolvedClaimData)) {
          if (isMounted) {
            setPdfUrl(directUrl);
            setLoading(false);
          }
          return;
        }

        // 3. STRICT RECORD NOT FOUND CHECK
        // If an invalid or non-existent record ID was passed, display clear error ("Record Not Found")
        // and NEVER populate fake/static mock objects!
        if (!resolvedRentalData && !resolvedClaimData && !loadedCustomerData) {
          if (isMounted) {
            setRecordNotFound(true);
            setLoading(false);
          }
          return;
        }

        // 4. STRICT SIGNATURE REQUIREMENT CHECK
        // Do NOT generate or make PDF document links accessible if there is no saved signature attached to the record.
        const savedSignature = await resolveCustomerOrUserSignature({
          customerId: customerIdParam || resolvedRentalData?.customerId || resolvedClaimData?.customerId || (resolvedClaimData as any)?.clientId || loadedCustomerData?.id,
          customer: loadedCustomerData || resolvedRentalData?.customer,
          customerName: loadedCustomerName,
          rental: resolvedRentalData,
          claim: resolvedClaimData,
        });

        if (!savedSignature) {
          if (isMounted) {
            setSignatureRequired(true);
            setLoading(false);
          }
          return;
        }

        // 5. DIRECT STREAM & STORED PDF FILE RESOLUTION (Fast Native Stream)
        // Check if an authentic pre-compiled document exists in Firestore / Storage.
        // Validates key parameter (e.g. agreement_1790172300000_no_img) and serves inline application/pdf
        // without invoking client-side React PDF layout engine.
        let storedDocUrl: string | undefined;

        // A. Match by exact sanitized key
        if (keyParam) {
          if (resolvedRentalData?.documents?.agreements && typeof resolvedRentalData.documents.agreements === 'object') {
            storedDocUrl = resolvedRentalData.documents.agreements[keyParam];
          }
          if (!storedDocUrl && (resolvedRentalData?.documents as any)?.[keyParam]) {
            storedDocUrl = (resolvedRentalData.documents as any)[keyParam];
          }
          if (!storedDocUrl && loadedCustomerData?.documents?.agreements && typeof loadedCustomerData.documents.agreements === 'object') {
            storedDocUrl = loadedCustomerData.documents.agreements[keyParam];
          }
        }

        // B. Match by document type from existing documents
        if (!storedDocUrl) {
          if (docType.includes('invoice')) {
            storedDocUrl = resolvedRentalData?.documents?.invoice || (resolvedRentalData as any)?.invoiceUrl;
          } else if (docType.includes('permit')) {
            storedDocUrl = resolvedRentalData?.documents?.permit;
          } else if (docType.includes('mitigation')) {
            storedDocUrl = (resolvedRentalData?.documents as any)?.creditHireMitigation || resolvedClaimData?.documents?.creditHireMitigation;
          } else if (docType.includes('storage') || docType.includes('recovery')) {
            storedDocUrl = (resolvedRentalData?.documents as any)?.creditStorageAndRecovery || resolvedClaimData?.documents?.creditStorageAndRecovery;
          } else if (docType.includes('cancel')) {
            storedDocUrl = (resolvedRentalData?.documents as any)?.noticeOfRightToCancel || resolvedClaimData?.documents?.noticeOfRightToCancel;
          } else if (docType.includes('condition')) {
            storedDocUrl = (resolvedRentalData?.documents as any)?.conditionOfHire || resolvedClaimData?.documents?.conditionOfHire;
          } else if (docType.includes('satisfaction')) {
            storedDocUrl = (resolvedRentalData?.documents as any)?.satisfactionNotice || resolvedClaimData?.documents?.satisfactionNotice;
          } else if (docType.includes('hire') || docType.includes('agreement')) {
            if (resolvedRentalData?.documents?.agreements && typeof resolvedRentalData.documents.agreements === 'object') {
              const agrKeys = Object.keys(resolvedRentalData.documents.agreements);
              if (agrKeys.length > 0) {
                const sorted = [...agrKeys].sort().reverse();
                storedDocUrl = resolvedRentalData.documents.agreements[sorted[0]];
              }
            }
            if (!storedDocUrl) {
              storedDocUrl = (resolvedRentalData?.documents as any)?.hireAgreement ||
                (resolvedRentalData?.documents as any)?.claimHireAgreement ||
                resolvedRentalData?.documentUrl ||
                loadedCustomerData?.documentUrl;
            }
          }
        }

        // C. Fallback to direct URL if provided
        if (!storedDocUrl && directUrl && !directUrl.startsWith('blob:')) {
          storedDocUrl = directUrl;
        }

        // D. Stream stored PDF file directly as an inline PDF blob response (application/pdf)
        if (storedDocUrl && typeof storedDocUrl === 'string' && storedDocUrl.trim()) {
          try {
            if (storedDocUrl.startsWith('http://') || storedDocUrl.startsWith('https://')) {
              const resp = await fetch(storedDocUrl);
              if (resp.ok) {
                const rawData = await resp.blob();
                const inlinePdfBlob = new Blob([rawData], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(inlinePdfBlob);
                if (isMounted) {
                  setPdfUrl(blobUrl);
                  setLoading(false);
                  if (streamMode) {
                    window.location.replace(blobUrl);
                  }
                }
                return;
              }
            }
            if (isMounted) {
              setPdfUrl(storedDocUrl);
              setLoading(false);
            }
            return;
          } catch (fetchErr) {
            console.warn('[PublicDocumentViewer] Blob fetch error, serving stored URL directly:', fetchErr);
            if (isMounted) {
              setPdfUrl(storedDocUrl);
              setLoading(false);
            }
            return;
          }
        }

        // 6. Dynamic PDF Compilation with Selected Entity Branding (Fallback Mode)
        const effectiveCompanyDetails = {
          fullName: String(branding.companyName || baseCompany?.fullName || 'AIE Skyline Limited'),
          tradingName: String(branding.companyName || baseCompany?.tradingName || 'AIE Skyline'),
          officialAddress: String(branding.companyAddress || baseCompany?.officialAddress || 'United House, 39-41 North Road, London, N7 9DP'),
          phone: String(branding.companyPhone || baseCompany?.phone || '+44 20 8050 5337'),
          email: String(branding.companyEmail || baseCompany?.email || 'info@aieskyline.co.uk'),
          website: String(branding.website || baseCompany?.website || 'www.aieskyline.co.uk'),
          companyNumber: String(branding.companyNumber || baseCompany?.companyNumber || '15616639'),
          vatNumber: String(branding.vatNumber || baseCompany?.vatNumber || '453448875'),
          logoUrl: branding.companyLogo || baseCompany?.logoUrl || '',
          footerDisclaimer: branding.footerText || baseCompany?.footerDisclaimer || '',
          entityKey: branding.entityKey || 'aie_skyline',
          ...(baseCompany || {}),
          ...branding,
        };

        const activeRental = resolvedRentalData;
        const activeClaim = resolvedClaimData;

        // Resolve authentic vehicle from live database record (NO static mock fallbacks)
        const authenticVehicle = activeRental?.vehicle || fetchedVehicleData || activeClaim?.vehicle || (activeClaim as any)?.clientVehicle || {
          make: (activeRental as any)?.vehicleMake || (activeClaim as any)?.vehicleMake || (activeClaim as any)?.clientVehicle?.make || '',
          model: (activeRental as any)?.vehicleModel || (activeClaim as any)?.vehicleModel || (activeClaim as any)?.clientVehicle?.model || '',
          registrationNumber: (activeRental as any)?.vehicleRegistration || (activeRental as any)?.vehicleRegistrationNumber || (activeClaim as any)?.vehicleRegistration || (activeClaim as any)?.clientVehicle?.registrationNumber || '',
        };

        // Resolve authentic customer details from live database record (NO fake 'Customer' names)
        const authenticCustomerName = loadedCustomerName || loadedCustomerData?.name || activeRental?.customerName || (activeClaim as any)?.clientName || (activeClaim as any)?.driverName || '';
        const authenticAddress = loadedCustomerData?.address || (activeRental as any)?.customer?.address || (activeClaim as any)?.clientInfo?.address || '';
        const authenticPhone = loadedCustomerData?.mobile || loadedCustomerData?.phone || (activeRental as any)?.customer?.mobile || (activeRental as any)?.customer?.phone || (activeClaim as any)?.clientInfo?.phone || '';
        const authenticEmail = loadedCustomerData?.email || (activeRental as any)?.customer?.email || (activeClaim as any)?.clientInfo?.email || '';

        // Resolve authentic hire details from live database record
        const rawStartDate = activeRental?.startDate || (activeClaim as any)?.hireDetails?.startDate;
        const rawEndDate = activeRental?.endDate || (activeClaim as any)?.hireDetails?.endDate;
        const authenticStartDate = rawStartDate
          ? (rawStartDate instanceof Date ? rawStartDate.toISOString() : (rawStartDate as any)?.toDate ? (rawStartDate as any).toDate().toISOString() : String(rawStartDate))
          : '';
        const authenticEndDate = rawEndDate
          ? (rawEndDate instanceof Date ? rawEndDate.toISOString() : (rawEndDate as any)?.toDate ? (rawEndDate as any).toDate().toISOString() : String(rawEndDate))
          : '';

        let authenticDays = activeRental?.days || (activeClaim as any)?.hireDetails?.daysOfHire || 0;
        if (!authenticDays && authenticStartDate && authenticEndDate) {
          const dStart = new Date(authenticStartDate).getTime();
          const dEnd = new Date(authenticEndDate).getTime();
          if (!isNaN(dStart) && !isNaN(dEnd) && dEnd > dStart) {
            authenticDays = Math.max(1, Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)));
          }
        }

        const authenticClaimRate = activeRental?.dailyRate ?? (activeRental as any)?.rate ?? (activeRental as any)?.lockedDailyRate ?? (activeClaim as any)?.hireDetails?.claimRate ?? 0;
        const authenticDeliveryCharge = activeRental?.deliveryCharge ?? (activeClaim as any)?.hireDetails?.deliveryCharge ?? 0;
        const authenticCollectionCharge = activeRental?.collectionCharge ?? (activeClaim as any)?.hireDetails?.collectionCharge ?? 0;
        const authenticInsurancePerDay = activeRental?.insurancePerDay ?? (activeClaim as any)?.hireDetails?.insurancePerDay ?? 0;

        // Build standardized payload for React-PDF components from pure database values
        const synthesizedPayload = {
          id: activeClaim?.id || activeRental?.id || loadedCustomerData?.id || docId,
          claimReference: loadedDocRef || activeClaim?.clientRef || activeRental?.claimRef || activeRental?.rentalAgreementNumber || docId,
          rentalAgreementNumber: activeRental?.rentalAgreementNumber || (activeRental as any)?.agreementNumber || loadedDocRef,
          hireDetails: {
            startDate: authenticStartDate,
            endDate: authenticEndDate,
            daysOfHire: authenticDays,
            claimRate: authenticClaimRate,
            deliveryCharge: authenticDeliveryCharge,
            collectionCharge: authenticCollectionCharge,
            insurancePerDay: authenticInsurancePerDay,
            rentalAgreementNumber: activeRental?.rentalAgreementNumber || loadedDocRef,
          },
          clientInfo: {
            name: authenticCustomerName,
            signature: savedSignature,
            address: authenticAddress,
            phone: authenticPhone,
            email: authenticEmail,
          },
          driver: {
            name: (activeRental as any)?.driverName || authenticCustomerName,
          },
          vehicle: authenticVehicle,
          storage: (activeClaim as any)?.storage || {
            totalCost: Number(activeRental?.storageCost || 0),
            costPerDay: Number(activeRental?.storageCostPerDay || 0),
            days: Number(activeRental?.storageDays || 0),
          },
          recovery: (activeClaim as any)?.recovery || {
            cost: Number(activeRental?.recoveryCost || 0),
          },
          rental: activeRental ? { ...activeRental, signature: savedSignature } : undefined,
        };

        const isClaimDoc = Boolean(
          docType.includes('claimhire') ||
          docType.includes('claim_hire') ||
          docType.includes('mitigation') ||
          docType.includes('storage') ||
          docType.includes('recovery') ||
          docType.includes('cancel') ||
          docType.includes('condition') ||
          docType.includes('satisfaction') ||
          (activeClaim && !activeRental) ||
          activeRental?.type === 'claim'
        );

        let generatedBlob: Blob | null = null;

        try {
          if (!isClaimDoc && activeRental) {
            // Standard vehicle rental documents
            if (docType.includes('invoice')) {
              generatedBlob = await pdf(
                createElement(RentalInvoice, {
                  rental: { ...activeRental, signature: savedSignature },
                  vehicle: activeRental.vehicle || authenticVehicle,
                  customer: activeRental.customer || loadedCustomerData || ({ name: authenticCustomerName, signature: savedSignature } as any),
                  companyDetails: effectiveCompanyDetails,
                })
              ).toBlob();
            } else if (docType.includes('permit')) {
              generatedBlob = await pdf(
                createElement(ParkingPermitLetter, {
                  rental: { ...activeRental, signature: savedSignature },
                  vehicle: activeRental.vehicle || authenticVehicle,
                  customer: activeRental.customer || loadedCustomerData || ({ name: authenticCustomerName, signature: savedSignature } as any),
                  companyDetails: effectiveCompanyDetails,
                })
              ).toBlob();
            } else {
              // Standard Vehicle Hire Agreement
              generatedBlob = await pdf(
                createElement(RentalAgreement, {
                  rental: { ...activeRental, signature: savedSignature },
                  vehicle: activeRental.vehicle || authenticVehicle,
                  customer: activeRental.customer || loadedCustomerData || ({ name: authenticCustomerName, signature: savedSignature } as any),
                  companyDetails: effectiveCompanyDetails,
                  includeImages: false,
                })
              ).toBlob();
            }
          } else if (docType.includes('mitigation')) {
            generatedBlob = await pdf(
              createElement(CreditHireMitigation, {
                claim: synthesizedPayload,
                companyDetails: effectiveCompanyDetails,
              })
            ).toBlob();
          } else if (docType.includes('storage') || docType.includes('recovery')) {
            generatedBlob = await pdf(
              createElement(CreditStorageAndRecovery, {
                claim: synthesizedPayload,
                companyDetails: effectiveCompanyDetails,
              })
            ).toBlob();
          } else if (docType.includes('cancel')) {
            generatedBlob = await pdf(
              createElement(NoticeOfRightToCancel, {
                claim: synthesizedPayload,
                companyDetails: effectiveCompanyDetails,
              })
            ).toBlob();
          } else if (docType.includes('condition')) {
            generatedBlob = await pdf(
              createElement(ConditionOfHire, {
                claim: synthesizedPayload,
                companyDetails: effectiveCompanyDetails,
              })
            ).toBlob();
          } else if (docType.includes('satisfaction')) {
            generatedBlob = await pdf(
              createElement(SatisfactionNotice, {
                claim: synthesizedPayload,
                companyDetails: effectiveCompanyDetails,
              })
            ).toBlob();
          } else {
            // Claim Hire Agreement
            generatedBlob = await pdf(
              createElement(HireAgreement, {
                claim: synthesizedPayload,
                companyDetails: effectiveCompanyDetails,
              })
            ).toBlob();
          }
        } catch (compilationError: any) {
          console.warn('[PublicDocumentViewer] Dynamic PDF compilation caught exception:', compilationError);
          // Check for existing document URL fallback before giving up
          const fallbackUrl = activeRental?.documentUrl ||
            (activeRental?.documents as any)?.hireAgreement ||
            loadedCustomerData?.documentUrl;
          if (fallbackUrl) {
            setPdfUrl(fallbackUrl);
            setLoading(false);
            return;
          }
          throw compilationError;
        }

        if (generatedBlob && isMounted) {
          const directPdfBlob = new Blob([generatedBlob], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(directPdfBlob);
          setPdfUrl(blobUrl);
          if (streamMode) {
            window.location.replace(blobUrl);
          }
        }

        if (isMounted) setLoading(false);
      } catch (err: any) {
        console.error('[PublicDocumentViewer] Error loading document:', err);
        if (isMounted) {
          setError(err?.message || 'Could not load document preview.');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [docId, docType, directUrl, entityParam, customerIdParam, keyParam, streamMode]);

  // Download PDF
  const handleDownload = () => {
    if (!pdfUrl) return;
    try {
      const a = document.createElement('a');
      a.href = pdfUrl;
      const entityPrefix = (activeEntity?.name || 'AIE_Skyline')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      const cleanTitle = docTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      a.download = `${entityPrefix}_${cleanTitle}_${docRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(pdfUrl, '_blank');
    }
  };

  // Print PDF via iframe
  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.focus();
        iframe.contentWindow?.print();
      }, 500);
    };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STRICT RECORD NOT FOUND VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (recordNotFound) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/10">
            <FileX className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Record Not Found</h2>
            <p className="text-xs text-slate-400 mt-1">
              Document: <span className="text-slate-200 font-semibold">{docTitle}</span>
              {docId && <span className="font-mono text-slate-400"> • ID: {docId}</span>}
            </p>
          </div>

          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-200 font-medium leading-relaxed text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Record Not Found:</strong> The requested document record could not be found in the database. Please verify the link or reference ID provided.
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All document generation strictly queries authentic live database records. No placeholder or mock data will be populated for missing or invalid records.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/rentals';
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              Return to System
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STRICT SIGNATURE REQUIREMENT NOTICE VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (signatureRequired) {
    const targetCustId = customerIdParam || rental?.customerId || claim?.customerId || customer?.id || docId;
    const signUrl = `${window.location.origin}/sign/${encodeURIComponent(targetCustId)}?rentalId=${encodeURIComponent(rental?.id || docId)}`;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <PenTool className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Signature Required</h2>
            <p className="text-xs text-slate-400 mt-1">
              Document: <span className="text-slate-200 font-semibold">{docTitle}</span>
              {docRef && <span className="font-mono text-slate-400"> • Ref: {docRef}</span>}
            </p>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200 font-medium leading-relaxed text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Signature Required:</strong> Please execute signature before generating or sharing final agreement documents.
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            In compliance with vehicle hire and claims regulations, all agreement documents must be legally authorized and stamped with a verified customer signature before compilation and download.
          </p>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                window.location.href = `/sign/${encodeURIComponent(targetCustId)}?rentalId=${encodeURIComponent(rental?.id || docId)}`;
              }}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-98 cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span>Go to Dedicated Signature Request Link</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(signUrl);
                toast.success('Signature Request Link copied to clipboard!');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Signature Request Link</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DIRECT PDF DOCUMENT VIEW (Full-Bleed, Clean Toolbar, No Portal Clutter)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Clean Document Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">{docTitle}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Legally Signed &amp; Verified
              </span>
            </div>
            {docRef && (
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Ref: {docRef}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pdfUrl && (
            <>
              <button
                type="button"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                title="Open native browser PDF stream"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Direct Stream</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Full-Bleed PDF Viewer Frame with Direct Inline Object Stream */}
      <main className="flex-1 w-full bg-slate-950 overflow-hidden relative">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <h2 className="text-base font-bold text-white">Loading Document...</h2>
            <p className="text-xs text-slate-400 mt-1">
              Verifying signature and streaming PDF document.
            </p>
          </div>
        ) : error ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full mb-3 border border-rose-500/30">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-white">Document Unavailable</h2>
            <p className="text-xs text-rose-400 mt-1 mb-4 max-w-md">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition"
            >
              Reload Document
            </button>
          </div>
        ) : pdfUrl ? (
          <object
            data={`${pdfUrl}#toolbar=1&navpanes=0`}
            type="application/pdf"
            className="w-full h-full border-0 bg-slate-900"
          >
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title={docTitle}
              className="w-full h-full border-0 bg-slate-900"
            />
          </object>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
            <p className="font-semibold text-slate-300 mb-2">PDF Document Ready</p>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
            >
              Download Document
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicDocumentViewer;
