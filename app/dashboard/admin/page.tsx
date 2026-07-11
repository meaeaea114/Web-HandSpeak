'use client';

import { useState } from 'react';
import { Search, ChevronDown, UserPlus, Upload, ShieldAlert, ArrowLeft } from 'lucide-react';

interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  classification: 'SNED' | 'STNCS' | 'Regular';
  status: 'Pending' | 'Approved';
  requestedDate: string;
  type: 'self-registration' | 'admin-created';
}

export default function AccountManagementPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'faculty'>('students');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<RegistrationRequest[]>([
    { id: '1', name: 'Robert Santos', email: 'robert.santos@school.com', phone: '+1 (555) 234-5678', classification: 'SNED', status: 'Pending', requestedDate: '2024-03-21', type: 'self-registration' },
    { id: '2', name: 'Jennifer Lee', email: 'jennifer.lee@school.com', phone: '+1 (555) 345-6789', classification: 'STNCS', status: 'Approved', requestedDate: '2024-03-15', type: 'admin-created' }
  ]);

  const handleStatusChange = (id: string, newStatus: 'Approved' | 'Rejected') => {
    if (newStatus === 'Rejected') {
      setRequests(prev => prev.filter(r => r.id !== id));
    } else {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {!showForm ? (
        <div className="space-y-6">
          {/* Filtering Tools Header Row */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search database profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white text-slate-800 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] text-sm shadow-inner"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button 
                onClick={() => setShowForm(true)}
                className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black px-5 py-2.5 rounded-xl flex items-center gap-2 border-b-4 border-[#DC8C18] shadow-sm transition-all duration-100 active:translate-y-[3px] active:border-b-0 text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Create New Account
              </button>
              
              <div className="relative">
                <select className="appearance-none bg-white text-[#521903] font-bold pl-5 pr-10 py-2.5 rounded-xl border border-slate-200 border-b-4 border-b-slate-300 focus:outline-none text-sm shadow-sm cursor-pointer">
                  <option>All Types</option>
                  <option>SNED</option>
                  <option>STNCS</option>
                  <option>Regular</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#521903] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Account Cards Grid Stack */}
          <div className="space-y-4">
            {requests
              .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:bg-slate-50/50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">{req.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border ${
                        req.classification === 'SNED' ? 'bg-rose-50 border-rose-100 text-[#9F4409]' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                        {req.classification}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide ${
                        req.status === 'Pending' ? 'bg-amber-50 text-[#DC8C18] border border-amber-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    
                    <div className="text-slate-500 font-semibold space-y-1 text-xs">
                      <p>✉ {req.email}</p>
                      <p>📞 {req.phone}</p>
                      <p className="text-[11px] text-slate-400 pt-1">
                        Requested on {req.requestedDate} • Source: <span className="underline">{req.type}</span>
                      </p>
                    </div>
                  </div>

                  {req.status === 'Pending' && (
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => handleStatusChange(req.id, 'Rejected')}
                        className="flex-1 md:flex-none bg-[#9F4409] hover:bg-[#521903] text-white font-black px-6 py-2.5 rounded-xl border-b-4 border-[#521903] shadow-sm text-sm transition-all duration-100 active:translate-y-[3px] active:border-b-0"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleStatusChange(req.id, 'Approved')}
                        className="flex-1 md:flex-none bg-[#5EC482] hover:bg-[#4EB171] text-white font-black px-6 py-2.5 rounded-xl border-b-4 border-[#45A367] shadow-sm text-sm transition-all duration-100 active:translate-y-[3px] active:border-b-0"
                      >
                        Approved
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* CREATION DIALOG FORM PANEL */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <button 
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#521903] transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Accounts
            </button>
            
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setActiveTab('students')}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${activeTab === 'students' ? 'bg-white text-[#521903] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Students
              </button>
              <button 
                onClick={() => setActiveTab('faculty')}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${activeTab === 'faculty' ? 'bg-white text-[#521903] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Faculty
              </button>
            </div>

            <button className="bg-[#521903] hover:bg-[#9F4409] text-white font-bold px-4 py-2 rounded-xl border-b-4 border-black flex items-center gap-2 text-xs shadow-sm transition-all duration-100 active:translate-y-[3px] active:border-b-0">
              <Upload className="h-3.5 w-3.5" /> Bulk Upload
            </button>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">Full Name *</label>
              <input type="text" placeholder="Enter full name" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">Email Address *</label>
              <input type="email" placeholder="Enter email address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">Phone (Optional)</label>
              <input type="text" placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">Student ID Code *</label>
              <input type="text" placeholder="e.g., STU-001" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">Student Classification Group *</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-bold bg-slate-50 text-slate-700 text-sm cursor-pointer">
                <option>Regular Student</option>
                <option>SNED Student</option>
                <option>STNCS Representative</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Grade *</label>
                <input type="text" placeholder="e.g., 4" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Section *</label>
                <input type="text" placeholder="e.g., A" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">System Password *</label>
              <input type="password" placeholder="Min 8 characters" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-[#DC8C18]" /> Requires alphanumeric characters</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600">Confirm Password Verification *</label>
              <input type="password" placeholder="Re-type password" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-slate-50" />
            </div>

            {/* Bottom Decision Actions */}
            <div className="md:col-span-2 flex items-center justify-center gap-4 pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full max-w-[180px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 rounded-xl border-b-4 border-slate-300 shadow-sm transition-all duration-100 active:translate-y-[3px] active:border-b-0"
              >
                Cancel
              </button>
              <button 
                type="submit"
                onClick={() => setShowForm(false)}
                className="w-full max-w-[180px] bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black py-3 rounded-xl border-b-4 border-[#DC8C18] shadow-sm transition-all duration-100 active:translate-y-[3px] active:border-b-0"
              >
                Confirm Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}