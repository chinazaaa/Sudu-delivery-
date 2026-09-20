import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import LinkBuilder from "@/components/admin/LinkBuilder";
import { listCheckoutLinks } from "@/lib/checkout-links";
import { menuView } from "@/lib/menu";
import { getBatch, openBatches } from "@/lib/batches";
import { runDateLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import { hoursByDay, safeSettings } from "@/lib/settings";
import { deliverySlots, sameInstant, windowPhrase } from "@/lib/same-day";
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
export default async function LinksPage({
  searchParams,
}: {
  /** The link being changed, if one is. Editing lives in the address rather
   *  than in a piece of client state, so a half-finished edit survives a
   *  reload and the page can fill the form in on the server. */
  searchParams: Promise<{ edit?: string }>;
}) {
  const [links, menu, batches, settings, site] = await Promise.all([
    listCheckoutLinks(),
    menuView(),
    openBatches(),
    safeSettings(),
    siteUrl(),
  ]);

  const wanted = (await searchParams).edit ?? "";
  const editing = links.find((one) => one.id === wanted) ?? null;
  // The run it was saved against, which may have closed since.
  const savedRun = editing?.batch_id ? await getBatch(editing.batch_id) : null;

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
        // A fresh form per link. Without this, going from the list to an edit
        // keeps the same form alive, and a form's starting values are read
        // once when it appears: the fields stayed empty and the dishes stayed
        // as they were, so Edit looked like it had not worked.
        key={editing?.id ?? "new"}
        editing={
          editing && {
            id: editing.id,
            label: editing.label,
            lines: editing.lines.map((line) => ({
              id: line.menu_item_id,
              qty: line.qty,
              options: line.option_ids ?? [],
            })),
            alternatives: (editing.alternatives ?? []).map((line) => ({
              id: line.menu_item_id,
              qty: line.qty,
              options: line.option_ids ?? [],
            })),
            // Matched to the option it belongs to rather than passed
            // straight through: a time out of the database is written
            // differently from the one in the list, so the dropdown could not
            // recognise its own answer and showed it as something unknown.
            when: editing.batch_id
              ? `run:${editing.batch_id}`
              : (slots.find((slot) => sameInstant(slot.at, editing.deliver_at ?? ""))?.at ??
                editing.deliver_at ??
                ""),
            fee: editing.fee,
            coupon: editing.coupon_code ?? "",
            paymentLink: editing.payment_link,
            note: editing.note,
          }
        }
        dishes={dishes}
        runs={batches
          .map(toBatchView)
          .filter((one) => !one.closed && !one.full)
          .map((one) => ({ id: one.id, label: one.label }))}
        slots={slots.map((slot) => ({ at: slot.at, label: slot.label }))}
        // What this link was saved with, in case it is a run that has since
        // closed or a window that has passed: without it the dropdown falls
        // back to the first option and quietly changes what was saved.
        saved={
          editing
            ? {
                value: editing.batch_id
                  ? `run:${editing.batch_id}`
                  : (editing.deliver_at ?? ""),
                label: editing.batch_id
                  ? savedRun
                    ? `${runDateLabel(savedRun.run_date)} · ${SLOT_LABEL[savedRun.slot]}`
                    : "The run it was made for"

                  // The window it means, said the way the list says it, so a
                  // time that has since passed still reads as a time rather
                  // than as an instant.
                  : editing.deliver_at
                    ? windowPhrase(editing.deliver_at)
                    : "",
              }
            : null
        }
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
                  {/* A link pinned to a time dies quietly: the time passes,
                      and the next person to tap it is told so. Better to see
                      it here, while there is still something to do about
                      it. */}
                  {(() => {
                    const dead =
                      link.deliver_at !== null &&
                      !slots.some((slot) => sameInstant(slot.at, link.deliver_at!));
                    return (
                      <span
                        className={`chip text-xs ${
                          !link.active
                            ? "border-black/10 bg-shell"
                            : dead
                              ? "border-brand/30 bg-brand-tint text-brand-dark"
                              : "border-mint/30 bg-mint/10 text-mint"
                        }`}
                      >
                        {!link.active ? "Stopped" : dead ? "Time has gone" : "Live"}
                      </span>
                    );
                  })()}
                </div>

                <CopyText value={address} label="Copy link" className="px-3 py-2 text-sm" />

                <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-2">
                  <Link
                    href={`/admin/links?edit=${link.id}`}
                    className="chip border-black/10 bg-white text-brand"
                  >
                    Edit
                  </Link>
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
