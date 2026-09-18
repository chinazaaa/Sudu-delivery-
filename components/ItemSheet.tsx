"use client";

import { readGroup } from "./GroupLink";

import { useEffect, useState } from "react";
import Thumb from "./Thumb";
import { addLine, addPerson, setActivePerson, usePeople } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { ItemView } from "@/lib/view";

/**
 * The choices sheet: size, flavour, extras, quantity, add. It slides up from
 * the bottom because that is where a thumb is.
 */
export default function ItemSheet({
  item,
  restaurant,
  onClose,
}: {
  item: ItemView;
  restaurant: { id: string; name: string };
  onClose: () => void;
}) {
  // Somebody in a group is ordering their own food, so naming bags and
  // offering a link they already have is two things they do not need.
  const [inParty, setInParty] = useState(false);
  useEffect(() => setInParty(readGroup() !== ""), []);

  const { people, active } = usePeople();
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [newPerson, setNewPerson] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const chosenIds = Object.values(picked).flat();
  const chosen = item.groups.flatMap((g) => g.options).filter((o) => chosenIds.includes(o.id));
  const unitPrice = item.price + chosen.reduce((sum, o) => sum + o.priceDelta, 0);
  const missing = item.groups.filter((g) => g.required && (picked[g.id] ?? []).length === 0);

  function toggle(groupId: string, optionId: string, maxSelect: number) {
    setPicked((current) => {
      const already = current[groupId] ?? [];
      if (maxSelect === 1) return { ...current, [groupId]: [optionId] };
      return {
        ...current,
        [groupId]: already.includes(optionId)
          ? already.filter((id) => id !== optionId)
          : already.length < maxSelect
            ? [...already, optionId]
            : already,
      };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-shell sm:rounded-3xl">
        <div className="flex shrink-0 items-start gap-3 bg-paper p-4">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="relative size-20 shrink-0 overflow-hidden rounded-xl"
            aria-label={`See ${item.name} bigger`}
          >
            <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
            <span className="absolute bottom-1 right-1 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
              Expand
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              {restaurant.name}
            </p>
            <h2 className="text-xl font-extrabold leading-tight">{item.name}</h2>
            <p className="font-bold">{naira(item.price)}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.06] font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pt-0">
          {item.description && <p className="text-muted">{item.description}</p>}

          {item.groups.map((group) => (
            <fieldset key={group.id} className="card space-y-2">
              <legend className="flex w-full items-baseline justify-between gap-2">
                <span className="font-bold">{group.name}</span>
                <span className="text-xs font-semibold text-muted">
                  {group.required ? "Pick one" : "Optional"}
                  {group.maxSelect > 1 && ` · up to ${group.maxSelect}`}
                </span>
              </legend>

              {group.options.map((option) => {
                const isPicked = (picked[group.id] ?? []).includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                      isPicked ? "border-brand bg-brand-tint" : "border-black/10"
                    } ${option.available ? "" : "opacity-40"}`}
                  >
                    <span className="flex items-center gap-3 font-medium">
                      <input
                        type={group.maxSelect === 1 ? "radio" : "checkbox"}
                        name={group.id}
                        checked={isPicked}
                        disabled={!option.available}
                        onChange={() => toggle(group.id, option.id, group.maxSelect)}
                        className="size-4 accent-[#ff5a1f]"
                      />
                      {option.name}
                    </span>
                    {option.priceDelta !== 0 && (
                      <span className="text-sm font-semibold text-muted">
                        {option.priceDelta > 0 ? "+" : "−"}
                        {naira(Math.abs(option.priceDelta))}
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>
          ))}

          {!inParty && (
          <div className="card space-y-2">
            <p className="font-bold">Who is this for?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActivePerson("")}
                className={`chip ${
                  active === "" ? "border-brand bg-brand text-white" : "border-black/10 bg-paper"
                }`}
              >
                Me
              </button>
              {people.map((person) => (
                <button
                  key={person.name}
                  type="button"
                  onClick={() => setActivePerson(person.name)}
                  className={`chip ${
                    active === person.name
                      ? "border-brand bg-brand text-white"
                      : "border-black/10 bg-paper"
                  }`}
                >
                  {person.name}
                </button>
              ))}

              {addingPerson ? (
                <span className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newPerson}
                    onChange={(e) => setNewPerson(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      addPerson(newPerson);
                      setNewPerson("");
                      setAddingPerson(false);
                    }}
                    placeholder="Name"
                    className="field w-28 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    className="chip border-black/10 bg-paper"
                    onClick={() => {
                      addPerson(newPerson);
                      setNewPerson("");
                      setAddingPerson(false);
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="chip border-transparent bg-transparent text-muted"
                    onClick={() => {
                      setNewPerson("");
                      setAddingPerson(false);
                    }}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingPerson(true)}
                  className="chip border-dashed border-black/25 bg-paper text-muted"
                >
                  + A friend
                </button>
              )}
            </div>
            <p className="text-xs text-muted">
              Bags are labelled with these names on delivery.
            </p>
          </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-black/5 bg-paper p-4">
          <div className="flex items-center gap-1 rounded-full border border-black/10 p-1">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="size-10 rounded-full text-xl leading-none hover:bg-black/5"
              aria-label="One less"
            >
              −
            </button>
            <span className="w-7 text-center text-lg font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="size-10 rounded-full text-xl leading-none hover:bg-black/5"
              aria-label="One more"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={missing.length > 0}
            onClick={() => {
              addLine(
                {
                  itemId: item.id,
                  optionIds: chosenIds,
                  name: item.name,
                  restaurantId: restaurant.id,
                  restaurantName: restaurant.name,
                  imageUrl: item.imageUrl,
                  unitPrice,
                  choices: chosen.map((o) => o.name),
                },
                qty
              );
              onClose();
            }}
            className="btn-primary flex-1 py-3.5 text-base"
          >
            {missing.length > 0
              ? `Choose ${missing[0].name.toLowerCase()}`
              : `Add${active ? ` for ${active}` : ""} · ${naira(unitPrice * qty)}`}
          </button>
        </div>
      </div>

      {zoomed && (
        <button
          type="button"
          onClick={() => setZoomed(false)}
          className="absolute inset-0 z-10 flex items-center justify-center bg-ink/90 p-6"
          aria-label="Close the picture"
        >
          <span className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl">
            <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
          </span>
        </button>
      )}
    </div>
  );
}
