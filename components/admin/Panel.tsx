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
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  detail?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="font-display text-[26px] font-black uppercase leading-none">{title}</h2>
        {aside}
      </div>
      {detail && <p className="mb-1.5 mt-1 text-[12.5px] text-muted">{detail}</p>}
      {children}
    </section>
  );
}
