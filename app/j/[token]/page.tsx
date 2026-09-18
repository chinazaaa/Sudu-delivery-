import JoinParty from "@/components/JoinParty";

export const dynamic = "force-dynamic";

/**
 * Somebody opened a group link.
 *
 * There is nothing to look up: the token means nothing until the first person
 * in the party orders. So this takes it, says what it means in a sentence, and
 * gets out of the way.
 */
export default async function JoinPartyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <JoinParty token={(await params).token} />;
}
