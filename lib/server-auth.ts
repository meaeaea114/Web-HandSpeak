// ==========================================
// SERVER-ONLY REQUEST AUTHORIZATION HELPER
// ==========================================
// Used by API routes to verify the caller is a signed-in, active
// account with analytics access before doing any paid AI work or
// returning student data. Only import from Route Handlers.

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from './firebase-admin';

const ANALYTICS_ROLES = new Set(['teacher', 'admin', 'principal', 'department']);

export interface AuthorizedCaller {
  uid: string;
  role: string;
  assignedGrade?: string;
  assignedSections?: string[];
}

export type AuthCheckResult =
  | { authorized: true; caller: AuthorizedCaller }
  | { authorized: false; status: number; error: string };

export async function requireAnalyticsAccess(request: NextRequest): Promise<AuthCheckResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!idToken) {
    return { authorized: false, status: 401, error: 'Missing authentication token.' };
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error('ID token verification failed:', err);
    return { authorized: false, status: 401, error: 'Invalid or expired authentication token.' };
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      return { authorized: false, status: 403, error: 'No account record found for this user.' };
    }
    const data = snap.data() || {};
    const role = String(data.role || '').toLowerCase();
    const status = String(data.status || '').toLowerCase();

    if (status !== 'active') {
      return { authorized: false, status: 403, error: 'Account is not active.' };
    }
    if (!ANALYTICS_ROLES.has(role)) {
      return { authorized: false, status: 403, error: 'This account does not have analytics access.' };
    }

    return {
      authorized: true,
      caller: {
        uid,
        role,
        assignedGrade: data.assignedGrade,
        assignedSections: Array.isArray(data.assignedSections) ? data.assignedSections : undefined,
      },
    };
  } catch (err) {
    console.error('Authorization lookup failed:', err);
    return { authorized: false, status: 500, error: 'Could not verify account authorization.' };
  }
}
