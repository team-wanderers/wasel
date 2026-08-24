import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <div className="footer-brand">
            WASEL <span style={{ color: "var(--color-primary)" }}>| واصل</span>
          </div>
          <p className="footer-text" style={{ marginTop: "var(--space-1)" }}>
            منصة المفقودات والمعثورات — عتق ومحافظة شبوة
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
          <Link href="/search" className="footer-text" style={{ fontWeight: 600 }}>
            البحث
          </Link>
          <Link href="/login" className="footer-text" style={{ fontWeight: 600 }}>
            تسجيل الدخول
          </Link>
          <Link href="/register" className="footer-text" style={{ fontWeight: 600 }}>
            إنشاء حساب
          </Link>
        </div>

        <p className="footer-text">© 2026 WASEL. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}
