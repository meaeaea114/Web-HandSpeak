'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Naka-true muna para tingnan ang storage sa simula

  // I-load ang user mula sa localStorage pagka-boot ng system
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('handspeak_user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch (e) {
          console.error("Failed to parse saved user state", e)
        }
      }
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      
      const sanitizedEmail = email.trim().toLowerCase()
      console.log("AuthContext evaluating profile session:", sanitizedEmail)

      if (
        sanitizedEmail === 'mea@handspeak.edu' || 
        sanitizedEmail === 'admin@handspeak.edu' || 
        sanitizedEmail === 'john@handspeak.edu'
      ) {
        // I-save sa React state AT sa localStorage para hindi mabura sa reload!
        setUser(mockCurrentUser)
        localStorage.setItem('handspeak_user', JSON.stringify(mockCurrentUser))
        
        window.location.href = '/dashboard/admin'
      } else if (
        sanitizedEmail === 'teacher@handspeak.edu' || 
        sanitizedEmail === 'faculty@handspeak.edu' || 
        sanitizedEmail === 'jane@handspeak.edu'
      ) {
        setUser(mockFacultyUser)
        localStorage.setItem('handspeak_user', JSON.stringify(mockFacultyUser))
        
        window.location.href = '/dashboard/teacher'
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      setUser(null)
      localStorage.removeItem('handspeak_user')
      window.location.href = '/auth/login'
    } finally {
      setIsLoading(false)
    }
  }, [])

  const switchRole = useCallback((role: Role) => {
    if (user) {
      const updatedUser = { ...user, role }
      setUser(updatedUser)
      localStorage.setItem('handspeak_user', JSON.stringify(updatedUser))
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