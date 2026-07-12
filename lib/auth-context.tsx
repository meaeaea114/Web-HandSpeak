'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// === 1. EXISTING INTERFACES & TYPES (UNTOUCHED) ===
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student' | 'faculty';
  avatar?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loading: boolean; // Alias for compatibility
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === 2. AUTH PROVIDER CORE ===
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ADDED FEATURE: Restore current browser session token link on initial terminal launch
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('handspeak_user_session');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("HandSpeak Secure Storage Link Restoral Failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === 3. EXISTING CORE FUNCTIONS WITH ADDED PERSISTENCE ===
  const login = async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Maintaining your simulation/API conditional database mapping safely
      let authenticatedUser: User | null = null;

      if (email === 'john@handspeak.edu') {
        authenticatedUser = {
          id: 'usr_teacher_01',
          email: 'john@handspeak.edu',
          name: 'John Doe',
          role: 'teacher',
          avatar: '/images/faculty-card.tsx' // Placeholder mapping
        };
      } else if (email === 'admin@handspeak.edu') {
        authenticatedUser = {
          id: 'usr_admin_01',
          email: 'admin@handspeak.edu',
          name: 'System Admin',
          role: 'admin'
        };
      } else if (email && email.includes('@')) {
        // Accept any valid email as a new teacher registration
        authenticatedUser = {
          id: 'usr_' + Math.random().toString(36).substr(2, 9),
          email: email,
          name: email.split('@')[0],
          role: 'teacher'
        };
      }

      if (authenticatedUser) {
        setUser(authenticatedUser);
        // ADDED FEATURE: Push authenticated profile map to state survival ring
        localStorage.setItem('handspeak_user_session', JSON.stringify(authenticatedUser));
        setIsLoading(false);
        return true;
      } else {
        setError('Invalid terminal verification authorization tokens.');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      setError('Core authentication handler failure exception.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setUser(null);
      // ADDED FEATURE: Strip access tokens completely from filesystem storage
      localStorage.removeItem('handspeak_user_session');
    } catch (err) {
      console.error("Logout runtime context failure:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    try {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      // ADDED FEATURE: Keep localized synchronization mirrors identical
      localStorage.setItem('handspeak_user_session', JSON.stringify(updatedUser));
      return true;
    } catch (err) {
      setError('Profile update sequence mutation failure.');
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Simple permission check - can be expanded based on role
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loading: isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        updateProfile,
        clearError,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// === 4. EXPORT UTILITY CONSUMER ===
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth framework terminal hooks must run strictly inside an AuthProvider wrapper.');
  }
  return context;
}
