"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your registered institutional email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send reset link. Please try again.");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f5eccd] bg-[url('/bg-parchment.jpg')] bg-cover bg-center bg-fixed relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[#e8d89e]/30 backdrop-blur-[1px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-[#ecd997]/60 min-h-[500px]">
        {/* Left Hero Column */}
        <div className="md:col-span-5 relative bg-gradient-to-br from-[#f5a623] via-[#e69512] to-[#cb7f04] p-8 sm:p-10 flex flex-col justify-between overflow-hidden text-slate-900">
          <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-[url('/images/school-building.jpg')] bg-cover bg-center pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5 pointer-events-none" />

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

          <div className="relative z-10 mt-16 md:mt-0">
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-slate-900 leading-tight">
              HandSpeak
              <br />
              <span className="text-slate-800 font-bold">Portal</span>
            </h1>
            <p className="mt-2 text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-800/80 uppercase">
              Password Recovery
            </p>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div className="w-full max-w-md mx-auto my-auto">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                Reset Password
              </h2>
              <p className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#64748b] uppercase mt-1">
                {isSubmitted
                  ? "VERIFICATION LINK DISPATCHED"
                  : "PLEASE ENTER YOUR REGISTERED INSTITUTIONAL EMAIL"}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {isSubmitted ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                    Reset Link Sent!
                  </h3>
                  <p className="text-xs text-emerald-800/90 mt-2 leading-relaxed">
                    We&apos;ve sent password reset instructions to{" "}
                    <span className="font-semibold text-emerald-950">{email}</span>. Check your inbox and spam folder.
                  </p>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-[#e69512] hover:text-[#cb7f04] uppercase tracking-wider transition-colors"
                  >
                    Resend to another email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-bold tracking-wider text-[#475569] uppercase"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@handspeak.edu"
                      required
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#f5a623] to-[#e69512] hover:from-[#e69512] hover:to-[#cb7f04] text-slate-950 font-bold text-xs uppercase tracking-widest rounded-full shadow-md shadow-[#f5a623]/30 hover:shadow-lg hover:shadow-[#f5a623]/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>SENDING LINK...</span>
                    </>
                  ) : (
                    <span>SEND RESET LINK</span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-center justify-center">
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