'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, MessageSquare, Megaphone, ShieldCheck, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

import { usePreferences } from '@/lib/preferences-context';
import { useTranslation } from '@/lib/translations';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const { preferences } = usePreferences();
  const t = useTranslation(preferences.language);

  const adminLinks = [
    { href: '/dashboard/admin', label: t('accountManagement' as any) || 'Account Management', icon: LayoutDashboard },
    { href: '/dashboard/admin/feedback', label: t('feedbackSupport' as any) || 'Feedback & Support', icon: MessageSquare },
    { href: '/dashboard/admin/announcements', label: t('systemAnnouncements' as any) || 'System Announcements', icon: Megaphone },
    { href: '/dashboard/admin/content-approval', label: t('contentManagement' as any) || 'Content Management', icon: ShieldCheck },
    { href: '/dashboard/admin/settings', label: t('settings' as any) || 'Profile Settings', icon: User },
  ];

  const displayName = user?.fullName || user?.name || 'Administrator';
  const displayRole = user?.role ? `${user.role.toUpperCase()} SESSION` : 'SESSION ADMINISTRATOR';

  return (
    <aside className="w-72 bg-white/60 dark:bg-[#1A1816]/80 backdrop-blur-xl p-5 flex flex-col h-full shrink-0 border border-white/50 dark:border-stone-800/50 rounded-[28px] shadow-xl">
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="h-10 w-10 relative shrink-0">
          <Image 
            src="/logo.png" 
            alt="HandSpeak Mascot" 
            fill 
            sizes="40px" 
            className="object-contain" 
            priority 
          />
        </div>
        <span className="font-black text-xl tracking-tight text-[#521903] dark:text-[#F0AB31]">HandSpeak</span>
      </div>
      
      <nav className="flex-1 space-y-3">
        {adminLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 relative border",
                isActive 
                  ? "bg-[#F8B936] text-[#521903] dark:bg-[#F8B936]/90 dark:text-[#1A1816] font-extrabold translate-y-px shadow-[0_1px_0_0_#DC8C18] border-[#DC8C18] dark:border-amber-500/30" 
                  : "bg-white/70 text-stone-600 border-white/40 dark:bg-[#2A2621]/60 dark:text-stone-300 dark:border-stone-700/40 shadow-[0_4px_12px_rgba(82,25,3,0.04)] hover:bg-white hover:text-[#521903] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(82,25,3,0.08)] active:translate-y-px active:shadow-none dark:hover:bg-[#2A2621] dark:hover:text-[#F0AB31]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#521903] dark:text-[#1A1816]" : "text-stone-400 dark:text-stone-400")} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto bg-white/80 dark:bg-[#1A1816]/90 p-4 rounded-2xl border border-white/60 dark:border-stone-800/80 shadow-sm space-y-4">
        <div>
          <p className="text-[10px] font-black text-[#C29F85] dark:text-stone-400 uppercase tracking-widest">{displayRole}</p>
          <p className="text-base font-black text-[#521903] dark:text-[#F0AB31] tracking-tight truncate">{displayName}</p>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">{user?.email || 'admin@handspeak.edu'}</p>
        </div>
        <button 
          onClick={logout}
          className="w-full bg-[#521903] dark:bg-[#3C1E0A] hover:bg-[#9F4409] dark:hover:bg-[#2A1507] text-white dark:text-[#F0AB31] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border-b-4 border-black dark:border-[#150A03] shadow-md transition-all duration-200 active:translate-y-0.5 active:border-b-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t('logout' as any) || 'Logout'} 
        </button>
      </div>
    </aside>
  );
}