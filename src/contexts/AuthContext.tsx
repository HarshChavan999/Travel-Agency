'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuthInstance, getDbInstance, getStorageInstance } from '@/lib/firebase';

interface UserData {
  role: 'admin' | 'agency' | 'user';
  approved: boolean;
  name?: string;
  companyName?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, role: 'agency' | 'user', userData: Omit<UserData, 'role' | 'approved'>, file?: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuthInstance();
    if (!authInstance) return;

    const handleAuthStateChange = async (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user data from Firestore
        const dbInstance = getDbInstance();
        if (dbInstance) {
          const userDoc = await getDoc(doc(dbInstance, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(authInstance, handleAuthStateChange);

    // Handle redirect result for Google sign-in
    const handleRedirectResult = async () => {
      try {
        const redirectResult = await getRedirectResult(authInstance);
        if (redirectResult) {
          console.log('Google User UID from redirect:', redirectResult.user.uid);
          
          const dbInstance = getDbInstance();
          if (!dbInstance) throw new Error('Database not initialized');

          const userDocRef = doc(dbInstance, 'users', redirectResult.user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            if (!data.approved) {
              throw new Error('Account not approved yet. Please wait for admin approval.');
            }
            setUserData(data);
          } else {
            // For Google sign-in, if no document exists, create one as agency (or check if it's admin email)
            const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
            const isAdmin = adminEmails.includes(redirectResult.user.email || '');
            const userDataToSave = {
              role: isAdmin ? 'admin' : 'agency',
              approved: isAdmin, // Auto-approve admin
              name: redirectResult.user.displayName || 'User',
              ...(isAdmin ? {} : { companyName: 'Pending Setup' }), // Only add companyName for agencies
            };
            await setDoc(userDocRef, userDataToSave);
            setUserData(userDataToSave as UserData);
          }
          
          // Clear the redirect flag
          sessionStorage.removeItem('google_signin_redirect');
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
        // Clear the redirect flag on error
        sessionStorage.removeItem('google_signin_redirect');
      }
    };

    // Check if we're returning from a Google redirect
    const isRedirect = sessionStorage.getItem('google_signin_redirect');
    if (isRedirect) {
      handleRedirectResult();
    }

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign-in process for:', email);

      const authInstance = getAuthInstance();
      if (!authInstance) {
        console.error('❌ Auth instance not initialized');
        throw new Error('Authentication service not available. Please check your connection.');
      }

      console.log('🔄 Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      console.log('✅ Firebase auth successful for user:', userCredential.user.uid);

      const dbInstance = getDbInstance();
      if (!dbInstance) {
        console.error('❌ Database instance not initialized');
        throw new Error('Database service not available. Please try again later.');
      }

      const userDocRef = doc(dbInstance, 'users', userCredential.user.uid);
      console.log('🔍 Fetching user document:', userDocRef.path);

      const userDoc = await getDoc(userDocRef);
      console.log('📄 User document exists:', userDoc.exists());

      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        console.log('👤 User data retrieved:', { role: data.role, approved: data.approved, name: data.name });

        if (!data.approved) {
          console.warn('⚠️ User account not approved yet');
          throw new Error('Account not approved yet. Please wait for admin approval.');
        }

        setUserData(data);
        console.log('✅ Sign-in process completed successfully');
      } else {
        console.error('❌ User document not found in database');
        throw new Error('User profile not found. Please contact support.');
      }
    } catch (error: any) {
      console.error('❌ Sign-in failed:', error);

      // Re-throw with more user-friendly messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'unavailable') {
        throw new Error('Service temporarily unavailable. Please check your connection.');
      }

      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const authInstance = getAuthInstance();
      if (!authInstance) throw new Error('Auth not initialized');

      const provider = new GoogleAuthProvider();
      
      // Configure Google Auth provider for better popup handling
      provider.setCustomParameters({
        prompt: 'select_account' // Force account selection
      });

      let userCredential;
      
      try {
        // Try popup first
        userCredential = await signInWithPopup(authInstance, provider);
      } catch (popupError: any) {
        // If popup fails, try redirect method as fallback
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' || 
            popupError.code === 'auth/cancelled-popup-request') {
          
          console.warn('Popup method failed, attempting redirect method...');
          
          // Store a flag in sessionStorage to indicate we're using redirect
          sessionStorage.setItem('google_signin_redirect', 'true');
          
          // Use redirect method
          await signInWithRedirect(authInstance, provider);
          
          // This will redirect the page, so we won't reach here
          return;
        }
        
        // If it's not a popup-related error, re-throw
        throw popupError;
      }

      console.log('Google User UID:', userCredential.user.uid);

      const dbInstance = getDbInstance();
      if (!dbInstance) throw new Error('Database not initialized');

      const userDocRef = doc(dbInstance, 'users', userCredential.user.uid);
      console.log('Looking for document:', userDocRef.path);
      const userDoc = await getDoc(userDocRef);
      console.log('Document exists:', userDoc.exists());
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        console.log('User data:', data);
        if (!data.approved) {
          throw new Error('Account not approved yet. Please wait for admin approval.');
        }
        setUserData(data);
      } else {
        // For Google sign-in, if no document exists, create one as agency (or check if it's admin email)
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
        const isAdmin = adminEmails.includes(userCredential.user.email || '');
        const userDataToSave = {
          role: isAdmin ? 'admin' : 'agency',
          approved: isAdmin, // Auto-approve admin
          name: userCredential.user.displayName || 'User',
          ...(isAdmin ? {} : { companyName: 'Pending Setup' }), // Only add companyName for agencies
        };
        await setDoc(userDocRef, userDataToSave);
        setUserData(userDataToSave as UserData);
      }
    } catch (error: any) {
      // Handle popup-related errors gracefully
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn('Google sign-in popup was blocked or cancelled. Please allow popups for this site or use email/password login.');
        throw new Error('Google sign-in popup was blocked. Please allow popups for this site or use email/password login instead.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    const authInstance = getAuthInstance();
    if (authInstance) {
      await firebaseSignOut(authInstance);
    }
  };

  const register = async (email: string, password: string, role: 'agency' | 'user', userDataInput: Omit<UserData, 'role' | 'approved'>, file?: File) => {
    try {
      const authInstance = getAuthInstance();
      if (!authInstance) throw new Error('Auth not initialized');

      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;

      let proofUrl = null;
      // Upload file if provided
      if (file) {
        const storageInstance = getStorageInstance();
        if (storageInstance) {
          const storageRef = ref(storageInstance, `proofs/${user.uid}/${file.name}`);
          await uploadBytes(storageRef, file);
          proofUrl = await getDownloadURL(storageRef);
        }
      }

      const dbInstance = getDbInstance();
      if (!dbInstance) throw new Error('Database not initialized');

      // Save to Firestore
      await setDoc(doc(dbInstance, 'users', user.uid), {
        ...userDataInput,
        role,
        approved: role === 'user', // Users are auto-approved
        wishlist: [], // Initialize empty wishlist for new users
        ...(proofUrl && { proofUrl }),
      });
    } catch (error: any) {
      // Handle specific Firebase errors with user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email address or try logging in instead.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    }
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
