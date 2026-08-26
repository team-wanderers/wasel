"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AuthShell from "@/components/AuthShell";
import OtpInput from "@/components/OtpInput";

type Step = "email" | "code";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
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

    const { error: signInError } = await authClient.signIn.emailOtp({
      email,
      otp: code,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "رمز غير صحيح");
    } else {
      router.push("/dashboard/profile");
      router.refresh();
    }
  }

  return (
    <AuthShell
      eyebrow="استعادة الوصول"
      title="نسيت طريقة الدخول؟"
      subtitle="لا نستخدم كلمات مرور — سنرسل رمز دخول جديد إلى بريدك لتستعيد حسابك."
    >
      {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      {step === "email" ? (
        <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
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
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "جارٍ الإرسال..." : "إرسال رمز الاستعادة"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>
            تم إرسال الرمز إلى <strong dir="ltr">{email}</strong>
          </p>

          <OtpInput value={code} onChange={setCode} />

          <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 6}>
            {loading ? "جارٍ التحقق..." : "استعادة الحساب"}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
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
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        العودة إلى{" "}
        <Link href="/login" style={{ fontWeight: 700 }}>تسجيل الدخول</Link>
      </div>
    </AuthShell>
  );
}
