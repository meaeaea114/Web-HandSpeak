'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle, ShieldAlert, UserCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('john@handspeak.edu')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailError, setEmailError] = useState('')

  // Real-time input validation to prevent system errors early
  const validateEmail = (value: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setEmailError(isValid ? '' : value ? 'Please enter a valid academic email address' : '')
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (error) setError('')
    validateEmail(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!email || !password) {
      setError('Both authentication fields are strictly required.')
      return
    }

    if (emailError) {
      setError('Please resolve the email formatting error before attempting login.')
      return
    }

    try {
      // Passes inputs directly into the RBAC authentication provider
      await login(email, password)
      setSuccess('Credentials verified. Initiating role-based dashboard routing...')
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 sm:px-6 lg:px-8 font-sans selection:bg-zinc-800 selection:text-white">
      <div className="w-full max-w-md space-y-8 bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl backdrop-blur-md shadow-2xl">
        
        {/* Header Section: Branding and Context Clarity */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-white mb-2">
            <span className="text-xl font-bold tracking-wider">HS</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
            HandSpeak Portal
          </h1>
          <p className="text-sm text-zinc-400">
            Educational Administration & Faculty Access
          </p>
        </div>

        {/* Dynamic Status Windows for Visibility of System Status */}
        {error && (
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div><span className="font-semibold">Access Denied:</span> {error}</div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div><span className="font-semibold">Success:</span> {success}</div>
          </div>
        )}

        {/* Authentication Form Wrapper */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email Input Node */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Academic Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isLoading}
                className={`w-full bg-zinc-950/80 text-zinc-100 placeholder-zinc-600 border px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 ${
                  emailError 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                    : 'border-zinc-800 focus:border-zinc-400 focus:ring-zinc-400/20'
                }`}
                placeholder="username@handspeak.edu"
              />
            </div>
            {emailError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5" /> {emailError}
              </p>
            )}
          </div>

          {/* Password Input Node */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Account Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                disabled={isLoading}
                className="w-full bg-zinc-950/80 text-zinc-100 placeholder-zinc-600 border border-zinc-800 px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 pr-11"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={0}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-500"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Session Remember Logic */}
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded bg-zinc-950 border border-zinc-800 peer-checked:bg-zinc-100 peer-checked:border-zinc-100 transition-all flex items-center justify-center group-focus-within:ring-2 group-focus-within:ring-zinc-500/40">
                <div className="w-2 h-2 bg-zinc-950 rounded-sm scale-0 peer-checked:scale-100 transition-transform duration-150" />
              </div>
              <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Maintain session persistence on this device
              </span>
            </label>
          </div>

          {/* Submission Action Control */}
          <button
            type="submit"
            disabled={isLoading || !!emailError}
            className="w-full bg-zinc-100 text-zinc-950 hover:bg-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-zinc-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-r-transparent" />
                Validating Security Assertions...
              </span>
            ) : (
              'Authenticate Access'
            )}
          </button>
        </form>

        {/* Informative Separation Border */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">RBAC Boundaries</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        {/* Registration Link for Teachers */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-block text-xs font-bold text-zinc-400 hover:text-zinc-100 transition-colors underline underline-offset-4 focus:outline-none focus:text-zinc-100"
          >
            Submit Account Provision Request (Faculty Only)
          </Link>
        </div>

        {/* Demo Credentials Context Window */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            System Sandbox Accounts:
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/40 space-y-1">
              <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> System Admin
              </span>
              <p className="text-zinc-300 font-mono truncate">john@handspeak.edu</p>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/40 space-y-1">
              <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Faculty Unit
              </span>
              <p className="text-zinc-300 font-mono truncate">jane@handspeak.edu</p>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono text-center pt-1 border-t border-zinc-900">
            Shared Passphrase: <span className="text-zinc-300 select-all font-bold">password123</span>
          </div>
        </div>

      </div>
    </div>
  )
}