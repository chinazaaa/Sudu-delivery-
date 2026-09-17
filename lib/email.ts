import { safeSettings } from "./settings";

/**
 * Email to the admins, and only to the admins. Customers are messaged on
 * WhatsApp by hand, as the brief asks; email here is the thing that says "go
 * and look", so it never reaches a customer.
 *
 * Resend is the provider because it needs one API key and no server. With no
 * key set, sending is skipped rather than failing whatever asked for it: an
 * order must never be lost because a notification could not go out.
 */
export async function emailAdmins(subject: string, body: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const settings = await safeSettings();
  const to = adminEmails(settings.admin_emails);
  if (to.length === 0) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Sudu Delivery <onboarding@resend.dev>",
        to,
        subject,
        text: body,
      }),
    });
    return response.ok;
  } catch {
    // A provider being down is not a reason to fail an order.
    return false;
  }
}

/** One address per line, or separated by commas. Blank lines are ignored. */
export function adminEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line));
}
