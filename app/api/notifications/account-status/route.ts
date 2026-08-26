import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildApprovalEmail, buildRejectionEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

interface AccountStatusRequestBody {
  type: "approved" | "rejected";
  fullName: string;
  notificationEmail: string;
  loginEmail?: string;
  role?: string;
  rejectionReason?: string;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  
  // Checks both SMTP_PASS and SMTP_PASSWORD to match your exact configuration
  const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const pass = rawPass ? rawPass.replace(/[\s"']/g, "") : undefined;

  if (!host || !user || !pass) {
    return null;
  }

  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: AccountStatusRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request payload." }, { status: 400 });
  }

  const { type, fullName, notificationEmail, loginEmail, rejectionReason } = body;

  // Validation
  if (type !== "approved" && type !== "rejected") {
    return NextResponse.json({ success: false, error: "Invalid notification type." }, { status: 400 });
  }

  if (!fullName || !fullName.trim()) {
    return NextResponse.json({ success: false, error: "Applicant name is required." }, { status: 400 });
  }

  if (!isValidEmail(notificationEmail)) {
    return NextResponse.json({ success: false, error: "A valid applicant email is required." }, { status: 400 });
  }

  if (type === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
    return NextResponse.json({ success: false, error: "Rejection reason is required to notify the applicant." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const loginUrl = `${appUrl}/auth/login`;
  const reapplyUrl = `${appUrl}/auth/register`;

  const email =
    type === "approved"
      ? buildApprovalEmail({
          fullName: fullName.trim(),
          notificationEmail: notificationEmail.trim(),
          loginEmail: loginEmail?.trim(),
          loginUrl,
        })
      : buildRejectionEmail({
          fullName: fullName.trim(),
          notificationEmail: notificationEmail.trim(),
          loginEmail: loginEmail?.trim(),
          rejectionReason: (rejectionReason || "").trim(),
          reapplyUrl,
          loginUrl,
        });

  const transporter = getTransporter();

  if (!transporter) {
    console.error("Email notification skipped: SMTP environment variables are missing in .env.local.");
    return NextResponse.json(
      { success: false, error: "Email service is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const sender = process.env.SMTP_FROM || `"HandSpeak Admin" <${process.env.SMTP_USER}>`;

    await transporter.sendMail({
      from: sender,
      to: notificationEmail.trim(),
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to send account status email via Nodemailer:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "The email could not be delivered. Please verify the address and try again." },
      { status: 502 }
    );
  }
}