"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditFoundItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ title: "", description: "", category: "", foundAt: "", secretDetails: "", status: "open" });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/found/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          category: data.category ?? "",
          foundAt: data.foundAt ? new Date(data.foundAt).toISOString().slice(0, 16) : "",
          secretDetails: data.secretDetails ?? "",
          status: data.status ?? "open",
        });
        if (data.lat) setLat(data.lat);
        if (data.lng) setLng(data.lng);
        setFetching(false);
      })
      .catch(() => { setError("تعذَّر تحميل البيانات"); setFetching(false); });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const res = await fetch(`/api/found/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lat, lng, foundAt: form.foundAt ? new Date(form.foundAt).toISOString() : null }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); }
    else { router.push("/dashboard/found"); router.refresh(); }
  }

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/found/${id}`, { method: "DELETE" });
    if (res.ok) { router.push("/dashboard/found"); router.refresh(); }
    else { setError("فشل الحذف"); setLoading(false); }
  }

  if (fetching) return <div style={{ padding: "var(--space-8)", color: "var(--color-text-muted)" }}>جارٍ التحميل...</div>;

  return (
    <div style={{ maxWidth: "680px" }}>
      <div className="page-header">
        <h1 className="page-title">تعديل بلاغ الموجود</h1>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>حذف</button>
      </div>

      {deleteConfirm && (
        <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>
          <p style={{ marginBottom: "var(--space-4)" }}>هل أنت متأكد؟ لا يمكن التراجع.</p>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={loading}>نعم، احذف</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div className="field">
          <label className="label" htmlFor="title">العنوان *</label>
          <input id="title" name="title" type="text" className="input" value={form.title} onChange={handleChange} required />
        </div>

        <div className="field">
          <label className="label">التصنيف *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {categories.map((cat) => (
              <label key={cat.value} style={{
                display: "flex", alignItems: "center",
                padding: "var(--space-2) var(--space-4)",
                border: `1.5px solid ${form.category === cat.value ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                background: form.category === cat.value ? "var(--color-primary-light)" : "transparent",
                cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 500,
                color: form.category === cat.value ? "var(--color-primary)" : "var(--color-text-secondary)",
                transition: "all 150ms",
              }}>
                <input type="radio" name="category" value={cat.value} checked={form.category === cat.value} onChange={handleChange} style={{ display: "none" }} />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="description">الوصف *</label>
          <textarea id="description" name="description" className="textarea" value={form.description} onChange={handleChange} required rows={4} />
        </div>

        <div className="field">
          <label className="label" htmlFor="foundAt">تاريخ الإيجاد</label>
          <input id="foundAt" name="foundAt" type="datetime-local" className="input" value={form.foundAt} onChange={handleChange} dir="ltr" />
        </div>

        <div className="field">
          <label className="label">الموقع</label>
          <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
        </div>

        <div className="field">
          <label className="label" htmlFor="secretDetails">🔒 التفاصيل السرية</label>
          <textarea id="secretDetails" name="secretDetails" className="textarea" value={form.secretDetails} onChange={handleChange} rows={2} />
        </div>

        <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>إلغاء</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </form>
    </div>
  );
}
