'use client'

import { useState } from 'react'
import { Menu, Bell, User, LogOut, ChevronDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Role } from '@/lib/rbac'
import Image from 'next/image'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, switchRole } = useAuth()
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-red-500/20 text-red-700'
      case Role.FACULTY:
        return 'bg-blue-500/20 text-blue-700'
      default:
        return 'bg-gray-500/20 text-gray-700'
    }
  }

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'Administrator'
      case Role.FACULTY:
        return 'Teacher'
    }
  }

  return (
    <header className="border-b border-primary/20 bg-primary">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden flex-shrink-0"
          >
            <Menu className="h-6 w-6 text-primary-foreground" />
          </button>
          <Image
            src="/logo.png"
            alt="HandSpeak Logo"
            width={40}
            height={40}
            className="rounded-lg drop-shadow flex-shrink-0"
          />
          <h2 className="text-2xl font-bold text-primary-foreground whitespace-nowrap overflow-hidden text-ellipsis">Dashboard</h2>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative rounded-lg p-2 hover:bg-white/20 transition-colors">
            <Bell className="h-5 w-5 text-primary-foreground" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <button className="relative rounded-lg p-2 hover:bg-white/20 transition-colors">
            <Users className="h-5 w-5 text-primary-foreground" />
          </button>

          <button className="relative rounded-lg p-2 hover:bg-white/20 transition-colors">
            <User className="h-5 w-5 text-primary-foreground" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2 hover:bg-white/30 transition-colors"
            >
              <p className="text-sm font-semibold text-primary-foreground">Ms. {user?.name?.split(' ')[1] || 'Teacher'}</p>
              <ChevronDown className="h-4 w-4 text-primary-foreground" />
            </button>

            {/* Role Switcher Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-primary/20 bg-white shadow-lg z-50">
                <div className="p-3 border-b border-primary/10">
                  <p className="text-xs font-semibold text-foreground">Switch Role (Demo)</p>
                </div>
                <div className="p-2">
                  {[Role.ADMIN, Role.FACULTY].map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        switchRole(role)
                        setShowRoleMenu(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        user?.role === role
                          ? 'bg-primary text-white font-medium'
                          : 'hover:bg-primary/10 text-foreground'
                      }`}
                    >
                      {getRoleLabel(role)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
