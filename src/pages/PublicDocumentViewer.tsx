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
  const docType = params.docType || searchParams.get('docType') || searchParams.get('type') || 'invoice';
  const directUrl = searchParams.get('url') || '';

  const [pdfUrl, setPdfUrl] = useState<string>(directUrl);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Document');

  // Friendly title mapping
  useEffect(() => {
    switch (docType) {
      case 'invoice':
        setDocTitle('Rental Invoice');
        break;
      case 'claimHireAgreement':
        setDocTitle('Claim Hire Agreement');
        break;
      case 'hireAgreement':
      case 'agreement':
        setDocTitle('Hire Agreement');
        break;
      case 'permit':
        setDocTitle('Parking Permit');
        break;
      case 'conditionOfHire':
        setDocTitle('Condition Of Hire');
        break;
      case 'noticeOfRightToCancel':
        setDocTitle('Notice Of Right To Cancel');
        break;
      case 'creditStorageAndRecovery':
        setDocTitle('Credit Storage & Recovery');
        break;
      case 'creditHireMitigation':
        setDocTitle('Credit Hire Mitigation');
        break;
      case 'satisfactionNotice':
        setDocTitle('Satisfaction Notice');
        break;
      default:
        setDocTitle('Rental Document');
    }
  }, [docType]);

  useEffect(() => {
    let isMounted = true;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      // If direct URL is provided and valid, verify reachability
      if (directUrl) {
        try {
          const res = await fetch(directUrl, { method: 'HEAD' });
          if (res.ok || res.type === 'opaque') {
            if (isMounted) {
              setPdfUrl(directUrl);
              setLoading(false);
            }
            return;
          }
        } catch {
          // If direct URL HEAD check fails, continue to Firestore fallback
          console.warn('Direct URL verification failed, attempting Firestore retrieval');
        }
      }

      if (!rentalId) {
        if (directUrl) {
          if (isMounted) {
            setPdfUrl(directUrl);
            setLoading(false);
          }
          return;
        }
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

        const docs = rentalData.documents || {};
        let targetUrl = '';

        if (docType === 'invoice') {
          targetUrl = docs.invoice || '';
        } else if (docType === 'claimHireAgreement') {
          targetUrl = docs.claimHireAgreement || docs.hireAgreement || '';
        } else if (docType === 'hireAgreement' || docType === 'agreement') {
          if (docs.agreements) {
            const keys = Object.keys(docs.agreements);
            if (keys.length > 0) {
              const latestKey = keys.sort().reverse()[0];
              targetUrl = docs.agreements[latestKey];
            }
          }
        } else if (docType === 'permit') {
          targetUrl = docs.permit || '';
        } else if (docs[docType]) {
          targetUrl = docs[docType];
        }

        // If targetUrl exists in Firestore, check if reachable
        if (targetUrl) {
          if (isMounted) {
            setPdfUrl(targetUrl);
            setLoading(false);
          }
          return;
        }

        // Fallback: Generate the document dynamically on-the-fly
        let customerData: Customer | null = null;
        let vehicleData: Vehicle | null = null;

        if (rentalData.customerId) {
          const cSnap = await getDoc(doc(db, 'customers', rentalData.customerId));
          if (cSnap.exists()) {
            customerData = { id: cSnap.id, ...cSnap.data() } as Customer;
          }
        }

        if (rentalData.vehicleId) {
          const vSnap = await getDoc(doc(db, 'vehicles', rentalData.vehicleId));
          if (vSnap.exists()) {
            vehicleData = { id: vSnap.id, ...vSnap.data() } as Vehicle;
          }
        }

        if (customerData && vehicleData) {
          const gen = await generateRentalDocuments(rentalData, vehicleData, customerData);
          let blob: Blob | null = null;
          if (docType === 'invoice') blob = gen.invoice;
          else if (docType === 'permit') blob = gen.permit;
          else if (docType === 'hireAgreement' || docType === 'agreement') blob = gen.agreement;
          else if (docType === 'claimHireAgreement') blob = gen.claimDocuments?.claimHireAgreement || gen.claimDocuments?.hireAgreement || null;
          else if (gen.claimDocuments && gen.claimDocuments[docType]) blob = gen.claimDocuments[docType];

          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setPdfUrl(blobUrl);
              setLoading(false);
            }
            return;
          }
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

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${docTitle.replace(/\s+/g, '_')}_${rental?.rentalAgreementNumber || rentalId || 'Doc'}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
