"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ConfigService } from "@/services/ConfigService";
import { PresenceService } from "@/services/PresenceService";

interface UserProfile {
  username: string;
  displayName: string;
  age: number;
  gender: string;
  profilePicture?: string;
  email?: string;
  bio?: string;
  isPerformer?: boolean;
  connectionFee?: number;
  selfieAvailable?: boolean;
  preferences: {
    interestedIn: string[];
    categories: string[];
  };
  favorites: string[];
  sessionHistory: SessionHistory[];
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  };
  recordings: RecordedSession[];
  createdAt: Date;
}

interface SessionHistory {
  partnerId: string;
  partnerUsername: string;
  duration: number;
  timestamp: Date;
  rating?: number;
  connectionFee: number;
  wasRecorded: boolean;
  recordingId?: string;
}

interface RecordedSession {
  id: string;
  partnerId: string;
  partnerUsername: string;
  title: string;
  duration: number;
  timestamp: Date;
  views: number;
  earnings: number;
  price: number;
  isPublic: boolean;
  thumbnail?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (username: string, email: string, password: string, profileData: Partial<UserProfile>) => Promise<void>;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addFavorite: (performerId: string) => Promise<void>;
  removeFavorite: (performerId: string) => Promise<void>;
  addSessionHistory: (session: SessionHistory) => Promise<void>;
  addRecording: (recording: RecordedSession) => Promise<void>;
  updateWallet: (amount: number, type: 'earn' | 'spend') => Promise<void>;
}

export type { UserProfile, SessionHistory, RecordedSession };

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert username to email format for Firebase
  const usernameToEmail = (username: string) => `${username.toLowerCase()}@xoxo.app`;

  // Fetch user profile from Firestore with retry logic
  const fetchUserProfile = async (uid: string, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
    
    try {
      console.log(`Attempting to fetch user profile for ${uid} (attempt ${retryCount + 1})`);
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log("User profile fetched successfully");
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        console.log("User profile document does not exist, creating a default profile");
        try {
          const authUser = auth.currentUser;
          const derivedUsername = (authUser?.email?.split('@')[0] || 'user').toLowerCase();
          const defaultProfile: UserProfile = {
            username: derivedUsername,
            email: authUser?.email || undefined,
            displayName: authUser?.displayName || derivedUsername,
            age: 18,
            gender: "prefer-not-to-say",
            isPerformer: true,
            connectionFee: 2.99,
            selfieAvailable: false,
            preferences: {
              interestedIn: [],
              categories: [],
            },
            favorites: [],
            sessionHistory: [],
            wallet: {
              balance: 50.0,
              totalEarned: 0,
              totalSpent: 0,
            },
            recordings: [],
            createdAt: new Date(),
          };

          await setDoc(docRef, defaultProfile);
          setUserProfile(defaultProfile);
          console.log("Default profile created successfully");
        } catch (createErr) {
          console.error("Failed to create default profile:", createErr);
          setUserProfile(null);
        }
      }
    } catch (error: any) {
      console.error(`Error fetching user profile (attempt ${retryCount + 1}):`, error);
      
      // Handle specific error types
      if (error.code === 'permission-denied') {
        console.error("🔒 Permission denied. This might mean:");
        console.log("1. Firestore rules are preventing access");
        console.log("2. The user authentication token hasn't propagated yet");
        console.log("3. You need to deploy your Firestore rules");
        setUserProfile(null);
        return; // Don't retry permission errors
      }
      
      // Check if it's a network error and we should retry
      const shouldRetry = retryCount < maxRetries && (
        error.code === 'unavailable' ||
        error.code === 'deadline-exceeded' ||
        error.message?.includes('network') ||
        error.message?.includes('transport')
      );
      
      if (shouldRetry) {
        console.log(`🔄 Retrying in ${retryDelay}ms... (${maxRetries - retryCount} attempts left)`);
        setTimeout(() => {
          fetchUserProfile(uid, retryCount + 1);
        }, retryDelay);
      } else {
        console.error("⏹️ Max retries reached or non-retryable error");
        console.log("Error code:", error.code);
        console.log("Error message:", error.message);
        console.log("UID:", uid);
        // Don't set userProfile to null on error - keep existing state
        // This allows the app to continue functioning
      }
    }
  };

  useEffect(() => {
    console.log("AuthContext: Setting up auth listener");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: Auth state changed", user ? "User logged in" : "No user");
      setUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
        // If current profile indicates performer, upsert presence
        if (userProfile?.isPerformer) {
          try { await PresenceService.upsertPerformer(user.uid, userProfile, true); } catch {}
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Upsert performer presence whenever profile indicates performer
  useEffect(() => {
    const syncPresence = async () => {
      if (user && userProfile?.isPerformer) {
        try {
          await PresenceService.upsertPerformer(user.uid, userProfile, true);
        } catch (e) {}
      }
    };
    syncPresence();
  }, [user, userProfile?.isPerformer]);

  const signUp = async (
    username: string,
    email: string,
    password: string,
    profileData: Partial<UserProfile>
  ) => {
    try {
      const effectiveEmail = email?.trim() || usernameToEmail(username);
      console.log(`Creating account for ${username} with email ${email}`);
      
      const userCredential = await createUserWithEmailAndPassword(auth, effectiveEmail, password);
      console.log("User account created successfully");
      
      // Load app config for defaults
      const appConfig = await ConfigService.getConfig();

      // Create user profile in Firestore
      const profile: UserProfile = {
        username: username.toLowerCase(),
        email: effectiveEmail.toLowerCase(),
        displayName: profileData.displayName || username,
        age: profileData.age || 18,
        gender: profileData.gender || "prefer-not-to-say",
        isPerformer: profileData.isPerformer ?? true,
        connectionFee: profileData.connectionFee ?? appConfig.defaultConnectionFee ?? 2.99,
        selfieAvailable: profileData.selfieAvailable ?? false,
        preferences: {
          interestedIn: profileData.preferences?.interestedIn || appConfig.interests || [],
          categories: profileData.preferences?.categories || appConfig.categories || [],
        },
        favorites: [],
        sessionHistory: [],
        wallet: {
          balance: appConfig.signupBonus ?? 50.00,
          totalEarned: 0,
          totalSpent: 0,
        },
        recordings: [],
        createdAt: new Date(),
      };

      console.log("Creating user profile in Firestore");
      await setDoc(doc(db, "users", userCredential.user.uid), profile);
      
      // Immediately set the user and profile states
      setUser(userCredential.user);
      setUserProfile(profile);
      // If signing up as performer, upsert presence
      if (profile.isPerformer) {
        try { await PresenceService.upsertPerformer(userCredential.user.uid, profile, true); } catch {}
      }
      console.log("✅ User profile created successfully and state updated");
    } catch (error: any) {
      console.error("Error during sign up:", error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("Email is already in use. Please sign in or use another email.");
      } else if (error.code === 'auth/weak-password') {
        throw new Error("Password is too weak. Please use at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        throw new Error("Invalid email format. Please enter a valid email address.");
      } else if (error.code === 'permission-denied') {
        throw new Error("Unable to create account. Please check your permissions.");
      } else if (error.code === 'unavailable') {
        throw new Error("Service temporarily unavailable. Please try again in a moment.");
      } else {
        throw new Error("Failed to create account. Please check your internet connection and try again.");
      }
    }
  };

  const signIn = async (usernameOrEmail: string, password: string) => {
    const isEmail = usernameOrEmail.includes('@');
    const emailToUse = isEmail ? usernameOrEmail.trim().toLowerCase() : usernameToEmail(usernameOrEmail);
    await signInWithEmailAndPassword(auth, emailToUse, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error("No user logged in");
    
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, updates, { merge: true });
      
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
      console.log("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      // Show user-friendly error message
      if (error.code === 'permission-denied') {
        throw new Error("You don't have permission to update your profile. Please check your account settings.");
      } else if (error.code === 'unavailable') {
        throw new Error("Service temporarily unavailable. Please try again in a moment.");
      } else {
        throw new Error("Failed to update profile. Please check your internet connection and try again.");
      }
    }
  };

  const addFavorite = async (performerId: string) => {
    if (!user || !userProfile) {
      console.error('❌ AuthContext: No user or userProfile for addFavorite');
      throw new Error("No user logged in");
    }
    
    console.log('🔄 AuthContext: Adding favorite', { performerId, userId: user.uid });
    
    const updatedFavorites = [...userProfile.favorites, performerId];
    await updateProfile({ favorites: updatedFavorites });
    
    console.log('✅ AuthContext: Favorite added successfully');
  };

  const removeFavorite = async (performerId: string) => {
    if (!user || !userProfile) {
      console.error('❌ AuthContext: No user or userProfile for removeFavorite');
      throw new Error("No user logged in");
    }
    
    console.log('🔄 AuthContext: Removing favorite', { performerId, userId: user.uid });
    
    const updatedFavorites = userProfile.favorites.filter(id => id !== performerId);
    await updateProfile({ favorites: updatedFavorites });
    
    console.log('✅ AuthContext: Favorite removed successfully');
  };

  const addSessionHistory = async (session: SessionHistory) => {
    if (!user || !userProfile) throw new Error("No user logged in");
    
    const updatedHistory = [...userProfile.sessionHistory, session];
    await updateProfile({ sessionHistory: updatedHistory });
  };

  const addRecording = async (recording: RecordedSession) => {
    if (!user || !userProfile) throw new Error("No user logged in");
    
    const updatedRecordings = [...userProfile.recordings, recording];
    await updateProfile({ recordings: updatedRecordings });
  };

  const updateWallet = async (amount: number, type: 'earn' | 'spend') => {
    if (!user || !userProfile) throw new Error("No user logged in");
    
    const newWallet = { ...userProfile.wallet };
    
    if (type === 'earn') {
      newWallet.balance += amount;
      newWallet.totalEarned += amount;
    } else {
      newWallet.balance -= amount;
      newWallet.totalSpent += amount;
    }
    
    await updateProfile({ wallet: newWallet });
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    logout,
    updateProfile,
    addFavorite,
    removeFavorite,
    addSessionHistory,
    addRecording,
    updateWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
