import BoxDetail from "@/components/BoxDetail";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <BoxDetail
      slug={(await params).slug}
      kind="collection"
      base="/collections"
      elsewhere="/occasions"
      back="All the collections"
    />
  );
}
