// src/pages/SignCustomer.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import SignaturePad from '../components/ui/SignaturePad';
import { CheckCircle, AlertCircle, Lock, Clock } from 'lucide-react'; // Added Clock icon
import { Customer } from '../types/customer';

const SignCustomer = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
    if (!signature || !id) return;
    setSubmitting(true);
    try {
      const docRef = doc(db, 'customers', id);
      await updateDoc(docRef, {
        signature: signature,
        updatedAt: new Date(),
        // IMPORTANT: Delete both the token and the expiration time
        signatureRequestToken: deleteField(),
        signatureRequestExpiresAt: deleteField()
      });
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
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
        <p className="text-gray-600">Your signature has been successfully saved.</p>
        <p className="text-sm text-gray-400 mt-4">You can close this window.</p>
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
            <p className="text-xs text-gray-400 text-center mt-2">
              Signing below will replace this signature.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {customer.signature ? 'New Signature' : 'Please sign below'}
          </label>
          
          <div className="border rounded-md">
            <SignaturePad 
              value={signature} 
              onChange={setSignature} 
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!signature || submitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Submit Signature'}
          </button>
        </div>
        
        <p className="text-xs text-gray-400 text-center mt-6">
          Secure one-time link provided by AIE Skyline
        </p>
      </div>
    </div>
  );
};

export default SignCustomer;