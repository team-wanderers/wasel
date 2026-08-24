import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  IconLock,
  IconMapPin,
  IconSearch,
} from "@/components/icons";

export default async function HomePage() {
  const session = await getSession();

  return (
    <>
      {/* Hero */}
      <section style={{
        background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
        padding: "var(--space-16) 0",
        textAlign: "center",
      }}>
        <div className="container">
          <h1 style={{ fontSize: "var(--font-size-3xl)", fontWeight: 700, color: "#fff", marginBottom: "var(--space-4)" }}>
            واصل
          </h1>
          <p style={{ fontSize: "var(--font-size-xl)", color: "hsl(210,70%,90%)", marginBottom: "var(--space-8)", maxWidth: "540px", margin: "0 auto var(--space-8)" }}>
            نظام إدارة المفقودات في مدينة عتق ومحافظة شبوة
          </p>
          <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/search" className="btn" style={{ background: "#fff", color: "var(--color-primary)", fontWeight: 700 }}>
              ابحث عن مفقود
            </Link>
            {session ? (
              <Link href="/dashboard" className="btn btn-outline" style={{ borderColor: "#fff", color: "#fff" }}>
                لوحتي
              </Link>
            ) : (
              <Link href="/login" className="btn btn-outline" style={{ borderColor: "#fff", color: "#fff" }}>
                سجّل دخولك
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "var(--space-16) 0" }}>
        <div className="container">
          <div className="grid-cards">
            {[
              { icon: <IconSearch size={40} />, title: "محرك مطابقة ذكي", desc: "يُقارن البلاغات تلقائياً بناءً على التصنيف والوصف والموقع الجغرافي" },
              { icon: <IconLock size={40} />, title: "تحقق آمن", desc: "بياناتك السرية لا تُكشف أبداً — التحقق يثبت هويتك دون انكشاف تفاصيلك" },
              { icon: <IconMapPin size={40} />, title: "نقاط أمانة معتمدة", desc: "تسليم المفقودات في مواقع آمنة ومحايدة داخل المدينة" },
            ].map((f) => (
              <div key={f.title} className="card" style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "var(--space-4)", color: "var(--color-primary)", display: "flex", justifyContent: "center" }}>{f.icon}</div>
                <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, marginBottom: "var(--space-2)" }}>{f.title}</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--color-primary-light)", padding: "var(--space-12) 0", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
            فقدت شيئاً؟ أو وجدت غرضاً؟
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>
            أضف بلاغاً الآن وسيتواصل معك النظام فور وجود تطابق
          </p>
          <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={session ? "/dashboard/lost/new" : "/login"} className="btn btn-primary">
              أبلِغ عن مفقود
            </Link>
            <Link href={session ? "/dashboard/found/new" : "/login"} className="btn btn-outline">
              سلِّم غرضاً وجدته
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
