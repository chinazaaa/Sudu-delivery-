import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PageHead from "@/components/PageHead";
import StoreHop from "@/components/StoreHop";
import { safeSettings } from "@/lib/settings";
import { appleLink, playLink } from "@/lib/app-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get the Sudu app",
  description: "Sudu on your home screen, on iPhone and on Android.",
  alternates: { canonical: "/app" },
};

/**
 * One address for both stores.
 *
 * There used to be one app, so every "get the app" on the site could point
 * straight at the App Store and say iPhone out loud. With two, every one of
 * those links would have to ask which phone somebody is holding, and a QR
 * code cannot ask at all: the square printed on a flyer is scanned by both.
 *
 * So the phone answers it: the user agent picks which store to open, and
 * the page opens it by itself a moment after it has drawn. The opening is
 * done in the browser rather than here, because a redirect from here sends
 * no page at all, and the page is what somebody is left looking at when
 * they come back from the store. StoreHop says more about that.
 *
 * Anything we cannot place, a laptop included, is left with both buttons
 * and no hop, which is the right answer for a desk.
 */
export default async function AppPage() {
  const settings = await safeSettings();
  const agent = (await headers()).get("user-agent") ?? "";

  const play = settings.android_package ? playLink(settings.android_package) : "";
  const apple = settings.ios_app_id ? appleLink(settings.ios_app_id) : "";

  // Neither: nothing to send anybody to, so the shop itself.
  if (!play && !apple) redirect("/");

  const android = play !== "" && /android/i.test(agent);
  const ios = apple !== "" && /iphone|ipad|ipod/i.test(agent);
  const hop = android ? play : ios ? apple : "";

  return (
    <article className="-mt-4 pb-10">
      <StoreHop to={hop} />

      <PageHead
        ticket="Sudu on your phone"
        title="Get the app"
        lead={
          hop === ""
            ? "The same shop, on your home screen. Your orders and where they have got to, without signing in every time."
            : "Taking you to the store now. If nothing happens, the button below is the same thing."
        }
        tone="ink"
      />

      <section className="flex flex-col gap-8 py-12 sm:py-14">
        <div className="grid gap-3 sm:grid-cols-2">
          {apple ? (
            <a
              href={apple}
              rel="noopener noreferrer"
              className={`flex flex-col gap-1.5 rounded-2xl border-2 border-ink p-5 transition active:translate-x-0.5 active:translate-y-0.5 ${
                android ? "bg-paper" : "bg-brand text-white"
              }`}
            >
              <span className="font-display text-[30px] font-extrabold uppercase leading-none">
                iPhone
              </span>
              <span
                className={`text-[15px] ${android ? "text-ink/70" : "text-white/80"}`}
              >
                Get it on the App Store.
              </span>
            </a>
          ) : null}

          {play ? (
            <a
              href={play}
              rel="noopener noreferrer"
              className={`flex flex-col gap-1.5 rounded-2xl border-2 border-ink p-5 transition active:translate-x-0.5 active:translate-y-0.5 ${
                android ? "bg-brand text-white" : "bg-paper"
              }`}
            >
              <span className="font-display text-[30px] font-extrabold uppercase leading-none">
                Android
              </span>
              <span
                className={`text-[15px] ${android ? "text-white/80" : "text-ink/70"}`}
              >
                Get it on Google Play.
              </span>
            </a>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5">
          <h2 className="section-title">Rather not?</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary border-2 border-ink">
              Carry on in the browser <span aria-hidden>→</span>
            </Link>
            <Link href="/orders" className="btn-quiet border-2 border-ink">
              My orders
            </Link>
          </div>
        </div>

        <p className="max-w-[580px] text-[15px] leading-relaxed text-ink/70">
          Everything works here too. The app is the same shop with your orders
          already on it, and a notification when the run reaches your block.
        </p>
      </section>
    </article>
  );
}
