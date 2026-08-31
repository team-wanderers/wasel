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
  { value: "documents", label: "وثائق" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "keys", label: "مفاتيح" },
  { value: "bags", label: "حقائب" },
  { value: "jewelry", label: "مجوهرات" },
  { value: "pets", label: "حيوانات" },
  { value: "other", label: "أخرى" },
];

type ItemType = "lost" | "found";

const typeOptions: { value: ItemType; label: string; hint: string }[] = [
  { value: "lost", label: "مفقود", hint: "فقدت غرضاً وأبحث عنه" },
  { value: "found", label: "موجود", hint: "وجدت غرضاً وأريد تسليمه" },
];

const copy = {
  lost: {
    pageTitle: "بلاغ مفقود جديد",
    titlePlaceholder: "مثال: بطاقة شخصية باسم أحمد محمد",
    descPlaceholder: "صف الغرض المفقود بدقة — اللون، الحجم، أي علامات فارقة...",
    imagesLabel: "صور المفقود (اختياري)",
    dateLabel: "تاريخ الفقدان (اختياري)",
    locationLabel: "الموقع التقريبي (اختياري)",
    locationHint: "انقر على الخريطة لتحديد مكان الفقدان",
    secretLabel: "تفاصيل سرية للتحقق (اختياري)",
    secretHint: "معلومة لا يعرفها إلا صاحب الغرض — لن تظهر للعامة، تُستخدم لمطابقة المطالبات",
    secretPlaceholder: "مثال: رقم تسلسلي، خدش في الزاوية، نقش خاص...",
    categoryError: "يرجى اختيار تصنيف المفقود",
    submitError: "حدث خطأ، حاول مرة أخرى",
    submit: "نشر البلاغ",
    redirect: "/dashboard/items?type=lost",
    api: "/api/lost",
    dateKey: "lostAt",
  },
  found: {
    pageTitle: "تسليم غرض وجدته",
    titlePlaceholder: "مثال: محفظة جلدية سوداء وُجدت في السوق",
    descPlaceholder: "صف الغرض بدقة — اللون، الحجم، العلامات المميزة...",
    imagesLabel: "صور الغرض (اختياري)",
    dateLabel: "تاريخ الإيجاد (اختياري)",
    locationLabel: "موقع الإيجاد (اختياري)",
    locationHint: "انقر على الخريطة أو حرِّك الدبوس لتحديد المنطقة",
    secretLabel: "تفاصيل سرية (اختياري)",
    secretHint: "معلومة للتحقق من هوية صاحب الغرض — لن تُشارَك مع أي شخص آخر",
    secretPlaceholder: "مثال: يوجد بداخله بطاقة باسم...",
    categoryError: "يرجى اختيار تصنيف الغرض",
    submitError: "حدث خطأ أثناء تسجيل الغرض",
    submit: "تسجيل الغرض",
    redirect: "/dashboard/items?type=found",
    api: "/api/found",
    dateKey: "foundAt",
  },
} as const;

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-4)",
    border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    background: active ? "var(--color-primary-light)" : "transparent",
    cursor: "pointer",
    fontSize: "var(--font-size-sm)",
    fontWeight: 500,
    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
    transition: "all 150ms",
  };
}

export default function ReportItemForm({ initialType }: { initialType?: ItemType }) {
  const router = useRouter();
  const [itemType, setItemType] = useState<ItemType | "">(initialType ?? "");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    occurredAt: "",
    secretDetails: "",
  });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ path: string; id: string; previewUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = itemType ? copy[itemType] : null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleTypeChange(next: ItemType) {
    setItemType(next);
    setError("");
    router.replace(`/dashboard/report?type=${next}`, { scroll: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!itemType || !selected) {
      setError("يرجى اختيار نوع البلاغ");
      return;
    }
    if (!form.category) {
      setError(selected.categoryError);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(selected.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          secretDetails: form.secretDetails,
          lat,
          lng,
          [selected.dateKey]: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
          images: uploadedImages.map((img) => ({ path: img.path })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? selected.submitError);
        setLoading(false);
      } else {
        router.push(selected.redirect);
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
        <h1 className="page-title">{selected?.pageTitle ?? "بلاغ جديد"}</h1>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div className="field">
          <label className="label">نوع البلاغ *</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            {typeOptions.map((opt) => {
              const active = itemType === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                    padding: "var(--space-4)",
                    border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)",
                    background: active ? "var(--color-primary-light)" : "transparent",
                    cursor: "pointer",
                    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                    transition: "all 150ms",
                  }}
                >
                  <input
                    type="radio"
                    name="itemType"
                    value={opt.value}
                    checked={active}
                    onChange={() => handleTypeChange(opt.value)}
                    style={{ display: "none" }}
                  />
                  <span style={{ fontWeight: 700, fontSize: "var(--font-size-base)" }}>{opt.label}</span>
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", fontWeight: 400 }}>
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="title">العنوان *</label>
          <input
            id="title"
            name="title"
            type="text"
            className="input"
            placeholder={selected?.titlePlaceholder ?? "مثال: محفظة جلدية سوداء"}
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label className="label">التصنيف *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {categories.map((cat) => (
              <label key={cat.value} style={chipStyle(form.category === cat.value)}>
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

        <div className="field">
          <label className="label" htmlFor="description">الوصف *</label>
          <textarea
            id="description"
            name="description"
            className="textarea"
            placeholder={selected?.descPlaceholder ?? "صف الغرض بدقة — اللون، الحجم، أي علامات فارقة..."}
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
          />
        </div>

        <div className="field">
          <label className="label">{selected?.imagesLabel ?? "صور الغرض (اختياري)"}</label>
          <ImageUploader onUpload={setUploadedImages} />
        </div>

        <div className="field">
          <label className="label" htmlFor="occurredAt">
            {selected?.dateLabel ?? "التاريخ (اختياري)"}
          </label>
          <input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            className="input"
            value={form.occurredAt}
            onChange={handleChange}
            dir="ltr"
          />
        </div>

        <div className="field">
          <label className="label">{selected?.locationLabel ?? "الموقع التقريبي (اختياري)"}</label>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            {selected?.locationHint ?? "انقر على الخريطة لتحديد الموقع"}
          </p>
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={(la, ln) => { setLat(la); setLng(ln); }}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="secretDetails">
            {selected?.secretLabel ?? "تفاصيل سرية للتحقق (اختياري)"}
          </label>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            {selected?.secretHint ?? "معلومة للتحقق — لن تظهر للعامة"}
          </p>
          <textarea
            id="secretDetails"
            name="secretDetails"
            className="textarea"
            placeholder={selected?.secretPlaceholder ?? "مثال: رقم تسلسلي، خدش، نقش خاص..."}
            value={form.secretDetails}
            onChange={handleChange}
            rows={2}
          />
        </div>

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
            ) : (selected?.submit ?? "نشر البلاغ")}
          </button>
        </div>
      </form>
    </div>
  );
}
