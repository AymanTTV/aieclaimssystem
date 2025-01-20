import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  error: null 
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: userDoc.id,
              ...userData,
              createdAt: userData.createdAt?.toDate() || new Date(),
            } as User);
          } else {
            setUser(null);
            setError(new Error('User data not found'));
            toast.error('User profile not found');
          }
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch user data'));
        toast.error('Error loading user data. Please try again.');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      setError(error instanceof Error ? error : new Error('Authentication error'));
      setLoading(false);
      toast.error('Authentication error. Please try again.');
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;