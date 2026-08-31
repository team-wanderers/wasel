"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformSettings } from "@/types/settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/types/settings";
import {
  IconSettings,
  IconTarget,
  IconPhone,
  IconShield,
  IconSliders,
  IconCheck,
  IconRefresh,
  IconAlertTriangle,
} from "@/components/icons";

interface Props {
  initialSettings: PlatformSettings;
}

export default function SettingsManager({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<"matching" | "support" | "recovery" | "features">("matching");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "فشل حفظ التعديلات" });
        return;
      }

      setMessage({ type: "success", text: "تم حفظ وتطبيق إعدادات المنصة بنجاح!" });
      if (data.settings) {
        setSettings(data.settings);
      }
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "حدث خطأ أثناء الاتصال بالخادم" });
    } finally {
      setLoading(false);
    }
  }

  function handleResetToDefaults() {
    if (confirm("هل أنت متأكد من استعادة كافة الإعدادات الافتراضية للمنصة؟")) {
      setSettings(DEFAULT_PLATFORM_SETTINGS);
      setMessage({ type: "success", text: "تمت استعادة القيم الافتراضية محلياً. اضغط على «حفظ التغييرات» لتطبيقها." });
    }
  }

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "var(--space-6)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              background: "hsl(215,90%,94%)",
              color: "hsl(215,90%,35%)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              marginBottom: "var(--space-3)",
            }}
          >
            <IconSettings size={14} /> ضبط وتخصيص النظام
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>
            إعدادات المنصة العامة
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-1)" }}>
            التحكم في خوارزميات التطابق، سياسات الأمان والاسترجاع، بيانات الدعم، ومفاتيح الميزات
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetToDefaults}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <IconRefresh size={14} /> استعادة الافتراضيات
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", minWidth: "140px", justifyContent: "center" }}
          >
            {loading ? "جارٍ الحفظ..." : (
              <>
                <IconCheck size={16} /> حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}
          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
        >
          {message.type === "success" ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          borderBottom: "1px solid var(--color-border)",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("matching")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "matching" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "matching" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "matching" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          <IconTarget size={16} />
          <span>خوارزمية المطابقة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("support")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "support" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "support" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "support" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          <IconPhone size={16} />
          <span>الدعم والتواصل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recovery")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "recovery" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "recovery" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "recovery" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          <IconShield size={16} />
          <span>الأمان والاسترجاع</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("features")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "features" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "features" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "features" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          <IconSliders size={16} />
          <span>مفاتيح الميزات</span>
        </button>
      </div>

      {/* Tab 1: Matching Engine Settings */}
      {activeTab === "matching" && (
        <div className="card" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconTarget size={18} /> معايير وأوزان محرك المطابقة الذكي
            </h2>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              التحكم في حساسية المطابقة بين بلاغات المفقودات والمعثورات والأوزان المخصصة لكل عنصر
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
            <div className="field">
              <label className="label" htmlFor="match-threshold">
                عتبة المطابقة المؤكدة والتنبيه (Threshold)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <input
                  id="match-threshold"
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  className="w-full"
                  value={settings.matching.matchThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matching: { ...settings.matching, matchThreshold: parseFloat(e.target.value) },
                    })
                  }
                />
                <span style={{ fontWeight: 700, minWidth: "45px", textAlign: "left" }}>
                  {Math.round(settings.matching.matchThreshold * 100)}%
                </span>
              </div>
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                المطابقات التي تتجاوز هذه النسبة تُسجّل كاقتراح نشط وتُرسل إشعاراً فورياً للطرفين.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="potential-floor">
                الحد الأدنى لتسجيل المطابقة (Potential Floor)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <input
                  id="potential-floor"
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.05"
                  className="w-full"
                  value={settings.matching.potentialFloor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matching: { ...settings.matching, potentialFloor: parseFloat(e.target.value) },
                    })
                  }
                />
                <span style={{ fontWeight: 700, minWidth: "45px", textAlign: "left" }}>
                  {Math.round(settings.matching.potentialFloor * 100)}%
                </span>
              </div>
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                أدنى درجة يتم عندها حفظ المطابقة في السجلات دون إزعاج المستخدمين بإشعارات.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="max-radius">
                نصف القطر الأقصى للتطابق الجغرافي (كم)
              </label>
              <input
                id="max-radius"
                type="number"
                min="1"
                max="500"
                className="input"
                value={settings.matching.maxRadiusKm}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    matching: { ...settings.matching, maxRadiusKm: parseInt(e.target.value, 10) || 50 },
                  })
                }
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, marginBottom: "var(--space-3)" }}>
              توزيع أوزان المقارنة (Weights)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
              <div className="field">
                <label className="label" htmlFor="title-weight">وزن تطابق العنوان</label>
                <input
                  id="title-weight"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className="input"
                  value={settings.matching.titleWeight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matching: { ...settings.matching, titleWeight: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="category-weight">وزن تطابق التصنيف</label>
                <input
                  id="category-weight"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className="input"
                  value={settings.matching.categoryWeight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matching: { ...settings.matching, categoryWeight: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="geo-weight">وزن الموقع الجغرافي</label>
                <input
                  id="geo-weight"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className="input"
                  value={settings.matching.geoWeight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matching: { ...settings.matching, geoWeight: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="desc-weight">وزن تفاصيل الوصف</label>
                <input
                  id="desc-weight"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className="input"
                  value={settings.matching.descWeight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matching: { ...settings.matching, descWeight: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.matching.autoScanOnCreate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    matching: { ...settings.matching, autoScanOnCreate: e.target.checked },
                  })
                }
              />
              <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
                تشغيل فحص المطابقة التلقائي فور إنشاء أي بلاغ جديد
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 2: Support & Info */}
      {activeTab === "support" && (
        <div className="card" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconPhone size={18} /> بيانات التواصل والدعم الفني
            </h2>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              تظهر هذه البيانات للمستخدمين في صفحات المساعدة والتذييل ونقاط الأمانة
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
            <div className="field">
              <label className="label" htmlFor="site-name">اسم المنصة الرسمي</label>
              <input
                id="site-name"
                type="text"
                className="input"
                value={settings.support.siteName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    support: { ...settings.support, siteName: e.target.value },
                  })
                }
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="support-email">البريد الإلكتروني للدعم</label>
              <input
                id="support-email"
                type="email"
                className="input"
                value={settings.support.supportEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    support: { ...settings.support, supportEmail: e.target.value },
                  })
                }
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="support-phone">رقم هاتف / واتساب الدعم</label>
              <input
                id="support-phone"
                type="text"
                className="input"
                value={settings.support.supportPhone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    support: { ...settings.support, supportPhone: e.target.value },
                  })
                }
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="operating-city">المدينة والمنطقة التشغيلية</label>
              <input
                id="operating-city"
                type="text"
                className="input"
                value={settings.support.operatingCity}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    support: { ...settings.support, operatingCity: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="working-hours">مواعيد وساعات العمل الرسمية</label>
            <input
              id="working-hours"
              type="text"
              className="input"
              value={settings.support.workingHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  support: { ...settings.support, workingHours: e.target.value },
                })
              }
            />
          </div>
        </div>
      )}

      {/* Tab 3: Security & Recovery Policies */}
      {activeTab === "recovery" && (
        <div className="card" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconShield size={18} /> سياسات الأمان وإثبات الملكية والتسليم
            </h2>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              الضوابط الأمنية لرموز التحقق OTP ومهل استلام الأمانات ومحاولات المطالبة
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
            <div className="field">
              <label className="label" htmlFor="otp-expiry">
                صلاحية رمز الاستلام OTP (بالدقائق)
              </label>
              <input
                id="otp-expiry"
                type="number"
                min="5"
                max="1440"
                className="input"
                value={settings.recovery.otpExpiryMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    recovery: { ...settings.recovery, otpExpiryMinutes: parseInt(e.target.value, 10) || 30 },
                  })
                }
              />
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                المدة الزمنية لصلاحية الرمز السري المولد لتأكيد تسليم الغرض.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="max-claim-attempts">
                الحد الأقصى لمحاولات المطالبة لكل غرض
              </label>
              <input
                id="max-claim-attempts"
                type="number"
                min="1"
                max="20"
                className="input"
                value={settings.recovery.maxClaimAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    recovery: { ...settings.recovery, maxClaimAttempts: parseInt(e.target.value, 10) || 3 },
                  })
                }
              />
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                حظر تقديم مطالبات إضافية للمستخدم بعد تجاوز هذا العدد من المحاولات المرفوضة.
              </p>
            </div>

            <div className="field">
              <label className="label" htmlFor="pickup-window">
                نافذة استلام الأمانة (أيام)
              </label>
              <input
                id="pickup-window"
                type="number"
                min="1"
                max="60"
                className="input"
                value={settings.recovery.pickupWindowDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    recovery: { ...settings.recovery, pickupWindowDays: parseInt(e.target.value, 10) || 7 },
                  })
                }
              />
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                المدة القصوى للاحتفاظ بالغرض في نقطة الأمانة قبل اتخاذ إجراء إداري.
              </p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.recovery.requireProofDetails}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    recovery: { ...settings.recovery, requireProofDetails: e.target.checked },
                  })
                }
              />
              <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
                إلزام المستخدم بكتابة تفاصيل سرية دقيقة (10 أحرف كحد أدنى) عند تقديم إثبات الملكية
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: Feature Toggles */}
      {activeTab === "features" && (
        <div className="card" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconSliders size={18} /> مفاتيح الميزات والتشغيل (Feature Toggles)
            </h2>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              تفعيل أو إيقاف الخدمات والميزات البرمجية على مستوى المنصة
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              <div>
                <strong style={{ fontSize: "var(--font-size-sm)", display: "block" }}>محرك المطابقة التلقائي في الخلفية</strong>
                <small style={{ color: "var(--color-text-muted)" }}>اكتشاف وتوليد المطابقات آلياً عند تسجيل البلاغات</small>
              </div>
              <input
                type="checkbox"
                checked={settings.features.enableAutoMatching}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, enableAutoMatching: e.target.checked },
                  })
                }
              />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              <div>
                <strong style={{ fontSize: "var(--font-size-sm)", display: "block" }}>إشعارات الرسائل النصية القصيرة (SMS)</strong>
                <small style={{ color: "var(--color-text-muted)" }}>إرسال رموز الاستلام والتنبيهات عبر SMS إلى جانب البريد الإلكتروني</small>
              </div>
              <input
                type="checkbox"
                checked={settings.features.enableSmsNotifications}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, enableSmsNotifications: e.target.checked },
                  })
                }
              />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              <div>
                <strong style={{ fontSize: "var(--font-size-sm)", display: "block" }}>تسجيل حسابات جديدة للعامة</strong>
                <small style={{ color: "var(--color-text-muted)" }}>إتاحة إنشاء حسابات للمستخدمين الجدد عبر رمز البريد OTP</small>
              </div>
              <input
                type="checkbox"
                checked={settings.features.enablePublicRegistration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, enablePublicRegistration: e.target.checked },
                  })
                }
              />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3)", background: settings.features.maintenanceMode ? "var(--color-danger-light)" : "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              <div>
                <strong style={{ fontSize: "var(--font-size-sm)", display: "block", color: settings.features.maintenanceMode ? "hsl(0,70%,40%)" : "inherit" }}>
                  وضع الصيانة والترقية (Maintenance Mode)
                </strong>
                <small style={{ color: "var(--color-text-muted)" }}>قصر استخدام المنصة على المشرفين فقط أثناء أعمال الصيانة</small>
              </div>
              <input
                type="checkbox"
                checked={settings.features.maintenanceMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, maintenanceMode: e.target.checked },
                  })
                }
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
