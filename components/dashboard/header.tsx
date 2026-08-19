"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAnnouncements, Announcement } from "@/lib/data-service";
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Shield,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      const items = await getAnnouncements();
      setAnnouncements(items.slice(0, 5));
    }
    loadNotifications();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const getRoleIcon = () => {
    if (user?.role === "admin") return <Shield className="w-3 h-3 text-rose-600" />;
    if (user?.role === "teacher") return <BookOpen className="w-3 h-3 text-blue-600" />;
    return <GraduationCap className="w-3 h-3 text-amber-600" />;
  };

  const displayName = user?.fullName || user?.name || "Authenticated User";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students, lessons, gestures..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3B5C]/20 focus:border-[#2A3B5C] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {announcements.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FFD700] rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-800">Notifications & Announcements</span>
                <span className="text-[10px] text-slate-400">{announcements.length} new</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {announcements.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No active announcements.</p>
                ) : (
                  announcements.map((item) => (
                    <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.content}</p>
                      <span className="text-[9px] text-slate-400 mt-1 block">{item.date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Live User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <img
              src={
                user?.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`
              }
              alt={displayName}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100"
            />
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-none">{displayName}</p>
              <div className="flex items-center gap-1 mt-1">
                {getRoleIcon()}
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  {user?.role || "Staff"}
                </span>
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.department}</p>
              </div>

              <Link
                href={user?.role === "admin" ? "/dashboard/admin/account" : "/dashboard/teacher/account"}
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Account Settings
              </Link>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export const DashboardHeader = Header;
export default Header;