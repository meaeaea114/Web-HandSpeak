"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccountRequest } from "@/lib/rbac";
import {
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
} from "@/lib/auth-service";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  UserCheck,
} from "lucide-react";

export default function AdminAccountManagementPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    const data = await getAccountRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: AccountRequest) => {
    setActionLoading(true);
    try {
      await approveAccountRequest(req.id, user?.name || "System Administrator");
      setFeedback({
        type: "success",
        text: `Account request for ${req.fullName} approved. Confirmation email dispatched to ${req.email}.`,
      });
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to approve request." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      await rejectAccountRequest(selectedRequest.id, user?.name || "System Administrator", rejectionReason.trim());
      setFeedback({
        type: "success",
        text: `Account request for ${selectedRequest.fullName} was rejected with notification email queued.`,
      });
      setRejectionModalOpen(false);
      setRejectionReason("");
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to reject request." });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = statusFilter === "all" || req.status === statusFilter;
    const matchesSearch =
      (req.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.employeeId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.department || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Account Management</h1>
          <p className="text-sm text-slate-500">Review faculty registration requests, inspect submitted identification documents, and manage authorized scopes</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by applicant name, email, employee ID, department..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3B5C]/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="pending">Pending Review</option>
            <option value="active">Active / Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Records</option>
          </select>
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading account requests from Firestore...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No account registration requests found.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Faculty Applicant</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department & Level</th>
                <th className="py-3 px-4">Requested Sections</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{req.fullName}</p>
                    <p className="text-[11px] text-slate-500">{req.email}</p>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{req.employeeId}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{req.department}</p>
                    <p className="text-[11px] text-slate-500">{req.assignedGrade}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {req.assignedSections?.map((sec) => (
                        <span key={sec} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-medium text-[10px] rounded">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : req.status === "pending"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {req.status === "active" ? "Approved" : req.status === "pending" ? "Pending" : "Rejected"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRequest(req)}
                      className="text-xs h-7 px-2.5 border-slate-300"
                    >
                      View Details
                    </Button>

                    {req.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(req);
                            setRejectionModalOpen(true);
                          }}
                          disabled={actionLoading}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs h-7 px-2.5"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details & Document Modal */}
      {selectedRequest && !rejectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">Applicant Verification Profile</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicant Name</span>
                  <span className="font-bold text-slate-800">{selectedRequest.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee ID</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRequest.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Institutional Email</span>
                  <span className="font-medium text-slate-800">{selectedRequest.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Position</span>
                  <span className="font-medium text-slate-800">{selectedRequest.facultyPosition}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                  <span className="font-medium text-slate-800">{selectedRequest.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Grade Scope</span>
                  <span className="font-medium text-slate-800">{selectedRequest.assignedGrade}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Requested Sections</span>
                  <span className="font-medium text-slate-800">{selectedRequest.assignedSections?.join(", ") || "General Assignment"}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-700 block">Verification Documents</span>
                <div className="p-3 border rounded-xl flex items-center justify-between bg-white shadow-sm">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="font-medium truncate">{selectedRequest.idDocumentName}</span>
                  </div>
                  <a
                    href={selectedRequest.idDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-600 font-bold hover:underline ml-2 flex-shrink-0"
                  >
                    View Document <ExternalLink size={12} />
                  </a>
                </div>

                {selectedRequest.proofDocumentUrl && (
                  <div className="p-3 border rounded-xl flex items-center justify-between bg-white shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium truncate">{selectedRequest.proofDocumentName}</span>
                    </div>
                    <a
                      href={selectedRequest.proofDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline ml-2 flex-shrink-0"
                    >
                      View Document <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>Close</Button>
              {selectedRequest.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Approve Account
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documented Rejection Reason Modal */}
      {rejectionModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-800 text-base">Specify Rejection Reason</h3>
            <p className="text-xs text-slate-500">
              State why <strong>{selectedRequest.fullName}</strong> cannot be authorized. This reason will be recorded and emailed to the applicant.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="e.g. Unverified employee ID or illegible identification proof document."
                className="w-full p-3 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-rose-400"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectionModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {actionLoading ? "Submitting..." : "Confirm Rejection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}