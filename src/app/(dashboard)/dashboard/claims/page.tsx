import { requireUser } from "@/lib/auth";

export default async function ClaimsPage() {
  await requireUser();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">مطالباتي</h1>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
        <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          لا توجد مطالبات حتى الآن
        </p>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          عند قبول تطابق وإثبات ملكية غرض، ستظهر المطالبة هنا لمتابعة حالتها
        </p>
      </div>
    </div>
  );
}
