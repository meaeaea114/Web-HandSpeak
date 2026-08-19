'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Eye, 
  MoreVertical,
  Shield,
  Trash2,
  AlertCircle,
  RefreshCw,
  Mail,
  Building,
  IdCard,
  FileText
} from 'lucide-react';

interface AccountRequest {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  role: 'teacher' | 'admin' | 'student';
  department?: string;
  idNumber?: string;
  reason?: string;
  schoolId?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt?: any;
  createdAt?: string;
}

interface ActiveUser {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  fullName?: string;
  role: string;
  department?: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt?: string;
}

export default function AccountManagementPage() {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'users'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Realtime subscription to Firebase Firestore
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch account requests
    const qRequests = query(collection(db, 'accountRequests'));
    const unsubscribeRequests = onSnapshot(
      qRequests,
      (snapshot) => {
        const reqList: AccountRequest[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid || docSnap.id,
            email: data.email || '',
            fullName: data.fullName || data.displayName || 'Unknown Name',
            role: data.role || 'teacher',
            department: data.department || '',
            idNumber: data.idNumber || '',
            reason: data.reason || '',
            schoolId: data.schoolId || '',
            status: data.status || 'pending',
            submittedAt: data.submittedAt,
            createdAt: data.createdAt || new Date().toISOString(),
          };
        });
        setRequests(reqList);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore subscription error (requests):', err);
        setError('Failed to fetch real-time account requests from Firebase.');
        setLoading(false);
      }
    );

    // Fetch active users
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const userList: ActiveUser[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: docSnap.id,
            email: data.email || '',
            displayName: data.displayName || data.fullName || '',
            role: data.role || 'student',
            department: data.department || '',
            status: data.status || 'active',
            createdAt: data.createdAt || '',
          };
        });
        setActiveUsers(userList);
      },
      (err) => {
        console.error('Firestore subscription error (users):', err);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeUsers();
    };
  }, []);

  // Handle Approve Request
  const handleApprove = async (request: AccountRequest) => {
    setActionLoading(request.id);
    try {
      // 1. Update Request status in accountRequests
      const reqRef = doc(db, 'accountRequests', request.id);
      await updateDoc(reqRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });

      // 2. Create or activate user in users collection
      const userRef = doc(db, 'users', request.uid || request.id);
      await setDoc(userRef, {
        uid: request.uid || request.id,
        email: request.email,
        displayName: request.fullName,
        fullName: request.fullName,
        role: request.role,
        department: request.department || '',
        status: 'active',
        createdAt: request.createdAt || new Date().toISOString(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (selectedRequest?.id === request.id) {
        setIsViewModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert('Failed to approve request: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Request
  const handleReject = async (request: AccountRequest) => {
    setActionLoading(request.id);
    try {
      const reqRef = doc(db, 'accountRequests', request.id);
      await updateDoc(reqRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });

      if (selectedRequest?.id === request.id) {
        setIsViewModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete Request
  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request record?')) return;
    setActionLoading(requestId);
    try {
      await deleteDoc(doc(db, 'accountRequests', requestId));
      if (selectedRequest?.id === requestId) {
        setIsViewModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error deleting request:', err);
      alert('Failed to delete record: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter Logic
  const filteredRequests = requests.filter((req) => {
    const matchesTab = 
      activeTab === 'pending' ? req.status === 'pending' : true;
    const matchesRole = roleFilter === 'all' || req.role === roleFilter;
    const matchesSearch = 
      req.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.department && req.department.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesRole && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Management</h1>
          <p className="text-sm text-muted-foreground">
            Review registration requests and manage user access across HandSpeak.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pending Requests</p>
            <h3 className="text-xl font-bold">{pendingCount}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Approved Requests</p>
            <h3 className="text-xl font-bold">{approvedCount}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Rejected Requests</p>
            <h3 className="text-xl font-bold">{rejectedCount}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-primary/10 text-primary rounded-full">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Active Users</p>
            <h3 className="text-xl font-bold">{activeUsers.length}</h3>
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Selection */}
          <div className="flex border-b border-border sm:border-0 pb-2 sm:pb-0 gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'pending'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              All Requests ({requests.length})
            </button>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, email, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-auto px-2 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Requests Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs font-medium">Connecting to Firebase...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-md">
            <UserCheck className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No account requests found</p>
            <p className="text-xs">There are no registration requests matching your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Requested Role</th>
                  <th className="p-3">Department / ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-semibold text-foreground">{req.fullName}</p>
                        <p className="text-muted-foreground text-[11px]">{req.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
                        {req.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="text-foreground">{req.department || 'N/A'}</p>
                      {req.idNumber && <p className="text-muted-foreground text-[10px]">ID: {req.idNumber}</p>}
                    </td>
                    <td className="p-3">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-medium">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-medium">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {req.status === 'pending' && (
                          <>
                            <button
                              disabled={actionLoading === req.id}
                              onClick={() => handleApprove(req)}
                              className="p-1.5 hover:bg-emerald-500/10 rounded-md text-emerald-500 transition-colors disabled:opacity-50"
                              title="Approve Request"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            <button
                              disabled={actionLoading === req.id}
                              onClick={() => handleReject(req)}
                              className="p-1.5 hover:bg-rose-500/10 rounded-md text-rose-500 transition-colors disabled:opacity-50"
                              title="Reject Request"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          disabled={actionLoading === req.id}
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive transition-colors disabled:opacity-50"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Request Details Modal */}
      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold">Account Access Request</h3>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Applicant Name & Email</p>
                  <p className="font-semibold">{selectedRequest.fullName} ({selectedRequest.email})</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Department / Role</p>
                  <p className="font-semibold capitalize">{selectedRequest.role} - {selectedRequest.department || 'N/A'}</p>
                </div>
              </div>

              {selectedRequest.idNumber && (
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">ID Number</p>
                    <p className="font-semibold">{selectedRequest.idNumber}</p>
                  </div>
                </div>
              )}

              {selectedRequest.reason && (
                <div className="flex items-start gap-2 pt-2 border-t border-border">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Request Reason / Remarks</p>
                    <p className="mt-1 p-2 bg-muted rounded-md text-foreground">{selectedRequest.reason}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    disabled={actionLoading === selectedRequest.id}
                    onClick={() => handleReject(selectedRequest)}
                    className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-medium rounded-md transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    disabled={actionLoading === selectedRequest.id}
                    onClick={() => handleApprove(selectedRequest)}
                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium rounded-md transition-colors"
                  >
                    Approve Account
                  </button>
                </>
              )}
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-3 py-1.5 border border-border hover:bg-muted text-xs font-medium rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}