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
 * The cars this browser has actually ordered in.
 *
 * Closed ones only, because an open group is either the one you are in, and
 * the bar says so, or one you left, and there is nothing of yours in it. What
 * this is for is the split: the group closed, your order came out of it, and
 * this is how you find what everybody owed after the bar has forgotten the
 * group entirely.
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
      // Closed only: the rest are not somewhere anybody needs to go back to.
      if (alive) setGroups(all.filter((one) => one.started && one.closed));
    });

    return () => {
      alive = false;
    };
  }, []);

  if (groups.length === 0) return null;

  return (
    <section className="card space-y-2">
      <h2 className="font-bold">Groups you ordered in</h2>
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
                  {`Closed · ${group.people ?? 0} ${
                    (group.people ?? 0) === 1 ? "order" : "orders"
                  }`}
                  {group.when ? ` · ${group.when}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-brand">
                See the split
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
