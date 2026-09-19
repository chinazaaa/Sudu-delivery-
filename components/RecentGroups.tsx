"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readGroup, seenGroups } from "./GroupLink";

type Party = {
  started?: boolean;
  id?: string;
  leader?: string;
  people?: number;
  ready?: number;
  closed?: boolean;
  when?: string;
};

type Seen = Party & { key: string };

/**
 * The groups this browser has been in lately.
 *
 * Leaving a group, or it closing, forgets which one you are in, and that note
 * was the only way back: after that the group existed only in whatever chat
 * the link arrived in. This is the way back, and it is also how somebody sees
 * that the car they were in has closed and what they owe.
 */
export default function RecentGroups() {
  const [groups, setGroups] = useState<Seen[]>([]);

  useEffect(() => {
    let alive = true;
    const here = readGroup();
    const ids = seenGroups().filter((id) => id !== here);
    if (ids.length === 0) return;

    void Promise.all(
      ids.map((id) =>
        fetch(`/api/party/${id}`)
          .then((response) => response.json())
          .then((data: Party) => ({ ...data, key: id }))
          .catch(() => ({ key: id }) as Seen)
      )
    ).then((all) => {
      if (alive) setGroups(all.filter((one) => one.started));
    });

    return () => {
      alive = false;
    };
  }, []);

  if (groups.length === 0) return null;

  return (
    <section className="card space-y-2">
      <h2 className="font-bold">Groups you have been in</h2>
      <ul className="divide-y divide-black/5 text-sm">
        {groups.map((group) => (
          <li key={group.key}>
            <Link
              href={`/g/${group.id ?? group.key}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0">
                <span className="font-semibold">{group.leader ?? "A group"}</span>
                <span className="block text-xs text-muted">
                  {group.closed
                    ? `Closed · ${group.people ?? 0} ${
                        (group.people ?? 0) === 1 ? "order" : "orders"
                      }`
                    : `${group.ready ?? 0} of ${group.people ?? 0} ready${
                        group.when ? ` · ${group.when}` : ""
                      }`}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-brand">
                {group.closed ? "See the split" : "Open"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
