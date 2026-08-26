"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AuthShell from "@/components/AuthShell";
import OtpInput from "@/components/OtpInput";

type Step = "email" | "code";

type ErrorCode = "USER_NOT_FOUND" | null;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<ErrorCode>(null);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorCode(null);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), mode: "login" }),
    });

    const data = await res.json().catch(() => ({ ok: false }));

    if (!data.ok) {
      setLoading(false);
      setError(data.message ?? "حدث خطأ، حاول مرة أخرى");
      setErrorCode(data.error === "USER_NOT_FOUND" ? "USER_NOT_FOUND" : null);
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
      eyebrow="تسجيل الدخول"
      title="مرحباً بعودتك"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رمز الدخول — لا حاجة لكلمة مرور."
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
          {errorCode === "USER_NOT_FOUND" && (
            <Link
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-1)",
                fontWeight: 700,
                color: "hsl(215,80%,40%)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              إنشاء حساب جديد ←
            </Link>
          )}
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label className="label" htmlFor="email">البريد الإلكتروني *</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "جارٍ التحقق..." : "إرسال رمز التحقق"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>
            تم إرسال رمز التحقق إلى <strong dir="ltr">{email}</strong>
          </p>

          <OtpInput value={code} onChange={setCode} />

          <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 6}>
            {loading ? "جارٍ التحقق..." : "تأكيد الدخول"}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setStep("email"); setCode(""); setError(""); setErrorCode(null); }}
          >
            تغيير البريد
          </button>
        </form>
      )}

      <div
        style={{
          marginTop: "var(--space-6)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        <span style={{ color: "var(--color-text-secondary)" }}>
          ليس لديك حساب؟{" "}
          <Link href="/register" style={{ fontWeight: 700 }}>إنشاء حساب</Link>
        </span>
        <Link href="/forgot-password" style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
          نسيت طريقة الوصول إلى حسابك؟
        </Link>
      </div>
    </AuthShell>
  );
}
