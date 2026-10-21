import type { Metadata } from "next";
import Link from "next/link";
import { safeSettings, whatsappLink } from "@/lib/settings";
import PageHead from "@/components/PageHead";
import { wishAction } from "./actions";
import ActionButton from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What do you wish you could order?",
  description:
    "Tell us what you wish you could order to Pan-Atlantic University and we will go and find out if we can get it.",
  alternates: { canonical: "/wish" },
};

/**
 * One box.
 *
 * The custom order page asks for a budget, a name, a number, a block and a
 * note, because by then somebody has decided to buy and we have to be able
 * to quote them. This is the other end of that: a question put to somebody
 * who has decided nothing, off a status they scrolled past. Every field
 * after the first is a reason to close the tab, so there is one, and the
 * number under it says plainly that it can be left empty.
 */
export default async function WishPage({
  searchParams,
}: {
  searchParams: Promise<{ thanks?: string; problem?: string }>;
}) {
  const { thanks, problem } = await searchParams;
  const settings = await safeSettings();

  if (thanks) {
    const again = whatsappLink(
      settings.whatsapp_number,
      "Hi Sudu, one more thing I wish I could order:"
    );
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-5xl">🙌</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Got it, thank you.</h1>
        <p className="text-ink/75">
          If enough people ask for the same thing we go and get it, and it
          turns up on the shop.
        </p>
        <div className="space-y-3 pt-2">
          <Link href="/wish" className="btn-quiet block w-full">
            Add another one
          </Link>
          <Link href="/" className="btn-primary block w-full">
            See what we already carry
          </Link>
          {again ? (
            <a href={again} className="block text-sm font-semibold text-brand">
              Or tell us on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-4">
      <PageHead
        ticket="Wish list · one box · no account"
        title="What do you wish you could order?"
        lead="A restaurant, a snack, a thing from home. Or a brand you wish would come to PAU: tell us who, and we will go and ask them."
        rule={false}
        narrow
      >
        {problem ? (
          <p className="rounded-xl bg-brand-tint px-3.5 py-3 font-semibold text-brand-dark">
            {problem}
          </p>
        ) : null}

        <form
          action={wishAction}
          className="mt-1 flex max-w-[640px] flex-col gap-4 rounded-2xl border-2 border-ink bg-paper p-6 shadow-lift sm:shadow-[10px_10px_0_#e5321d]"
        >
          <div>
            <label className="label text-base" htmlFor="wanted">
              Your wish
            </label>
            {/* Said here as well as in the lead, because the lead is read
                once and the box is what somebody is looking at when they
                start typing. A brand is the wish worth having most: one
                name, said often enough, is the thing we take to them. */}
            <p className="hint mb-1.5">
              A dish, a shop, or a brand you want on campus. Naming a brand
              helps most: enough people asking for the same one is what we
              take to them.
            </p>
            <textarea
              id="wanted"
              name="wanted"
              rows={3}
              required
              autoFocus
              className="field text-lg"
              placeholder="e.g. Krispy Kreme on campus, my mum's jollof…"
            />
          </div>

          <div>
            <label className="label" htmlFor="phone">
              Your number, if you want telling when we get it
            </label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              className="field"
              placeholder="080… (optional)"
            />
          </div>

          <ActionButton
            className="btn-primary w-full border-2 border-ink text-lg"
            busy="Sending…"
            done="Sent ✓"
          >
            Send it
          </ActionButton>
          <p className="text-center text-sm text-muted">
            No account, nothing to sign up for. One box and you are done.
          </p>
        </form>
      </PageHead>
    </div>
  );
}
