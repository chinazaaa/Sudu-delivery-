import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import MoreList from "@/components/admin/MoreList";
import { waitingCounts } from "@/lib/admin";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The phone's way into everything that is not one of the four in the bar.
 *
 * On a desk this page is a second copy of the rail, which is why nothing
 * links to it there. On a phone it is the rail: the bar carries the four
 * things open every day, and the other twenty-four live here under the same
 * headings, with a box to jump straight to one.
 */
export default async function MorePage() {
  const waiting = await waitingCounts();

  return (
    <div>
      <PageHeader
        title="More"
        detail="The four you use daily live in the bar below. Everything else is here."
      />

      <div className="space-y-2.5">
        <MoreList waiting={waiting} />

        {/* Said once, here, rather than as a banner over every page: the
            browser bar costs a run sheet two lines of screen, and a phone
            that has it saved keeps working when the signal drops in the
            car park. */}
        <div className="rounded-xl border-[1.5px] border-volt-line bg-brand-tint px-3.5 py-3">
          <strong className="text-sm">Add Sudu to your home screen</strong>
          <p className="text-[12.5px] leading-[1.4] text-muted">
            Opens full screen, with no browser bar in the way of the sheet. On an iPhone it is
            Share then Add to Home Screen; on Android it is the menu, then Install.
          </p>
        </div>

        <section className="card px-3.5 pb-1.5 pt-2.5">
          <p className="ticket text-muted">You</p>
          <Link
            href="/admin/settings"
            className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule px-0.5 py-3"
          >
            <span className="flex-1 text-[14.5px] font-semibold">Settings</span>
            <span aria-hidden className="text-[17px] text-muted">
              ›
            </span>
          </Link>
          <Link
            href="/admin/deletions"
            className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule px-0.5 py-3"
          >
            <span className="flex-1 text-[14.5px] font-semibold">Deleted</span>
            <span aria-hidden className="text-[17px] text-muted">
              ›
            </span>
          </Link>
          <Link
            href="/"
            className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule px-0.5 py-3 text-brand-dark"
          >
            <span className="flex-1 text-[14.5px] font-semibold">View the shop ↗</span>
          </Link>
          <form
            action={logout}
            className="flex min-h-[46px] items-center border-t-[1.5px] border-rule px-0.5 py-3"
          >
            <button className="text-[14.5px] font-semibold text-muted">Sign out</button>
          </form>
        </section>
      </div>
    </div>
  );
}
