"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, Role, Permission, RBAC_CONFIG, hasPermission } from "./rbac";
import {
  loginUser,
  logoutUser,
  submitAccountRequest,
  getUserProfile,
  updateUserProfile,
  RegisterRequestPayload as RegisterRequestData,
} from "./auth-service";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, enteredFullName?: string) => Promise<{ success: boolean; error?: string; status?: string; role?: Role }>;
  register: (data: RegisterRequestData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  can: (permission: Permission) => boolean;
  permissions: Permission[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Save real login activity event under user's Firestore collection
async function recordLoginActivity(uid: string, email: string) {
  try {
    const userActivityRef = collection(db, "users", uid, "login_activity");
    const ua = typeof window !== "undefined" ? navigator.userAgent : "";

    let deviceName = "Browser / Web App";
    if (ua.includes("Windows")) deviceName = "Windows PC";
    else if (ua.includes("Macintosh")) deviceName = "macOS Workstation";
    else if (ua.includes("iPhone") || ua.includes("iPad")) deviceName = "iOS Device";
    else if (ua.includes("Android")) deviceName = "Android Device";

    await addDoc(userActivityRef, {
      uid,
      email,
      device: deviceName,
      userAgent: ua,
      status: "Success",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to record login activity:", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);
        if (profile && profile.status === "active") {
          setFirebaseUser(fbUser);
          setUser(profile);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string, enteredFullName?: string) => {
    try {
      const fbUser = await loginUser(email, password);
      const profile = await getUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);

      if (!profile) {
        await logoutUser();
        return { success: false, error: "Account record not found in system database." };
      }

      if (enteredFullName) {
        const storedName = (profile.fullName || profile.name || "").trim().toLowerCase();
        const inputName = enteredFullName.trim().toLowerCase();

        if (storedName !== inputName) {
          await logoutUser();
          return {
            success: false,
            error: "The entered Full Name does not match the record for this account.",
          };
        }
      }

      if (profile.status === "archived") {
        await logoutUser();
        return {
          success: false,
          status: "archived",
          error: "Your account is currently archived.",
        };
      }

      if (profile.status === "deactivated" || profile.status === "suspended") {
        await logoutUser();
        return {
          success: false,
          status: profile.status,
          error: "This account has been declined, suspended, or deactivated by the administrator.",
        };
      }

      // Record actual successful login event to Firestore
      await recordLoginActivity(fbUser.uid, fbUser.email || email);

      setUser(profile);
      setFirebaseUser(fbUser);
      return { success: true, role: profile.role };
    } catch (err: any) {
      return { success: false, error: err.code || err.message };
    }
  }, []);

  const register = useCallback(async (data: RegisterRequestData) => {
    try {
      await submitAccountRequest(data);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.code || err.message };
    }
  }, []);

  const updateUser = useCallback(async (updatedData: Partial<User>) => {
    if (!user) {
      return { success: false, error: "No authenticated user found." };
    }

    try {
      await updateUserProfile(user.id, updatedData);

      setUser((prevUser) => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          ...updatedData,
        };
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update profile record." };
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Firebase logout error:", err);
    } finally {
      setUser(null);
      setFirebaseUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!user || user.status !== "active") return false;
      return hasPermission(user.role, permission);
    },
    [user]
  );

  const permissions = user && user.status === "active" ? RBAC_CONFIG[user.role]?.permissions || [] : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        role: user?.role ?? null,
        isAuthenticated: !!user && !!firebaseUser && user.status === "active",
        isLoading,
        login,
        register,
        logout,
        updateUser,
        can,
        permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}