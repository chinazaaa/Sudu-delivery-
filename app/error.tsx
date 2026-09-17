"use client";

import Link from "next/link";

/**
 * When something on the page throws.
 *
 * Next shows its own screen otherwise, which reads as the site being down. A
 * failed save is usually one thing not working rather than everything, so this
 * says what happened and offers to try again.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-10 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-amber-100 text-3xl text-amber-900">
        !
      </span>

      <h1 className="text-xl font-extrabold">That did not go through</h1>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Nothing was changed. Try it again, and if it keeps happening the
        message below says why.
      </p>

      {error.message && (
        <p className="mt-3 w-full break-words rounded-xl bg-black/[0.04] px-3 py-2 text-left text-xs text-ink/80">
          {error.message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary px-6">
          Try again
        </button>
        <Link href="/" className="btn-quiet px-6">
          Back to the menu
        </Link>
      </div>
    </div>
  );
}
