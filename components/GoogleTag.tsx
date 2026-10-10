import Script from "next/script";

/**
 * Google's tag, loaded only where somebody has pasted an id into admin.
 *
 * This is the one third-party script on the shop, and it is here for one
 * reason: Merchant Center cannot show which product listings led to an order
 * unless something on the site tells it when an order happens. Everything
 * else the shop wants to know it counts itself, against a random first-party
 * id, which is why there is no Analytics property behind this.
 *
 * It renders nothing at all with no id, so the default state of the site is
 * no Google script on any page.
 */
export default function GoogleTag({ id }: { id: string }) {
  if (id === "") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
gtag('config',${JSON.stringify(id)});`}
      </Script>
    </>
  );
}
