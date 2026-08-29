"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatAuthError } from "@/lib/auth-service";
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 30;

export default function LoginPage() {
  const router = useRouter();
  const { login, pendingTwoFactor, verifyLoginTwoFactorCode, resendLoginTwoFactorCode, cancelTwoFactorLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", rememberMe: false });

  // OTP verification step state
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown for the "resend code" cooldown once the OTP step is shown.
  useEffect(() => {
    if (!pendingTwoFactor) return;
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }, [pendingTwoFactor]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  useEffect(() => {
    if (pendingTwoFactor) {
      otpInputRef.current?.focus();
    }
  }, [pendingTwoFactor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Trim all inputs
    const fullNameClean = formData.name.trim();
    const emailClean = formData.email.trim().toLowerCase();
    const passwordClean = formData.password.trim();

    // 2. Pre-Firebase Validations
    if (!fullNameClean) {
      setError("Please provide your full name.");
      return;
    }

    if (!emailClean) {
      setError("Please provide your institutional email address.");
      return;
    }

    if (!passwordClean) {
      setError("Please provide your account password.");
      return;
    }

    setIsLoading(true);

    try {
      // 3. Authenticate with Firebase & Apply Persistence
      const result = await login(emailClean, formData.password, fullNameClean, formData.rememberMe);

      if (result.success && result.status === "requires_2fa") {
        // Password verified — a real OTP has been emailed. Stay on this page;
        // `pendingTwoFactor` from context flips the UI to the verify step.
        setPendingRole(result.role || null);
        setIsLoading(false);
        return;
      }

      if (result.success && result.role) {
        if (result.role === "admin") {
          router.push("/dashboard/admin");
        } else if (result.role === "teacher") {
          router.push("/dashboard/teacher");
        } else {
          router.push("/dashboard/teacher");
        }
      } else {
        if (result.error) {
          setError(formatAuthError(result.error));
        } else {
          setError("Access denied. Please verify your credentials and account status.");
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setError(formatAuthError(err.code || err.message || ""));
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);

    const result = await verifyLoginTwoFactorCode(otpCode.trim());
    setOtpVerifying(false);

    if (!result.success) {
      setOtpError(result.error || "Invalid or expired code. Please try again.");
      return;
    }

    const role = result.role || pendingRole;
    if (role === "admin") {
      router.push("/dashboard/admin");
    } else {
      router.push("/dashboard/teacher");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || otpResending) return;
    setOtpResending(true);
    setOtpError(null);
    const result = await resendLoginTwoFactorCode();
    setOtpResending(false);

    if (!result.success) {
      setOtpError(result.error || "Failed to resend code. Please try again.");
      return;
    }
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleCancelTwoFactor = async () => {
    setOtpCode("");
    setOtpError(null);
    setIsLoading(false);
    await cancelTwoFactorLogin();
  };

  const forgotPasswordHref = `/auth/forgot-password?name=${encodeURIComponent(formData.name.trim())}&email=${encodeURIComponent(formData.email.trim().toLowerCase())}`;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 py-8 font-sans antialiased">
      <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[#F5E6C4] bg-[url('/bg-parchment.jpg')] bg-cover bg-center bg-no-repeat" />

      {/* FIXED BOUNDARIES MASTER FRAME - fluid height on mobile/tablet where panes stack, fixed height restored at md+ to match the original desktop design */}
      <div className="w-full max-w-5xl h-auto md:h-[640px] bg-white border border-slate-200/80 shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-[2rem] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Pane: Campus Image Backdrop with Warm Yellow Glassmorphic Gradient Overlay */}
        <div className="md:col-span-4 h-full p-6 flex flex-col justify-between relative text-amber-955 text-center md:text-left overflow-hidden border-b md:border-b-0 md:border-r border-amber-200 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500">
          <img 
            src="/images/school-building.jpg" 
            alt="School Campus" 
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none opacity-15"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_70%)] pointer-events-none" />
          
          {/* Symmetrical Logo Arrangement */}
          <div className="flex items-center justify-center md:justify-start gap-4 relative z-10">
            <img src="/logo.png" alt="HandSpeak Logo" className="h-16 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
            <div className="h-8 w-[1px] bg-amber-955/20" />
            <img src="/images/school-logo.png" alt="School Logo" className="h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
          </div>

          {/* Aesthetic Heading Area */}
          <div className="my-auto md:mb-12 relative z-10 pt-6 md:pt-0">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-amber-955">
              HandSpeak <br />
              <span className="text-gradient bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent block mt-1">Portal</span>
            </h2>
          </div>

          <div className="text-[10px] font-mono text-amber-955/60 uppercase tracking-widest relative z-10 hidden md:block font-bold">
          </div>
        </div>

        {/* Right Pane: 3D Interactive Console */}
        <div className="md:col-span-8 h-full p-6 sm:p-10 bg-white flex flex-col justify-between overflow-hidden">
          {pendingTwoFactor ? (
            <div className="w-full my-auto space-y-6">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6 text-amber-600" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Two-Factor Verification</h1>
                <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                  We sent a 6-digit code to{" "}
                  <strong className="text-slate-700">{pendingTwoFactor.maskedEmail}</strong>. Enter it below to
                  finish signing in.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Verification Code
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    disabled={otpVerifying}
                    className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 text-2xl font-mono text-center tracking-[0.5em] disabled:opacity-50"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/[^0-9]/g, ""));
                      setOtpError(null);
                    }}
                  />
                </div>

                {otpError && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {otpError}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-bold">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || otpResending}
                    className="text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {otpResending ? "Sending…" : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                  <span className="text-slate-400">Code expires in 5 minutes</span>
                </div>

                <button
                  type="submit"
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="w-full h-12 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:from-amber-700 active:to-amber-600 text-slate-955 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.3),_inset_0_-4px_0_rgba(0,0,0,0.15)] hover:shadow-[0_2px_5px_rgba(245,158,11,0.2),_inset_0_-2px_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] transform active:translate-y-0.5 transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {otpVerifying ? "Verifying…" : "Verify & Continue"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelTwoFactor}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors pt-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
              </form>
            </div>
          ) : (
          <div className="w-full my-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Sign In</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Please fill your workspace credentials</p>
            </div>

            {/* FORM WRAPPER SECURELY BOUND */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Full Name</label>
                <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                  <span className="pl-4 text-slate-400"><User size={18} /></span>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    disabled={isLoading}
                    className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none disabled:opacity-50"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email Address</label>
                <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                  <span className="pl-4 text-slate-400"><Mail size={18} /></span>
                  <input
                    type="email"
                    required
                    placeholder="john@handspeak.edu"
                    disabled={isLoading}
                    className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none disabled:opacity-50"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400 pr-4">
                  <span className="pl-4 text-slate-400"><Lock size={18} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none disabled:opacity-50"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Options Link Row */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded border-slate-300 focus:ring-0 cursor-pointer shadow-sm"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  />
                  <span className="group-hover:text-slate-900 transition-colors">Remember Me</span>
                </label>
                <Link href={forgotPasswordHref} className="text-slate-500 hover:text-amber-500 hover:underline transition-all">
                  Forgot Password?
                </Link>
              </div>

              {/* Error Message Section */}
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:from-amber-700 active:to-amber-600 text-slate-955 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.3),_inset_0_-4px_0_rgba(0,0,0,0.15)] hover:shadow-[0_2px_5px_rgba(245,158,11,0.2),_inset_0_-2px_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] transform active:translate-y-0.5 transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? "Verifying Profile..." : "Sign In"}
              </button>
            </form>
          </div>
          )}

          {/* Create Account Link Footer Anchor */}
          {!pendingTwoFactor && (
            <div className="mt-4 border-t border-slate-100 pt-4 text-center">
              <Link href="/auth/register" className="text-xs font-bold text-slate-500 hover:text-amber-500 hover:underline tracking-wide transition-all">
                Create New Registration Request
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}