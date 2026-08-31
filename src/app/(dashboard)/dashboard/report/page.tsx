import ReportItemForm from "@/components/ReportItemForm";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType = type === "lost" || type === "found" ? type : undefined;

  return <ReportItemForm initialType={initialType} />;
}
