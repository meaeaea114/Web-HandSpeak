"use client";

import { useEffect, useState } from "react";
import { ActivityLog, getActivityLogs } from "@/lib/data-service";
import {
  UserCheck,
  BookOpen,
  Settings,
  Clock,
  CheckCircle,
} from "lucide-react";

import { usePreferences } from '@/lib/preferences-context';
import { formatSystemDate, formatSystemTime } from '@/lib/date-utils';

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { preferences } = usePreferences();

  useEffect(() => {
    async function loadActivities() {
      const logs = await getActivityLogs(8);
      setActivities(logs);
      setLoading(false);
    }
    loadActivities();
  }, []);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "auth":
        return <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />;
      case "content":
        return <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-500" />;
      case "student":
        return <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "system":
      default:
        return <Settings className="w-4 h-4 text-amber-600 dark:text-amber-500" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
      case "teacher":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200 dark:bg-[#2A2621] dark:text-stone-300 dark:border-stone-700";
    }
  };

  const safeFormatTimestamp = (ts: any) => {
    if (!ts) return '';
    const d = new Date(ts?.seconds ? ts.toDate() : ts);
    if (isNaN(d.getTime())) return ts; 
    
    return `${formatSystemDate(ts, preferences.dateFormat)} at ${formatSystemTime(ts, preferences.timeFormat)}`;
  };

  return (
    <div className="bg-white/90 dark:bg-[#1A1816]/95 backdrop-blur-md rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2A3B5C]/10 dark:bg-[#F0AB31]/10 flex items-center justify-center text-[#2A3B5C] dark:text-[#F0AB31]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Live System Activity</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Real-time actions and audit logs</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-[#2A2621]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-stone-100 dark:bg-[#2A2621] rounded w-3/4" />
                <div className="h-2.5 bg-stone-100 dark:bg-[#2A2621] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-stone-400 dark:text-stone-500 space-y-1 text-xs">
          <p>No recent activity recorded.</p>
          <p className="text-[11px] text-stone-300 dark:text-stone-600">
            Actions will appear here as users interact with HandSpeak.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => {
            const userName = item.userName || item.user || "System";
            const userRole = item.userRole || "system";
            const actionText = item.action || item.title || "Activity";
            const targetText = item.target || item.description || "";

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 dark:hover:bg-[#2A2621]/50 transition-colors border border-transparent hover:border-stone-100 dark:hover:border-stone-800"
              >
                <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-[#2A2621] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getActionIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {userName}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                        userRole
                      )}`}
                    >
                      {userRole}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 truncate mt-0.5">
                    {actionText}
                    {targetText ? (
                      <>
                        : <span className="font-medium text-stone-700 dark:text-stone-200">{targetText}</span>
                      </>
                    ) : null}
                  </p>
                  
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 block">
                    {safeFormatTimestamp(item.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}