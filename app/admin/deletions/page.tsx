import PageHeader from "@/components/admin/PageHeader";
import { recentDeletions } from "@/lib/deletions";

export const dynamic = "force-dynamic";

/**
 * Everything deliberately deleted, and by whom.
 *
 * An order went missing overnight and there was no honest answer to "who
 * deleted it", because nothing wrote it down. The log existed from that day;
 * this is the window into it, so the answer is a page rather than a database
 * query somebody has to ask for.
 *
 * The whole row is kept, so a deletion worth asking about is one that can be
 * put back. It is shown as it was stored rather than prettied up: what
 * matters here is that it is complete.
 */
export default async function DeletionsPage() {
  const rows = await recentDeletions();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Deleted"
        detail="Everything taken off the books on purpose, newest first, with who did it and where from."
      />

      {rows.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing has been deleted. Long may it last.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-extrabold">{row.label || row.kind}</h2>
                <span className="chip border-transparent bg-black/5 text-xs font-semibold text-muted">
                  {row.kind}
                </span>
              </div>

              <p className="mt-1 text-sm text-muted">
                {said(row.who)}
                {row.detail ? ` · ${row.detail}` : ""}
                {row.created_at ? ` · ${when(row.created_at)}` : ""}
              </p>

              {row.body !== null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-brand">
                    Everything it held
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-black/[0.03] p-3 text-xs leading-relaxed">
                    {JSON.stringify(row.body, null, 2)}
                  </pre>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const said = (who: string): string =>
  who === "admin"
    ? "An admin"
    : who === "customer"
      ? "The customer themselves"
      : "The shop, on its own";

/** Lagos time, because that is the clock anybody reading this is on. */
const when = (iso: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
};
