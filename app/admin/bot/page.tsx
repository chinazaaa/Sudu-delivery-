import type { Metadata } from "next";

import Panel from "@/components/admin/Panel";
import { checkReading } from "@/lib/bot-check";
import { hostelNames } from "@/lib/hostels";
import { openRestaurants } from "@/lib/menu";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The chat's reading" };

/**
 * Is the chat's reading layer working?
 *
 * A page rather than a figure on a dashboard, because the answer is not a
 * number. It is five sentences and what came back, and the useful part on
 * a bad day is the error text, in full, which no tile can carry.
 *
 * It exists because the chat cannot answer this. The reading layer is
 * built to fail quietly so the shop never stops taking orders over an API
 * having a bad evening, and the price of that is three states nobody can
 * tell apart from outside: no key, no credit, and broken since the day it
 * shipped. This is the one place allowed to say which.
 *
 * Every visit spends a little money, which is why it is a page somebody
 * opens rather than a check that runs itself.
 */
export default async function BotReadingPage() {
  const [hostels, counters] = await Promise.all([
    hostelNames().catch(() => [] as string[]),
    openRestaurants()
      .then((all) => all.map((one) => one.name))
      .catch(() => [] as string[]),
  ]);

  const checked = await checkReading({
    shopName: "Sudu",
    counters,
    hostels,
    nextRun: "tonight between 6pm and 7.30pm",
    cutOff: "4.30 pm",
    open: true,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-[clamp(1.6rem,5vw,2.2rem)] font-black uppercase leading-none">
          The chat&rsquo;s reading
        </h1>
        <p className="hint mt-1">
          Five sentences the shop really gets, put through the reading layer
          just now. Opening this page spends a little money, so it is not
          something that runs on its own.
        </p>
      </header>

      <Panel
        title={checked.working ? "Working" : "Not reading anything"}
        detail={`${checked.model} · ${checked.why}`}
      >
        {checked.went.length === 0 && (
          <p className="pt-2 text-[14.5px] text-muted">
            Nothing was tried, because there is no key to try it with.
          </p>
        )}

        {checked.went.map((one) => (
          <div key={one.said} className="border-t-[1.5px] border-rule py-3">
            <p className="ticket text-[11px] text-muted">
              {one.ms} ms{one.tokens ? ` · ${one.tokens} tokens` : ""}
            </p>
            <p className="text-[15px] font-semibold">{one.said}</p>

            {one.failed ? (
              <p className="mt-1 break-words text-[13.5px] font-semibold text-brand-dark">
                {one.failed}
              </p>
            ) : (
              <dl className="mt-1 text-[13.5px] text-muted">
                <div>
                  <dt className="inline font-semibold">Read as</dt>{" "}
                  <dd className="inline">{one.read?.kind}</dd>
                </div>
                {(one.read?.wanted ?? []).length > 0 && (
                  <div>
                    <dt className="inline font-semibold">Wants</dt>{" "}
                    <dd className="inline">
                      {one.read?.wanted
                        .map((want) => `${want.qty} × ${want.what}`)
                        .join(", ")}
                    </dd>
                  </div>
                )}
                {one.read?.name !== "" && (
                  <div>
                    <dt className="inline font-semibold">Name</dt>{" "}
                    <dd className="inline">{one.read?.name}</dd>
                  </div>
                )}
                {one.read?.phone !== "" && (
                  <div>
                    <dt className="inline font-semibold">Number</dt>{" "}
                    <dd className="inline">{one.read?.phone}</dd>
                  </div>
                )}
                {one.read?.hostel !== "" && (
                  <div>
                    <dt className="inline font-semibold">Block</dt>{" "}
                    <dd className="inline">{one.read?.hostel}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}
