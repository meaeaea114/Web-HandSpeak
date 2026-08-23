'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  Plus, 
  Loader2, 
  X, 
  Archive, 
  RotateCcw, 
  UserMinus, 
  RefreshCw, 
  Upload, 
  Download, 
  AlertCircle, 
  Check, 
  AlertTriangle, 
  Send, 
  UserCheck, 
  Edit2, 
  Trash2, 
  Mail, 
  KeyRound, 
  Copy, 
  Printer, 
  Laptop, 
  Lock, 
  Activity, 
  User as UserIcon, 
  History, 
  CheckCircle2 
} from 'lucide-react';
import { 
  Student, 
  getStudentAccountRequestsRealtime, 
  approveStudentAccountRequest, 
  rejectStudentAccountRequest, 
  archiveStudent, 
  restoreStudent, 
  deactivateStudentAccount, 
  activateStudentAccount, 
  validateSpreadsheetFile, 
  executeBulkStudentImport, 
  BulkUploadValidationResult 
} from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StudentLoginRecord {
  id: string;
  device?: string;
  email?: string;
  status?: string;
  timestamp?: any;
}

interface StudentAccountActivity {
  id: string;
  action: string;
  description: string;
  timestamp?: any;
}

export default function TeacherAccountManagementPage() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'archived' | 'deactivated'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [classificationFilter, setClassificationFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // View Modals & Navigation
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'bulk'>('list');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [presetReason, setPresetReason] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Detailed History Modal Tabs & Records
  const [dossierTab, setDossierTab] = useState<'particulars' | 'loginHistory' | 'accountActivity'>('particulars');
  const [loginHistory, setLoginHistory] = useState<StudentLoginRecord[]>([]);
  const [accountActivities, setAccountActivities] = useState<StudentAccountActivity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Bulk Upload State & Drag Drop Handlers
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<BulkUploadValidationResult | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [bulkStatusPolicy, setBulkStatusPolicy] = useState<'pending' | 'approved'>('approved');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    studentId: '',
    gradeLevel: 'Grade 1',
    section: '',
    classification: 'Regular' as 'Regular' | 'SNED',
    temporaryPassword: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const generateStudentPassword = (first: string, id: string) => {
    const cleanPrefix = (first || 'Student').replace(/[^a-zA-Z]/g, '').slice(0, 4);
    const cleanId = (id || '2026').replace(/[^0-9]/g, '').slice(-4) || '1001';
    const uniqueSalt = Date.now().toString(36).slice(-3).toUpperCase();
    return `HS@${cleanPrefix}${cleanId}#${uniqueSalt}`;
  };

  const regeneratePassword = () => {
    const pwd = generateStudentPassword(formData.firstName, formData.studentId);
    setFormData(prev => ({ ...prev, temporaryPassword: pwd }));
    showToast('New temporary password generated.');
  };

  const feedbackTemplates = [
    'Student ID does not match official enrolled school roster.',
    'Student not assigned to the selected Grade Level or Section.',
    'Duplicate registration filing detected.',
    'Please verify your full name and re-register.',
  ];

  // Subscribe in real-time to Firestore for STUDENTS ONLY
  useEffect(() => {
    setLoading(true);
    const unsubscribe = getStudentAccountRequestsRealtime(
      (data) => {
        setStudents(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching student account requests:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch detailed history when inspecting a student
  useEffect(() => {
    if (!selectedStudent) {
      setLoginHistory([]);
      setAccountActivities([]);
      return;
    }

    const fetchStudentDeepHistory = async () => {
      setLoadingHistory(true);
      try {
        const studentUid = selectedStudent.id || selectedStudent.uid;
        
        const loginQuery = query(
          collection(db, 'users', studentUid, 'login_activity'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const loginSnap = await getDocs(loginQuery);
        setLoginHistory(loginSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const actQuery = query(
          collection(db, 'users', studentUid, 'account_activity'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const actSnap = await getDocs(actQuery);
        setAccountActivities(actSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentAccountActivity)));
      } catch (e) {
        console.error('Error fetching deep student history:', e);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchStudentDeepHistory();
  }, [selectedStudent]);

  const reviewerName = user?.fullName || user?.name || 'Dan S. Rey';

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Workflow Action Handlers
  const handleApprove = async (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(student.id);
    try {
      await approveStudentAccountRequest(student.id, reviewerName);
      showToast(`Account approved for ${student.name}. Mobile login authorized.`);
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error approving account request.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivate = async (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(student.id);
    try {
      await deactivateStudentAccount(student.id, reviewerName);
      showToast(`Account for ${student.name} has been deactivated.`);
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error deactivating account.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(student.id);
    try {
      await activateStudentAccount(student.id, reviewerName);
      showToast(`Account for ${student.name} activated. Mobile login enabled.`);
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error activating account.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedStudent(student);
    setRejectionReason('');
    setPresetReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedStudent) return;
    const finalReason = rejectionReason.trim() || presetReason;
    if (!finalReason) {
      alert('Please specify a rejection reason for the applicant.');
      return;
    }

    setProcessingId(selectedStudent.id);
    try {
      await rejectStudentAccountRequest(selectedStudent.id, reviewerName, finalReason);
      showToast(`Registration rejected for ${selectedStudent.name}.`);
      setShowRejectModal(false);
      setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error rejecting account request.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchive = async (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(student.id);
    try {
      await archiveStudent(student.id);
      showToast(`Student ${student.name} moved to archive.`);
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error archiving account.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetrieveRestore = async (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(student.id);
    try {
      await restoreStudent(student.id);
      showToast(`Student record for ${student.name} restored to Active roster.`);
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error restoring student account.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (student: Student) => {
    setProcessingId(student.id);
    try {
      await deleteDoc(doc(db, 'users', student.id));
      showToast(`Student profile for ${student.name} has been permanently removed.`);
      setDeleteConfirmStudent(null);
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error deleting student account.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrintStudentSlip = (student: Student) => {
    const pwd = student.temporaryPassword || student.rawDoc?.temporaryPassword || generateStudentPassword(student.name, student.studentId);
    
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      alert('Please allow pop-ups to print the student credentials slip.');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>HandSpeak Access Pass - ${student.name}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1c1917;
              margin: 0;
              padding: 24px;
              background-color: #fff;
            }
            .pass-card {
              border: 2px dashed #ca8a04;
              border-radius: 16px;
              padding: 28px;
              max-width: 480px;
              margin: 0 auto;
              background: #fffdf5;
            }
            .brand-header {
              text-align: center;
              border-bottom: 2px solid #fef08a;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 900;
              color: #521903;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin: 0;
            }
            .brand-sub {
              font-size: 11px;
              font-weight: 700;
              color: #854d0e;
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .info-box {
              background: #ffffff;
              border: 1px solid #e7e5e4;
              border-radius: 10px;
              padding: 10px 12px;
            }
            .label {
              font-size: 9.5px;
              font-weight: 800;
              color: #78716c;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
              display: block;
            }
            .value {
              font-size: 13px;
              font-weight: 800;
              color: #1c1917;
              word-break: break-all;
            }
            .password-box {
              background: #ffffff;
              border: 2px solid #521903;
              border-radius: 12px;
              padding: 14px;
              text-align: center;
              margin-bottom: 18px;
            }
            .password-code {
              font-family: monospace;
              font-size: 18px;
              font-weight: 900;
              color: #521903;
              letter-spacing: 1px;
            }
            .instructions {
              font-size: 10.5px;
              line-height: 1.4;
              color: #57534e;
              background: #f5f5f4;
              padding: 10px;
              border-radius: 8px;
              text-align: center;
            }
            .footer-notes {
              text-align: center;
              margin-top: 16px;
              font-size: 9px;
              color: #a8a29e;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="pass-card">
            <div class="brand-header">
              <h1 class="brand-title">HandSpeak Access Slip</h1>
              <div class="brand-sub">Official Student Login Credentials</div>
            </div>

            <div class="info-grid">
              <div class="info-box" style="grid-column: span 2;">
                <span class="label">Student Full Name</span>
                <div class="value">${student.fullName || student.name}</div>
              </div>
              <div class="info-box">
                <span class="label">Student ID Number</span>
                <div class="value" style="font-family: monospace;">${student.studentId}</div>
              </div>
              <div class="info-box">
                <span class="label">Grade & Section</span>
                <div class="value">${student.gradeLevel} - ${student.section}</div>
              </div>
              <div class="info-box" style="grid-column: span 2;">
                <span class="label">Login Email Address</span>
                <div class="value" style="font-family: monospace;">${student.email}</div>
              </div>
            </div>

            <div class="password-box">
              <span class="label" style="color: #521903; margin-bottom: 6px;">Active Temporary Password</span>
              <div class="password-code">${pwd}</div>
            </div>

            <div class="instructions">
              <strong>Instructions for Student:</strong><br/>
              Open the HandSpeak mobile app, sign in with your email and the password above.
            </div>

            <div class="footer-notes">
              Issued by Instructor ${reviewerName} &bull; HandSpeak Educational Systems
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Universal Drag & Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        await processUploadedSpreadsheet(file);
      } else {
        alert('Invalid file format. Please drop an Excel (.xlsx, .xls) or CSV (.csv) file.');
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processUploadedSpreadsheet(e.target.files[0]);
    }
  };

  const processUploadedSpreadsheet = async (file: File) => {
    setIsValidatingFile(true);
    setValidationResult(null);
    try {
      const result = await validateSpreadsheetFile(file);
      setValidationResult(result);
    } catch (err: any) {
      alert(err.message || 'Error inspecting spreadsheet file.');
    } finally {
      setIsValidatingFile(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!validationResult || validationResult.validCount === 0) {
      alert('There are no valid student rows to import.');
      return;
    }

    setIsImporting(true);
    try {
      const outcome = await executeBulkStudentImport(validationResult.rows, bulkStatusPolicy);
      alert(`Import complete! Successfully created ${outcome.imported} student records in Firebase.`);
      setValidationResult(null);
      setViewMode('list');
    } catch (err: any) {
      alert('Error during bulk upload execution: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Pure Empty Header-Only CSV Template
  const downloadPureCSVTemplate = () => {
    const csvContent = "First Name,Middle Name,Last Name,Email Address,Student ID,Grade Level,Section,Classification (Regular/SNED)\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'HandSpeak_Student_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit Workflow Initiator
  const triggerEditWorkflow = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nameParts = (student.fullName || student.name || '').split(' ');
    const first = nameParts[0] || '';
    const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : (student.rawDoc?.middleName || '');

    setFormData({
      firstName: first,
      middleName: middle,
      lastName: last,
      email: student.email,
      studentId: student.studentId,
      gradeLevel: student.gradeLevel || 'Grade 1',
      section: student.section || 'Narra',
      classification: student.type === 'SNED' ? 'SNED' : 'Regular',
      temporaryPassword: '',
    });
    setEditingStudentId(student.id);
    setViewMode('create');
  };

  const openCreateModal = () => {
    const initialPwd = generateStudentPassword('', '');
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      studentId: '',
      gradeLevel: 'Grade 1',
      section: '',
      classification: 'Regular',
      temporaryPassword: initialPwd,
    });
    setEditingStudentId(null);
    setViewMode('create');
  };

  // Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.studentId.trim() || !formData.email.trim()) {
      alert('Please fill out all required student particulars (First Name, Surname, Student ID, Email).');
      return;
    }

    if (!formData.email.includes('@')) {
      alert('Email address must contain "@".');
      return;
    }

    if (formData.studentId.length < 5 || formData.studentId.length > 12) {
      alert('Student ID must be between 5 and 12 numeric digits.');
      return;
    }

    setFormSubmitting(true);
    try {
      const isSned = formData.classification === 'SNED';
      const cleanType = isSned ? 'SNED' : 'REGULAR';
      
      const cleanMiddleName = formData.middleName.trim();
      const middleInitialDisplay = cleanMiddleName ? `${cleanMiddleName.charAt(0).toUpperCase()}.` : '';
      const compiledFullName = [formData.firstName.trim(), middleInitialDisplay, formData.lastName.trim()].filter(Boolean).join(' ');

      if (editingStudentId) {
        const studentRef = doc(db, 'users', editingStudentId);
        await updateDoc(studentRef, {
          name: compiledFullName,
          fullName: compiledFullName,
          firstName: formData.firstName.trim(),
          middleName: cleanMiddleName,
          middleInitial: cleanMiddleName ? cleanMiddleName.charAt(0).toUpperCase() : '',
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          studentId: formData.studentId.trim().toUpperCase(),
          gradeLevel: formData.gradeLevel.trim(),
          grade: formData.gradeLevel.trim(),
          section: formData.section.trim() || 'Narra',
          studentType: cleanType,
          type: cleanType,
          isSned,
          updatedAt: serverTimestamp(),
        });
        showToast(`Student profile for ${compiledFullName} updated successfully.`);
      } else {
        const newRef = doc(collection(db, 'users'));
        const assignedInitialPassword = formData.temporaryPassword || generateStudentPassword(formData.firstName, formData.studentId);

        await setDoc(newRef, {
          id: newRef.id,
          uid: newRef.id,
          name: compiledFullName,
          fullName: compiledFullName,
          firstName: formData.firstName.trim(),
          middleName: cleanMiddleName,
          middleInitial: cleanMiddleName ? cleanMiddleName.charAt(0).toUpperCase() : '',
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          studentId: formData.studentId.trim().toUpperCase(),
          gradeLevel: formData.gradeLevel.trim(),
          grade: formData.gradeLevel.trim(),
          section: formData.section.trim() || 'Narra',
          studentType: cleanType,
          type: cleanType,
          isSned,
          role: 'student',
          status: 'approved',
          temporaryPassword: assignedInitialPassword,
          approvedAt: serverTimestamp(),
          approvedBy: reviewerName,
          reviewedBy: reviewerName,
          creationOrigin: 'Teacher Console',
          schoolName: 'Sto. Tomas North Central School',
          department: isSned ? 'SNED' : 'STNCS',
          progress: 0,
          xp: 0,
          stars: 0,
          streak: 0,
          completedLessons: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`New student account "${compiledFullName}" created. Password saved in Student Details.`);
      }

      setEditingStudentId(null);
      setViewMode('list');
    } catch (err: any) {
      showToast(err.message || 'Failed to save student account.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((req) => {
      const name = req.fullName || req.name;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        name.toLowerCase().includes(q) ||
        req.email.toLowerCase().includes(q) ||
        req.studentId.toLowerCase().includes(q) ||
        req.section.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchesGrade = gradeFilter === 'All' || req.gradeLevel === gradeFilter;
      const matchesClassification = 
        classificationFilter === 'All' || 
        req.type === classificationFilter;

      return matchesSearch && matchesStatus && matchesGrade && matchesClassification;
    }).sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [students, searchQuery, statusFilter, gradeFilter, classificationFilter]);

  const pendingCount = students.filter((r) => r.status === 'pending').length;
  const approvedCount = students.filter((r) => r.status === 'approved').length;
  const rejectedCount = students.filter((r) => r.status === 'rejected').length;
  const archivedCount = students.filter((r) => r.status === 'archived').length;
  const deactivatedCount = students.filter((r) => r.status === 'deactivated').length;

  const formatShortDate = (val: any) => {
    if (!val) return 'N/A';
    try {
      if (val.toDate) return val.toDate().toLocaleDateString();
      if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString();
      return new Date(val).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatFullTimestamp = (val: any) => {
    if (!val) return 'Not recorded';
    try {
      if (typeof val === 'string') return val;
      if (val.toDate) return val.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      if (val.seconds) return new Date(val.seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      return new Date(val).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return 'Not recorded';
    }
  };

  return (
    <div className="w-full h-full flex flex-col font-sans gap-4 text-stone-800 dark:text-stone-100 overflow-hidden">
      
      {/* Top Header Row with Title on Left and Action Buttons on Right */}
      <div className="flex items-center justify-between shrink-0 px-1 pt-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#521903] dark:text-[#F0AB31] font-serif">
          STUDENT ACCOUNT MANAGEMENT
        </h2>

        <div className="flex items-center gap-3">
          <button 
            onClick={openCreateModal}
            className="h-10 px-5 rounded-full bg-[#111827] hover:bg-black text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>CREATE NEW ACCOUNT</span>
          </button>

          <button 
            onClick={() => { setValidationResult(null); setViewMode('bulk'); }}
            className="h-10 px-5 rounded-full bg-white hover:bg-stone-50 dark:bg-[#1A1614] dark:hover:bg-[#2A231F] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-[#382F2A] font-bold text-xs uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span>BULK UPLOAD</span>
          </button>
        </div>
      </div>

      {feedbackToast && (
        <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in shrink-0 ${
          feedbackToast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}>
          <span>{feedbackToast.text}</span>
          <button onClick={() => setFeedbackToast(null)} className="underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: LIST FRAME */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Search & Filter Controls Bar */}
          <div className="bg-white/90 dark:bg-[#1A1614]/85 backdrop-blur-xl p-3.5 rounded-full border border-white/70 dark:border-[#382F2A] shadow-xs shrink-0 flex items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search students by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-4 bg-white dark:bg-[#0D0B0A] text-stone-800 dark:text-stone-100 text-xs font-semibold rounded-full border border-stone-200 dark:border-[#382F2A] focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs"
              />
            </div>

            {/* Status Filter Pills, Classification & Grade Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#0D0B0A] p-1 rounded-full border border-stone-200 dark:border-[#382F2A] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                    statusFilter === 'all'
                      ? 'bg-[#521903] text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Pending {pendingCount > 0 ? `(${pendingCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('approved')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                    statusFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                    statusFilter === 'rejected'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Rejected ({rejectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('deactivated')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                    statusFilter === 'deactivated'
                      ? 'bg-zinc-700 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Deactivated ({deactivatedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('archived')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer text-[11px] ${
                    statusFilter === 'archived'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Archived ({archivedCount})
                </button>
              </div>

              {/* Classification Filter */}
              <div className="relative flex items-center shrink-0">
                <select 
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value)}
                  className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
                >
                  <option value="All">All Types</option>
                  <option value="REGULAR">Regular</option>
                  <option value="SNED">SNED</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
              </div>

              {/* Grade Level Dropdown (Grade 1 - Grade 6) */}
              <div className="relative flex items-center shrink-0">
                <select 
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="appearance-none h-9 pl-4 pr-9 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
                >
                  <option value="All">All Grades</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Student Table Container with Fixed Anchored Header and Gutter Clearance */}
          {loading ? (
            <div className="flex items-center justify-center py-24 bg-white/80 dark:bg-[#1A1614]/85 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-[#382F2A] text-stone-400 font-bold text-xs gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#F0AB31]" />
              <span>Loading student registration records from Firebase...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-20 bg-white/80 dark:bg-[#1A1614]/85 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-[#382F2A] text-stone-400 font-bold text-xs">
              No student records found matching the specified criteria.
            </div>
          ) : (
            <div className="bg-white/90 dark:bg-[#1A1614]/85 backdrop-blur-2xl rounded-3xl p-5 border border-white/70 dark:border-[#382F2A] shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  
                  {/* Sticky Header Layer with generous action gutter */}
                  <thead className="sticky top-0 z-20 bg-white/95 dark:bg-[#1A1614]/95 backdrop-blur-md">
                    <tr className="border-b border-stone-200/80 dark:border-[#382F2A] text-[10px] text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-6 w-[25%] bg-white/95 dark:bg-[#1A1614]/95">USER PROFILE</th>
                      <th className="py-4 px-4 w-[18%] bg-white/95 dark:bg-[#1A1614]/95">ACADEMIC GROUP</th>
                      <th className="py-4 px-4 w-[15%] bg-white/95 dark:bg-[#1A1614]/95">IDENTIFIER</th>
                      <th className="py-4 px-4 w-[10%] text-center bg-white/95 dark:bg-[#1A1614]/95">ROLE</th>
                      <th className="py-4 px-4 w-[12%] text-center bg-white/95 dark:bg-[#1A1614]/95">STATUS</th>
                      <th className="py-4 pr-6 w-[20%] text-right bg-white/95 dark:bg-[#1A1614]/95">WORKFLOW ACTION</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-[#382F2A] text-[11px] font-semibold text-slate-600 dark:text-stone-300">
                    {filteredStudents.map((req) => {
                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';
                      const isRejected = req.status === 'rejected';
                      const isArchived = req.status === 'archived';
                      const isDeactivated = req.status === 'deactivated';

                      return (
                        <tr 
                          key={req.id}
                          onClick={() => setSelectedStudent(req)}
                          className="hover:bg-[#F2B33D]/4 dark:hover:bg-[#2A231F] transition-colors cursor-pointer"
                        >
                          {/* User Profile */}
                          <td className="py-3.5 px-6">
                            <div className="space-y-0.5">
                              <div className="font-black text-slate-800 dark:text-[#F3EFEA] text-sm tracking-tight truncate">{req.name}</div>
                              <div className="text-[10px] font-medium text-slate-400 truncate flex items-center gap-1">
                                <Mail className="h-3 w-3 inline opacity-70 shrink-0" /> <span className="truncate">{req.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Academic Group */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-800 dark:text-stone-100 font-bold text-xs">{req.gradeLevel} - {req.section}</span>
                              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-extrabold uppercase">
                                ({req.type})
                              </span>
                            </div>
                          </td>

                          {/* Identifier */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">STUDENT ID</div>
                              <div className="font-mono text-slate-700 dark:text-stone-200 font-bold text-xs">{req.studentId}</div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-blue-50 text-blue-600 border border-blue-100/30 dark:bg-blue-950/40 dark:text-blue-300">
                              STUDENT
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md border uppercase inline-flex items-center gap-1 ${
                              isPending ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                              isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              isDeactivated ? 'bg-zinc-100 text-zinc-700 border-zinc-300' :
                              'bg-stone-100 text-stone-700 border-stone-300'
                            }`}>
                              {req.status}
                            </span>
                            <span className="block text-[8px] font-medium text-slate-400 mt-0.5">Created: {formatShortDate(req.createdAt)}</span>
                          </td>

                          {/* Fixed Unclipped Action Deck with Safe Padding Right */}
                          <td className="py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-[36px_88px_36px] gap-2 items-center justify-end h-9 w-[180px] ml-auto">
                              
                              {/* SLOT 1 */}
                              <div className="flex items-center justify-center">
                                {isPending ? (
                                  <button
                                    disabled={processingId === req.id}
                                    onClick={(e) => handleApprove(req, e)}
                                    title="Approve Account"
                                    className="h-8 w-8 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                ) : isApproved ? (
                                  <button 
                                    onClick={(e) => triggerEditWorkflow(req, e)}
                                    title="Edit Student Account"
                                    className="h-8 w-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 dark:text-stone-300 flex items-center justify-center transition-all shadow-xs bg-white dark:bg-[#2A231F] cursor-pointer"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>

                              {/* SLOT 2 */}
                              <div className="flex items-center justify-center">
                                {isPending ? (
                                  <button
                                    disabled={processingId === req.id}
                                    onClick={(e) => openRejectDialog(req, e)}
                                    className="w-full h-8 px-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10.5px] transition-colors cursor-pointer flex items-center justify-center"
                                  >
                                    Reject
                                  </button>
                                ) : isApproved ? (
                                  <button 
                                    onClick={(e) => handleDeactivate(req, e)}
                                    className="w-full h-8 px-2 rounded-full border border-slate-200 hover:bg-zinc-100 text-slate-700 font-bold text-[10.5px] transition-colors cursor-pointer shadow-xs bg-white dark:bg-[#2A231F] flex items-center justify-center"
                                  >
                                    Deactivate
                                  </button>
                                ) : isDeactivated ? (
                                  <button 
                                    onClick={(e) => handleActivate(req, e)}
                                    className="w-full h-8 px-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition-colors shadow-xs cursor-pointer flex items-center justify-center"
                                  >
                                    Activate
                                  </button>
                                ) : isArchived ? (
                                  <button 
                                    onClick={(e) => handleRetrieveRestore(req, e)}
                                    className="w-full h-8 px-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] transition-colors shadow-xs cursor-pointer flex items-center justify-center"
                                  >
                                    Restore
                                  </button>
                                ) : null}
                              </div>

                              {/* SLOT 3 */}
                              <div className="flex items-center justify-center">
                                {isApproved || isDeactivated ? (
                                  <button 
                                    onClick={(e) => handleArchive(req, e)}
                                    title="Archive Student Account"
                                    className="h-8 w-8 rounded-full border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-all shadow-xs bg-white dark:bg-[#2A231F] cursor-pointer"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </button>
                                ) : isArchived ? (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmStudent(req); }}
                                    title="Permanently Delete Account"
                                    className="h-8 w-8 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : isRejected ? (
                                  <button 
                                    onClick={(e) => handleArchive(req, e)}
                                    title="Archive Rejected Request"
                                    className="h-8 w-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-[10.5px] transition-colors cursor-pointer shadow-xs bg-white dark:bg-[#2A231F] flex items-center justify-center"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-[#382F2A] flex items-center justify-between text-xs text-stone-400 shrink-0">
                <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> student accounts</span>
                <span className="font-semibold text-[11px]">Real-time Database Synchronization</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: CREATE / EDIT INDIVIDUAL FORM */}
      {/* ========================================================================= */}
      {viewMode === 'create' && (
        <div className="bg-white rounded-3xl border border-white shadow-md p-7 max-w-2xl mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-[#521903]">
                {editingStudentId ? 'Modify Student Profile Parameters' : 'Create New Student Account'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {editingStudentId ? 'Update student particulars.' : 'Automated initial password generation enabled.'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => setViewMode('list')}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-bold">
            
            {/* ROW 1: Granular Name Fields (Even 3-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  First Name *
                </div>
                <input 
                  type="text" required placeholder="e.g. Maria"
                  value={formData.firstName} 
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                    setFormData({...formData, firstName: clean});
                  }}
                  className="w-full h-10 px-3.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  Middle Name (Optional)
                </div>
                <input 
                  type="text" placeholder="e.g. Cruz"
                  value={formData.middleName} 
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                    setFormData({...formData, middleName: clean});
                  }}
                  className="w-full h-10 px-3.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  Last Name (Surname) *
                </div>
                <input 
                  type="text" required placeholder="Santos"
                  value={formData.lastName} 
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                    setFormData({...formData, lastName: clean});
                  }}
                  className="w-full h-10 px-3.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
                />
              </div>
            </div>

            {/* ROW 2: Email Address (Full Width Row) */}
            <div className="space-y-1.5">
              <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                Email Address *
              </div>
              <input 
                type="email" required placeholder="maria@handspeak.edu"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase().trim()})}
                className="w-full h-10 px-3.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
              />
            </div>

            {/* ROW 3: Student ID, Classification, Grade (Grade 1-6 Dropdown), and Section (Equal 4-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  Student ID *
                </div>
                <input 
                  type="text" required maxLength={12} placeholder="e.g. 260000000001 (5-12 digits)"
                  value={formData.studentId} 
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({...formData, studentId: clean});
                  }}
                  className="w-full h-10 px-3.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903] font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  Classification *
                </div>
                <div className="relative">
                  <select 
                    value={formData.classification} 
                    onChange={(e) => setFormData({...formData, classification: e.target.value as any})}
                    className="w-full h-10 appearance-none pl-3.5 pr-8 border border-[#F5E6C4] bg-white rounded-xl text-xs focus:outline-none text-[#521903] font-black cursor-pointer"
                  >
                    <option value="Regular">Regular</option>
                    <option value="SNED">SNED</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-2.5 top-3 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  Grade Level *
                </div>
                <div className="relative">
                  <select 
                    value={formData.gradeLevel} 
                    onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                    className="w-full h-10 appearance-none pl-3.5 pr-8 border border-[#F5E6C4] bg-white rounded-xl text-xs focus:outline-none text-[#521903] font-bold cursor-pointer"
                  >
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-2.5 top-3 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-4 flex items-center text-slate-400 uppercase tracking-wide text-[10.5px]">
                  Section *
                </div>
                <input 
                  type="text" required placeholder="Narra"
                  value={formData.section} 
                  onChange={(e) => setFormData({...formData, section: e.target.value})}
                  className="w-full h-10 px-3.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none text-[#521903]"
                />
              </div>
            </div>

            {/* Automated Unique Password Section (Shown Only on Create) */}
            {!editingStudentId && (
              <div className="p-3.5 bg-amber-50/60 dark:bg-[#2A231F] rounded-2xl border border-amber-200/70 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-amber-900 dark:text-[#F0AB31] uppercase tracking-wider block text-[10px] font-black flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" /> Automated Initial Student Password
                  </label>
                  <button 
                    type="button" 
                    onClick={regeneratePassword}
                    className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Regenerate
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={formData.temporaryPassword || generateStudentPassword(formData.firstName, formData.studentId)}
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-[#151311] border border-amber-200 rounded-xl font-mono text-xs font-bold text-stone-800 dark:text-stone-100 select-all"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const pwd = formData.temporaryPassword || generateStudentPassword(formData.firstName, formData.studentId);
                      navigator.clipboard.writeText(pwd);
                      showToast('Temporary password copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-[#111827] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <p className="text-[10px] text-stone-500">Note: This password is saved in Firestore and remains permanently reviewable in the student details.</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" onClick={() => setViewMode('list')}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={formSubmitting}
                className="bg-[#111827] hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingStudentId ? 'Save Changes' : 'Confirm'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW C: BULK UPLOAD CONSOLE (UNIVERSAL EXCEL .XLSX, .XLS & CSV SUPPORT) */}
      {/* ========================================================================= */}
      {viewMode === 'bulk' && (
        <div className="bg-white rounded-3xl border border-white shadow-2xl p-8 w-full max-w-3xl mx-auto space-y-8 animate-fadeIn relative">
          <button 
            onClick={() => { setViewMode('list'); setValidationResult(null); setIsDragging(false); }} 
            className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 absolute top-6 right-6 transition-colors border border-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-widest text-[#521903]">Bulk Upload Console</h3>
            <p className="text-sm font-bold text-slate-400">Onboard multiple student profiles securely via Excel (.xlsx / .xls) or CSV.</p>
          </div>

          {/* Validation Feedback Matrix Banner */}
          {validationResult && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-400 uppercase font-black block">Total Processed</span>
                  <strong className="text-sm font-black text-stone-800">{validationResult.totalRows}</strong>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-black block">Valid Ready</span>
                  <strong className="text-sm font-black text-emerald-700">{validationResult.validCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-700 uppercase font-black block">Invalid Format</span>
                  <strong className="text-sm font-black text-rose-700">{validationResult.invalidCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-700 uppercase font-black block">Duplicates / In DB</span>
                  <strong className="text-sm font-black text-amber-700">{validationResult.duplicateInFileCount + validationResult.existingInDbCount}</strong>
                </div>
              </div>

              {/* Preview Scroll Ledger */}
              <div className="max-h-[140px] overflow-y-auto border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-stone-100 text-[9.5px] font-black uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">ID</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {validationResult.rows.map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'bg-white' : 'bg-rose-50/50'}>
                        <td className="p-2 font-mono">{r.rowNumber}</td>
                        <td className="p-2 font-bold">{r.fullName || '-'}</td>
                        <td className="p-2 font-mono">{r.email}</td>
                        <td className="p-2 font-mono font-bold">{r.studentId}</td>
                        <td className="p-2">
                          {r.isValid ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {r.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fully Functional Drag & Drop File Zone (Excel & CSV) */}
          {!validationResult && (
            <div 
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-10 rounded-2xl border-2 border-dashed text-sm font-semibold leading-relaxed text-center transition-all duration-200 flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                isDragging 
                  ? 'border-[#F2B33D] bg-[#FFFBEB] text-[#521903] scale-[1.01] shadow-inner' 
                  : 'border-amber-200 bg-[#FFFBEB]/50 text-slate-600 hover:border-amber-300 hover:bg-[#FFFBEB]/70'
              }`}
            >
              <Upload className={`h-8 w-8 transition-transform duration-200 ${isDragging ? 'text-[#F2B33D] scale-110 animate-bounce' : 'text-slate-400'}`} />
              <div>
                <p className="font-black text-slate-700">
                  {isValidatingFile ? 'Inspecting Database...' : isDragging ? 'Drop your spreadsheet here!' : 'Drag & Drop your Excel (.xlsx / .xls) or CSV file here'}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Supports .xlsx, .xls, and .csv files. Multiple records will be validated at once.
                </p>
              </div>
            </div>
          )}

          {/* Action Row - Clean Single CSV Template Button + File Picker */}
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center pt-4">
            <button 
              type="button" 
              onClick={downloadPureCSVTemplate}
              className="inline-flex items-center justify-center gap-3 bg-[#DBEAFE] hover:bg-blue-100 border border-blue-200 text-blue-700 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer w-full sm:w-1/2"
            >
              <Download className="h-4 w-4" /> Download CSV Template
            </button>

            {!validationResult ? (
              <label className="inline-flex items-center justify-center gap-3 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all cursor-pointer w-full sm:w-1/2">
                <Upload className="h-5 w-5" /> 
                Choose File & Upload
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  onChange={handleFileInputChange}
                />
              </label>
            ) : (
              <button
                type="button"
                disabled={isImporting || validationResult.validCount === 0}
                onClick={handleExecuteImport}
                className="inline-flex items-center justify-center gap-3 bg-[#52B788] hover:bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all cursor-pointer w-full sm:w-1/2 disabled:opacity-50"
              >
                {isImporting && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>Confirm Upload ({validationResult.validCount})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT, LOGIN LOGS & READ-ONLY CREDENTIALS WITH PRINT SLIP MODAL */}
      {/* ========================================================================= */}
      {selectedStudent && !showRejectModal && !deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1614] rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden border border-stone-200 dark:border-[#382F2A] animate-fadeIn text-stone-800 dark:text-stone-100">
            
            {/* Modal Top Header Bar */}
            <div className="px-6 py-4 border-b border-stone-100 dark:border-[#382F2A] flex items-center justify-between bg-stone-50/60 dark:bg-[#0D0B0A]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-extrabold text-[#521903] dark:text-[#F3EFEA] tracking-tight">
                  {selectedStudent.fullName}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  selectedStudent.status === 'pending'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : selectedStudent.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : selectedStudent.status === 'rejected'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : selectedStudent.status === 'deactivated'
                    ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}>
                  {selectedStudent.status}
                </span>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tab Navigation Bar */}
            <div className="flex items-center gap-1.5 px-6 pt-3 bg-stone-50/40 dark:bg-[#0D0B0A] border-b border-stone-100 dark:border-[#382F2A] text-xs font-bold">
              <button
                type="button"
                onClick={() => setDossierTab('particulars')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  dossierTab === 'particulars'
                    ? 'border-[#521903] dark:border-[#F0AB31] text-[#521903] dark:text-[#F0AB31]'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Profile Particulars</span>
              </button>

              <button
                type="button"
                onClick={() => setDossierTab('loginHistory')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  dossierTab === 'loginHistory'
                    ? 'border-[#521903] dark:border-[#F0AB31] text-[#521903] dark:text-[#F0AB31]'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Login & Session History ({loginHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDossierTab('accountActivity')}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  dossierTab === 'accountActivity'
                    ? 'border-[#521903] dark:border-[#F0AB31] text-[#521903] dark:text-[#F0AB31]'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Security & Password Logs</span>
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="p-6 space-y-3.5 text-xs max-h-[380px] overflow-y-auto">
              
              {/* TAB 1: PROFILE PARTICULARS & LIFECYCLE TRAIL */}
              {dossierTab === 'particulars' && (
                <div className="space-y-3.5">
                  
                  {/* Permanent Read-Only Saved Credentials Recovery Card with PRINT SLIP Button */}
                  <div className="p-3.5 bg-amber-50/70 dark:bg-[#2A231F] rounded-2xl border border-amber-200/80 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-[#521903] dark:text-[#F0AB31] flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-amber-600" /> Student Login Credentials Recovery
                      </span>
                      <span className="text-[10px] text-stone-400 font-semibold">Saved upon account creation</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2 bg-white dark:bg-[#0D0B0A] border border-amber-200/70 rounded-xl font-mono text-xs font-bold text-stone-800 dark:text-stone-100 select-all">
                        {selectedStudent.temporaryPassword || selectedStudent.rawDoc?.temporaryPassword || generateStudentPassword(selectedStudent.name, selectedStudent.studentId)}
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const pwd = selectedStudent.temporaryPassword || selectedStudent.rawDoc?.temporaryPassword || generateStudentPassword(selectedStudent.name, selectedStudent.studentId);
                          navigator.clipboard.writeText(pwd);
                          showToast('Temporary password copied to clipboard!');
                        }}
                        className="px-3.5 py-2 bg-[#111827] hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                      <button 
                        type="button"
                        onClick={() => handlePrintStudentSlip(selectedStudent)}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print Pass
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500">Click &ldquo;Print Pass&rdquo; to generate a printable slip with the student&apos;s name, email, and password.</p>
                  </div>

                  {/* Academic Group Parameters */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50 dark:bg-[#0D0B0A] rounded-2xl border border-stone-200/70 dark:border-[#382F2A]">
                    <div>
                      <span className="text-stone-400 text-[10px] block font-bold uppercase">Student ID</span>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-100">{selectedStudent.studentId}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block font-bold uppercase">Classification</span>
                      <span className="font-bold text-stone-800 dark:text-stone-100">{selectedStudent.type}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block font-bold uppercase">Grade Level</span>
                      <span className="font-bold text-stone-800 dark:text-stone-100">{selectedStudent.gradeLevel}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block font-bold uppercase">Assigned Section</span>
                      <span className="font-bold text-stone-800 dark:text-stone-100">{selectedStudent.section}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Email Address:</span>
                      <span className="font-mono font-bold">{selectedStudent.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Creation Method:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {selectedStudent.rawDoc?.creationOrigin || (selectedStudent.rawDoc?.uid ? 'Mobile App Registration' : 'Faculty Console Provisioning')}
                      </span>
                    </div>
                  </div>

                  {/* Complete Lifecycle History Trail */}
                  <div className="p-3.5 rounded-2xl bg-stone-50/70 dark:bg-[#0D0B0A] border border-stone-200/60 dark:border-[#382F2A] space-y-1 text-[10.5px]">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-[#F0AB31] mb-1.5 flex items-center gap-1">
                      <History className="h-3 w-3" /> Account Lifecycle Activity Trail
                    </div>
                    
                    <div className="flex justify-between text-stone-500">
                      <span>Date Filed (Registration):</span>
                      <strong className="text-stone-700 dark:text-stone-200">{formatFullTimestamp(selectedStudent.createdAt)}</strong>
                    </div>

                    {selectedStudent.approvedAt && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <span>Approved & Authorized Date:</span>
                        <strong>{formatFullTimestamp(selectedStudent.approvedAt)}</strong>
                      </div>
                    )}

                    {selectedStudent.reviewedBy && (
                      <div className="flex justify-between text-stone-500">
                        <span>Reviewing Faculty:</span>
                        <strong className="text-stone-700 dark:text-stone-200">{selectedStudent.reviewedBy}</strong>
                      </div>
                    )}

                    {selectedStudent.deactivatedAt && (
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Deactivated Timestamp:</span>
                        <strong>{formatFullTimestamp(selectedStudent.deactivatedAt)}</strong>
                      </div>
                    )}

                    {selectedStudent.archivedAt && (
                      <div className="flex justify-between text-stone-500">
                        <span>Archived Timestamp:</span>
                        <strong>{formatFullTimestamp(selectedStudent.archivedAt)}</strong>
                      </div>
                    )}

                    {selectedStudent.rejectedAt && (
                      <div className="flex justify-between text-rose-600">
                        <span>Rejection Timestamp:</span>
                        <strong>{formatFullTimestamp(selectedStudent.rejectedAt)}</strong>
                      </div>
                    )}
                  </div>

                  {selectedStudent.rejectionReason && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                      <span className="text-[10px] font-bold uppercase block mb-0.5">Recorded Rejection Feedback:</span>
                      <p className="italic">&ldquo;{selectedStudent.rejectionReason}&rdquo;</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DETAILED LOGIN AUDIT TRAIL */}
              {dossierTab === 'loginHistory' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    AUTHENTICATION AUDIT & ACTIVE SESSIONS
                  </span>

                  {loadingHistory ? (
                    <div className="p-8 text-center text-stone-400 flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-[#F0AB31]" />
                      <span>Loading session logs...</span>
                    </div>
                  ) : loginHistory.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 border border-dashed border-stone-200 dark:border-[#382F2A] rounded-2xl">
                      <Laptop className="h-6 w-6 mx-auto mb-1 opacity-40" />
                      <p className="font-bold">No mobile login sessions recorded yet.</p>
                      <span className="text-[10px]">Timestamps will register upon mobile app login.</span>
                    </div>
                  ) : (
                    loginHistory.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 bg-stone-50 dark:bg-[#0D0B0A] rounded-xl border border-stone-200/70 dark:border-[#382F2A] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-3.5 w-3.5 text-stone-500" />
                            <strong className="text-stone-800 dark:text-stone-200">{item.device || 'Mobile App Session'}</strong>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono block">Status: {item.status || 'Success'}</span>
                        </div>
                        <span className="text-[10.5px] font-bold text-stone-500">
                          {formatFullTimestamp(item.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: ACCOUNT & PASSWORD SECURITY LOGS */}
              {dossierTab === 'accountActivity' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    ACCOUNT SECURITY & PROFILE ALTERATION LOGS
                  </span>

                  {loadingHistory ? (
                    <div className="p-8 text-center text-stone-400 flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-[#F0AB31]" />
                      <span>Loading activity trail...</span>
                    </div>
                  ) : accountActivities.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 border border-dashed border-stone-200 dark:border-[#382F2A] rounded-2xl space-y-1">
                      <Lock className="h-6 w-6 mx-auto mb-1 opacity-40" />
                      <p className="font-bold">No password changes or profile modifications logged.</p>
                      <span className="text-[10px]">Profile and credential updates will log automatically.</span>
                    </div>
                  ) : (
                    accountActivities.map((act, idx) => (
                      <div key={act.id || idx} className="p-3 bg-stone-50 dark:bg-[#0D0B0A] rounded-xl border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {act.action}
                          </strong>
                          <span className="text-[10px] text-stone-400">{formatFullTimestamp(act.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-tight">{act.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 border-t border-stone-100 dark:border-[#382F2A] bg-stone-50/50 flex items-center justify-between">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-xl bg-white dark:bg-[#2A231F] hover:bg-stone-100 text-stone-700 dark:text-stone-300 font-bold text-xs border border-stone-200 dark:border-[#382F2A] cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedStudent.status === 'pending' && (
                  <>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => openRejectDialog(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer"
                    >
                      Reject Application
                    </button>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => handleApprove(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {processingId === selectedStudent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Authorize & Activate</span>
                    </button>
                  </>
                )}

                {selectedStudent.status === 'approved' && (
                  <>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => handleDeactivate(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs border border-zinc-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserMinus size={13} /> Deactivate
                    </button>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => handleArchive(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Archive size={13} /> Move to Archive
                    </button>
                  </>
                )}

                {selectedStudent.status === 'deactivated' && (
                  <>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => handleActivate(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck size={13} /> Activate Account
                    </button>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => handleArchive(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Archive size={13} /> Move to Archive
                    </button>
                  </>
                )}

                {selectedStudent.status === 'archived' && (
                  <>
                    <button 
                      disabled={processingId === selectedStudent.id}
                      onClick={() => handleRetrieveRestore(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={13} /> Restore Account
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmStudent(selectedStudent)}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} /> Permanent Delete
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERMANENT DELETE CONFIRMATION DIALOG MODAL */}
      {/* ========================================================================= */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1614] rounded-3xl p-6 border border-stone-200 dark:border-[#382F2A] shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 text-stone-800 dark:text-stone-100 text-center">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-[#521903] dark:text-[#F3EFEA]">
                Permanently Delete Student Record?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Are you sure you want to permanently delete the profile for <strong>{deleteConfirmStudent.name}</strong> ({deleteConfirmStudent.studentId})? This action will permanently erase all progress maps, stars, and credentials from Firebase.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-stone-100 dark:border-[#382F2A]">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmStudent(null)}
                className="w-1/2 py-2.5 rounded-xl border border-stone-200 bg-white dark:bg-[#2A231F] hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={processingId === deleteConfirmStudent.id}
                onClick={() => handlePermanentDelete(deleteConfirmStudent)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {processingId === deleteConfirmStudent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete Permanently</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECTION REASON MODAL */}
      {/* ========================================================================= */}
      {showRejectModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1614] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-stone-200 dark:border-[#382F2A] animate-fadeIn text-stone-800 dark:text-stone-100">
            
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#382F2A] pb-2.5">
              <div className="flex items-center gap-1.5 text-rose-600">
                <AlertCircle className="h-4 w-4" />
                <h3 className="text-sm font-bold">Specify Rejection Reason</h3>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              State why <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentId}) cannot be authorized. This decision is preserved in Firestore and prevents mobile sign-in.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Quick Feedback Presets</label>
              <div className="space-y-1">
                {feedbackTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPresetReason(template);
                      setRejectionReason(template);
                    }}
                    className={`w-full text-left p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      rejectionReason === template
                        ? 'border-[#F0AB31] bg-amber-50 dark:bg-[#2A231F] font-bold text-[#521903] dark:text-[#F0AB31]'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#0D0B0A] text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Custom Comment</label>
              <textarea
                rows={3}
                placeholder="Additional instructions or notes for the student..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#0D0B0A] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#F0AB31] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-[#382F2A]">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-[#2A231F] hover:bg-stone-200 text-stone-600 dark:text-stone-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === selectedStudent.id || (!rejectionReason.trim() && !presetReason)}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingId === selectedStudent.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Submit Rejection</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}