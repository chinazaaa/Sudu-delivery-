import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Empty from "@/components/Empty";
import { faqList } from "@/lib/faq";
import { FAQ_PAGES, pageFaqRows } from "@/lib/page-faq";
import AddQuestion from "@/components/admin/AddQuestion";
import {
  saveFaq,
  toggleFaq,
  deleteFaq,
  savePageFaq,
  togglePageFaq,
  deletePageFaq,
  addAnywhere,
} from "./actions";

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
export default async function FaqPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  /*
   * Two different jobs under one roof.
   *
   * The chat's answers and the question sections at the bottom of the
   * landing pages are both "the FAQ" to anybody who has to maintain them,
   * and keeping them on separate pages meant knowing which was which
   * before you could go and fix a sentence. So: tabs, with the chat first
   * because it is the one that grows weekly.
   */
  const said = await searchParams;
  const tab = FAQ_PAGES.some((one) => one.page === said.show) ? said.show! : "chat";
  const section = FAQ_PAGES.find((one) => one.page === tab) ?? null;

  const all = tab === "chat" ? await faqList() : [];
  const rows = section === null ? [] : await pageFaqRows(section.page);
  const on = all.filter((one) => one.active).length;
  const asked = all.reduce((total, one) => total + one.askedCount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={section === null ? "FAQ · chat answers" : `FAQ · ${section.label}`}
        detail={
          section === null
            ? "What Sudu Bot can answer on its own. It says these words and no others."
            : "The questions printed at the bottom of that page, and marked up for Google underneath."
        }
        backHref="/admin/requests"
        backLabel="Custom orders"
      />

      {/* One tap from the top, whichever section it is going into. */}
      <div className="flex justify-end">
        <AddQuestion
          current={tab}
          action={addAnywhere}
          sections={[
            { value: "chat", label: "Chat answers" },
            ...FAQ_PAGES.map((one) => ({ value: one.page, label: one.label })),
          ]}
        />
      </div>

      {/* Which set you are looking at. */}
      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link
          href="/admin/faq"
          className={`shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold ${
            tab === "chat" ? "border-ink bg-ink text-shell" : "border-rule bg-shell"
          }`}
        >
          Chat answers
        </Link>
        {FAQ_PAGES.map((one) => (
          <Link
            key={one.page}
            href={`/admin/faq?show=${one.page}`}
            className={`shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold ${
              tab === one.page ? "border-ink bg-ink text-shell" : "border-rule bg-shell"
            }`}
          >
            {one.label}
          </Link>
        ))}
      </nav>

      {section !== null && (
        <PageQuestions page={section} rows={rows} />
      )}

      {section !== null ? null : (
      <>

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
            Custom orders
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
      </>
      )}
    </div>
  );
}

/**
 * One landing page's questions.
 *
 * Each is the page's own wording with a box over the top, and an empty box
 * means the page's wording. That is worth saying on the page itself rather
 * than only in the code, because "clear it to put it back" is the opposite
 * of what a cleared box usually means, and half these answers carry a live
 * fee that an override would freeze.
 */
function PageQuestions({
  page,
  rows,
}: {
  page: { page: string; label: string; href: string };
  rows: Awaited<ReturnType<typeof pageFaqRows>>;
}) {
  const mine = rows.filter((row) => !row.custom);
  const own = rows.filter((row) => row.custom);

  return (
    <div className="space-y-2.5">
      <div className="card space-y-1 p-3.5 sm:p-4">
        <p className="text-sm font-bold">
          {rows.length === 0
            ? "Nothing recorded yet"
            : `${mine.filter((row) => !row.hidden).length + own.filter((row) => !row.hidden).length} on the page`}
        </p>
        <p className="hint">
          These are written by the page itself, numbers and all. Rewrite one
          here and your words are used instead; empty the boxes and the
          page goes back to writing it. Worth leaving alone where an answer
          quotes a fee, because your words will not follow the price.
        </p>
        <p className="hint">
          <Link href={page.href} className="font-semibold underline" target="_blank">
            Look at {page.label}
          </Link>
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty icon="cart" title="Not read yet" href={page.href} action={`Open ${page.label}`}>
          The page records its questions the first time somebody opens it.
          Open it once and they will all be here to edit.
        </Empty>
      ) : (
        <ul className="space-y-2.5">
          {[...mine, ...own].map((row) => (
            <li key={row.key} className="card space-y-3 p-3.5 sm:p-4">
              <div className="flex flex-wrap items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {row.question || row.default_q}
                  </span>
                  <span className="hint block">
                    {row.hidden ? "Off the page" : "On the page"}
                    {row.custom
                      ? " · yours"
                      : row.question !== "" || row.answer !== ""
                        ? " · rewritten"
                        : " · the page's own words"}
                  </span>
                </span>

                <form action={togglePageFaq} className="shrink-0">
                  <input type="hidden" name="page" value={page.page} />
                  <input type="hidden" name="key" value={row.key} />
                  <input type="hidden" name="hidden" value={row.hidden ? "false" : "true"} />
                  <ActionButton busy="…" done="Done ✓" className="btn-admin btn-admin-sm">
                    {row.hidden ? "Put it back" : "Take it off"}
                  </ActionButton>
                </form>
              </div>

              <details>
                <summary className="cursor-pointer text-sm font-semibold">Edit</summary>
                <form action={savePageFaq} className="mt-3 space-y-3">
                  <input type="hidden" name="page" value={page.page} />
                  <input type="hidden" name="key" value={row.key} />
                  <div>
                    <label className="label">The question</label>
                    <input
                      name="question"
                      defaultValue={row.question}
                      placeholder={row.default_q}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">The answer</label>
                    <textarea
                      name="answer"
                      defaultValue={row.answer}
                      placeholder={row.default_a}
                      rows={5}
                      className="field"
                    />
                  </div>
                  {!row.custom && (
                    <p className="hint">
                      Empty is not blank: empty means the page writes it, which
                      is what the faint wording above shows.
                    </p>
                  )}
                  <SaveButton>Save</SaveButton>
                </form>
                {/* Its own form, outside the one above: a form inside a
                    form is not a thing a browser will do. */}
                {row.custom && (
                  <form action={deletePageFaq} className="mt-2.5">
                    <input type="hidden" name="page" value={page.page} />
                    <input type="hidden" name="key" value={row.key} />
                    <ConfirmButton tone="admin" confirm="Yes, delete it">
                      Delete
                    </ConfirmButton>
                  </form>
                )}
              </details>

              <p className="text-sm text-muted">{row.answer || row.default_a}</p>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
