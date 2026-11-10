/**
 * "between 5pm and 7pm today" as "Today 5-7pm", for somewhere narrow.
 *
 * Anything it cannot read comes back as it was, so a new way of saying it
 * is longer rather than wrong.
 */
export function arrivalShort(said: string): string {
  const text = String(said ?? "").trim();
  const hit = /^(?:delivery\s+)?between\s+(\d{1,2}(?::\d{2})?)\s*(am|pm)\s+and\s+(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*(.*)$/i.exec(
    text
  );
  if (!hit) return text;
  const [, from, fromHalf, to, toHalf, day] = hit;
  const when =
    fromHalf.toLowerCase() === toHalf.toLowerCase()
      ? `${from}-${to}${toHalf.toLowerCase()}`
      : `${from}${fromHalf.toLowerCase()}-${to}${toHalf.toLowerCase()}`;
  const label = day.trim();
  return label === "" ? when : `${label.charAt(0).toUpperCase()}${label.slice(1)} ${when}`;
}
