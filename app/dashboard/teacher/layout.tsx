import { PermissionGate } from '@/components/auth/permission-gate';
import { Header } from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/sidebar';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. Changed allowedRoles={['admin']} to allowedRole="admin"
    <PermissionGate allowedRole="admin">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar role="admin" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* 2. Removed the title prop since your Header doesn't expect one */}
          <Header />
          <main className="p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </PermissionGate>
  );
}