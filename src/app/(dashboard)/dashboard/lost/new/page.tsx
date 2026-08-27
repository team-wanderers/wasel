"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImageUploader from "@/components/ImageUploader";

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

export default function NewLostItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    lostAt: "",
    secretDetails: "",
  });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ path: string; id: string; previewUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!form.category) { setError("يرجى اختيار تصنيف المفقود"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lat,
          lng,
          lostAt: form.lostAt ? new Date(form.lostAt).toISOString() : null,
          images: uploadedImages.map((img) => ({ path: img.path })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
        setLoading(false);
      } else {
        router.push("/dashboard/lost");
        router.refresh();
      }
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      <div className="page-header" style={{ marginBottom: "var(--space-8)" }}>
        <h1 className="page-title">بلاغ مفقود جديد</h1>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {/* العنوان */}
        <div className="field">
          <label className="label" htmlFor="title">العنوان *</label>
          <input
            id="title"
            name="title"
            type="text"
            className="input"
            placeholder="مثال: بطاقة شخصية باسم أحمد محمد"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        {/* التصنيف */}
        <div className="field">
          <label className="label">التصنيف *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {categories.map((cat) => (
              <label
                key={cat.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-4)",
                  border: `1.5px solid ${form.category === cat.value ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  background: form.category === cat.value ? "var(--color-primary-light)" : "transparent",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 500,
                  color: form.category === cat.value ? "var(--color-primary)" : "var(--color-text-secondary)",
                  transition: "all 150ms",
                }}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={form.category === cat.value}
                  onChange={handleChange}
                  style={{ display: "none" }}
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        {/* الوصف */}
        <div className="field">
          <label className="label" htmlFor="description">الوصف *</label>
          <textarea
            id="description"
            name="description"
            className="textarea"
            placeholder="صف الغرض المفقود بدقة — اللون، الحجم، أي علامات فارقة..."
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
          />
        </div>

        {/* صور المفقود */}
        <div className="field">
          <label className="label">صور المفقود (اختياري)</label>
          <ImageUploader onUpload={setUploadedImages} />
        </div>

        {/* تاريخ الفقدان */}
        <div className="field">
          <label className="label" htmlFor="lostAt">تاريخ الفقدان (اختياري)</label>
          <input
            id="lostAt"
            name="lostAt"
            type="datetime-local"
            className="input"
            value={form.lostAt}
            onChange={handleChange}
            dir="ltr"
          />
        </div>

        {/* الموقع التقريبي */}
        <div className="field">
          <label className="label">الموقع التقريبي (اختياري)</label>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            انقر على الخريطة لتحديد مكان الفقدان
          </p>
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={(la, ln) => { setLat(la); setLng(ln); }}
          />
        </div>

        {/* تفاصيل سرية */}
        <div className="field">
          <label className="label" htmlFor="secretDetails">
            تفاصيل سرية للتحقق (اختياري)
          </label>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            معلومة لا يعرفها إلا صاحب الغرض — لن تظهر للعامة، تُستخدم لمطابقة المطالبات
          </p>
          <textarea
            id="secretDetails"
            name="secretDetails"
            className="textarea"
            placeholder="مثال: رقم تسلسلي، خدش في الزاوية، نقش خاص..."
            value={form.secretDetails}
            onChange={handleChange}
            rows={2}
          />
        </div>

        {/* أزرار الإجراء */}
        <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                جارٍ النشر...
              </span>
            ) : "نشر البلاغ"}
          </button>
        </div>
      </form>
    </div>
  );
}
