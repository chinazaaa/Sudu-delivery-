"use client";

import { useEffect, useState } from "react";
import { tidyCode, whyNotACode } from "@/lib/promoter-applications";

/**
 * The code somebody wants, with the answer under the box.
 *
 * The form promised "We will tell you if it is taken", and meant it: in the
 * reply, a day or two later, once they had stopped thinking about it and
 * chosen that spelling in their head. Saying it while the cursor is still
 * in the box is the same promise kept at the moment somebody can act on it.
 *
 * Answered as they stop typing rather than on every keystroke, because the
 * question is about the whole word and a check on "j", "jo", "joh" answers
 * nothing and asks the shop three times to say so.
 *
 * What it says is true of right now, and the wording keeps that honest: a
 * code is really taken at the moment somebody is approved, which may be
 * after this application is read. It never says "yours", only "free".
 */
export default function WantedCode() {
  const [said, setSaid] = useState("");
  const [state, setState] = useState<"" | "asking" | "free" | "taken">("");
  const [why, setWhy] = useState("");

  const code = tidyCode(said);
  const local = whyNotACode(code);

  useEffect(() => {
    // Nothing worth asking about yet, and nothing the shop needs to answer
    // for us: too short is a fact this page already knows.
    if (code === "" || local !== "") {
      setState("");
      setWhy("");
      return;
    }

    setState("asking");
    const stop = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/promoter-code?code=${encodeURIComponent(code)}`, {
        signal: stop.signal,
      })
        .then((answer) => answer.json())
        .then((answer: { free: boolean | null; why?: string }) => {
          if (answer.why) {
            setState("taken");
            setWhy(answer.why);
            return;
          }
          // Null is "could not check", which is not "taken": the box goes
          // quiet rather than turning somebody away over a bad moment on
          // the network.
          if (answer.free === null) {
            setState("");
            setWhy("");
            return;
          }
          setState(answer.free ? "free" : "taken");
          setWhy("");
        })
        .catch(() => {
          // An aborted request is the next keystroke arriving, not a
          // failure, and either way silence is the right answer.
          setState("");
          setWhy("");
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      stop.abort();
    };
  }, [code, local]);

  const note =
    local !== ""
      ? { text: local, tone: "text-muted" }
      : state === "asking"
        ? { text: "Checking…", tone: "text-muted" }
        : state === "free"
          ? { text: `sudu.store/s/${code} is free`, tone: "font-semibold text-mint" }
          : state === "taken"
            ? {
                text: why || "Somebody already has that one. Try another.",
                tone: "font-semibold text-brand-dark",
              }
            : { text: "We will tell you if it is taken.", tone: "text-muted" };

  return (
    <label className="block">
      <span className="label">The code you want</span>
      {/* The address around it, shown rather than explained, so it is
          obvious that the box takes one short word and not a link. */}
      <span className="flex items-center gap-1.5">
        <span className="shrink-0 whitespace-nowrap font-mono text-[13.5px] text-muted">
          sudu.store/s/
        </span>
        <input
          name="wanted_code"
          value={said}
          onChange={(event) => setSaid(event.target.value)}
          className="field"
          maxLength={24}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="johndoe"
        />
      </span>
      {/* One line, in the same place whatever it says, so the form does not
          jump under somebody's thumb as they type. */}
      <span
        aria-live="polite"
        className={`mt-1 block min-h-[1.1rem] text-xs ${note.tone}`}
      >
        {note.text}
      </span>
      {/* What they typed is not always what they would get: capitals, spaces
          and a pasted link all tidy down. Said only when it differs, so the
          common case is not a line of noise. */}
      {code !== "" && code !== said.trim() && (
        <span className="mt-0.5 block text-xs text-muted">
          Saved as <span className="font-mono font-semibold">{code}</span>
        </span>
      )}
    </label>
  );
}
