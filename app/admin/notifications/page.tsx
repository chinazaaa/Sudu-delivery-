import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import DealPush from "@/components/admin/DealPush";
import { menuView } from "@/lib/menu";
import { dealAudience } from "@/lib/push";
import { liveOccasions } from "@/lib/boxes";
import { listCheckoutLinks } from "@/lib/checkout-links";
import { skincareOn } from "@/lib/skincare";
import { safeSettings } from "@/lib/settings";
import {
  AFTER_HOURS,
  dealSendsWithOutcome,
  lastSentLine,
  outcomeChip,
  sendStamp,
} from "@/lib/deal-sends";

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
  const [menu, audience, occasions, links, settings, sends] = await Promise.all([
    menuView(),
    dealAudience(),
    liveOccasions(),
    listCheckoutLinks().catch(() => []),
    safeSettings(),
    dealSendsWithOutcome(),
  ]);

  // The newest row is the only one the form itself needs: the card inside it
  // says how long ago the last one went, which is the fact that stops a
  // second send on the same afternoon.
  const latest = sends[0] ?? null;

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
          the form and everything else under it, and two from the desk width,
          where the writing is the work and the figures are the aside.
          The warning about sending too often moved into the form, under the
          boxes it is a warning about: standing in this aside, a phone read
          it before there was anything to send. */}
      <div className="grid items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="order-2 min-w-0 lg:order-1">
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
            lastSent={lastSentLine(latest ? latest.sent_at : null)}
          />
        </div>

        <div className="order-1 min-w-0 space-y-3.5 lg:order-2">
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

        </div>

        {/*
          What has already gone.

          A real history now, read off the sends themselves rather than off
          whatever this browser happens to have done since the page was
          opened. The chip on the right is the point of the card: a
          notification is worth sending if orders follow it, and nothing
          else on this page can say whether any ever have.

          A cell of its own rather than part of the aside, because of the
          phone. The aside stands over the form there, which is right for
          the two figures and wrong for this: last in the order on a phone,
          under the form, and the foot of the second column from the desk
          width.
        */}
        {sends.length > 0 && (
          <div className="card order-3 min-w-0 lg:col-start-2">
            <p className="ticket text-muted">Sent before</p>
            {sends.map((one) => {
              const chip = outcomeChip(one);
              return (
                <div
                  key={one.id}
                  className="flex items-start gap-2.5 border-t-[1.5px] border-rule py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-[1.3]">
                      {one.title || "No title"}
                    </span>
                    <span className="hint block">
                      {sendStamp(one.sent_at)} · {one.sent} phone
                      {one.sent === 1 ? "" : "s"}
                    </span>
                  </span>
                  {/* Mint where something came of it, the page's own wash
                      where nothing did. Wash rather than Tomato on purpose:
                      a quiet night is not an error. */}
                  <span
                    className={`tag shrink-0 whitespace-nowrap ${
                      chip.good ? "bg-mint-tint text-mint" : "bg-wash text-ink"
                    }`}
                  >
                    {chip.label}
                  </span>
                </div>
              );
            })}
            <p className="hint mt-2 leading-[1.5]">
              Orders counted in the {AFTER_HOURS} hours after sending. It is
              the only number worth reading here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
