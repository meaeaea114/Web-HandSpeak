import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, Role as UserRole, AccountRequest, Permission, RBAC_CONFIG, resolveSystemRole } from "./rbac";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  permissions: Permission[];
  createdAt?: string;
  lastLogin?: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected' | 'archived' | 'deactivated';
  avatarUrl?: string;
}

export interface RegisterRequestPayload {
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix?: string;
  gender: string;
  loginEmail?: string;
  email: string;
  contactNumber: string;
  password: string;
  employeeId: string;
  facultyPosition: string;
  department: string;
  assignedGrade: string;
  assignedSections: string[];
  idFile: File;
  proofFile?: File | null;
}

export const MAX_FILE_SIZE_BYTES = 800 * 1024;
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
export const NAME_REGEX = /^[A-Za-z \s'-]{2,50}$/;
export const MIDDLE_INITIAL_REGEX = /^[A-Za-z ]$/;
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
      return "Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/expired-action-code":
      return "This password reset link has expired. Please request a new one.";
    case "auth/invalid-action-code":
      return "This password reset link is invalid or has already been used.";
    default:
      return "Authentication error. Please check your information and try again.";
  }
}

export function validateRegistrationPayload(data: RegisterRequestPayload): void {
  if (!NAME_REGEX.test(data.firstName.trim())) {
    throw new Error("First Name must contain letters only (2-50 characters).");
  }
  if (!data.middleInitial || !MIDDLE_INITIAL_REGEX.test(data.middleInitial.trim())) {
    throw new Error("Middle Initial is required and must be a single letter.");
  }
  if (!NAME_REGEX.test(data.lastName.trim())) {
    throw new Error("Last Name must contain letters only (2-50 characters).");
  }
  if (!data.gender || !data.gender.trim()) {
    throw new Error("Gender is required.");
  }
  if (!EMPLOYEE_ID_REGEX.test(data.employeeId.trim())) {
    throw new Error("Employee ID must contain alphanumeric characters and hyphens only.");
  }
  const cleanEmail = data.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please enter a valid email address containing '@'.");
  }
  if (data.loginEmail && (!data.loginEmail.trim() || !data.loginEmail.includes("@"))) {
    throw new Error("Please enter a valid Login Email containing '@'.");
  }
  if (!data.contactNumber || !data.contactNumber.trim()) {
    throw new Error("Contact Number is required.");
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
    // Pass-through check
  }
  return { exists: false };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      const role = (data.role as UserRole) || 'student';
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

export async function signUpUser(data: {
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix?: string;
  gender: string;
  email: string;
  contactNumber: string;
  password: string;
  employeeId: string;
  facultyPosition: string;
  department: string;
  assignedGrade: string;
  assignedSections: string[];
  role: UserRole;
}): Promise<{ uid: string; verificationEmailSent: boolean }> {
  try {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanEmpId = data.employeeId.trim().toUpperCase();
    const cleanSuffix = (data.suffix || "").trim();
    const miFormatted = data.middleInitial.trim().toUpperCase() ? `${data.middleInitial.trim().toUpperCase()}.` : "";
    const fullName = [data.firstName.trim(), miFormatted, data.lastName.trim(), cleanSuffix]
      .filter(Boolean)
      .join(" ");

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
    const uid = userCredential.user.uid;
    const dateStr = new Date().toISOString().split("T")[0];

    const resolvedRole = resolveSystemRole(data.facultyPosition, data.role);

    const requestDocRef = doc(db, 'accountRequests', uid);
    await setDoc(requestDocRef, {
      uid,
      id: uid,
      requestId: `MAN-${Date.now().toString().slice(-6)}`,
      fullName,
      firstName: data.firstName.trim(),
      middleInitial: data.middleInitial.trim().toUpperCase(),
      lastName: data.lastName.trim(),
      suffix: cleanSuffix,
      gender: data.gender,
      email: cleanEmail,
      loginEmail: cleanEmail,
      contactNumber: data.contactNumber.trim(),
      employeeId: cleanEmpId,
      facultyPosition: data.facultyPosition,
      department: data.department,
      assignedGrade: data.assignedGrade,
      assignedSections: data.assignedSections,
      role: resolvedRole,
      status: 'active',
      submittedAt: dateStr,
      approvedAt: dateStr,
      approvedBy: "System Administrator",
      createdAtServer: serverTimestamp(),
    });

    await setDoc(doc(db, 'users', uid), {
      id: uid,
      name: fullName,
      fullName,
      firstName: data.firstName.trim(),
      middleInitial: data.middleInitial.trim().toUpperCase(),
      lastName: data.lastName.trim(),
      suffix: cleanSuffix,
      gender: data.gender,
      email: cleanEmail,
      loginEmail: cleanEmail,
      contactNumber: data.contactNumber.trim(),
      role: resolvedRole,
      facultyPosition: data.facultyPosition,
      department: data.department,
      employeeId: cleanEmpId,
      assignedGrade: data.assignedGrade,
      assignedSections: data.assignedSections,
      status: 'active',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      createdAt: dateStr,
      lastActive: "Never",
      createdAtServer: serverTimestamp(),
    });

    return { uid, verificationEmailSent: false };
  } catch (error: any) {
    throw new Error(formatAuthError(error.code || '') || error.message || 'Failed to complete registration request.');
  }
}

export async function submitAccountRequest(data: RegisterRequestPayload): Promise<{ requestId: string; trackingId: string; verificationEmailSent: boolean }> {
  validateRegistrationPayload(data);

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanLoginEmail = (data.loginEmail || data.email).trim().toLowerCase();
  const cleanEmpId = data.employeeId.trim().toUpperCase();
  const cleanSuffix = (data.suffix || "").trim();
  const miFormatted = data.middleInitial.trim().toUpperCase() ? `${data.middleInitial.trim().toUpperCase()}.` : "";
  const fullName = [data.firstName.trim(), miFormatted, data.lastName.trim(), cleanSuffix]
    .filter(Boolean)
    .join(" ");

  const duplicateCheck = await checkExistingRegistration(cleanEmail, cleanEmpId);
  if (duplicateCheck.exists) {
    throw new Error(duplicateCheck.reason);
  }

  let fbUser: FirebaseUser;

  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanLoginEmail, data.password);
    fbUser = credential.user;
    await updateProfile(fbUser, { displayName: fullName });
  } catch (authErr: any) {
    console.error("Firebase Auth creation failed:", authErr);
    throw new Error(formatAuthError(authErr.code || ""));
  }

  const requestId = fbUser.uid;
  const trackingId = `REQ-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toISOString().split("T")[0];

  const idDataUrl = await fileToBase64(data.idFile);
  let proofDataUrl = "";
  if (data.proofFile) {
    proofDataUrl = await fileToBase64(data.proofFile);
  }

  const resolvedRole = resolveSystemRole(data.facultyPosition);

  const requestDoc: AccountRequest = {
    id: requestId,
    requestId: trackingId,
    uid: requestId,
    fullName,
    firstName: data.firstName.trim(),
    middleInitial: data.middleInitial.trim().toUpperCase(),
    lastName: data.lastName.trim(),
    suffix: cleanSuffix,
    gender: data.gender,
    loginEmail: cleanLoginEmail,
    email: cleanEmail,
    contactNumber: data.contactNumber.trim(),
    employeeId: cleanEmpId,
    role: resolvedRole,
    facultyPosition: data.facultyPosition,
    department: data.department,
    assignedGrade: data.assignedGrade,
    assignedSections: data.assignedSections || [],
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

    await setDoc(doc(db, "users", requestId), {
      id: requestId,
      name: fullName,
      fullName,
      firstName: data.firstName.trim(),
      middleInitial: data.middleInitial.trim().toUpperCase(),
      lastName: data.lastName.trim(),
      suffix: cleanSuffix,
      gender: data.gender,
      loginEmail: cleanLoginEmail,
      email: cleanEmail,
      contactNumber: data.contactNumber.trim(),
      role: resolvedRole,
      facultyPosition: data.facultyPosition,
      status: "pending",
      department: data.department,
      employeeId: cleanEmpId,
      assignedGrade: data.assignedGrade,
      assignedSections: data.assignedSections || [],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      createdAt: dateStr,
      lastActive: "Never",
      createdAtServer: serverTimestamp(),
    });
  } catch (firestoreErr: any) {
    console.error("Firestore request creation failed:", firestoreErr);
    throw new Error("Unable to save registration request to database. " + (firestoreErr.message || ""));
  }

  await firebaseSignOut(auth);
  return { requestId, trackingId, verificationEmailSent: false };
}

export async function resendVerificationEmail(email: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = userCredential.user;

    await user.reload();

    if (user.emailVerified) {
      await firebaseSignOut(auth);
      return { success: false, message: "Your email address is already verified." };
    }

    await sendEmailVerification(user);
    await firebaseSignOut(auth);
    return { success: true, message: "A new verification email has been sent to your email address." };
  } catch (error: any) {
    await firebaseSignOut(auth).catch(() => {});
    throw new Error(formatAuthError(error.code || "") || error.message || "Failed to resend verification email.");
  }
}

export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const user = credential.user;

  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const status = userData.status;

      // 1. Block Rejected Users
      if (status === "rejected") {
        await firebaseSignOut(auth);
        throw new Error(
          userData.rejectionReason
            ? `Your account registration request has been declined: "${userData.rejectionReason}"`
            : "Your account registration request has been declined by the administrator. Access is not permitted."
        );
      }

      // 2. Block Pending Users
      if (status === "pending") {
        await firebaseSignOut(auth);
        throw new Error("Your registration request is currently pending administrator review. You will receive an email once your account has been approved.");
      }

      // 3. Block Inactive, Suspended, Archived, or Deactivated Users
      if (status === "deactivated" || status === "suspended" || status === "archived") {
        await firebaseSignOut(auth);
        throw new Error("This account is currently inactive or deactivated. Please contact support.");
      }
    }
  } catch (err: any) {
    if (
      err.message &&
      (err.message.includes("declined") ||
        err.message.includes("rejected") ||
        err.message.includes("pending") ||
        err.message.includes("inactive") ||
        err.message.includes("deactivated"))
    ) {
      throw err;
    }
  }

  return user;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail }),
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON response
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to send password reset email. Please try again.");
  }
}

export async function verifyResetCode(oobCode: string): Promise<string> {
  try {
    return await verifyPasswordResetCode(auth, oobCode);
  } catch (error: any) {
    throw new Error(formatAuthError(error.code || "") || "This password reset link is invalid or has expired.");
  }
}

export async function completePasswordReset(oobCode: string, newPassword: string): Promise<void> {
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
  } catch (error: any) {
    throw new Error(formatAuthError(error.code || "") || "Failed to update your password. Please try again.");
  }
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
      phone: "N/A",
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

  const resolvedRole = resolveSystemRole(reqData.facultyPosition, reqData.role);

  await updateDoc(reqRef, {
    status: "active",
    role: resolvedRole,
    reviewedAt: timestamp,
    reviewedBy: reviewerName,
    approvedAt: timestamp,
    approvedBy: reviewerName,
  });

  await updateDoc(doc(db, "users", reqData.uid), {
    status: "active",
    role: resolvedRole,
    facultyPosition: reqData.facultyPosition,
    department: reqData.department,
    assignedGrade: reqData.assignedGrade,
    assignedSections: reqData.assignedSections || [],
    approvedAt: timestamp,
    approvedBy: reviewerName,
    reviewedAt: timestamp,
    reviewedBy: reviewerName,
  });

  // Dispatch Nodemailer approval email
  try {
    const recipientEmail = reqData.email || reqData.loginEmail;
    if (recipientEmail) {
      await fetch("/api/notifications/account-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "approved",
          fullName: reqData.fullName || "User",
          notificationEmail: recipientEmail,
          loginEmail: reqData.loginEmail || reqData.email,
          role: resolvedRole,
        }),
      });
    }
  } catch (notifyErr) {
    console.error("Failed to send approval email notification:", notifyErr);
  }
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
    reviewedAt: timestamp,
    reviewedBy: reviewerName,
  });

  // Dispatch Nodemailer rejection email
  try {
    const recipientEmail = reqData.email || reqData.loginEmail;
    if (recipientEmail) {
      await fetch("/api/notifications/account-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rejected",
          fullName: reqData.fullName || "User",
          notificationEmail: recipientEmail,
          loginEmail: reqData.loginEmail || reqData.email,
          role: reqData.role || "teacher",
          rejectionReason,
        }),
      });
    }
  } catch (notifyErr) {
    console.error("Failed to send rejection email notification:", notifyErr);
  }
}

export async function archiveAccountRequest(requestId: string, reviewerName: string): Promise<void> {
  const reqRef = doc(db, "accountRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) {
    throw new Error("Registration request document does not exist.");
  }
  const reqData = reqSnap.data() as AccountRequest;
  const timestamp = new Date().toISOString().split("T")[0];

  await updateDoc(reqRef, {
    status: "archived",
    archivedAt: timestamp,
    archivedBy: reviewerName,
  });

  await updateDoc(doc(db, "users", reqData.uid), {
    status: "archived",
    archivedAt: timestamp,
    archivedBy: reviewerName,
  });
}

export async function deactivateUserAccount(requestId: string, reviewerName: string): Promise<void> {
  const reqRef = doc(db, "accountRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) {
    throw new Error("Account request record not found.");
  }
  const reqData = reqSnap.data() as AccountRequest;
  const timestamp = new Date().toISOString().split("T")[0];

  await updateDoc(reqRef, {
    status: "deactivated",
    deactivatedAt: timestamp,
    deactivatedBy: reviewerName,
  });

  await updateDoc(doc(db, "users", reqData.uid), {
    status: "deactivated",
    deactivatedAt: timestamp,
    deactivatedBy: reviewerName,
  });
}

export async function updateUserProfile(
  userId: string, 
  data: Partial<User>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, data);
}