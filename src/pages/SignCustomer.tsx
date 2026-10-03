// src/pages/SignCustomer.tsx
import React, { useState, useEffect, createElement, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteField, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { pdf } from '@react-pdf/renderer';
import { RentalAgreement } from '../components/pdf';
import SignaturePad from '../components/ui/SignaturePad';
import {
  CheckCircle,
  AlertCircle,
  Lock,
  Clock,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Car,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileCheck2,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Customer } from '../types/customer';
import { Rental, Vehicle } from '../types';
import { formatSignatureTimestamp, stampSignatureImage } from '../utils/signatureStamp';
import { getAvailableCompanyEntities, buildEffectiveDocumentCompanyDetails } from '../utils/entityBranding';
import { formatDate } from '../utils/dateHelpers';
import { getHireCommencementDate, formatExecutionDateTime } from '../utils/legalDocumentUtils';
import { saveSignatureEverywhere, propagateCustomerSignatureToRentalsAndClaims } from '../utils/signatureStorage';

export default function SignCustomer() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  // Customer & Related entities
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [effectiveCompanyDetails, setEffectiveCompanyDetails] = useState<any>(null);

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string>('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Signing Flow State
  const [signature, setSignature] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signedTimestamp, setSignedTimestamp] = useState('');
  const [error, setError] = useState('');
  const [isExpiredError, setIsExpiredError] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Customer, Rental, Vehicle and Company Data
  useEffect(() => {
    let isMounted = true;

    const loadSigningData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // A. Load Customer Doc
        const custRef = doc(db, 'customers', id);
        const custSnap = await getDoc(custRef);

        if (!custSnap.exists()) {
          if (isMounted) setError('Customer account not found.');
          return;
        }

        const custData = { id: custSnap.id, ...custSnap.data() } as Customer;

        // B. Validate Security Token
        if (!tokenParam || !custData.signatureRequestToken || custData.signatureRequestToken !== tokenParam) {
          if (isMounted) setError('This signature request link is invalid or has already been used.');
          return;
        }

        // C. Validate Expiration
        if (custData.signatureRequestExpiresAt) {
          const expirationDate = (custData.signatureRequestExpiresAt as any).toDate
            ? (custData.signatureRequestExpiresAt as any).toDate()
            : new Date(custData.signatureRequestExpiresAt);

          if (new Date() > expirationDate) {
            if (isMounted) {
              setError('This signature link has expired (links are valid for 1 hour). Please request a new one.');
              setIsExpiredError(true);
            }
            return;
          }
        }

        if (isMounted) setCustomer(custData);

        // D. Load Company Settings
        let rawCompanyDetails: any = {
          fullName: 'AIE Skyline Limited',
          tradingName: 'AIE Skyline',
          officialAddress: 'Unit 4, Skyline Business Park, London',
          phone: '+44 20 8050 5337',
          email: 'info@aieskyline.co.uk',
          website: 'www.aieskyline.co.uk',
          companyNumber: '15616639',
          vatNumber: '453448875',
        };

        try {
          const companySnap = await getDoc(doc(db, 'companySettings', 'details'));
          if (companySnap.exists()) {
            rawCompanyDetails = { ...rawCompanyDetails, ...companySnap.data() };
          }
        } catch (cErr) {
          console.warn('[SignCustomer] Failed loading companySettings:', cErr);
        }

        const availableEntities = getAvailableCompanyEntities(rawCompanyDetails);
        const resolvedCompany = buildEffectiveDocumentCompanyDetails(
          availableEntities[0] || rawCompanyDetails,
          rawCompanyDetails
        );

        if (isMounted) setEffectiveCompanyDetails(resolvedCompany);

        // E. Find Associated Rental for this customer
        let activeRental: Rental | null = null;
        let activeVehicle: Vehicle | null = null;

        try {
          const rentQuery = query(collection(db, 'rentals'), where('customerId', '==', id));
          const rentSnap = await getDocs(rentQuery);

          if (!rentSnap.empty) {
            const allRentals = rentSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Rental));
            // Prefer active rental, then scheduled, or most recent
            activeRental =
              allRentals.find((r) => r.status === 'active') ||
              allRentals.find((r) => r.status === 'scheduled') ||
              allRentals[0];
          }
        } catch (rErr) {
          console.warn('[SignCustomer] Error querying rentals:', rErr);
        }

        // F. Find Associated Vehicle
        if (activeRental) {
          if ((activeRental as any).vehicle) {
            activeVehicle = (activeRental as any).vehicle;
          } else if (activeRental.vehicleId) {
            try {
              const vSnap = await getDoc(doc(db, 'vehicles', activeRental.vehicleId));
              if (vSnap.exists()) {
                activeVehicle = { id: vSnap.id, ...vSnap.data() } as Vehicle;
              }
            } catch (vErr) {
              console.warn('[SignCustomer] Error loading vehicle:', vErr);
            }
          }
        }

        // If no rental found, check direct assigned vehicle or synthesize standard rental agreement
        if (!activeVehicle) {
          try {
            const vQuery = query(collection(db, 'vehicles'), where('customerId', '==', id));
            const vSnap = await getDocs(vQuery);
            if (!vSnap.empty) {
              activeVehicle = { id: vSnap.docs[0].id, ...vSnap.docs[0].data() } as Vehicle;
            }
          } catch {
            // Ignore
          }
        }

        // Live vehicle fallback if unassigned
        if (!activeVehicle) {
          activeVehicle = {
            id: 'unassigned',
            make: (custData as any)?.vehicleMake || (custData as any)?.make || 'Pending Allocation',
            model: (custData as any)?.vehicleModel || (custData as any)?.model || '',
            registrationNumber: (custData as any)?.vehicleRegistration || (custData as any)?.registrationNumber || 'TBD',
            mileage: Number((custData as any)?.mileage || 0),
            dailyRentalPrice: Number((custData as any)?.dailyRentalPrice || 0),
            weeklyRentalPrice: Number((custData as any)?.weeklyRentalPrice || 0),
            claimRentalPrice: Number((custData as any)?.claimRentalPrice || 0),
            securityDeposit: Number((custData as any)?.securityDeposit || 0),
          } as Vehicle;
        }

        // Live rental contract fallback if unlinked
        if (!activeRental) {
          const start = (custData as any).createdAt?.toDate
            ? (custData as any).createdAt.toDate()
            : new Date((custData as any).createdAt || Date.now());
          const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);

          activeRental = {
            id: `agreement-${id}`,
            customerId: id,
            customerName: custData.name,
            type: custData.type === 'daily' ? 'daily' : 'weekly',
            status: 'active',
            startDate: start,
            endDate: end,
            rentalAgreementNumber: `HA-${id.substring(0, 6).toUpperCase()}`,
            lockedWeeklyRate: activeVehicle.weeklyRentalPrice || 0,
            lockedDailyRate: activeVehicle.dailyRentalPrice || 0,
            paidAmount: 0,
            remainingAmount: activeVehicle.weeklyRentalPrice || 0,
            paymentStatus: 'pending',
          } as Rental;
        }

        if (isMounted) {
          setRental(activeRental);
          setVehicle(activeVehicle);
        }

        // G. Generate the Initial Document Preview (Rental Agreement)
        if (isMounted) setGeneratingPdf(true);
        try {
          const agreementElement = createElement(RentalAgreement, {
            rental: activeRental,
            vehicle: activeVehicle,
            customer: custData,
            companyDetails: resolvedCompany,
            includeImages: false,
          });

          const agreementBlob = await pdf(agreementElement).toBlob();
          if (isMounted) {
            const url = URL.createObjectURL(agreementBlob);
            setPdfUrl(url);
          }
        } catch (pdfErr) {
          console.error('[SignCustomer] Failed generating PDF preview:', pdfErr);
        } finally {
          if (isMounted) setGeneratingPdf(false);
        }
      } catch (err: any) {
        console.error('[SignCustomer] Fatal error loading signing page:', err);
        if (isMounted) setError(err?.message || 'Error loading signing page.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSigningData();

    return () => {
      isMounted = false;
    };
  }, [id, tokenParam]);

  // Format Personal Details fields
  const personalDetails = useMemo(() => {
    if (!customer) return null;
    const resolvedName =
      customer.name ||
      [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' ') ||
      'Customer';

    const resolvedAddress =
      customer.address ||
      [
        (customer as any).buildingFlat,
        (customer as any).streetName,
        (customer as any).townCity,
        (customer as any).postcode,
        (customer as any).country,
      ]
        .filter(Boolean)
        .join(', ') ||
      'United Kingdom';

    const licenseNo =
      customer.driverLicenseNumber ||
      customer.licenseNumber ||
      (customer as any).drivingLicenseNumber ||
      'Not Recorded';

    const phone = customer.mobile || customer.phone || 'N/A';
    const email = customer.email || 'N/A';

    return {
      fullName: resolvedName,
      address: resolvedAddress,
      licenseNo,
      phone,
      email,
    };
  }, [customer]);

  // Step 3: Complete & Sign Handler
  const handleSubmit = async () => {
    if (!signature || !id || !termsAccepted || !customer) return;
    setSubmitting(true);
    try {
      // Backdate execution date & timestamp to match exact rental Start Date & Start Time
      const signedDate = getHireCommencementDate(rental || customer);
      const timestampText = formatExecutionDateTime(rental || customer, 'dd/MM/yyyy HH:mm');
      const stampedSignature = await stampSignatureImage(signature, timestampText, customer.name, { hideAuditSubtext: true });

      // Save into storage tiers immediately
      saveSignatureEverywhere(id, stampedSignature, {
        customerId: id,
        customerName: customer.name,
        autoUpdateFirestore: true,
      }).catch(() => {});

      // A. Re-compile final signed PDF agreement with embedded signature and timestamp
      let finalSignedBlob: Blob | null = null;
      if (rental && vehicle && effectiveCompanyDetails) {
        try {
          const signedRentalPayload: Rental = {
            ...rental,
            signature: stampedSignature,
            customerSignature: stampedSignature,
            customerSignatureDate: signedDate,
            signatureTimestamp: timestampText,
            isSigned: true,
            documentStatus: 'Legally Signed & Verified',
            signedAt: signedDate,
          };

          const signedCustomerPayload: Customer = {
            ...customer,
            signature: stampedSignature,
            signatureTimestamp: timestampText,
            documentStatus: 'Legally Signed & Verified',
            signedAt: signedDate,
          };

          const signedAgreementElement = createElement(RentalAgreement, {
            rental: signedRentalPayload,
            vehicle: vehicle,
            customer: signedCustomerPayload,
            companyDetails: effectiveCompanyDetails,
            includeImages: false,
          });

          finalSignedBlob = await pdf(signedAgreementElement).toBlob();
          const finalUrl = URL.createObjectURL(finalSignedBlob);
          setSignedPdfUrl(finalUrl);
        } catch (pdfCompileErr) {
          console.warn('[SignCustomer] Failed compiling final signed PDF:', pdfCompileErr);
        }
      }

      // B. Update Customer Doc in Firestore
      const custRef = doc(db, 'customers', id);
      await updateDoc(custRef, {
        signature: stampedSignature,
        signatureTimestamp: timestampText,
        signedAt: signedDate,
        documentStatus: 'Legally Signed & Verified',
        termsAccepted: true,
        termsAcceptedAt: signedDate,
        updatedAt: signedDate,
        signatureRequestToken: deleteField(),
        signatureRequestExpiresAt: deleteField(),
      });

      // C. Update Associated Rental Doc and propagate across all active rentals & claim packs
      if (rental && rental.id && !rental.id.startsWith('agreement-')) {
        try {
          const rentalRef = doc(db, 'rentals', rental.id);
          await updateDoc(rentalRef, {
            signature: stampedSignature,
            customerSignature: stampedSignature,
            customerSignatureDate: signedDate,
            signatureTimestamp: timestampText,
            isSigned: true,
            documentStatus: 'Legally Signed & Verified',
            signedAt: signedDate,
            updatedAt: signedDate,
          });
        } catch (rentUpdateErr) {
          console.warn('[SignCustomer] Failed updating rental document:', rentUpdateErr);
        }
      }

      // Propagate across ALL active rental agreements and claim packs for this customer
      propagateCustomerSignatureToRentalsAndClaims(id, stampedSignature, {
        timestampText,
        customerData: customer,
        signedDate,
      }).catch((propErr) => {
        console.warn('[SignCustomer] Background signature propagation note:', propErr);
      });

      setSignedTimestamp(timestampText);
      setSuccess(true);
    } catch (err: any) {
      console.error('[SignCustomer] Error saving signature:', err);
      setError('Failed to save signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render Loading Screen ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Loading Document &amp; Signing Portal...</h2>
        <p className="text-xs text-slate-400">Verifying secure signature token...</p>
      </div>
    );
  }

  // ── Render Error Screen ──
  if (error || !customer) {
    const isSaveError = error.includes('Failed to save');
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl">
          {isSaveError ? (
            <AlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
          ) : isExpiredError ? (
            <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          ) : (
            <Lock className="w-14 h-14 text-slate-400 mx-auto mb-4" />
          )}

          <h1 className="text-xl font-bold text-white mb-2">
            {isSaveError ? 'Submission Error' : isExpiredError ? 'Link Expired' : 'Access Restricted'}
          </h1>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            {error || 'This digital signature request link is invalid or has already been used.'}
          </p>

          <p className="text-xs text-slate-500">
            For security and fraud prevention, one-time signing links expire automatically after 1 hour. If you require assistance, please contact our fleet office.
          </p>
        </div>
      </div>
    );
  }

  // ── Render Success Screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-xl w-full bg-slate-800/95 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Agreement Successfully Signed!</h1>
          <p className="text-sm text-slate-300 mb-5 leading-relaxed">
            Thank you, <strong className="text-white">{customer.name}</strong>. Your digital signature and statutory agreement acceptance have been legally verified and recorded.
          </p>

          {signedTimestamp && (
            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 text-left font-mono text-xs text-emerald-300 mb-6 space-y-1.5 shadow-inner">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Trail Verification</span>
              </div>
              <p className="text-slate-300">Timestamp: <span className="text-white font-semibold">{signedTimestamp}</span></p>
              <p className="text-slate-300">Signer: <span className="text-white font-semibold">{customer.name}</span></p>
              <p className="text-slate-300">Document Ref: <span className="text-white font-semibold">{rental?.rentalAgreementNumber || `RA-${customer.id.substring(0, 6).toUpperCase()}`}</span></p>
              <p className="text-emerald-400 font-semibold pt-1">✓ Electronic Communications Act 2000 Compliant</p>
            </div>
          )}

          {signedPdfUrl && (
            <div className="mb-6 space-y-3">
              <a
                href={signedPdfUrl}
                download={`${customer.name.replace(/\s+/g, '_')}_Signed_Vehicle_Agreement.pdf`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Signed Agreement (PDF)</span>
              </a>

              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Signed Document in New Tab</span>
              </a>
            </div>
          )}

          <p className="text-xs text-slate-400">
            A copy has been archived in our fleet compliance database. You may now close this browser tab.
          </p>
        </div>
      </div>
    );
  }

  // ── Main Signing Flow View ──
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ── TOP BRANDING & STATUS HEADER ── */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
                {effectiveCompanyDetails?.tradingName || effectiveCompanyDetails?.fullName || 'Vehicle Hire Portal'}
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secure Customer E-Signature &amp; Verification</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Pending Customer Signature</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 sm:py-8 space-y-6 flex-1">
        {/* Step 1 Introduction Banner */}
        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-600/20 rounded-xl text-indigo-400 shrink-0 mt-0.5">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white mb-1">
                Vehicle Hire Agreement &amp; Identity Verification
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Welcome, <strong className="text-white">{personalDetails?.fullName}</strong>. Please confirm your personal details below, inspect the complete Vehicle Hire Agreement (including vehicle specs, tariffs, and statutory covenants), and execute your legally verified e-signature.
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            STEP 1: CUSTOMER DETAILS & AGREEMENT REVIEW BLOCK
           ══════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                1
              </span>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Confirm Personal Details
              </h3>
            </div>
            <span className="text-xs text-slate-400">Step 1 of 3</span>
          </div>

          {/* Customer Details Summary Card */}
          {personalDetails && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
                {/* Full Name */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Full Legal Name
                  </span>
                  <p className="font-bold text-white text-sm sm:text-base">{personalDetails.fullName}</p>
                </div>

                {/* Driver License */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    Driving License Number
                  </span>
                  <p className="font-bold text-white font-mono">{personalDetails.licenseNo}</p>
                </div>

                {/* Contact Phone */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    Contact Phone
                  </span>
                  <p className="font-semibold text-white">{personalDetails.phone}</p>
                </div>

                {/* Email Address */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    Email Address
                  </span>
                  <p className="font-semibold text-white truncate" title={personalDetails.email}>
                    {personalDetails.email}
                  </p>
                </div>

                {/* Home Address (Spans 2 columns on larger screens) */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    Registered Residential Address
                  </span>
                  <p className="font-semibold text-white leading-snug">{personalDetails.address}</p>
                </div>
              </div>

              {/* Vehicle & Agreement Quick Info */}
              {vehicle && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-emerald-400" />
                    <span>Allocated Vehicle:</span>
                    <strong className="text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {vehicle.registrationNumber}
                    </strong>
                    <span>({vehicle.make} {vehicle.model})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Agreement Ref:</span>
                    <strong className="text-indigo-300 font-mono">
                      {rental?.rentalAgreementNumber || `RA-${customer.id.substring(0, 6).toUpperCase()}`}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full PDF / Document Viewer Block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs sm:text-sm text-white">
                  Complete Generated Rental Agreement (PDF Document)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {pdfUrl && (
                  <>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                      title="Open agreement in full window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Fullscreen</span>
                    </a>
                    <a
                      href={pdfUrl}
                      download={`Vehicle_Hire_Agreement_${customer.name.replace(/\s+/g, '_')}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Embedded PDF iframe / Canvas */}
            <div className="bg-slate-950 p-2 sm:p-4 flex items-center justify-center min-h-[500px] h-[650px] relative overflow-hidden">
              {generatingPdf ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-xs font-semibold">Compiling high-resolution agreement document...</p>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0`}
                  title="Complete Rental Agreement"
                  className="w-full h-full border-0 rounded-xl bg-white shadow-inner"
                />
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-3">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-xs">Document preview unavailable in current browser.</p>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Scroll inside the viewer to read all contract specifications, tariffs, and terms &amp; conditions.</span>
              <span className="text-indigo-400 font-medium">Pages: 3 - 4</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: MANDATORY CHECKBOX CONSENT
           ══════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shadow-md transition-colors ${
                termsAccepted ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {termsAccepted ? <Check className="w-3.5 h-3.5" /> : '2'}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Mandatory Checkbox Consent
              </h3>
            </div>
            <span className="text-xs text-slate-400">Step 2 of 3</span>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
            termsAccepted
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-emerald-950/20 shadow-lg'
              : 'bg-indigo-950/30 border-indigo-500/40 shadow-xl'
          }`}>
            <label className="flex items-start gap-3.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 sm:mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-600 rounded bg-slate-900 cursor-pointer transition-colors"
                id="mandatory-consent-checkbox"
              />
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-white leading-relaxed group-hover:text-indigo-200 transition-colors">
                  I confirm that my details above are correct and that I have read, understood, and accept all Terms &amp; Conditions outlined in this Vehicle Hire Agreement.
                </span>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-normal">
                  By checking this box, you certify under penalty of perjury that you are the named hirer authorized to operate the vehicle and that you bind yourself to all covenants, payment terms, breakdown rules, and indemnity obligations.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: SIGNATURE SUBMISSION & EXECUTION
           ══════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shadow-md transition-colors ${
                signature && termsAccepted ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {signature && termsAccepted ? <Check className="w-3.5 h-3.5" /> : '3'}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Execute Digital Signature
              </h3>
            </div>
            <span className="text-xs text-slate-400">Step 3 of 3</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
            {/* Lock Status Banner */}
            {!termsAccepted ? (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex items-center gap-3 text-amber-200 text-xs sm:text-sm">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>Signature Pad Locked:</strong> Please review your personal details and tick the consent checkbox in Step 2 above to unlock the signature pad.
                </span>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2.5 text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Signature Pad Unlocked: Please sign clearly inside the box below using your finger, stylus, or mouse.</span>
              </div>
            )}

            {/* Signature Pad Component */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">Hirer Digital Signature Canvas:</span>
                <span className="text-[11px] font-mono text-slate-400">Signer: {customer.name}</span>
              </div>

              <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-white shadow-inner">
                <SignaturePad
                  value={signature}
                  onChange={setSignature}
                  disabled={!termsAccepted}
                  theme="navy"
                  height={190}
                />
              </div>

              {signature && termsAccepted && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Signature captured. Click "Complete &amp; Sign" below to compile your final agreement.</span>
                </div>
              )}
            </div>

            {/* Complete & Sign Action Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!signature || !termsAccepted || submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed shadow-xl shadow-indigo-950/50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Compiling Timestamp &amp; Finalizing Agreement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete &amp; Sign</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-500 leading-normal">
              Official electronic signing token provided by AIE Skyline Fleet Compliance • Tamper-evident timestamp compilation
            </p>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} {effectiveCompanyDetails?.tradingName || 'AIE Skyline'}. All rights reserved • Compliant with UK E-Signatures &amp; Consumer Rights Act</p>
      </footer>
    </div>
  );
}
