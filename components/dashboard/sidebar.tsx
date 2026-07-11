'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, MessageSquare, Megaphone, ShieldCheck, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const adminLinks = [
    { href: '/dashboard/admin', label: 'Account Management', icon: LayoutDashboard },
    { href: '/dashboard/admin/feedback', label: 'Feedback & Support', icon: MessageSquare },
    { href: '/dashboard/admin/announcements', label: 'System Announcements', icon: Megaphone },
    { href: '/dashboard/admin/content-approval', label: 'Content Management', icon: ShieldCheck },
    { href: '/dashboard/admin/settings', label: 'Profile Settings', icon: User },
  ];

  return (
    
    <aside className="w-72 bg-white/60 backdrop-blur-xl p-5 flex flex-col h-full shrink-0 border border-white/50 rounded-[28px] shadow-xl">
      {/* Brand Title Branding Section */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        {/* Swapped placeholder div with your logo image asset */}
        <div className="h-10 w-10 relative shrink-0">
          <Image 
            src="/logo.png" 
            alt="HandSpeak Mascot" 
            fill 
            className="object-contain" 
            priority 
          />
        </div>
        <span className="font-black text-xl tracking-tight text-[#521903]">HandSpeak</span>
      </div>
      
      {/* 3D Glass Floating Menu Links */}
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
                  ? "bg-[#F8B936] text-[#521903] font-extrabold translate-y-px shadow-[0_1px_0_0_#DC8C18] border-[#DC8C18]" 
                  : "bg-white/70 text-slate-600 border-white/40 shadow-[0_4px_12px_rgba(82,25,3,0.04)] hover:bg-white hover:text-[#521903] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(82,25,3,0.08)] active:translate-y-px active:shadow-none"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#521903]" : "text-slate-400")} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      
      {/* Bottom Profile Section */}
      <div className="mt-auto bg-white/80 p-4 rounded-2xl border border-white/60 shadow-sm space-y-4">
        <div>
          <p className="text-[10px] font-black text-[#C29F85] uppercase tracking-widest">Session Administrator</p>
          <p className="text-base font-black text-[#521903] tracking-tight">Mr. Admin</p>
          <p className="text-xs font-semibold text-slate-500">admin@handspeak.com</p>
        </div>
        <button 
          onClick={logout}
          className="w-full bg-[#521903] hover:bg-[#9F4409] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border-b-4 border-black shadow-md transition-all duration-200 active:translate-y-0.5 active:border-b-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout 
        </button>
      </div>
    </aside>
  );
}