"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AuthShell from "@/components/AuthShell";
import OtpInput from "@/components/OtpInput";

type Step = "details" | "code";

type ErrorCode = "USER_ALREADY_EXISTS" | null;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<ErrorCode>(null);

  function validate(): string {
    if (!name.trim()) return "يرجى إدخال الاسم الكامل";
    if (!email.trim()) return "يرجى إدخال البريد الإلكتروني";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim())) {
      return "البريد الإلكتروني غير صالح. يرجى إدخاله باللغة الإنجليزية، مثل: example@email.com";
    }
    return "";
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setErrorCode(null);
      return;
    }

    setLoading(true);
    setError("");
    setErrorCode(null);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), mode: "register" }),
    });

    const data = await res.json().catch(() => ({ ok: false }));

    if (!data.ok) {
      setLoading(false);
      setError(data.message ?? "حدث خطأ، حاول مرة أخرى");
      setErrorCode(data.error === "USER_ALREADY_EXISTS" ? "USER_ALREADY_EXISTS" : null);
      return;
    }

    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });

    setLoading(false);

    if (sendError) {
      setError(sendError.message ?? "حدث خطأ، حاول مرة أخرى");
    } else {
      setStep("code");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorCode(null);

    const { error: signInError } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code,
      name: name.trim(),
      phone: phone.trim() || undefined,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "رمز غير صحيح");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <AuthShell
      eyebrow="إنشاء حساب"
      title="أنشئ حسابك في واصل"
      subtitle="سجّل ببريدك الإلكتروني فقط — سنرسل لك رمز تحقق لتأكيد الحساب."
    >
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            background: "hsl(0,70%,95%)",
            border: "1px solid hsl(0,65%,82%)",
            borderRadius: "var(--radius-md)",
            color: "hsl(0,65%,35%)",
            fontSize: "var(--font-size-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span>{error}</span>
          {errorCode === "USER_ALREADY_EXISTS" && (
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-1)",
                fontWeight: 700,
                color: "hsl(215,80%,40%)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              الانتقال لتسجيل الدخول ←
            </Link>
          )}
        </div>
      )}

      {step === "details" ? (
        <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label className="label" htmlFor="name">الاسم الكامل *</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="أدخل اسمك الكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">البريد الإلكتروني *</label>
            <input
              id="email"
              type="text"
              inputMode="email"
              className="input"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="phone">رقم الهاتف (اختياري)</label>
            <input
              id="phone"
              type="tel"
              className="input"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "جارٍ التحقق..." : "إنشاء الحساب"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>
            تم إرسال رمز التحقق إلى <strong dir="ltr">{email}</strong>
            <br />
            أدخل الرمز لتفعيل حسابك.
          </p>

          <OtpInput value={code} onChange={setCode} />

          <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 6}>
            {loading ? "جارٍ التحقق..." : "تأكيد الرمز"}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setStep("details"); setCode(""); setError(""); setErrorCode(null); }}
          >
            تعديل البيانات
          </button>
        </form>
      )}

      <div
        style={{
          marginTop: "var(--space-6)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--color-border)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        لديك حساب بالفعل؟{" "}
        <Link href="/login" style={{ fontWeight: 700 }}>تسجيل الدخول</Link>
      </div>
    </AuthShell>
  );
}
