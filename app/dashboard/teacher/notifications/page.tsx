'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Megaphone,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePreferences } from '@/lib/preferences-context';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';
import {
  NotificationItem,
  getNotificationsRealtime,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/data-service';
import { getMyContentSubmissionsRealtime, ContentSubmission } from '@/lib/content-service';

type FilterType = 'ALL' | 'announcement' | 'feedback' | 'approval' | 'rejection';

const FILTER_LABELS: Record<FilterType, string> = {
  ALL: 'All Updates',
  announcement: 'System Announcements',
  feedback: 'Feedback & Support',
  approval: 'Approved Content',
  rejection: 'Rejections / Revisions',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { preferences } = usePreferences();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const unsubscribeNotifs = getNotificationsRealtime(
      user.id,
      (items) => {
        setNotifications(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Failed to load notifications.');
        setLoading(false);
      }
    );

    const unsubscribeSubs = getMyContentSubmissionsRealtime(
      user.id,
      (subs) => {
        setSubmissions(subs);
      }
    );

    return () => {
      unsubscribeNotifs();
      unsubscribeSubs();
    };
  }, [user?.id]);

  // Merge direct notifications with submission approvals/rejections
  const allMergedNotifications = useMemo(() => {
    const list = [...notifications];

    submissions.forEach((sub) => {
      if (sub.status === 'approved' || sub.status === 'rejected') {
        const syntheticId = `sub-notif-${sub.id}-${sub.status}`;
        const alreadyExists = list.some(
          (n) =>
            n.id === syntheticId ||
            (n.metadata && n.metadata.submissionId === sub.id && n.type === (sub.status === 'approved' ? 'approval' : 'rejection'))
        );

        if (!alreadyExists) {
          list.push({
            id: syntheticId,
            userId: user?.id || '',
            title: sub.status === 'approved' ? 'Activity Question Approved 🎉' : 'Activity Needs Revision ⚠️',
            message:
              sub.status === 'approved'
                ? `Your question "${sub.questionText || 'Activity'}" (${sub.category.toUpperCase()}) was approved and is now live in the mobile app.`
                : `Your question "${sub.questionText || 'Activity'}" was rejected with feedback: "${sub.rejectionReason || 'Please review choices and prompt.'}".`,
            type: sub.status === 'approved' ? 'approval' : 'rejection',
            isRead: false,
            metadata: { submissionId: sub.id },
            createdAt: sub.reviewedAt || sub.updatedAt || sub.submittedAt || new Date(),
          });
        }
      }
    });

    return list.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime() || 0;
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [notifications, submissions, user?.id]);

  const mutedTypes = useMemo(() => {
    const muted: FilterType[] = [];
    if (preferences.notifyAnnouncements === false) muted.push('announcement');
    if (preferences.notifyFeedbackUpdates === false) muted.push('feedback');
    return muted;
  }, [preferences.notifyAnnouncements, preferences.notifyFeedbackUpdates]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'ALL') return allMergedNotifications.filter((n) => !mutedTypes.includes(n.type as FilterType));
    return allMergedNotifications.filter((n) => n.type === filter);
  }, [filter, allMergedNotifications, mutedTypes]);

  const unreadCount = useMemo(
    () => allMergedNotifications.filter((n) => !n.isRead && !mutedTypes.includes(n.type as FilterType)).length,
    [allMergedNotifications, mutedTypes]
  );

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      if (id.startsWith('sub-notif-')) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        return;
      }
      await markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Click on notification to navigate directly to the target submission/feedback
  const handleNotificationClick = async (notif: NotificationItem) => {
    handleMarkAsRead(notif.id, notif.isRead);

    if (notif.type === 'approval' || notif.type === 'rejection') {
      const subId =
        notif.metadata?.submissionId ||
        (notif.id.startsWith('sub-notif-') ? notif.id.split('-')[2] : '');

      const statusParam = notif.type === 'approval' ? 'approved' : 'rejected';

      if (subId) {
        router.push(`/dashboard/teacher/content?tab=submissions&status=${statusParam}&submissionId=${subId}`);
      } else {
        router.push(`/dashboard/teacher/content?tab=submissions&status=${statusParam}`);
      }
    } else if (notif.type === 'feedback') {
      router.push('/dashboard/teacher/feedback');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead(user.id);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    if (typeof ts?.seconds === 'number') {
      const d = new Date(ts.seconds * 1000);
      return `${formatSystemDate(d, preferences.dateFormat)} · ${formatSystemTime(d, preferences.timeFormat)}`;
    }
    if (ts instanceof Date) {
      return `${formatSystemDate(ts, preferences.dateFormat)} · ${formatSystemTime(ts, preferences.timeFormat)}`;
    }
    return 'Recently';
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return (
          <div className="p-2.5 rounded-2xl border flex-shrink-0 bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case 'rejection':
        return (
          <div className="p-2.5 rounded-2xl border flex-shrink-0 bg-rose-500/10 border-rose-500/20 text-rose-600">
            <XCircle className="h-4 w-4" />
          </div>
        );
      case 'announcement':
        return (
          <div className="p-2.5 rounded-2xl border flex-shrink-0 bg-amber-500/10 border-amber-500/20 text-amber-600">
            <Megaphone className="h-4 w-4" />
          </div>
        );
      case 'feedback':
      default:
        return (
          <div className="p-2.5 rounded-2xl border flex-shrink-0 bg-blue-500/10 border-blue-500/20 text-blue-600">
            <MessageSquare className="h-4 w-4" />
          </div>
        );
    }
  };

  const renderNotificationBadge = (type: string) => {
    switch (type) {
      case 'approval':
        return (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
            Content Approved
          </span>
        );
      case 'rejection':
        return (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
            Needs Revision
          </span>
        );
      case 'announcement':
        return (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
            Announcement
          </span>
        );
      case 'feedback':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
            Feedback Update
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-start items-stretch gap-4 font-sans antialiased text-[#521903] overflow-hidden">
      {/* FILTER TABS CHIP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 select-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'announcement', 'feedback', 'approval', 'rejection'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                filter === tab
                  ? 'bg-[#521903] border-[#521903] text-white shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm border-white/50 text-[#521903]/70 hover:bg-white'
              }`}
            >
              {FILTER_LABELS[tab]}
            </button>
          ))}
        </div>

        {filter === 'ALL' && mutedTypes.length > 0 && (
          <span className="text-[10px] font-semibold text-[#521903]/50 uppercase tracking-wider hidden sm:inline">
            {mutedTypes.map((m) => FILTER_LABELS[m]).join(' & ')} muted
          </span>
        )}

        <button
          onClick={handleMarkAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full border border-white/50 bg-white/80 hover:bg-white text-[11px] font-bold uppercase tracking-wider text-[#521903]/80 transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {markingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          )}
          Mark All As Read {unreadCount > 0 ? `(${unreadCount})` : ''}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* NOTIFICATIONS PANEL */}
      <div className="w-full flex-1 bg-white/70 backdrop-blur-md rounded-[24px] border border-white/50 p-5 flex flex-col gap-4 overflow-hidden shadow-[4px_4px_16px_rgba(82,25,3,0.02)]">
        <div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="w-full flex-1 flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#521903]/40" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center text-center p-12 text-[#521903]/40 space-y-2">
              <Bell className="h-8 w-8 stroke-[1.5] opacity-50" />
              <span className="text-xs font-bold tracking-wide">You&apos;re all caught up — no notifications here.</span>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isActionable = notif.type === 'approval' || notif.type === 'rejection' || notif.type === 'feedback';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex gap-4 items-start relative group cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                    notif.isRead
                      ? 'bg-white/40 border-white/60 text-[#521903]/80 hover:bg-white/70'
                      : notif.type === 'rejection'
                      ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-50 shadow-sm'
                      : notif.type === 'approval'
                      ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50 shadow-sm'
                      : 'bg-white border-amber-200/70 shadow-sm shadow-amber-700/[0.02]'
                  }`}
                >
                  {/* Notification Icon */}
                  {renderNotificationIcon(notif.type)}

                  {/* Content */}
                  <div className="flex-1 space-y-1.5 pr-8">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[13px] font-black tracking-tight text-[#521903]">{notif.title}</h4>
                      {renderNotificationBadge(notif.type)}
                    </div>

                    <p className="text-xs font-medium text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono select-none">
                        <Calendar className="h-3 w-3" /> {formatTimestamp(notif.createdAt)}
                      </span>

                      {isActionable && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#521903] group-hover:text-[#F2B33D] transition-colors">
                          {notif.type === 'rejection'
                            ? 'Edit Submission'
                            : notif.type === 'approval'
                            ? 'View in Content'
                            : 'View Feedback'}
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 absolute right-4 top-5 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}