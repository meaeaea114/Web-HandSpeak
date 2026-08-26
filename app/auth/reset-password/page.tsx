"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  Check, 
  X 
} from "lucide-react";
import { verifyResetCode, completePasswordReset } from "@/lib/auth-service";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");

  const [verifyingCode, setVerifyingCode] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate the Firebase Action Code on mount
  useEffect(() => {
    async function validateOobCode() {
      if (!oobCode || (mode && mode !== "resetPassword")) {
        setCodeError("Invalid or missing password reset link. Please request a new one.");
        setVerifyingCode(false);
        return;
      }

      try {
        const userEmail = await verifyResetCode(oobCode);
        setAccountEmail(userEmail);
      } catch (err: any) {
        setCodeError(err?.message || "This password reset link has expired or has already been used.");
      } finally {
        setVerifyingCode(false);
      }
    }

    validateOobCode();
  }, [oobCode, mode]);

  // Real-time password restriction checklist
  const criteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      passwordsMatch: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const isFormValid =
    criteria.minLength &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSymbol &&
    criteria.passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!oobCode) {
      setFormError("Reset code is missing. Please request a new link.");
      return;
    }

    if (!isFormValid) {
      if (!criteria.passwordsMatch) {
        setFormError("Passwords do not match. Please verify both fields.");
      } else {
        setFormError("Please ensure your password satisfies all security requirements listed below.");
      }
      return;
    }

    setSubmitting(true);

    try {
      await completePasswordReset(oobCode, password);
      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err?.message || "Failed to update your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f5eccd] bg-[url('/bg-parchment.jpg')] bg-cover bg-center bg-fixed relative overflow-hidden font-sans">
      {/* Background Ambience Tint */}
      <div className="absolute inset-0 bg-[#e8d89e]/30 backdrop-blur-[1px] pointer-events-none" />

      {/* Main Split Card (Identical to Login Page) */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-[#ecd997]/60 min-h-[560px]">
        
        {/* Left Branding Hero Column */}
        <div className="md:col-span-5 relative bg-gradient-to-br from-[#f5a623] via-[#e69512] to-[#cb7f04] p-8 sm:p-10 flex flex-col justify-between overflow-hidden text-slate-900">
          <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-[url('/images/school-building.jpg')] bg-cover bg-center pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5 pointer-events-none" />

          {/* Institutional Logos */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/90 p-1.5 shadow-md flex items-center justify-center backdrop-blur-sm">
              <Image
                src="/images/school-logo.png"
                alt="School Logo"
                width={40}
                height={40}
                style={{ width: "auto", height: "auto" }}
                className="object-contain"
                priority
              />
            </div>
            <div className="w-12 h-12 rounded-full bg-white/90 p-1.5 shadow-md flex items-center justify-center backdrop-blur-sm">
              <Image
                src="/favicon.png"
                alt="HandSpeak Logo"
                width={36}
                height={36}
                style={{ width: "auto", height: "auto" }}
                className="object-contain"
              />
            </div>
          </div>

          {/* Hero Branding Title */}
          <div className="relative z-10 mt-16 md:mt-0">
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-slate-900 leading-tight">
              HandSpeak
              <br />
              <span className="text-slate-800 font-bold">Portal</span>
            </h1>
            <p className="mt-2 text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-800/80 uppercase">
              Secure Password Update
            </p>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div className="w-full max-w-md mx-auto my-auto">
            
            {/* Loading Verification State */}
            {verifyingCode ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#e69512]" />
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                  Validating security link...
                </p>
              </div>
            ) : codeError ? (
              /* Invalid or Expired Token State */
              <div className="space-y-6 text-center animate-in fade-in">
                <div className="p-6 rounded-2xl bg-red-50 border border-red-200">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-sm font-bold text-red-950 uppercase tracking-wide">
                    Invalid or Expired Link
                  </h2>
                  <p className="text-xs text-red-800/90 mt-2 leading-relaxed">
                    {codeError}
                  </p>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="inline-block py-3 px-6 bg-gradient-to-r from-[#f5a623] to-[#e69512] hover:from-[#e69512] hover:to-[#cb7f04] text-slate-950 font-bold text-xs uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
                >
                  Request a New Reset Link
                </Link>
              </div>
            ) : isSuccess ? (
              /* Success Confirmation State */
              <div className="space-y-6 text-center animate-in fade-in duration-300">
                <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-serif font-bold text-emerald-950">
                    Password Reset Successful
                  </h2>
                  <p className="text-xs text-emerald-800/90 mt-2 leading-relaxed">
                    Your password has been updated. You can now use your new credentials to sign in to HandSpeak.
                  </p>
                </div>

                <Link
                  href="/auth/login"
                  className="w-full inline-block py-3.5 px-4 bg-gradient-to-r from-[#f5a623] to-[#e69512] hover:from-[#e69512] hover:to-[#cb7f04] text-slate-950 font-bold text-xs uppercase tracking-widest rounded-full shadow-md transition-all text-center cursor-pointer"
                >
                  Continue to Sign In
                </Link>
              </div>
            ) : (
              /* Password Reset Inputs */
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#64748b] uppercase mt-1">
                    {accountEmail ? `FOR ${accountEmail}` : "ENTER YOUR NEW SECURE CREDENTIALS"}
                  </p>
                </div>

                {formError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                    <span className="leading-relaxed font-medium">{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password Input */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-password"
                      className="block text-[11px] font-bold tracking-wider text-[#475569] uppercase"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoFocus
                        className="w-full pl-11 pr-11 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password"
                      className="block text-[11px] font-bold tracking-wider text-[#475569] uppercase"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full pl-11 pr-11 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Security Restrictions Checklist */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] space-y-1.5 text-slate-600">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-1">
                      Password Requirements
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-1.5 ${criteria.minLength ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                        {criteria.minLength ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.hasUpper ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                        {criteria.hasUpper ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.hasLower ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                        {criteria.hasLower ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                        {criteria.hasNumber ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.hasSymbol ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                        {criteria.hasSymbol ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                        <span>One symbol (!@#$%^&*)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${criteria.passwordsMatch ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                        {criteria.passwordsMatch ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                        <span>Passwords match</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#f5a623] to-[#e69512] hover:from-[#e69512] hover:to-[#cb7f04] text-slate-950 font-bold text-xs uppercase tracking-widest rounded-full shadow-md shadow-[#f5a623]/30 hover:shadow-lg hover:shadow-[#f5a623]/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>RESET PASSWORD</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Bottom Back Link */}
          <div className="mt-6 pt-4 flex items-center justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f5eccd]">
          <Loader2 className="w-8 h-8 animate-spin text-[#e69512]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}