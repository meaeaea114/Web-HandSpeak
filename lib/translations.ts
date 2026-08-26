// lib/translations.ts

export type Language = 'en' | 'tl';

export const translations = {
  en: {
    dashboard: "Dashboard",
    accountManagement: "Account Management",
    profile: "Profile",
    settings: "Settings",
    saveChanges: "Save Changes",
    savePreferences: "Save Preferences",
    cancel: "Cancel",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    active: "Active",
    archived: "Archived",
    loginActivity: "Login Activity",
    accountActivity: "Account Activity",
    systemPreferences: "System Preferences",
    personalProfile: "Personal Profile",
    passwordSecurity: "Password & Security",
    interfaceLanguage: "Interface Language",
    timeFormat: "Time Format",
    dateFormat: "Date Format",
    appearanceTheme: "Appearance Theme",
    loading: "Loading preferences...",
    errorSaving: "Failed to save preferences. Please try again.",

    // Sidebar / navigation
    feedbackSupport: "Feedback & Support",
    systemAnnouncements: "System Announcements",
    contentManagement: "Content Management",
    logout: "Logout",

    // Header
    searchPlaceholder: "Search students, lessons, gestures...",
    notifications: "Notifications & Announcements",
    noActiveAnnouncements: "No active announcements.",
    accountSettings: "Account Settings",
    signOut: "Sign Out",
    newLabel: "new",
  },
  tl: {
    dashboard: "Dashboard",
    accountManagement: "Pamamahala ng Mga Account",
    profile: "Profile",
    settings: "Mga Setting",
    saveChanges: "I-save ang Mga Pagbabago",
    savePreferences: "I-save ang Mga Kagustuhan",
    cancel: "Kanselahin",
    approve: "Aprubahan",
    reject: "Tanggihan",
    pending: "Nakabinbin",
    active: "Aktibo",
    archived: "Naka-archive",
    loginActivity: "Aktibidad sa Pag-login",
    accountActivity: "Aktibidad ng Account",
    systemPreferences: "Mga Kagustuhan ng System",
    personalProfile: "Personal na Profile",
    passwordSecurity: "Password at Seguridad",
    interfaceLanguage: "Wika ng Interface",
    timeFormat: "Format ng Oras",
    dateFormat: "Format ng Petsa",
    appearanceTheme: "Tema ng Anyo",
    loading: "Naglo-load ng mga kagustuhan...",
    errorSaving: "Bigo na i-save ang mga kagustuhan. Pakisubukan muli.",

    // Sidebar / navigation
    feedbackSupport: "Puna at Suporta",
    systemAnnouncements: "Mga Anunsyo ng System",
    contentManagement: "Pamamahala ng Nilalaman",
    logout: "Mag-logout",

    // Header
    searchPlaceholder: "Maghanap ng mga estudyante, aralin, kilos...",
    notifications: "Mga Abiso at Anunsyo",
    noActiveAnnouncements: "Walang aktibong anunsyo.",
    accountSettings: "Mga Setting ng Account",
    signOut: "Mag-sign Out",
    newLabel: "bago",
  },
};

export const useTranslation = (lang: Language) => {
  return (key: keyof typeof translations['en']) => {
    return translations[lang][key] || translations['en'][key];
  };
};