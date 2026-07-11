'use client';

import React from 'react';
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
  LogOut 
} from 'lucide-react';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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
      className="flex h-screen w-screen overflow-hidden p-6 gap-6 font-sans antialiased bg-[#F5E6C4] bg-repeat bg-auto"
      style={{ backgroundImage: "url('/bg-parchment.jpg')" }}
    >
      {/* SIDEBAR COMPONENT PANEL */}
      <aside className="w-76 bg-white/70 backdrop-blur-md rounded-[28px] p-5 flex flex-col justify-between border border-white/50 shadow-[4px_4px_16px_rgba(82,25,3,0.06)] flex-shrink-0">
        <div className="space-y-6">
          {/* Logo Branding - Updated to use logo.png */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="HandSpeak Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-[#521903] tracking-tight">HandSpeak</span>
          </div>

          <nav className="space-y-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = pathname === mod.path;
              return (
                <button
                  key={mod.name}
                  onClick={() => router.push(mod.path)}
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
            onClick={() => logout()}
            className="w-full bg-[#521903] hover:bg-[#3D1202] text-white font-bold py-2.5 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm active:scale-[0.97] flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        {/* HEADER BAR STRIP */}
        <header className="flex items-center justify-between gap-4 flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-sm px-6 py-2.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 font-bold text-[#521903] text-xs tracking-wide">
            {getHeaderTitle()}
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
              className={`p-2.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50 transition-all cursor-pointer ${
                pathname.includes('/notifications')
                  ? 'bg-[#521903] text-white'
                  : 'bg-white/80 text-[#521903] hover:bg-white'
              }`}
            >
              <Bell className="h-4 w-4" />
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

            <div className="flex items-center gap-2 bg-white/80 pl-3 pr-4 py-1.5 rounded-full shadow-[2px_2px_8px_rgba(82,25,3,0.03)] border border-white/50">
              <div className="h-5 w-5 rounded-full bg-[#F2B33D]/20 flex items-center justify-center text-[#521903] font-bold text-[10px]">
                TF
              </div>
              <span className="text-[11px] font-bold text-[#521903]">{user?.name || 'Teacher Faculty'}</span>
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