'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      await login(email, password)
      setSuccess('Credentials verified. Redirecting...')
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#4B4B4B] p-4">
      {/* Yellow Card Container */}
      <div className="w-full max-w-[500px] bg-[#F1B82D] rounded-[2rem] p-10 shadow-2xl">
        <h1 className="text-center text-5xl font-black text-black mb-10">Login</h1>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-100 p-4 rounded-xl text-sm font-bold text-red-900">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-black text-black mb-2">Name *</label>
            <input
              type="text"
              defaultValue="John Doe"
              className="w-full bg-[#F5E1A4] px-6 py-4 rounded-full text-black font-bold focus:outline-none"
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-black text-black mb-2">Email Address *</label>
            <input
              type="email"
              defaultValue={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F5E1A4] px-6 py-4 rounded-full text-black font-bold focus:outline-none"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-black text-black mb-2">Password *</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                defaultValue={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F5E1A4] px-6 py-4 rounded-full text-black font-bold focus:outline-none pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 text-black/60"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-black text-black cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 accent-black" 
              />
              Remember Me
            </label>
            <Link href="/forgot-password" className="text-sm font-black text-red-700 underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#F5E1A4] py-4 rounded-full text-xl font-black text-black hover:bg-white transition-colors"
          >
            Login
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/register" className="text-lg font-black text-black hover:underline">
            Create New Account (Faculty Request)
          </Link>
        </div>
      </div>
    </div>
  )
}