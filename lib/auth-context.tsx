"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, Role, Permission, RBAC_CONFIG, hasPermission } from "./rbac";
import {
  loginUser,
  logoutUser,
  submitAccountRequest,
  getUserProfile,
  updateUserProfile,
  requestTwoFactorOtp,
  confirmTwoFactorOtp,
  TwoFactorPurpose,
  RegisterRequestPayload as RegisterRequestData,
} from "./auth-service";

interface PendingTwoFactor {
  uid: string;
  email: string;
  maskedEmail: string;
}

interface TwoFactorActionResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, enteredFullName?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; status?: string; role?: Role }>;
  register: (data: RegisterRequestData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  can: (permission: Permission) => boolean;
  permissions: Permission[];

  // Login-time 2FA (password verified, waiting on the emailed OTP)
  pendingTwoFactor: PendingTwoFactor | null;
  verifyLoginTwoFactorCode: (code: string) => Promise<{ success: boolean; error?: string; role?: Role }>;
  resendLoginTwoFactorCode: () => Promise<{ success: boolean; error?: string; maskedEmail?: string }>;
  cancelTwoFactorLogin: () => Promise<void>;

  // Settings-time 2FA enable/disable
  sendTwoFactorOtp: (purpose: "enable" | "disable") => Promise<{ success: boolean; error?: string; maskedEmail?: string }>;
  confirmTwoFactorChange: (code: string, purpose: "enable" | "disable") => Promise<TwoFactorActionResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Checks whether this browser's session has cleared the 2FA challenge via custom claims.
 */
async function isTwoFactorVerifiedByClaims(fbUser: FirebaseUser): Promise<boolean> {
  try {
    const tokenResult = await fbUser.getIdTokenResult(true);
    return tokenResult.claims?.twoFactorVerified === true;
  } catch (err) {
    console.error("Failed to read 2FA verification claim:", err);
    return false; // fail closed
  }
}

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
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);

        if (profile && profile.status === "active") {
          const requiresTwoFactor = Boolean(profile.twoFactorEnabled);
          const alreadyVerified = requiresTwoFactor ? await isTwoFactorVerifiedByClaims(fbUser) : true;

          if (requiresTwoFactor && !alreadyVerified) {
            setFirebaseUser(fbUser);
            setUser(null);
            setPendingTwoFactor((prev) =>
              prev && prev.uid === fbUser.uid
                ? prev
                : { uid: fbUser.uid, email: profile.email, maskedEmail: profile.email }
            );
          } else {
            setFirebaseUser(fbUser);
            setUser(profile);
            setPendingTwoFactor(null);
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setPendingTwoFactor(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (
    email: string, 
    password: string, 
    enteredFullName?: string, 
    rememberMe: boolean = false
  ) => {
    try {
      // 1. Set Firebase client persistence based on Remember Me toggle
      try {
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
      } catch (persistErr) {
        console.warn("Failed to set Firebase Auth persistence mode:", persistErr);
      }

      // 2. Authenticate user
      const fbUser = await loginUser(email, password, rememberMe);
      const profile = await getUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);

      if (!profile) {
        await logoutUser();
        return { success: false, error: "Account record not found in system database." };
      }

      // 3. Name verification against registered record
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

      // 4. Status checks
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

      // 5. If 2FA is enabled for this account, ALWAYS trigger the 2FA verification flow
      // on fresh login, reset the verified token, and send an OTP code.
      if (profile.twoFactorEnabled) {
        setFirebaseUser(fbUser);
        setUser(null);

        const otpResult = await requestTwoFactorOtp(fbUser, "login");
        if (!otpResult.success) {
          await logoutUser();
          setFirebaseUser(null);
          return {
            success: false,
            error: otpResult.error || "Failed to send your verification code. Please try again.",
          };
        }

        setPendingTwoFactor({
          uid: fbUser.uid,
          email: profile.email,
          maskedEmail: otpResult.maskedEmail || profile.email,
        });

        return { success: true, status: "requires_2fa", role: profile.role };
      }

      // 6. Record successful login event to Firestore
      await recordLoginActivity(fbUser.uid, fbUser.email || email);

      setUser(profile);
      setFirebaseUser(fbUser);
      setPendingTwoFactor(null);
      return { success: true, role: profile.role };
    } catch (err: any) {
      return { success: false, error: err.code || err.message };
    }
  }, []);

  const verifyLoginTwoFactorCode = useCallback(
    async (code: string) => {
      if (!firebaseUser || !pendingTwoFactor) {
        return { success: false, error: "Your sign-in session has expired. Please log in again." };
      }

      // Server verifies the OTP and sets the custom claim
      const result = await confirmTwoFactorOtp(firebaseUser, code, "login");
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Force-refresh the ID token so the browser receives the new twoFactorVerified claim
      try {
        await firebaseUser.getIdToken(true);
        await firebaseUser.reload();
      } catch (err) {
        console.error("Failed to refresh ID token after 2FA verification:", err);
      }

      const profile = await getUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName);
      if (!profile) {
        await logoutUser();
        setFirebaseUser(null);
        setPendingTwoFactor(null);
        return { success: false, error: "Account record not found in system database." };
      }

      await recordLoginActivity(firebaseUser.uid, firebaseUser.email || profile.email);

      setUser(profile);
      setPendingTwoFactor(null);
      return { success: true, role: profile.role };
    },
    [firebaseUser, pendingTwoFactor]
  );

  const resendLoginTwoFactorCode = useCallback(async () => {
    if (!firebaseUser || !pendingTwoFactor) {
      return { success: false, error: "Your sign-in session has expired. Please log in again." };
    }

    const result = await requestTwoFactorOtp(firebaseUser, "login");
    if (result.success) {
      setPendingTwoFactor((prev) => (prev ? { ...prev, maskedEmail: result.maskedEmail || prev.maskedEmail } : prev));
    }
    return result;
  }, [firebaseUser, pendingTwoFactor]);

  const cancelTwoFactorLogin = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Failed to cancel pending 2FA session:", err);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setPendingTwoFactor(null);
    }
  }, []);

  const sendTwoFactorOtp = useCallback(
    async (purpose: "enable" | "disable") => {
      if (!firebaseUser) {
        return { success: false, error: "No authenticated user found." };
      }
      return requestTwoFactorOtp(firebaseUser, purpose as TwoFactorPurpose);
    },
    [firebaseUser]
  );

  const confirmTwoFactorChange = useCallback(
    async (code: string, purpose: "enable" | "disable"): Promise<TwoFactorActionResult> => {
      if (!firebaseUser || !user) {
        return { success: false, error: "No authenticated user found." };
      }

      const result = await confirmTwoFactorOtp(firebaseUser, code, purpose as TwoFactorPurpose);
      if (!result.success) {
        return result;
      }

      try {
        await firebaseUser.getIdToken(true);
        await firebaseUser.reload();
      } catch (err) {
        console.error("Failed to refresh token after 2FA change:", err);
      }

      setUser((prev) => (prev ? { ...prev, twoFactorEnabled: purpose === "enable" } : prev));
      return { success: true };
    },
    [firebaseUser, user]
  );

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
      setPendingTwoFactor(null);
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
        pendingTwoFactor,
        verifyLoginTwoFactorCode,
        resendLoginTwoFactorCode,
        cancelTwoFactorLogin,
        sendTwoFactorOtp,
        confirmTwoFactorChange,
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