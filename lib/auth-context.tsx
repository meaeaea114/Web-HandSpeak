'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, Role, mockCurrentUser, mockFacultyUser, Permission, hasPermission } from './rbac'


interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchRole: (role: Role) => void
  hasPermission: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  
  {/* 
    FIX 1: Changed initial state from mockCurrentUser to null. 
    This ensures the app starts unauthenticated and routes to the login page first.
  */}
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      if (email === 'admin@handspeak.edu' || email === 'john@handspeak.edu') {
        setUser(mockCurrentUser)
        // Admin folder route
        router.push('/dashboard/admin')
      } else if (email === 'faculty@handspeak.edu' || email === 'jane@handspeak.edu') {
        setUser(mockFacultyUser)
        
        {/* 
          THE FIX: Change this route from '/dashboard' to match 
          your teacher folder structure exactly!
        */}
        router.push('/dashboard/teacher')
      } else {
        throw new Error('Invalid credentials')
      }
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      // Simulate logout delay
      await new Promise((resolve) => setTimeout(resolve, 300))
      setUser(null)
      
      {/* Updated to /auth/login to match your auth subfolder directory layout structure */}
      router.push('/auth/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const switchRole = useCallback((role: Role) => {
    if (user) {
      setUser({ ...user, role })
    }
  }, [user])

  const checkPermission = useCallback((permission: Permission) => {
    if (!user) return false
    return hasPermission(user.role, permission)
  }, [user])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    switchRole,
    hasPermission: checkPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}