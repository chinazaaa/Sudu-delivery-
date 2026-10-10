import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import DealPush from "@/components/admin/DealPush";
import { menuView } from "@/lib/menu";
import { dealAudience } from "@/lib/push";
import { liveOccasions } from "@/lib/boxes";
import { listCheckoutLinks } from "@/lib/checkout-links";
import { skincareOn } from "@/lib/skincare";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Telling everybody something worth knowing.
 *
 * News about an order goes out on its own, because it is about food somebody
 * has already paid for. This page is for the other kind: a deal at a
 * restaurant, cheaper delivery tonight, a code worth using. Everyone here has
 * left the switch on, and can turn it off in the app.
 *
 * The board draws the writing on the left and what is worth knowing before
 * you send on the right, because a notification is one of the few things in
 * admin with no undo: once it has left, four phones have buzzed and the only
 * way to take it back is to send another one.
 */
export default async function NotificationsPage() {
  const [menu, audience, occasions, links, settings] = await Promise.all([
    menuView(),
    dealAudience(),
    liveOccasions(),
    listCheckoutLinks().catch(() => []),
    safeSettings(),
  ]);

  return (
    /* The phone bar inside DealPush carries the send button on a phone, so
       the page leaves room for it under the last card. */
    <div className="pb-[76px] lg:pb-0">
      <PageHeader
        title="Notifications"
        detail="A deal, an offer, a code. It goes to phones with the app, and lands wherever you point it."
        backHref="/admin/more"
        backLabel="More"
      />

      {/* One column on a phone, where the board puts the two figures over
          the form and the warning under it, and two from the desk width,
          where the writing is the work and everything else is the aside. */}
      <div className="grid items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="order-2 lg:order-1">
          <DealPush
            restaurants={menu.map((place) => ({
              id: place.restaurant.id,
              name: place.restaurant.name,
              categories: place.categories,
            }))}
            occasions={occasions.map((one) => ({ slug: one.slug, name: one.name }))}
            links={links
              .filter((one) => one.active && one.short)
              .slice(0, 20)
              .map((one) => ({ short: one.short as string, label: one.label }))}
            skincare={skincareOn(settings)}
            audience={audience}
          />
        </div>

        <div className="order-1 space-y-3.5 lg:order-2">
          <div className="grid grid-cols-2 gap-3.5">
            <Figure
              label="Would reach"
              value={String(audience)}
              detail={audience === 1 ? "phone with the app" : "phones with the app"}
            />
            {/* Not a figure, because the answer is a sentence: the board
                draws order news as the thing you never have to write, next
                to the number of people you are about to write to. */}
            {/* The same tile as the figure beside it, which is why it
                carries the figure card's own phone padding. */}
            <div className="card px-3.5 py-3 sm:p-4">
              <p className="ticket text-muted">Order news</p>
              <p className="mt-1 text-[15px] font-bold leading-[1.25]">
                Sent on its own
              </p>
              <p className="hint mt-1">You never write those</p>
            </div>
          </div>

          {/* A soft note rather than the Ink outline: it is worth reading
              before sending and it is not an error. */}
          <div className="soft border-volt-line bg-brand-tint p-3.5">
            <p className="text-sm font-bold">Send these sparingly</p>
            <p className="hint mt-1">
              More than about two a week and people turn them off in the app.
              There is no undo once one has gone.
            </p>
          </div>

          <Panel title="Where it lands" size="sm">
            <p className="hint">
              Today&apos;s run, the shop, one restaurant, a collection or a
              basket you have already filled. Picked from the lists in the
              form rather than typed, because a notification that opens the
              wrong screen is worse than one nobody sent.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
