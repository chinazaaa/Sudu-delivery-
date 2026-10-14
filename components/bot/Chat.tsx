"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { naira } from "@/lib/money";

/**
 * The parts a conversation is built out of.
 *
 * A chat is a list of things said and one thing being asked. Keeping the
 * two apart is what lets every step be written as "say this, then ask
 * that" rather than as a pile of flags: the log only ever grows, and the
 * foot is replaced wholesale each time.
 */

export type Line =
  | { kind: "bot"; html: string }
  | { kind: "me"; said: string }
  | { kind: "card"; card: Card }
  | { kind: "status"; tone: "" | "ok" | "warn"; html: string; spinning?: boolean };

export type Card =
  | { of: "slot"; dow: string; dom: number; title: string; when: string; note: string }
  | { of: "bill"; title: string; rows: Row[]; total: { said: string; amount: number } }
  | { of: "pay"; title: string; rows: { k: string; d: string }[] };

export type Row = { said: string; under?: string; amount: number };

export type Ask =
  | { of: "nothing" }
  | { of: "text"; placeholder: string; type?: "text" | "tel"; onSay: (said: string) => void }
  /*
   * Chips, and sometimes a box under them.
   *
   * A row of chips is a question with its answers on it, which is right
   * nearly everywhere. The one place it is not is the basket: the lines are
   * worth tapping, but what somebody wants to say there is "take the
   * chicken off" or "change it to Chicken Republic", and a row of chips with
   * no way to say that is a wall.
   */
  | {
      of: "chips";
      chips: Chip[];
      hint?: string;
      onSay?: (said: string) => void;
      placeholder?: string;
    }
  | { of: "buttons"; buttons: Button[]; hint?: string }
  | { of: "slots"; slots: SlotRow[]; onPick: (at: number) => void };

export type Chip = { said: string; hot?: boolean; go: () => void };
export type Button = { said: string; look?: "alt" | "green"; go?: () => void; href?: string };
export type SlotRow = {
  dow: string;
  dom: number;
  title: string;
  when: string;
  fee: number;
  rush: boolean;
};

const STEPS = ["Details", "Slot", "Kitchen", "Order", "Bill", "Pay", "Done"];

/** The rail across the top, so somebody can see how far in they are. */
export function Rail({ at }: { at: number }) {
  return (
    <div className="steps" aria-hidden>
      {STEPS.map((step, which) => (
        <i key={step} className={which < at ? "done" : which === at ? "on" : ""} />
      ))}
    </div>
  );
}

/** One thing said, by whoever said it. */
export function Said({ line }: { line: Line }) {
  if (line.kind === "me") return <div className="msg me">{line.said}</div>;
  if (line.kind === "bot") {
    return <div className="msg bot" dangerouslySetInnerHTML={{ __html: line.html }} />;
  }
  if (line.kind === "status") {
    return (
      <div className={`status${line.tone ? ` ${line.tone}` : ""}`}>
        {line.spinning ? (
          <span className="spin" />
        ) : (
          <span className="tick" style={line.tone === "warn" ? { background: "var(--bot-tomato)" } : undefined}>
            {line.tone === "warn" ? "!" : "✓"}
          </span>
        )}
        <span dangerouslySetInnerHTML={{ __html: line.html }} />
      </div>
    );
  }
  return <Shown card={line.card} />;
}

/** The dots, while the bot is "typing". */
export function Typing() {
  return (
    <div className="msg bot typing">
      <span />
      <span />
      <span />
    </div>
  );
}

function Shown({ card }: { card: Card }) {
  if (card.of === "slot") {
    return (
      <div className="slot">
        <Cal dow={card.dow} dom={card.dom} />
        <div className="txt">
          <b>{card.title}</b>
          <div>{card.when}</div>
          <small>{card.note}</small>
        </div>
      </div>
    );
  }

  if (card.of === "bill") {
    return (
      <div className="card">
        <h4>{card.title}</h4>
        <div className="body">
          {card.rows.map((row, at) => (
            <div className="li" key={`${at}-${row.said}`}>
              <div className="n">
                <span>{row.said}</span>
                {row.under && <small>{row.under}</small>}
              </div>
              <div className="v">{naira(row.amount)}</div>
            </div>
          ))}
          <div className="rule" />
          <div className="total">
            <span>{card.total.said}</span>
            <span className="v">{naira(card.total.amount)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h4>{card.title}</h4>
      <div className="body">
        {card.rows.map((row) => (
          <Pay key={row.k} said={row.k} detail={row.d} />
        ))}
      </div>
    </div>
  );
}

function Cal({ dow, dom }: { dow: string; dom: number }) {
  return (
    <div className="cal">
      <b>{dow}</b>
      <span>{dom}</span>
    </div>
  );
}

/** A detail with a Copy beside it, because nobody types an account number. */
function Pay({ said, detail }: { said: string; detail: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="payrow">
      <div>
        <div className="k">{said}</div>
        <div className="d">{detail}</div>
      </div>
      <button
        type="button"
        className="copy"
        onClick={() => {
          const done = () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          };
          navigator.clipboard?.writeText(detail).then(done, done) ?? done();
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** Whatever is being asked for right now. */
export function Asking({
  ask,
  whatsapp,
  email = "",
}: {
  ask: Ask;
  whatsapp: string;
  /** The other way out, for somebody who will not open WhatsApp. */
  email?: string;
}) {
  const [typed, setTyped] = useState("");
  const box = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTyped("");
    if (ask.of === "text") {
      const at = setTimeout(() => box.current?.focus(), 60);
      return () => clearTimeout(at);
    }
    return undefined;
  }, [ask]);

  /* Under everything, always. Nobody should ever be stuck in here with no
     way out: a chat that strands somebody is worse than no chat. */
  const help = (
    <div className="bothint">
      Stuck?{" "}
      <a href={whatsapp} target="_blank" rel="noopener noreferrer">
        <b>Continue on WhatsApp</b>
      </a>
      {email !== "" && (
        <>
          {" or "}
          <a href={`mailto:${email}`}>
            <b>email us</b>
          </a>
        </>
      )}
    </div>
  );

  if (ask.of === "nothing") return <div className="foot">{help}</div>;

  if (ask.of === "text") {
    const send = () => {
      const said = typed.trim();
      if (said !== "") ask.onSay(said);
    };
    return (
      <div className="foot">
        <div className="ask">
          <input
            ref={box}
            value={typed}
            type={ask.type ?? "text"}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
            placeholder={ask.placeholder}
            aria-label={ask.placeholder}
          />
          <button type="button" className="send" onClick={send} aria-label="Send">
            ↑
          </button>
        </div>
        {help}
      </div>
    );
  }

  if (ask.of === "chips") {
    const send = () => {
      const said = typed.trim();
      if (said !== "" && ask.onSay) ask.onSay(said);
    };
    return (
      <div className="foot">
        <div className="chips">
          {ask.chips.map((chip) => (
            <button
              key={chip.said}
              type="button"
              className={`chip${chip.hot ? " hot" : ""}`}
              onClick={chip.go}
            >
              {chip.said}
            </button>
          ))}
        </div>
        {ask.onSay && (
          <div className="ask">
            <input
              ref={box}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && send()}
              placeholder={ask.placeholder ?? "Or say it in your own words"}
              aria-label={ask.placeholder ?? "Or say it in your own words"}
            />
            <button type="button" className="send" onClick={send} aria-label="Send">
              ↑
            </button>
          </div>
        )}
        {ask.hint ? <div className="bothint">{ask.hint}</div> : help}
      </div>
    );
  }

  if (ask.of === "slots") {
    return (
      <div className="foot">
        <div className="stack">
          {ask.slots.map((slot, at) => (
            <button
              key={`${slot.title}-${slot.when}`}
              type="button"
              className={`opt${slot.rush ? "" : " keep"}`}
              onClick={() => ask.onPick(at)}
            >
              <Cal dow={slot.dow} dom={slot.dom} />
              <div className="t">
                <b>{slot.title}</b>
                <small>{slot.when}</small>
              </div>
              <div className="p">
                <b>{naira(slot.fee)}</b>
                <small>delivery</small>
              </div>
            </button>
          ))}
        </div>
        <div className="bothint">
          A car of its own goes out for your order alone, at the time you pick.
        </div>
      </div>
    );
  }

  return (
    <div className="foot">
      <div className="stack">
        {ask.buttons.map((button) =>
          button.href ? (
            <a
              key={button.said}
              className={`big${button.look ? ` ${button.look}` : ""}`}
              href={button.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {button.said}
            </a>
          ) : (
            <button
              key={button.said}
              type="button"
              className={`big${button.look ? ` ${button.look}` : ""}`}
              onClick={button.go}
            >
              {button.said}
            </button>
          )
        )}
      </div>
      {ask.hint ? (
        <div className="bothint" dangerouslySetInnerHTML={{ __html: ask.hint }} />
      ) : (
        help
      )}
    </div>
  );
}

/**
 * The queue that makes it feel like somebody is typing.
 *
 * Lines go in and come out one at a time with the dots in between, which is
 * the difference between a conversation and a wall of text appearing at
 * once. Everything waits its turn, so a step can say three things and then
 * ask a question without any of it arriving out of order.
 */
export function useSaying(
  push: (line: Line) => void,
  onIdle: () => void
): {
  say: (line: Line, pause?: number) => void;
  clear: () => void;
  typing: boolean;
} {
  const queue = useRef<{ line: Line; pause: number }[]>([]);
  const busy = useRef(false);
  const [typing, setTyping] = useState(false);
  const slow = useRef(true);

  useEffect(() => {
    slow.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const run = useCallback(() => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) {
      onIdle();
      return;
    }
    busy.current = true;
    const wait = slow.current ? next.pause : 60;
    // The dots only belong to the bot: somebody's own words are already on
    // the screen by the time they are sent.
    if (next.line.kind === "bot") setTyping(true);
    setTimeout(() => {
      setTyping(false);
      push(next.line);
      busy.current = false;
      run();
    }, wait);
  }, [onIdle, push]);

  const say = useCallback(
    (line: Line, pause = 650) => {
      queue.current.push({ line, pause: line.kind === "me" ? 0 : pause });
      run();
    },
    [run]
  );

  const clear = useCallback(() => {
    queue.current = [];
  }, []);

  return { say, clear, typing };
}
