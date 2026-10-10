import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import SaveButton from "@/components/SaveButton";
import { everyApplication } from "@/lib/promoter-applications";
import { formatPhone } from "@/lib/phone";
import { whatsappTo } from "@/lib/messages";
import { decideApplication } from "../actions";

export const dynamic = "force-dynamic";

/**
 * People asking to promote the shop.
 *
 * Oldest first among the ones still waiting, because they have waited
 * longest and an application nobody answered is worse than one turned
 * down. Answered ones stay on the page underneath: next term the question
 * is often whether somebody turned down in October is worth a yes now.
 *
 * Approving writes a promoter and nothing else. The link and the PIN go
 * out on WhatsApp by hand from the promoters page, like every other message
 * this shop sends.
 */
export default async function ApplicationsAdmin() {
  const all = await everyApplication().catch(() => []);
  const waiting = all.filter((one) => one.status === "new");
  const answered = all.filter((one) => one.status !== "new");

  return (
    <div>
      <PageHeader
        title="Applications"
        detail="People who asked to promote the shop, from the page that offers it."
        actions={
          <Link href="/become-a-promoter" className="btn-quiet px-4 py-2.5 text-sm">
            See the page they filled in
          </Link>
        }
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-3">
        <Figure
          label="Waiting"
          value={String(waiting.length)}
          detail={waiting.length === 0 ? "Nobody is waiting on you" : "Oldest first below"}
        />
        <Figure
          label="Approved"
          value={String(all.filter((one) => one.status === "approved").length)}
        />
        <Figure
          label="Asked in all"
          value={String(all.length)}
          detail="Since the page went up"
        />
      </div>

      {waiting.length === 0 ? (
        <p className="card text-sm text-muted">
          Nobody is waiting. Applications land here the moment somebody fills the form in on{" "}
          <Link href="/become-a-promoter" className="font-semibold text-brand-dark underline">
            become a promoter
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {waiting.map((one) => (
            <article key={one.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[26px] font-black uppercase leading-none">
                    {one.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {formatPhone(one.phone)} · asked{" "}
                    {new Date(one.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <a
                  href={whatsappTo(one.phone, `Hi ${one.name.split(" ")[0]},`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-quiet px-3 py-2 text-[13px]"
                >
                  Message them
                </a>
              </div>

              <div className="rounded-xl bg-[#f9f7f3] px-4 py-3">
                <p className="ticket text-muted">Where they would post</p>
                <p className="mt-0.5 text-[15px] font-semibold">{one.reach}</p>
              </div>

              {one.said.trim() !== "" && (
                <div className="border-l-4 border-volt bg-brand-tint px-4 py-3 text-[14.5px] leading-relaxed">
                  {one.said}
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t-2 border-line pt-3">
                <form action={decideApplication}>
                  <input type="hidden" name="id" value={one.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <SaveButton className="btn-primary px-4 py-2.5 text-sm">
                    Approve, and make them a promoter
                  </SaveButton>
                </form>
                <form action={decideApplication}>
                  <input type="hidden" name="id" value={one.id} />
                  <input type="hidden" name="decision" value="decline" />
                  <SaveButton className="btn-quiet px-4 py-2.5 text-sm">
                    Not this time
                  </SaveButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <section className="mt-7">
          <h2 className="ticket mb-2 text-muted">Already answered</h2>
          <div className="space-y-2">
            {answered.map((one) => (
              <div
                key={one.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-line bg-paper px-4 py-3 text-sm"
              >
                <strong>{one.name}</strong>
                <span className="text-muted">{one.reach}</span>
                <span
                  className={`chip ml-auto border-0 px-2.5 py-0.5 text-xs ${
                    one.status === "approved"
                      ? "bg-[#dff0e6] text-mint"
                      : "bg-wash text-ink"
                  }`}
                >
                  {one.status === "approved" ? `approved · ${one.code}` : "not this time"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
