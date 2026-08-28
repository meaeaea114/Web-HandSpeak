import * as admin from "firebase-admin";
import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

let app: App | null = null;

export function initAdmin(): App {
  if (app) return app;

  if (admin.apps.length > 0 && admin.apps[0]) {
    app = admin.apps[0] as App;
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
    app = admin.initializeApp({
      credential: admin.credential.cert({
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

  app = admin.initializeApp({
    projectId,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "handspeak-96d8d.firebasestorage.app",
  });
  return app;
}

export function getAdminAuth(): Auth {
  initAdmin();
  return admin.auth();
}

export function getAdminDb(): Firestore {
  initAdmin();
  return admin.firestore();
}

export const adminAuth = getAdminAuth;
export const adminDb = getAdminDb;