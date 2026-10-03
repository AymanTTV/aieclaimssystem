import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useCompanyDetails = () => {
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanyDetails = useCallback(async () => {
    try {
      const docRef = doc(db, 'companySettings', 'details');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCompanyDetails(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial snapshot listener for real-time Firestore sync
    let unsubscribe = () => {};
    try {
      const docRef = doc(db, 'companySettings', 'details');
      unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setCompanyDetails(docSnap.data());
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Real-time companySettings listener fallback to single fetch:', error);
          fetchCompanyDetails();
        }
      );
    } catch (err) {
      console.warn('Failed to attach onSnapshot to companySettings:', err);
      fetchCompanyDetails();
    }

    // 2. Synchronous local event listener for instant zero-latency updates
    const handleLocalTermsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ templates?: any; companyDetails?: any }>;
      if (customEvent.detail?.companyDetails) {
        setCompanyDetails(customEvent.detail.companyDetails);
      } else if (customEvent.detail?.templates) {
        setCompanyDetails((prev: any) => ({
          ...(prev || {}),
          dynamicTermsTemplates: customEvent.detail.templates,
        }));
      }
    };

    window.addEventListener('company-terms-updated', handleLocalTermsUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('company-terms-updated', handleLocalTermsUpdate);
    };
  }, [fetchCompanyDetails]);

  const updateCompanyDetails = useCallback((newDetails: any) => {
    setCompanyDetails(newDetails);
  }, []);

  return { companyDetails, loading, refreshCompanyDetails: fetchCompanyDetails, updateCompanyDetails };
};
