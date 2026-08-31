"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImageUploader from "@/components/ImageUploader";
import { IconCheck, IconLock, IconPencil, IconAlertTriangle, IconTrash, IconClose } from "@/components/icons";


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
  { value: "matched", label: "مطابَق" },
  { value: "claimed", label: "مطالَب به" },
  { value: "recovered", label: "مُسترجَع" },
  { value: "closed", label: "مغلق" },
];

type UploadedImage = {
  id: string;
  path: string;
  previewUrl: string;
};

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#fff",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--space-4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--color-danger-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconTrash size={20} style={{ color: "var(--color-danger)" }} />
            </div>
            <h2
              style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: 700,
                margin: 0,
              }}
            >
              تأكيد حذف البلاغ
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              lineHeight: 1,
              display: "inline-flex",
              padding: "0.2rem",
            }}
          >
            <IconClose size={18} />
          </button>
        </div>

        <p
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: 1.8,
            marginBottom: "var(--space-6)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          هل أنت متأكد من حذف هذا البلاغ؟ لا يمكن التراجع عن هذه العملية وستُحذف جميع البيانات والصور المرفقة نهائياً.
        </p>

        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                جاري الحذف...
              </span>
            ) : (
              "نعم، احذف البلاغ"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditFoundItemPage() {

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    foundAt: "",
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    async function loadItem() {
      try {
        const response = await fetch(`/api/found/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "تعذر تحميل بيانات البلاغ.");
          return;
        }

        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          category: data.category ?? "",
          foundAt: data.foundAt
            ? new Date(data.foundAt).toISOString().slice(0, 16)
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

    if (form.status !== "open") {
      setError("لا يمكن تعديل هذا البلاغ لأنه ليس بالحالة المفتوحة.");
      return;
    }

    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`/api/found/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          lat,
          lng,
          foundAt: form.foundAt
            ? new Date(form.foundAt).toISOString()
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
    if (form.status !== "open") {
      setError("لا يمكن حذف هذا البلاغ لأنه ليس بالحالة المفتوحة.");
      setDeleteModalOpen(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/found/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "فشل حذف البلاغ.");
        setDeleteModalOpen(false);
        setLoading(false);
        return;
      }

      router.push("/dashboard/found");
      router.refresh();
    } catch {
      setError("تعذر حذف البلاغ. حاول مرة أخرى.");
      setDeleteModalOpen(false);
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
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
      />

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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

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
          <IconPencil size={16} /> تعديل البلاغ
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
            <div style={{ color: "var(--color-success)", paddingTop: "0.2rem" }}>
              <IconCheck size={24} strokeWidth={2} />
            </div>

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

      {/* Alert when editing is disabled */}
      {form.status !== "open" && (
        <div
          className="alert"
          style={{
            marginBottom: "var(--space-6)",
            background: "hsl(0, 0%, 95%)",
            borderColor: "hsl(0, 0%, 80%)",
            color: "hsl(0, 0%, 30%)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <IconAlertTriangle size={20} style={{ color: "hsl(0, 0%, 40%)", flexShrink: 0 }} />
          <div>
            <strong>تعديل وحذف البلاغ معطّل</strong>
            <div style={{ fontSize: "var(--font-size-sm)", marginTop: "2px" }}>
              {form.status === "closed"
                ? "هذا البلاغ مغلق (تمت مراجعته أو إغلاقه من قِبل الإدارة)، ولا يمكن تعديل أو حذف بياناته."
                : form.status === "recovered"
                ? "تم تسليم واسترجاع هذا الغرض بنجاح، البلاغ مكتمل ومؤرشف ولا يمكن تعديله أو حذفه."
                : form.status === "claimed"
                ? "هذا البلاغ مرتبط بمطالبة مثبتة وقيد إجراءات الاسترداد، لا يمكن تعديل أو حذف بياناته حالياً."
                : "لا يمكن تعديل أو حذف هذا البلاغ لأنه ليس بالحالة المفتوحة."}
            </div>
          </div>
        </div>
      )}


      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: "var(--space-8)",
        }}
      >
        <fieldset
          disabled={form.status !== "open" || loading}
          style={{ border: "none", padding: 0, margin: 0 }}
        >
          <div className="edit-report-grid">
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
                disabled={form.status !== "open"}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

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
                        cursor: form.status === "open" ? "pointer" : "not-allowed",
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
                        disabled={form.status !== "open"}
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
                      {form.status === "open"
                        ? "يمكنك إضافة صور أو حذف الصور الحالية من خلال أداة الصور."
                        : "عرض الصور المرفقة بالبلاغ."}
                    </p>
                  </div>

                  {form.status === "open" ? (
                    <ImageUploader
                      key={`found-uploader-${id}`}
                      foundItemId={id}
                      initialFiles={uploadedImages}
                      onUpload={setUploadedImages}
                    />
                  ) : (
                    <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      {uploadedImages.map((img) => (
                        <a key={img.id} href={img.previewUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.previewUrl}
                            alt="صورة البلاغ"
                            style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "var(--radius-md)" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="foundAt">
                تاريخ العثور عليه
              </label>

              <input
                id="foundAt"
                name="foundAt"
                type="datetime-local"
                className="input"
                value={form.foundAt}
                onChange={handleChange}
                dir="ltr"
              />
            </div>

            <div className="field edit-report-full">
              <label className="label">الموقع</label>

              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                حدّد الموقع التقريبي على الخريطة لتحديث بيانات الغرض.
              </p>

              <LocationPicker
                lat={lat}
                lng={lng}
                onChange={(latitude, longitude) => {
                  if (form.status === "open") {
                    setLat(latitude);
                    setLng(longitude);
                  }
                }}
              />
            </div>

            <div className="field edit-report-full">
              <label className="label" htmlFor="secretDetails" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <IconLock size={15} /> التفاصيل السرية
              </label>

              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.8,
                }}
              >
                هذه المعلومة تستخدم للمساعدة في التحقق من صاحب الغرض ولا
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
        </fieldset>

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
            disabled={loading || form.status !== "open"}
            style={{ width: "100%" }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                جارٍ الحفظ...
              </span>
            ) : "حفظ التعديلات"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.back()}
            disabled={loading}
            style={{ width: "100%" }}
          >
            إلغاء
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setDeleteModalOpen(true)}
            disabled={loading || form.status !== "open"}
            style={{
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            <IconTrash size={16} />
            حذف البلاغ
          </button>

          {saved && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                router.push("/dashboard/found");
                router.refresh();
              }}
              style={{ width: "100%" }}
            >
              العودة إلى ما وجدته
            </button>
          )}
        </div>
      </form>
    </div>
  );
}