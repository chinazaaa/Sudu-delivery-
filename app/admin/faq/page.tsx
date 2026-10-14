import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Empty from "@/components/Empty";
import { faqList } from "@/lib/faq";
import { saveFaq, toggleFaq, deleteFaq } from "./actions";

export const dynamic = "force-dynamic";

/**
 * What the chat is allowed to say.
 *
 * Sudu Bot has no model in it, which is the point: it cannot invent a
 * delivery fee, a refund policy or an opening time, and it will never tell
 * a customer something this shop did not say. The cost of that is it can
 * only answer what it has been given, and this is where it is given.
 *
 * The list is meant to grow sideways rather than be written in one sitting.
 * Somebody asks the chat something it has never heard of; it takes the
 * question and hands it to a person; that person answers them properly, and
 * then presses "Make this a FAQ" on the requests page. From then on the
 * chat answers it in a second, and the thing the shop spends its evenings
 * retyping on WhatsApp is typed once.
 *
 * Other ways of asking matter more than the question itself. Nobody types
 * "What is your delivery fee?"; they type "how much is delivery", "fees?",
 * "wats d price for delivery". So every entry carries a line of other
 * wordings, matched as part of the question, and one entry answers all of
 * them.
 */
export default async function FaqPage() {
  const all = await faqList();
  const on = all.filter((one) => one.active).length;
  const asked = all.reduce((total, one) => total + one.askedCount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat answers"
        detail="What Sudu Bot can answer on its own. It says these words and no others."
        backHref="/admin/requests"
        backLabel="Asked for"
      />

      <div className="card space-y-1 p-3.5 sm:p-4">
        <p className="text-sm font-bold">
          {all.length === 0
            ? "Nothing in here yet"
            : `${on} of ${all.length} switched on${
                asked > 0 ? ` · answered ${asked} time${asked === 1 ? "" : "s"}` : ""
              }`}
        </p>
        <p className="hint">
          The chat only ever says what is written here. Anything it cannot
          answer goes to{" "}
          <Link href="/admin/requests?show=questions" className="font-semibold underline">
            Asked for
          </Link>{" "}
          with the person&apos;s number, and from there it can be turned into
          an answer for next time.
        </p>
        <p className="hint">
          Two things answer themselves and need no entry here: what delivery
          costs, which the chat reads off the live fee ladder so it can never
          go stale, and what is on today, which it reads off the counters
          that are open.
        </p>
      </div>

      {/* New first, because the common visit to this page is arriving with
          a question somebody just asked and wanting it answered for ever. */}
      <section className="card space-y-3 p-3.5 sm:p-4">
        <h2 className="font-bold">Add an answer</h2>
        <form action={saveFaq} className="space-y-3">
          <div>
            <label className="label" htmlFor="new_question">
              The question
            </label>
            <input
              id="new_question"
              name="question"
              required
              className="field"
              placeholder="How much is delivery?"
            />
          </div>
          <div>
            <label className="label" htmlFor="new_answer">
              The answer, in your words
            </label>
            <textarea
              id="new_answer"
              name="answer"
              required
              rows={3}
              className="field"
              placeholder="Delivery starts at ₦4,000 and goes up with how much is in the car. The bill always shows the exact figure before you pay."
            />
          </div>
          <div>
            <label className="label" htmlFor="new_keywords">
              Other ways people ask it
            </label>
            <input
              id="new_keywords"
              name="keywords"
              className="field"
              placeholder="delivery fee, how much is delivery, shipping, fees"
            />
            <p className="hint mt-1">
              Comma separated. This is what makes it get found: nobody types
              the question the way it is written above.
            </p>
          </div>
          <SaveButton>Add it</SaveButton>
        </form>
      </section>

      {all.length === 0 ? (
        <Empty icon="cart" title="No answers yet" href="/admin/requests" action="See what people asked">
          Until there is something in here, the chat takes every question and
          hands it to a person, which is exactly what it did before.
        </Empty>
      ) : (
        <ul className="space-y-2.5">
          {all.map((one) => (
            <li key={one.id} className="card space-y-3 p-3.5 sm:p-4">
              <div className="flex flex-wrap items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{one.question}</span>
                  <span className="hint block">
                    {one.active ? "On" : "Off"}
                    {one.askedCount > 0
                      ? ` · answered ${one.askedCount} time${one.askedCount === 1 ? "" : "s"}`
                      : " · not asked yet"}
                    {one.fromRequestId ? " · from a question somebody asked" : ""}
                  </span>
                </span>

                <form action={toggleFaq} className="shrink-0">
                  <input type="hidden" name="id" value={one.id} />
                  <input type="hidden" name="active" value={one.active ? "false" : "true"} />
                  <ActionButton busy="…" done="Done ✓" className="btn-admin btn-admin-sm">
                    {one.active ? "Switch off" : "Switch on"}
                  </ActionButton>
                </form>
              </div>

              <details>
                <summary className="cursor-pointer text-sm font-semibold">Edit</summary>
                <form action={saveFaq} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={one.id} />
                  <input type="hidden" name="active" value={one.active ? "on" : "off"} />
                  <div>
                    <label className="label">The question</label>
                    <input name="question" defaultValue={one.question} required className="field" />
                  </div>
                  <div>
                    <label className="label">The answer</label>
                    <textarea
                      name="answer"
                      defaultValue={one.answer}
                      required
                      rows={3}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">Other ways people ask it</label>
                    <input name="keywords" defaultValue={one.keywords} className="field" />
                  </div>
                  <div className="w-32">
                    <label className="label">Order</label>
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={one.sortOrder}
                      className="field"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SaveButton>Save</SaveButton>
                  </div>
                </form>
              </details>

              <p className="text-sm text-muted">{one.answer}</p>

              <form action={deleteFaq}>
                <input type="hidden" name="id" value={one.id} />
                <ConfirmButton tone="admin" confirm="Yes, delete it">
                  Delete
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
