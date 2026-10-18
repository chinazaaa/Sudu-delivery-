import CounterCheckout from "@/components/CounterCheckout";

export default function PharmacyCheckout() {
  return (
    <CounterCheckout
      counter="pharmacy"
      shelfHref="/pharmacy"
      caution="We are not a pharmacy and nobody here is a pharmacist. We cannot advise on what to take, and we do not carry prescription only medicine. Check the product, the seal and the expiry date before the rider leaves: after that it cannot come back."
    />
  );
}
