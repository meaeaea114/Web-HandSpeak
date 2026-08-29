"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePreferences } from "@/lib/preferences-context";
import { useTranslation } from "@/lib/translations";
import { getAnnouncements, Announcement } from "@/lib/data-service";
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Shield,
  BookOpen,
  GraduationCap,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps = {}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { preferences } = usePreferences();
  const t = useTranslation(preferences.language);
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
    if (user?.role === "admin") return <Shield className="w-3 h-3 text-rose-600 dark:text-rose-400" />;
    if (user?.role === "teacher") return <BookOpen className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    return <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
  };

  const displayName = user?.fullName || user?.name || "System Administrator";
  const avatarUrl = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

  return (
    <header className="h-auto min-h-16 bg-white dark:bg-[#1A1816] border-b border-slate-200 dark:border-stone-800 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 lg:w-96 lg:flex-none">
        {/* Mobile sidebar toggle - hidden on desktop where the sidebar is always visible */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 dark:text-stone-400 hover:bg-slate-100 dark:hover:bg-[#2A2621] transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative w-full min-w-0 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-[#2A2621] border border-slate-200 dark:border-stone-700 text-slate-800 dark:text-stone-200 placeholder:text-slate-400 dark:placeholder:text-stone-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3B5C]/20 dark:focus:ring-[#F0AB31]/30 focus:border-[#2A3B5C] dark:focus:border-[#F0AB31] transition-all"
          />
        </div>
        {/* Compact search icon-only trigger on very small screens keeps the field accessible without eating layout width */}
        <button
          type="button"
          aria-label={t('searchPlaceholder')}
          className="sm:hidden p-2 rounded-lg text-slate-500 dark:text-stone-400 hover:bg-slate-100 dark:hover:bg-[#2A2621] transition-colors shrink-0"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Live Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 dark:text-stone-400 hover:text-slate-700 dark:hover:text-stone-200 hover:bg-slate-100 dark:hover:bg-[#2A2621] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {announcements.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FFD700] rounded-full ring-2 ring-white dark:ring-[#1A1816]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[90vw] max-w-80 bg-white dark:bg-[#1A1816] rounded-xl shadow-xl border border-slate-200 dark:border-stone-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-stone-800 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-800 dark:text-stone-200">{t('notifications')}</span>
                <span className="text-[10px] text-slate-400 dark:text-stone-500">{announcements.length} {t('newLabel')}</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-stone-800">
                {announcements.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400 dark:text-stone-500">{t('noActiveAnnouncements')}</p>
                ) : (
                  announcements.map((item) => (
                    <div key={item.id} className="p-3 hover:bg-slate-50 dark:hover:bg-[#2A2621] transition-colors">
                      <p className="text-xs font-semibold text-slate-800 dark:text-stone-200">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-stone-400 line-clamp-2 mt-0.5">{item.content}</p>
                      <span className="text-[9px] text-slate-400 dark:text-stone-500 mt-1 block">
                        {(item as Record<string, any>).date ||
                          (item as Record<string, any>).createdAt ||
                          (item as Record<string, any>).timestamp ||
                          ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-stone-800" />

        {/* Live User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#2A2621] transition-colors text-left"
          >
            <img
              key={avatarUrl}
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-stone-700 bg-slate-100 dark:bg-[#2A2621] object-cover"
            />
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-stone-200 leading-none">{displayName}</p>
              <div className="flex items-center gap-1 mt-1">
                {getRoleIcon()}
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-stone-400">
                  {user?.role || "Admin"}
                </span>
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-[85vw] max-w-52 bg-white dark:bg-[#1A1816] rounded-xl shadow-xl border border-slate-200 dark:border-stone-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-stone-800">
                <p className="text-xs font-semibold text-slate-800 dark:text-stone-200 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-500 dark:text-stone-400 truncate">{user?.email || "admin@handspeak.edu"}</p>
                {user?.department && (
                  <p className="text-[10px] text-slate-400 dark:text-stone-500 mt-0.5 truncate">{user.department}</p>
                )}
              </div>

              <Link
                href={user?.role === "admin" ? "/dashboard/admin/settings" : "/dashboard/teacher/account"}
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-stone-300 hover:bg-slate-50 dark:hover:bg-[#2A2621] transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-stone-500" />
                {t('accountSettings')}
              </Link>

              <div className="border-t border-slate-100 dark:border-stone-800 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                {t('signOut')}
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