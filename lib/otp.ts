import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const OTP_MAX_ATTEMPTS = 5;

export type TwoFactorPurpose = "enable" | "disable" | "login";

/**
 * Cryptographically-random 6-digit numeric code (zero-padded).
 */
export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(OTP_LENGTH, "0");
}

/**
 * The raw OTP is never persisted anywhere — only an HMAC of it, salted with the uid.
 */
export function hashOtpCode(code: string, uid: string): string {
  const secret = process.env.OTP_HASH_SECRET || process.env.NEXTAUTH_SECRET || "handspeak_otp_hash_secret_key";
  return crypto.createHmac("sha256", secret).update(`${uid}:${code}`).digest("hex");
}

/**
 * Constant-time hex digest comparison via crypto.timingSafeEqual.
 */
export function verifyOtpHash(code: string, uid: string, storedHash: string): boolean {
  const expected = hashOtpCode(code, uid);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Masked email utility for confirmation prompts.
 */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] || ""}***@${domain}`;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
}