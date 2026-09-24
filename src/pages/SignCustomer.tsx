// src/pages/SignCustomer.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import SignaturePad from '../components/ui/SignaturePad';
import { CheckCircle, AlertCircle, Lock, Clock } from 'lucide-react'; // Added Clock icon
import { Customer } from '../types/customer';
import { formatSignatureTimestamp, stampSignatureImage } from '../utils/signatureStamp';

const SignCustomer = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signedTimestamp, setSignedTimestamp] = useState('');
  const [error, setError] = useState('');
  const [isExpiredError, setIsExpiredError] = useState(false); // To show specific UI for expiration

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'customers', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Explicitly cast data, but remember Firebase returns Timestamps for dates
          const data = docSnap.data() as any; 
          
          // --- 1. TOKEN MATCH CHECK ---
          if (!tokenParam || !data.signatureRequestToken || data.signatureRequestToken !== tokenParam) {
            setError('This link is invalid or has already been used.');
            setLoading(false);
            return;
          }

          // --- 2. EXPIRATION CHECK ---
          if (data.signatureRequestExpiresAt) {
            // Convert Firestore Timestamp to JS Date
            const expirationDate = data.signatureRequestExpiresAt.toDate 
              ? data.signatureRequestExpiresAt.toDate() 
              : new Date(data.signatureRequestExpiresAt);
              
            const now = new Date();
            
            if (now > expirationDate) {
              setError('This signature link has expired (links are valid for 1 hour). Please request a new one.');
              setIsExpiredError(true);
              setLoading(false);
              return;
            }
          }

          setCustomer({ id: docSnap.id, ...data });
        } else {
          setError('Customer not found.');
        }
      } catch (err) {
        setError('Error loading details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id, tokenParam]);

  const handleSubmit = async () => {
    if (!signature || !id || !termsAccepted) return;
    setSubmitting(true);
    try {
      const docRef = doc(db, 'customers', id);
      const signedDate = new Date();
      const timestampText = formatSignatureTimestamp(signedDate);
      const stampedSignature = await stampSignatureImage(signature, timestampText, customer?.name);

      await updateDoc(docRef, {
        signature: stampedSignature,
        signatureTimestamp: timestampText,
        signedAt: signedDate,
        termsAccepted: true,
        termsAcceptedAt: signedDate,
        updatedAt: signedDate,
        // IMPORTANT: Delete both the token and the expiration time
        signatureRequestToken: deleteField(),
        signatureRequestExpiresAt: deleteField()
      });
      setSignedTimestamp(timestampText);
      setSuccess(true);
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('Failed to save signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-slate-100">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">Your electronic signature has been legally verified and successfully saved.</p>
          
          {signedTimestamp && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 font-mono mb-4 text-left">
              <span className="font-bold block mb-1">Audit Trail Record:</span>
              <p>{signedTimestamp}</p>
              <p className="text-emerald-700 mt-1">✓ Verified Terms & Conditions Agreed</p>
            </div>
          )}
          
          <p className="text-sm text-gray-400">You can safely close this window.</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    const isSaveError = error.includes('Failed to save'); 

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        {isSaveError ? (
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        ) : isExpiredError ? (
          <Clock className="w-16 h-16 text-orange-500 mb-4" />
        ) : (
          <Lock className="w-16 h-16 text-gray-400 mb-4" />
        )}
        
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isSaveError ? 'Submission Error' : isExpiredError ? 'Link Expired' : 'Access Denied'}
        </h1>
        
        <p className="text-gray-600 max-w-sm">{error || 'This signature request is no longer valid.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Signature Request</h2>
          <p className="text-sm text-gray-500 mt-1">
            For: <span className="font-medium text-gray-800">{customer.name}</span>
          </p>
        </div>

        {customer.signature && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Current Signature
            </p>
            <div className="flex justify-center">
              <img 
                src={customer.signature} 
                alt="Current Signature" 
                className="max-h-20 opacity-70" 
              />
            </div>
            {customer.signatureTimestamp && (
              <p className="text-[11px] text-gray-500 font-mono text-center mt-2">
                {customer.signatureTimestamp}
              </p>
            )}
            <p className="text-xs text-gray-400 text-center mt-2">
              Signing below will replace this signature and record a new timestamp.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {customer.signature ? 'New Signature' : 'Please sign below'}
          </label>
          
          <div className="border rounded-md bg-white">
            <SignaturePad 
              value={signature} 
              onChange={setSignature} 
            />
          </div>

          {/* Mandatory Terms & Conditions Tick Box */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-start space-x-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer transition-colors"
                required
              />
              <span className="text-xs text-gray-700 leading-relaxed font-medium group-hover:text-gray-900">
                I agree to the <span className="font-semibold text-gray-900 underline">Terms &amp; Conditions</span> and confirm that my electronic signature is legally binding.
              </span>
            </label>
          </div>

          {/* Submit button: strictly disabled until signature is drawn AND T&C is checked */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!signature || !termsAccepted || submitting}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-600 focus:outline-none disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? 'Verifying & Saving...' : 'Submit / Sign'}
          </button>

          {!termsAccepted && signature && (
            <p className="text-xs text-amber-600 font-medium text-center">
              ⚠️ Please tick the Terms &amp; Conditions box to enable submission.
            </p>
          )}
        </div>
        
        <p className="text-xs text-gray-400 text-center mt-6">
          Secure one-time link provided by AIE Skyline • Legally Binding E-Signature
        </p>
      </div>
    </div>
  );
};

export default SignCustomer;