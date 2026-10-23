/** The same colours and shapes as the site, so the two read as one shop. */
export const T = {
  /** Tomato. Everything you press. */
  brand: "#e5321d",
  brandDark: "#b8230f",
  /** The faint wash behind a note about an offer or a fee. */
  tint: "#fff6d6",
  ink: "#15110e",
  muted: "#5e564e",
  paper: "#ffffff",
  shell: "#f2efe9",
  /** A hairline on Chalk, and the 2px rule that draws every card. */
  line: "#dcd6cc",
  /** Volt, for the small word on Ink that has to be read first. */
  volt: "#ffd23f",
  /** Mint, for the things that have gone right. */
  mint: "#1e7a4c",
  /** On Ink: the body text, and the quieter line under it. */
  onInk: "#d8d1c7",
  onInkMuted: "#b9b0a5",
  /** The second Ink, for a card standing on Ink. */
  ink2: "#26201b",
  /** The rule between two things that are both on Ink. */
  inkLine: "#3a322b",
  radius: 16,
  /** The field behind a form input. */
  field: "#f9f7f3",
};

/**
 * The three faces the design is set in.
 *
 * Loaded in the root layout, so a screen only ever names them. Big Shoulders
 * is the display face: headings, prices, and nothing else. IBM Plex Mono is
 * the ticket type, for the small capitals that label a thing. Schibsted
 * Grotesk is everything somebody actually reads.
 */
export const F = {
  /** Headlines and prices. */
  display: "BigShouldersDisplay_900Black",
  displayBold: "BigShouldersDisplay_800ExtraBold",
  /** Small capitals: "NEXT RUN TO PAU", "DELIVER TO". */
  mono: "IBMPlexMono_600SemiBold",
  body: "SchibstedGrotesk_400Regular",
  bodyMedium: "SchibstedGrotesk_500Medium",
  bodySemi: "SchibstedGrotesk_600SemiBold",
  bodyBold: "SchibstedGrotesk_700Bold",
};

/**
 * The hard offset shadow the whole design is drawn with: no blur, no
 * softness, one solid colour sitting behind and below. React Native has no
 * spread or offset-only shadow on Android, so it is two views rather than a
 * shadow property, and this is the style of the one behind.
 */
export const shadow = (colour: string = T.ink, size = 4) => ({
  backgroundColor: colour,
  borderRadius: T.radius,
  position: "absolute" as const,
  left: size,
  top: size,
  right: -size,
  bottom: -size,
});

/** The ticket face, as a style: small, spaced, upper case. */
export const ticket = {
  fontFamily: F.mono,
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
};

/*
 * The season the shop is dressed for.
 *
 * The website recolours itself off one setting in admin, and the app wore
 * the ordinary red whatever that setting said: somebody who switched
 * Halloween on got pumpkins on the site and the plain shop on their phone.
 *
 * Done by writing over the palette rather than threading a theme through
 * every screen. Nothing here is captured at module load — every screen
 * reads T at the moment it draws — so changing these fields and letting the
 * shop's arrival re-render is the whole of it.
 *
 * What it deliberately does not do is repaint the app dark. The palette is
 * solid colours, and a shop that turns its paper black has to re-prove
 * every piece of text on it against the new ground. That is a redesign, not
 * a season, and it is the kind that ships a screen nobody can read on a
 * phone in sunlight. So the ground stays and the loud parts change.
 */
const ORDINARY = {
  brand: T.brand,
  brandDark: T.brandDark,
  ink: T.ink,
  ink2: T.ink2,
  inkLine: T.inkLine,
  tint: T.tint,
  volt: T.volt,
};

const SEASONS: Record<string, Partial<typeof ORDINARY>> = {
  halloween: {
    // The same five the website wears, so the two read as one shop.
    brand: "#f26419",
    brandDark: "#c2410c",
    ink: "#241633",
    ink2: "#342448",
    inkLine: "#4a3a5e",
    tint: "#fdeddd",
    volt: "#b6e82a",
  },
};

/** What is drawn over the page on top of the colours, where anything is. */
export const SEASON_ART: Record<string, string[]> = {
  halloween: ["🎃", "🦇", "👻", "🕸️"],
};

/** Dress the palette for a season, or put it back to the ordinary shop. */
export function dressFor(season: string | undefined): void {
  const worn = SEASONS[String(season ?? "").trim().toLowerCase()] ?? {};
  Object.assign(T, ORDINARY, worn);
}
