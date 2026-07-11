'use client';

import { useState } from 'react';
import { Search, ChevronDown, CheckCircle2, MailOpen, Mail, Send, Reply } from 'lucide-react';

interface FeedbackItem {
  id: string;
  sender: string;
  email: string;
  role: 'Student' | 'Faculty';
  message: string;
  date: string;
  isRead: boolean;
  status: 'Pending' | 'Resolved';
  adminReply?: string;
}

export default function FeedbackSupportPage() {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([
    {
      id: '1',
      sender: 'Robert Santos',
      email: 'robert.santos@school.com',
      role: 'Student',
      message: 'The FSL recognition pipeline is having difficulty capturing my hand gestures in dim lighting conditions. Can we add a low-light optimization guide or camera exposure compensation slider inside the practice sandbox terminal window?',
      date: '2026-07-11',
      isRead: false,
      status: 'Pending'
    },
    {
      id: '2',
      sender: 'Jennifer Lee',
      email: 'jennifer.lee@school.com',
      role: 'Faculty',
      message: 'Requesting permission to export the mock evaluation scoring statistics for the entire STNCS representative branch directly into an Excel spreadsheet. This is needed for our monthly dictionary pipeline alignment review sync.',
      date: '2026-07-09',
      isRead: true,
      status: 'Resolved',
      adminReply: 'Export functionality has been deployed. You can now access the spreadsheet download button from the branch analytics portal overview.'
    }
  ]);

  const toggleReadStatus = (id: string) => {
    setFeedbacks(prev => prev.map(item => 
      item.id === id ? { ...item, isRead: !item.isRead } : item
    ));
  };

  const markAsResolved = (id: string) => {
    setFeedbacks(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'Resolved', isRead: true } : item
    ));
  };

  const handleSendReply = (id: string) => {
    if (!replyMessage.trim()) return;
    setFeedbacks(prev => prev.map(item => 
      item.id === id ? { ...item, adminReply: replyMessage, status: 'Resolved', isRead: true } : item
    ));
    setReplyMessage('');
    setReplyingToId(null);
  };

  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesSearch = item.sender.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.message.toLowerCase().includes(searchTerm.toLowerCase());
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
            placeholder="Search feedback tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white text-slate-800 font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] text-sm shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none bg-white text-[#521903] font-bold pl-5 pr-10 py-2.5 rounded-xl border border-slate-200 border-b-4 border-b-slate-300 focus:outline-none text-sm shadow-md cursor-pointer"
            >
              <option value="All">All Tickets</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#521903] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tickets List View */}
      <div className="space-y-4">
        {filteredFeedbacks.map((ticket) => (
          <div 
            key={ticket.id} 
            className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 shadow-md hover:shadow-[0_20px_35px_rgba(82,25,3,0.12)] hover:-translate-y-1 ${
              ticket.isRead ? 'bg-white/70 border-white/50 opacity-90' : 'bg-white border-white/90 ring-1 ring-[#F8B936]/30'
            }`}
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              {/* Left Side Content: Sender Info and Message */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-black text-[#521903] tracking-tight">{ticket.sender}</h2>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border bg-slate-50 border-slate-200 text-slate-600">
                    {ticket.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wide border ${
                    ticket.status === 'Pending' 
                      ? 'bg-amber-50 text-[#DC8C18] border-amber-200' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {ticket.status}
                  </span>
                  {!ticket.isRead && (
                    <span className="h-2 w-2 rounded-full bg-[#9F4409] animate-pulse" />
                  )}
                </div>
                
                <p className="text-slate-700 text-sm leading-relaxed font-medium">
                  {ticket.message}
                </p>

                <div className="text-slate-400 font-semibold text-[11px] pt-1">
                  ✉ {ticket.email} • Received: {ticket.date}
                </div>

                {/* Render Official Response if available */}
                {ticket.adminReply && (
                  <div className="mt-3 bg-[#F8B936]/10 border-l-4 border-[#F8B936] p-3 rounded-r-xl space-y-1">
                    <p className="text-xs font-black text-[#521903] uppercase tracking-wider">Official Response Terminal:</p>
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed">{ticket.adminReply}</p>
                  </div>
                )}
              </div>

              {/* Right Side Tools Dashboard Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0">
                {/* Toggle Read/Unread Action Button */}
                <button 
                  onClick={() => toggleReadStatus(ticket.id)}
                  title={ticket.isRead ? "Mark as Unread" : "Mark as Read"}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#521903] hover:bg-slate-50 border-b-4 border-b-slate-300 active:translate-y-px active:border-b-2 shadow-sm transition-all"
                >
                  {ticket.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </button>

                {ticket.status === 'Pending' && (
                  <>
                    {/* Inline Reply Trigger */}
                    <button 
                      onClick={() => setReplyingToId(replyingToId === ticket.id ? null : ticket.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl border-b-4 border-b-slate-300 hover:bg-slate-50 hover:text-[#521903] active:translate-y-px active:border-b-2 text-xs shadow-sm transition-all"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>

                    {/* Quick Resolve Button */}
                    <button 
                      onClick={() => markAsResolved(ticket.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#5EC482] hover:bg-[#4EB171] text-white font-black rounded-xl border-b-4 border-[#45A367] active:translate-y-0.75 active:border-b-0 text-xs shadow-sm transition-all"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Expandable Response Message Composer Terminal Box */}
            {replyingToId === ticket.id && (
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3 animate-fadeIn">
                <label className="text-xs font-black text-[#521903] uppercase tracking-wider block">Compose Support Message Response</label>
                <div className="flex gap-3">
                  <textarea
                    rows={3}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type official troubleshooting message or adjustment status update here..."
                    className="flex-1 p-3 bg-slate-50 text-slate-800 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] shadow-inner resize-none"
                  />
                  <button
                    onClick={() => handleSendReply(ticket.id)}
                    className="self-end bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] p-3.5 rounded-xl border-b-4 border-[#DC8C18] shadow-md transition-all duration-100 active:translate-y-0.75 active:border-b-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredFeedbacks.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white/50 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl">
            <p className="font-bold text-sm">No feedback requests match your selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}