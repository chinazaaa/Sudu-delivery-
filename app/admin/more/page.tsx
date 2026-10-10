import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import MoreList from "@/components/admin/MoreList";
import { waitingCounts } from "@/lib/admin";
import { YOU } from "@/lib/admin-nav";
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
        /* This page has its own box for exactly this job, and two search
           fields on one screen is a question about which one does what. */
        search={false}
      />

      <div className="space-y-2.5">
        <MoreList
          waiting={waiting}
          notice={
            /* Said once, here, rather than as a banner over every page: the
               browser bar costs a run sheet two lines of screen, and a phone
               that has it saved keeps working when the signal drops in the
               car park. The board puts it directly under the jump box, which
               is the one place it is passed on the way to everything else. */
            <div className="rounded-xl border-[1.5px] border-volt-line bg-brand-tint px-3.5 py-3">
              <strong className="text-sm">Add Sudu to your home screen</strong>
              <p className="text-[12.5px] leading-[1.4] text-muted">
                Opens full screen, with no browser bar in the way of the sheet. On an iPhone it is
                Share then Add to Home Screen; on Android it is the menu, then Install.
              </p>
            </div>
          }
        />

        <section className="card px-3.5 pb-1.5 pt-2.5">
          <p className="ticket text-muted">You</p>
          {/* Read off the same list the rail's footer pins, rather than
              written out here: these two were also filed under the Site
              heading above, so the More screen listed each of them twice. */}
          {YOU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule px-0.5 py-3"
            >
              <span className="flex-1 text-[14.5px] font-semibold">{item.label}</span>
              <span aria-hidden className="text-[17px] text-muted">
                ›
              </span>
            </Link>
          ))}
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
