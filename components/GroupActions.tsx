"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { closeSharedGroup } from "@/app/actions";
import Sheet from "./Sheet";

/**
 * Share and close, at the top where they are seen.
 *
 * Both were buttons at the bottom of a long page, which is the same as not
 * having them: the two things somebody opens this page to do were below the
 * fold, under everything they did not come for. Sharing especially, because a
 * group with nobody else in it is the whole problem the link solves.
 */
export default function GroupActions({
  groupId,
  shareUrl,
  leaderName,
  leaderOnServer,
  canClose,
}: {
  groupId: string;
  shareUrl: string;
  leaderName: string;
  leaderOnServer: boolean;
  /** Nothing to close until somebody has finalised food. */
  canClose: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [problem, setProblem] = useState("");

  /** Close it, and say so when the server will not. */
  const close = async () => {
    setProblem("");
    setClosing(true);
    const form = new FormData();
    form.set("group_id", groupId);
    try {
      const result = await closeSharedGroup(form);
      if (!result.ok) {
        setProblem(result.error ?? "Could not close that.");
        return;
      }
      setAsking(false);
      router.refresh();
    } catch {
      setProblem("Could not close that. Try again in a moment.");
    } finally {
      setClosing(false);
    }
  };
  const [copied, setCopied] = useState(false);

  const message =
    `${leaderName} is ordering food to campus with Sudu. Add yours and we ` +
    `split one delivery fee: ${shareUrl}`;

  const share = async () => {
    try {
      // The phone's own sheet first, because from here the point is speed:
      // whatever they use most is already the first thing in it. Only `text`,
      // which ends in the link, or the sheet appends it a second time.
      const sheet = typeof navigator !== "undefined" && "share" in navigator;
      if (sheet) {
        await navigator.share({ text: message });
        return;
      }
      // No sheet, so this is a copy, and a copy is the link on its own:
      // whoever pastes it is about to write their own words around it.
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* They closed the sheet. Nothing to report. */
    }
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={share}
          aria-label="Send the link"
          className="grid size-10 place-items-center rounded-full border border-black/10 bg-white"
        >
          {copied ? (
            <span className="text-xs font-bold text-mint">✓</span>
          ) : (
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d="M12 3v13M12 3 8 7M12 3l4 4M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {leaderOnServer && canClose && (
          <button
            type="button"
            onClick={() => setAsking(true)}
            aria-label="Close the cart"
            className="grid size-10 place-items-center rounded-full bg-brand text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Closing cannot be undone and everybody still choosing is left behind,
          so it is asked rather than done. */}
      {asking && (
        <Sheet
          title="Close the cart?"
          onClose={() => {
            setAsking(false);
            router.refresh();
          }}
        >
            <p className="text-sm text-muted">
              Everybody&apos;s delivery is worked out and split evenly, and each of
              them gets their total. Nobody can add after this, and anybody who has
              not finalised their food yet is left out.
            </p>
            {problem !== "" && (
              <p className="text-sm font-semibold text-brand-dark">{problem}</p>
            )}
            <button
              type="button"
              onClick={close}
              disabled={closing}
              className="btn-primary w-full"
            >
              {closing ? "Closing…" : "Yes, close it"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                router.refresh();
              }}
              className="w-full text-sm font-semibold text-muted"
            >
              Not yet
            </button>
        </Sheet>
      )}
    </>
  );
}
