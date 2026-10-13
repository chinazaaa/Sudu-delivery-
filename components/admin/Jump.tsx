"use client";

import { useRouter } from "next/navigation";

/**
 * A dropdown that goes somewhere.
 *
 * For a filter with more choices than a row of chips can hold without
 * becoming the page. Eighteen families of achievement drew eight rows of
 * buttons above the thing they were meant to be filtering, which is a menu
 * pretending to be a toolbar.
 *
 * Each option carries the address it goes to, so the filter is still a link
 * somebody can send, and the whole thing is one tap on a phone.
 */
export default function Jump({
  label,
  value,
  options,
}: {
  label: string;
  /** The href of the option showing now. */
  value: string;
  options: { href: string; said: string }[];
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <span className="ticket shrink-0 text-[10px] text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => router.push(event.target.value)}
        className="min-w-0 flex-1 rounded-full border-2 border-black/10 bg-white px-3 py-1.5 text-xs font-semibold sm:flex-none"
      >
        {options.map((one) => (
          <option key={one.href} value={one.href}>
            {one.said}
          </option>
        ))}
      </select>
    </label>
  );
}
