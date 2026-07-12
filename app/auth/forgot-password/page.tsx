"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldAlert, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Password updated successfully!");
    window.location.href = "/auth/login";
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      {/* Seamless Background Anchor Layer */}
      <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

      {/* FIXED HEIGHT MASTER FRAME (Matching Login and Register dimensions exactly) */}
      <div className="w-full max-w-5xl h-[640px] bg-white border border-slate-200/80 shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-[2rem] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Pane: Campus Image Backdrop with Warm Yellow Glassmorphic Gradient Overlay */}
        <div className="md:col-span-4 h-full p-6 flex flex-col justify-between relative text-amber-955 text-center md:text-left overflow-hidden border-b md:border-b-0 md:border-r border-amber-200 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500">
          {/* Base Layer: School Building Photo */}
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
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-amber-950">
              Account<br />
              <span className="text-gradient bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent block mt-1">Recovery</span>
            </h2>
          </div>

          <div className="text-[10px] font-mono text-amber-955/60 uppercase tracking-widest relative z-10 hidden md:block font-bold">
            Dual Security Verified
          </div>
        </div>

        {/* Right Pane: 3D Interactive Console */}
        <div className="md:col-span-8 h-full p-6 sm:p-10 bg-white flex flex-col justify-between overflow-hidden">
          {/* Centralized inner form grid container layer preventing clipping */}
          <div className="w-full my-auto space-y-6">
            <div>
              <Link href="/auth/login" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-amber-700 gap-1 mb-4 transition-colors">
                <ArrowLeft size={14} /> Back to Login
              </Link>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {step === 1 ? "Identify Identity" : "Reset Credentials"}
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {step === 1 ? "Verify your system identity profile" : "Configure your new secure passcode"}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={handleSendReset} className="space-y-5">
                {/* HCI Safety Notice Box */}
                <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-2.5 text-slate-600 text-xs font-semibold border border-slate-100 leading-relaxed shadow-[1px_1px_2px_rgba(0,0,0,0.02)]">
                  <ShieldAlert size={18} className="shrink-0 text-amber-500 mt-0.5" />
                  <span>Enter your registered profile email address. We will forward a confirmation verification token to safely reset credentials.</span>
                </div>

                {/* Email Input Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Mail size={16} /></span>
                    <input type="email" required placeholder="user@handspeak.edu" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 text-sm shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] transition-all" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>

                {/* Tactile 3D Action Submit Button */}
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:from-amber-700 active:to-amber-600 text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_4px_10px_rgba(245,158,11,0.25),_inset_0_-3px_0_rgba(0,0,0,0.1)] transform active:translate-y-[2px] transition-all">
                  Send Token Code
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                {/* Verification Token Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Verification Token *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><KeyRound size={16} /></span>
                    <input type="text" required placeholder="Enter Token Code" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 text-sm shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] transition-all" value={token} onChange={e => setToken(e.target.value)} />
                  </div>
                </div>

                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                  <input type="password" required placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 text-sm shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] transition-all" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>

                {/* Tactile 3D Action Submit Button */}
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_4px_10px_rgba(245,158,11,0.25),_inset_0_-3px_0_rgba(0,0,0,0.1)] transform active:translate-y-[2px] transition-all">
                  Change Password
                </button>
              </form>
            )}
          </div>
          {/* Bottom layout buffer layout block */}
          <div className="w-full h-4" />
        </div>

      </div>
    </div>
  );
}