import nodemailer, { Transporter } from "nodemailer";
import type { TwoFactorPurpose } from "./otp";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP credentials are missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in your environment."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

function copyForPurpose(purpose: TwoFactorPurpose): { heading: string; bodyLine: string } {
  switch (purpose) {
    case "enable":
      return {
        heading: "Confirm Two-Factor Authentication",
        bodyLine: "Enter this code to finish enabling Two-Factor Authentication on your HandSpeak account.",
      };
    case "disable":
      return {
        heading: "Confirm Disabling Two-Factor Authentication",
        bodyLine: "Enter this code to confirm you want to turn Two-Factor Authentication OFF for your HandSpeak account.",
      };
    case "login":
    default:
      return {
        heading: "Your HandSpeak Sign-In Code",
        bodyLine: "Enter this code to finish signing in to your HandSpeak account.",
      };
  }
}

export async function sendOtpEmail(to: string, code: string, purpose: TwoFactorPurpose): Promise<void> {
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || `"HandSpeak Security" <${process.env.SMTP_USER}>`;
  const { heading, bodyLine } = copyForPurpose(purpose);

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#FAF6EE;padding:32px;">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid rgba(242,179,61,0.25);">
      <h2 style="color:#521903;margin:0 0 8px;font-size:18px;">${heading}</h2>
      <p style="color:#6b5b4d;font-size:13px;line-height:1.6;margin:0 0 20px;">${bodyLine} This code expires in 5 minutes.</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:#FAF6EE;border:1px solid rgba(242,179,61,0.4);color:#521903;font-weight:700;font-size:28px;letter-spacing:8px;padding:14px 22px;border-radius:12px;">
          ${code}
        </span>
      </div>
      <p style="color:#9c8b7a;font-size:11px;line-height:1.6;margin:0;">
        If you didn't request this code, you can safely ignore this email — no changes will be made to your account.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: heading,
    html,
    text: `${heading}\n\n${bodyLine}\n\nYour verification code: ${code}\n\nThis code expires in 5 minutes. If you didn't request this, you can ignore this email.`,
  });
}