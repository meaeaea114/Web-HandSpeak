import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
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

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Initialize Firebase Admin and generate secure reset link
    initAdmin();
    let resetLink: string;

    try {
      resetLink = await getAuth().generatePasswordResetLink(cleanEmail);
    } catch (authError: any) {
      // If user does not exist, return success to prevent email enumeration
      if (authError?.code === "auth/user-not-found") {
        return NextResponse.json({ success: true });
      }
      throw authError;
    }

    // 2. Prepare SMTP Transporter
    const transporter = getTransporter();
    if (!transporter) {
      console.error("[SMTP Error] Reset password failed: SMTP environment variables are missing.");
      return NextResponse.json(
        { success: false, error: "SMTP service is not configured on the server." },
        { status: 503 }
      );
    }

    // 3. Custom HTML Template
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; color: #1e293b;">
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">HandSpeak Portal</h1>
          <p style="font-size: 11px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Password Recovery Request</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
          Hello,
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 28px;">
          We received a request to reset the password for your HandSpeak account. Click the button below to choose a new password:
        </p>

        <div style="margin-bottom: 32px; text-align: center;">
          <a href="${resetLink}" style="display: inline-block; background-color: #f5a623; color: #0f172a; font-size: 13px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);">
            Reset Password
          </a>
        </div>

        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #d97706; word-break: break-all; text-decoration: underline; font-size: 12px;">${resetLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />

        <p style="font-size: 11px; line-height: 1.5; color: #94a3b8; margin: 0;">
          If you did not request this password reset, you can safely ignore this email.<br/><br/>
          Best regards,<br/>
          <strong>The HandSpeak Team</strong>
        </p>
      </div>
    `;

    const fromAddress = process.env.SMTP_FROM || `"HandSpeak Admin" <${process.env.SMTP_USER}>`;

    await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject: "Reset Your HandSpeak Password",
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SMTP Reset Password Error]:", err.message || err);
    return NextResponse.json(
      { success: false, error: "Failed to deliver reset email. Please try again." },
      { status: 500 }
    );
  }
}