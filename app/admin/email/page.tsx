import PageHeader from "@/components/admin/PageHeader";
import EmailComposer from "@/components/admin/EmailComposer";
import { adminEmails, ATTACHMENT_LIMIT } from "@/lib/email";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Email, out rather than in.
 *
 * Customers are messaged on WhatsApp, which is where they are, and that has
 * not changed. But some things are not WhatsApp things: a letter to a parent
 * who asked for one, a quote to a hall with the terms attached, an invoice
 * with its PDF. Those were being written in a personal Gmail, from an address
 * nobody recognised, and this puts them on the shop's own.
 */
export default async function EmailPage() {
  const settings = await safeSettings();
  const from = process.env.EMAIL_FROM || "";
  const key = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Send an email"
        detail="Write the HTML, see it as it will arrive, attach what goes with it, and send."
      />

      {!key && (
        <p className="card border-brand bg-brand-tint text-sm font-semibold text-brand-dark">
          There is no RESEND_API_KEY on this deployment, so nothing can go out
          yet. Add it in Vercel under Settings, Environment Variables, and
          redeploy.
        </p>
      )}

      {from === "" && (
        <p className="card border-brand bg-brand-tint text-sm font-semibold text-brand-dark">
          EMAIL_FROM is not set, so email would go out as Resend&apos;s own test
          address, which only reaches your own inbox. Set it to an address on a
          domain you have verified in Resend, written as
          <span className="font-mono"> Sudu Delivery &lt;hello@sudu.store&gt;</span>.
        </p>
      )}

      <EmailComposer
        from={from || "Sudu Delivery <onboarding@resend.dev>"}
        defaultCc={adminEmails(settings.admin_emails).join(", ")}
        limitMb={Math.round(ATTACHMENT_LIMIT / (1024 * 1024))}
      />
    </div>
  );
}
