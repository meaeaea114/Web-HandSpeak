import { AuthProvider } from '@/lib/auth-context';
import { PreferencesProvider } from '@/lib/preferences-context';
import './globals.css';

// Runs synchronously in <head>, before the page paints, so the correct
// theme class is already on <html> by the time the first pixel renders.
// It only reads a lightweight local cache written by PreferencesProvider —
// Firestore (fetched after auth resolves) remains the actual source of
// truth and will correct this instantly if the cache is stale or missing.
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* These providers MUST wrap the children so useAuth works everywhere */}
        <AuthProvider>
          <PreferencesProvider>
            {children}
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}