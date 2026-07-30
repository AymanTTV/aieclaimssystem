import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DriverGroup {
  id: string;
  name: string;
}

export const useDriverGroups = () => {
  const [groups, setGroups] = useState<DriverGroup[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'driverGroups'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupData: DriverGroup[] = [];
      snapshot.forEach((doc) => {
        groupData.push({ id: doc.id, name: doc.data().name });
      });
      setGroups(groupData);
    });
    return () => unsubscribe();
  }, []);

  return { groups };
};