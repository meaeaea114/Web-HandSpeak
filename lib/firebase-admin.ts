import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";

export function initAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "handspeak-96d8d";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/['",]/g, "").trim();
  
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, "").trim();
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "handspeak-96d8d.firebasestorage.app",
    });
  }

  return initializeApp({
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "handspeak-96d8d.firebasestorage.app",
  });
}