/**
 * A titled card, which is most of what an admin page is made of.
 *
 * The title is in the display face and the aside sits on the same line, so
 * every panel on every page reads the same way round: what this is, then
 * the one thing you can do about it.
 */
export default function Panel({
  title,
  aside,
  detail,
  children,
  size = "lg",
  className = "",
  id,
}: {
  /** A node, not a string: a phone and a desk do not always want the
   *  same words, and two whole panels behind display:none to say one
   *  heading two ways is a panel kept twice. */
  title: React.ReactNode;
  /** The board sets a main column's panel at 26px and a right column's at
   *  24px, so the second column reads as the aside it is. Two columns of
   *  26px headings shout at each other. */
  size?: "lg" | "sm";
  aside?: React.ReactNode;
  /** The lead sentence. A node rather than a string: several of these
   *  want a figure or a link inside the sentence, and flattening those to
   *  prose loses the one thing worth reading. */
  detail?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** An anchor, for a panel somebody is sent to from another page. */
  id?: string;
}) {
  return (
    <section id={id} className={`card p-3.5 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2.5">
        <h2
          className={`font-display font-black uppercase leading-none ${
            size === "sm" ? "text-[19px] sm:text-[24px]" : "text-[21px] sm:text-[26px]"
          }`}
        >
          {title}
        </h2>
        {aside}
      </div>
      {detail && <p className="hint mb-1.5 mt-1">{detail}</p>}
      {children}
    </section>
  );
}
