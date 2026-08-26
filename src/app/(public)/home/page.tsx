import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  IconCheck,
  IconLock,
  IconMapPin,
  IconSearch,
} from "@/components/icons";
import Reveal from "@/components/Reveal";
import SiteFooter from "@/components/SiteFooter";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div dir="rtl">
      <div className="blob-field" aria-hidden="true">
        <div className="blob blob-blue" style={{ top: "-10rem", right: "-10rem", width: "24rem", height: "24rem" }} />
        <div className="blob blob-green" style={{ top: "45%", left: "-10rem", width: "22rem", height: "22rem" }} />
        <div className="blob blob-indigo" style={{ bottom: "-6rem", right: "30%", width: "18rem", height: "18rem" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <section
          className="hero-gradient"
          style={{ padding: "var(--space-16) 0", textAlign: "center" }}
        >
          <div className="banner-glow" style={{ top: "-8rem", left: "-6rem", width: "20rem", height: "20rem", background: "hsl(210 80% 60% / 0.35)" }} />
          <div className="banner-glow" style={{ bottom: "-10rem", right: "-4rem", width: "22rem", height: "22rem", background: "hsl(142 60% 50% / 0.18)" }} />

          <div className="container" style={{ position: "relative" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "100px",
                background: "hsl(0 0% 100% / 0.14)",
                border: "1px solid hsl(0 0% 100% / 0.25)",
                color: "#fff",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                marginBottom: "var(--space-6)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "hsl(142, 65%, 55%)",
                  animation: "eyebrow-pulse 2s ease-in-out infinite",
                }}
              />
              منصة المفقودات والمعثورات
            </span>

            <h1
              style={{
                fontSize: "clamp(2.4rem, 6vw, 4.2rem)",
                fontWeight: 800,
                lineHeight: 1.25,
                marginBottom: "var(--space-5)",
                letterSpacing: "-0.02em",
              }}
            >
              ما فقدته
              <br />
              <span style={{ color: "hsl(210, 90%, 78%)" }}>قد يكون أقرب مما تتوقع.</span>
            </h1>

            <p
              style={{
                fontSize: "var(--font-size-lg)",
                color: "hsl(210, 70%, 90%)",
                maxWidth: "600px",
                margin: "0 auto var(--space-8)",
                lineHeight: 1.9,
              }}
            >
              نظام إدارة المفقودات في مدينة عتق ومحافظة شبوة — أبلغ عن غرضك
              المفقود ودع محرك المطابقة الذكي يعمل نيابةً عنك.
            </p>

            <div
              style={{
                display: "flex",
                gap: "var(--space-4)",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/search" className="btn btn-white btn-lg-hero">
                ابدأ الآن ←
              </Link>
              {session ? (
                <Link href="/dashboard" className="btn btn-outline-white">
                  لوحتي
                </Link>
              ) : (
                <Link href="/login" className="btn btn-outline-white">
                  لدي حساب بالفعل
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Trust Row */}
        <section className="container" style={{ marginTop: "calc(var(--space-12) * -1)", position: "relative", zIndex: 2 }}>
          <div className="grid-cards">
            {[
              { icon: <IconCheck size={26} />, label: "تجربة بسيطة", tile: "tile-green" },
              { icon: <IconSearch size={26} />, label: "بحث منظم", tile: "tile-blue" },
              { icon: <IconLock size={26} />, label: "خصوصية أفضل", tile: "tile-purple" },
            ].map((item, index) => (
              <Reveal key={item.label} delay={index * 100}>
                <div className="card card-hover" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4) var(--space-6)" }}>
                  <div className={`step-tile ${item.tile}`} style={{ marginBottom: 0 }}>
                    {item.icon}
                  </div>
                  <strong style={{ fontSize: "var(--font-size-base)" }}>{item.label}</strong>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container" style={{ padding: "var(--space-16) var(--space-4)" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "var(--space-12)" }}>
              <span className="eyebrow">كيف يعمل واصل؟</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>
                أربع خطوات فقط لاستعادة غرضك
              </h2>
            </div>
          </Reveal>

          <div className="grid-cards">
            {[
              { num: "01", title: "سجِّل", desc: "أنشئ حسابك خلال لحظات ببريدك الإلكتروني فقط", tile: "tile-blue" },
              { num: "02", title: "أبلِغ", desc: "أضف بلاغ مفقود أو موجّه بالتفاصيل والصور والموقع", tile: "tile-indigo" },
              { num: "03", title: "طابِق", desc: "محرك المطابقة يقارن البلاغات تلقائياً وينبّه الطرفين", tile: "tile-green" },
              { num: "04", title: "استعد", desc: "تحقق آمن يثبت الملكية والتسليم في نقطة أمانة معتمدة", tile: "tile-purple" },
            ].map((step, index) => (
              <Reveal key={step.num} delay={index * 120}>
                <div className="card card-hover" style={{ height: "100%" }}>
                  <div className={`step-tile ${step.tile}`}>{step.num}</div>
                  <h3 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
                    {step.title}
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", lineHeight: 1.8 }}>
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="container" style={{ paddingBottom: "var(--space-16)" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "var(--space-12)" }}>
              <span className="eyebrow">لماذا واصل؟</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>
                كل ما تحتاجه في منصة واحدة
              </h2>
            </div>
          </Reveal>

          <div className="grid-cards">
            {[
              { icon: <IconSearch size={40} />, title: "محرك مطابقة ذكي", desc: "يُقارن البلاغات تلقائياً بناءً على التصنيف والوصف والموقع الجغرافي" },
              { icon: <IconLock size={40} />, title: "تحقق آمن", desc: "بياناتك السرية لا تُكشف أبداً — التحقق يثبت هويتك دون انكشاف تفاصيلك" },
              { icon: <IconMapPin size={40} />, title: "نقاط أمانة معتمدة", desc: "تسليم المفقودات في مواقع آمنة ومحايدة داخل المدينة" },
            ].map((f, index) => (
              <Reveal key={f.title} delay={index * 120}>
                <div className="card card-hover" style={{ textAlign: "center", height: "100%" }}>
                  <div
                    style={{
                      color: "var(--color-primary)",
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
                    {f.title}
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", lineHeight: 1.8 }}>
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container" style={{ paddingBottom: "var(--space-8)" }}>
          <Reveal>
            <div className="dark-banner" style={{ padding: "var(--space-12) var(--space-8)", textAlign: "center" }}>
              <div className="banner-glow" style={{ top: "-6rem", right: "20%", width: "18rem", height: "18rem", background: "hsl(210 80% 55% / 0.35)" }} />
              <div className="banner-glow" style={{ bottom: "-8rem", left: "10%", width: "16rem", height: "16rem", background: "hsl(142 60% 50% / 0.22)" }} />

              <div style={{ position: "relative" }}>
                <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, marginBottom: "var(--space-4)" }}>
                  فقدت شيئاً؟ أو وجدت غرضاً؟
                </h2>
                <p style={{ color: "hsl(220, 15%, 75%)", marginBottom: "var(--space-8)", maxWidth: "520px", marginInline: "auto" }}>
                  أضف بلاغاً الآن وسيتواصل معك النظام فور وجود تطابق
                </p>
                <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href={session ? "/dashboard/lost/new" : "/register"} className="btn btn-primary">
                    أبلِغ عن مفقود
                  </Link>
                  <Link href={session ? "/dashboard/found/new" : "/register"} className="btn btn-outline-white">
                    سلِّم غرضاً وجدته
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
