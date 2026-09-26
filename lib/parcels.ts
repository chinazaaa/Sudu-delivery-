import { numberOr, safeSettings, type Settings } from "./settings";
import type { BatchStage } from "./stages";

/**
 * Carrying a parcel, which is not food.
 *
 * Somebody has already paid a shop and needs the thing moved: a dress from a
 * Lekki boutique to a room on campus, a bag left at home on the mainland.
 * There is no Mainland to PAU run and there never will be, so a parcel is
 * its own trip, the way a skincare drop is.
 *
 * Every route and every price is written in admin, because the eight of them
 * are a guess until the first month says otherwise.
 */
/** Up to this many kilos, this much. The last band is the heaviest taken. */
export type Band = { upTo: number; fee: number };

export type Route = {
  /** Short and stable: it is stored on the order. */
  id: string;
  /** "Lekki/Ikoyi to PAU", as the dropdown reads it. */
  label: string;
  /** What it costs by how heavy it is, cheapest band first. A dress and a
   *  chest of drawers do not take the same room or the same effort, and one
   *  price for both is one of them priced wrong. */
  bands: Band[];
  /** Which end is campus. One end is a block and the other is an address:
   *  "PAU, Ikoyi Hall" is the whole of what we need on campus, and no
   *  address at all will find a dress in a Lekki boutique. */
  toPau: boolean;
  /** A route can be turned off without losing what it charged. */
  on: boolean;
};

/** The default price cap, where nobody has set one. */
export const MAX_VALUE = 50000;

/**
 * What a parcel service says before it takes anything, which is most of what
 * keeps it out of trouble. Written here so a shop that has not typed its own
 * still says something true, and editable in admin over the top.
 */
export const TERMS_DEFAULT = [
  "The shop must already be paid. We collect, we do not pay for you.",
  "We collect it sealed and hand it over sealed. We do not open it to check, and neither should the shop.",
  "We photograph it when we collect it and when we hand it over.",
  "No phones, laptops, jewellery, cash or anything illegal.",
].join("\n");

/** Weight bands, tidied and in order. A band with no weight is not a band. */
export function bandsOf(raw: unknown): Band[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((one) => ({
      upTo: Math.max(0, Math.round(Number((one as Band)?.upTo) || 0)),
      fee: Math.max(0, Math.round(Number((one as Band)?.fee) || 0)),
    }))
    .filter((one) => one.upTo > 0)
    .sort((a, b) => a.upTo - b.upTo);
}

/**
 * What this route charges for something this heavy.
 *
 * Anything above the heaviest band is not priced rather than charged the top
 * rate: a shop that quietly prices a fridge as a twenty kilo parcel is a shop
 * that drives to Ikorodu for nothing.
 */
export function feeFor(route: Route, kg: number): number | null {
  const band = route.bands.find((one) => kg <= one.upTo);
  return band ? band.fee : null;
}

/** The heaviest this route will take, or zero where it takes nothing. */
export function heaviest(route: Route): number {
  return route.bands.length === 0 ? 0 : route.bands[route.bands.length - 1].upTo;
}

export function parseRoutes(json: string | null | undefined): Route[] {
  if (!json || !json.trim()) return [];
  try {
    const raw = JSON.parse(json) as Route[];
    return raw
      .filter((one) => typeof one?.id === "string" && one.id.trim() !== "")
      .map((one) => ({
        id: one.id.trim(),
        label: (one.label ?? one.id).trim() || one.id.trim(),
        bands: bandsOf(one.bands),
        toPau: one.toPau !== false,
        // Off unless it says otherwise, so a route half set up is not one
        // somebody can order and then be rung about.
        on: one.on === true,
      }));
  } catch {
    return [];
  }
}

export function serialiseRoutes(routes: Route[]): string {
  const real = routes.filter((one) => one.id.trim() !== "");
  return real.length === 0
    ? ""
    : JSON.stringify(
        real.map((one) => ({
          id: one.id.trim(),
          label: one.label.trim() || one.id.trim(),
          bands: bandsOf(one.bands),
          toPau: one.toPau !== false,
          on: one.on === true,
        }))
      );
}

/**
 * The eight routes the shop starts with: the four places it goes, each way.
 * Priced at zero, because a price nobody chose is worse than a blank one,
 * and a route with no price cannot be ordered.
 */
export const ROUTES_DEFAULT: Route[] = [
  ["sango-pau", "Sangotedo to PAU", "to"],
  ["pau-sango", "PAU to Sangotedo", "from"],
  ["lekki-pau", "Lekki/Ikoyi to PAU", "to"],
  ["pau-lekki", "PAU to Lekki/Ikoyi", "from"],
  ["mainland-pau", "Mainland to PAU", "to"],
  ["pau-mainland", "PAU to Mainland", "from"],
  ["ikorodu-pau", "Ikorodu to PAU", "to"],
  ["pau-ikorodu", "PAU to Ikorodu", "from"],
].map(([id, label, way]) => ({
  id,
  label,
  // Empty on purpose. A price nobody chose is worse than a blank one, and a
  // route with no bands cannot be ordered.
  bands: [] as Band[],
  toPau: way === "to",
  on: false,
}));

export type Parcels = {
  on: boolean;
  routes: Route[];
  maxValue: number;
  blurb: string;
  terms: string[];
};

/** How the shop carries parcels today, ready to be read by a page. */
export function parcelsFrom(settings: Settings): Parcels {
  const routes = parseRoutes(settings.parcel_routes);
  return {
    // On only when it is actually set up. A route with no price is not a
    // route, so a switch turned on over an empty list is still off.
    on:
      settings.parcel_on === "on" &&
      routes.some((one) => one.on && one.bands.length > 0),
    routes,
    maxValue: numberOr(settings.parcel_max_value, MAX_VALUE),
    blurb: (settings.parcel_blurb ?? "").trim(),
    terms: ((settings.parcel_terms ?? "").trim() || TERMS_DEFAULT)
      .split("\n")
      .map((one: string) => one.trim())
      .filter(Boolean),
  };
}

export async function parcels(): Promise<Parcels> {
  return parcelsFrom(await safeSettings());
}

/** The routes worth offering: on, and priced. */
export function liveRoutes(all: Route[]): Route[] {
  return all.filter((one) => one.on && one.bands.length > 0);
}

/**
 * The places the shop carries to and from, each named once.
 *
 * The front page used to list the first two routes and then say "and more",
 * which on the real list reads "Sangotedo to PAU, PAU to Sangotedo and
 * more": the same town twice, and the impression that Sangotedo is all we
 * do. It is four places, each way, Lekki to Ikorodu.
 *
 * A route is named for where it is not PAU, so both directions of the same
 * road collapse into one place.
 */
export function placesServed(all: Route[]): string[] {
  const seen: string[] = [];
  for (const route of liveRoutes(all)) {
    const place = route.label
      .replace(/\s*to\s+PAU\s*$/i, "")
      .replace(/^\s*PAU\s+to\s*/i, "")
      .trim();
    if (place !== "" && !seen.includes(place)) seen.push(place);
  }
  return seen;
}

/** Those places as a sentence: "A, B and C". */
export function placesSaid(all: Route[]): string {
  const places = placesServed(all);
  if (places.length === 0) return "";
  if (places.length === 1) return places[0];
  return `${places.slice(0, -1).join(", ")} and ${places[places.length - 1]}`;
}

export function routeById(all: Route[], id: string): Route | null {
  return all.find((one) => one.id === id) ?? null;
}

/** A photograph of a parcel, at one of the two moments that matter. */
export type ParcelPhoto = {
  id: string;
  kind: "collected" | "handed";
  url: string;
  note: string;
  created_at: string;
};

export const PHOTO_LABEL: Record<ParcelPhoto["kind"], string> = {
  collected: "When we collected it",
  handed: "When we handed it over",
};

/** A parcel as the shop works it: who, what, where and when it goes. */
export type ParcelJob = {
  orderId: string;
  orderNo: number | null;
  name: string;
  phone: string;
  status: string;
  route: string;
  item: string;
  from: string;
  to: string;
  total: number;
  /** The day the shop agreed. Empty until somebody has agreed one. */
  goesOn: string;
  /** The day the sender asked for, which is what is being answered. */
  wantedOn: string;
  /** Where it has got to, so a day's list says which are still to do. */
  stage: BatchStage;
  photos: { collected: number; handed: number };
};
