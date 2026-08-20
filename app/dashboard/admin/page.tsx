'use client';

import { useState, useEffect } from 'react';
import { 
  Search, ChevronDown, UserPlus, ArrowLeft, 
  Loader2, FileText, X, ExternalLink, Calendar, Mail, 
  Building2, BookOpen, MessageSquare, AlertCircle, CheckCircle2, Send, Check,
  Phone, UserCheck, Layers, GraduationCap, Shield, Clock, CheckCircle, XCircle,
  Archive, UserMinus, Plus
} from 'lucide-react';
import { 
  getAccountRequests, 
  approveAccountRequest, 
  rejectAccountRequest,
  archiveAccountRequest,
  deactivateUserAccount,
  signUpUser 
} from '@/lib/auth-service';
import { AccountRequest } from '@/lib/rbac';

export default function AdminAccountManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'archived' | 'deactivated'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Modal inspection states
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [presetReason, setPresetReason] = useState('');

  // Comprehensive Form State for manual account creation (exact same details as registration)
  const [formData, setFormData] = useState({
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    gender: 'Male',
    employeeId: '',
    facultyPosition: 'Teacher',
    department: 'Special Needs Education (SNED)',
    assignedGrade: 'Kindergarten',
    assignedSections: [] as string[],
    email: '',
    contactNumber: '',
    role: 'teacher' as 'teacher' | 'student',
    password: '',
    confirmPassword: '',
  });

  const [newSectionInput, setNewSectionInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const feedbackTemplates = [
    'Uploaded ID is blurry or unreadable.',
    'ID Number does not match school records.',
    'Proof of enrollment/employment document is missing or expired.',
    'Selected department does not match submitted credentials.',
  ];

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getAccountRequests();
      setRequests(data);
    } catch (error) {
      console.error("Error fetching account requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenDocument = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);

        for (let i = 0; i < raw.length; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }

        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        const win = window.open();
        if (win) {
          win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; width:100%; height:100%;"></iframe>`);
        }
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleApprove = async (req: AccountRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setProcessingId(req.id);
      await approveAccountRequest(req.id, "System Administrator");
      
      alert(
        `Account Approved!\n\n` +
        `Account has been activated for: ${req.fullName}\n` +
        `Authentication Login Email: ${req.loginEmail || req.email}\n` +
        `Notification Email: ${req.email}`
      );

      await fetchRequests();
      if (selectedRequest?.id === req.id) setSelectedRequest(null);
    } catch (err: any) {
      alert("Error approving request: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (req: AccountRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRequest(req);
    setRejectionReason('');
    setPresetReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    const finalReason = rejectionReason.trim() || presetReason;
    
    if (!finalReason) {
      alert("Please provide a feedback reason so the applicant knows what to correct.");
      return;
    }

    try {
      setProcessingId(selectedRequest.id);
      await rejectAccountRequest(selectedRequest.id, "System Administrator", finalReason);
      
      alert(`Rejection recorded for ${selectedRequest.fullName}.\n\nReason: "${finalReason}"`);
      
      setShowRejectModal(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      alert("Error rejecting request: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchive = async (req: AccountRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Are you sure you want to archive the record for ${req.fullName}? Historical data will be preserved.`)) return;

    try {
      setProcessingId(req.id);
      await archiveAccountRequest(req.id, "System Administrator");
      alert(`Record for ${req.fullName} moved to Archived history.`);
      await fetchRequests();
      if (selectedRequest?.id === req.id) setSelectedRequest(null);
    } catch (err: any) {
      alert("Error archiving request: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivate = async (req: AccountRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Deactivate access for ${req.fullName}? The account history will remain accessible to admins.`)) return;

    try {
      setProcessingId(req.id);
      await deactivateUserAccount(req.id, "System Administrator");
      alert(`Account for ${req.fullName} is now deactivated.`);
      await fetchRequests();
      if (selectedRequest?.id === req.id) setSelectedRequest(null);
    } catch (err: any) {
      alert("Error deactivating account: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddSection = () => {
    const trimmed = newSectionInput.trim();
    if (trimmed && !formData.assignedSections.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        assignedSections: [...prev.assignedSections, trimmed],
      }));
      setNewSectionInput('');
    }
  };

  const handleRemoveSection = (sectionName: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedSections: prev.assignedSections.filter((s) => s !== sectionName),
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert("First and Last name are required.");
      return;
    }
    if (!formData.middleInitial.trim()) {
      alert("Middle Initial is required.");
      return;
    }
    if (!formData.employeeId.trim()) {
      alert("Employee ID is required.");
      return;
    }
    if (!formData.contactNumber.trim()) {
      alert("Contact Number is required.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setFormSubmitting(true);
    try {
      await signUpUser({
        firstName: formData.firstName.trim(),
        middleInitial: formData.middleInitial.trim().toUpperCase(),
        lastName: formData.lastName.trim(),
        suffix: formData.suffix.trim(),
        gender: formData.gender,
        email: formData.email.trim().toLowerCase(),
        contactNumber: formData.contactNumber.trim(),
        password: formData.password,
        employeeId: formData.employeeId.trim().toUpperCase(),
        facultyPosition: formData.facultyPosition,
        department: formData.department,
        assignedGrade: formData.assignedGrade,
        assignedSections: formData.assignedSections,
        role: formData.role,
      });

      alert("Account created and activated successfully with complete registration details!");
      setShowForm(false);
      setFormData({
        firstName: '',
        middleInitial: '',
        lastName: '',
        suffix: '',
        gender: 'Male',
        employeeId: '',
        facultyPosition: 'Teacher',
        department: 'Special Needs Education (SNED)',
        assignedGrade: 'Kindergarten',
        assignedSections: [],
        email: '',
        contactNumber: '',
        role: 'teacher',
        password: '',
        confirmPassword: '',
      });
      await fetchRequests();
    } catch (err: any) {
      alert("Error creating account: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const sortedAndFilteredRequests = [...requests]
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;

      const dateA = new Date(a.submittedAt || 0).getTime();
      const dateB = new Date(b.submittedAt || 0).getTime();

      if (isNaN(dateA) || isNaN(dateB)) {
        return (b.id || '').localeCompare(a.id || '');
      }

      return dateB - dateA;
    })
    .filter((req) => {
      const name = req.fullName || `${req.firstName || ''} ${req.lastName || ''}`;
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.loginEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchesDepartment = departmentFilter === 'All' || req.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const activeCount = requests.filter((r) => r.status === "active").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full font-sans text-slate-800">
      {!showForm ? (
        <div className="space-y-4">
          {/* Header Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-slate-800 text-xs font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              {/* Status Filter Pill Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                {(['all', 'pending', 'active', 'rejected', 'archived'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all' ? 'All' : st}
                    {st === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
                  </button>
                ))}
              </div>

              {/* Department Dropdown Filter */}
              <div className="relative">
                <select 
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold pl-3 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none text-xs cursor-pointer transition-colors"
                >
                  <option value="All">All Departments</option>
                  <option value="Special Needs Education (SNED)">Special Needs Education (SNED)</option>
                  <option value="Elementary Education">Elementary Education</option>
                  <option value="Junior High School">Junior High School</option>
                  <option value="Senior High School">Senior High School</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <button 
                onClick={() => setShowForm(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-xs transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-slate-200 text-slate-500 font-medium text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
              <span>Loading registration applications...</span>
            </div>
          ) : sortedAndFilteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-400 font-medium text-xs">
              No account requests matching the criteria.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Applicant Name</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Department & Role</th>
                    <th className="px-4 py-3">Assigned Scope</th>
                    <th className="px-4 py-3">Date Filed</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {sortedAndFilteredRequests.map((req) => {
                    const displayName = req.fullName || `${req.firstName || ''} ${req.lastName || ''}`.trim() || 'Unnamed User';
                    const isPending = req.status === 'pending';
                    const isActive = req.status === 'active';
                    const isRejected = req.status === 'rejected';
                    const isArchived = req.status === 'archived';

                    return (
                      <tr 
                        key={req.id} 
                        onClick={() => setSelectedRequest(req)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{displayName}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{req.loginEmail || req.email}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">{req.employeeId || '—'}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">{req.facultyPosition || "Teacher"}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{req.department}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">{req.assignedGrade || '—'}</div>
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-[130px]">
                            {req.assignedSections?.join(', ') || 'No sections'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-[11px]">{req.submittedAt || 'N/A'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            isPending 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isArchived
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  disabled={processingId === req.id}
                                  onClick={(e) => openRejectDialog(req, e)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-semibold text-xs border border-rose-200 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  disabled={processingId === req.id}
                                  onClick={(e) => handleApprove(req, e)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs transition-colors"
                                >
                                  Approve
                                </button>
                              </>
                            )}

                            {isRejected && (
                              <button
                                disabled={processingId === req.id}
                                onClick={(e) => handleArchive(req, e)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1"
                              >
                                <Archive size={12} /> Archive
                              </button>
                            )}

                            {isActive && (
                              <button
                                disabled={processingId === req.id}
                                onClick={(e) => handleDeactivate(req, e)}
                                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md font-semibold text-xs border border-zinc-200 transition-colors flex items-center gap-1"
                              >
                                <UserMinus size={12} /> Deactivate
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md font-semibold text-xs border border-slate-200 transition-colors"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* COMPREHENSIVE REGISTRATION-ALIGNED ACCOUNT CREATION FORM */
        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button 
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to list
            </button>
            <h3 className="text-sm font-bold text-slate-900">Create System Account</h3>
            <div className="w-16" />
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Section 1: Personal Profile Particulars */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                1. Personal Profile Particulars
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Maria"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Middle Initial *</label>
                  <input
                    required
                    maxLength={1}
                    type="text"
                    placeholder="C"
                    value={formData.middleInitial}
                    onChange={(e) => setFormData({ ...formData, middleInitial: e.target.value.toUpperCase() })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 uppercase text-center font-bold"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Suffix (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Jr."
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Santos"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                  <div className="relative">
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer appearance-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Employment Scope & Authorization */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                2. Employment Scope & Authorization
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee / Personnel ID *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. EMP-2026-001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Position / Role *</label>
                  <div className="relative">
                    <select
                      value={formData.facultyPosition}
                      onChange={(e) => setFormData({ ...formData, facultyPosition: e.target.value })}
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer appearance-none"
                    >
                      <option value="Principal / School Head">Principal / School Head</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Teacher">Teacher</option>
                      <option value="SNED Teacher">SNED Teacher</option>
                      <option value="Guidance Counselor">Guidance Counselor</option>
                      <option value="School Administrator">School Administrator</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <div className="relative">
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer appearance-none"
                    >
                      <option value="Special Needs Education (SNED)">Special Needs Education (SNED)</option>
                      <option value="Elementary Education">Elementary Education</option>
                      <option value="Junior High School">Junior High School</option>
                      <option value="Senior High School">Senior High School</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Grade Level *</label>
                  <div className="relative">
                    <select
                      value={formData.assignedGrade}
                      onChange={(e) => setFormData({ ...formData, assignedGrade: e.target.value })}
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer appearance-none"
                    >
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Class Section(s) *</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Enter section name (e.g. Hope, Rizal)"
                      value={newSectionInput}
                      onChange={(e) => setNewSectionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSection(); } }}
                      className="flex-1 h-11 px-3.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Add Section
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {formData.assignedSections.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No class sections added yet.</span>
                    ) : (
                      formData.assignedSections.map((sec) => (
                        <span key={sec} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 font-bold text-[11px] rounded-lg border border-amber-200">
                          {sec}
                          <button type="button" onClick={() => handleRemoveSection(sec)} className="hover:text-rose-600 cursor-pointer">
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Security & Access Credentials */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                3. Security & Access Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. educator@handspeak.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number *</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. +63 912 345 6789"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password *</label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-600 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Create & Activate Account</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAILED APPLICANT AUDIT / REVIEW MODAL */}
      {selectedRequest && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-fadeIn">
            
            {/* Modal Top Bar */}
            <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedRequest.fullName || `${selectedRequest.firstName || ''} ${selectedRequest.lastName || ''}`}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  selectedRequest.status === 'pending' 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : selectedRequest.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : selectedRequest.status === 'rejected'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : selectedRequest.status === 'archived'
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                }`}>
                  {selectedRequest.status}
                </span>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
              
              {/* Left Column: All Registration Particulars */}
              <div className="md:col-span-6 space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                  Registration Particulars & History
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Email Address</span>
                    <span className="text-slate-800 font-medium break-all">{selectedRequest.email}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Contact Number</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.contactNumber || 'Not provided'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Gender</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.gender || 'Not specified'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Employee / Personnel ID</span>
                    <span className="font-mono text-slate-800 font-semibold">{selectedRequest.employeeId || '—'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Position / Role</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.facultyPosition || 'Teacher'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Assigned Grade</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.assignedGrade || '—'}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Department / Track</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.department}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Date Submitted</span>
                    <span className="text-slate-800 font-medium">{selectedRequest.submittedAt || 'N/A'}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Assigned Class Section(s)</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {selectedRequest.assignedSections && selectedRequest.assignedSections.length > 0 ? (
                        selectedRequest.assignedSections.map((sec) => (
                          <span key={sec} className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-semibold text-[10px]">
                            {sec}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </div>
                  </div>

                  {selectedRequest.approvedAt && (
                    <div>
                      <span className="text-[10px] text-emerald-600 block font-semibold uppercase">Approved Date</span>
                      <span className="text-slate-800 font-medium">{selectedRequest.approvedAt}</span>
                    </div>
                  )}

                  {selectedRequest.reviewedBy && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Reviewed By</span>
                      <span className="text-slate-800 font-medium">{selectedRequest.reviewedBy}</span>
                    </div>
                  )}
                </div>

                {selectedRequest.rejectionReason && (
                  <div className="mt-2 p-2.5 bg-rose-50 rounded-lg border border-rose-100 text-xs text-rose-800">
                    <span className="text-[10px] font-bold uppercase text-rose-600 block">Rejection Feedback</span>
                    <p className="italic">"{selectedRequest.rejectionReason}"</p>
                  </div>
                )}
              </div>

              {/* Right Column: Submitted Document Surface */}
              <div className="md:col-span-6 flex flex-col space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Official ID Document
                  </span>
                  {selectedRequest.idDocumentUrl && (
                    <button 
                      type="button" 
                      onClick={() => handleOpenDocument(selectedRequest.idDocumentUrl!)} 
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Full View</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="h-[340px] bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-center overflow-hidden p-2">
                  {selectedRequest.idDocumentUrl ? (
                    selectedRequest.idDocumentUrl.startsWith('data:application/pdf') ? (
                      <iframe 
                        src={selectedRequest.idDocumentUrl} 
                        className="w-full h-full rounded border-none bg-white" 
                        title="Document Preview" 
                      />
                    ) : (
                      <img 
                        src={selectedRequest.idDocumentUrl} 
                        alt="Submitted ID" 
                        onClick={() => handleOpenDocument(selectedRequest.idDocumentUrl!)}
                        className="max-h-full max-w-full object-contain rounded cursor-pointer hover:opacity-95 transition-opacity" 
                      />
                    )
                  ) : (
                    <div className="text-center p-4 text-slate-400 space-y-1">
                      <FileText className="h-6 w-6 mx-auto stroke-1" />
                      <p className="text-xs">No attachment provided</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button 
                      disabled={processingId === selectedRequest.id}
                      onClick={() => openRejectDialog(selectedRequest)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Reject Application
                    </button>
                    <button 
                      disabled={processingId === selectedRequest.id}
                      onClick={() => handleApprove(selectedRequest)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {processingId === selectedRequest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve & Authorize
                    </button>
                  </>
                )}

                {selectedRequest.status === 'rejected' && (
                  <button
                    disabled={processingId === selectedRequest.id}
                    onClick={() => handleArchive(selectedRequest)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Archive size={13} /> Move to Archive
                  </button>
                )}

                {selectedRequest.status === 'active' && (
                  <button
                    disabled={processingId === selectedRequest.id}
                    onClick={() => handleDeactivate(selectedRequest)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs border border-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserMinus size={13} /> Deactivate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT & FEEDBACK MODAL */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5 text-rose-700">
                <AlertCircle className="h-4 w-4" />
                <h3 className="text-sm font-bold text-slate-900">Application Rejection Feedback</h3>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Specify the reason for rejecting <strong>{selectedRequest.fullName || selectedRequest.email}</strong>'s filing. This will be recorded and communicated.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Common Feedback Templates</label>
              <div className="space-y-1">
                {feedbackTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPresetReason(template);
                      setRejectionReason(template);
                    }}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                      rejectionReason === template 
                        ? 'border-slate-400 bg-slate-100 font-semibold text-slate-900' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Comment</label>
              <textarea
                rows={3}
                placeholder="Additional instructions or explanation for the applicant..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={processingId === selectedRequest.id}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingId === selectedRequest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}