"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImageUploader from "@/components/ImageUploader";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div
      className="map-container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
      }}
    >
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

const statusOptions = [
  { value: "open", label: "مفتوح" },
  { value: "closed", label: "مغلق" },
];

type UploadedImage = {
  id: string;
  path: string;
  previewUrl: string;
};

export default function EditLostItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    lostAt: "",
    secretDetails: "",
    status: "open",
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadItem() {
      try {
        const response = await fetch(`/api/lost/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "تعذر تحميل بيانات البلاغ.");
          return;
        }

        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          category: data.category ?? "",
          lostAt: data.lostAt
            ? new Date(data.lostAt).toISOString().slice(0, 16)
            : "",
          secretDetails: data.secretDetails ?? "",
          status: data.status ?? "open",
        });

        if (data.lat !== null && data.lat !== undefined) {
          setLat(data.lat);
        }

        if (data.lng !== null && data.lng !== undefined) {
          setLng(data.lng);
        }

        if (Array.isArray(data.images)) {
          setUploadedImages(
            data.images.map((image: { id: string; path: string }) => ({
              id: image.id,
              path: image.path,
              previewUrl: image.path.startsWith("/")
                ? image.path
                : `/${image.path}`,
            })),
          );
        }
      } catch {
        setError("تعذر تحميل بيانات البلاغ.");
      } finally {
        setFetching(false);
      }
    }

    loadItem();
  }, [id]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`/api/lost/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          lat,
          lng,
          lostAt: form.lostAt
            ? new Date(form.lostAt).toISOString()
            : null,
          images: uploadedImages.map((image) => ({
            path: image.path,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "حدث خطأ أثناء حفظ التعديلات.");
        return;
      }

      setSaved(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/lost/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "فشل حذف البلاغ.");
        return;
      }

      router.push("/dashboard/lost");
      router.refresh();
    } catch {
      setError("تعذر حذف البلاغ. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div
        dir="rtl"
        style={{
          maxWidth: "880px",
          marginInline: "auto",
          paddingBlock: "var(--space-8)",
          color: "var(--color-text-muted)",
        }}
      >
        جارٍ تحميل البلاغ...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: "880px",
        marginInline: "auto",
      }}
    >
      <style>{`
        .edit-report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-6);
        }

        .edit-report-full {
          grid-column: 1 / -1;
        }

        @media (max-width: 768px) {
          .edit-report-grid {
            grid-template-columns: 1fr;
          }

          .edit-report-full {
            grid-column: auto;
          }
        }
      `}</style>

      {/* Header */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.5rem 0.9rem",
            borderRadius: "999px",
            background: "hsl(245, 70%, 95%)",
            color: "hsl(245, 55%, 45%)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
            marginBottom: "var(--space-4)",
          }}
        >
          ✏️ تعديل البلاغ
        </span>

        <h1
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
            fontWeight: 700,
            marginBottom: "var(--space-3)",
          }}
        >
          تعديل بيانات البلاغ
        </h1>

        <p
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: 1.9,
            maxWidth: "700px",
          }}
        >
          يمكنك تحديث معلومات البلاغ والتأكد من أن البيانات المعروضة
          ما زالت صحيحة.
        </p>

        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-3)",
          }}
        >
          الحقول التي تحمل{" "}
          <span
            style={{
              color: "var(--color-danger)",
              fontWeight: 700,
            }}
          >
            *
          </span>{" "}
          إلزامية.
        </p>
      </section>

      {/* Success */}
      {saved && (
        <div
          className="alert alert-success"
          style={{
            marginBottom: "var(--space-6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ fontSize: "1.5rem" }}>✅</div>

            <div>
              <h2
                style={{
                  fontWeight: 700,
                  marginBottom: "var(--space-1)",
                }}
              >
                تم حفظ التعديلات
              </h2>

              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  lineHeight: 1.7,
                }}
              >
                تم تحديث البلاغ بنجاح.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="alert alert-error"
          style={{
            marginBottom: "var(--space-6)",
          }}
        >
          {error}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="alert alert-error"
          style={{
            marginBottom: "var(--space-6)",
          }}
        >
          <p
            style={{
              marginBottom: "var(--space-4)",
              fontWeight: 600,
            }}
          >
            هل أنت متأكد من حذف هذا البلاغ؟ لا يمكن التراجع عن هذه العملية.
          </p>

          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "جارٍ الحذف..." : "نعم، احذف البلاغ"}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDeleteConfirm(false)}
              disabled={loading}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: "var(--space-8)",
        }}
      >
        <div className="edit-report-grid">
          {/* Status */}
          <div className="field">
            <label className="label" htmlFor="status">
              الحالة
            </label>

            <select
              id="status"
              name="status"
              className="select"
              value={form.status}
              onChange={handleChange}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="field">
            <label className="label" htmlFor="title">
              اسم الغرض{" "}
              <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>

            <input
              id="title"
              name="title"
              type="text"
              className="input"
              value={form.title}
              onChange={handleChange}
              minLength={3}
              required
            />
          </div>

          {/* Category */}
          <div className="field edit-report-full">
            <label className="label">
              نوع الغرض{" "}
              <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "var(--space-2)",
              }}
            >
              {categories.map((category) => {
                const selected = form.category === category.value;

                return (
                  <label
                    key={category.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "48px",
                      padding: "var(--space-2) var(--space-3)",
                      border: `1.5px solid ${
                        selected
                          ? "var(--color-primary)"
                          : "var(--color-border)"
                      }`,
                      borderRadius: "var(--radius-md)",
                      background: selected
                        ? "var(--color-primary-light)"
                        : "var(--color-surface)",
                      color: selected
                        ? "var(--color-primary)"
                        : "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: selected ? 700 : 500,
                      transition:
                        "background 150ms ease, border-color 150ms ease, color 150ms ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={selected}
                      onChange={handleChange}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                    />

                    {category.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="field edit-report-full">
            <label className="label" htmlFor="description">
              وصف الغرض{" "}
              <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>

            <textarea
              id="description"
              name="description"
              className="textarea"
              value={form.description}
              onChange={handleChange}
              minLength={10}
              rows={5}
              required
            />
          </div>

          {/* Images */}
          <div className="field edit-report-full">
            <label className="label">
              صورة الغرض{" "}
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontWeight: 400,
                }}
              >
                (اختياري)
              </span>
            </label>

            <div
              style={{
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
                padding: "var(--space-5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    الصور الحالية
                  </strong>

                  <p
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    يمكنك إضافة صور أو حذف الصور الحالية من خلال أداة الصور.
                  </p>
                </div>

                <ImageUploader
                  key={`lost-uploader-${id}`}
                  lostItemId={id}
                  initialFiles={uploadedImages}
                  onUpload={setUploadedImages}
                />
              </div>
            </div>
          </div>

          {/* Lost date */}
          <div className="field">
            <label className="label" htmlFor="lostAt">
              التاريخ
            </label>

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

          {/* Location */}
          <div className="field edit-report-full">
            <label className="label">الموقع</label>

            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-2)",
              }}
            >
              حدّد الموقع التقريبي على الخريطة لتحديث بيانات البلاغ.
            </p>

            <LocationPicker
              lat={lat}
              lng={lng}
              onChange={(latitude, longitude) => {
                setLat(latitude);
                setLng(longitude);
              }}
            />
          </div>

          {/* Secret details */}
          <div className="field edit-report-full">
            <label className="label" htmlFor="secretDetails">
              🔒 التفاصيل السرية
            </label>

            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                lineHeight: 1.8,
              }}
            >
              هذه المعلومة تستخدم للمساعدة في التحقق من ملكية الغرض ولا
              ينبغي أن تحتوي على معلومات تريد عرضها للعامة.
            </p>

            <textarea
              id="secretDetails"
              name="secretDetails"
              className="textarea"
              value={form.secretDetails}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: "var(--space-8)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            gap: "var(--space-3)",
            flexDirection: "column",
          }}
        >
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
            }}
          >
            {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.back()}
            disabled={loading}
            style={{
              width: "100%",
            }}
          >
            إلغاء
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setDeleteConfirm(true)}
            disabled={loading}
            style={{
              width: "100%",
            }}
          >
            حذف البلاغ
          </button>

          {saved && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                router.push("/dashboard/lost");
                router.refresh();
              }}
              style={{
                width: "100%",
              }}
            >
              العودة إلى بلاغاتي
            </button>
          )}
        </div>
      </form>
    </div>
  );
}