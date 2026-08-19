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
        This renders your watercolor image across the whole screen.
        Make sure the file is dropped inside your project's "public" folder 
        and named exactly "bg-parchment.jpg".
      */}
      <div 
        className="flex h-screen w-screen overflow-hidden p-5 gap-5 font-sans antialiased bg-contain bg-repeat bg-center bg-[#F5E6C4]"
        style={{ backgroundImage: "url('/bg-parchment.jpg')" }}
      >
        {/* Floating Sidebar Container Card */}
        <Sidebar />
        
        <div className="flex-1 flex flex-col gap-5 min-w-0 h-full">
          {/* Floating Top Header Card */}
          <Header />
          
          {/* Main Floating Glassmorphic Content Window Canvas */}
          <main className="flex-1 overflow-y-auto rounded-[28px] bg-white/60 backdrop-blur-xl p-6 border border-white/50 shadow-xl">
            {children}
          </main>
        </div>
      </div>
    </PermissionGate>
  );
}