'use client'

import React, { useState } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { AuthProvider } from '@/lib/auth-context'
import { ProtectedLayout } from '@/components/auth/protected-layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <AuthProvider>
      <ProtectedLayout>
        <div className="flex h-screen bg-background">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 overflow-y-auto bg-background p-8">
              {children}
            </main>
          </div>
        </div>
      </ProtectedLayout>
    </AuthProvider>
  )
}
