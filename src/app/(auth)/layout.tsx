import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "var(--color-bg)",
      }}
    >
      {children}
    </main>
  );
}
