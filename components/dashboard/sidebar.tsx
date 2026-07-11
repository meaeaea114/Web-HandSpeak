'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, ShieldCheck, Settings, 
  BookOpen, BarChart3, Megaphone, Trophy, MessageSquare, FileText 
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'teacher';
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  // Explicit, role-isolated menu paths mapped directly to your directory folders
  const adminLinks = [
    { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/admin/teachers', label: 'Manage Faculty', icon: Users },
    { href: '/dashboard/admin/content-approval', label: 'Content Control', icon: ShieldCheck },
    { href: '/dashboard/admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/dashboard/admin/feedback', label: 'App Feedback', icon: MessageSquare },
    { href: '/dashboard/admin/settings', label: 'Global Settings', icon: Settings },
  ];

  const teacherLinks = [
    { href: '/dashboard/teacher', label: 'Class Overview', icon: LayoutDashboard },
    { href: '/dashboard/teacher/students', label: 'My Students', icon: Users },
    { href: '/dashboard/teacher/gestures', label: 'FSL Vocabulary', icon: BookOpen },
    { href: '/dashboard/teacher/content', label: 'Learning Content', icon: ShieldCheck },
    { href: '/dashboard/teacher/analytics', label: 'Performance Tracker', icon: BarChart3 },
    { href: '/dashboard/teacher/leaderboard', label: 'Global Leaderboard', icon: Trophy },
    { href: '/dashboard/teacher/reports', label: 'Report Bug', icon: FileText },
    { href: '/dashboard/teacher/settings', label: 'Dashboard Settings', icon: Settings },
  ];

  const currentLinks = role === 'admin' ? adminLinks : teacherLinks;
  
  // Point to each individual layout's profile section cleanly
  const profileHref = `/dashboard/${role}/account`;

  return (
    <aside className="w-64 border-r bg-card h-full hidden md:flex md:flex-col">
      <div className="p-6 border-b flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
          HS
        </div>
        <span className="font-semibold tracking-tight text-lg">HandSpeak</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {currentLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <Link 
          href={profileHref}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            pathname === profileHref && "bg-muted text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          My Profile Account
        </Link>
      </div>
    </aside>
  );
}