import PageHeader from "@/components/admin/PageHeader";
import { requestList } from "@/lib/requests";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { naira } from "@/lib/money";
import { markRequest } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  new: "Waiting on you",
  quoted: "Priced, waiting on them",
  done: "Bought and delivered",
  dropped: "Not going ahead",
};

/**
 * What people have asked for that the shop does not carry.
 *
 * Read it for the pattern as much as for the list. Three people asking for
 * the same power bank in a fortnight is a product; one person asking for a
 * wedding cake is an afternoon's work and nothing more. The point of
 * writing them down is being able to tell those apart.
 */
export default async function RequestsPage() {
  const [asks, settings] = await Promise.all([requestList(), safeSettings()]);
  const waiting = asks.filter((one) => one.status === "new");

  return (
    <div>
      <PageHeader
        title="Asked for"
        detail="Things people wanted that are not on the menu."
      />

      {asks.length === 0 && (
        <div className="card text-sm text-muted">
          Nobody has asked for anything yet. The page is at /custom-order, and
          it is on the front page and wherever a search finds nothing.
        </div>
      )}

      {waiting.length > 0 && (
        <p className="mb-3 text-sm font-bold text-brand-dark">
          {waiting.length} waiting on you.
        </p>
      )}

      <ul className="space-y-3">
        {asks.map((ask) => {
          // Their own words, back to them, so nobody retypes the thing they
          // already said. Sent by hand: it opens WhatsApp and stops there.
          const reply = whatsappLink(
            ask.phone,
            `Hi ${ask.name.split(" ")[0]}, about the ${ask.wanted.slice(0, 60)} ` +
              "you asked Sudu for: "
          );

          return (
            <li key={ask.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{ask.wanted}</p>
                  <p className="text-sm text-muted">
                    {ask.name} · {ask.phone}
                    {ask.hostel ? ` · ${ask.hostel}` : ""}
                  </p>
                  {ask.budget && (
                    <p className="text-sm text-muted">
                      Would pay: {ask.budget}
                    </p>
                  )}
                  {ask.note && <p className="text-sm text-muted">{ask.note}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    ask.status === "new"
                      ? "bg-brand-tint text-brand-dark"
                      : ask.status === "done"
                        ? "bg-mint/10 text-mint"
                        : "bg-black/5 text-muted"
                  }`}
                >
                  {STATUS[ask.status] ?? ask.status}
                  {ask.quoted ? ` · ${naira(ask.quoted)}` : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                {reply && (
                  <a
                    href={reply}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-quiet px-3 py-2 text-sm"
                  >
                    Message them
                  </a>
                )}

                <form action={markRequest} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={ask.id} />
                  <div className="w-28">
                    <label className="label" htmlFor={`quoted-${ask.id}`}>
                      Priced at
                    </label>
                    <input
                      id={`quoted-${ask.id}`}
                      name="quoted"
                      inputMode="numeric"
                      defaultValue={ask.quoted ?? ""}
                      placeholder="0"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <button
                    name="status"
                    value="quoted"
                    className="btn-quiet px-3 py-2 text-sm"
                  >
                    Priced
                  </button>
                  <button
                    name="status"
                    value="done"
                    className="btn-primary px-3 py-2 text-sm"
                  >
                    Done
                  </button>
                  <button
                    name="status"
                    value="dropped"
                    className="btn-quiet px-3 py-2 text-sm"
                  >
                    Drop
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
