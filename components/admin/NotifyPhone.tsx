"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { installed, isApple, pushPossible, urlBase64ToBytes } from "@/lib/push-keys";
import type { AdminPhone } from "@/lib/admin-alerts";

/**
 * "Notify this phone", and the list of phones already on it.
 *
 * The button has to be a button. A browser only grants notification
 * permission inside a real tap, so none of this can happen on page load, and
 * asking on load is also how a shop ends up permanently blocked: a prompt
 * nobody expected is a prompt somebody dismisses, and a dismissed prompt
 * cannot be asked again.
 *
 * The iPhone sentence is said in the copy rather than discovered by failing.
 * On iOS the push APIs are simply absent in Safari and present once the site
 * has been added to the Home Screen and opened from there, so somebody
 * tapping this in a tab would otherwise get a dead button and no reason.
 */
export default function NotifyPhone({
  phones,
  publicKey,
}: {
  phones: AdminPhone[];
  /** The VAPID public key, which is public by design and has to reach the
   *  browser for it to subscribe at all. */
  publicKey: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const [error, setError] = useState("");

  // What this particular browser can do, worked out after mount: on the
  // server there is no navigator, and rendering "your phone cannot do this"
  // into the HTML would show it for a moment on every phone that can.
  const [can, setCan] = useState<boolean | null>(null);
  const [needsHome, setNeedsHome] = useState(false);

  useEffect(() => {
    const possible = pushPossible();
    setCan(possible);
    // The one case worth naming: an Apple device, in a tab, where the reason
    // it cannot is fixable in two taps.
    setNeedsHome(!possible && isApple(navigator.userAgent) && !installed());
  }, []);

  async function turnOn() {
    setError("");
    setSaid("");
    setBusy(true);
    try {
      if (!publicKey) {
        throw new Error("No notification key is set on the server. See the note below.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "This phone has notifications blocked for the site. Turn them back on in its settings, then try again."
            : "Nothing was chosen. Tap it again and allow notifications."
        );
      }

      // The worker is registered by the admin layout, so this is normally
      // already settled. Waiting rather than registering again keeps one
      // registration.
      const worker = await navigator.serviceWorker.ready;

      // userVisibleOnly is not optional anywhere: a push that shows nothing
      // is not allowed, and this notifies rather than syncs, so it is true
      // and honest.
      const subscription = await worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(publicKey) as BufferSource,
      });

      const keys = subscription.toJSON().keys ?? {};
      const answer = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh ?? "",
          auth: keys.auth ?? "",
          label,
        }),
      });
      if (!answer.ok) {
        const body = (await answer.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not save that phone.");
      }

      setLabel("");
      setSaid("This phone will buzz from now on.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not turn that on.");
    } finally {
      setBusy(false);
    }
  }

  async function drop(id: string) {
    setError("");
    setSaid("");
    try {
      const answer = await fetch(`/api/admin/push?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!answer.ok) throw new Error("Could not remove that one.");
      router.refresh();
    } catch {
      setError("Could not remove that one.");
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {phones.length === 0 && (
          <li className="soft p-3">
            <p className="hint">
              No phone is being notified. Everything still lands in admin and in
              the email; nothing buzzes.
            </p>
          </li>
        )}

        {phones.map((phone) => (
          <li key={phone.id} className="soft flex flex-wrap items-center gap-2 p-3">
            <span className="font-semibold">{phone.label || "A phone"}</span>
            {phone.dead_at ? (
              <span className="tag bg-brand-wash text-brand-dark">Gone quiet</span>
            ) : (
              <span className="tag bg-mint-tint text-mint">On</span>
            )}
            <span className="ticket text-muted">
              {phone.last_sent_at ? "Last buzzed " + onDay(phone.last_sent_at) : "Not yet used"}
            </span>
            <button
              type="button"
              onClick={() => drop(phone.id)}
              className="btn-admin btn-admin-sm btn-admin-bad ml-auto"
            >
              Forget it
            </button>
          </li>
        ))}
      </ul>

      {can === false && (
        <p className="soft border-volt-line bg-brand-tint p-3 text-[13px] text-brand-dark">
          {needsHome
            ? "On an iPhone this only works once the site has been added to the Home Screen and opened from there. Tap Share, then Add to Home Screen, open Sudu from the icon, and come back to this page."
            : "This browser cannot show notifications. Open admin on the phone you want to be notified on."}
        </p>
      )}

      <div className="field field-admin flex items-center gap-2 p-0 pl-3">
        <label htmlFor="phone-label" className="ticket shrink-0 text-muted">
          Whose
        </label>
        <input
          id="phone-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Shop phone"
          maxLength={60}
          className="min-w-0 flex-1 bg-transparent py-2 outline-none"
        />
      </div>

      <button
        type="button"
        onClick={turnOn}
        disabled={busy || can === false}
        className="btn-admin btn-admin-go w-full disabled:opacity-40 sm:w-auto"
      >
        {busy ? "Asking…" : "Notify this phone"}
      </button>

      {said && <p className="hint text-mint">{said}</p>}
      {error && <p className="hint text-brand-dark">{error}</p>}

      <p className="hint">
        It asks the phone for permission the moment you tap, which is the only
        way a browser allows it. On an iPhone it only works once the site has
        been added to the Home Screen and opened from there: in Safari the
        buttons above do nothing, however many times they are tapped. Android
        and a desktop browser work in an ordinary tab.
      </p>
    </div>
  );
}

/** A date somebody reads at a glance, not a timestamp. */
function onDay(when: string): string {
  try {
    return new Date(when).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}
