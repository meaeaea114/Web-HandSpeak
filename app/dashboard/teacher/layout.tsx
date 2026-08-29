'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Trophy, 
  BarChart3, 
  ClipboardList, 
  Users, 
  FolderEdit, 
  UserCheck, 
  Settings, 
  Bell, 
  MessageSquare, 
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { getNotificationsRealtime } from '@/lib/data-service';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = getNotificationsRealtime(
      user.id,
      (items) => setUnreadCount(items.filter((n) => !n.isRead).length),
      () => setUnreadCount(0)
    );

    return () => unsubscribe();
  }, [user?.id]);

  const modules = [
    { name: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard },
    { name: 'Leaderboards', path: '/dashboard/teacher/leaderboard', icon: Trophy },
    { name: 'Analytics', path: '/dashboard/teacher/analytics', icon: BarChart3 },
    { name: 'Reports', path: '/dashboard/teacher/reports', icon: ClipboardList },
    { name: 'Student Management', path: '/dashboard/teacher/students', icon: Users },
    { name: 'Content Management', path: '/dashboard/teacher/content', icon: FolderEdit },
    { name: 'Account Management', path: '/dashboard/teacher/account', icon: UserCheck },
  ];

  const getHeaderTitle = () => {
    const currentModule = modules.find(m => pathname === m.path);
    if (currentModule) return currentModule.name.toUpperCase();
    if (pathname.includes('/settings')) return 'PROFILE SETTINGS';
    if (pathname.includes('/notifications')) return 'NOTIFICATIONS';
    if (pathname.includes('/feedback')) return 'FEEDBACK & SUPPORT';
    return 'DASHBOARD';
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden p-3 sm:p-6 gap-3 sm:gap-6 font-sans antialiased bg-[#F5E6C4] bg-repeat"
      style={{ backgroundImage: "url('/bg-parchment.jpg')" }}
    >
      {/* Mobile backdrop overlay - only shown when the drawer is open on small screens */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR COMPONENT PANEL - collapses into a mobile drawer below lg, unchanged on desktop */}
      <aside
        className={`w-76 max-w-[85vw] bg-white/70 backdrop-blur-md rounded-[28px] p-5 flex flex-col justify-between border border-white/50 shadow-[4px_4px_16px_rgba(82,25,3,0.06)] flex-shrink-0 fixed inset-y-3 left-3 z-50 transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:z-auto lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+12px)] lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo Branding - Updated to use logo.png */}
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="HandSpeak Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold text-[#521903] tracking-tight">HandSpeak</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#521903] hover:bg-white/60"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = pathname === mod.path;
              return (
                <button
                  key={mod.name}
                  onClick={() => {
                    router.push(mod.path);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-[13px] transition-all duration-150 text-left cursor-pointer hover:translate-x-1 ${
                    isActive 
                      ? 'bg-[#F2B33D]/20 text-[#521903] border-l-4 border-[#F2B33D] shadow-[inset_0_2px_4px_rgba(82,25,3,0.12)] scale-[0.99]' 
                      : 'text-[#521903]/70 hover:bg-white/50 hover:text-[#521903]'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {mod.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-white/90 p-4 rounded-2xl border border-white/60 shadow-[2px_2px_8px_rgba(82,25,3,0.03)] flex flex-col gap-3">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold tracking-wider text-amber-800 uppercase block">
              Faculty Instructor
            </span>
            <h4 className="text-xs font-bold text-[#521903] truncate">
              {user?.name || 'Teacher Faculty'}
            </h4>
            <p className="text-[10px] text-[#521903]/60 truncate">
              {user?.email || 'teacher@handspeak.edu'}
            </p>
          </div>

          <button
            onClick={async () => {
            await logout();
            router.replace("/auth/login");
            }}
            className="w-full bg-[#521903] hover:bg-[#3D1202] text-white font-bold py-2.5 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm active:scale-[0.97] flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-w-0 h-full">
        {/* HEADER BAR STRIP */}
        <header className="flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-full bg-white/80 backdrop-blur-sm shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 text-[#521903] shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-2.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 font-bold text-[#521903] text-xs tracking-wide truncate">
              {getHeaderTitle()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/dashboard/teacher/feedback')}
              className={`p-2.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 transition-all cursor-pointer ${
                pathname.includes('/feedback')
                  ? 'bg-[#521903] text-white'
                  : 'bg-white/80 text-[#521903] hover:bg-white'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
            </button>

            <button 
              onClick={() => router.push('/dashboard/teacher/notifications')}
              className={`relative p-2.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 transition-all cursor-pointer ${
                pathname.includes('/notifications')
                  ? 'bg-[#521903] text-white'
                  : 'bg-white/80 text-[#521903] hover:bg-white'
              }`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#F8B936] text-[#521903] text-[9px] font-black flex items-center justify-center border border-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => router.push('/dashboard/teacher/settings')}
              className={`p-2.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 transition-all cursor-pointer ${
                pathname.includes('/settings')
                  ? 'bg-[#521903] text-white'
                  : 'bg-white/80 text-[#521903] hover:bg-white'
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 bg-white/80 pl-3 pr-3 sm:pr-4 py-1.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50">
              <div className="h-5 w-5 shrink-0 rounded-full bg-[#F2B33D]/20 flex items-center justify-center text-[#521903] font-bold text-[10px]">
                TF
              </div>
              <span className="hidden sm:inline text-[11px] font-bold text-[#521903] max-w-[140px] truncate">{user?.name || 'Teacher Faculty'}</span>
            </div>
          </div>
        </header>
        
        {/* MAIN VIEWPORT WINDOW CANVAS */}
        <main className="flex-1 overflow-hidden rounded-[24px] bg-white/40 backdrop-blur-md p-1 border border-white/30 relative">
          <div className="w-full h-full overflow-y-auto pl-2 pr-3.5 py-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}