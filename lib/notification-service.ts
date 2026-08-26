/**
 * Client-side helper for triggering account status emails.
 * This only ever calls our own server-side API route — no email
 * provider credentials are ever present in client code.
 */

export interface AccountStatusNotificationParams {
  type: "approved" | "rejected";
  fullName: string;
  notificationEmail: string;
  loginEmail?: string;
  role?: string;
  rejectionReason?: string;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
}

export async function sendAccountStatusEmail(
  params: AccountStatusNotificationParams
): Promise<NotificationResult> {
  try {
    const res = await fetch("/api/notifications/account-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "Email notification could not be sent." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error while sending email notification." };
  }
}
