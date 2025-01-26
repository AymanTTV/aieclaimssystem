import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PersonalInjury } from '../types/personalInjury';

export const usePersonalInjuries = () => {
  const [injuries, setInjuries] = useState<PersonalInjury[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'personalInjuries'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const injuryData: PersonalInjury[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          injuryData.push({
            id: doc.id,
            ...data,
            dateOfBirth: data.dateOfBirth.toDate(),
            incidentDate: data.incidentDate.toDate(),
            signatureDate: data.signatureDate.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as PersonalInjury);
        });
        setInjuries(injuryData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching personal injuries:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { injuries, loading };
};
