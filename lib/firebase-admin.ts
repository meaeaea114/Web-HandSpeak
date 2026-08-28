import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

let adminApp: any = null;

function getFirebaseAdmin() {
  if (!adminApp) {
    // Dynamic require inside runtime execution to bypass Turbopack build static analysis
    const admin = eval('require')("firebase-admin");
    
    if (!admin.apps.length) {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        privateKey = privateKey.replace(/^["']|["']$/g, "").trim();
        privateKey = privateKey.replace(/\\n/g, "\n");
      }

      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/['",]/g, "").trim();
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        "handspeak-96d8d";

      if (clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket:
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
            "handspeak-96d8d.firebasestorage.app",
        });
      } else {
        admin.initializeApp({
          projectId,
          storageBucket:
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
            "handspeak-96d8d.firebasestorage.app",
        });
      }
    }
    adminApp = admin;
  }
  return adminApp;
}

export function initAdmin(): App {
  const admin = getFirebaseAdmin();
  return admin.apps[0] as App;
}

export function getAdminAuth(): Auth {
  const admin = getFirebaseAdmin();
  return admin.auth() as Auth;
}

export function getAdminDb(): Firestore {
  const admin = getFirebaseAdmin();
  return admin.firestore() as Firestore;
}

export const adminAuth = getAdminAuth;
export const adminDb = getAdminDb;