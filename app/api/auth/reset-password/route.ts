import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import { buildPasswordResetEmail } from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
  const pass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.NODEMAILER_PASSWORD;
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
  });
}

function normalize(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const { name, email } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide the registered Full Name." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your registered institutional email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Initialize Firebase Admin App, Auth, and Firestore
    const adminApp = initAdmin();
    const adminAuth = getAuth(adminApp);
    const adminDb = getFirestore(adminApp);

    // 2. Strict Account Lookup in Firestore
    let matchingUserDoc: any = null;

    // A. Check 'users' collection by primary email
    const usersSnap = await adminDb
      .collection("users")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    if (!usersSnap.empty) {
      matchingUserDoc = usersSnap.docs[0].data();
    } else {
      // B. Check 'users' collection by loginEmail alias
      const loginEmailSnap = await adminDb
        .collection("users")
        .where("loginEmail", "==", cleanEmail)
        .limit(1)
        .get();

      if (!loginEmailSnap.empty) {
        matchingUserDoc = loginEmailSnap.docs[0].data();
      }
    }

    // C. Check 'accountRequests' collection if not found in 'users'
    if (!matchingUserDoc) {
      const reqSnap = await adminDb
        .collection("accountRequests")
        .where("email", "==", cleanEmail)
        .limit(1)
        .get();

      if (!reqSnap.empty) {
        matchingUserDoc = reqSnap.docs[0].data();
      }
    }

    // If account does not exist anywhere in the system
    if (!matchingUserDoc) {
      return NextResponse.json(
        { success: false, error: "No registered account was found with this email address." },
        { status: 404 }
      );
    }

    // Check account status
    if (
      matchingUserDoc.status === "rejected" || 
      matchingUserDoc.status === "deactivated" || 
      matchingUserDoc.status === "archived"
    ) {
      return NextResponse.json(
        { success: false, error: "This account is currently inactive or deactivated. Password reset is not permitted." },
        { status: 403 }
      );
    }

    // 3. Strict Identity Validation: Verify that provided Name matches account record
    const registeredFullName = matchingUserDoc.fullName || matchingUserDoc.name || "";
    const registeredFirstName = matchingUserDoc.firstName || "";
    const registeredLastName = matchingUserDoc.lastName || "";

    const normalizedInputName = normalize(cleanName);
    const normalizedFullName = normalize(registeredFullName);
    const normalizedCombined = normalize(`${registeredFirstName} ${registeredLastName}`);

    const nameMatches =
      normalizedInputName === normalizedFullName ||
      normalizedInputName === normalizedCombined ||
      (normalizedFullName.includes(normalizedInputName) && normalizedInputName.length >= 3) ||
      (normalizedInputName.includes(normalize(registeredLastName)) && normalizedInputName.includes(normalize(registeredFirstName)));

    if (!nameMatches) {
      return NextResponse.json(
        { success: false, error: "The name and email address do not match an existing account." },
        { status: 400 }
      );
    }

    // 4. Resolve Dynamic Origin for the Reset Link
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const headerOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      headerOrigin ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // 5. Generate Password Reset Link with Firebase Admin Auth
    const actionCodeSettings = {
      url: `${origin}/auth/reset-password`,
      handleCodeInApp: true,
    };

    let resetLink: string;
    try {
      const generatedFirebaseLink = await adminAuth.generatePasswordResetLink(
        cleanEmail,
        actionCodeSettings
      );

      const parsedUrl = new URL(generatedFirebaseLink);
      const oobCode = parsedUrl.searchParams.get("oobCode");

      if (!oobCode) {
        throw new Error("Unable to retrieve password reset code.");
      }

      resetLink = `${origin}/auth/reset-password?oobCode=${encodeURIComponent(
        oobCode
      )}&mode=resetPassword`;
    } catch (adminErr: any) {
      console.error("[Firebase Admin Generate Link Error]:", adminErr);
      const errMessage = adminErr?.message || "";

      if (errMessage.includes("RESET_PASSWORD_EXCEED_LIMIT")) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many reset attempts for this email. Please wait 15 minutes before requesting a new link.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate password reset token. Please try again later.",
        },
        { status: 400 }
      );
    }

    // 6. Verify SMTP Transporter
    const transporter = getTransporter();
    if (!transporter) {
      console.error("[SMTP Error] Transporter credentials are not configured.");
      return NextResponse.json(
        { success: false, error: "Email service is temporarily unavailable." },
        { status: 503 }
      );
    }

    // 7. Dispatch Branded Recovery Email
    const { subject, html } = buildPasswordResetEmail({
      fullName: registeredFullName || cleanName,
      resetLink,
    });

    const userEmail = process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
    const fromAddress = process.env.SMTP_FROM || `"HandSpeak Admin" <${userEmail}>`;

    await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject,
      html,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[SMTP Reset Password Error]:", err.message || err);
    return NextResponse.json(
      { success: false, error: "Failed to process password reset request. Please try again." },
      { status: 500 }
    );
  }
}