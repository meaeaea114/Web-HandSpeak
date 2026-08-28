'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, KeyRound, Smartphone, CheckCircle2, 
  History, Laptop, Clock, LogOut, Lock, Save, Camera, AlertCircle,
  Sliders, Activity, Globe, Calendar, Moon, Volume2, VolumeX,
  ShieldCheck, X, Trash2, Archive, ArchiveRestore, Loader2,
  GraduationCap, BookOpen, Building2, BadgeCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  deleteDoc,
  addDoc,
  updateDoc,
  getDocs,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

import { usePreferences } from '@/lib/preferences-context';
import { useTranslation } from '@/lib/translations';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';

type TabType = 'profile' | 'security' | 'preferences' | 'activity' | 'history';

interface FirestoreLoginRecord {
  id: string;
  device?: string;
  email?: string;
  status?: string;
  timestamp?: any;
}

interface FirestoreAccountActivity {
  id: string;
  action: string;
  description: string;
  status?: 'active' | 'archived';
  timestamp?: any;
  uid?: string;
}

const MAX_ACTIVE_ACTIVITIES = 75;
const ARCHIVE_RETENTION_DAYS = 90;

export default function TeacherSettingsPage() {
  const { user, firebaseUser, updateUser, sendTwoFactorOtp, confirmTwoFactorChange } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { preferences, updatePreference } = usePreferences();
  const t = useTranslation(preferences.language);

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [activitySubTab, setActivitySubTab] = useState<'active' | 'archived'>('active');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Teacher Profile Information
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    facultyPosition: '',
    assignedGrade: '',
    assignedSections: [] as string[],
    employeeId: '',
    avatar: '',
  });

  const [loginHistory, setLoginHistory] = useState<FirestoreLoginRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [accountActivities, setAccountActivities] = useState<FirestoreAccountActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Password Management States
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // 2FA Verification Modal States
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorAction, setTwoFactorAction] = useState<'enable' | 'disable' | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (user) {
      const authUser = user as Record<string, any>;
      setProfile({
        name: user.fullName || user.name || 'Faculty Member',
        email: user.email || '',
        phone: authUser.phone || authUser.contactNumber || '',
        department: authUser.department || 'Special Needs Education (SNED)',
        facultyPosition: authUser.facultyPosition || 'Teacher',
        assignedGrade: authUser.assignedGrade || 'Grade 1',
        assignedSections: Array.isArray(authUser.assignedSections) ? authUser.assignedSections : [],
        employeeId: authUser.employeeId || 'N/A',
        avatar: user.avatar || '',
      });
      setTwoFactor(Boolean(authUser.twoFactorEnabled));
    }
  }, [user]);

  const currentUid = user?.id || (user as any)?.uid;

  // Auto-cleanup for older activity logs
  const performAutomaticCleanup = async (activityRef: any) => {
    try {
      const activeQuery = query(activityRef, where('status', '==', 'active'));
      const activeSnap = await getDocs(activeQuery);

      if (activeSnap.docs.length > MAX_ACTIVE_ACTIVITIES) {
        const sortedDocs = [...activeSnap.docs].sort((a, b) => {
          const dataA = a.data() as Record<string, any>;
          const dataB = b.data() as Record<string, any>;
          const timeA = dataA.timestamp?.seconds || 0;
          const timeB = dataB.timestamp?.seconds || 0;
          return timeB - timeA; 
        });

        const overflowDocs = sortedDocs.slice(MAX_ACTIVE_ACTIVITIES);
        for (const docSnap of overflowDocs) {
          await updateDoc(doc(activityRef, docSnap.id), {
            status: 'archived',
          });
        }
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_RETENTION_DAYS);

      const archivedQuery = query(activityRef, where('status', '==', 'archived'));
      const archivedSnap = await getDocs(archivedQuery);

      for (const docSnap of archivedSnap.docs) {
        const data = docSnap.data() as Record<string, any>;
        if (data.timestamp) {
          const docDate = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp.seconds * 1000);
          if (docDate < cutoffDate) {
            await deleteDoc(doc(activityRef, docSnap.id));
          }
        }
      }
    } catch (err) {
      console.error('Error executing automated activity cleanup:', err);
    }
  };

  const logAccountActivity = async (action: string, description: string) => {
    if (!currentUid) return;
    try {
      const activityRef = collection(db, 'users', currentUid, 'account_activity');
      await addDoc(activityRef, {
        action,
        description,
        status: 'active',
        uid: currentUid,
        timestamp: serverTimestamp(),
      });

      await performAutomaticCleanup(activityRef);
    } catch (err) {
      console.error('Failed to log account activity:', err);
    }
  };

  // Real-time Login History Listener
  useEffect(() => {
    if (!currentUid) {
      setLoginHistory([]);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    const activityRef = collection(db, 'users', currentUid, 'login_activity');
    const q = query(activityRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: FirestoreLoginRecord[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setLoginHistory(records);
      setLoadingHistory(false);
    }, (err) => {
      console.error('Error fetching login activity:', err);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [currentUid]);

  // Real-time Account Activity Listener
  useEffect(() => {
    if (!currentUid) {
      setAccountActivities([]);
      setLoadingActivities(false);
      return;
    }

    setLoadingActivities(true);
    const activityRef = collection(db, 'users', currentUid, 'account_activity');
    const q = query(activityRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: FirestoreAccountActivity[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          action: data.action,
          description: data.description,
          status: data.status || 'active',
          timestamp: data.timestamp,
          uid: data.uid || currentUid,
        };
      });
      setAccountActivities(records);
      setLoadingActivities(false);
    }, (err) => {
      console.error('Error fetching account activities:', err);
      setLoadingActivities(false);
    });

    return () => unsubscribe();
  }, [currentUid]);

  // 2FA Resend Countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image file size must be less than 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfile((prev) => ({ ...prev, avatar: base64String }));
        await updateUser({ avatar: base64String });
        await logAccountActivity('Profile photo updated', 'Changed teacher avatar photo.');
        showToast('Profile photo updated successfully.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      showToast('Display Name cannot be empty.', 'error');
      return;
    }
    if (!profile.email.trim() || !profile.email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    const currentName = (user?.fullName || user?.name || '').trim();
    const currentEmail = (user?.email || '').trim();
    const currentPhone = ((user as any)?.phone || (user as any)?.contactNumber || '').trim();

    const newName = profile.name.trim();
    const newEmail = profile.email.trim();
    const newPhone = profile.phone.trim();

    const nameChanged = newName !== currentName;
    const emailChanged = newEmail !== currentEmail;
    const phoneChanged = newPhone !== currentPhone;

    if (!nameChanged && !emailChanged && !phoneChanged) {
      showToast('No changes detected.');
      return;
    }

    await updateUser({
      name: newName,
      fullName: newName,
      email: newEmail,
      phone: newPhone,
      contactNumber: newPhone,
      avatar: profile.avatar,
    });

    const changedFields = [];
    if (nameChanged) changedFields.push('display name');
    if (emailChanged) changedFields.push('email address');
    if (phoneChanged) changedFields.push('contact number');
    
    await logAccountActivity(
      'Faculty Profile Updated', 
      `Updated ${changedFields.join(', ')}.`
    );

    showToast('Teacher profile updated successfully.');
  };

  const handle2FAToggle = async (checked: boolean) => {
    const action: 'enable' | 'disable' = checked ? 'enable' : 'disable';

    setOtpError(null);
    setVerificationCode('');
    setOtpSending(true);

    const result = await sendTwoFactorOtp(action);

    setOtpSending(false);

    if (!result.success) {
      showToast(result.error || 'Failed to send verification code. Please try again.', 'error');
      return;
    }

    setOtpMaskedEmail(result.maskedEmail || profile.email);
    setTwoFactorAction(action);
    setResendCooldown(30);
    setShow2FAModal(true);
  };

  const verifyAndConfirmTwoFactor = async () => {
    if (!twoFactorAction) return;

    if (verificationCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);

    const result = await confirmTwoFactorChange(verificationCode.trim(), twoFactorAction);

    setOtpVerifying(false);

    if (!result.success) {
      setOtpError(result.error || 'Invalid or expired code. Please try again.');
      return;
    }

    const nowEnabled = twoFactorAction === 'enable';

    setTwoFactor(nowEnabled);
    setShow2FAModal(false);
    setVerificationCode('');
    setTwoFactorAction(null);

    await logAccountActivity(
      nowEnabled ? 'Two-Factor Authentication enabled' : 'Two-Factor Authentication disabled',
      nowEnabled
        ? 'Verified one-time email code and enabled 2FA.'
        : 'Verified one-time email code and disabled 2FA.'
    );
    showToast(nowEnabled ? 'Two-Factor Authentication enabled successfully.' : 'Two-Factor Authentication disabled.');
  };

  const handleResendTwoFactorCode = async () => {
    if (resendCooldown > 0 || otpSending || !twoFactorAction) return;

    setOtpSending(true);
    setOtpError(null);

    const result = await sendTwoFactorOtp(twoFactorAction);

    setOtpSending(false);

    if (!result.success) {
      setOtpError(result.error || 'Failed to resend code. Please try again.');
      return;
    }

    setOtpMaskedEmail(result.maskedEmail || otpMaskedEmail);
    setResendCooldown(30);
    showToast('A new verification code was sent to your email.');
  };

  const closeTwoFactorModal = () => {
    setShow2FAModal(false);
    setOtpError(null);
    setVerificationCode('');
    setTwoFactorAction(null);
  };

  const handlePreferencesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await logAccountActivity('Teacher preferences updated', `Updated language, theme, and system formats.`);
    showToast(t('savePreferences') || 'System preferences saved.');
  };

  // Fully connected Password Update Function (Firebase Auth + Firestore update + Activity Log)
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.current) {
      return showToast('Please enter your current password.', 'error');
    }

    const { new: newPass, confirm } = passwords;

    if (newPass.length < 8) {
      return showToast('Password must be at least 8 characters long.', 'error');
    }
    if (!/[A-Z]/.test(newPass)) {
      return showToast('Password must contain at least one uppercase letter.', 'error');
    }
    if (!/[a-z]/.test(newPass)) {
      return showToast('Password must contain at least one lowercase letter.', 'error');
    }
    if (!/[0-9]/.test(newPass)) {
      return showToast('Password must contain at least one number.', 'error');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass)) {
      return showToast('Password must contain at least one special character/symbol.', 'error');
    }
    if (newPass !== confirm) {
      return showToast('New passwords do not match.', 'error');
    }

    setPasswordUpdating(true);

    try {
      if (firebaseUser && firebaseUser.email) {
        // 1. Re-authenticate teacher with current password
        const credential = EmailAuthProvider.credential(firebaseUser.email, passwords.current);
        await reauthenticateWithCredential(firebaseUser, credential);

        // 2. Update password in Firebase Authentication
        await updatePassword(firebaseUser, newPass);
      } else {
        throw new Error('User session not found.');
      }

      // 3. Update Database metadata in Firestore users collection
      if (currentUid) {
        const userRef = doc(db, 'users', currentUid);
        await updateDoc(userRef, {
          passwordUpdatedAt: serverTimestamp(),
          lastActive: 'Just now',
        });
      }

      // 4. Log the security event in Firestore Account Activity
      await logAccountActivity(
        'Password Changed', 
        'Account security password was successfully changed and updated in database.'
      );

      // 5. Reset input form state
      setPasswords({ current: '', new: '', confirm: '' });
      showToast('Password updated successfully in database.');
    } catch (err: any) {
      console.error('Password update error:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        showToast('Current password is incorrect.', 'error');
      } else if (err?.code === 'auth/too-many-requests') {
        showToast('Too many attempts. Please try again later.', 'error');
      } else {
        showToast(err?.message || 'Failed to update password.', 'error');
      }
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleRemoveLoginRecord = async (id: string) => {
    if (!currentUid) return;
    try {
      await deleteDoc(doc(db, 'users', currentUid, 'login_activity', id));
      showToast('Login record removed.');
    } catch (err) {
      showToast('Failed to delete login record.', 'error');
    }
  };

  const handleArchiveActivity = async (id: string) => {
    if (!currentUid) return;
    try {
      const activityDocRef = doc(db, 'users', currentUid, 'account_activity', id);
      await updateDoc(activityDocRef, {
        status: 'archived',
      });
      showToast('Activity record moved to archive.');
    } catch (err) {
      showToast('Failed to archive activity record.', 'error');
    }
  };

  const handleRestoreActivity = async (id: string) => {
    if (!currentUid) return;
    try {
      const activityDocRef = doc(db, 'users', currentUid, 'account_activity', id);
      await updateDoc(activityDocRef, {
        status: 'active',
      });
      showToast('Activity record restored to active view.');
    } catch (err) {
      showToast('Failed to restore activity record.', 'error');
    }
  };

  const handlePermanentDeleteActivity = async (id: string) => {
    if (!currentUid) return;
    try {
      await deleteDoc(doc(db, 'users', currentUid, 'account_activity', id));
      setDeleteConfirmId(null);
      showToast('Archived activity permanently deleted.');
    } catch (err) {
      showToast('Failed to delete archived record.', 'error');
    }
  };

  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    profile.name || 'Teacher'
  )}`;

  const displayDateTime = (ts: any) => {
    if (!ts) return 'Just now';
    return `${formatSystemDate(ts, preferences.dateFormat)} at ${formatSystemTime(ts, preferences.timeFormat)}`;
  };

  const activeActivities = accountActivities.filter((a) => a.status !== 'archived');
  const archivedActivities = accountActivities.filter((a) => a.status === 'archived');

  return (
    <div className="w-full h-full flex flex-col text-stone-800 dark:text-stone-200 font-sans p-4 overflow-hidden relative">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-[#3C1E0A] dark:bg-[#F0AB31] text-white dark:text-[#1A1816] border-[#F0AB31]/40 dark:border-[#3C1E0A]/20'
              : 'bg-red-900 dark:bg-red-950 text-white border-red-500 dark:border-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-[#F0AB31] dark:text-[#1A1816]" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 dark:text-red-500" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] rounded-3xl p-6 border border-amber-900/10 dark:border-stone-800 shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">Delete this archived activity permanently?</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">This action cannot be undone. Only this specific log entry will be removed.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2.5 bg-stone-100 dark:bg-[#2A2621] hover:bg-stone-200 dark:hover:bg-[#38332C] text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDeleteActivity(deleteConfirmId)}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1816] rounded-3xl p-6 border border-amber-900/10 dark:border-stone-800 shadow-2xl max-w-md w-full space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-[#3C1E0A] dark:text-[#F0AB31]">
                <ShieldCheck className="h-5 w-5 text-[#F0AB31]" />
                <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">
                  {twoFactorAction === 'disable' ? 'Confirm Disabling 2FA' : 'Verify Your Email'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTwoFactorModal}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              We sent a 6-digit verification code to{' '}
              <strong className="text-stone-700 dark:text-stone-200">{otpMaskedEmail || profile.email}</strong>.
              Enter it below to {twoFactorAction === 'disable' ? 'confirm turning Two-Factor Authentication off' : 'finish enabling Two-Factor Authentication'}.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-stone-700 dark:text-stone-300">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoFocus
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/[^0-9]/g, ''));
                  setOtpError(null);
                }}
                className="w-full px-4 py-3 text-center font-mono text-lg tracking-[0.5em] rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31]"
              />
              {otpError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 pt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {otpError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleResendTwoFactorCode}
                disabled={resendCooldown > 0 || otpSending}
                className="text-[#3C1E0A] dark:text-[#F0AB31] font-bold hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                {otpSending ? 'Sending…' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
              <span className="text-stone-400 dark:text-stone-500">Code expires in 5 minutes</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeTwoFactorModal}
                className="w-1/2 py-2.5 bg-stone-100 dark:bg-[#2A2621] hover:bg-stone-200 dark:hover:bg-[#38332C] text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyAndConfirmTwoFactor}
                disabled={otpVerifying || verificationCode.length !== 6}
                className="w-1/2 py-2.5 bg-[#3C1E0A] dark:bg-[#F0AB31] hover:bg-[#261104] dark:hover:bg-[#d99720] text-white dark:text-[#1A1816] font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {otpVerifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {otpVerifying ? 'Verifying…' : twoFactorAction === 'disable' ? 'Verify & Disable' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch min-h-0">
        {/* Navigation Sidebar */}
        <nav className="md:col-span-3 bg-white/90 dark:bg-[#1A1816]/95 backdrop-blur-xl rounded-3xl p-4 border border-amber-900/10 dark:border-stone-800 shadow-sm flex flex-col justify-between h-full">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] dark:bg-[#F0AB31] dark:text-[#1A1816] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2A2621]'
              }`}
            >
              <UserIcon className="h-4 w-4" /> {t('personalProfile') || 'Faculty Profile'}
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'security'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] dark:bg-[#F0AB31] dark:text-[#1A1816] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2A2621]'
              }`}
            >
              <KeyRound className="h-4 w-4" /> {t('passwordSecurity') || 'Password & Security'}
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'preferences'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] dark:bg-[#F0AB31] dark:text-[#1A1816] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2A2621]'
              }`}
            >
              <Sliders className="h-4 w-4" /> {t('systemPreferences') || 'System Preferences'}
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] dark:bg-[#F0AB31] dark:text-[#1A1816] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2A2621]'
              }`}
            >
              <Activity className="h-4 w-4" /> {t('accountActivity') || 'Account Activity'}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] dark:bg-[#F0AB31] dark:text-[#1A1816] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2A2621]'
              }`}
            >
              <History className="h-4 w-4" /> {t('loginActivity') || 'Login History'}
            </button>
          </div>
        </nav>

        {/* Content Box */}
        <section className="md:col-span-9 bg-white/90 dark:bg-[#1A1816]/95 backdrop-blur-xl rounded-3xl p-7 border border-amber-900/10 dark:border-stone-800 shadow-sm h-full flex flex-col justify-between overflow-y-auto">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
                  <h2 className="text-base font-bold text-[#3C1E0A] dark:text-[#F0AB31]">Teacher Profile Details</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Manage your faculty details, assigned grade levels, and contact information.</p>
                </div>

                <div className="flex items-center gap-5">
                  <img
                    src={profile.avatar || fallbackAvatar}
                    alt={profile.name}
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-amber-900/10 dark:border-stone-700 shadow-sm bg-stone-100 dark:bg-[#151311]"
                  />
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/png, image/jpeg"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-stone-100 dark:bg-[#2A2621] hover:bg-stone-200 dark:hover:bg-[#38332C] text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-2 transition-all"
                    >
                      <Camera className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" /> Change Photo
                    </button>
                    <p className="text-[11px] text-stone-400 mt-1">Allowed formats: JPG, PNG (Max 2MB)</p>
                  </div>
                </div>

                {/* Editable Personal Contact Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-stone-700 dark:text-stone-300">Teacher Full Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-stone-700 dark:text-stone-300">Contact Number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      maxLength={13}
                      placeholder="+63 900 000 0000"
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^0-9+]/g, '');
                        if (value.indexOf('+') > 0) {
                          value = value.replace(/\+/g, '');
                        }
                        setProfile({ ...profile, phone: value });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-stone-700 dark:text-stone-300">Institutional Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] font-medium"
                    />
                  </div>
                </div>

                {/* Teacher Academic & Faculty Details */}
                <div className="pt-2">
                  <h3 className="font-bold text-xs text-[#3C1E0A] dark:text-[#F0AB31] mb-3">Academic & Faculty Assignment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-stone-50 dark:bg-[#2A2621]/40 rounded-xl border border-stone-200/70 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mb-1">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#F0AB31]" />
                        <span>Employee ID</span>
                      </div>
                      <p className="font-bold text-stone-800 dark:text-stone-200">{profile.employeeId}</p>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-[#2A2621]/40 rounded-xl border border-stone-200/70 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mb-1">
                        <Building2 className="w-3.5 h-3.5 text-[#F0AB31]" />
                        <span>Department</span>
                      </div>
                      <p className="font-bold text-stone-800 dark:text-stone-200 truncate" title={profile.department}>{profile.department}</p>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-[#2A2621]/40 rounded-xl border border-stone-200/70 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#F0AB31]" />
                        <span>Assigned Level</span>
                      </div>
                      <p className="font-bold text-stone-800 dark:text-stone-200">{profile.assignedGrade}</p>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-[#2A2621]/40 rounded-xl border border-stone-200/70 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#F0AB31]" />
                        <span>Assigned Sections</span>
                      </div>
                      <p className="font-bold text-stone-800 dark:text-stone-200 truncate" title={profile.assignedSections.join(', ') || 'None'}>
                        {profile.assignedSections.length > 0 ? profile.assignedSections.join(', ') : 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#F0AB31] dark:bg-[#F0AB31] hover:bg-[#d99720] dark:hover:bg-[#d99720] text-[#3C1E0A] dark:text-[#1A1816] font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  <Save className="h-4 w-4" /> Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
                  <h2 className="text-base font-bold text-[#3C1E0A] dark:text-[#F0AB31]">Security & Passkeys</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Protect your teacher profile and student data with Two-Factor Authentication and password controls.</p>
                </div>

                {/* 2FA Card */}
                <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#2A2621]/40 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100/60 dark:bg-[#3C1E0A]/40 text-[#3C1E0A] dark:text-[#F0AB31] rounded-xl">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Two-Factor Authentication (2FA)</p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {otpSending && !show2FAModal
                          ? 'Sending a verification code to your email…'
                          : 'Require a one-time email verification code when logging in.'}
                      </p>
                    </div>
                  </div>
                  {otpSending && !show2FAModal ? (
                    <Loader2 className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31] animate-spin" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      disabled={otpSending || show2FAModal}
                      onChange={(e) => handle2FAToggle(e.target.checked)}
                      className="h-4 w-4 accent-[#3C1E0A] dark:accent-[#F0AB31] cursor-pointer rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
                </div>

                {/* Connected Password Form */}
                <form id="passwordForm" onSubmit={handlePasswordUpdate} className="space-y-3.5 text-xs">
                  <h3 className="font-bold text-stone-800 dark:text-stone-200 text-xs">Change Password</h3>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-stone-600 dark:text-stone-400">Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-stone-600 dark:text-stone-400">New Password</label>
                      <input
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-stone-600 dark:text-stone-400">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31]"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/60 dark:bg-[#2A2621]/30 rounded-xl border border-amber-200/60 dark:border-[#3C1E0A]/40 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                    <p className="font-bold text-[#3C1E0A] dark:text-[#F0AB31]">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-stone-500 dark:text-stone-400">
                      <li>At least 8 characters long</li>
                      <li>Contains uppercase and lowercase letters</li>
                      <li>Includes at least 1 number (0-9)</li>
                      <li>Includes at least 1 symbol (e.g., @, #, $, !, %)</li>
                    </ul>
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                <button
                  type="submit"
                  form="passwordForm"
                  disabled={passwordUpdating}
                  className="bg-[#3C1E0A] dark:bg-[#2A2621] hover:bg-[#261104] dark:hover:bg-[#38332C] text-white dark:text-[#F0AB31] font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {passwordUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSave} className="h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
                  <h2 className="text-base font-bold text-[#3C1E0A] dark:text-[#F0AB31]">{t('systemPreferences') || 'System Preferences'}</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Customize interface formats, theme, and audio feedback for classroom usage.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-2">
                    <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" /> {t('interfaceLanguage') || 'Interface Language'}
                    </label>
                    <select
                      value={preferences.language}
                      onChange={(e) => updatePreference('language', e.target.value as 'en' | 'tl')}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] bg-white dark:bg-[#151311] font-medium"
                    >
                      <option value="en">English (US)</option>
                      <option value="tl">Filipino (Tagalog)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" /> {t('dateFormat') || 'Date Format'}
                    </label>
                    <select
                      value={preferences.dateFormat}
                      onChange={(e) => updatePreference('dateFormat', e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] bg-white dark:bg-[#151311] font-medium"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" /> {t('timeFormat') || 'Time Format'}
                    </label>
                    <select
                      value={preferences.timeFormat}
                      onChange={(e) => updatePreference('timeFormat', e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] bg-white dark:bg-[#151311] font-medium"
                    >
                      <option value="12h">12-hour (AM/PM)</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <Moon className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" /> {t('appearanceTheme') || 'Appearance Theme'}
                    </label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => updatePreference('theme', e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] dark:focus:ring-[#F0AB31] bg-white dark:bg-[#151311] font-medium"
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      {preferences.soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" />
                      )}
                      Audio Feedback
                    </label>
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#151311]">
                      <span className="text-xs text-stone-500 dark:text-stone-400">Play audio sound cues during gesture exercises and interactions</span>
                      <button
                        type="button"
                        onClick={() => updatePreference('soundEnabled', !preferences.soundEnabled)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          preferences.soundEnabled
                            ? 'bg-[#3C1E0A] text-[#F0AB31] dark:bg-[#F0AB31] dark:text-[#1A1816]'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                        }`}
                      >
                        {preferences.soundEnabled ? 'Enabled' : 'Muted'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#F0AB31] dark:bg-[#F0AB31] hover:bg-[#d99720] dark:hover:bg-[#d99720] text-[#3C1E0A] dark:text-[#1A1816] font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  <Save className="h-4 w-4" /> {t('savePreferences') || 'Save Preferences'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'activity' && (
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#3C1E0A] dark:text-[#F0AB31]">Account Activity Trace</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Real-time audit log of updates and security changes made to your profile.</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-[#151311] p-1 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setActivitySubTab('active')}
                      className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                        activitySubTab === 'active'
                          ? 'bg-white dark:bg-[#2A2621] text-[#3C1E0A] dark:text-stone-100 shadow-sm'
                          : 'text-stone-500 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                      }`}
                    >
                      <Activity className="h-3.5 w-3.5 text-[#F0AB31] dark:text-[#F0AB31]" /> Active
                      <span className="bg-amber-100 dark:bg-[#3C1E0A]/50 text-[#3C1E0A] dark:text-[#F0AB31] px-1.5 py-0.2 rounded-full text-[10px]">
                        {activeActivities.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivitySubTab('archived')}
                      className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                        activitySubTab === 'archived'
                          ? 'bg-white dark:bg-[#2A2621] text-[#3C1E0A] dark:text-stone-100 shadow-sm'
                          : 'text-stone-500 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                      }`}
                    >
                      <Archive className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" /> Archived
                      <span className="bg-stone-200 dark:bg-[#3C1E0A]/30 text-stone-700 dark:text-stone-400 px-1.5 py-0.2 rounded-full text-[10px]">
                        {archivedActivities.length}
                      </span>
                    </button>
                  </div>
                </div>

                {loadingActivities ? (
                  <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500">Loading account activity...</div>
                ) : activitySubTab === 'active' ? (
                  activeActivities.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#2A2621]/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
                      No active account activities.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {activeActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3.5 bg-stone-50/50 dark:bg-[#2A2621]/40 rounded-2xl border border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all hover:bg-stone-50 dark:hover:bg-[#2A2621]"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" />
                              <span className="font-bold text-stone-800 dark:text-stone-200">{act.action}</span>
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">{act.description}</p>
                            <div className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1 pt-0.5">
                              <Clock className="h-3 w-3" /> {displayDateTime(act.timestamp)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleArchiveActivity(act.id)}
                            className="text-stone-500 dark:text-stone-400 hover:text-[#3C1E0A] dark:hover:text-[#F0AB31] hover:bg-amber-100/60 dark:hover:bg-[#3C1E0A]/30 p-2 rounded-xl transition-all self-start sm:self-center flex items-center gap-1 text-[11px] font-semibold border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#151311]"
                            title="Archive this activity"
                          >
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : archivedActivities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#2A2621]/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
                    No archived activities.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {archivedActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 bg-stone-100/70 dark:bg-[#2A2621]/60 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all opacity-85 hover:opacity-100"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                            <span className="font-bold text-stone-700 dark:text-stone-300">{act.action}</span>
                            <span className="text-[9px] bg-stone-200 dark:bg-[#151311] text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-full font-bold">
                              ARCHIVED
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">{act.description}</p>
                          <div className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1 pt-0.5">
                            <Clock className="h-3 w-3" /> {displayDateTime(act.timestamp)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRestoreActivity(act.id)}
                            className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-white dark:bg-[#151311] hover:bg-stone-50 dark:hover:bg-[#2A2621] border border-stone-200 dark:border-stone-700 p-2 rounded-xl transition-all flex items-center gap-1 text-[11px] font-semibold"
                            title="Restore activity to active view"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(act.id)}
                            className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-200/60 dark:border-red-900/30 p-2 rounded-xl transition-all flex items-center gap-1 text-[11px] font-semibold"
                            title="Permanently delete from archive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Permanently Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400 dark:text-stone-500">
                <span>
                  Showing <strong>{activitySubTab === 'active' ? activeActivities.length : archivedActivities.length}</strong> {activitySubTab} records (Total: {accountActivities.length})
                </span>
                <span>Auto-archive limit: {MAX_ACTIVE_ACTIVITIES} items</span>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#3C1E0A] dark:text-[#F0AB31]">Login Audit & Active Sessions</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Review devices and timestamps that have accessed your teacher profile.</p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Encrypted Session Log
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500">Loading login history...</div>
                ) : loginHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#2A2621]/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
                    No login activity yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {loginHistory.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                          index === 0 ? 'bg-amber-50/40 dark:bg-[#3C1E0A]/30 border-amber-200/80 dark:border-[#F0AB31]/30' : 'bg-stone-50/50 dark:bg-[#2A2621]/40 border-stone-200/70 dark:border-stone-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-4 w-4 text-[#3C1E0A] dark:text-[#F0AB31]" />
                            <span className="font-bold text-stone-800 dark:text-stone-200">{item.device || 'Browser Session'}</span>
                            {index === 0 && (
                              <span className="bg-emerald-600 dark:bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                                CURRENT SESSION
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Account: <strong className="font-mono text-stone-600 dark:text-stone-300">{item.email || profile.email}</strong></span>
                            <span>•</span>
                            <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">{item.status || 'Success'}</strong></span>
                          </div>
                          <div className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1 pt-0.5">
                            <Clock className="h-3 w-3" /> {displayDateTime(item.timestamp)}
                          </div>
                        </div>

                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLoginRecord(item.id)}
                            className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-200/60 dark:border-red-900/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-center transition-all"
                          >
                            <LogOut className="h-3.5 w-3.5" /> Clear Record
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400 dark:text-stone-500">
                <span>Total records: <strong>{loginHistory.length}</strong></span>
                <span>Security Level: High</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}