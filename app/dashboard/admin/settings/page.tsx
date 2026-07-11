'use client';

import { useState } from 'react';
import { Upload, Eye, EyeOff, ShieldCheck, ShieldAlert, Monitor, Download, KeyRound, UserCog } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [fullName, setFullName] = useState('Mea Angel S. Magpantay');
  const [contactNumber, setContactNumber] = useState('+1 (555) 000-0000');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const handleSaveAllChanges = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Security matrix updates and administrative parameters saved successfully!');
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto">
      {/* 
        Unified space-maximizing grid. 
        Forms scale across 2 columns on large monitors, while short utility panels 
        stack efficiently on the left column to fill vertical gaps seamlessly.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Vertically stacked elements to eliminate empty space */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Profile Picture Panel */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-md text-center space-y-4 flex flex-col items-center">
            <h3 className="font-black text-[#521903] text-sm text-left w-full border-b pb-2 tracking-tight">
              Profile Picture
            </h3>
            
            <div className="h-44 w-44 rounded-xl bg-slate-50 border-2 border-[#F8B936] flex items-center justify-center relative shadow-inner overflow-hidden my-2">
              <div className="h-16 w-16 bg-[#521903]/10 rounded-full flex items-center justify-center text-[#521903]">
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5-3-8-3z"/>
                </svg>
              </div>
            </div>

            <button className="w-full bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 border-b-4 border-[#DC8C18] transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs shadow-md">
              <Upload className="h-4 w-4" /> Upload Photo
            </button>
            <p className="text-[10px] text-slate-400 font-bold tracking-wide">JPG, PNG up to 5MB</p>
          </div>

          {/* Security Token Logs (Moved up directly under Profile Picture) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-md space-y-4">
            <h4 className="font-black text-sm text-[#521903] uppercase tracking-wider flex items-center gap-2">
              <Monitor className="h-4 w-4 text-[#F8B936]" /> Security Token Logs
            </h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Tanauan City, PH</p>
                  <p className="text-slate-400 font-semibold text-[10px]">Chrome • Windows Dashboard</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-black uppercase">Active</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-xl opacity-70">
                <div>
                  <p className="font-bold text-slate-800">Malvar Campus Workspace</p>
                  <p className="text-slate-400 font-semibold text-[10px]">Safari • Mobile App Sandbox</p>
                </div>
                <span className="text-slate-400 font-semibold text-[10px]">3 days ago</span>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                {twoFactorEnabled ? <ShieldCheck className="text-emerald-500 h-4 w-4" /> : <ShieldAlert className="text-[#9F4409] h-4 w-4" />}
                2-Factor Auth (2FA)
              </span>
              <button 
                type="button" 
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)} 
                className="text-[#DC8C18] font-black hover:underline text-xs"
              >
                Toggle State
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Takes up 2 columns to comfortably display long configuration inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Information Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-md space-y-4">
            <h3 className="font-black text-[#521903] text-base border-b pb-2 tracking-tight flex items-center gap-2">
              <UserCog className="h-5 w-5 text-[#F8B936]" /> Update Your Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Super Admin"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Contact Number</label>
                <input 
                  type="text" 
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Change Password Block & Actions */}
          <form onSubmit={handleSaveAllChanges} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-md space-y-4">
            <h3 className="font-black text-[#521903] text-base border-b pb-2 tracking-tight flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#F8B936]" /> Change Password
            </h3>
            <p className="text-[11px] text-slate-400 font-bold">Leave blank if you don't want to change your password</p>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    placeholder="Enter current password"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
                  />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm new password"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black py-3 rounded-xl border-b-4 border-[#DC8C18] shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-sm"
              >
                Save All Changes
              </button>
            </div>
          </form>

          {/* Disaster Recovery (Placed directly at the bottom right to complete the column layout flow) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h4 className="font-black text-sm text-[#521903] uppercase tracking-wider flex items-center gap-2">
                <Download className="h-4 w-4 text-[#F8B936]" /> System Disaster Recovery
              </h4>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Export comprehensive database snapshots of student registries, FSL gesture dictionary weights, and support log pipelines for cold vault backups.
              </p>
            </div>

            <button 
              type="button" 
              onClick={() => alert('Compiling directory snapshots... HandSpeak backup zip generated.')}
              className="w-full bg-[#521903] hover:bg-[#9F4409] text-white font-black py-2.5 rounded-xl border-b-4 border-black transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 text-xs shadow-md flex items-center justify-center gap-2"
            >
              <Download className="h-3.5 w-3.5" /> Compile Database Backup (.SQL)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}