import { getApps, getApp, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;

export function initAdmin(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "handspeak-96d8d";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/['",]/g, "").trim();

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, "").trim();
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        "handspeak-96d8d.firebasestorage.app",
    });
    return app;
  }

  app = initializeApp({
    projectId,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "handspeak-96d8d.firebasestorage.app",
  });
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(initAdmin());
}

export function getAdminDb(): Firestore {
  return getFirestore(initAdmin());
}

export const adminAuth = getAdminAuth;
export const adminDb = getAdminDb;