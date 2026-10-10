"use client";

import { useActionState, useMemo, useState } from "react";
import { sendEmail, type EmailState } from "@/app/admin/actions";

/**
 * Writing one email and sending it.
 *
 * The message is HTML, typed in the box, and shown beside it exactly as it
 * will arrive. There is no editor and no template language on purpose: email
 * clients mangle anything clever, so whoever writes it wants to see the
 * markup they wrote and the thing it makes, side by side, with nothing in
 * between pretending to help.
 *
 * The preview is an iframe with no permissions at all, so a stray script in
 * pasted markup cannot touch the admin page it is sitting in.
 */
export default function EmailComposer({
  from,
  defaultCc = "",
  limitMb,
}: {
  /** The address it will go out as, which is set on the deployment rather
   *  than here: an unverified sender bounces. */
  from: string;
  /** The shop's own addresses, so a copy to ourselves is one tick. */
  defaultCc?: string;
  limitMb: number;
}) {
  const [state, action, pending] = useActionState<EmailState, FormData>(sendEmail, {
    error: null,
    sent: null,
  });

  const [html, setHtml] = useState(STARTER);
  const [subject, setSubject] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [copyUs, setCopyUs] = useState(false);
  const [showing, setShowing] = useState<"preview" | "code">("preview");

  const weight = files.reduce((all, one) => all + one.size, 0);
  const tooHeavy = weight > limitMb * 1024 * 1024;

  // Wrapped so the preview is a page rather than a fragment: an email client
  // puts the markup in a document with a white background and a default
  // font, and a preview on the admin page's cream would flatter it.
  const page = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{margin:0;background:#fff;color:#111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}</style>` +
      `</head><body>${html}</body></html>`,
    [html]
  );

  return (
    <form action={action} className="space-y-4">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="ticket text-muted">From</p>
          <p className="text-sm font-semibold">{from}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="to">
              To
            </label>
            <textarea
              id="to"
              name="to"
              rows={2}
              className="field font-mono text-sm"
              placeholder={"someone@example.com\nanother@example.com"}
              required
            />
            <p className="mt-1 text-xs text-muted">
              One per line, or separated by commas.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="cc">
              Cc
            </label>
            <textarea
              id="cc"
              name="cc"
              rows={2}
              className="field font-mono text-sm"
              placeholder="Optional"
              defaultValue={copyUs ? defaultCc : ""}
              key={copyUs ? "with-us" : "without-us"}
            />
            {defaultCc !== "" && (
              <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={copyUs}
                  onChange={(event) => setCopyUs(event.target.checked)}
                />
                Copy it to us as well
              </label>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              className="field"
              maxLength={200}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="reply_to">
              Replies go to
            </label>
            <input
              id="reply_to"
              name="reply_to"
              type="email"
              className="field"
              placeholder={`Optional, otherwise ${from.replace(/^.*<|>$/g, "")}`}
            />
          </div>
        </div>
      </div>

      {/* The markup and what it makes, side by side on a desktop and on two
          tabs on a phone, because a preview you have to scroll past the code
          to find is a preview nobody looks at. */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="ticket text-muted">The message</p>
          <div className="flex gap-2 lg:hidden">
            {(["preview", "code"] as const).map((which) => (
              <button
                key={which}
                type="button"
                onClick={() => setShowing(which)}
                className={`chip ${showing === which ? "chip-on" : ""}`}
              >
                {which === "preview" ? "Preview" : "HTML"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className={showing === "code" ? "" : "hidden lg:block"}>
            <label className="label" htmlFor="html">
              HTML
            </label>
            <textarea
              id="html"
              name="html"
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              spellCheck={false}
              className="field h-[420px] resize-y font-mono text-xs leading-relaxed"
              required
            />
          </div>

          <div className={showing === "preview" ? "" : "hidden lg:block"}>
            <p className="label">Preview</p>
            <iframe
              title="What the email will look like"
              srcDoc={page}
              sandbox=""
              className="h-[420px] w-full rounded-[10px] border-2 border-ink bg-white"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="files">
            Attachments
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            accept=".pdf,application/pdf,image/png,image/jpeg,.csv,text/csv"
            onChange={(event) => setFiles([...(event.target.files ?? [])])}
            className="field py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            PDFs, images or a CSV. Up to {limitMb}MB for all of them together.
          </p>
        </div>

        {files.length > 0 && (
          <ul className="space-y-1 text-sm">
            {files.map((one) => (
              <li key={one.name} className="flex justify-between gap-3">
                <span className="truncate">{one.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {(one.size / (1024 * 1024)).toFixed(2)}MB
                </span>
              </li>
            ))}
            <li
              className={`flex justify-between gap-3 border-t-2 border-dashed border-line pt-1 font-semibold ${
                tooHeavy ? "text-brand-dark" : ""
              }`}
            >
              <span>{files.length === 1 ? "One file" : `${files.length} files`}</span>
              <span className="font-mono text-xs">
                {(weight / (1024 * 1024)).toFixed(2)}MB
              </span>
            </li>
          </ul>
        )}

        {tooHeavy && (
          <p className="text-sm font-semibold text-brand-dark">
            That is more than {limitMb}MB together, which is more than an email will
            carry. Send the big one as a link instead.
          </p>
        )}
      </div>

      {state.error && (
        <p className="rounded-[10px] border-2 border-brand bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">
          {state.error}
        </p>
      )}

      {state.sent && (
        <p className="rounded-[10px] border-2 border-mint bg-white px-4 py-3 text-sm font-semibold text-mint">
          Sent to {state.sent.to} {state.sent.to === 1 ? "address" : "addresses"}
          {state.sent.cc > 0 ? `, copied to ${state.sent.cc}` : ""}
          {state.sent.files > 0
            ? `, with ${state.sent.files} ${state.sent.files === 1 ? "attachment" : "attachments"}`
            : ""}
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={pending || tooHeavy || subject.trim() === ""}
        >
          {pending ? "Sending…" : "Send it"}
        </button>
        <p className="text-sm text-muted">
          It goes the moment you press this. There is no draft and no undo.
        </p>
      </div>
    </form>
  );
}

/** Something that already looks like an email, so the box is never empty and
 *  nobody has to remember how a table-based layout starts. */
const STARTER = `<div style="max-width:560px;margin:0 auto;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15110e">
  <p style="margin:0 0 4px;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#e5321d">Sudu Delivery</p>
  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.15">Hello</h1>

  <p style="margin:0 0 14px;font-size:15px;line-height:1.55">
    Write the message here.
  </p>

  <p style="margin:24px 0 0">
    <a href="https://sudu.store" style="display:inline-block;background:#e5321d;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px">See the menu</a>
  </p>

  <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#5e564e">
    Sudu Delivery · Pan-Atlantic University, Lagos
  </p>
</div>`;
