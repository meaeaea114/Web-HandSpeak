'use client';

import React, { useState } from 'react';
import { Upload, User, Phone, Briefcase, Lock, Save, Eye, EyeOff } from 'lucide-react';

export default function TeacherSettingsPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full h-full flex flex-col gap-4 font-sans antialiased text-[#521903] overflow-hidden">
      
      {/* HEADER STRIP */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 p-4 shadow-sm flex-shrink-0">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Account & Profile Settings</h2>
      </div>

      {/* TWO-PANEL SPLIT GRID */}
      <div className="w-full flex-1 grid grid-cols-12 gap-5 overflow-hidden">
        
        {/* LEFT PANEL: PROFILE PICTURE */}
        <div className="col-span-4 bg-white/70 backdrop-blur-md rounded-[28px] border border-white/50 p-6 flex flex-col items-center gap-6 shadow-sm">
          <div className="w-48 h-48 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-inner overflow-hidden">
            <User className="h-20 w-20 text-slate-300" />
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md">
            <Upload className="h-4 w-4" /> Upload Photo
          </button>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JPG, PNG up to 5MB</p>
        </div>

        {/* RIGHT PANEL: UPDATES FORM */}
        <div className="col-span-8 bg-white/70 backdrop-blur-md rounded-[28px] border border-white/50 p-8 shadow-sm flex flex-col overflow-y-auto max-h-[480px] space-y-8">
          
          {/* USER INFORMATION SECTION */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-100 pb-2">Update Your Information</h3>
            <div className="grid grid-cols-1 gap-4 text-xs font-bold">
              <input type="text" placeholder="Full Name (e.g., Ms. Teacher)" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-[#F2B33D]/40 outline-none transition-all" />
              <input type="text" placeholder="Contact Number (+63...)" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-[#F2B33D]/40 outline-none transition-all" />
              <input type="text" placeholder="Department / Assigned Section (e.g., SNED, Grade 4-A)" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-[#F2B33D]/40 outline-none transition-all" />
            </div>
          </div>

          {/* PASSWORD SECTION */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-100 pb-2">Change Password</h3>
            <div className="grid grid-cols-1 gap-4 text-xs font-bold relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Current Password" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-[#F2B33D]/40 outline-none transition-all" />
              <input type={showPassword ? 'text' : 'password'} placeholder="New Password (min 6 characters)" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-[#F2B33D]/40 outline-none transition-all" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Confirm New Password" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-[#F2B33D]/40 outline-none transition-all" />
              
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[85px] text-slate-400 hover:text-[#521903]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button className="w-full bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md mt-4">
            Save All Changes
          </button>
        </div>

      </div>
    </div>
  );
}