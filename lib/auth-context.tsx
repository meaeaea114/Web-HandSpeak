"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "./firebase";
import { User, Role, Permission, RBAC_CONFIG, hasPermission } from "./rbac";
import {
  loginUser,
  logoutUser,
  submitAccountRequest,
  getUserProfile,
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
  can: (permission: Permission) => boolean;
  permissions: Permission[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);
        // Only active approved users remain authenticated in state
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
      // 1. Firebase Authentication
      const fbUser = await loginUser(email, password);

      // 2. Fetch Application User Record by UID
      const profile = await getUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);

      if (!profile) {
        await logoutUser();
        return { success: false, error: "Account record not found in system database." };
      }

      // 3. Full Name Verification Check
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

      // 4. Status Check: Pending / Archived
      if (profile.status === "archived") {
        await logoutUser();
        return {
          success: false,
          status: "archived",
          error: "Your account is currently archived.",
        };
      }

      // 5. Status Check: Deactivated / Suspended
      if (profile.status === "deactivated" || profile.status === "suspended") {
        await logoutUser();
        return {
          success: false,
          status: profile.status,
          error: "This account has been declined, suspended, or deactivated by the administrator.",
        };
      }

      // 6. Access Approved
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