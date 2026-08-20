"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
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
  Loader2,
} from "lucide-react";
import {
  submitAccountRequest,
  formatAuthError,
  NAME_REGEX,
  MIDDLE_INITIAL_REGEX,
  EMPLOYEE_ID_REGEX,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "@/lib/auth-service";

type TabType = "personal" | "employment" | "account" | "documents";

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTrackingId, setSubmittedTrackingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    gender: "",
    employeeId: "",
    facultyPosition: "Teacher",
    department: "Special Needs Education (SNED)",
    assignedGrade: "Kindergarten",
    assignedSections: [] as string[],
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
    certify: false,
  });

  const [newSectionInput, setNewSectionInput] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const sanitizeNameInput = (input: string): string => {
    return input.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]/g, "");
  };

  const sanitizeMiddleInitial = (input: string): string => {
    return input.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ]/g, "").toUpperCase();
  };

  const sanitizeEmployeeIdInput = (input: string): string => {
    return input.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
  };

  const sanitizeEmailInput = (input: string): string => {
    return input.replace(/[^a-zA-Z0-9.@_+-]/g, "").toLowerCase();
  };

  const sanitizeContactNumber = (input: string): string => {
    return input.replace(/[^0-9+\-\s()]/g, "");
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

  const handleFirstNameChange = (val: string) => {
    const sanitized = sanitizeNameInput(val);
    setFormData((prev) => ({ ...prev, firstName: sanitized }));
  };

  const handleLastNameChange = (val: string) => {
    const sanitized = sanitizeNameInput(val);
    setFormData((prev) => ({ ...prev, lastName: sanitized }));
  };

  const handleAddSection = () => {
    const trimmed = newSectionInput.trim().replace(/[^a-zA-Z0-9\s-]/g, "");
    if (trimmed && !formData.assignedSections.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        assignedSections: [...prev.assignedSections, trimmed],
      }));
      setNewSectionInput("");
    }
  };

  const handleRemoveSection = (sectionName: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedSections: prev.assignedSections.filter((s) => s !== sectionName),
    }));
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

  const validateStep = (tab: TabType): boolean => {
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
      if (!formData.middleInitial.trim()) {
        setError("Middle Initial is required.");
        return false;
      }
      if (!MIDDLE_INITIAL_REGEX.test(formData.middleInitial.trim())) {
        setError("Middle Initial must be a single letter.");
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
      if (!formData.gender) {
        setError("Gender is required. Please select an option.");
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
      if (!formData.email.trim() || !formData.email.includes("@")) {
        setError("Please enter a valid email address.");
        return false;
      }

      if (!formData.contactNumber.trim()) {
        setError("Contact Number is required.");
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

  const handlePrevTab = () => {
    setError(null);
    if (activeTab === "documents") setActiveTab("account");
    else if (activeTab === "account") setActiveTab("employment");
    else if (activeTab === "employment") setActiveTab("personal");
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
        middleInitial: formData.middleInitial,
        lastName: formData.lastName,
        suffix: formData.suffix,
        gender: formData.gender,
        email: formData.email,
        contactNumber: formData.contactNumber,
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

  const renderTabTrigger = (id: TabType, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => {
          if (validateStep(activeTab) || id === "personal") {
            setActiveTab(id);
          }
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
          isActive
            ? "bg-amber-950 text-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.15),_inset_0_-2px_0_rgba(0,0,0,0.2)] translate-x-0.5"
            : "text-amber-950/70 hover:bg-amber-950/10 hover:text-amber-950"
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  if (isSubmitted) {
    const miFormatted = formData.middleInitial.trim().toUpperCase() ? `${formData.middleInitial.trim().toUpperCase()}.` : "";
    const fullNameDisplay = [
      formData.firstName.trim(),
      miFormatted,
      formData.lastName.trim(),
      formData.suffix.trim()
    ].filter(Boolean).join(" ");

    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-x-hidden font-sans antialiased">
        <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

        <div className="w-full max-w-lg bg-white shadow-2xl rounded-3xl p-8 text-center border border-slate-100 animate-fadeIn">
          <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Transmitted</h2>
          <p className="text-xs text-slate-600 font-medium mb-6 leading-relaxed max-w-sm mx-auto">
            Account filing received for <strong>{fullNameDisplay}</strong>. Your request is recorded under Tracking ID <strong className="text-amber-600">{submittedTrackingId}</strong> and is pending administrator review.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 px-5 py-2.5 rounded-xl shadow-md transition-all"
          >
            <ArrowLeft size={14} className="mr-1.5" /> Return to Portal Access
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="fixed inset-0 -z-10 select-none pointer-events-none bg-[url('/bg-parchment.jpg')] bg-repeat bg-auto" />

      {/* MASTER CONTAINER FRAME */}
      <div className="w-full max-w-5xl h-[620px] bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.14)] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Side Navigation Control Panel */}
        <div className="md:col-span-4 h-full p-6 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-amber-200 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500">
          <img
            src="/images/school-building.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none opacity-15"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_70%)] pointer-events-none" />

          <div className="space-y-5 relative z-10">
            <div>
              <Link href="/auth/login" className="inline-flex items-center text-xs font-bold text-amber-950 hover:underline gap-1 transition-all mb-3">
                <ArrowLeft size={14} /> Cancel Registration
              </Link>
              <h1 className="text-xl font-black text-amber-950 tracking-tight leading-none">Faculty Enrollment</h1>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-900/70 mt-1">Institutional Workspace</p>
            </div>

            <nav className="space-y-1.5 pt-1">
              {renderTabTrigger("personal", "Personal Identity", <User size={15} />)}
              {renderTabTrigger("employment", "Employment & Scope", <Briefcase size={15} />)}
              {renderTabTrigger("account", "Account Access", <ShieldCheck size={15} />)}
              {renderTabTrigger("documents", "Document Upload", <Upload size={15} />)}
            </nav>
          </div>

          <div className="flex items-center gap-3 relative z-10 pt-4 border-t border-amber-950/10 hidden md:flex">
            <img src="/logo.png" alt="System Logo" className="h-7 w-auto object-contain bg-amber-950/5 p-1 rounded-lg" />
            <img src="/images/school-logo.png" alt="School Logo" className="h-7 w-auto object-contain bg-amber-950/5 p-1 rounded-lg" />
          </div>
        </div>

        {/* Right Side Input Console Zone */}
        <div className="md:col-span-8 h-full p-6 sm:p-8 bg-white flex flex-col justify-between overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between overflow-hidden">
            
            {/* Scroll Area with Clean Unified Padding */}
            <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-1 max-h-[470px] space-y-4 scrollbar-thin">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs font-semibold animate-shake">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. PERSONAL INFORMATION */}
              {activeTab === "personal" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Personal Profile Particulars</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Letters, spaces, hyphens, and apostrophes only. Numbers are blocked automatically.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <input
                          type="text"
                          required
                          maxLength={50}
                          placeholder="e.g. Maria"
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none"
                          value={formData.firstName}
                          onChange={(e) => handleFirstNameChange(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Middle Initial *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <input
                          type="text"
                          required
                          maxLength={1}
                          placeholder="C"
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none uppercase font-semibold text-center"
                          value={formData.middleInitial}
                          onChange={(e) => setFormData((prev) => ({ ...prev, middleInitial: sanitizeMiddleInitial(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Suffix (Optional)</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="e.g. Jr."
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none"
                          value={formData.suffix}
                          onChange={(e) => setFormData((prev) => ({ ...prev, suffix: sanitizeNameInput(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <input
                          type="text"
                          required
                          maxLength={50}
                          placeholder="e.g. Santos"
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none"
                          value={formData.lastName}
                          onChange={(e) => handleLastNameChange(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <select
                          required
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none cursor-pointer"
                          value={formData.gender}
                          onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. EMPLOYMENT & DATA ACCESS SCOPE */}
              {activeTab === "employment" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Employment Scope & Authorization</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Configure institutional department, grade assignment, and student sections.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Employee / Personnel ID *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <input
                          type="text"
                          required
                          maxLength={20}
                          placeholder="e.g. EMP-2026-001"
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none font-mono"
                          value={formData.employeeId}
                          onChange={(e) => setFormData((prev) => ({ ...prev, employeeId: sanitizeEmployeeIdInput(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Position / Role *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <select
                          required
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none cursor-pointer"
                          value={formData.facultyPosition}
                          onChange={(e) => setFormData((prev) => ({ ...prev, facultyPosition: e.target.value }))}
                        >
                          <option value="Principal / School Head">Principal / School Head</option>
                          <option value="Department Head">Department Head</option>
                          <option value="Teacher">Teacher</option>
                          <option value="SNED Teacher">SNED Teacher</option>
                          <option value="Guidance Counselor">Guidance Counselor</option>
                          <option value="School Administrator">School Administrator</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <select
                          required
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none cursor-pointer"
                          value={formData.department}
                          onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                        >
                          <option value="Special Needs Education (SNED)">Special Needs Education (SNED)</option>
                          <option value="Elementary Education">Elementary Education</option>
                          <option value="Junior High School">Junior High School</option>
                          <option value="Senior High School">Senior High School</option>
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Grade Level *</label>
                      <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                        <select
                          required
                          className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none cursor-pointer"
                          value={formData.assignedGrade}
                          onChange={(e) => setFormData((prev) => ({ ...prev, assignedGrade: e.target.value }))}
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
                          placeholder="Enter section name (e.g. Hope, Rizal)"
                          className="flex-1 h-11 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
                          value={newSectionInput}
                          onChange={(e) => setNewSectionInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSection(); } }}
                        />
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Plus size={14} /> Add Section
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-slate-50/70 border border-slate-100 rounded-xl">
                        {formData.assignedSections.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No class sections added yet.</span>
                        ) : (
                          formData.assignedSections.map((sec) => (
                            <span key={sec} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100/80 text-amber-900 font-bold text-[11px] rounded-lg border border-amber-200">
                              {sec}
                              <button type="button" onClick={() => handleRemoveSection(sec)} className="hover:text-rose-600 transition-colors">
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
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Security Credentials</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Use your official email address for system identification and notifications.</p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                        <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                          <input
                            type="email"
                            required
                            placeholder="e.g. yourname@email.com"
                            className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: sanitizeEmailInput(e.target.value) }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number *</label>
                        <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                          <input
                            type="tel"
                            required
                            maxLength={20}
                            placeholder="e.g. +63 912 345 6789"
                            className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none"
                            value={formData.contactNumber}
                            onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: sanitizeContactNumber(e.target.value) }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                        <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••••"
                            className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none pr-2"
                            value={formData.password}
                            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600 focus:outline-none flex-shrink-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                        <div className="w-full h-11 flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 px-3.5 transition-all">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••••"
                            className="w-full bg-transparent border-none p-0 text-slate-900 text-xs focus:ring-0 outline-none pr-2"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600 focus:outline-none flex-shrink-0"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Policy Checks */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                      <span className="font-bold text-slate-600 block mb-1">Password Requirements:</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className={hasMinLength ? "text-emerald-600 font-medium" : "text-slate-400"}>
                          {hasMinLength ? "✓" : "•"} Min. 8 characters
                        </span>
                        <span className={hasUpperCase ? "text-emerald-600 font-medium" : "text-slate-400"}>
                          {hasUpperCase ? "✓" : "•"} Uppercase letter
                        </span>
                        <span className={hasLowerCase ? "text-emerald-600 font-medium" : "text-slate-400"}>
                          {hasLowerCase ? "✓" : "•"} Lowercase letter
                        </span>
                        <span className={hasNumber ? "text-emerald-600 font-medium" : "text-slate-400"}>
                          {hasNumber ? "✓" : "•"} Numeric character
                        </span>
                        <span className={hasSpecialChar ? "text-emerald-600 font-medium" : "text-slate-400"}>
                          {hasSpecialChar ? "✓" : "•"} Special character
                        </span>
                        <span className={doPasswordsMatch ? "text-emerald-600 font-medium" : "text-slate-400"}>
                          {doPasswordsMatch ? "✓" : "•"} Passwords match
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DOCUMENTATION & VERIFICATION */}
              {activeTab === "documents" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Verification Documents</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Attach identity and employment proof files for system approval.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Official ID Card / Badge *
                      </label>
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/20 transition-all">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          {idFile ? idFile.name : "Click to select or drop official ID file"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG (max 5MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleFileSelection(e, "id")}
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Proof of Employment / Assignment (Optional)
                      </label>
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/20 transition-all">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          {proofFile ? proofFile.name : "Click to select support document"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG (max 5MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleFileSelection(e, "proof")}
                        />
                      </label>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                          checked={formData.certify}
                          onChange={(e) => setFormData((prev) => ({ ...prev, certify: e.target.checked }))}
                        />
                        <span className="text-[11px] text-slate-600 font-medium leading-tight">
                          I hereby certify that all provided personal details, position titles, and uploaded identity documents are valid and authentic.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Footer Controls with Matched Height */}
            <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
              {activeTab !== "personal" ? (
                <button
                  type="button"
                  onClick={handlePrevTab}
                  className="h-10 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  <ChevronLeft size={15} /> Previous
                </button>
              ) : (
                <div />
              )}

              {activeTab !== "documents" ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="h-10 inline-flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 px-5 rounded-xl shadow-sm transition-all ml-auto"
                >
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 inline-flex items-center gap-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 px-6 rounded-xl shadow-sm transition-all ml-auto disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Transmitting...
                    </>
                  ) : (
                    <>
                      <FileCheck size={15} /> Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}