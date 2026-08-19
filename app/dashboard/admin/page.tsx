'use client';

import { useState, useEffect } from 'react';
import { 
  Search, ChevronDown, UserPlus, ArrowLeft, 
  Loader2, FileText, X, ExternalLink, Calendar, Mail, IdCard, 
  Building2, BookOpen, MessageSquare, AlertCircle, CheckCircle2, Send, Check
} from 'lucide-react';
import { 
  getAccountRequests, 
  approveAccountRequest, 
  rejectAccountRequest,
  signUpUser 
} from '@/lib/auth-service';
import { AccountRequest } from '@/lib/rbac';

export default function AccountManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [presetReason, setPresetReason] = useState('');

  // Form State for manual account creation
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    department: 'Senior High School',
    role: 'teacher' as 'teacher' | 'student',
    password: '',
    confirmPassword: '',
  });
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

  // Open documents safely in a new browser tab
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

  // Handle Approval + Email Notification Dispatch
  const handleApprove = async (req: AccountRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setProcessingId(req.id);
      
      // 1. Update DB / RBAC status to active & grant role permissions
      await approveAccountRequest(req.id, "System Administrator");
      
      // 2. Automated Welcome Email Confirmation Notice
      const userRole = req.facultyPosition ? 'Teacher' : 'Student';
      const redirectDashboard = req.facultyPosition ? '/dashboard/teacher' : '/dashboard/student';

      alert(
        ` Account Approved!\n\n` +
        `An automated approval email was dispatched to: ${req.email}\n` +
        `RBAC Status: Granted access to ${userRole} Dashboard (${redirectDashboard})`
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
      
      alert(`Rejection email sent to ${selectedRequest.email} with comment:\n\n"${finalReason}"`);
      
      setShowRejectModal(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      alert("Error rejecting request: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setFormSubmitting(true);
    try {
      await signUpUser({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        department: formData.department,
        idNumber: formData.idNumber,
      });

      alert("Account created and activated successfully!");
      setShowForm(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        idNumber: '',
        department: 'Senior High School',
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

  // 1. Sort: PENDING first, then by submittedAt timestamp descending (newest at the top)
  // 2. Filter: Apply search and department/type filter
  const sortedAndFilteredRequests = [...requests]
    .sort((a, b) => {
      // Prioritize pending status to the top
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;

      // Newest dates first
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
        req.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === 'All Types' ||
        req.department?.toLowerCase() === filterType.toLowerCase() ||
        req.status?.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full font-sans text-slate-800">
      {!showForm ? (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 text-slate-800 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={() => setShowForm(true)}
                className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-bold px-4 py-2 rounded-xl flex items-center gap-2 text-xs transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
              
              <div className="relative">
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none bg-slate-50 text-slate-700 font-semibold pl-4 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none text-xs cursor-pointer"
                >
                  <option value="All Types">All Types</option>
                  <option value="Senior High School">Senior High School</option>
                  <option value="SNED">SNED</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Account Request Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 font-medium gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#DC8C18]" />
              Loading account requests...
            </div>
          ) : sortedAndFilteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium text-sm">
              No account requests found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sortedAndFilteredRequests.map((req) => {
                const displayName = req.fullName || `${req.firstName || ''} ${req.lastName || ''}`.trim() || 'Unnamed User';
                const isPending = req.status === 'pending';

                return (
                  <div 
                    key={req.id} 
                    onClick={() => setSelectedRequest(req)}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#F8B936] hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-bold text-slate-800 group-hover:text-[#521903] transition-colors">{displayName}</h2>
                        
                        {req.department && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {req.department}
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isPending 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : req.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {req.email}</span>
                        {req.employeeId && <span className="flex items-center gap-1"><IdCard className="h-3.5 w-3.5 text-slate-400" /> ID: {req.employeeId}</span>}
                        <span className="flex items-center gap-1 text-slate-400"><Calendar className="h-3.5 w-3.5" /> {req.submittedAt || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                      {isPending && (
                        <>
                          <button 
                            disabled={processingId === req.id}
                            onClick={(e) => openRejectDialog(req, e)}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Reject
                          </button>
                          <button 
                            disabled={processingId === req.id}
                            onClick={(e) => handleApprove(req, e)}
                            className="px-4 py-2 rounded-xl bg-[#5EC482] hover:bg-[#4EB171] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          >
                            {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ACCOUNT CREATION FORM */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <button 
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h3 className="text-base font-bold text-slate-800">Create New Account</h3>
            <div className="w-12" />
          </div>

          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Full Name *</label>
              <input required type="text" placeholder="John Doe" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Email Address *</label>
              <input required type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">ID Code *</label>
              <input required type="text" placeholder="EMP-2026-001" value={formData.idNumber} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Account Role *</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'teacher' | 'student' })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50">
                <option value="teacher">Teacher (Access: /dashboard/teacher)</option>
                <option value="student">Student (Access: /dashboard/student)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Password *</label>
              <input required type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Confirm Password *</label>
              <input required type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 text-xs">Cancel</button>
              <button type="submit" disabled={formSubmitting} className="px-5 py-2.5 rounded-xl bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-bold text-xs flex items-center gap-2">
                {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create & Activate Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAILED INSPECTION MODAL */}
      {selectedRequest && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedRequest.fullName || `${selectedRequest.firstName || ''} ${selectedRequest.lastName || ''}`}
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  selectedRequest.status === 'pending' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : selectedRequest.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {selectedRequest.status.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-y-auto">
              <div className="lg:col-span-5 p-6 space-y-5 bg-slate-50/30">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Applicant Information</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> Email</span>
                      <span className="font-semibold text-slate-800 select-all">{selectedRequest.email}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 font-medium flex items-center gap-2"><IdCard className="h-3.5 w-3.5 text-slate-400" /> Employee/ID</span>
                      <span className="font-semibold text-slate-800">{selectedRequest.employeeId || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 font-medium flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-slate-400" /> Department/Track</span>
                      <span className="font-semibold text-slate-800">{selectedRequest.department || 'N/A'}</span>
                    </div>
                    {selectedRequest.facultyPosition && (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-500 font-medium flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-slate-400" /> Position</span>
                        <span className="font-semibold text-slate-800">{selectedRequest.facultyPosition}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 font-medium flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Submitted</span>
                      <span className="font-semibold text-slate-800">{selectedRequest.submittedAt || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {selectedRequest.rejectionReason && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                    <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Rejection Feedback
                    </span>
                    <p className="text-xs text-rose-700 italic">"{selectedRequest.rejectionReason}"</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 p-6 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Identification Documents</h4>
                  {selectedRequest.idDocumentUrl && (
                    <button 
                      type="button"
                      onClick={() => handleOpenDocument(selectedRequest.idDocumentUrl!)} 
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Open Full Size <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-center min-h-[300px] overflow-hidden p-2">
                  {selectedRequest.idDocumentUrl ? (
                    selectedRequest.idDocumentUrl.startsWith('data:application/pdf') ? (
                      <iframe src={selectedRequest.idDocumentUrl} className="w-full h-full min-h-[350px] rounded-lg bg-white" title="Document Preview" />
                    ) : (
                      <img 
                        src={selectedRequest.idDocumentUrl} 
                        alt="Submitted ID" 
                        onClick={() => handleOpenDocument(selectedRequest.idDocumentUrl!)}
                        className="max-h-[380px] w-auto object-contain rounded-lg shadow-xs cursor-pointer hover:opacity-95 transition-opacity" 
                      />
                    )
                  ) : (
                    <div className="text-center p-6 text-slate-400 space-y-1">
                      <FileText className="h-8 w-8 mx-auto stroke-1" />
                      <p className="text-xs font-medium">No document was uploaded with this request.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={() => setSelectedRequest(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer">
                Close
              </button>

              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    disabled={processingId === selectedRequest.id}
                    onClick={() => openRejectDialog(selectedRequest)}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Reject / Request Correction
                  </button>
                  <button 
                    disabled={processingId === selectedRequest.id}
                    onClick={() => handleApprove(selectedRequest)}
                    className="px-5 py-2 rounded-xl bg-[#5EC482] hover:bg-[#4EB171] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Send Welcome Email
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT & EMAIL COMMENT MODAL */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-800">Application Correction / Rejection</h3>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide feedback detailing why <strong>{selectedRequest.fullName || selectedRequest.email}</strong>'s application cannot be approved. This comment will be automatically emailed to them.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Select Common Issues</label>
              <div className="space-y-1.5">
                {feedbackTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPresetReason(template);
                      setRejectionReason(template);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      rejectionReason === template 
                        ? 'border-[#DC8C18] bg-amber-50/50 font-bold text-[#521903]' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Detailed Email Comment</label>
              <textarea
                rows={3}
                placeholder="Type additional details or custom instructions for the applicant..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F8B936]/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={processingId === selectedRequest.id}
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingId === selectedRequest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send Rejection Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}