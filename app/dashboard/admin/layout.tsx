"use client";

import { PermissionGate } from '@/components/auth/permission-gate';
import { Header } from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/sidebar';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGate role="admin">
      {/* 
        CRITICAL FIX: 
        Removed the hardcoded inline background image and bg-[#F5E6C4].
        Added bg-transparent so the dynamic global theme on the <body> shows through.
      */}
      <div className="flex h-screen w-screen overflow-hidden p-5 gap-5 font-sans antialiased bg-transparent">
        {/* Floating Sidebar Container Card */}
        <Sidebar />
        
        <div className="flex-1 flex flex-col gap-5 min-w-0 h-full">
          {/* Floating Top Header Card */}
          <Header />
          
          {/* Main Floating Glassmorphic Content Window Canvas */}
          <main className="flex-1 overflow-y-auto rounded-[28px] bg-white/60 dark:bg-[#1A1816]/80 backdrop-blur-xl p-6 border border-white/50 dark:border-stone-800/50 shadow-xl transition-colors duration-300">
            {children}
          </main>
        </div>
      </div>
    </PermissionGate>
  );
}