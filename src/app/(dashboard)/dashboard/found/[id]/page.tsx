import { redirect } from "next/navigation";

export default async function DashboardFoundRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/items/found/${id}`);
}