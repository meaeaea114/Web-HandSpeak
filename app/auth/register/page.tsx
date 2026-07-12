"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Check, ChevronRight, ChevronLeft, User, Briefcase, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "", middleName: "", lastName: "", suffix: "",
    gender: "", birthDate: "",
    employeeId: "", facultyPosition: "", department: "", assignedGrade: "",
    assignedSections: [] as string[],
    email: "", username: "", password: "", confirmPassword: "",
    certify: false
  });

  const [files, setFiles] = useState({ idCopy: "", proofCopy: "" });
  const sectionsList = ["Section Alpha", "Section Beta", "Section Gamma", "Section Delta"];

  const toggleSection = (section: string) => {
    if (formData.assignedSections.includes(section)) {
      setFormData({
        ...formData,
        assignedSections: formData.assignedSections.filter((s) => s !== section)
      });
    } else {
      setFormData({ ...formData, assignedSections: [...formData.assignedSections, section] });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "idCopy" | "proofCopy") => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [field]: e.target.files[0].name });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (!formData.certify) {
      alert("Please certify your information accuracy before submitting.");
      return;
    }
    setIsSubmitted(true);
  };

  const renderTabTrigger = (id: string, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-150 ${
          isActive 
            ? "bg-amber-950 text-amber-400 shadow-[0_4px_12_rgba(0,0,0,0.15),_inset_0_-2px_0_rgba(0,0,0,0.2)] translate-x-1" 
            : "text-amber-950/70 hover:bg-amber-950/10 hover:text-amber-950"
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  if (isSubmitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-x-hidden font-sans antialiased">
        <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

        <div className="w-full max-w-xl bg-white shadow-2xl rounded-[2rem] p-8 text-center border border-slate-100 animate-fadeIn">
          <div className="w-16 h-16 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Transmitted</h2>
          <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed max-w-md mx-auto">
            Your credentials have been filed successfully under tracking identifier **{formData.employeeId || "Pending"}**.
          </p>
          <Link href="/auth/login" className="inline-flex items-center text-sm font-bold text-slate-955 bg-amber-500 hover:bg-amber-600 px-5 py-2.5 rounded-xl shadow-md transition-all">
            <ArrowLeft size={16} className="mr-1" /> Return to Portal Access
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      {/* Seamless, Non-Blurry Tiled Background Layer */}
      <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

      {/* FIXED HEIGHT MASTER FRAME */}
      <div className="w-full max-w-5xl h-[640px] bg-white border border-slate-200/80 shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-[2rem] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Side Navigation Control Panel */}
        <div className="md:col-span-4 h-full p-6 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-amber-200 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500">
          <img 
            src="/images/school-building.jpg" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none opacity-15"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_70%)] pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div>
              <Link href="/auth/login" className="inline-flex items-center text-xs font-bold text-amber-955 hover:underline gap-1 transition-all mb-4">
                <ArrowLeft size={14} /> Cancel Filing Portal
              </Link>
              <h1 className="text-xl font-black text-amber-955 tracking-tight leading-none">System Enrollment</h1>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-900/60 mt-1">Registration Workspace</p>
            </div>

            <nav className="space-y-2 pt-2">
              {renderTabTrigger("personal", "Personal Info", <User size={16} />)}
              {renderTabTrigger("employment", "Employment Data", <Briefcase size={16} />)}
              {renderTabTrigger("account", "Account Access", <ShieldCheck size={16} />)}
              {renderTabTrigger("documents", "Verification Link", <Upload size={16} />)}
            </nav>
          </div>

          <div className="flex items-center gap-3 relative z-10 pt-6 border-t border-amber-950/10 hidden md:flex">
            <img src="/logo.png" alt="System Logo" className="h-8 w-auto object-contain bg-amber-955/5 p-1 rounded-lg" />
            <img src="/images/school-logo.png" alt="School Logo" className="h-8 w-auto object-contain bg-amber-955/5 p-1 rounded-lg" />
            <div className="text-[9px] font-mono text-amber-955/60 uppercase tracking-widest leading-none font-bold">
            </div>
          </div>
        </div>

        {/* Right Side Input Console Zone */}
        <div className="md:col-span-8 h-full p-6 sm:p-10 bg-white flex flex-col justify-between overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between overflow-hidden">
            
            {/* Scroll Area Component */}
            <div className="flex-1 overflow-y-auto pr-2 max-h-[480px] space-y-6 scrollbar-thin">
              
              {/* SECTION 1: PERSONAL INFO */}
              {activeTab === "personal" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div className="mb-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Personal Profile Particulars</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Enter core identifiers exactly as printed on identity files.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="text" required placeholder="First Name" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="text" placeholder="Middle Name" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="text" required placeholder="Last Name" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Suffix</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="text" placeholder="e.g. Jr., III" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.suffix} onChange={(e) => setFormData({ ...formData, suffix: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select required className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Birth Date *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="date" required className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: EMPLOYMENT DATA */}
              {activeTab === "employment" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div className="mb-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Institutional Profile Scope</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Map account visibility variables within systemic role matrices.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">System / Employee ID *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="text" required placeholder="e.g. EMP-2026-99" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Portal Position Assignment *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select required className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer" value={formData.facultyPosition} onChange={(e) => setFormData({ ...formData, facultyPosition: e.target.value })}>
                          <option value="">Select Assignment</option>
                          <option value="Instructor">Instructor</option>
                          <option value="Administrator">Administrator / Staff</option>
                          <option value="Coordinator">Coordinator</option>
                          <option value="Specialist">Specialist</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Scope *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select required className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                          <option value="">Select Department</option>
                          <option value="CICS">College of Informatics and Computing Sciences</option>
                          <option value="CTE">College of Teacher Education</option>
                          <option value="CABEIHM">CABEIHM</option>
                        </select>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Grade Level *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select required className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer" value={formData.assignedGrade} onChange={(e) => setFormData({ ...formData, assignedGrade: e.target.value })}>
                          <option value="">Select Grade Level</option>
                          <option value="1st Year">1st Year College</option>
                          <option value="2nd Year">2nd Year College</option>
                          <option value="3rd Year">3rd Year College</option>
                          <option value="4th Year">4th Year College</option>
                        </select>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">Assigned Operational Sections *</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {sectionsList.map((section) => {
                          const isSelected = formData.assignedSections.includes(section);
                          return (
                            <button
                              key={section}
                              type="button"
                              onClick={() => toggleSection(section)}
                              className={`px-4 py-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-between shadow-sm ${
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-[0_3px_8px_rgba(245,158,11,0.35),_inset_0_-2px_0_rgba(0,0,0,0.15)] translate-y-[1px]"
                                  : "bg-slate-50 text-slate-600 border-slate-200 shadow-[1px_2px_2px_rgba(0,0,0,0.04)] hover:bg-slate-100"
                              }`}
                            >
                              <span>{section}</span>
                              {isSelected && <Check size={14} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: ACCOUNT ACCESS */}
              {activeTab === "account" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div className="mb-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Security Access Profiles</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Configure authentication rules and institutional communication nodes.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email Address *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="email" required placeholder="user@handspeak.edu" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input type="text" required placeholder="system_username" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                        <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                          <input type="password" required placeholder="••••••••" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                        <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                          <input type="password" required placeholder="••••••••" className="w-full mx-5 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: VERIFICATION DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div className="mb-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Identity Filing Proof</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Attach high-resolution file proofs to finish the system account process request.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Upload Identification Copy *</label>
                      <label className="group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all text-center px-4 shadow-sm">
                        <Upload size={20} className="text-slate-400 group-hover:text-amber-500 transition-all mb-1" />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 max-w-xs truncate">
                          {files.idCopy ? files.idCopy : "Select ID Scan (PDF/PNG)"}
                        </span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => handleFileChange(e, "idCopy")} required={!files.idCopy} />
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Upload Verification Proof Document *</label>
                      <label className="group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all text-center px-4 shadow-sm">
                        <Upload size={20} className="text-slate-400 group-hover:text-amber-500 transition-all mb-1" />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 max-w-xs truncate">
                          {files.proofCopy ? files.proofCopy : "Select Documentation Copy"}
                        </span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => handleFileChange(e, "proofCopy")} required={!files.proofCopy} />
                      </label>
                    </div>

                    <label className="flex items-start space-x-2 cursor-pointer select-none border-t border-slate-100 pt-3 mt-2">
                      <input type="checkbox" className="w-4 h-4 text-amber-500 accent-amber-500 rounded border-slate-300 focus:ring-0 mt-0.5" checked={formData.certify} onChange={(e) => setFormData({ ...formData, certify: e.target.checked })} />
                      <span className="text-xs font-semibold text-slate-600 leading-relaxed">
                        I certify that all records correspond exactly to actual dynamic institutional system profiles.
                      </span>
                    </label>
                  </div>
                </div>
              )}

            </div>

            {/* Navigation Buttons Footer */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 bg-white z-10">
              {activeTab !== "personal" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "documents") setActiveTab("account");
                    else if (activeTab === "account") setActiveTab("employment");
                    else if (activeTab === "employment") setActiveTab("personal");
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 shadow-[0_3px_6px_rgba(0,0,0,0.05),_inset_0_-2px_0_rgba(0,0,0,0.1)] active:translate-y-0.5 active:shadow-inner transition-all duration-100"
                >
                  <ChevronLeft size={16} /> Backward Section
                </button>
              ) : (
                <div />
              )}

              {activeTab !== "documents" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "personal") setActiveTab("employment");
                    else if (activeTab === "employment") setActiveTab("account");
                    else if (activeTab === "account") setActiveTab("documents");
                  }}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-[0_4px_12_rgba(245,158,11,0.2),_inset_0_-3px_0_rgba(0,0,0,0.15)] transform active:translate-y-0.5 transition-all duration-100 ml-auto"
                >
                  Forward Section <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_12_rgba(15,23,42,0.15),_inset_0_-3px_0_rgba(0,0,0,0.2)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] transform active:translate-y-0.5 transition-all duration-100 ml-auto"
                >
                  Transmit Filing Request
                </button>
              )}
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}