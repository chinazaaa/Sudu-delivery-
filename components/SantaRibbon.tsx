/**
 * The candy strip along the top of anything Secret Santa.
 *
 * Ten pixels of Tomato, Chalk and Mint on the diagonal. The rest of the shop
 * is one red and one cream all year; this is the one thing on it that is
 * only true in December, and the strip is how a page says so before anybody
 * has read a word of it.
 */
export default function SantaRibbon() {
  return (
    <div
      aria-hidden
      className="bleed h-2.5"
      style={{
        background:
          "repeating-linear-gradient(-60deg,#e5321d 0 10px,#f2efe9 10px 20px,#1e7a4c 20px 30px,#f2efe9 30px 40px)",
      }}
    />
  );
}
