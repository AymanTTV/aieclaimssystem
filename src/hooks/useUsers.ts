import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userData: User[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          } as User);
        });
        setUsers(userData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
};