'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Send,
  Reply,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePreferences } from '@/lib/preferences-context';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';
import {
  FeedbackItem,
  getAllFeedbackRealtime,
  replyToFeedback,
  updateFeedbackStatus,
} from '@/lib/data-service';

type Status = FeedbackItem['status'];
type FilterStatus = 'All' | Status;

const STATUS_STYLES: Record<Status, string> = {
  pending: 'bg-amber-50 text-[#DC8C18] border-amber-200',
  in_review: 'bg-blue-50 text-blue-600 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABELS: Record<Status, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CATEGORY_LABELS: Record<FeedbackItem['category'], string> = {
  general: 'General Feedback',
  bug: 'Bug Report',
  feature: 'Feature Request',
  support: 'Support Request',
};

export default function FeedbackSupportPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = getAllFeedbackRealtime(
      (items) => {
        setFeedbacks(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Failed to load feedback requests.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        item.submittedByName?.toLowerCase().includes(term) ||
        item.subject?.toLowerCase().includes(term) ||
        (item.thread || []).some((m) => m.message.toLowerCase().includes(term));
      const matchesFilter = filterStatus === 'All' ? true : item.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [feedbacks, searchTerm, filterStatus]);

  const handleSendReply = async (ticket: FeedbackItem) => {
    if (!replyMessage.trim() || !user?.id) return;
    setSending(true);
    setActionError(null);
    try {
      const nextStatus: Status = ticket.status === 'pending' ? 'in_review' : ticket.status;
      await replyToFeedback(
        ticket.id,
        {
          senderUid: user.id,
          senderName: user.fullName || user.name || 'Administrator',
          senderRole: user.role || 'admin',
          message: replyMessage.trim(),
        },
        nextStatus,
        ticket.submittedByUid,
        ticket.subject
      );
      setReplyMessage('');
      setReplyingToId(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticket: FeedbackItem, newStatus: Status) => {
    if (newStatus === ticket.status) return;
    setUpdatingStatusId(ticket.id);
    setActionError(null);
    try {
      await updateFeedbackStatus(ticket.id, newStatus, ticket.submittedByUid, ticket.subject);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update status. Please try again.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '—';
    if (typeof ts?.seconds !== 'number' && !(ts instanceof Date)) return '—';
    return `${formatSystemDate(ts, preferences.dateFormat)} · ${formatSystemTime(ts, preferences.timeFormat)}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Filtering and Search Tools Utility Strip */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-white/80 p-4 rounded-2xl border border-white/60 shadow-lg">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search feedback tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white text-slate-800 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] text-sm shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="appearance-none bg-white text-[#521903] font-bold pl-5 pr-10 py-2.5 rounded-xl border border-slate-200 border-b-4 border-b-slate-300 focus:outline-none text-sm shadow-md cursor-pointer"
            >
              <option value="All">All Tickets</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#521903] pointer-events-none" />
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tickets List View */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/70 rounded-2xl p-6 border border-white/50 shadow-sm animate-pulse h-28" />
            ))}
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white/50 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl">
            <p className="font-bold text-sm">No feedback requests match your selected filters.</p>
          </div>
        ) : (
          filteredFeedbacks.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            return (
              <div
                key={ticket.id}
                className="backdrop-blur-sm rounded-2xl border transition-all duration-300 shadow-md hover:shadow-[0_20px_35px_rgba(82,25,3,0.12)] bg-white/90 border-white/90"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  className="w-full text-left p-6 flex flex-col md:flex-row justify-between items-start gap-4"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-black text-[#521903] tracking-tight">{ticket.submittedByName}</h2>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border bg-slate-50 border-slate-200 text-slate-600 capitalize">
                        {ticket.submittedByRole}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border bg-indigo-50 border-indigo-100 text-indigo-600">
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border ${STATUS_STYLES[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </div>

                    <p className="text-slate-800 text-sm font-black">{ticket.subject}</p>
                    <p className="text-slate-600 text-xs leading-relaxed font-medium line-clamp-2">
                      {ticket.thread?.[0]?.message}
                    </p>

                    <div className="flex items-center gap-1 text-slate-400 font-semibold text-[11px] pt-1">
                      <Calendar className="h-3 w-3" /> Received: {formatTimestamp(ticket.createdAt)}
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                    {/* Conversation Thread */}
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {(ticket.thread || []).map((msg, idx) => {
                        const isAdmin = msg.senderRole === 'admin';
                        return (
                          <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-xl p-3 text-xs font-medium leading-relaxed ${
                              isAdmin ? 'bg-[#F8B936]/15 text-[#521903]' : 'bg-slate-50 text-slate-700 border border-slate-100'
                            }`}>
                              <p className="font-black text-[10px] uppercase tracking-wide mb-1 opacity-70">
                                {isAdmin ? `${msg.senderName} (Admin)` : msg.senderName}
                              </p>
                              <p>{msg.message}</p>
                              <p className="text-[9px] opacity-50 mt-1">{formatTimestamp(msg.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Status + Reply Tools */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Update Status:</label>
                      <div className="relative">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket, e.target.value as Status)}
                          disabled={updatingStatusId === ticket.id}
                          className="appearance-none bg-white text-[#521903] font-bold pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 focus:outline-none text-xs shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_review">In Review</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        {updatingStatusId === ticket.id && (
                          <Loader2 className="h-3 w-3 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        )}
                      </div>

                      {ticket.status !== 'closed' && (
                        <button
                          onClick={() => setReplyingToId(replyingToId === ticket.id ? null : ticket.id)}
                          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg border-b-2 border-b-slate-300 hover:bg-slate-50 hover:text-[#521903] active:translate-y-px active:border-b active:border-b-slate-300 text-xs shadow-sm transition-all"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Reply
                        </button>
                      )}

                      {ticket.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(ticket, 'resolved')}
                          disabled={updatingStatusId === ticket.id}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5EC482] hover:bg-[#4EB171] text-white font-black rounded-lg border-b-2 border-[#45A367] active:translate-y-px active:border-b text-xs shadow-sm transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Quick Resolve
                        </button>
                      )}
                    </div>

                    {/* Expandable Response Message Composer */}
                    {replyingToId === ticket.id && (
                      <div className="pt-2 space-y-3 animate-fadeIn">
                        <label className="text-xs font-black text-[#521903] uppercase tracking-wider block">Compose Response</label>
                        <div className="flex gap-3">
                          <textarea
                            rows={3}
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type official troubleshooting message or status update here..."
                            className="flex-1 p-3 bg-slate-50 text-slate-800 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] shadow-inner resize-none"
                          />
                          <button
                            onClick={() => handleSendReply(ticket)}
                            disabled={sending || !replyMessage.trim()}
                            className="self-end bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] p-3.5 rounded-xl border-b-4 border-[#DC8C18] shadow-md transition-all duration-100 active:translate-y-0.75 active:border-b-0 disabled:opacity-50"
                          >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}