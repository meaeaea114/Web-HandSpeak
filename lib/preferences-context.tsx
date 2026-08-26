'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase'; 
import { useAuth } from './auth-context'; 

export type Theme = 'light' | 'dark' | 'system';

export interface UserPreferences {
  language: 'en' | 'tl';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  theme: Theme;
}

const defaultPreferences: UserPreferences = {
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  theme: 'system',
};

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// Local cache key used ONLY to render the correct theme instantly on the next
// page load (avoids a light->dark flash while we wait on Firebase Auth to
// resolve and Firestore to respond). Firestore remains the source of truth
// for the actual preference values — this never substitutes for it.
const THEME_CACHE_KEY = 'handspeak-theme-cache';

function cacheThemeLocally(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // localStorage may be unavailable (private browsing, disabled storage) —
    // the app still works, it just may flash once on the next load.
  }
}

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); 
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id || (user as any)?.uid;

  // Fetch from Firestore
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'admins', userId, 'settings', 'preferences');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetched = { ...defaultPreferences, ...docSnap.data() } as UserPreferences;
          setPreferences(fetched);
          cacheThemeLocally(fetched.theme);
        } else {
          await setDoc(docRef, defaultPreferences);
          cacheThemeLocally(defaultPreferences.theme);
        }
      } catch (err) {
        console.error("Error fetching preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, [userId]);

  // Apply Tailwind & Background Theme Classes
  useEffect(() => {
    const root = document.documentElement;
    
    // Strip all previous theme classes
    root.classList.remove('light', 'dark', 'theme-light', 'theme-dark', 'theme-system');

    if (preferences.theme === 'dark') {
      root.classList.add('dark', 'theme-dark');
    } else if (preferences.theme === 'light') {
      root.classList.add('light', 'theme-light');
    } else {
      root.classList.add('theme-system');
    }
  }, [preferences.theme]);

  // Update function (State + Firestore)
  const updatePreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setError(null);
    const previousPrefs = { ...preferences };
    
    // Optimistic UI update
    setPreferences(prev => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      cacheThemeLocally(value as Theme);
    }

    if (!userId) return;

    try {
      const docRef = doc(db, 'admins', userId, 'settings', 'preferences');
      await setDoc(docRef, { [key]: value }, { merge: true });
    } catch (err) {
      console.error("Failed to save preference:", err);
      setError("Failed to save. Reverting changes.");
      setPreferences(previousPrefs);
      if (key === 'theme') {
        cacheThemeLocally(previousPrefs.theme);
      }
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, loading, error }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
  return context;
};