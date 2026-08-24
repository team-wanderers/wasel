"use client";

import { useState } from "react";
import LocationPicker from "@/components/LocationPicker";

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  workingHours: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  createdAt: string | Date;
}

interface Props {
  initialPoints: PickupPoint[];
}

export default function PickupPointsManager({ initialPoints }: Props) {
  const [points, setPoints] = useState<PickupPoint[]>(initialPoints);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PickupPoint | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [lat, setLat] = useState<number>(14.5372);
  const [lng, setLng] = useState<number>(46.8319);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function resetForm() {
    setName("");
    setAddress("");
    setPhone("");
    setWorkingHours("");
    setLat(14.5372);
    setLng(46.8319);
    setIsActive(true);
    setError("");
    setSuccess("");
    setShowAddForm(false);
    setEditingPoint(null);
  }

  function startEdit(point: PickupPoint) {
    setEditingPoint(point);
    setName(point.name);
    setAddress(point.address);
    setPhone(point.phone ?? "");
    setWorkingHours(point.workingHours ?? "");
    setLat(point.lat ?? 14.5372);
    setLng(point.lng ?? 46.8319);
    setIsActive(point.isActive);
    setError("");
    setSuccess("");
    setShowAddForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editingPoint) {
        const res = await fetch(`/api/admin/pickup-points/${editingPoint.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            address,
            phone: phone.trim() || null,
            workingHours: workingHours.trim() || null,
            lat,
            lng,
            isActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل تحديث نقطة الاستلام");

        setPoints((prev) => prev.map((p) => (p.id === editingPoint.id ? data : p)));
        setSuccess("تم تحديث نقطة الاستلام بنجاح");
      } else {
        const res = await fetch("/api/admin/pickup-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            address,
            phone: phone.trim() || null,
            workingHours: workingHours.trim() || null,
            lat,
            lng,
            isActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل إضافة نقطة الاستلام");

        setPoints((prev) => [data, ...prev]);
        setSuccess("تمت إضافة نقطة الاستلام بنجاح");
      }

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(point: PickupPoint) {
    try {
      const res = await fetch(`/api/admin/pickup-points/${point.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !point.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير الحالة");

      setPoints((prev) => prev.map((p) => (p.id === point.id ? data : p)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ");
    }
  }

  const activeCount = points.filter((p) => p.isActive).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 className="page-title">نقاط الاستلام والأمانة المعتمدة</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            إدارة المراكز ونقاط التسليم الآمنة في عتق ومحافظة شبوة
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
            }
          }}
          className="btn btn-primary"
        >
          {showAddForm ? "إلغاء النموذج" : "+ إضافة نقطة أمانة جديدة"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>إجمالي النقاط</div>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{points.length}</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>النقاط النشطة</div>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "hsl(142,60%,35%)" }}>{activeCount}</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>النقاط المعطلة</div>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "var(--color-text-muted)" }}>{points.length - activeCount}</div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-sm)" }}>
          {success}
        </div>
      )}

      {showAddForm && (
        <div className="card" style={{ marginBottom: "var(--space-6)", border: "1px solid var(--color-primary)" }}>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
            {editingPoint ? "تعديل نقطة الاستلام" : "إضافة نقطة استلام جديدة"}
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-sm)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div className="field">
                <label className="label" htmlFor="point-name">
                  اسم نقطة الأمانة / المركز *
                </label>
                <input
                  id="point-name"
                  type="text"
                  className="input"
                  placeholder="مثال: مركز واصل الرئيسي - شارع الشهداء"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="point-phone">
                  رقم التواصل / الهاتف
                </label>
                <input
                  id="point-phone"
                  type="text"
                  className="input"
                  placeholder="مثال: 770000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="point-address">
                العنوان بالتفصيل *
              </label>
              <input
                id="point-address"
                type="text"
                className="input"
                placeholder="مثال: عتق، بجانب مجمع العاصمة، الدور الأول"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="point-hours">
                ساعات العمل
              </label>
              <input
                id="point-hours"
                type="text"
                className="input"
                placeholder="مثال: السبت - الخميس: 8 صباحاً – 12 ظهراً | 4 عصراً – 8:30 مساءً"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">
                تحديد الموقع على الخريطة (عتق وما حولها)
              </label>
              <LocationPicker
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <input
                type="checkbox"
                id="point-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="point-active" style={{ fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
                نقطة استلام نشطة ومتاحة للاختيار
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={loading}>
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "جارٍ الحفظ..." : editingPoint ? "حفظ التعديلات" : "إضافة النقطة"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead>
            <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>الاسم والمركز</th>
              <th style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>العنوان</th>
              <th style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>رقم الهاتف</th>
              <th style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>ساعات العمل</th>
              <th style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>الحالة</th>
              <th style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "center" }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                  <td colSpan={6} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)" }}>
                  لا توجد نقاط استلام مسجلة حتى الآن. أضف نقطة جديدة للبدء.
                </td>
              </tr>
            ) : (
              points.map((point) => (
                <tr key={point.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
                    {point.name}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                    {point.address}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-sm)", direction: "ltr", textAlign: "right" }}>
                    {point.phone || "—"}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                    {point.workingHours || "—"}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <span
                      style={{
                        padding: "var(--space-1) var(--space-2)",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        background: point.isActive ? "var(--color-success-light)" : "var(--color-bg-secondary)",
                        color: point.isActive ? "hsl(142,60%,25%)" : "var(--color-text-muted)",
                        border: `1px solid ${point.isActive ? "hsl(142,60%,35%)33" : "var(--color-border)"}`,
                      }}
                    >
                      {point.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(point)}
                        className="btn btn-ghost btn-sm"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(point)}
                        className="btn btn-outline btn-sm"
                        style={{
                          color: point.isActive ? "hsl(0,65%,40%)" : "hsl(142,60%,35%)",
                          borderColor: point.isActive ? "hsl(0,65%,85%)" : "hsl(142,60%,85%)",
                        }}
                      >
                        {point.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
