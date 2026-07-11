'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Download, 
  X, 
  Mail
} from 'lucide-react';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  studentId: string;
  classification: string;
  gradeSection: string;
  role: 'Faculty' | 'Student';
  status: 'Active' | 'Pending Admin Confirmation' | 'Pending Deletion Approval';
  created: string;
}

export default function AccountManagementPage() {
  // Navigation & Form States
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'bulk'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [showPassword, setShowPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form Input Binder States
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', studentId: '', 
    classification: 'Regular Student', grade: '', section: '', password: '', confirmPassword: ''
  });

  // Editing Reference Holder
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // CORE MOCK DATABASE HUB
  const [accounts, setAccounts] = useState<UserAccount[]>([
    { id: '1', name: 'John Teacher', email: 'faculty@school.com', phone: '+1 (555) 123-4567', department: 'SNED', studentId: '-', classification: '-', gradeSection: '-', role: 'Faculty', status: 'Active', created: '2024-03-15' },
    { id: '2', name: 'Maria Student', email: 'student@school.com', phone: '+1 (555) 987-6543', department: 'STNCS', studentId: 'STU-001', classification: 'Regular', gradeSection: 'Grade 4 - A', role: 'Student', status: 'Active', created: '2024-01-10' }
  ]);

  // Filter Engine
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            acc.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'All Types' || acc.role === selectedType || 
                          (selectedType === 'SNED' && acc.department === 'SNED') ||
                          (selectedType === 'Regular' && acc.classification === 'Regular');
      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedType, accounts]);

  // CRUD Handler with Admin Confirmation Gate Logic
  const handleCreateOrUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Password mismatch parameters error. Verify fields match.");
      return;
    }

    if (editingAccountId) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === editingAccountId) {
          return {
            ...acc,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || '-',
            studentId: formData.studentId || '-',
            classification: formData.classification.replace(' Student', ''),
            gradeSection: formData.grade ? `Grade ${formData.grade} - ${formData.section || 'A'}` : '-',
            status: 'Pending Admin Confirmation'
          };
        }
        return acc;
      }));
      alert(`Account alterations compiled. Changes submitted to the Admin approval registry.`);
    } else {
      const newAccount: UserAccount = {
        id: (accounts.length + 1).toString(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '-',
        department: formData.classification.includes('SNED') ? 'SNED' : 'STNCS',
        studentId: formData.studentId || '-',
        classification: formData.classification.replace(' Student', ''),
        gradeSection: formData.grade ? `Grade ${formData.grade} - ${formData.section || 'A'}` : '-',
        role: formData.classification.includes('Faculty') ? 'Faculty' : 'Student',
        status: 'Pending Admin Confirmation',
        created: new Date().toISOString().split('T')[0]
      };
      setAccounts(prev => [...prev, newAccount]);
      alert(`New profile generated. Account remains locked until authorized by the Admin.`);
    }

    setFormData({ name: '', email: '', phone: '', studentId: '', classification: 'Regular Student', grade: '', section: '', password: '', confirmPassword: '' });
    setEditingAccountId(null);
    setViewMode('list');
  };

  const triggerEditWorkflow = (account: UserAccount) => {
    const parseGrade = account.gradeSection !== '-' ? account.gradeSection.split(' - ')[0].replace('Grade ', '') : '';
    const parseSection = account.gradeSection !== '-' ? account.gradeSection.split(' - ')[1] : '';
    
    setFormData({
      name: account.name,
      email: account.email,
      phone: account.phone === '-' ? '' : account.phone,
      studentId: account.studentId === '-' ? '' : account.studentId,
      classification: `${account.classification} Student`,
      grade: parseGrade,
      section: parseSection,
      password: '',
      confirmPassword: ''
    });
    setEditingAccountId(account.id);
    setViewMode('create');
  };

  const requestDeletionApproval = (id: string) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) return { ...acc, status: 'Pending Deletion Approval' };
      return acc;
    }));
    alert(`Account drop requested. Entry flagged inside 'Pending Deletion Approval' log tracks.`);
  };

  // Drag and Drop Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        alert(`File "${file.name}" dropped and parsed successfully. Imported rows are now marked as Pending Admin Confirmation.`);
        setViewMode('list');
      } else {
        alert("Invalid file format. Please drop a valid CSV template.");
      }
    }
  };

  return (
    <div className="space-y-6 p-2 max-w-7xl mx-auto pb-12 font-sans text-slate-800 antialiased selection:bg-[#F2B33D]/20">
      
      {/* SCREEN ROUTER CONTROLLER */}
      
      {/* VIEW A: CORE MAIN MANAGEMENT LIST FRAME */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* SEARCH & ACTION DECK STRIP */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
            <div className="relative w-full md:max-w-xs flex items-center">
              <Search className="h-4 w-4 absolute left-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 border border-[#F5E6C4] rounded-xl text-xs bg-[#F5E6C4]/10 focus:outline-none focus:bg-white text-[#521903] font-bold tracking-wide transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <button 
                onClick={() => { setEditingAccountId(null); setViewMode('create'); }}
                className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Create New Account
              </button>

              <button 
                onClick={() => setViewMode('bulk')}
                className="inline-flex items-center gap-2 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </button>

              <div className="relative min-w-[140px]">
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 border border-[#F5E6C4] bg-white rounded-xl text-xs font-black text-[#521903] pr-10 focus:outline-none transition-all cursor-pointer shadow-sm"
                >
                  <option>All Types</option>
                  <option>Faculty</option>
                  <option>Student</option>
                  <option>SNED</option>
                  <option>Regular</option>
                </select>
                <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>

          {/* NO SCROLLBAR COMPACT DATA MATRIX */}
          <div className="bg-white rounded-2xl border border-white shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-bold text-slate-700 table-fixed">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest bg-neutral-50/60">
                  <th className="py-4 px-6 w-[28%]">User Profile</th>
                  <th className="py-4 px-4 w-[20%]">Academic Group</th>
                  <th className="py-4 px-4 w-[16%]">Identifier</th>
                  <th className="py-4 px-4 w-[10%] text-center">Role</th>
                  <th className="py-4 px-4 w-[16%] text-center">Status</th>
                  <th className="py-4 px-6 w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-600">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-[#F2B33D]/4 transition-colors">
                    
                    {/* COL 1: PROFILE */}
                    <td className="py-3 px-6">
                      <div className="space-y-0.5">
                        <div className="font-black text-slate-800 text-sm tracking-tight truncate">{account.name}</div>
                        <div className="text-[10px] font-medium text-slate-400 truncate flex items-center gap-1">
                          <Mail className="h-3 w-3 inline opacity-70" /> {account.email}
                        </div>
                        {account.phone !== '-' && (
                          <div className="text-[9px] font-medium text-slate-400 opacity-80">{account.phone}</div>
                        )}
                      </div>
                    </td>

                    {/* COL 2: ACADEMIC GROUP */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="text-slate-700 font-bold text-xs">{account.gradeSection !== '-' ? account.gradeSection : 'N/A'}</div>
                        <div className="text-[10px] flex items-center gap-1">
                          <span className="text-indigo-700 font-extrabold">{account.department}</span>
                          {account.classification !== '-' && (
                            <span className="text-amber-800 font-medium">({account.classification})</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* COL 3: IDENTIFIERS */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Student ID</div>
                        <div className="font-mono text-slate-700 font-bold text-xs">{account.studentId}</div>
                      </div>
                    </td>

                    {/* COL 4: ROLE */}
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        account.role === 'Faculty' ? 'bg-neutral-100 text-slate-500' : 'bg-blue-50 text-blue-600 border border-blue-100/30'
                      }`}>{account.role}</span>
                    </td>

                    {/* COL 5: STATUS */}
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md border uppercase inline-flex items-center gap-1 ${
                        account.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        account.status === 'Pending Deletion Approval' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                        'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      }`}>
                        {account.status}
                      </span>
                      <span className="block text-[8px] font-medium text-slate-400 mt-0.5">Created: {account.created}</span>
                    </td>
                    
                    {/* COL 6: ACTIONS */}
                    <td className="py-3 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button 
                          onClick={() => triggerEditWorkflow(account)}
                          className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-90 transition-all cursor-pointer shadow-sm bg-white"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={() => requestDeletionApproval(account.id)}
                          disabled={account.status === 'Pending Deletion Approval'}
                          className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer shadow-sm bg-white disabled:opacity-30"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: CREATE / EDIT INDIVIDUAL FORM */}
      {viewMode === 'create' && (
        <div className="bg-white rounded-2xl border border-white shadow-md p-6 max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-black uppercase tracking-wider text-[#521903]">
              {editingAccountId ? 'Modify Profile Parameters' : 'Create New Account'}
            </h3>
          </div>

          <form onSubmit={handleCreateOrUpdateAccount} className="space-y-4 text-xs font-bold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Full Name *</label>
                <input 
                  type="text" required placeholder="Enter full name"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Email *</label>
                <input 
                  type="email" required placeholder="Enter email address"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Phone (Optional)</label>
                <input 
                  type="text" placeholder="+1 (555) 000-0000"
                  value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Student ID *</label>
                <input 
                  type="text" required placeholder="e.g., STU-001"
                  value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                  className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none focus:bg-white text-[#521903] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Student Classification *</label>
                <div className="relative">
                  <select 
                    value={formData.classification} onChange={(e) => setFormData({...formData, classification: e.target.value})}
                    className="w-full appearance-none px-4 py-2.5 border border-[#F5E6C4] bg-white rounded-xl text-xs focus:outline-none text-[#521903] font-black cursor-pointer"
                  >
                    <option>Regular Student</option>
                    <option>SNED Student</option>
                    <option>Faculty Instructor</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Grade *</label>
                <input 
                  type="text" placeholder="e.g., 4"
                  value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none text-[#521903]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wide block">Section *</label>
                <input 
                  type="text" placeholder="e.g., A"
                  value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})}
                  className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none text-[#521903]"
                />
              </div>
            </div>

            {!editingAccountId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase tracking-wide block">Password *</label>
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="Enter password key"
                    value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none text-[#521903]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase tracking-wide block">Confirm Password *</label>
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="Confirm security cipher"
                    value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#F5E6C4] bg-[#F5E6C4]/10 rounded-xl text-xs focus:outline-none text-[#521903]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" id="reveal" checked={showPassword} onChange={() => setShowPassword(!showPassword)}
                className="h-3.5 w-3.5 rounded text-amber-500 border-slate-300 focus:ring-amber-400"
              />
              <label htmlFor="reveal" className="text-xs text-slate-400 select-none cursor-pointer">Show password fields</label>
            </div>

            <div className="flex items-center justify-center gap-4 pt-6 border-t border-slate-100">
              <button 
                type="button" onClick={() => setViewMode('list')}
                className="bg-[#EA4335] hover:bg-rose-600 text-white font-black px-8 py-2.5 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-[#52B788] hover:bg-emerald-600 text-white font-black px-8 py-2.5 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW C: MAXIMIZED & FUNCTIONAL BULK UPLOAD CONSOLE */}
      {viewMode === 'bulk' && (
        <div className="bg-white rounded-3xl border border-white shadow-2xl p-8 w-full max-w-3xl mx-auto space-y-8 animate-fadeIn relative">
          {/* Close Button */}
          <button 
            onClick={() => setViewMode('list')} 
            className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 absolute top-6 right-6 transition-colors border border-slate-100"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-widest text-[#521903]">Bulk Upload Console</h3>
            <p className="text-sm font-bold text-slate-400">Onboard multiple user tracking profiles securely.</p>
          </div>

          {/* INTERACTIVE DRAG AND DROP ZONE */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-10 rounded-2xl border-2 border-dashed text-sm font-semibold leading-relaxed text-center transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
              isDragging 
                ? 'border-[#F2B33D] bg-[#FFFBEB] text-[#521903] scale-[1.01]' 
                : 'border-amber-200 bg-[#FFFBEB]/50 text-slate-600 hover:border-amber-300 hover:bg-[#FFFBEB]/70'
            }`}
          >
            <Upload className={`h-8 w-8 transition-transform duration-200 ${isDragging ? 'text-[#F2B33D] scale-110' : 'text-slate-400'}`} />
            <div>
              <p className="font-black text-slate-700">
                {isDragging ? "Drop your file here!" : "Drag & Drop your CSV file here"}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Upload a CSV file with faculty or student information schema nodes at once.
              </p>
            </div>
          </div>

          {/* Action Row Buttons Layout */}
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center pt-4">
            <button 
              onClick={() => alert(`Downloading CSV template schema...`)}
              className="inline-flex items-center justify-center gap-3 bg-[#DBEAFE] hover:bg-blue-100 border border-blue-200 text-blue-700 font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer w-full sm:w-1/2"
            >
              <Download className="h-5 w-5" /> Download Template
            </button>

            <label className="inline-flex items-center justify-center gap-3 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all cursor-pointer w-full sm:w-1/2">
              <Upload className="h-5 w-5" /> 
              Choose File & Upload
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    alert(`File "${file.name}" uploaded successfully. Imported rows are now marked as Pending Admin Confirmation.`);
                    setViewMode('list');
                  }
                }} 
              />
            </label>
          </div>
        </div>
      )}

    </div>
  );
}