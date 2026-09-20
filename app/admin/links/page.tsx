import PageHeader from "@/components/admin/PageHeader";
import LinkBuilder from "@/components/admin/LinkBuilder";
import { listCheckoutLinks } from "@/lib/checkout-links";
import { menuView } from "@/lib/menu";
import { openBatches } from "@/lib/batches";
import { hoursByDay, safeSettings } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";
import { siteUrl } from "@/lib/admin-templates";
import { naira } from "@/lib/money";
import { stopLink, startLink, removeLink } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CopyText from "@/components/CopyText";

export const dynamic = "force-dynamic";

/**
 * Links somebody can order off.
 *
 * The shop is going to Domino's anyway, one thing is on offer, and the
 * quickest way to sell it is a basket already made up: tap, say who you are,
 * done. It is also how somebody pays by card without a message, because the
 * card link rides along.
 */
export default async function LinksPage() {
  const [links, menu, batches, settings, site] = await Promise.all([
    listCheckoutLinks(),
    menuView(),
    openBatches(),
    safeSettings(),
    siteUrl(),
  ]);

  const slots =
    settings.same_day_on === "on" ? deliverySlots(new Date(), await hoursByDay()) : [];

  const dishes = menu.flatMap((place) =>
    place.items
      .filter((item) => item.available)
      .map((item) => ({
        id: item.id,
        name: item.name,
        restaurant: place.restaurant.name,
        price: item.price,
        // The questions this dish asks. A size changes the price, so a link
        // that skipped it would charge the wrong amount; a crust does not,
        // and is better left to the person eating it.
        groups: item.groups.map((group) => ({
          id: group.id,
          name: group.name,
          required: group.required,
          maxSelect: group.maxSelect,
          options: group.options
            .filter((option) => option.available)
            .map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta,
            })),
        })),
      }))
  );

  return (
    <div>
      <PageHeader
        title="Checkout links"
        detail="A basket made up by hand. Whoever taps it says who they are and where it goes, and that is the order."
      />

      <LinkBuilder
        dishes={dishes}
        runs={batches
          .map(toBatchView)
          .filter((one) => !one.closed && !one.full)
          .map((one) => ({ id: one.id, label: one.label }))}
        slots={slots.map((slot) => ({ at: slot.at, label: slot.label }))}
      />

      <div className="mt-4 space-y-3">
        {links.length === 0 ? (
          <p className="card text-sm text-muted">
            Nothing yet. Pick some food above and you have a link to send.
          </p>
        ) : (
          links.map((link) => {
            const address = `${site}/c/${link.short ?? link.id}`;
            return (
              <article key={link.id} className="card space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold">{link.label || "Untitled"}</h3>
                    <p className="text-sm text-muted">
                      {link.lines.reduce((sum, line) => sum + line.qty, 0)} item
                      {link.lines.reduce((sum, line) => sum + line.qty, 0) === 1 ? "" : "s"}
                      {link.fee !== null && ` · ${naira(link.fee)} delivery`}
                      {link.coupon_code && ` · ${link.coupon_code}`}
                      {link.payment_link !== "" && " · card link on it"}
                      {` · used ${link.used} time${link.used === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span
                    className={`chip text-xs ${
                      link.active ? "border-mint/30 bg-mint/10 text-mint" : "border-black/10 bg-shell"
                    }`}
                  >
                    {link.active ? "Live" : "Stopped"}
                  </span>
                </div>

                <CopyText value={address} label="Copy link" className="px-3 py-2 text-sm" />

                <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-2">
                  <form action={link.active ? stopLink : startLink}>
                    <input type="hidden" name="link_id" value={link.id} />
                    <button type="submit" className="chip border-black/10 bg-white">
                      {link.active ? "Stop it" : "Start it again"}
                    </button>
                  </form>
                  <form action={removeLink}>
                    <input type="hidden" name="link_id" value={link.id} />
                    <ConfirmButton confirm="Yes, delete it">Delete</ConfirmButton>
                  </form>
                  <span className="text-xs text-muted">
                    Stopping keeps the link and tells whoever taps it. Deleting makes
                    it a page that never existed.
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
