'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Megaphone, FolderEdit, Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react';

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

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'Announcement' | 'Content'>('ALL');

  // Static notification logs precisely matching your snapshot criteria
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
      title: 'FSL Content Module Pipeline Update',
      body: '新鮮 bagong modules at custom telemetry guidelines ay matagumpay na na-deploy sa HandSpeak stream repository.',
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

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="w-full h-full flex flex-col justify-start items-stretch gap-4 font-sans antialiased text-[#521903] overflow-hidden">
      
      {/* FILTER TABS STRIP CHIPS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 select-none">
        <div className="flex items-center gap-2">
          {(['ALL', 'Announcement', 'Content'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                filter === tab
                  ? 'bg-[#521903] border-[#521903] text-white shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm border-white/50 text-[#521903]/70 hover:bg-white'
              }`}
            >
              {tab === 'ALL' ? 'All Updates' : tab === 'Announcement' ? 'System Announcements' : 'Content Updates'}
            </button>
          ))}
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full border border-white/50 bg-white/80 hover:bg-white text-[11px] font-bold uppercase tracking-wider text-[#521903]/80 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Mark All As Read
        </button>
      </div>

      {/* MAIN CONTAINER PANEL - FULL SPACE EXPLOITATION WITHOUT VERTICAL SCROLLBARS */}
      <div className="w-full flex-1 bg-white/70 backdrop-blur-md rounded-[24px] border border-white/50 p-6 flex flex-col gap-4 overflow-hidden shadow-[4px_4px_16px_rgba(82,25,3,0.02)]">
        
        {/* Dynamic List Stream mapped directly from client logs */}
        <div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto pr-1 max-h-[380px]">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkAsRead(notif.id)}
              className={`w-full p-5 rounded-2xl border transition-all duration-150 flex gap-4 items-start relative group cursor-pointer ${
                notif.isRead
                  ? 'bg-white/40 border-white/60 text-[#521903]/80'
                  : 'bg-white border-amber-200/70 shadow-sm shadow-amber-700/[0.02]'
              }`}
            >
              {/* Type Left Icon Badge indicator */}
              <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                notif.type === 'Announcement'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
              }`}>
                {notif.type === 'Announcement' ? <Megaphone className="h-4 w-4" /> : <FolderEdit className="h-4 w-4" />}
              </div>

              {/* Title & Body Meta fields */}
              <div className="flex-1 space-y-1 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-[13px] font-bold tracking-tight text-[#521903]">{notif.title}</h4>
                  
                  {/* Severity Pill Element */}
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    notif.severity === 'HIGH'
                      ? 'bg-rose-50 text-rose-500 border border-rose-100'
                      : notif.severity === 'MEDIUM' 
                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {notif.severity}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                  {notif.body}
                </p>

                {/* Footer Micro timestamps registry array */}
                <div className="flex items-center gap-3 pt-1 text-[9px] font-bold text-slate-400 font-mono select-none">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {notif.date}</span>
                  <span>•</span>
                  <span>Expires: {notif.expires}</span>
                </div>
              </div>

              {/* Snapshot Match: Yellow/Orange Alert Unread status dot */}
              {!notif.isRead && (
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 absolute right-5 top-6 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
              )}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}