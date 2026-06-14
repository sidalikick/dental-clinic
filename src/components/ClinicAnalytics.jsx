import { useState, useEffect } from "react";

/**
 * ClinicAnalytics - مكوّن تحليل بيانات العيادة
 *
 * الاستخدام:
 *   <ClinicAnalytics apiBase="http://localhost:3000" />
 *
 * الـ API المطلوبة (اضبط المسارات حسب مشروعك):
 *   GET /api/appointments  → [{ status, payment_status, service, amount, booking_source }]
 *   GET /api/patients      → [{ registration_source }]
 *   GET /api/services      → [{ name, default_price }]
 *
 * أو مرّر البيانات مباشرة:
 *   <ClinicAnalytics data={{ appointments: [...], patients: [...], services: [...] }} />
 */
export default function ClinicAnalytics({ apiBase = "", data: externalData = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (externalData) {
        setData(externalData);
      } else {
        const [apptRes, patRes, svcRes] = await Promise.all([
          fetch(`${apiBase}/api/appointments`),
          fetch(`${apiBase}/api/patients`),
          fetch(`${apiBase}/api/services`),
        ]);
        const appointments = await apptRes.json();
        const patients = await patRes.json();
        const services = await svcRes.json();
        setData({ appointments, patients, services });
      }
      setAnalyzed(true);
    } catch (e) {
      setError("فشل في جلب البيانات: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = data ? computeStats(data) : null;

  return (
    <div style={styles.wrapper} dir="rtl">
      {!analyzed && (
        <div style={styles.startScreen}>
          <div style={styles.startIcon}>🦷</div>
          <h2 style={styles.startTitle}>تحليل بيانات العيادة</h2>
          <p style={styles.startSub}>اضغط على الزر لتحليل جميع بيانات المواعيد والمرضى والإيرادات</p>
          <button style={styles.analyzeBtn} onClick={fetchData} disabled={loading}>
            {loading ? "جاري التحليل..." : "تحليل الآن"}
          </button>
          {error && <p style={styles.error}>{error}</p>}
        </div>
      )}

      {analyzed && stats && (
        <>
          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>لوحة تحليل العيادة</h2>
              <p style={styles.subtitle}>بيانات شاملة لجميع المواعيد والمرضى</p>
            </div>
            <button style={styles.refreshBtn} onClick={fetchData}>
              ↻ تحديث
            </button>
          </div>

          {/* بطاقات الأرقام الرئيسية */}
          <div style={styles.metricsGrid}>
            <MetricCard label="إجمالي المواعيد" value={stats.totalAppointments} sub="موعد" color="#1D9E75" />
            <MetricCard label="إجمالي المرضى" value={stats.totalPatients} sub="مريض" color="#378ADD" />
            <MetricCard label="إجمالي الإيراد" value={`${stats.totalRevenue.toLocaleString()} دج`} color="#534AB7" />
            <MetricCard label="نسبة الإنجاز" value={`${stats.completionRate}%`} sub="من المواعيد" color="#BA7517" />
          </div>

          <div style={styles.row}>
            {/* حالات المواعيد */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>حالات المواعيد</h3>
              {Object.entries(stats.statusCounts).map(([status, count]) => (
                <BarRow
                  key={status}
                  label={status}
                  count={count}
                  total={stats.totalAppointments}
                  color={statusColor(status)}
                />
              ))}
            </div>

            {/* حالة الدفع */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>حالة الدفع</h3>
              <DonutChart
                segments={[
                  { label: "مدفوع", value: stats.paidCount, color: "#1D9E75" },
                  { label: "غير مدفوع", value: stats.unpaidCount, color: "#E24B4A" },
                ]}
                total={stats.totalAppointments}
              />
              <div style={styles.legendRow}>
                <LegendItem color="#1D9E75" label={`مدفوع (${stats.paidCount})`} />
                <LegendItem color="#E24B4A" label={`غير مدفوع (${stats.unpaidCount})`} />
              </div>
            </div>
          </div>

          <div style={styles.row}>
            {/* الخدمات الأكثر طلباً */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>الخدمات الأكثر طلباً</h3>
              {stats.serviceCounts.map(([service, count], i) => (
                <BarRow
                  key={service || i}
                  label={service || "غير محدد"}
                  count={count}
                  total={stats.totalAppointments}
                  color={COLORS[i % COLORS.length]}
                />
              ))}
            </div>

            {/* الإيراد حسب الخدمة */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>الإيراد حسب الخدمة (دج)</h3>
              {stats.revenueByService.map(([service, rev], i) => (
                <BarRow
                  key={service || i}
                  label={service || "غير محدد"}
                  count={rev}
                  total={stats.maxServiceRevenue}
                  color={COLORS[i % COLORS.length]}
                  isRevenue
                />
              ))}
            </div>
          </div>

          <div style={styles.row}>
            {/* مصادر الحجز */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>مصادر الحجز</h3>
              <DonutChart
                segments={stats.bookingSources.map(([src, cnt], i) => ({
                  label: src,
                  value: cnt,
                  color: COLORS[i % COLORS.length],
                }))}
                total={stats.totalAppointments}
              />
              <div style={styles.legendRow}>
                {stats.bookingSources.map(([src, cnt], i) => (
                  <LegendItem key={src} color={COLORS[i % COLORS.length]} label={`${src} (${cnt})`} />
                ))}
              </div>
            </div>

            {/* ملخص مالي */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>الملخص المالي</h3>
              <div style={styles.financialRow}>
                <span style={styles.finLabel}>إجمالي الإيراد</span>
                <span style={{ ...styles.finValue, color: "#1D9E75" }}>{stats.totalRevenue.toLocaleString()} دج</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.financialRow}>
                <span style={styles.finLabel}>المبالغ المحصّلة</span>
                <span style={{ ...styles.finValue, color: "#1D9E75" }}>{stats.paidRevenue.toLocaleString()} دج</span>
              </div>
              <div style={styles.financialRow}>
                <span style={styles.finLabel}>المبالغ المعلّقة</span>
                <span style={{ ...styles.finValue, color: "#E24B4A" }}>{stats.unpaidRevenue.toLocaleString()} دج</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.financialRow}>
                <span style={styles.finLabel}>معدل التحصيل</span>
                <span style={{ ...styles.finValue, color: "#534AB7" }}>{stats.collectionRate}%</span>
              </div>
              <div style={styles.financialRow}>
                <span style={styles.finLabel}>متوسط قيمة الزيارة</span>
                <span style={styles.finValue}>{stats.avgVisitValue.toLocaleString()} دج</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── منطق الحساب ───────────────────────────────────────────────────────────

function computeStats({ appointments = [], patients = [], services = [] }) {
  const total = appointments.length;

  // حالات المواعيد
  const statusCounts = {};
  appointments.forEach((a) => {
    const s = a.status || a.حالة_الموعد || a["حالة الموعد"] || "غير محدد";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // الدفع
  const paid = appointments.filter(
    (a) => (a.paymentStatus || a.payment_status || a.حالة_الدفع || a["حالة الدفع"] || "") === "مدفوع"
  );
  const unpaid = appointments.filter(
    (a) => (a.paymentStatus || a.payment_status || a.حالة_الدفع || a["حالة الدفع"] || "") !== "مدفوع"
  );

  const getAmount = (a) =>
    parseFloat(
      String(a.treatmentPrice || a.amount || a.المبلغ_المالي || a["المبلغ المالي"] || 0)
        .replace(/[^\d.]/g, "")
    ) || 0;

  const totalRevenue = appointments.reduce((s, a) => s + getAmount(a), 0);
  const paidRevenue = paid.reduce((s, a) => s + getAmount(a), 0);
  const unpaidRevenue = unpaid.reduce((s, a) => s + getAmount(a), 0);

  // الخدمات
  const svcMap = {};
  const revMap = {};
  appointments.forEach((a) => {
    const svc = a.service || a.الخدمة || a["الخدمة / العلاج"] || "غير محدد";
    svcMap[svc] = (svcMap[svc] || 0) + 1;
    revMap[svc] = (revMap[svc] || 0) + getAmount(a);
  });
  const serviceCounts = Object.entries(svcMap).sort((a, b) => b[1] - a[1]);
  const revenueByService = Object.entries(revMap).sort((a, b) => b[1] - a[1]);
  const maxServiceRevenue = Math.max(...Object.values(revMap), 1);

  // مصادر الحجز
  const srcMap = {};
  appointments.forEach((a) => {
    const srcRaw = a.bookingSource || a.booking_source || a.مصدر_الحجز || a["مصدر الحجز"] || "غير محدد";
    const src = srcRaw === 'online' ? 'الموقع الإلكتروني' : srcRaw === 'reception' ? 'الاستقبال' : srcRaw;
    srcMap[src] = (srcMap[src] || 0) + 1;
  });
  const bookingSources = Object.entries(srcMap).sort((a, b) => b[1] - a[1]);

  const completed = statusCounts["منجز"] || 0;

  return {
    totalAppointments: total,
    totalPatients: patients.length || total,
    totalRevenue: Math.round(totalRevenue),
    paidRevenue: Math.round(paidRevenue),
    unpaidRevenue: Math.round(unpaidRevenue),
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    statusCounts,
    serviceCounts,
    revenueByService,
    maxServiceRevenue,
    bookingSources,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    collectionRate: totalRevenue ? Math.round((paidRevenue / totalRevenue) * 100) : 0,
    avgVisitValue: total ? Math.round(totalRevenue / total) : 0,
  };
}

// ─── مكوّنات مساعدة ────────────────────────────────────────────────────────

const COLORS = ["#1D9E75", "#378ADD", "#534AB7", "#BA7517", "#E24B4A", "#5DCAA5", "#D4537E"];

function statusColor(s) {
  if (s === "منجز") return "#1D9E75";
  if (s === "مؤكد") return "#378ADD";
  if (s === "ملغى") return "#E24B4A";
  if (s === "جاري الكشف") return "#BA7517";
  return "#888";
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={styles.metricCard}>
      <div style={{ ...styles.metricAccent, background: color }} />
      <p style={styles.metricLabel}>{label}</p>
      <p style={{ ...styles.metricValue, color }}>{value}</p>
      {sub && <p style={styles.metricSub}>{sub}</p>}
    </div>
  );
}

function BarRow({ label, count, total, color, isRevenue }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const display = isRevenue ? `${Number(count).toLocaleString()} دج` : count;
  return (
    <div style={styles.barRow}>
      <span style={styles.barLabel}>{label}</span>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${pct}%`, background: color }} />
      </div>
      <span style={{ ...styles.barCount, color }}>{display}</span>
    </div>
  );
}

function DonutChart({ segments, total }) {
  const size = 120;
  const r = 45;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const frac = total > 0 ? seg.value / total : 0;
    const dash = frac * circumference;
    const arc = { ...seg, dash, gap: circumference - dash, offset: circumference - offset };
    offset += dash;
    return arc;
  });
  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto 8px" }}>
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={18}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={arc.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill="#333">{total}</text>
    </svg>
  );
}

function LegendItem({ color, label }) {
  return (
    <span style={styles.legendItem}>
      <span style={{ ...styles.legendDot, background: color }} />
      {label}
    </span>
  );
}

// ─── الأنماط ────────────────────────────────────────────────────────────────

const styles = {
  wrapper: { fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: "1.5rem", maxWidth: 900, margin: "0 auto", direction: "rtl" },
  startScreen: { textAlign: "center", padding: "4rem 2rem" },
  startIcon: { fontSize: 56, marginBottom: 16 },
  startTitle: { fontSize: 24, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  startSub: { fontSize: 15, color: "#666", margin: "0 0 2rem" },
  analyzeBtn: { background: "#1D9E75", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 16, fontWeight: 600, cursor: "pointer" },
  refreshBtn: { background: "transparent", border: "1px solid #ddd", borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer", color: "#555" },
  error: { color: "#E24B4A", marginTop: 12 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1a2e" },
  subtitle: { fontSize: 13, color: "#888", margin: "4px 0 0" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 },
  metricCard: { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1rem", position: "relative", overflow: "hidden" },
  metricAccent: { position: "absolute", top: 0, right: 0, width: 4, height: "100%", borderRadius: "0 12px 12px 0" },
  metricLabel: { fontSize: 12, color: "#888", margin: "0 0 6px" },
  metricValue: { fontSize: 22, fontWeight: 700, margin: 0 },
  metricSub: { fontSize: 11, color: "#aaa", margin: "2px 0 0" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#222", margin: "0 0 1rem" },
  barRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 },
  barLabel: { width: 100, color: "#555", textAlign: "right", flexShrink: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barTrack: { flex: 1, background: "#f0f0f0", borderRadius: 6, height: 20, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6, minWidth: 4, transition: "width 0.6s ease" },
  barCount: { fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: "left" },
  legendRow: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555" },
  legendDot: { width: 10, height: 10, borderRadius: 2, flexShrink: 0 },
  financialRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" },
  finLabel: { fontSize: 14, color: "#555" },
  finValue: { fontSize: 15, fontWeight: 600, color: "#222" },
  divider: { height: 1, background: "#f0f0f0", margin: "4px 0" },
};
