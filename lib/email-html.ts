/**
 * The look of the mail that goes to whoever runs the shop.
 *
 * Email is not a browser. No stylesheet, no flexbox, no custom font that can
 * be relied on, and Outlook still lays out with tables, so this is tables and
 * inline styles on purpose. Everything a client might strip has a plain
 * fallback: the text version of the same message goes out alongside it.
 */

export type Block =
  /** A paragraph. The first one is what the phone shows in the preview. */
  | { kind: "text"; text: string }
  /** The one thing to go and do. */
  | { kind: "button"; label: string; href: string }
  /** Label on the left, value on the right: total, number, block. */
  | { kind: "rows"; rows: { label: string; value: string }[] }
  /** What was ordered, or which carts are waiting. */
  | { kind: "list"; title?: string; items: string[] }
  /** Quieter than a paragraph, for the housekeeping at the end. */
  | { kind: "note"; text: string };

const BRAND = "#ff5a1f";
const INK = "#14110f";
const MUTED = "#6b6360";
const SHELL = "#f6f5f3";
const LINE = "rgba(20,17,15,0.08)";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Anything that came from a customer is text, never markup. */
export function escape(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function block(item: Block): string {
  switch (item.kind) {
    case "text":
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${INK}">${escape(
        item.text
      )}</p>`;

    case "note":
      return `<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${MUTED}">${escape(
        item.text
      )}</p>`;

    case "button":
      // A table, because a padded anchor collapses in Outlook.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px"><tr><td style="border-radius:999px;background:${BRAND}"><a href="${escape(
        item.href
      )}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${escape(
        item.label
      )}</a></td></tr></table>`;

    case "rows":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:collapse">${item.rows
        .map(
          (row, index) =>
            `<tr><td style="padding:9px 0;font-size:14px;color:${MUTED};${
              index > 0 ? `border-top:1px solid ${LINE};` : ""
            }">${escape(row.label)}</td><td style="padding:9px 0;font-size:14px;font-weight:700;color:${INK};text-align:right;${
              index > 0 ? `border-top:1px solid ${LINE};` : ""
            }">${escape(row.value)}</td></tr>`
        )
        .join("")}</table>`;

    case "list":
      return `${
        item.title
          ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED}">${escape(
              item.title
            )}</p>`
          : ""
      }<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:collapse;background:${SHELL};border-radius:12px">${item.items
        .map(
          (line, index) =>
            `<tr><td style="padding:9px 14px;font-size:14px;line-height:1.45;color:${INK};${
              index > 0 ? `border-top:1px solid ${LINE};` : ""
            }">${escape(line)}</td></tr>`
        )
        .join("")}</table>`;
  }
}

/**
 * One message. The title is the same words as the subject, so the mail reads
 * the same whether it is opened or only glanced at in a list.
 */
export function renderEmail(title: string, blocks: Block[]): string {
  const preview = blocks.find((item) => item.kind === "text");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(
    title
  )}</title></head>
<body style="margin:0;padding:0;background:${SHELL};font-family:${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${
    preview ? escape(preview.text) : ""
  }</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SHELL};padding:24px 12px">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${LINE}">
  <tr><td style="padding:18px 24px;background:${INK}">
    <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.02em">Sudu</span>
    <span style="font-size:13px;color:rgba(255,255,255,0.65)">&nbsp;&nbsp;Sangotedo to PAU</span>
  </td></tr>
  <tr><td style="padding:24px">
    <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;font-weight:800;color:${INK};letter-spacing:-0.02em">${escape(
      title
    )}</h1>
    ${blocks.map(block).join("\n    ")}
  </td></tr>
  <tr><td style="padding:14px 24px;background:${SHELL};font-size:12px;color:${MUTED}">
    Sent by the shop to the addresses in Admin, Settings. Customers are never
    emailed.
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/** The same message as plain words, for anything that will not show HTML. */
export function renderText(title: string, blocks: Block[]): string {
  const parts = [title, ""];
  for (const item of blocks) {
    if (item.kind === "text" || item.kind === "note") parts.push(item.text, "");
    if (item.kind === "button") parts.push(`${item.label}: ${item.href}`, "");
    if (item.kind === "rows") {
      parts.push(...item.rows.map((row) => `${row.label}: ${row.value}`), "");
    }
    if (item.kind === "list") {
      if (item.title) parts.push(item.title);
      parts.push(...item.items.map((line) => `  ${line}`), "");
    }
  }
  return parts.join("\n").trim();
}
