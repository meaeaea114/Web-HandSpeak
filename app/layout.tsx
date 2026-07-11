import { AuthProvider } from '@/lib/auth-context';
import '@/app/globals.css';

export const metadata = {
  title: 'HandSpeak Learning System',
  description: 'Gamified Filipino Sign Language Learning Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* The AuthProvider must wrap the children tree here */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}