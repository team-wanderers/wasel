"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
      name: name || undefined,
      phone: phone || undefined,
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
    <div className="card" style={{ width: "100%", maxWidth: "420px" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontSize: "var(--font-size-3xl)", fontWeight: 700, color: "var(--color-primary)" }}>
          واصل
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-2)" }}>
          {step === "email" ? "أدخل بريدك الإلكتروني للدخول" : "أدخل رمز التحقق"}
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      {step === "email" ? (
        <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label className="label" htmlFor="name">الاسم (اختياري للمستخدمين الجدد)</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="مثال: محمد علي"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
          <div className="field">
            <label className="label" htmlFor="phone">رقم الهاتف (للتواصل، اختياري)</label>
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
            {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>
            تم إرسال رمز التحقق إلى <strong dir="ltr">{email}</strong>
          </p>
          <div className="field">
            <label className="label" htmlFor="code">رمز التحقق (6 أرقام)</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="• • • • • •"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              dir="ltr"
              style={{ textAlign: "center", fontSize: "var(--font-size-xl)", letterSpacing: "0.3em" }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 6}>
            {loading ? "جارٍ التحقق..." : "تأكيد الدخول"}
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
    </div>
  );
}
