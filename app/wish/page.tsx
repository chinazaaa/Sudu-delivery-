import type { Metadata } from "next";
import Link from "next/link";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { wishAction } from "./actions";

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
    <div className="mx-auto max-w-md space-y-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          What do you wish you could order to campus?
        </h1>
        <p className="text-ink/75">
          Anything. A restaurant we do not have yet, something from the
          market, skincare, a pharmacy run, or a thing somebody has to go out
          and buy. Tell us and we will find out if we can get it.
        </p>
      </header>

      {problem ? (
        <p className="card border-brand/30 bg-brand/5 font-semibold text-brand">{problem}</p>
      ) : null}

      <form action={wishAction} className="card space-y-4">
        <div>
          <label className="label" htmlFor="wanted">
            What is it?
          </label>
          <textarea
            id="wanted"
            name="wanted"
            rows={3}
            required
            autoFocus
            className="field"
            placeholder="Shawarma from Sangotedo at night"
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
            placeholder="Optional"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Send it
        </button>
        <p className="text-center text-xs text-muted">
          No account, nothing to sign up for. One box and you are done.
        </p>
      </form>
    </div>
  );
}
