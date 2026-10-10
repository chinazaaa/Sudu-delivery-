/**
 * Where an offer says it delivers to, in the one shape search engines read.
 *
 * Every Offer on this site needs this, and for a while only one of them had
 * it. The dish page said Nigeria; the restaurant page listed the same dishes
 * with no destination at all, and an offer that does not say where it
 * delivers is an offer a search engine has to guess about. Google guessed
 * Australia, South Africa, the United Kingdom and the United States, added
 * all four to the Merchant Center account, found no delivery information for
 * any of them, and refused every product in the shop on the grounds that it
 * was "missing delivery info in some countries".
 *
 * Those countries cannot be deleted in Merchant Center either, because they
 * are read out of the pages rather than typed into the account. The only way
 * to stop Google believing it is one sentence in the markup, so the sentence
 * now lives in one file and every page says it the same way.
 */
export type OfferShipping = Record<string, unknown>;

export function deliveryIn(fees: number[]): OfferShipping {
  const real = fees.filter((fee) => Number.isFinite(fee) && fee > 0);

  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      currency: "NGN",
      // Said as a range because it honestly is one: delivery is charged per
      // order rather than per thing, so the cheapest and the dearest rung
      // are both true and naming only one of them would not be.
      minValue: real.length > 0 ? Math.min(...real) : 0,
      maxValue: real.length > 0 ? Math.max(...real) : 0,
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "NG",
      addressRegion: "Lagos",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      /*
       * The waiting is handling, and none of it is transit.
       *
       * Handling is order placed to shipment ready, which here is waiting
       * for the next car: nothing before the midday cut-off, and at most
       * until tomorrow after it. Transit is the drive, and the drive is
       * Sangotedo to PAU the same afternoon, every time. The same pair of
       * numbers is set on the shipping service in Merchant Center, because
       * two different answers to one question is its own kind of wrong.
       */
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "DAY",
      },
    },
  };
}
