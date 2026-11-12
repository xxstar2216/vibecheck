import { notFound } from "next/navigation";
import { SharedPreview } from "@/components/SharedPreview";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = getDb()
    .prepare("SELECT id, name, code FROM shares WHERE id = ?")
    .get(id) as { id: string; name: string; code: string } | undefined;

  if (!row) notFound();

  return <SharedPreview id={row.id} name={row.name} code={row.code} />;
}
