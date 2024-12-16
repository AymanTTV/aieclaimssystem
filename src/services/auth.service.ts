import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/config';
import { User } from '../types';
import { getDefaultPermissions } from '../types/roles';

export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    // Set persistence to LOCAL to persist the auth state
    await setPersistence(auth, browserLocalPersistence);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    return {
      id: userDoc.id,
      ...userData,
      createdAt: userData.createdAt?.toDate() || new Date(),
    } as User;
  } catch (error: any) {
    // Handle specific Firebase auth errors
    switch (error.code) {
      case 'auth/invalid-credential':
        throw new Error('Invalid email or password');
      case 'auth/user-not-found':
        throw new Error('User not found');
      case 'auth/wrong-password':
        throw new Error('Invalid password');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled');
      default:
        throw new Error('An error occurred during login');
    }
  }
};

export const createUser = async (
  email: string, 
  password: string, 
  userData: Partial<User>
): Promise<User> => {
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
      id: userCredential.user.uid,
      ...newUser
    } as User;
  } catch (error: any) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('Email already in use');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/operation-not-allowed':
        throw new Error('Email/password accounts are not enabled');
      case 'auth/weak-password':
        throw new Error('Password is too weak');
      default:
        throw new Error('Failed to create account');
    }
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
};

// Helper function to check if user has required permissions
export const checkUserPermissions = async (userId: string, requiredPermission: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.permissions?.[requiredPermission] || false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};