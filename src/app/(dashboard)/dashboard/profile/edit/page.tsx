import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { IconPencil } from "@/components/icons";
import EditProfileForm from "./EditProfileForm";

export const metadata: Metadata = {
  title: "تعديل الملف الشخصي | واصل",
};

export default async function EditProfilePage() {
  const user = await requireUser();

  return (
    <div dir="rtl">
      <section style={{ marginBottom: "var(--space-8)" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "0.5rem 0.9rem",
            borderRadius: "999px",
            background: "hsl(215, 90%, 95%)",
            color: "hsl(215, 75%, 40%)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
            marginBottom: "var(--space-4)",
          }}
        >
          <IconPencil size={16} /> إعدادات الحساب
        </span>

        <h1
          className="page-title"
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
            marginBottom: "var(--space-3)",
          }}
        >
          تعديل الملف الشخصي
        </h1>

        <p
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: 1.9,
            maxWidth: "700px",
          }}
        >
          حدّث معلوماتك الشخصية لتظهر بشكل صحيح في حسابك على منصة واصل.
        </p>
      </section>

      <section
        className="card"
        style={{
          padding: "var(--space-6)",
          maxWidth: "640px",
        }}
      >
        <EditProfileForm
          email={user.email}
          initialName={user.name}
          initialPhone={user.phone ?? ""}
        />
      </section>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Link href="/dashboard/profile" className="btn btn-ghost btn-sm">
          ← العودة إلى الملف الشخصي
        </Link>
      </div>
    </div>
  );
}
