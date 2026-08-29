"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { resetPassword } from "@/lib/auth-service";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryName = searchParams.get("name");
    const queryEmail = searchParams.get("email");
    if (queryName) setName(queryName);
    if (queryEmail) setEmail(queryEmail);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErrorMessage("Please enter the Full Name registered with your account.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter your registered institutional email address.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(cleanName, cleanEmail);
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to process password reset request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full my-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
          {isSubmitted
            ? "VERIFICATION LINK DISPATCHED"
            : "ENTER YOUR REGISTERED NAME AND EMAIL TO VERIFY IDENTITY"}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
              Reset Link Sent!
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              We&apos;ve verified your identity and sent password reset instructions to{" "}
              <strong className="text-emerald-950">{email}</strong>. Please check your inbox and spam folder.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setErrorMessage(null);
            }}
            className="w-full text-center text-xs font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wider py-2"
          >
            Verify another account
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Registered Full Name
            </label>
            <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
              <span className="pl-4 text-slate-400"><User size={18} /></span>
              <input
                type="text"
                required
                placeholder="e.g. Maria Santos"
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Registered Email Address
            </label>
            <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
              <span className="pl-4 text-slate-400"><Mail size={18} /></span>
              <input
                type="email"
                required
                placeholder="name@school.edu.ph"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:from-amber-700 active:to-amber-600 text-slate-955 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.3),_inset_0_-4px_0_rgba(0,0,0,0.15)] hover:shadow-[0_2px_5px_rgba(245,158,11,0.2),_inset_0_-2px_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] transform active:translate-y-0.5 transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Verifying Account...</span>
              </span>
            ) : (
              "Verify & Send Reset Link"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[#F5E6C4] bg-[url('/bg-parchment.jpg')] bg-repeat" />

      {/* FIXED BOUNDARIES MASTER FRAME - fluid height on mobile/tablet where panes stack, fixed height restored at md+ to match the original desktop design */}
      <div className="w-full max-w-5xl h-auto md:h-[640px] bg-white border border-slate-200/80 shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-[2rem] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Pane: Campus Image Backdrop */}
        <div className="md:col-span-4 h-full p-6 flex flex-col justify-between relative text-amber-955 text-center md:text-left overflow-hidden border-b md:border-b-0 md:border-r border-amber-200 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500">
          <img 
            src="/images/school-building.jpg" 
            alt="School Campus" 
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none opacity-15"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_70%)] pointer-events-none" />
          
          {/* Logo Arrangement */}
          <div className="flex items-center justify-center md:justify-start gap-4 relative z-10">
            <img src="/logo.png" alt="HandSpeak Logo" className="h-16 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
            <div className="h-8 w-[1px] bg-amber-955/20" />
            <img src="/images/school-logo.png" alt="School Logo" className="h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
          </div>

          <div className="my-auto md:mb-12 relative z-10 pt-6 md:pt-0">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-amber-955">
              HandSpeak <br />
              <span className="text-gradient bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent block mt-1">Portal</span>
            </h2>
            <p className="text-xs font-bold tracking-wider text-amber-955/80 uppercase mt-2">
              Password Recovery
            </p>
          </div>

          <div className="text-[10px] font-mono text-amber-955/60 uppercase tracking-widest relative z-10 hidden md:block font-bold">
          </div>
        </div>

        {/* Right Pane */}
        <div className="md:col-span-8 h-full p-6 sm:p-10 bg-white flex flex-col justify-between overflow-hidden">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>}>
            <ForgotPasswordForm />
          </Suspense>

          <div className="mt-4 border-t border-slate-100 pt-4 text-center">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-all uppercase tracking-wider"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}