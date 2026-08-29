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

    // Accessibility & Notification Preferences
    accessibility: "Accessibility",
    largerText: "Larger Text",
    largerTextDesc: "Increase base text size across the app.",
    highContrast: "High Contrast",
    highContrastDesc: "Strengthen borders and text contrast for readability.",
    reducedAnimations: "Reduced Animations",
    reducedAnimationsDesc: "Minimize motion and transition effects.",
    notificationPreferences: "Notification Preferences",
    notifyAnnouncementsLabel: "System Announcements",
    notifyAnnouncementsDesc: "Show system announcement notifications in your feed.",
    notifyFeedbackLabel: "Feedback & Support Updates",
    notifyFeedbackDesc: "Show updates on your feedback and support requests.",
    notifySecurityLabel: "Security Notifications",
    notifySecurityDesc: "Account security alerts cannot be turned off.",
    alwaysOn: "Always On",

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

    // Accessibility & Notification Preferences
    accessibility: "Accessibility",
    largerText: "Mas Malaking Teksto",
    largerTextDesc: "Palakihin ang laki ng teksto sa buong app.",
    highContrast: "Mataas na Contrast",
    highContrastDesc: "Palakasin ang border at contrast ng teksto para sa mas madaling pagbasa.",
    reducedAnimations: "Bawasan ang Animation",
    reducedAnimationsDesc: "Bawasan ang galaw at transition effects.",
    notificationPreferences: "Mga Kagustuhan sa Abiso",
    notifyAnnouncementsLabel: "Mga Anunsyo ng System",
    notifyAnnouncementsDesc: "Ipakita ang mga abiso ng anunsyo ng system sa iyong feed.",
    notifyFeedbackLabel: "Mga Update sa Puna at Suporta",
    notifyFeedbackDesc: "Ipakita ang mga update sa iyong puna at kahilingan sa suporta.",
    notifySecurityLabel: "Mga Abiso sa Seguridad",
    notifySecurityDesc: "Hindi maaaring i-off ang mga alerto sa seguridad ng account.",
    alwaysOn: "Palaging Naka-on",

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