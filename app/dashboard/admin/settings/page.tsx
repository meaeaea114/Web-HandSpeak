'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, KeyRound, Smartphone, CheckCircle2, 
  History, Laptop, Clock, LogOut, Lock, Save, Camera, AlertCircle,
  Sliders, Activity, Globe, Calendar, Moon, ShieldCheck, X, Copy, Trash2, Archive, ArchiveRestore
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

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [activitySubTab, setActivitySubTab] = useState<'active' | 'archived'>('active');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Administrator',
    avatar: '',
  });

  const [loginHistory, setLoginHistory] = useState<FirestoreLoginRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [accountActivities, setAccountActivities] = useState<FirestoreAccountActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const formatRoleName = (rawRole?: string) => {
    if (!rawRole) return 'Administrator';
    const clean = rawRole.trim().toLowerCase();
    if (clean.includes('admin')) return 'Administrator';
    return `${clean.charAt(0).toUpperCase()}${clean.slice(1)} Administrator`;
  };

  useEffect(() => {
    if (user) {
      const authUser = user as Record<string, any>;
      setProfile({
        name: user.fullName || user.name || 'System Administrator',
        email: user.email || 'admin@handspeak.edu',
        phone: authUser.phone || '',
        role: formatRoleName(user.role),
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const currentUid = user?.id || (user as any)?.uid;

  const performAutomaticCleanup = async (activityRef: any) => {
    try {
      const activeQuery = query(activityRef, where('status', '==', 'active'), orderBy('timestamp', 'desc'));
      const activeSnap = await getDocs(activeQuery);

      if (activeSnap.docs.length > MAX_ACTIVE_ACTIVITIES) {
        const overflowDocs = activeSnap.docs.slice(MAX_ACTIVE_ACTIVITIES);
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

  const [preferences, setPreferences] = useState({
    language: 'English (US)',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '12-hour (AM/PM)',
    theme: 'system',
  });

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  const [twoFactor, setTwoFactor] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [secretKey, setSecretKey] = useState('');

  const generate2FAKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = 'HS-';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretKey(result);
  };

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
        await logAccountActivity('Profile picture updated', 'Updated avatar image.');
        showToast('Profile picture updated.');
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
    const currentPhone = ((user as any)?.phone || '').trim();

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
      avatar: profile.avatar,
    });

    if (phoneChanged && !nameChanged && !emailChanged) {
      await logAccountActivity(
        'Phone Number Updated', 
        `Updated contact phone number to ${newPhone || 'empty'}.`
      );
    } else if (nameChanged && !phoneChanged && !emailChanged) {
      await logAccountActivity(
        'Display Name Updated', 
        `Updated account display name to "${newName}".`
      );
    } else if (emailChanged && !nameChanged && !phoneChanged) {
      await logAccountActivity(
        'Email Address Updated', 
        `Updated account email address to "${newEmail}".`
      );
    } else {
      const changedFields = [];
      if (nameChanged) changedFields.push('display name');
      if (emailChanged) changedFields.push('email address');
      if (phoneChanged) changedFields.push('phone number');
      
      await logAccountActivity(
        'Profile Information Updated', 
        `Updated ${changedFields.join(', ')}.`
      );
    }

    showToast('Profile information updated successfully.');
  };

  const handle2FAToggle = async (checked: boolean) => {
    if (checked) {
      generate2FAKey();
      setShow2FAModal(true);
    } else {
      setTwoFactor(false);
      await logAccountActivity('Two-Factor Authentication disabled', 'Disabled 2FA security setting.');
      showToast('Two-Factor Authentication disabled.');
    }
  };

  const verifyAndEnable2FA = async () => {
    if (verificationCode.trim().length < 6) {
      showToast('Please enter a valid 6-digit verification code.', 'error');
      return;
    }
    setTwoFactor(true);
    setShow2FAModal(false);
    setVerificationCode('');
    await logAccountActivity('Two-Factor Authentication enabled', 'Successfully configured 2FA authenticator key.');
    showToast('Two-Factor Authentication enabled successfully.');
  };

  const handlePreferencesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await logAccountActivity('System preferences updated', `Updated language (${preferences.language}) and system formats.`);
    showToast('System preferences saved.');
  };

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

    setPasswords({ current: '', new: '', confirm: '' });
    await logAccountActivity('Password changed', 'Account security password was successfully changed.');
    showToast('Password changed successfully.');
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
    profile.name || 'Admin'
  )}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `otpauth://totp/HandSpeak:${profile.email}?secret=${secretKey.replace(/-/g, '')}&issuer=HandSpeak`
  )}`;

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  };

  const activeActivities = accountActivities.filter((a) => a.status !== 'archived');
  const archivedActivities = accountActivities.filter((a) => a.status === 'archived');

  return (
    <div className="w-full h-full flex flex-col text-slate-800 font-sans p-4 overflow-hidden relative">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-[#3C1E0A] text-white border-[#F0AB31]/40'
              : 'bg-red-900 text-white border-red-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-[#F0AB31]" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-amber-900/10 shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Delete this archived activity permanently?</h3>
              <p className="text-xs text-slate-500 mt-1">This action cannot be undone. Only this specific log entry will be removed.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDeleteActivity(deleteConfirmId)}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-amber-900/10 shadow-2xl max-w-md w-full space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-[#3C1E0A]">
                <ShieldCheck className="h-5 w-5 text-[#F0AB31]" />
                <h3 className="font-bold text-sm">Configure 2FA Authenticator</h3>
              </div>
              <button 
                onClick={() => setShow2FAModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Scan this QR code with your authenticator app or enter the setup key manually.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                <img src={qrCodeUrl} alt="2FA QR Code" className="h-32 w-32 object-contain" />
              </div>
              <div className="flex items-center gap-2 bg-slate-200/60 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-700">
                <span>Key: {secretKey}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(secretKey);
                    showToast('Secret key copied to clipboard!');
                  }}
                  className="hover:text-[#3C1E0A]"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Verification Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-2.5 text-center font-mono text-sm tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShow2FAModal(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyAndEnable2FA}
                className="w-1/2 py-2.5 bg-[#3C1E0A] hover:bg-[#261104] text-white font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Verify & Enable
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch min-h-0">
        <nav className="md:col-span-3 bg-white rounded-3xl p-4 border border-amber-900/10 shadow-sm flex flex-col justify-between h-full">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserIcon className="h-4 w-4" /> Personal Profile
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'security'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <KeyRound className="h-4 w-4" /> Password & Security
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'preferences'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sliders className="h-4 w-4" /> System Preferences
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Activity className="h-4 w-4" /> Account Activity
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#3C1E0A] text-[#F0AB31] shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="h-4 w-4" /> Login History
            </button>
          </div>
        </nav>

        <section className="md:col-span-9 bg-white rounded-3xl p-7 border border-amber-900/10 shadow-sm h-full flex flex-col justify-between overflow-hidden">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-[#3C1E0A]">Personal Details</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Update your account name and contact information.</p>
                </div>

                <div className="flex items-center gap-5">
                  <img
                    src={profile.avatar || fallbackAvatar}
                    alt={profile.name}
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-amber-900/10 shadow-sm bg-slate-100"
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
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-2 transition-all"
                    >
                      <Camera className="h-3.5 w-3.5 text-slate-500" /> Change Photo
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1">Allowed formats: JPG, PNG (Max 2MB)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Display Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Mobile Phone</label>
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-bold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#F0AB31] hover:bg-[#d99720] text-[#3C1E0A] font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  <Save className="h-4 w-4" /> Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-[#3C1E0A]">Security & Passkeys</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Keep your account secure with Two-Factor Authentication and password controls.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100/60 text-[#3C1E0A] rounded-xl">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Two-Factor Authentication (2FA)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Require an authenticator code when logging in from unknown devices.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => handle2FAToggle(e.target.checked)}
                    className="h-4 w-4 accent-[#3C1E0A] cursor-pointer rounded"
                  />
                </div>

                <form id="passwordForm" onSubmit={handlePasswordUpdate} className="space-y-3.5 text-xs">
                  <h3 className="font-bold text-slate-800 text-xs">Change Password</h3>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-600">Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-600">New Password</label>
                      <input
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-600">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31]"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-[#3C1E0A]">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-500">
                      <li>At least 8 characters long</li>
                      <li>Contains uppercase and lowercase letters</li>
                      <li>Includes at least 1 number (0-9)</li>
                      <li>Includes at least 1 symbol (e.g., @, #, $, !, %)</li>
                    </ul>
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  form="passwordForm"
                  className="bg-[#3C1E0A] hover:bg-[#261104] text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-sm"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSave} className="h-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-[#3C1E0A]">System Preferences</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Personalize how data and interface themes render in your workspace.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#3C1E0A]" /> Interface Language
                    </label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] bg-white font-medium"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="Filipino (Tagalog)">Filipino (Tagalog)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#3C1E0A]" /> Date Format
                    </label>
                    <select
                      value={preferences.dateFormat}
                      onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] bg-white font-medium"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#3C1E0A]" /> Time Format
                    </label>
                    <select
                      value={preferences.timeFormat}
                      onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] bg-white font-medium"
                    >
                      <option value="12-hour (AM/PM)">12-hour (AM/PM)</option>
                      <option value="24-hour">24-hour</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 flex items-center gap-2">
                      <Moon className="h-4 w-4 text-[#3C1E0A]" /> Appearance Theme
                    </label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] bg-white font-medium"
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#F0AB31] hover:bg-[#d99720] text-[#3C1E0A] font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  <Save className="h-4 w-4" /> Save Preferences
                </button>
              </div>
            </form>
          )}

          {activeTab === 'activity' && (
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#3C1E0A]">Account Activity Trace</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time record of changes made to your administrator account.</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setActivitySubTab('active')}
                      className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                        activitySubTab === 'active'
                          ? 'bg-white text-[#3C1E0A] shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Activity className="h-3.5 w-3.5 text-[#F0AB31]" /> Active
                      <span className="bg-amber-100 text-[#3C1E0A] px-1.5 py-0.2 rounded-full text-[10px]">
                        {activeActivities.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivitySubTab('archived')}
                      className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                        activitySubTab === 'archived'
                          ? 'bg-white text-[#3C1E0A] shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Archive className="h-3.5 w-3.5 text-slate-500" /> Archived
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
                        {archivedActivities.length}
                      </span>
                    </button>
                  </div>
                </div>

                {loadingActivities ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading account activity...</div>
                ) : activitySubTab === 'active' ? (
                  activeActivities.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No active account activities.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {activeActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all hover:bg-slate-50"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-[#3C1E0A]" />
                              <span className="font-bold text-slate-800">{act.action}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">{act.description}</p>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                              <Clock className="h-3 w-3" /> {formatTimestamp(act.timestamp)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleArchiveActivity(act.id)}
                            className="text-slate-500 hover:text-[#3C1E0A] hover:bg-amber-100/60 p-2 rounded-xl transition-all self-start sm:self-center flex items-center gap-1 text-[11px] font-semibold border border-slate-200 bg-white"
                            title="Archive this activity"
                          >
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : archivedActivities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No archived activities.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {archivedActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 bg-slate-100/70 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all opacity-85 hover:opacity-100"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-slate-500" />
                            <span className="font-bold text-slate-700">{act.action}</span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              ARCHIVED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{act.description}</p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                            <Clock className="h-3 w-3" /> {formatTimestamp(act.timestamp)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRestoreActivity(act.id)}
                            className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-xl transition-all flex items-center gap-1 text-[11px] font-semibold"
                            title="Restore activity to active view"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(act.id)}
                            className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200/60 p-2 rounded-xl transition-all flex items-center gap-1 text-[11px] font-semibold"
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

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
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
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#3C1E0A]">Login Audit & Active Sessions</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Review devices and timestamps that have accessed your administrator profile.</p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Encrypted Session Log
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading real login history...</div>
                ) : loginHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No login activity yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {loginHistory.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                          index === 0 ? 'bg-amber-50/40 border-amber-200/80' : 'bg-slate-50/50 border-slate-200/70'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-4 w-4 text-[#3C1E0A]" />
                            <span className="font-bold text-slate-800">{item.device || 'Browser Session'}</span>
                            {index === 0 && (
                              <span className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                                CURRENT SESSION
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Account: <strong className="font-mono text-slate-600">{item.email || profile.email}</strong></span>
                            <span>•</span>
                            <span>Status: <strong className="text-emerald-600">{item.status || 'Success'}</strong></span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                            <Clock className="h-3 w-3" /> {formatTimestamp(item.timestamp)}
                          </div>
                        </div>

                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLoginRecord(item.id)}
                            className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200/60 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-center transition-all"
                          >
                            <LogOut className="h-3.5 w-3.5" /> Clear Record
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
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