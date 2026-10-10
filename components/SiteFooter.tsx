import Link from "next/link";
import Wordmark from "./Wordmark";

/**
 * The foot of every page.
 *
 * It was a tagline and then fifteen underlined links in one grey line,
 * which is not a footer: it is the links that had nowhere else to go, in
 * the order somebody happened to add them. Nothing said which of them were
 * things to buy, which were about the shop and which were the small print,
 * so the eye had to read all fifteen to find one.
 *
 * Grouped under headings instead. Same links, and every one of them still
 * matters — several pages are reachable from nowhere else, and a page
 * nothing links to is a page nothing finds — but a reader can now skip two
 * of the three columns.
 */
type Group = { heading: string; links: { href: string; said: string; away?: boolean }[] };

export default function SiteFooter({
  line,
  instagram,
  groupLink,
  google = "",
  showPromoterLink,
}: {
  /** Written in admin. Empty means the shop says nothing here. */
  line: string;
  instagram: string | null;
  groupLink: string;
  /** The shop's Google Business Profile. Empty and it is not offered. */
  google?: string;
  showPromoterLink: boolean;
}) {
  const groups: Group[] = [
    {
      heading: "Order",
      links: [
        { href: "/products", said: "Food" },
        { href: "/collections", said: "Collections" },
        { href: "/skincare", said: "Skincare" },
        { href: "/parcel", said: "Parcels" },
        { href: "/custom-order", said: "Anything else" },
        { href: "/wish", said: "Wish we carried it?" },
      ],
    },
    {
      heading: "Sudu",
      links: [
        { href: "/about", said: "About us" },
        { href: "/delivery-to-pau", said: "Delivery to PAU" },
        // The page written to a parent. Down here rather than in the header
        // because a student on the front page is not one and should not have
        // to read past a card asking whether they are.
        { href: "/parents", said: "For parents" },
        // The offer, then the way in for somebody already doing it. The
        // offer first, because far more people read this footer wondering
        // what we are than wondering where to sign in.
        { href: "/become-a-promoter", said: "Get paid to share us" },
        ...(showPromoterLink ? [{ href: "/promoter", said: "Promoter sign in" }] : []),
        ...(instagram ? [{ href: instagram, said: "Instagram", away: true }] : []),
      ],
    },
    {
      heading: "Help",
      links: [
        // Both app stores require these at a public address, and they belong
        // where anybody can find them anyway.
        { href: "/support", said: "Contact us" },
        ...(groupLink ? [{ href: groupLink, said: "PAU WhatsApp group", away: true }] : []),
        ...(google ? [{ href: google, said: "Find us on Google", away: true }] : []),
        { href: "/privacy", said: "Privacy" },
        { href: "/terms", said: "Terms" },
        { href: "/return-policy", said: "Returns and refunds" },
      ],
    },
  ];

  return (
    // Clearance for everything that floats over the bottom of the screen:
    // the tab bar on a phone, the cart bar on everything, and the offer
    // nudge above both. The footer has to end above them or its links
    // cannot be tapped.
    <footer className="bleed mt-12 bg-ink pb-28 pt-16 text-[#e9e3da] sm:pb-32 lg:pb-16">
      <div className="shell">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Wordmark size={40} tone="light" />
            {line !== "" && (
              <p className="max-w-[360px] leading-relaxed">{line}</p>
            )}
          </div>

          {/* Two columns on a phone rather than three: "Delivery to PAU" and
              "PAU WhatsApp group" are too long to sit in a third of 375px
              without wrapping every line. */}
          <div className="grid grid-cols-2 gap-8 sm:contents">
            {groups.map((group) => (
              <div key={group.heading} className="space-y-2.5">
                <p className="ticket text-[#a79e93]">{group.heading}</p>
                <ul className="space-y-2">
                  {group.links.map((one) => (
                    <li key={one.href}>
                      {one.away ? (
                        <a
                          href={one.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-volt"
                        >
                          {one.said}
                        </a>
                      ) : (
                        <Link
                          href={one.href}
                          className="hover:text-volt"
                        >
                          {one.said}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 space-y-2 border-t border-white/10 pt-6 text-[13px] leading-relaxed text-[#a79e93]">
          <p>
            © {new Date().getFullYear()} Sudu · Delivering to Pan-Atlantic
            University, Ibeju-Lekki, Lagos
          </p>
          {/* Said once, plainly, because the home page is a row of other
              people's logos and nothing anywhere said whose shop this is.
              We name the restaurants because we carry their food, which is
              what any courier does, and that is the whole of the claim. */}
          <p>
            Sudu is an independent delivery service. Restaurant names and logos
            belong to their owners, and we are not affiliated with or endorsed
            by them.
          </p>
        </div>
      </div>
    </footer>
  );
}
