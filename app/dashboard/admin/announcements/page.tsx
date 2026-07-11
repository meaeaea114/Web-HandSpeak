'use client';

import { useState } from 'react';
import { Megaphone, Calendar, AlertCircle, Trash2, Archive, Send, X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Medium' | 'High';
  postedAt: string;
  expiresAt: string;
  isArchived: boolean;
}

export default function SystemAnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [expiresAt, setExpiresAt] = useState('');

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'ann-1',
      title: 'System Maintenance',
      content: 'The HandSpeak gesture recognition framework will be undergoing routine database migrations on March 25, 2024 from 2:00 PM to 4:00 PM.',
      priority: 'High',
      postedAt: '2024-03-20',
      expiresAt: '2024-03-25',
      isArchived: false,
    }
  ]);

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !expiresAt) return;

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      content,
      priority,
      postedAt: new Date().toISOString().split('T')[0],
      expiresAt,
      isArchived: false,
    };

    // 1. Update Admin local state
    setAnnouncements([newAnnouncement, ...announcements]);

    // 2. Dispatch global custom event to notify Teacher's notification system layer instantly
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('handspeak_announcement_posted', { detail: newAnnouncement });
      window.dispatchEvent(event);
    }

    // Reset Form Input fields
    setTitle('');
    setContent('');
    setPriority('Medium');
    setExpiresAt('');
    setShowForm(false);
  };

  const handleArchive = (id: string) => {
    setAnnouncements(prev => prev.map(ann => ann.id === id ? { ...ann, isArchived: !ann.isArchived } : ann));
  };

  const handleDelete = (id: string) => {
    setAnnouncements(prev => prev.filter(ann => ann.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Utility Management Strip */}
      <div className="flex items-center justify-between bg-white/80 p-4 rounded-2xl border border-white/60 shadow-lg">
        <h2 className="text-sm font-black text-[#521903] uppercase tracking-wider flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Operational Broadcaster
        </h2>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#1E75EC] hover:bg-[#1661CB] text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 border-b-4 border-[#1258C5] shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs"
          >
            + Create New Announcements
          </button>
        )}
      </div>

      {/* ADMIN COMPOSER DIALOG CARD MOCKUP */}
      {showForm && (
        <form onSubmit={handlePostAnnouncement} className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/80 space-y-5 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-[#521903] text-base">New Announcement Details</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Title *</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 text-xs">Content *</label>
            <textarea 
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Announcement content" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-medium text-sm bg-white shadow-inner resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 text-xs">Priority *</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-bold bg-white text-slate-700 text-sm cursor-pointer shadow-inner"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 text-xs">Expires At *</label>
              <input 
                type="date" 
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F8B936] font-bold bg-white text-slate-700 text-sm cursor-pointer shadow-inner"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl border-b-4 border-slate-300 transition-all duration-100 active:translate-y-0.5 active:border-b-0 text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black px-6 py-2.5 rounded-xl border-b-4 border-[#DC8C18] flex items-center gap-2 shadow-md transition-all duration-100 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 text-xs"
            >
              <Send className="h-3.5 w-3.5" /> Post Announcement
            </button>
          </div>
        </form>
      )}

      {/* ACTIVE ANNOUNCEMENTS PANEL DECK */}
      <div className="space-y-3">
        <p className="text-xs font-black text-[#521903] uppercase tracking-wider pl-1">Active Announcements</p>
        
        {announcements.map((ann) => (
          <div 
            key={ann.id} 
            className={`bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md transition-all ${
              ann.isArchived ? 'opacity-50 grayscale' : ''
            }`}
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertCircle className={`h-4 w-4 ${ann.priority === 'High' ? 'text-[#9F4409]' : 'text-[#DC8C18]'}`} />
                <h4 className="text-base font-black text-slate-800 tracking-tight">{ann.title}</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                  ann.priority === 'High' ? 'bg-rose-50 text-[#9F4409] border-rose-100' : 'bg-amber-50 text-[#DC8C18] border-amber-100'
                }`}>
                  {ann.priority}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-3xl">{ann.content}</p>
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-4">
                <span>📅 Posted: {ann.postedAt}</span>
                <span>⌛ Expires: {ann.expiresAt}</span>
              </div>
            </div>

            {/* Action Buttons Strip */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button 
                onClick={() => handleArchive(ann.id)}
                className="px-4 py-2 bg-[#F8B936] hover:bg-[#DC8C18] text-[#521903] font-black text-xs rounded-xl border-b-4 border-[#DC8C18] active:translate-y-0.5 active:border-b-2 shadow-sm transition-all flex items-center gap-1"
              >
                <Archive className="h-3.5 w-3.5" /> {ann.isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button 
                onClick={() => handleDelete(ann.id)}
                className="px-4 py-2 bg-[#9F4409] hover:bg-[#521903] text-white font-black text-xs rounded-xl border-b-4 border-[#521903] active:translate-y-0.5 active:border-b-2 shadow-sm transition-all flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}