"use client"; // <--- Add this directive here

import { PermissionGate } from '@/components/auth/permission-gate';
import { Header } from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/sidebar';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGate role="teacher">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar/>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Header onMenuClick={() => {}} />
          <main className="p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </PermissionGate>
  );
}