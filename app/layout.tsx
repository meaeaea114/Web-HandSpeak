'use client';

import { AuthProvider } from '@/lib/auth-context';
import '@/app/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased overflow-hidden bg-[#F5E6C4]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}