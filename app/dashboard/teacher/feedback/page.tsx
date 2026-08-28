'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  X,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePreferences } from '@/lib/preferences-context';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';
import {
  FeedbackItem,
  getMyFeedbackRealtime,
  submitFeedback,
  addFeedbackFollowUp,
} from '@/lib/data-service';

type Category = FeedbackItem['category'];
type Status = FeedbackItem['status'];

const CATEGORY_LABELS: Record<Category, string> = {
  general: 'General Feedback',
  bug: 'Bug Report',
  feature: 'Feature Request',
  support: 'Support Request',
};

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

export default function TeacherFeedbackPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();

  const [tickets, setTickets] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const unsubscribe = getMyFeedbackRealtime(
      user.id,
      (items) => {
        setTickets(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Failed to load your feedback requests.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
    [tickets]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFormError('Please provide both a subject and a message.');
      return;
    }
    if (!user?.id) {
      setFormError('You must be signed in to submit feedback.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await submitFeedback({
        submittedByUid: user.id,
        submittedByName: user.fullName || user.name || 'Faculty Member',
        submittedByRole: user.role || 'teacher',
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
      setCategory('general');
      setShowForm(false);
      setSuccessMessage('Your request has been submitted.');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFollowUp = async (ticketId: string) => {
    if (!followUpMessage.trim() || !user?.id) return;
    setSendingFollowUp(true);
    try {
      await addFeedbackFollowUp(ticketId, {
        senderUid: user.id,
        senderName: user.fullName || user.name || 'Faculty Member',
        senderRole: user.role || 'teacher',
        message: followUpMessage.trim(),
      });
      setFollowUpMessage('');
    } catch (err) {
      console.error('Failed to send follow-up message:', err);
    } finally {
      setSendingFollowUp(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '—';
    if (typeof ts?.seconds !== 'number' && !(ts instanceof Date)) return '—';
    return `${formatSystemDate(ts, preferences.dateFormat)} · ${formatSystemTime(ts, preferences.timeFormat)}`;
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 font-sans antialiased text-[#521903] overflow-y-auto pr-1">

      {/* HEADER STRIP */}
      <div className="flex items-center justify-between bg-white/80 p-4 rounded-2xl border border-white/60 shadow-lg flex-shrink-0">
        <h2 className="text-sm font-black text-[#521903] uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> My Feedback & Support Requests
        </h2>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black px-5 py-2.5 rounded-xl flex items-center gap-2 border-b-4 border-[#DC8C18] shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> New Request
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 flex-shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* SUBMISSION FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-5 shadow-sm animate-fadeIn flex-shrink-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-[#521903] text-base">Submit New Request</h3>
            <button type="button" onClick={() => { setShowForm(false); setFormError(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your request"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-bold bg-white text-slate-700 text-sm cursor-pointer shadow-inner"
            >
              <option value="general">General Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="support">Support Request</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Message *</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback or issue in detail..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              disabled={submitting}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl border-b-4 border-slate-300 transition-all duration-100 active:translate-y-0.5 active:border-b-0 text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black px-6 py-2.5 rounded-xl border-b-4 border-[#DC8C18] flex items-center gap-2 shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Request
            </button>
          </div>
        </form>
      )}

      {/* TICKETS LIST */}
      <div className="space-y-3 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse h-20" />
            ))}
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white/50 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">You haven't submitted any feedback or support requests yet.</p>
          </div>
        ) : (
          sortedTickets.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            const canReply = ticket.status !== 'closed';
            const latestAdminReply = [...(ticket.thread || [])].reverse().find((m) => m.senderUid !== user?.id);

            return (
              <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-5 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">{ticket.subject}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black border bg-slate-50 border-slate-200 text-slate-600">
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${STATUS_STYLES[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                      <Calendar className="h-3 w-3" /> Submitted: {formatTimestamp(ticket.createdAt)}
                    </div>
                    {!isExpanded && latestAdminReply && (
                      <p className="text-xs text-slate-500 font-medium italic line-clamp-1">
                        Admin: "{latestAdminReply.message}"
                      </p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
                    {(ticket.thread || []).map((msg, idx) => {
                      const isMine = msg.senderUid === user?.id;
                      return (
                        <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl p-3 text-xs font-medium leading-relaxed ${
                            isMine ? 'bg-[#F8B936]/15 text-[#521903]' : 'bg-slate-50 text-slate-700 border border-slate-100'
                          }`}>
                            <p className="font-black text-[10px] uppercase tracking-wide mb-1 opacity-70">
                              {isMine ? 'You' : msg.senderName}
                            </p>
                            <p>{msg.message}</p>
                            <p className="text-[9px] opacity-50 mt-1">{formatTimestamp(msg.timestamp)}</p>
                          </div>
                        </div>
                      );
                    })}

                    {canReply ? (
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={followUpMessage}
                          onChange={(e) => setFollowUpMessage(e.target.value)}
                          placeholder="Add a follow-up message..."
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-xs bg-white shadow-inner"
                        />
                        <button
                          onClick={() => handleSendFollowUp(ticket.id)}
                          disabled={sendingFollowUp || !followUpMessage.trim()}
                          className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] p-3 rounded-xl border-b-4 border-[#DC8C18] shadow-md transition-all duration-100 active:translate-y-0.5 active:border-b-0 disabled:opacity-50"
                        >
                          {sendingFollowUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 pt-2 italic">This request has been closed.</p>
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