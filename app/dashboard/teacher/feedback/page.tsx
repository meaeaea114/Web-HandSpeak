'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShieldAlert, Check, Megaphone, FolderEdit, Calendar, ArrowLeft } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'Announcement' | 'Content';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  date: string;
  expires: string;
  isRead: boolean;
}

export default function TeacherNotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'Announcement' | 'Content'>('ALL');

  // Static state log data strictly matching snapshot layout specifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'System Maintenance',
      body: 'System will be under maintenance on March 25, 2024 from 2-4 PM',
      type: 'Announcement',
      severity: 'HIGH',
      date: '2024-03-20',
      expires: '2024-03-25',
      isRead: false
    },
    {
      id: 'notif_2',
      title: 'New Analytics Dashboard Available',
      body: 'Check out the updated analytics dashboard with real-time student insights',
      type: 'Announcement',
      severity: 'MEDIUM',
      date: '2024-03-19',
      expires: '2024-04-19',
      isRead: true
    },
    {
      id: 'notif_3',
      title: 'FSL Content Module Baseline Update',
      body: 'Admin has deployed fresh video stream components to the Common Words core curriculum deck stack.',
      type: 'Content',
      severity: 'LOW',
      date: '2024-03-18',
      expires: '2024-03-28',
      isRead: false
    }
  ]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'ALL') return notifications;
    return notifications.filter(n => n.type === filter);
  }, [filter, notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="w-full h-full flex flex-col justify-start items-stretch gap-4 p-1 font-sans antialiased text-[#521903] overflow-hidden">
      
      {/* 1. HEADER BANNER CONTROL DECK */}
      <div className="w-full bg-white rounded-[24px] border border-[#F5E6C4] p-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-2xl text-[#F2B33D] border border-amber-100/50">
            <Bell className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">System Notifications</h3>
            <p className="text-[10px] font-bold text-slate-400">Review official administration log bulletins, system patches, and content updates.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-wider bg-white hover:bg-slate-50 text-slate-600 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            Mark All Read
          </button>
          <button 
            onClick={() => router.push('/dashboard/teacher/content')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-[#521903] text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
            Back
          </button>
        </div>
      </div>

      {/* 2. FILTER SWITCH CHIPS HUB */}
      <div className="flex items-center gap-2 flex-shrink-0 select-none">
        {(['ALL', 'Announcement', 'Content'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
              (tab === 'ALL' && filter === 'ALL') || filter === tab
                ? 'bg-[#521903] border-[#521903] text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
          >
            {tab === 'ALL' ? 'All Updates' : tab === 'Announcement' ? 'System Announcements' : 'Content Management'}
          </button>
        ))}
      </div>

      {/* 3. NOTIFICATION NOTIFICATION CONSOLE DISPLAY WRAPPER (SCROLLBAR-FREE FIXED CONSTRAINTS) */}
      <div className="w-full flex-1 bg-white rounded-[28px] border border-slate-100 p-6 flex flex-col justify-start gap-4 shadow-sm overflow-y-auto pr-1 max-h-[440px]">
        {filteredNotifications.length === 0 ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-2">
            <Bell className="h-8 w-8 stroke-[1.5] opacity-50" />
            <span className="text-xs font-bold tracking-wide">Your notification console box data history logs are clean.</span>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-150 flex gap-4 items-start relative group shadow-sm ${
                notif.isRead 
                  ? 'bg-white border-slate-100 text-slate-600' 
                  : 'bg-[#FFFDF5]/70 border-amber-200/60 text-[#521903] hover:border-amber-300'
              }`}
            >
              {/* Type Category Left Sidebar Icon Indicator Node */}
              <div className={`p-2.5 rounded-xl border ${
                notif.type === 'Announcement' 
                  ? 'bg-amber-50 border-amber-100 text-amber-500' 
                  : 'bg-blue-50 border-blue-100 text-blue-500'
              }`}>
                {notif.type === 'Announcement' ? <Megaphone className="h-4 w-4" /> : <FolderEdit className="h-4 w-4" />}
              </div>

              {/* Central Text Core Body Elements */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black tracking-tight">{notif.title}</h4>
                  
                  {/* Severity Badge Node Rendering */}
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                    notif.severity === 'HIGH' 
                      ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                      : notif.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {notif.severity}
                  </span>
                </div>
                
                <p className="text-xs font-semibold text-slate-400 leading-relaxed group-hover:text-slate-600 transition-colors">
                  {notif.body}
                </p>

                {/* Footer Micro Log Parameters Array */}
                <div className="flex items-center gap-4 pt-1 text-[9px] font-bold text-slate-400 font-mono select-none">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {notif.date}</span>
                  <span>•</span>
                  <span>Expires: {notif.expires}</span>
                </div>
              </div>

              {/* Right Context Unread Yellow Dot Indicator Match */}
              {!notif.isRead && (
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 absolute right-4 top-4 shadow-sm animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}