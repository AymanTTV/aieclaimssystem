// src/pages/PublicDocumentViewer.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileText, Download, Printer, ArrowLeft, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Rental, Vehicle, Customer } from '../types';
import { generateRentalDocuments } from '../utils/generateRentalDocuments';

export const PublicDocumentViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ rentalId?: string; docType?: string }>();
  const navigate = useNavigate();

  const rentalId = params.rentalId || searchParams.get('rentalId') || searchParams.get('id') || '';
  const rawDocType = params.docType || searchParams.get('docType') || searchParams.get('type') || 'hireAgreement';
  const docType = rawDocType.trim();
  const directUrl = searchParams.get('url') || '';

  const [pdfUrl, setPdfUrl] = useState<string>(directUrl && !directUrl.startsWith('blob:') ? directUrl : '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Document');

  // Friendly title mapping with comprehensive fuzzy keyword matching
  useEffect(() => {
    const lower = docType.toLowerCase();
    if (lower.includes('invoice')) {
      setDocTitle('Rental Invoice');
    } else if (lower.includes('claimhire') || lower.includes('claim_hire')) {
      setDocTitle('Claim Hire Agreement');
    } else if (lower.includes('hire') || lower.includes('agreement')) {
      setDocTitle('Hire Agreement Terms & Conditions (T&C)');
    } else if (lower.includes('permit')) {
      setDocTitle('Parking Permit');
    } else if (lower.includes('condition')) {
      setDocTitle('Condition of Hire');
    } else if (lower.includes('cancel') || lower.includes('right')) {
      setDocTitle('Notice of Right to Cancel');
    } else if (lower.includes('storage') || lower.includes('recovery')) {
      setDocTitle('Credit Storage & Recovery');
    } else if (lower.includes('mitigation')) {
      setDocTitle('Credit Hire Mitigation');
    } else if (lower.includes('satisfaction')) {
      setDocTitle('Satisfaction Notice');
    } else {
      setDocTitle('Rental Document');
    }
  }, [docType]);

  useEffect(() => {
    let isMounted = true;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      // If direct URL is provided, verify it is not a stale client blob
      if (directUrl && !directUrl.startsWith('blob:')) {
        if (directUrl.startsWith('data:')) {
          try {
            const base64Data = directUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const localBlobUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setPdfUrl(localBlobUrl);
              setLoading(false);
            }
            return;
          } catch (e) {
            console.warn('Failed parsing direct data URL:', e);
          }
        } else {
          if (isMounted) {
            setPdfUrl(directUrl);
            setLoading(false);
          }
          return;
        }
      }

      if (!rentalId) {
        if (isMounted) {
          setError('No rental ID or document URL provided.');
          setLoading(false);
        }
        return;
      }

      try {
        const rentalSnap = await getDoc(doc(db, 'rentals', rentalId));
        if (!rentalSnap.exists()) {
          throw new Error('Rental record not found.');
        }

        const rentalData = { id: rentalSnap.id, ...rentalSnap.data() } as Rental;
        if (isMounted) setRental(rentalData);

        const docs = (rentalData.documents as any) || {};
        let targetUrl = '';
        const keyParam = searchParams.get('key');
        const lowerDoc = docType.toLowerCase();

        if (lowerDoc.includes('invoice')) {
          targetUrl = docs.invoice || '';
        } else if (lowerDoc.includes('permit')) {
          targetUrl = docs.permit || '';
        } else if (lowerDoc.includes('claimhire') || lowerDoc.includes('claim_hire')) {
          targetUrl = docs.claimHireAgreement || docs.claimDocumentUrls?.claimHireAgreement || docs.hireAgreement || '';
        } else if (lowerDoc.includes('condition')) {
          targetUrl = docs.conditionOfHire || docs.claimDocumentUrls?.conditionOfHire || docs.claimDocuments?.conditionOfHire || '';
        } else if (lowerDoc.includes('cancel') || lowerDoc.includes('right')) {
          targetUrl = docs.noticeOfRightToCancel || docs.claimDocumentUrls?.noticeOfRightToCancel || docs.claimDocuments?.noticeOfRightToCancel || '';
        } else if (lowerDoc.includes('storage') || lowerDoc.includes('recovery')) {
          targetUrl = docs.creditStorageAndRecovery || docs.claimDocumentUrls?.creditStorageAndRecovery || docs.claimDocuments?.creditStorageAndRecovery || '';
        } else if (lowerDoc.includes('mitigation')) {
          targetUrl = docs.creditHireMitigation || docs.claimDocumentUrls?.creditHireMitigation || docs.claimDocuments?.creditHireMitigation || '';
        } else if (lowerDoc.includes('satisfaction')) {
          targetUrl = docs.satisfactionNotice || docs.claimDocumentUrls?.satisfactionNotice || docs.claimDocuments?.satisfactionNotice || '';
        } else {
          // Hire Agreement
          if (keyParam && docs.agreements?.[keyParam]) {
            targetUrl = docs.agreements[keyParam];
          } else if (docs.agreements) {
            const keys = Object.keys(docs.agreements);
            if (keys.length > 0) {
              const latestKey = keys.sort().reverse()[0];
              targetUrl = docs.agreements[latestKey];
            }
          }
          if (!targetUrl) {
            targetUrl = docs.hireAgreement || docs.claimHireAgreement || docs.claimDocumentUrls?.hireAgreement || '';
          }
        }

        // Never attempt to use a dead client-side blob URL from another session
        if (targetUrl && targetUrl.startsWith('blob:')) {
          targetUrl = '';
        }

        // If targetUrl is a data URI, safely convert to a fresh local blob URL
        if (targetUrl && targetUrl.startsWith('data:')) {
          try {
            const base64Data = targetUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const localBlobUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setPdfUrl(localBlobUrl);
              setLoading(false);
            }
            return;
          } catch (convErr) {
            console.warn('Failed parsing stored data URL:', convErr);
            targetUrl = '';
          }
        }

        // If targetUrl is a valid http/https URL, use it directly
        if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
          if (targetUrl.includes('firebasestorage.googleapis.com') && !targetUrl.includes('alt=media')) {
            const sep = targetUrl.includes('?') ? '&' : '?';
            targetUrl = `${targetUrl}${sep}alt=media`;
          }
          if (isMounted) {
            setPdfUrl(targetUrl);
            setLoading(false);
          }
          return;
        }

        // Fallback: Generate the document dynamically on-the-fly with resilient customer/vehicle fallback
        let customerData: Customer | null = null;
        let vehicleData: Vehicle | null = null;

        if (rentalData.customerId) {
          try {
            const cSnap = await getDoc(doc(db, 'customers', rentalData.customerId));
            if (cSnap.exists()) {
              customerData = { id: cSnap.id, ...cSnap.data() } as Customer;
            }
          } catch (e) {
            console.warn('Could not fetch customer by ID:', e);
          }
        }

        if (!customerData) {
          customerData = (
            rentalData.customer ||
            (rentalData as any).driver ||
            (rentalData as any).customerDetails || {
              id: rentalData.customerId || 'c_default',
              name: (rentalData as any).customerName || 'Customer',
              phone: (rentalData as any).customerPhone || '',
              mobile: (rentalData as any).customerMobile || (rentalData as any).customerPhone || '',
              email: (rentalData as any).customerEmail || '',
              address: (rentalData as any).customerAddress || '',
            }
          ) as Customer;
        }

        if (rentalData.vehicleId) {
          try {
            const vSnap = await getDoc(doc(db, 'vehicles', rentalData.vehicleId));
            if (vSnap.exists()) {
              vehicleData = { id: vSnap.id, ...vSnap.data() } as Vehicle;
            }
          } catch (e) {
            console.warn('Could not fetch vehicle by ID:', e);
          }
        }

        if (!vehicleData) {
          vehicleData = (
            rentalData.vehicle ||
            (rentalData as any).vehicleDetails || {
              id: rentalData.vehicleId || 'v_default',
              registrationNumber: (rentalData as any).vehicleReg || (rentalData as any).registrationNumber || 'N/A',
              make: (rentalData as any).vehicleMake || (rentalData as any).make || '',
              model: (rentalData as any).vehicleModel || (rentalData as any).model || '',
            }
          ) as Vehicle;
        }

        const gen = await generateRentalDocuments(rentalData, vehicleData, customerData);
        let blob: Blob | null = null;

        if (lowerDoc.includes('invoice')) {
          blob = gen.invoice;
        } else if (lowerDoc.includes('permit')) {
          blob = gen.permit;
        } else if (lowerDoc.includes('condition')) {
          blob = gen.claimDocuments?.conditionOfHire || null;
        } else if (lowerDoc.includes('cancel') || lowerDoc.includes('right')) {
          blob = gen.claimDocuments?.noticeOfRightToCancel || null;
        } else if (lowerDoc.includes('storage') || lowerDoc.includes('recovery')) {
          blob = gen.claimDocuments?.creditStorageAndRecovery || null;
        } else if (lowerDoc.includes('mitigation')) {
          blob = gen.claimDocuments?.creditHireMitigation || null;
        } else if (lowerDoc.includes('satisfaction')) {
          blob = gen.claimDocuments?.satisfactionNotice || null;
        } else if (lowerDoc.includes('claimhire') || lowerDoc.includes('claim_hire')) {
          blob = gen.claimDocuments?.claimHireAgreement || gen.claimDocuments?.hireAgreement || gen.agreement;
        } else {
          blob = gen.agreement;
        }

        if (!blob) {
          blob = gen.agreement || gen.invoice || null;
        }

        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          if (isMounted) {
            setPdfUrl(blobUrl);
            setLoading(false);
          }
          return;
        }

        throw new Error('Document link is not available. Please contact support.');
      } catch (err: any) {
        console.error('Failed to load public document:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load document.');
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [rentalId, docType, directUrl]);

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      if (pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `${docTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_${rental?.rentalAgreementNumber || rentalId || 'Doc'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const localBlobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localBlobUrl;
      a.download = `${docTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_${rental?.rentalAgreementNumber || rentalId || 'Doc'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(localBlobUrl), 5000);
    } catch {
      window.open(pdfUrl, '_blank');
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-none">{docTitle}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {rental?.rentalAgreementNumber ? `Agreement #${rental.rentalAgreementNumber}` : 'Secure Document Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </header>

      {/* Main Document Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 max-w-6xl w-full mx-auto">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center max-w-md w-full">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-base font-bold text-slate-900">Loading {docTitle}...</h2>
            <p className="text-xs text-slate-500 mt-1">Retrieving secure document, please wait a moment.</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-rose-200 flex flex-col items-center justify-center text-center max-w-md w-full">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-3">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Unable to View Document</h2>
            <p className="text-xs text-rose-600 mt-1 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="w-full flex-1 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col min-h-[80vh]">
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title={docTitle}
              className="w-full flex-1 border-0 min-h-[80vh]"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicDocumentViewer;
