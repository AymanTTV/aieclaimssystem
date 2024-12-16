import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase/config';
import { LoginCredentials, AuthResponse } from './types';
import { getAuthErrorMessage } from './errors';
import { User } from '../../types';
import { getDefaultPermissions } from '../../types/roles';

export const login = async ({ email, password }: LoginCredentials): Promise<AuthResponse> => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    return {
      user: {
        id: userDoc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate() || new Date(),
      } as User
    };
  } catch (error: any) {
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: getAuthErrorMessage(error.code)
      }
    };
  }
};

export const createUserAccount = async (
  email: string, 
  password: string, 
  userData: Partial<User>
): Promise<AuthResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser = {
      email,
      ...userData,
      permissions: getDefaultPermissions(userData.role || 'driver'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);

    return {
      user: {
        id: userCredential.user.uid,
        ...newUser
      } as User
    };
  } catch (error: any) {
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: getAuthErrorMessage(error.code)
      }
    };
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};