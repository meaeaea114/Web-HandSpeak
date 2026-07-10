'use client'

import { useState } from 'react'
import { ChevronLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate email format first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSubmitted(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-primary rounded-3xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <Image
                src="/logo.png"
                alt="HandSpeak Logo"
                width={60}
                height={60}
                priority
                className="drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold text-primary-foreground whitespace-nowrap">Reset Password</h1>
            <p className="text-primary-foreground/80 text-sm max-w-sm mx-auto">
              Enter your email address and we&apos;ll send you a link to reset your password
            </p>
          </div>

          {!submitted ? (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-primary-foreground mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="your.email@handspeak.edu"
                      className="w-full bg-white/90 rounded-2xl pl-12 pr-5 py-3 text-primary-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                      required
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-lg px-4 py-3 flex items-start gap-3 text-red-700 text-sm" role="alert">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Invalid Email</p>
                      <p className="text-red-600 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-white/95 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-primary font-bold py-3 px-4 rounded-2xl transition-all duration-200 active:scale-95"
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                      Sending...
                    </span>
                  ) : (
                    'Transmit Security Token'
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="flex items-center justify-center">
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-primary-foreground hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-4 text-center space-y-3" role="status">
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-green-900 font-semibold text-sm">Password Reset Email Sent</p>
                <p className="text-green-800 text-sm">
                  Check your email at <strong>{email}</strong> for a password reset link. The link will expire in 24 hours.
                </p>
                <p className="text-green-700 text-xs">
                  <strong>Tip:</strong> If you don&apos;t see the email, check your spam folder or wait a few minutes.
                </p>
              </div>

              {/* Back to Login */}
              <div className="flex items-center justify-center">
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-primary-foreground hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-primary-foreground/70 text-xs">
          <p>HandSpeak Educational Platform</p>
        </div>
      </div>
    </div>
  )
}
