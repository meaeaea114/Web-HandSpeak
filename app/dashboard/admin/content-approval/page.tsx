'use client';

import { useState } from 'react';
import { BookOpen, Check, X, RefreshCw, ChevronDown, Search, AlertCircle, FileText } from 'lucide-react';

interface ContentSubmission {
  id: string;
  title: string;
  type: 'Lesson' | 'Assessment';
  category: string;
  status: 'Pending' | 'Approved' | 'Revision Needed' | 'Rejected';
  description: string;
  targetLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  submittedBy: string;
  date: string;
  contentMeta: string; // Details about the video files, flashcards, or MediaPipe info
  revisionNotes?: string;
}

export default function ContentApprovalPage() {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');

  const [submissions, setSubmissions] = useState<ContentSubmission[]>(
    [
      {
        id: 'sub-1',
        title: 'Basic Greetings - FSL Signs',
        type: 'Lesson',
        category: 'Language',
        status: 'Pending',
        description: 'Learn 10 essential greeting signs including hello, goodbye, thank you, and good morning',
        targetLevel: 'Beginner',
        submittedBy: 'faculty@school.com',
        date: '2024-03-22',
        contentMeta: 'Video: greeting-signs-101.mp4 | Flashcards: 10 cards | Duration: 15 minutes'
      },
      {
        id: 'sub-2',
        title: 'Interactive Gesture Recognition Quiz',
        type: 'Assessment',
        category: 'Language',
        status: 'Approved',
        description: 'Students perform 5 signs while AI verifies gesture accuracy in real-time',
        targetLevel: 'Intermediate',
        submittedBy: 'faculty@school.com',
        date: '2024-03-20',
        contentMeta: 'MediaPipe integration | LSTM recognition | Accuracy threshold: 85%'
      }
    ]
  );

  const handleUpdateStatus = (id: string, newStatus: ContentSubmission['status'], notes?: string) => {
    setSubmissions(prev =>
      prev.map(item =>
        item.id === id 
          ? { ...item, status: newStatus, revisionNotes: notes || item.revisionNotes } 
          : item
      )
    );
    setActiveRevisionId(null);
    setNotesInput('');
  };

  const filteredSubmissions = submissions.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' ? true : item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Filtering and Search Tools Utility Strip */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-white/80 p-4 rounded-2xl border border-white/60 shadow-lg">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search submitted lessons/quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white text-slate-800 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] text-sm shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white text-[#521903] font-bold pl-5 pr-10 py-2.5 rounded-xl border border-slate-200 border-b-4 border-b-slate-300 focus:outline-none text-sm shadow-md cursor-pointer"
            >
              <option value="All">All Submissions</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Revision Needed">Revision Needed</option>
              <option value="Rejected">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#521903] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Submissions Stack Deck */}
      <div className="space-y-4">
        {filteredSubmissions.map((content) => (
          <div 
            key={content.id} 
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-md hover:shadow-[0_20px_35px_rgba(82,25,3,0.12)] hover:-translate-y-1 transition-all duration-300 space-y-4"
          >
            {/* Header Data Segment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <BookOpen className="h-5 w-5 text-[#F8B936]" />
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{content.title}</h3>
                
                {/* Type Badge */}
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border ${
                  content.type === 'Lesson' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-purple-50 border-purple-100 text-purple-600'
                }`}>
                  {content.type}
                </span>

                {/* Category Badge */}
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border bg-emerald-50 border-emerald-100 text-emerald-600">
                  {content.category}
                </span>

                {/* Dynamic Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border ${
                  content.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-[#DC8C18]' :
                  content.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                  content.status === 'Revision Needed' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                  'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                  {content.status}
                </span>
              </div>

              {/* Description Block */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 text-xs font-semibold leading-relaxed">
                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Description:</span>
                {content.description}
              </div>

              {/* Split Metadata Column Readouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400 font-bold pt-1 border-t border-slate-50">
                <div className="space-y-0.5">
                  <p>Target Level: <span className="text-slate-600">{content.targetLevel}</span></p>
                  <p>Submitted by: <span className="text-slate-600 underline">{content.submittedBy}</span></p>
                  <p>Date: <span className="text-slate-600">{content.date}</span></p>
                </div>
                <div className="md:text-right space-y-0.5 self-end">
                  <p className="flex md:justify-end items-center gap-1">
                    <FileText className="h-3 w-3 text-slate-400" />
                    Content Asset Specs:
                  </p>
                  <p className="text-slate-600 italic font-medium">{content.contentMeta}</p>
                </div>
              </div>

              {/* Revision Notes Display Box if available */}
              {content.status === 'Revision Needed' && content.revisionNotes && (
                <div className="mt-2 bg-blue-50/50 border-l-4 border-blue-400 p-3 rounded-r-xl text-xs text-blue-900 font-medium">
                  <span className="font-black block uppercase tracking-wider text-[9px] text-blue-600 mb-0.5">Requested Revisions:</span>
                  "{content.revisionNotes}"
                </div>
              )}
            </div>

            {/* Admin Operational Actions Workflow Row */}
            {content.status === 'Pending' && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap">
                {/* Request Revision Option Toggle */}
                <button 
                  onClick={() => setActiveRevisionId(activeRevisionId === content.id ? null : content.id)}
                  className="px-4 py-2 bg-white text-slate-600 font-bold text-xs rounded-xl border border-slate-200 border-b-4 border-b-slate-300 hover:bg-slate-50 hover:text-blue-600 active:translate-y-0.5 active:border-b-2 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Request Revision
                </button>

                {/* Decline/Reject Option */}
                <button 
                  onClick={() => handleUpdateStatus(content.id, 'Rejected')}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl border-b-4 border-rose-800 transition-all duration-100 active:translate-y-0.5 active:border-b-0 flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5 stroke-[3]" /> Reject
                </button>

                {/* Approve Option */}
                <button 
                  onClick={() => handleUpdateStatus(content.id, 'Approved')}
                  className="px-5 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white font-black text-xs rounded-xl border-b-4 border-[#388E3C] transition-all duration-100 active:translate-y-0.5 active:border-b-0 flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" /> Approve & Publish
                </button>
              </div>
            )}

            {/* Interactive Dropdown Composer Field for sending Revision Notes */}
            {activeRevisionId === content.id && (
              <div className="pt-4 border-t border-slate-100 space-y-2 animate-fadeIn">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Specify adjustments required by the teacher
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g., Update the hand posture description in flashcard #4 for clearer FSL accuracy..."
                    className="flex-1 px-4 py-2 bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
                  />
                  <button
                    onClick={() => handleUpdateStatus(content.id, 'Revision Needed', notesInput)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs rounded-xl border-b-4 border-blue-700 active:translate-y-0.5 active:border-b-0"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white/50 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl">
            <p className="font-bold text-sm">No curriculum items match your selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}