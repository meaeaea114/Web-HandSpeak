'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  BarChart3,
  Users,
  BookOpen,
  TrendingUp,
  Zap,
  Settings,
  ChevronLeft,
  Presentation,
  Award,
  Brain,
  Menu,
  Lock,
  LogOut,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
}

const navigationItems: NavigationItem[] = [
  // Common features
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, permission: Permission.VIEW_DASHBOARD },
  
  // Teacher features
  { name: 'Student Management', href: '/dashboard/students', icon: Users, permission: Permission.VIEW_STUDENTS },
  { name: 'Leaderboards', href: '/dashboard/leaderboard', icon: Award, permission: Permission.VIEW_LEADERBOARD },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp, permission: Permission.VIEW_ANALYTICS },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, permission: Permission.VIEW_REPORTS },
  { name: 'Content Management', href: '/dashboard/content', icon: Brain, permission: Permission.VIEW_CONTENT },
  
  // Both roles
  { name: 'Account Management', href: '/dashboard/account', icon: Users, permission: Permission.MANAGE_ACCOUNT },
  { name: 'Profile Settings', href: '/dashboard/profile', icon: Settings, permission: Permission.MANAGE_PROFILE },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, permission: Permission.VIEW_NOTIFICATIONS },
  
  // Admin features
  { name: 'System Announcements', href: '/dashboard/announcements', icon: BookOpen, permission: Permission.MANAGE_ANNOUNCEMENTS },
  { name: 'Content Approval', href: '/dashboard/content-approval', icon: Brain, permission: Permission.APPROVE_CONTENT },
  { name: 'Feedback & Support', href: '/dashboard/feedback', icon: Users, permission: Permission.MANAGE_FEEDBACK },
]

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission, user, logout } = useAuth()

  // Filter items based on permissions
  const visibleItems = navigationItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 transform bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border/30 px-6 py-6">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo.png"
              alt="HandSpeak Logo"
              width={50}
              height={50}
              className="drop-shadow-lg flex-shrink-0"
            />
            <h1 className="text-xl font-bold text-sidebar-foreground whitespace-nowrap overflow-hidden text-ellipsis">HandSpeak</h1>
          </div>
          <button
            onClick={onToggle}
            className="md:hidden flex-shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-2">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-2xl px-6 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-sidebar-primary shadow-md'
                        : 'text-white/90 hover:bg-white/20'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Card */}
        <div className="border-t border-sidebar-border/30 p-4 space-y-3">
          <div className="rounded-xl bg-white/10 backdrop-blur p-4">
            <p className="text-xs font-semibold text-white/70">Logged in as</p>
            <p className="mt-2 text-sm font-bold text-white">{user?.name}</p>
            <p className="text-xs text-white/70">{user?.role === 'admin' ? 'Administrator' : 'Teacher'}</p>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 px-4 py-2.5 font-semibold text-black transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
