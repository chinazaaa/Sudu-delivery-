"use client";

import { useState } from "react";
import {
  addPerson,
  clearPeople,
  removePerson,
  setActivePerson,
  useCart,
  usePeople,
} from "@/lib/cart";

/**
 * Group ordering, done while shopping rather than sorted out at the end.
 * Whoever is selected here owns everything added next, so a room of four can
 * be carted in one pass without anyone typing a name per item.
 */
export default function PeopleBar() {
  const { people, active } = usePeople();
  const cart = useCart();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const countFor = (person: string) =>
    cart.filter((l) => l.forName === person).reduce((n, l) => n + l.qty, 0);
  const unassigned = cart.filter((l) => !l.forName).reduce((n, l) => n + l.qty, 0);

  function submit() {
    addPerson(name);
    setName("");
    setAdding(false);
  }

  if (people.length === 0 && !adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-black/15 bg-white px-4 py-3 text-left transition hover:border-brand"
      >
        <span>
          <span className="block font-semibold">Ordering for friends?</span>
          <span className="block text-sm text-ink/55">
            Add their names and shop for each of them. Bags are labelled at the drop
            point.
          </span>
        </span>
        <span className="btn-quiet shrink-0 px-3 py-1.5 text-sm">Start</span>
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-black/5 bg-white p-3 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Shopping for</p>
        <button
          type="button"
          onClick={clearPeople}
          className="text-xs text-ink/45 hover:text-brand"
        >
          Turn off group
        </button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActivePerson("")}
          className={`chip ${
            active === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          Me
          {unassigned > 0 && (
            <span className={active === "" ? "text-white/70" : "text-ink/45"}>
              {unassigned}
            </span>
          )}
        </button>

        {people.map((person) => (
          <span
            key={person}
            className={`chip ${
              active === person
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white"
            }`}
          >
            <button type="button" onClick={() => setActivePerson(person)}>
              {person}
            </button>
            {countFor(person) > 0 && (
              <span className={active === person ? "text-white/70" : "text-ink/45"}>
                {countFor(person)}
              </span>
            )}
            <button
              type="button"
              onClick={() => removePerson(person)}
              aria-label={`Remove ${person}`}
              className={active === person ? "text-white/60" : "text-ink/35"}
            >
              ✕
            </button>
          </span>
        ))}

        {adding ? (
          <span className="flex shrink-0 items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Name"
              className="field w-28 py-1 text-sm"
            />
            <button type="button" onClick={submit} className="btn-quiet px-3 py-1 text-sm">
              Add
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="chip border-dashed border-black/20 bg-white"
          >
            + Add person
          </button>
        )}
      </div>

      <p className="text-xs text-ink/50">
        Everything you add now goes to{" "}
        <span className="font-semibold text-ink/70">{active || "you"}</span>. Tap a name
        to switch.
      </p>
    </div>
  );
}
