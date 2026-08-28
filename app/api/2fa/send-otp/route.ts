import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth as adminAuth, getAdminDb as adminDb } from "../../../../lib/firebase-admin";
import { generateOtpCode, hashOtpCode, maskEmail, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, TwoFactorPurpose } from "../../../../lib/otp";
import { sendOtpEmail } from "../../../../lib/email";

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
    const purpose = parsePurpose(body?.purpose);

    const decoded = await adminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = adminDb().collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "Account record not found." }, { status: 404 });
    }

    const userData = userSnap.data() as Record<string, any>;
    const email: string | undefined = userData.email || decoded.email || undefined;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "No email address is on file for this account." },
        { status: 400 }
      );
    }

    const currentlyEnabled = Boolean(userData.twoFactorEnabled);
    if (purpose === "disable" && !currentlyEnabled) {
      return NextResponse.json(
        { success: false, error: "Two-Factor Authentication is not currently enabled." },
        { status: 400 }
      );
    }
    if (purpose === "enable" && currentlyEnabled) {
      return NextResponse.json(
        { success: false, error: "Two-Factor Authentication is already enabled." },
        { status: 400 }
      );
    }

    // Rate-limit consecutive OTP requests
    const existingOtp = userData.twoFactorOtp as { createdAtMs?: number } | undefined;
    if (existingOtp?.createdAtMs && Date.now() - existingOtp.createdAtMs < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existingOtp.createdAtMs)) / 1000);
      return NextResponse.json(
        { success: false, error: `Please wait ${waitSeconds}s before requesting another code.` },
        { status: 429 }
      );
    }

    const code = generateOtpCode();
    const hash = hashOtpCode(code, uid);
    const now = Date.now();

    await userRef.set(
      {
        twoFactorOtp: {
          hash,
          purpose,
          attempts: 0,
          createdAtMs: now,
          expiresAtMs: now + OTP_TTL_MS,
        },
      },
      { merge: true }
    );

    // Whenever a login OTP is requested, reset the verified claim to false
    if (purpose === "login") {
      const userRecord = await adminAuth().getUser(uid);
      await adminAuth().setCustomUserClaims(uid, {
        ...(userRecord.customClaims || {}),
        twoFactorVerified: false,
      });
    }

    await sendOtpEmail(email, code, purpose);

    return NextResponse.json({ success: true, maskedEmail: maskEmail(email) });
  } catch (err: any) {
    console.error("[2fa/send-otp] error:", err);

    if (err?.code === "auth/id-token-expired" || err?.code === "auth/argument-error") {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const message =
      typeof err?.message === "string" && err.message.includes("missing")
        ? err.message
        : "Failed to send verification code. Please try again.";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}