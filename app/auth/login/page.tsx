"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context"; // Integrated your HandSpeak Authentication context
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

export default function LoginPage() {
  const useRouterInstance = useRouter();
  const { login } = useAuth(); // Destructured the backend auth provider login method
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(""); // Track local authentication exceptions
  const [formData, setFormData] = useState({ name: "", email: "", password: "", rememberMe: false });

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setError("");
  setIsLoading(true);

  const success = await login(
  formData.email.trim().toLowerCase(),
  formData.password
  );

  console.log("Login success:", success);

  if (!success) {
    setError("Invalid email or password.");
    setIsLoading(false);
    return;
  }

  if (formData.email === "admin@handspeak.edu") {
    useRouterInstance.replace("/dashboard/admin");
  } else {
    useRouterInstance.replace("/dashboard/teacher");
  }
};

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      {/* Seamless, Non-Blurry Tiled Background Layer */}
      <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

      {/* FIXED BOUNDARIES MASTER FRAME */}
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
                    className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
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
                    className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
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
                    className="w-full mx-3 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
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
                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded border-slate-300 focus:ring-0 cursor-pointer shadow-sm shadow-inner"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  />
                  <span className="group-hover:text-slate-900 transition-colors">Remember Me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-slate-500 hover:text-amber-500 hover:underline transition-all">
                  Forgot Password?
                </Link>
              </div>

              {/* Error Message Section */}
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              {/* Premium 3D Action Submit Button with Active Loading State */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:from-amber-700 active:to-amber-600 text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.3),_inset_0_-4px_0_rgba(0,0,0,0.15)] hover:shadow-[0_2px_5px_rgba(245,158,11,0.2),_inset_0_-2px_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] transform active:translate-y-0.5 transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? "Verifying Profile..." : "Sign In"}
              </button>
            </form>
          </div>

          {/* Create Account Link Footer Anchor */}
          <div className="mt-4 border-t border-slate-100 pt-4 text-center">
            <Link href="/auth/register" className="text-xs font-bold text-slate-500 hover:text-amber-500 hover:underline tracking-wide transition-all">
              Create New Registration Request
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}