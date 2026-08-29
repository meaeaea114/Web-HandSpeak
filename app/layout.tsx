import type { Metadata } from 'next';
import Script from 'next/script';
import { AuthProvider } from '@/lib/auth-context';
import { PreferencesProvider } from '@/lib/preferences-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'HandSpeak - Teacher Dashboard',
  description: 'Interactive FSL Learning and Activity Management',
};

// Script runs before page paints to prevent theme flicker
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var theme = window.localStorage.getItem('handspeak-theme-cache');
    var root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-light', 'theme-dark', 'theme-system');
    if (theme === 'dark') {
      root.classList.add('dark', 'theme-dark');
    } else if (theme === 'light') {
      root.classList.add('light', 'theme-light');
    } else {
      root.classList.add('theme-system');
    }
  } catch (e) {
    document.documentElement.classList.add('theme-system');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          <PreferencesProvider>
            {children}
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}