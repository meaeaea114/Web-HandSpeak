import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth as adminAuth, getAdminDb as adminDb } from "../../../../lib/firebase-admin";
import { verifyOtpHash, OTP_MAX_ATTEMPTS, TwoFactorPurpose } from "../../../../lib/otp";

export const runtime = "nodejs";

function parsePurpose(value: unknown): TwoFactorPurpose {
  if (value === "enable" || value === "disable") return value;
  return "login";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ success: false, error: "Missing authentication token." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    const purpose = parsePurpose(body?.purpose);

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, error: "Enter the 6-digit code." }, { status: 400 });
    }

    const decoded = await adminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = adminDb().collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "Account record not found." }, { status: 404 });
    }

    const data = userSnap.data() as Record<string, any>;
    const otp = data.twoFactorOtp as
      | { hash: string; purpose: string; attempts?: number; expiresAtMs: number }
      | undefined;

    if (!otp || otp.purpose !== purpose) {
      return NextResponse.json(
        { success: false, error: "No pending verification code. Please request a new code." },
        { status: 400 }
      );
    }

    if (Date.now() > otp.expiresAtMs) {
      await userRef.update({ twoFactorOtp: FieldValue.delete() });
      return NextResponse.json(
        { success: false, error: "This code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if ((otp.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      await userRef.update({ twoFactorOtp: FieldValue.delete() });
      return NextResponse.json(
        { success: false, error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (!verifyOtpHash(code, uid, otp.hash)) {
      await userRef.update({ "twoFactorOtp.attempts": FieldValue.increment(1) });
      const remaining = Math.max(OTP_MAX_ATTEMPTS - ((otp.attempts || 0) + 1), 0);
      return NextResponse.json(
        { success: false, error: `Incorrect code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = { twoFactorOtp: FieldValue.delete() };
    if (purpose === "enable") updates.twoFactorEnabled = true;
    if (purpose === "disable") updates.twoFactorEnabled = false;

    await userRef.update(updates);

    if (purpose === "login") {
      const userRecord = await adminAuth().getUser(uid);
      await adminAuth().setCustomUserClaims(uid, {
        ...(userRecord.customClaims || {}),
        twoFactorVerified: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[2fa/verify-otp] error:", err);

    if (err?.code === "auth/id-token-expired" || err?.code === "auth/argument-error") {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: false, error: "Failed to verify code. Please try again." }, { status: 500 });
  }
}