import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useCompanyDetails = () => {
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
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
    };

    fetchCompanyDetails();
  }, []);

  return { companyDetails, loading };
};