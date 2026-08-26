"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface Props {
  email: string;
  initialName: string;
  initialPhone: string;
}

export default function EditProfileForm({
  email,
  initialName,
  initialPhone,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("يرجى إدخال الاسم الكامل");
      return;
    }

    const payload: {
      name: string;
      phone?: string;
    } = { name: trimmedName };

    if (phone.trim()) {
      payload.phone = phone.trim();
    }

    setSaving(true);

    try {
      const { error: updateError } = await authClient.updateUser(payload);

      if (updateError) {
        setError(
          updateError.message ??
            "تعذر حفظ التعديلات، يرجى المحاولة مرة أخرى",
        );
        return;
      }

      setSaved(true);
      router.refresh();

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {saved && (
        <div
          role="status"
          style={{
            marginBottom: "var(--space-6)",
            padding: "var(--space-4) var(--space-5)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-success-light)",
            color: "var(--color-success)",
            border: "1px solid var(--color-success)",
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              marginBottom: "var(--space-1)",
            }}
          >
            تم حفظ التعديلات بنجاح
          </h2>

          <p style={{ fontSize: "var(--font-size-sm)" }}>
            تم تحديث معلومات حسابك.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="alert alert-error"
          style={{ marginBottom: "var(--space-6)" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          <div className="field">
            <label className="label" htmlFor="profile-name">
              الاسم الكامل <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>

            <input
              id="profile-name"
              type="text"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="أدخل اسمك الكامل"
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-email">
              البريد الإلكتروني
            </label>

            <input
              id="profile-email"
              type="text"
              className="input"
              value={email}
              readOnly
              dir="ltr"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-muted)",
                cursor: "not-allowed",
              }}
            />

            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              لا يمكن تغيير البريد الإلكتروني حاليًا؛ هو معرّف الدخول الخاص بك.
            </p>
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-phone">
              رقم الهاتف
            </label>

            <input
              id="profile-phone"
              type="tel"
              className="input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="أدخل رقم الهاتف"
              dir="ltr"
              autoComplete="tel"
            />

            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              مثال: 777123456
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "var(--space-7)",
            paddingTop: "var(--space-5)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ flex: 1, minWidth: "180px" }}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push("/dashboard/profile")}
            style={{ flex: 1, minWidth: "180px" }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
