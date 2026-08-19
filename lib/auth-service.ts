import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, Role as UserRole, Role, UserStatus, AccountRequest, Permission, RBAC_CONFIG } from "./rbac";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  permissions: Permission[];
  createdAt?: string;
  lastLogin?: string;
  status: 'active' | 'pending' | 'suspended';
  avatarUrl?: string;
}

export interface RegisterRequestPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string;
  password: string;
  employeeId: string;
  facultyPosition: string;
  department: string;
  assignedGrade: string;
  assignedSections: string[];
  idFile: File;
  proofFile?: File | null;
}

// 800 KB limit per file to easily fit inside Firestore's 1MB single-document limit
export const MAX_FILE_SIZE_BYTES = 800 * 1024;
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,50}$/;
export const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9-]{3,20}$/;
export const APPROVED_INSTITUTIONAL_DOMAINS = ["handspeak.edu", "school.edu.ph", "handspeak.edu.ph"];

export function formatAuthError(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-email":
      return "The email address is invalid or improperly formatted.";
    case "auth/user-disabled":
      return "This account has been deactivated by the administrator.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/email-already-in-use":
      return "An account or pending registration with this email already exists.";
    case "auth/weak-password":
      return "Password must meet all institutional complexity requirements.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return "Authentication error. Please check your information and try again.";
  }
}

export function validateRegistrationPayload(data: RegisterRequestPayload): void {
  if (!NAME_REGEX.test(data.firstName.trim())) {
    throw new Error("First Name must contain letters only (2-50 characters).");
  }
  if (data.middleName && data.middleName.trim() && !NAME_REGEX.test(data.middleName.trim())) {
    throw new Error("Middle Name contains invalid characters.");
  }
  if (!NAME_REGEX.test(data.lastName.trim())) {
    throw new Error("Last Name must contain letters only (2-50 characters).");
  }
  if (!EMPLOYEE_ID_REGEX.test(data.employeeId.trim())) {
    throw new Error("Employee ID must contain alphanumeric characters and hyphens only.");
  }

  const cleanEmail = data.email.trim().toLowerCase();
  const domain = cleanEmail.split("@")[1];
  if (!domain || !APPROVED_INSTITUTIONAL_DOMAINS.includes(domain)) {
    throw new Error(`Please use your official institutional email (e.g. @${APPROVED_INSTITUTIONAL_DOMAINS[0]}).`);
  }

  const password = data.password;
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new Error("Password must include uppercase, lowercase, numeric, and special characters.");
  }
  if (password.toLowerCase().includes(data.employeeId.toLowerCase().trim())) {
    throw new Error("Password cannot contain your Employee ID.");
  }
  if (!data.assignedSections || data.assignedSections.length === 0) {
    throw new Error("Please assign at least one class section.");
  }
  if (!data.idFile) {
    throw new Error("Official School ID document is required.");
  }
  if (!ALLOWED_MIME_TYPES.includes(data.idFile.type) || data.idFile.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("ID document must be a JPG or PNG under 800 KB.");
  }
  if (data.proofFile && (!ALLOWED_MIME_TYPES.includes(data.proofFile.type) || data.proofFile.size > MAX_FILE_SIZE_BYTES)) {
    throw new Error("Verification document must be a JPG or PNG under 800 KB.");
  }
}

/**
 * Converts a file to base64 data string (100% Free; no Cloud Storage bucket required)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function checkExistingRegistration(email: string, employeeId: string): Promise<{ exists: boolean; reason?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanEmpId = employeeId.trim().toUpperCase();

  try {
    const emailQuery = query(collection(db, "accountRequests"), where("email", "==", cleanEmail));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const data = emailSnap.docs[0].data();
      if (data.status === "pending") {
        return { exists: true, reason: "A registration request with this email is currently pending administrator review." };
      }
      if (data.status === "active") {
        return { exists: true, reason: "An active account with this email address already exists." };
      }
    }
  } catch (e) {
    // Continue to auth creation if restricted
  }

  return { exists: false };
}

/**
 * Fetch UserProfile using uid and RBAC definitions
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const role = (data.role as UserRole) || 'student';
      
      // Fallback lookup from RBAC_CONFIG for permissions
      const rolePermissions = RBAC_CONFIG?.[role]?.permissions || [];

      return {
        uid,
        email: data.email || '',
        displayName: data.displayName || data.fullName || data.name || '',
        role,
        department: data.department,
        permissions: rolePermissions,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin,
        status: data.status || 'active',
        avatarUrl: data.avatar || data.avatarUrl,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Light registration function for ad-hoc user/request creation
 */
export async function signUpUser(data: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department?: string;
  idNumber?: string;
  reason?: string;
  schoolId?: string;
}): Promise<{ uid: string }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email.trim().toLowerCase(), data.password);
    const uid = userCredential.user.uid;

    const requestDocRef = doc(db, 'accountRequests', uid);
    await setDoc(requestDocRef, {
      uid,
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName,
      role: data.role,
      department: data.department || '',
      idNumber: data.idNumber || '',
      reason: data.reason || '',
      schoolId: data.schoolId || '',
      status: 'pending',
      submittedAt: new Date().toISOString().split("T")[0],
      createdAtServer: serverTimestamp(),
    });

    return { uid };
  } catch (error: any) {
    throw new Error(formatAuthError(error.code || '') || error.message || 'Failed to complete registration request.');
  }
}

/**
 * 100% Free Registration Pipeline using Firestore Document Storage
 */
export async function submitAccountRequest(data: RegisterRequestPayload): Promise<{ requestId: string; trackingId: string }> {
  validateRegistrationPayload(data);

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanEmpId = data.employeeId.trim().toUpperCase();
  const suffix = data.suffix && data.suffix !== "None" ? data.suffix.trim() : "";
  const fullName = [data.firstName.trim(), data.middleName?.trim(), data.lastName.trim(), suffix]
    .filter(Boolean)
    .join(" ");

  const duplicateCheck = await checkExistingRegistration(cleanEmail, cleanEmpId);
  if (duplicateCheck.exists) {
    throw new Error(duplicateCheck.reason);
  }

  // 1. Create Firebase Auth user identity
  let fbUser: FirebaseUser;
  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
    fbUser = credential.user;
    await updateProfile(fbUser, { displayName: fullName });
  } catch (authErr: any) {
    console.error("Firebase Auth creation failed:", authErr);
    throw new Error(formatAuthError(authErr.code || ""));
  }

  const requestId = fbUser.uid;
  const trackingId = `REQ-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toISOString().split("T")[0];

  // 2. Convert files to base64 Data URLs (Zero cost)
  const idDataUrl = await fileToBase64(data.idFile);
  let proofDataUrl = "";
  if (data.proofFile) {
    proofDataUrl = await fileToBase64(data.proofFile);
  }

  // 3. Write document to `accountRequests/{requestId}`
  const requestDoc: AccountRequest = {
    id: requestId,
    requestId: trackingId,
    uid: requestId,
    fullName,
    firstName: data.firstName.trim(),
    middleName: data.middleName?.trim() || "",
    lastName: data.lastName.trim(),
    suffix,
    email: cleanEmail,
    employeeId: cleanEmpId,
    role: "teacher",
    facultyPosition: data.facultyPosition,
    department: data.department,
    assignedGrade: data.assignedGrade,
    assignedSections: data.assignedSections,
    idDocumentUrl: idDataUrl,
    idDocumentPath: "firestore_base64",
    idDocumentName: data.idFile.name,
    proofDocumentUrl: proofDataUrl,
    proofDocumentPath: proofDataUrl ? "firestore_base64" : "",
    proofDocumentName: data.proofFile?.name || "",
    status: "pending",
    submittedAt: dateStr,
  };

  try {
    await setDoc(doc(db, "accountRequests", requestId), {
      ...requestDoc,
      createdAtServer: serverTimestamp(),
    });

    // 4. Create mirror user profile in `users/{uid}` with status: 'pending'
    await setDoc(doc(db, "users", requestId), {
      id: requestId,
      name: fullName,
      fullName,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || "",
      lastName: data.lastName.trim(),
      suffix,
      email: cleanEmail,
      role: "teacher",
      status: "pending",
      department: data.department,
      employeeId: cleanEmpId,
      assignedGrade: data.assignedGrade,
      assignedSections: data.assignedSections,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      createdAt: dateStr,
      lastActive: "Never",
      createdAtServer: serverTimestamp(),
    });
  } catch (firestoreErr: any) {
    console.error("Firestore request creation failed:", firestoreErr);
    throw new Error("Unable to save registration request to database. " + (firestoreErr.message || ""));
  }

  // 5. Sign out applicant immediately
  await firebaseSignOut(auth);

  return { requestId, trackingId };
}

export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function getUserProfile(
  uid: string,
  fallbackEmail?: string | null,
  fallbackName?: string | null
): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const resolvedName = data.fullName || data.name || fallbackName || "Authenticated User";
      return {
        ...(data as User),
        id: uid,
        name: resolvedName,
        fullName: resolvedName,
      };
    }
  } catch (err) {
    console.error("Firestore profile lookup failed:", err);
  }

  const email = (fallbackEmail || "").toLowerCase();
  if (email.includes("admin")) {
    const adminName = fallbackName || "System Administrator";
    return {
      id: uid,
      name: adminName,
      fullName: adminName,
      email,
      role: "admin",
      status: "active",
      department: "System Administration",
      employeeId: "ADMIN-01",
      assignedGrade: "All",
      assignedSections: ["All"],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`,
      createdAt: new Date().toISOString().split("T")[0],
      lastActive: "Just now",
    };
  }

  return null;
}

export async function getAccountRequests(): Promise<AccountRequest[]> {
  try {
    const q = query(collection(db, "accountRequests"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AccountRequest[];
  } catch (err) {
    console.error("Error loading accountRequests from Firestore:", err);
    return [];
  }
}

export async function approveAccountRequest(requestId: string, reviewerName: string): Promise<void> {
  const reqRef = doc(db, "accountRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) {
    throw new Error("Registration request document does not exist.");
  }
  
  const reqData = reqSnap.data() as AccountRequest;
  const timestamp = new Date().toISOString().split("T")[0];

  await updateDoc(reqRef, {
    status: "active",
    reviewedAt: timestamp,
    reviewedBy: reviewerName,
    approvedAt: timestamp,
  });

  await updateDoc(doc(db, "users", reqData.uid), {
    status: "active",
    approvedAt: timestamp,
    approvedBy: reviewerName,
  });
}

export async function rejectAccountRequest(requestId: string, reviewerName: string, rejectionReason: string): Promise<void> {
  const reqRef = doc(db, "accountRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  
  if (!reqSnap.exists()) {
    throw new Error("Registration request document does not exist.");
  }
  
  const reqData = reqSnap.data() as AccountRequest;
  const timestamp = new Date().toISOString().split("T")[0];

  await updateDoc(reqRef, {
    status: "rejected",
    rejectionReason,
    reviewedAt: timestamp,
    reviewedBy: reviewerName,
  });

  await updateDoc(doc(db, "users", reqData.uid), {
    status: "rejected",
    rejectionReason,
  });
}