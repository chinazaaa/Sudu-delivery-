"use client";

import { useState } from "react";
import { naira } from "@/lib/money";

export type GroupDraft = {
  name: string;
  required: boolean;
  maxSelect: number;
  options: { name: string; priceDelta: number }[];
};

/** Ready-made choices, because a pizza always needs the same three. */
const PRESETS: { label: string; group: GroupDraft }[] = [
  {
    label: "Size",
    group: {
      name: "Size",
      required: true,
      maxSelect: 1,
      options: [
        { name: "Medium", priceDelta: 0 },
        { name: "Large", priceDelta: 0 },
        { name: "Chairman", priceDelta: 0 },
      ],
    },
  },
  {
    label: "Crust",
    group: {
      name: "Crust",
      required: true,
      maxSelect: 1,
      options: [
        { name: "Classic Hand Tossed", priceDelta: 0 },
        { name: "Thin Crust", priceDelta: 0 },
      ],
    },
  },
  {
    label: "Extras",
    group: { name: "Extras", required: false, maxSelect: 4, options: [] },
  },
  {
    label: "Drink",
    group: { name: "Drink", required: false, maxSelect: 1, options: [] },
  },
];

/**
 * The bit that was missing: sizes, crusts and extras built alongside the item
 * rather than added one at a time afterwards. The draft is posted as JSON in a
 * hidden field, so the whole product saves in one submit.
 */
export default function OptionBuilder({
  name = "groups",
  initial = [],
}: {
  name?: string;
  initial?: GroupDraft[];
}) {
  const [groups, setGroups] = useState<GroupDraft[]>(initial);

  const edit = (index: number, patch: Partial<GroupDraft>) =>
    setGroups((current) =>
      current.map((group, i) => (i === index ? { ...group, ...patch } : group))
    );

  const editOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<{ name: string; priceDelta: number }>
  ) =>
    setGroups((current) =>
      current.map((group, i) =>
        i !== groupIndex
          ? group
          : {
              ...group,
              options: group.options.map((option, j) =>
                j === optionIndex ? { ...option, ...patch } : option
              ),
            }
      )
    );

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(groups)} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted">Add a choice:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="chip border-black/10 bg-white hover:border-ink/30"
            onClick={() =>
              setGroups((current) => [
                ...current,
                { ...preset.group, options: [...preset.group.options] },
              ])
            }
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className="chip border-black/10 bg-white hover:border-ink/30"
          onClick={() =>
            setGroups((current) => [
              ...current,
              { name: "", required: false, maxSelect: 1, options: [] },
            ])
          }
        >
          Something else
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted">
          No choices yet. A plain item sells as it is; add Size, Crust or Extras
          and the customer picks on the product page.
        </p>
      )}

      {groups.map((group, index) => (
        <fieldset
          key={index}
          className="space-y-3 rounded-2xl border border-black/10 bg-white p-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <label className="label">Choice name</label>
              <input
                className="field py-2 text-sm"
                placeholder="Size, Crust, Extras"
                value={group.name}
                onChange={(event) => edit(index, { name: event.target.value })}
              />
            </div>
            <div className="w-28">
              <label className="label">Pick up to</label>
              <input
                type="number"
                min={1}
                className="field py-2 text-sm"
                value={group.maxSelect}
                onChange={(event) =>
                  edit(index, { maxSelect: Math.max(1, Number(event.target.value) || 1) })
                }
              />
            </div>
            <label className="flex items-center gap-2 py-2.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={group.required}
                onChange={(event) => edit(index, { required: event.target.checked })}
              />
              Must choose
            </label>
            <button
              type="button"
              className="chip border-black/10 bg-white text-brand"
              onClick={() =>
                setGroups((current) => current.filter((_, i) => i !== index))
              }
            >
              Remove
            </button>
          </div>

          <ul className="space-y-2">
            {group.options.map((option, optionIndex) => (
              <li key={optionIndex} className="flex flex-wrap items-center gap-2">
                <input
                  className="field grow py-2 text-sm"
                  placeholder="Large, Pepperoni, Extra cheese"
                  value={option.name}
                  onChange={(event) =>
                    editOption(index, optionIndex, { name: event.target.value })
                  }
                />
                <div className="w-36">
                  <input
                    type="number"
                    className="field py-2 text-sm"
                    placeholder="Price change"
                    value={option.priceDelta}
                    onChange={(event) =>
                      editOption(index, optionIndex, {
                        priceDelta: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
                <span className="w-24 text-xs text-muted">
                  {option.priceDelta === 0
                    ? "Same price"
                    : option.priceDelta > 0
                      ? `+${naira(option.priceDelta)}`
                      : `−${naira(Math.abs(option.priceDelta))}`}
                </span>
                <button
                  type="button"
                  className="text-sm font-semibold text-brand"
                  onClick={() =>
                    edit(index, {
                      options: group.options.filter((_, j) => j !== optionIndex),
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn-quiet w-full py-2 text-sm"
            onClick={() =>
              edit(index, {
                options: [...group.options, { name: "", priceDelta: 0 }],
              })
            }
          >
            Add an option to {group.name || "this choice"}
          </button>
        </fieldset>
      ))}
    </div>
  );
}
