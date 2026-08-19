"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  Briefcase,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  X,
  FileCheck,
} from "lucide-react";
import {
  submitAccountRequest,
  formatAuthError,
  NAME_REGEX,
  EMPLOYEE_ID_REGEX,
  APPROVED_INSTITUTIONAL_DOMAINS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "@/lib/auth-service";

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<"personal" | "employment" | "account" | "documents">("personal");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTrackingId, setSubmittedTrackingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "None",
    employeeId: "",
    facultyPosition: "Teacher",
    department: "Special Education (SPED)",
    assignedGrade: "Kindergarten",
    assignedSections: [] as string[],
    email: "",
    password: "",
    confirmPassword: "",
    certify: false,
  });

  const [newSectionInput, setNewSectionInput] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const sanitizeNameInput = (input: string): string => {
    return input.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'-]/g, "");
  };

  const sanitizeEmployeeIdInput = (input: string): string => {
    return input.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
  };

  const sanitizeEmailInput = (input: string): string => {
    return input.replace(/[^a-zA-Z0-9.@_+-]/g, "").toLowerCase();
  };

  const hasMinLength = formData.password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(formData.password);
  const hasLowerCase = /[a-z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password);
  const doesNotContainId =
    !formData.employeeId.trim() ||
    !formData.password.toLowerCase().includes(formData.employeeId.toLowerCase().trim());
  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && doesNotContainId;
  const doPasswordsMatch = formData.password.length > 0 && formData.password === formData.confirmPassword;

  const generateEmailSuggestion = (first: string, last: string) => {
    const cleanFirst = first.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = last.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanFirst && cleanLast) {
      return `${cleanFirst}.${cleanLast}@${APPROVED_INSTITUTIONAL_DOMAINS[0]}`;
    } else if (cleanFirst) {
      return `${cleanFirst}@${APPROVED_INSTITUTIONAL_DOMAINS[0]}`;
    }
    return "";
  };

  const handleFirstNameChange = (val: string) => {
    const sanitized = sanitizeNameInput(val);
    setFormData((prev) => {
      const updated = { ...prev, firstName: sanitized };
      if (!isEmailManuallyEdited) {
        updated.email = generateEmailSuggestion(sanitized, prev.lastName);
      }
      return updated;
    });
  };

  const handleLastNameChange = (val: string) => {
    const sanitized = sanitizeNameInput(val);
    setFormData((prev) => {
      const updated = { ...prev, lastName: sanitized };
      if (!isEmailManuallyEdited) {
        updated.email = generateEmailSuggestion(prev.firstName, sanitized);
      }
      return updated;
    });
  };

  const handleAddSection = () => {
    const trimmed = newSectionInput.trim().replace(/[^a-zA-Z0-9\s-]/g, "");
    if (trimmed && !formData.assignedSections.includes(trimmed)) {
      setFormData({
        ...formData,
        assignedSections: [...formData.assignedSections, trimmed],
      });
      setNewSectionInput("");
    }
  };

  const handleRemoveSection = (sectionName: string) => {
    setFormData({
      ...formData,
      assignedSections: formData.assignedSections.filter((s) => s !== sectionName),
    });
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>, type: "id" | "proof") => {
    setError(null);
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Invalid file type. Allowed formats: PDF, PNG, JPG, JPEG.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File exceeds maximum allowed size of 5 MB.");
      return;
    }

    if (type === "id") {
      setIdFile(file);
    } else {
      setProofFile(file);
    }
  };

  const validateStep = (tab: "personal" | "employment" | "account" | "documents"): boolean => {
    setError(null);

    if (tab === "personal") {
      if (!formData.firstName.trim()) {
        setError("First Name is required.");
        return false;
      }
      if (!NAME_REGEX.test(formData.firstName.trim())) {
        setError("First Name must contain letters only (2-50 characters).");
        return false;
      }
      if (formData.middleName && formData.middleName.trim() && !NAME_REGEX.test(formData.middleName.trim())) {
        setError("Middle Name contains invalid characters.");
        return false;
      }
      if (!formData.lastName.trim()) {
        setError("Last Name is required.");
        return false;
      }
      if (!NAME_REGEX.test(formData.lastName.trim())) {
        setError("Last Name must contain letters only (2-50 characters).");
        return false;
      }
    }

    if (tab === "employment") {
      if (!formData.employeeId.trim()) {
        setError("Employee / Personnel ID is required.");
        return false;
      }
      if (!EMPLOYEE_ID_REGEX.test(formData.employeeId.trim())) {
        setError("Employee ID must contain alphanumeric characters and hyphens only.");
        return false;
      }
      if (formData.assignedSections.length === 0) {
        setError("Please add at least one assigned class section.");
        return false;
      }
    }

    if (tab === "account") {
      if (!formData.email.trim()) {
        setError("Institutional Email Address is required.");
        return false;
      }
      const domain = formData.email.trim().toLowerCase().split("@")[1];
      if (!domain || !APPROVED_INSTITUTIONAL_DOMAINS.includes(domain)) {
        setError(`Please use your official institutional email (e.g. @${APPROVED_INSTITUTIONAL_DOMAINS[0]}).`);
        return false;
      }
      if (!isPasswordValid) {
        setError("Password does not satisfy all complexity requirements.");
        return false;
      }
      if (!doPasswordsMatch) {
        setError("Passwords do not match.");
        return false;
      }
    }

    return true;
  };

  const handleNextTab = () => {
    if (!validateStep(activeTab)) return;

    if (activeTab === "personal") setActiveTab("employment");
    else if (activeTab === "employment") setActiveTab("account");
    else if (activeTab === "account") setActiveTab("documents");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep("personal")) { setActiveTab("personal"); return; }
    if (!validateStep("employment")) { setActiveTab("employment"); return; }
    if (!validateStep("account")) { setActiveTab("account"); return; }

    if (!idFile) {
      setError("Official Identification Document is required.");
      setActiveTab("documents");
      return;
    }

    if (!formData.certify) {
      setError("You must certify the accuracy of your submitted details.");
      setActiveTab("documents");
      return;
    }

    setIsLoading(true);

    try {
      const response = await submitAccountRequest({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        suffix: formData.suffix,
        email: formData.email,
        password: formData.password,
        employeeId: formData.employeeId,
        facultyPosition: formData.facultyPosition,
        department: formData.department,
        assignedGrade: formData.assignedGrade,
        assignedSections: formData.assignedSections,
        idFile,
        proofFile,
      });

      setSubmittedTrackingId(response.trackingId);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err.message || formatAuthError(err.code || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabTrigger = (id: "personal" | "employment" | "account" | "documents", label: string, icon: React.ReactNode) => {
    const isActive = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => {
          if (validateStep(activeTab) || id === "personal") {
            setActiveTab(id);
          }
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-150 ${
          isActive
            ? "bg-amber-950 text-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.15),_inset_0_-2px_0_rgba(0,0,0,0.2)] translate-x-1"
            : "text-amber-950/70 hover:bg-amber-950/10 hover:text-amber-950"
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  if (isSubmitted) {
    const fullNameDisplay = [
      formData.firstName.trim(),
      formData.lastName.trim(),
      formData.suffix !== "None" ? formData.suffix : ""
    ].filter(Boolean).join(" ");

    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-x-hidden font-sans antialiased">
        <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

        <div className="w-full max-w-xl bg-white shadow-2xl rounded-[2rem] p-8 text-center border border-slate-100 animate-fadeIn">
          <div className="w-16 h-16 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Transmitted</h2>
          <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed max-w-md mx-auto">
            Account filing received for <strong>{fullNameDisplay}</strong>. Your request is now recorded under Tracking ID <strong className="text-amber-600">{submittedTrackingId}</strong> and is pending administrator review in Account Management.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 px-5 py-2.5 rounded-xl shadow-md transition-all"
          >
            <ArrowLeft size={16} className="mr-1" /> Return to Portal Access
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
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
              <Link href="/auth/login" className="inline-flex items-center text-xs font-bold text-amber-950 hover:underline gap-1 transition-all mb-4">
                <ArrowLeft size={14} /> Cancel Registration
              </Link>
              <h1 className="text-xl font-black text-amber-950 tracking-tight leading-none">Faculty Enrollment</h1>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-900/70 mt-1">Institutional Workspace</p>
            </div>

            <nav className="space-y-2 pt-2">
              {renderTabTrigger("personal", "Personal Identity", <User size={16} />)}
              {renderTabTrigger("employment", "Employment & Scope", <Briefcase size={16} />)}
              {renderTabTrigger("account", "Account Access", <ShieldCheck size={16} />)}
              {renderTabTrigger("documents", "Document Upload", <Upload size={16} />)}
            </nav>
          </div>

          <div className="flex items-center gap-3 relative z-10 pt-6 border-t border-amber-950/10 hidden md:flex">
            <img src="/logo.png" alt="System Logo" className="h-8 w-auto object-contain bg-amber-950/5 p-1 rounded-lg" />
            <img src="/images/school-logo.png" alt="School Logo" className="h-8 w-auto object-contain bg-amber-950/5 p-1 rounded-lg" />
          </div>
        </div>

        {/* Right Side Input Console Zone */}
        <div className="md:col-span-8 h-full p-6 sm:p-10 bg-white flex flex-col justify-between overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between overflow-hidden">
            
            {/* Scroll Area Component */}
            <div className="flex-1 overflow-y-auto pr-2 max-h-[480px] space-y-5 scrollbar-thin">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs font-semibold animate-shake">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. PERSONAL INFORMATION */}
              {activeTab === "personal" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Personal Profile Particulars</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Letters, spaces, hyphens, and apostrophes only. Numbers are blocked automatically.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input
                          type="text"
                          required
                          maxLength={50}
                          placeholder="e.g. Maria"
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
                          value={formData.firstName}
                          onChange={(e) => handleFirstNameChange(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name (Optional)</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input
                          type="text"
                          maxLength={50}
                          placeholder="e.g. Clara"
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
                          value={formData.middleName}
                          onChange={(e) => setFormData((prev) => ({ ...prev, middleName: sanitizeNameInput(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input
                          type="text"
                          required
                          maxLength={50}
                          placeholder="e.g. Santos"
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
                          value={formData.lastName}
                          onChange={(e) => handleLastNameChange(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Suffix (Optional)</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer"
                          value={formData.suffix}
                          onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                        >
                          <option value="None">None</option>
                          <option value="Jr.">Jr.</option>
                          <option value="Sr.">Sr.</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                          <option value="V">V</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. EMPLOYMENT & DATA ACCESS SCOPE */}
              {activeTab === "employment" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Employment Scope & Authorization</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Configure institutional department, grade assignment, and student sections.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Employee / Personnel ID *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input
                          type="text"
                          required
                          maxLength={20}
                          placeholder="e.g. EMP-2026-001"
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none font-mono"
                          value={formData.employeeId}
                          onChange={(e) => setFormData((prev) => ({ ...prev, employeeId: sanitizeEmployeeIdInput(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Position / Role *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select
                          required
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer"
                          value={formData.facultyPosition}
                          onChange={(e) => setFormData({ ...formData, facultyPosition: e.target.value })}
                        >
                          <option value="Teacher">Teacher / Faculty</option>
                          <option value="Lead Teacher">Lead Teacher</option>
                          <option value="SPED Coordinator">SPED Coordinator</option>
                          <option value="FSL Specialist">FSL Specialist</option>
                          <option value="Department Head">Department Head</option>
                          <option value="Registrar">Registrar</option>
                          <option value="Guidance Personnel">Guidance Personnel</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select
                          required
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        >
                          <option value="Special Education (SPED)">Special Education (SPED)</option>
                          <option value="Deaf Education Center">Deaf Education Center</option>
                          <option value="Elementary Education">Elementary Education</option>
                          <option value="Junior High School">Junior High School</option>
                          <option value="Senior High School">Senior High School</option>
                        </select>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Grade Level *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <select
                          required
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer"
                          value={formData.assignedGrade}
                          onChange={(e) => setFormData({ ...formData, assignedGrade: e.target.value })}
                        >
                          <option value="Kindergarten">Kindergarten</option>
                          <option value="Grade 1">Grade 1</option>
                          <option value="Grade 2">Grade 2</option>
                          <option value="Grade 3">Grade 3</option>
                          <option value="Grade 4">Grade 4</option>
                          <option value="Grade 5">Grade 5</option>
                          <option value="Grade 6">Grade 6</option>
                          <option value="Grade 7">Grade 7</option>
                          <option value="Grade 8">Grade 8</option>
                          <option value="Grade 9">Grade 9</option>
                          <option value="Grade 10">Grade 10</option>
                          <option value="Grade 11">Grade 11</option>
                          <option value="Grade 12">Grade 12</option>
                        </select>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Class Section(s) *</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          maxLength={30}
                          placeholder="Enter section name (e.g. Hope, Rizal, Section A)"
                          className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                          value={newSectionInput}
                          onChange={(e) => setNewSectionInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSection(); } }}
                        />
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-1 shadow-sm"
                        >
                          <Plus size={14} /> Add Section
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.assignedSections.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No class sections added yet.</span>
                        ) : (
                          formData.assignedSections.map((sec) => (
                            <span key={sec} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-lg border border-amber-200">
                              {sec}
                              <button type="button" onClick={() => handleRemoveSection(sec)} className="hover:text-rose-600">
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ACCOUNT CREDENTIALS */}
              {activeTab === "account" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Security Credentials</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Use your official institutional email for system identification.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email Address *</label>
                      <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400">
                        <input
                          type="email"
                          required
                          placeholder={`name@${APPROVED_INSTITUTIONAL_DOMAINS[0]}`}
                          className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
                          value={formData.email}
                          onChange={(e) => {
                            setIsEmailManuallyEdited(true);
                            setFormData((prev) => ({ ...prev, email: sanitizeEmailInput(e.target.value) }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                        <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400 pr-4">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••••"
                            className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
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
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                        <div className="w-full h-12 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-400 pr-4">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••••"
                            className="w-full mx-4 bg-transparent border-none p-0 text-slate-900 text-sm focus:ring-0 outline-none"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          />
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600 focus:outline-none"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                      <p className="font-bold text-slate-700 mb-1">Password Requirements:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                          <Check size={14} className={hasMinLength ? "text-emerald-600" : "text-slate-300"} /> At least 8 characters
                        </span>
                        <span className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                          <Check size={14} className={hasUpperCase ? "text-emerald-600" : "text-slate-300"} /> One uppercase letter (A-Z)
                        </span>
                        <span className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                          <Check size={14} className={hasLowerCase ? "text-emerald-600" : "text-slate-300"} /> One lowercase letter (a-z)
                        </span>
                        <span className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                          <Check size={14} className={hasNumber ? "text-emerald-600" : "text-slate-300"} /> One number (0-9)
                        </span>
                        <span className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                          <Check size={14} className={hasSpecialChar ? "text-emerald-600" : "text-slate-300"} /> One special character (!@#$...)
                        </span>
                        <span className={`flex items-center gap-1.5 ${doPasswordsMatch ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                          <Check size={14} className={doPasswordsMatch ? "text-emerald-600" : "text-slate-300"} /> Passwords match
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. IDENTITY PROOFS & CERTIFICATION */}
              {activeTab === "documents" && (
                <div className="space-y-4 animate-fadeIn pt-1">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Identity Verification Documents</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Accepted formats: PDF, PNG, JPG • Maximum file size: 5 MB</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Institutional ID Card Scan / Copy *</label>
                      <label className="group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all text-center px-4 shadow-sm">
                        {idFile ? (
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                            <FileCheck size={20} className="text-emerald-600" />
                            <span className="truncate max-w-xs">{idFile.name} ({(idFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={20} className="text-slate-400 group-hover:text-amber-500 transition-all mb-1" />
                            <span className="text-xs font-bold text-slate-600 truncate max-w-xs">
                              Select Official School ID File
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleFileSelection(e, "id")}
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Employment Proof (Optional)</label>
                      <label className="group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all text-center px-4 shadow-sm">
                        {proofFile ? (
                          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                            <FileCheck size={20} className="text-blue-600" />
                            <span className="truncate max-w-xs">{proofFile.name} ({(proofFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={20} className="text-slate-400 group-hover:text-amber-500 transition-all mb-1" />
                            <span className="text-xs font-bold text-slate-600 truncate max-w-xs">
                              Upload Appointment Letter or Faculty Certification
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleFileSelection(e, "proof")}
                        />
                      </label>
                    </div>

                    <label className="flex items-start space-x-2.5 cursor-pointer select-none border-t border-slate-100 pt-3 mt-2">
                      <input
                        type="checkbox"
                        required
                        className="w-4 h-4 text-amber-500 accent-amber-500 rounded border-slate-300 focus:ring-0 mt-0.5 cursor-pointer"
                        checked={formData.certify}
                        onChange={(e) => setFormData({ ...formData, certify: e.target.checked })}
                      />
                      <span className="text-xs font-semibold text-slate-600 leading-relaxed">
                        I certify that I am an authorized school faculty member, all submitted information and credentials are authentic, and I understand that student-data access is restricted and subject to administrator verification.
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
                    setError(null);
                    if (activeTab === "documents") setActiveTab("account");
                    else if (activeTab === "account") setActiveTab("employment");
                    else if (activeTab === "employment") setActiveTab("personal");
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 shadow-[0_3px_6px_rgba(0,0,0,0.05),_inset_0_-2px_0_rgba(0,0,0,0.1)] active:translate-y-0.5 active:shadow-inner transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <div />
              )}

              {activeTab !== "documents" ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.2),_inset_0_-3px_0_rgba(0,0,0,0.15)] transform active:translate-y-0.5 transition-all ml-auto"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.15),_inset_0_-3px_0_rgba(0,0,0,0.2)] active:shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)] transform active:translate-y-0.5 transition-all ml-auto disabled:opacity-50"
                >
                  {isLoading ? "Transmitting..." : "Transmit Filing Request"}
                </button>
              )}
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}