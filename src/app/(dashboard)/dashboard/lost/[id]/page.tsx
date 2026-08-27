import { redirect } from "next/navigation";

export default async function DashboardLostRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/items/lost/${id}`);
}