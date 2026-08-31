import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  IconFileText,
  IconHandshake,
  IconLock,
  IconSearch,
  IconShield,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "عن الخدمة",
  description:
    "تعرّف على واصل: منصة للإبلاغ عن المفقودات والموجودات في عتق ومحافظة شبوة، مع مطابقة آمنة وتسليم عبر نقاط أمانة معتمدة.",
};

export default async function AboutPage() {
  const session = await getSession();
  const reportHref = session ? "/dashboard/report" : "/register";
  const foundHref = session ? "/dashboard/report?type=found" : "/register";

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="page-title">عن الخدمة</h1>

      <article className="portal-card" style={{ marginBottom: 16 }}>
        <h2>ما هو واصل؟</h2>
        <p style={{ color: "var(--portal-muted)", fontSize: 14, lineHeight: 1.8, marginTop: 8 }}>
          واصل منصة محلية لربط أصحاب المفقودات بمن عثر عليها في مدينة عتق ومحافظة شبوة.
          بلّغ عن غرض فقدته أو وجدته، ونساعد في المطابقة والتحقق ثم التسليم الآمن.
        </p>
      </article>

      <article className="portal-card" style={{ marginBottom: 16 }}>
        <h2>كيف تعمل الخدمة</h2>
        <ol className="portal-steps">
          <li>
            <span>
              <IconFileText size={28} />
            </span>
            <div>
              <b>بلّغ</b>
              <p>أنشئ بلاغاً بالوصف والصورة والموقع التقريبي — مفقود أو موجود.</p>
            </div>
          </li>
          <li>
            <span>
              <IconSearch size={28} />
            </span>
            <div>
              <b>طابِق</b>
              <p>يقارن النظام البلاغات حسب التصنيف والوصف والموقع، ثم يقترح التطابقات.</p>
            </div>
          </li>
          <li>
            <span>
              <IconHandshake size={28} />
            </span>
            <div>
              <b>أَعِد</b>
              <p>بعد التحقق من الملكية يتم التسليم في نقطة أمانة معتمدة.</p>
            </div>
          </li>
        </ol>
      </article>

      <div className="portal-split" style={{ marginBottom: 16 }}>
        <article className="portal-card">
          <span className="portal-stat-ico is-blue">
            <IconLock size={22} />
          </span>
          <h2 style={{ marginTop: 12 }}>خصوصية التحقق</h2>
          <p style={{ color: "var(--portal-muted)", fontSize: 14, lineHeight: 1.7, marginTop: 6 }}>
            التفاصيل السرية لا تظهر للعامة. تُستخدم فقط للتأكد من أن المطالب هو صاحب الغرض.
          </p>
        </article>
        <article className="portal-card">
          <span className="portal-stat-ico is-green">
            <IconShield size={22} />
          </span>
          <h2 style={{ marginTop: 12 }}>نقاط الأمانة</h2>
          <p style={{ color: "var(--portal-muted)", fontSize: 14, lineHeight: 1.7, marginTop: 6 }}>
            التسليم يتم في نقاط معتمدة داخل المدينة، بعد إثبات الملكية، دون تبادل مباشر غير آمن.
          </p>
        </article>
      </div>

      <section className="portal-faq" id="faq" style={{ marginBottom: 16 }}>
        <h2>أسئلة شائعة</h2>
        <details>
          <summary>كيف أبلّغ عن مفقود؟</summary>
          <p>أنشئ حساباً ثم أضف بلاغاً بالوصف والصورة والموقع التقريبي.</p>
        </details>
        <details>
          <summary>ماذا أفعل إذا وجدت غرضاً؟</summary>
          <p>
            سجّل الموجود من{" "}
            <Link href={foundHref}>الإبلاغ عن موجود</Link>
            ، وسنتولى المطابقة مع البلاغات المفتوحة.
          </p>
        </details>
        <details>
          <summary>أين يتم التسليم؟</summary>
          <p>يتم التسليم في نقاط الأمانة المعتمدة داخل المدينة بعد التحقق من الملكية.</p>
        </details>
      </section>

      <article className="portal-cta">
        <div>
          <h2>هل فقدت شيئاً أو وجدت غرضاً؟</h2>
          <p>أضف بلاغاً الآن وسنساعدك في إعادته إلى صاحبه.</p>
          <Link href={reportHref} className="btn btn-white btn-sm">
            إنشاء بلاغ
          </Link>
        </div>
        <IconHandshake size={64} />
      </article>
    </div>
  );
}
