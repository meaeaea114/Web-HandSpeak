'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Calendar, AlertCircle, Trash2, Send, X, Loader2, Users, Pencil, FileEdit, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePreferences } from '@/lib/preferences-context';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';
import {
  Announcement,
  AnnouncementInput,
  TeacherProfile,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  getAnnouncementsRealtime,
  getTeachers,
} from '@/lib/data-service';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const emptyForm = (): AnnouncementInput => ({
  title: '',
  content: '',
  priority: 'normal',
  targetType: 'all',
  targetUserIds: [],
});

export default function SystemAnnouncementsPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementInput>(emptyForm());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = getAnnouncementsRealtime(
      (items) => {
        setAnnouncements(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Failed to load announcements.');
        setLoading(false);
      }
    );

    getTeachers()
      .then((list) => setTeachers(list.filter((t) => t.status === 'active' || t.status === 'approved')))
      .catch(() => setTeachers([]));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
    setActionError(null);
  };

  const validateForm = (): string | null => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.content.trim()) return 'Content is required.';
    if (form.targetType === 'specific' && (!form.targetUserIds || form.targetUserIds.length === 0)) {
      return 'Select at least one faculty recipient, or choose "All Faculty".';
    }
    return null;
  };

  const handleStartEdit = (ann: Announcement) => {
    setForm({
      title: ann.title,
      content: ann.content,
      priority: (ann.priority as Priority) || 'normal',
      targetType: ann.targetType === 'specific' ? 'specific' : 'all',
      targetUserIds: ann.targetUserIds || [],
    });
    setEditingId(ann.id);
    setShowForm(true);
    setActionError(null);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, form);
        setSuccessMessage('Draft updated successfully.');
      } else {
        await createAnnouncement(form, user?.id || 'unknown', user?.fullName || user?.name || 'Administrator', false);
        setSuccessMessage('Announcement saved as draft.');
      }
      resetForm();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, form);
        const existing = announcements.find((a) => a.id === editingId);
        if (existing?.status !== 'published') {
          await publishAnnouncement(editingId, form, user?.fullName || user?.name || 'Administrator');
        }
        setSuccessMessage('Announcement published successfully.');
      } else {
        await createAnnouncement(form, user?.id || 'unknown', user?.fullName || user?.name || 'Administrator', true);
        setSuccessMessage('Announcement published and faculty notified.');
      }
      resetForm();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to publish announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishDraft = async (ann: Announcement) => {
    setActionError(null);
    try {
      await publishAnnouncement(ann.id, {
        title: ann.title,
        content: ann.content,
        priority: (ann.priority as Priority) || 'normal',
        targetType: ann.targetType === 'specific' ? 'specific' : 'all',
        targetUserIds: ann.targetUserIds || [],
      }, ann.author || user?.fullName || user?.name || 'Administrator');
      setSuccessMessage('Draft published and faculty notified.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to publish announcement.');
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    try {
      await deleteAnnouncement(id);
      setSuccessMessage('Announcement deleted.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete announcement.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const toggleTargetUser = (uid: string) => {
    setForm((prev) => {
      const current = prev.targetUserIds || [];
      const next = current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid];
      return { ...prev, targetUserIds: next };
    });
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '—';
    if (typeof ts?.seconds !== 'number' && !(ts instanceof Date)) return '—';
    return `${formatSystemDate(ts, preferences.dateFormat)} · ${formatSystemTime(ts, preferences.timeFormat)}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Utility Management Strip */}
      <div className="flex items-center justify-between bg-white/80 p-4 rounded-2xl border border-white/60 shadow-lg">
        <h2 className="text-sm font-black text-[#521903] uppercase tracking-wider flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Operational Broadcaster
        </h2>

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
            className="bg-[#1E75EC] hover:bg-[#1661CB] text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 border-b-4 border-[#1258C5] shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs"
          >
            + Create New Announcement
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ADMIN COMPOSER DIALOG CARD */}
      {showForm && (
        <form className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/80 space-y-5 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-[#521903] text-base">
              {editingId ? 'Edit Announcement' : 'New Announcement Details'}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {actionError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Announcement title"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Content *</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Announcement content"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 text-xs">Priority *</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-bold bg-white text-slate-700 text-sm cursor-pointer shadow-inner"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 text-xs">Recipients *</label>
              <select
                value={form.targetType}
                onChange={(e) => setForm((prev) => ({ ...prev, targetType: e.target.value as 'all' | 'specific' }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-bold bg-white text-slate-700 text-sm cursor-pointer shadow-inner"
              >
                <option value="all">All Faculty</option>
                <option value="specific">Specific Faculty Members</option>
              </select>
            </div>
          </div>

          {form.targetType === 'specific' && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 text-xs flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Select Faculty Recipients
              </label>
              {teachers.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold italic px-1">No active faculty accounts found.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {teachers.map((t) => (
                    <label key={t.uid} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form.targetUserIds || []).includes(t.uid)}
                        onChange={() => toggleTargetUser(t.uid)}
                        className="rounded border-slate-300 text-[#1E75EC] focus:ring-[#1E75EC]"
                      />
                      {t.fullName || t.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl border-b-4 border-slate-300 transition-all duration-100 active:translate-y-0.5 active:border-b-0 text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="bg-white hover:bg-slate-50 text-slate-700 font-black px-6 py-2.5 rounded-xl border border-slate-200 border-b-4 border-slate-300 flex items-center gap-2 shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileEdit className="h-3.5 w-3.5" />}
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black px-6 py-2.5 rounded-xl border-b-4 border-[#DC8C18] flex items-center gap-2 shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish Announcement
            </button>
          </div>
        </form>
      )}

      {/* ANNOUNCEMENTS LIST */}
      <div className="space-y-3">
        <p className="text-xs font-black text-[#521903] uppercase tracking-wider pl-1">All Announcements</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/70 rounded-2xl p-5 border border-white/60 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white/50 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">No announcements yet. Create one to notify your faculty.</p>
          </div>
        ) : (
          announcements.map((ann) => {
            const isDraft = ann.status === 'draft';
            const priority = (ann.priority as Priority) || 'normal';
            return (
              <div
                key={ann.id}
                className={`bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md transition-all ${
                  isDraft ? 'opacity-70 border-dashed' : ''
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertCircle className={`h-4 w-4 ${priority === 'high' || priority === 'urgent' ? 'text-[#9F4409]' : 'text-[#DC8C18]'}`} />
                    <h4 className="text-base font-black text-slate-800 tracking-tight">{ann.title}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      priority === 'high' || priority === 'urgent' ? 'bg-rose-50 text-[#9F4409] border-rose-100' : 'bg-amber-50 text-[#DC8C18] border-amber-100'
                    }`}>
                      {PRIORITY_LABELS[priority]}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      isDraft ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {isDraft ? 'Draft' : 'Published'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black border bg-blue-50 text-blue-600 border-blue-100">
                      {ann.targetType === 'specific' ? `${(ann.targetUserIds || []).length} Selected Faculty` : 'All Faculty'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-3xl">{ann.content}</p>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-4 flex-wrap">
                    <span>👤 {ann.author || 'Administrator'}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created: {formatTimestamp(ann.createdAt)}</span>
                    {!isDraft && <span>📣 Published: {formatTimestamp(ann.publishedAt)}</span>}
                  </div>
                </div>

                {/* Action Buttons Strip */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap justify-end">
                  {isDraft && (
                    <button
                      onClick={() => handlePublishDraft(ann)}
                      className="px-4 py-2 bg-[#5EC482] hover:bg-[#4EB171] text-white font-black text-xs rounded-xl border-b-4 border-[#45A367] active:translate-y-0.5 active:border-b-2 shadow-sm transition-all flex items-center gap-1"
                    >
                      <Send className="h-3.5 w-3.5" /> Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleStartEdit(ann)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black text-xs rounded-xl border-b-4 border-b-slate-300 active:translate-y-0.5 active:border-b-2 shadow-sm transition-all flex items-center gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  {confirmDeleteId === ann.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="px-3 py-2 bg-[#9F4409] hover:bg-[#521903] text-white font-black text-[10px] rounded-xl border-b-4 border-[#521903] active:translate-y-0.5 active:border-b-2 shadow-sm transition-all"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] rounded-xl border-b-4 border-slate-300 active:translate-y-0.5 active:border-b-2 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(ann.id)}
                      className="px-4 py-2 bg-[#9F4409] hover:bg-[#521903] text-white font-black text-xs rounded-xl border-b-4 border-[#521903] active:translate-y-0.5 active:border-b-2 shadow-sm transition-all flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}