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

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

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
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case "content":
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case "student":
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case "system":
      default:
        return <Settings className="w-4 h-4 text-amber-600" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "teacher":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2A3B5C]/10 flex items-center justify-center text-[#2A3B5C]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Live System Activity</h3>
            <p className="text-xs text-slate-500">Real-time actions and audit logs</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-slate-400 space-y-1 text-xs">
          <p>No recent activity recorded.</p>
          <p className="text-[11px] text-slate-300">
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
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getActionIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 truncate">
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
                  <p className="text-xs text-slate-600 truncate mt-0.5">
                    {actionText}
                    {targetText ? (
                      <>
                        : <span className="font-medium text-slate-700">{targetText}</span>
                      </>
                    ) : null}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {item.timestamp}
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