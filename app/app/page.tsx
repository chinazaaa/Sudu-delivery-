import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
 * So the phone answers it. Android goes to Play, iPhone goes to the App
 * Store, and anything else gets the page with both on it, which is also
 * what somebody on a laptop should see.
 */
export default async function AppPage() {
  const settings = await safeSettings();
  const agent = (await headers()).get("user-agent") ?? "";

  const play = settings.android_package ? playLink(settings.android_package) : "";
  const apple = settings.ios_app_id ? appleLink(settings.ios_app_id) : "";

  if (play && /android/i.test(agent)) redirect(play);
  if (apple && /iphone|ipad|ipod/i.test(agent)) redirect(apple);

  // Neither: nothing to send anybody to, so the shop itself.
  if (!play && !apple) redirect("/");

  return (
    <div className="mx-auto max-w-sm space-y-4 py-8 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Sudu on your phone</h1>
      <p className="text-ink/75">
        The same shop, on your home screen. Your orders and where they have
        got to, without signing in every time.
      </p>

      <div className="space-y-3">
        {apple ? (
          <a href={apple} className="btn-primary block w-full" rel="noopener noreferrer">
            Get it for iPhone
          </a>
        ) : null}
        {play ? (
          <a
            href={play}
            className={apple ? "btn-quiet block w-full" : "btn-primary block w-full"}
            rel="noopener noreferrer"
          >
            Get it for Android
          </a>
        ) : null}
      </div>

      <p className="text-sm text-muted">
        Or carry on in the browser: everything works here too.
      </p>
    </div>
  );
}
