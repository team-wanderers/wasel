"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="map-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
      جارٍ تحميل الخريطة...
    </div>
  ),
});

const categories = [
  { value: "documents",    label: "وثائق" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "keys",        label: "مفاتيح" },
  { value: "bags",        label: "حقائب" },
  { value: "jewelry",     label: "مجوهرات" },
  { value: "pets",        label: "حيوانات" },
  { value: "other",       label: "أخرى" },
];

export default function NewFoundItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", category: "", foundAt: "", secretDetails: "" });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) { setError("يرجى اختيار تصنيف الغرض"); return; }
    setLoading(true); setError("");

    const res = await fetch("/api/found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lat, lng, foundAt: form.foundAt ? new Date(form.foundAt).toISOString() : null }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "حدث خطأ"); }
    else { router.push("/dashboard/found"); router.refresh(); }
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      <div className="page-header">
        <h1 className="page-title">تسليم غرض وجدته</h1>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div className="field">
          <label className="label" htmlFor="title">العنوان *</label>
          <input id="title" name="title" type="text" className="input"
            placeholder="مثال: محفظة جلدية سوداء وُجدت في السوق"
            value={form.title} onChange={handleChange} required />
        </div>

        <div className="field">
          <label className="label">التصنيف *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {categories.map((cat) => (
              <label key={cat.value} style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                border: `1.5px solid ${form.category === cat.value ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                background: form.category === cat.value ? "var(--color-primary-light)" : "transparent",
                cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 500,
                color: form.category === cat.value ? "var(--color-primary)" : "var(--color-text-secondary)",
                transition: "all 150ms",
              }}>
                <input type="radio" name="category" value={cat.value}
                  checked={form.category === cat.value} onChange={handleChange} style={{ display: "none" }} />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="description">الوصف *</label>
          <textarea id="description" name="description" className="textarea"
            placeholder="صِف الغرض بدقة لمساعدة صاحبه على التعرف عليه..."
            value={form.description} onChange={handleChange} required rows={4} />
        </div>

        <div className="field">
          <label className="label" htmlFor="foundAt">تاريخ الإيجاد (اختياري)</label>
          <input id="foundAt" name="foundAt" type="datetime-local" className="input"
            value={form.foundAt} onChange={handleChange} dir="ltr" />
        </div>

        <div className="field">
          <label className="label">موقع الإيجاد (اختياري)</label>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            انقر على الخريطة لتحديد مكان إيجاد الغرض
          </p>
          <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
        </div>

        <div className="field">
          <label className="label" htmlFor="secretDetails">🔒 تفاصيل سرية للتحقق من الهوية (اختياري)</label>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            تفصيل مميز تعرفه — سيُستخدم لإثبات أن المطالِب هو الصاحب الحقيقي
          </p>
          <textarea id="secretDetails" name="secretDetails" className="textarea"
            placeholder="مثال: يوجد داخله كرت باسم ..."
            value={form.secretDetails} onChange={handleChange} rows={2} />
        </div>

        <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>إلغاء</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "جارٍ النشر..." : "نشر الغرض"}
          </button>
        </div>
      </form>
    </div>
  );
}
