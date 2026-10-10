/**
 * A spreadsheet, written out.
 *
 * Three boards draw an Export button and there was nothing behind any of
 * them. What people actually do with one is open it in Excel or Sheets and
 * add up a column, so the rules here follow from that rather than from
 * what looks tidy in a text editor.
 */

/** A cell. Numbers stay numbers so a column can be summed. */
export type Cell = string | number | boolean | null | undefined;
export type Row = Record<string, Cell>;

/**
 * Anything beginning with one of these is read as a formula by Excel and
 * Sheets, so a customer called "=Ada" or a note starting with a minus sign
 * becomes something that runs when the file is opened. Prefixing an
 * apostrophe is the ordinary fix: the spreadsheet shows the text and does
 * not evaluate it.
 */
const DANGEROUS = /^[=+\-@\t\r]/;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Money is kept as a plain integer rather than ₦15,700, because the
    // whole point of the file is adding the column up.
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") return value ? "yes" : "no";

  const text = DANGEROUS.test(value) ? `'${value}` : value;
  // A field containing a comma, a quote or a line break has to be quoted,
  // and a quote inside it is doubled. That is the whole of RFC 4180.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows to a CSV, taking the column order from the first row.
 *
 * A row missing a key the first row had is an empty cell rather than a
 * shifted line, because a file where one row's columns are offset is worse
 * than no file.
 */
export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const lines = [columns.map(cell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((key) => cell(row[key])).join(","));
  }
  // Windows line endings, because Excel on Windows is where most of these
  // are opened and it is the one that minds.
  return lines.join("\r\n");
}

/** sudu-customers-2026-10-10.csv */
export function csvName(what: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `sudu-${what}-${today}.csv`;
}

/**
 * The file as a response a browser will save rather than display.
 *
 * The byte order mark is there for Excel: without it, a name with an
 * accent or a ₦ in a note opens as mojibake on a Windows machine.
 */
export function csvResponse(what: string, rows: Row[]): Response {
  return new Response(`﻿${toCsv(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${csvName(what)}"`,
      // It is a snapshot of the shop at the moment it was asked for.
      "cache-control": "no-store",
    },
  });
}
