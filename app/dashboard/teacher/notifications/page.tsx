'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Megaphone, MessageSquare, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePreferences } from '@/lib/preferences-context';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';
import {
  NotificationItem,
  getNotificationsRealtime,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/data-service';

type FilterType = 'ALL' | 'announcement' | 'feedback';

const FILTER_LABELS: Record<FilterType, string> = {
  ALL: 'All Updates',
  announcement: 'System Announcements',
  feedback: 'Feedback & Support',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const unsubscribe = getNotificationsRealtime(
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

    return () => unsubscribe();
  }, [user?.id]);

  // Notification preferences (System Preferences → Notification Preferences) are
  // real, persisted per-user settings. Muting a category hides it from the "All
  // Updates" view and excludes it from the unread badge, while remaining
  // reviewable under its own tab.
  const mutedTypes = useMemo(() => {
    const muted: FilterType[] = [];
    if (preferences.notifyAnnouncements === false) muted.push('announcement');
    if (preferences.notifyFeedbackUpdates === false) muted.push('feedback');
    return muted;
  }, [preferences.notifyAnnouncements, preferences.notifyFeedbackUpdates]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'ALL') return notifications.filter((n) => !mutedTypes.includes(n.type));
    return notifications.filter((n) => n.type === filter);
  }, [filter, notifications, mutedTypes]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead && !mutedTypes.includes(n.type)).length,
    [notifications, mutedTypes]
  );

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
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
    if (typeof ts?.seconds !== 'number' && !(ts instanceof Date)) return 'Just now';
    return `${formatSystemDate(ts, preferences.dateFormat)} · ${formatSystemTime(ts, preferences.timeFormat)}`;
  };

  return (
    <div className="w-full h-full flex flex-col justify-start items-stretch gap-4 font-sans antialiased text-[#521903] overflow-hidden">

      {/* FILTER TABS STRIP CHIPS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 select-none">
        <div className="flex items-center gap-2">
          {(['ALL', 'announcement', 'feedback'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
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
            {mutedTypes.map((m) => FILTER_LABELS[m]).join(' & ')} muted — hidden from All Updates
          </span>
        )}

        <button
          onClick={handleMarkAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full border border-white/50 bg-white/80 hover:bg-white text-[11px] font-bold uppercase tracking-wider text-[#521903]/80 transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          Mark All As Read {unreadCount > 0 ? `(${unreadCount})` : ''}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* MAIN CONTAINER PANEL */}
      <div className="w-full flex-1 bg-white/70 backdrop-blur-md rounded-[24px] border border-white/50 p-6 flex flex-col gap-4 overflow-hidden shadow-[4px_4px_16px_rgba(82,25,3,0.02)]">

        <div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="w-full flex-1 flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#521903]/40" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="w-full flex-1 flex flex-col items-center justify-center text-center p-12 text-[#521903]/40 space-y-2">
              <Bell className="h-8 w-8 stroke-[1.5] opacity-50" />
              <span className="text-xs font-bold tracking-wide">You're all caught up — no notifications here.</span>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id, notif.isRead)}
                className={`w-full p-5 rounded-2xl border transition-all duration-150 flex gap-4 items-start relative group cursor-pointer ${
                  notif.isRead
                    ? 'bg-white/40 border-white/60 text-[#521903]/80'
                    : 'bg-white border-amber-200/70 shadow-sm shadow-amber-700/[0.02]'
                }`}
              >
                {/* Type Left Icon Badge indicator */}
                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                  notif.type === 'announcement'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                }`}>
                  {notif.type === 'announcement' ? <Megaphone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </div>

                {/* Title & Body Meta fields */}
                <div className="flex-1 space-y-1 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[13px] font-bold tracking-tight text-[#521903]">{notif.title}</h4>

                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      notif.type === 'announcement'
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {notif.type === 'announcement' ? 'Announcement' : 'Feedback Update'}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                    {notif.message}
                  </p>

                  {/* Footer Micro timestamps registry array */}
                  <div className="flex items-center gap-3 pt-1 text-[9px] font-bold text-slate-400 font-mono select-none">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatTimestamp(notif.createdAt)}</span>
                  </div>
                </div>

                {/* Unread status dot */}
                {!notif.isRead && (
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500 absolute right-5 top-6 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}