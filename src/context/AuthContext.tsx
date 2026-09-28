import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { User } from '../types';
import { RolePermissions } from '../types/roles';
import toast from 'react-hot-toast';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  /** Counter incremented whenever permissions update in real-time */
  permissionsEpoch: number;
  /** Directly updates the current user's permissions and increments version */
  updateUserPermissions: (permissions: RolePermissions) => void;
  /** Directly updates the active user object */
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  /** Force-resyncs the current user document from Firestore */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  error: null,
  permissionsEpoch: 0,
  updateUserPermissions: () => {},
  setUser: () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissionsEpoch, setPermissionsEpoch] = useState<number>(1);

  // Direct programmatic permissions update with reactive epoch bump
  const updateUserPermissions = useCallback((newPermissions: RolePermissions) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        permissions: newPermissions,
      };
    });
    setPermissionsEpoch((prev) => prev + 1);
    // Broadcast to any interested hook or component
    try {
      window.dispatchEvent(
        new CustomEvent('user_permissions_updated', {
          detail: { permissions: newPermissions, timestamp: Date.now() },
        })
      );
    } catch {
      // Safe noop if environment doesn't support custom events
    }
  }, []);

  // Force-resync current user record from Firestore
  const refreshUser = useCallback(async () => {
    const currentFbUser = auth.currentUser;
    if (!currentFbUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', currentFbUser.uid));
      if (snap.exists()) {
        const userData = snap.data();
        setUser({
          id: snap.id,
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date(),
        } as User);
        setPermissionsEpoch((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to manually refresh user:', err);
    }
  }, []);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        setLoading(true);
        // Real-time snapshot listener on the user's Firestore document
        unsubscribeDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUser({
                id: userDoc.id,
                ...userData,
                createdAt: userData.createdAt?.toDate() || new Date(),
              } as User);
              setError(null);
              setPermissionsEpoch((prev) => prev + 1);
            } else {
              setUser(null);
              setError(new Error('User data not found'));
              toast.error('User profile not found');
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error listening to user data:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
      }
    }, (authError) => {
      console.error('Auth state change error:', authError);
      setError(authError instanceof Error ? authError : new Error('Authentication error'));
      setLoading(false);
      toast.error('Authentication error. Please try again.');
    });

    // Global listener for cross-component permissions matrix synchronization
    const handlePermissionsEvent = (event: Event) => {
      const customEvt = event as CustomEvent<{ userId?: string; permissions?: RolePermissions }>;
      if (customEvt.detail?.permissions) {
        setUser((prev) => {
          if (!prev) return null;
          // If targeted to a specific user and it matches, or global
          if (customEvt.detail?.userId && customEvt.detail.userId !== prev.id) {
            return prev;
          }
          return {
            ...prev,
            permissions: customEvt.detail.permissions!,
          };
        });
        setPermissionsEpoch((prev) => prev + 1);
      }
    };

    window.addEventListener('user_permissions_updated', handlePermissionsEvent);

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      window.removeEventListener('user_permissions_updated', handlePermissionsEvent);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        permissionsEpoch,
        updateUserPermissions,
        setUser,
        refreshUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;