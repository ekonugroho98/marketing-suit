import { useState } from "react";
import { useBilling } from "../../hooks/useBilling";
import {
  PLANS,
  PAYMENT_METHODS,
  formatPrice,
  calcUsagePercent,
  getUsageColor,
  calcYearlySavings,
  getPlanById,
} from "../../services/billing";
import { formatDate } from "../../utils/format";

const STATUS_STYLE = {
  paid: { cls: "bg-green-100 text-green-700", label: "Lunas", icon: "✓" },
  pending: {
    cls: "bg-yellow-100 text-yellow-700",
    label: "Pending",
    icon: "⏳",
  },
  failed: { cls: "bg-red-100 text-red-700", label: "Gagal", icon: "✕" },
  void: { cls: "bg-gray-100 text-gray-600", label: "Void", icon: "-" },
};

const PLAN_ORDER = ["free", "pro", "business", "enterprise"];

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("subscription");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [upgradeModal, setUpgradeModal] = useState(null); // planId or null
  const [paymentMethod, setPaymentMethod] = useState(
    PAYMENT_METHODS[0]?.value || "credit_card",
  );
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [expandedDanger, setExpandedDanger] = useState(false);
  const [expandedFeats, setExpandedFeats] = useState({});

  const {
    subscription,
    currentPlan,
    usage,
    invoices,
    loading,
    upgrade,
    cancel,
    reactivate,
  } = useBilling();

  // Safe helpers
  const sub = subscription || {};
  const plan = currentPlan || PLANS[0];
  const currentPlanIdx = PLAN_ORDER.indexOf(plan?.id || "free");

  const yearlySavings = calcYearlySavings(plan);

  async function handleUpgrade() {
    if (!upgradeModal) return;
    await upgrade(upgradeModal, billingCycle);
    setUpgradeModal(null);
  }

  async function handleCancel() {
    await cancel();
    setCancelConfirm(false);
    setExpandedDanger(false);
  }

  // Usage data (comes as { ai_credits: { used, limit }, ... })
  const usageMetrics = [
    { key: "ai_credits", label: "AI Credits", icon: "⚡", unit: "credits" },
    { key: "storage_mb", label: "Storage", icon: "💾", unit: "MB" },
    { key: "leads", label: "Leads di CRM", icon: "👥", unit: "leads" },
    {
      key: "content_items",
      label: "Konten Dibuat",
      icon: "📝",
      unit: "konten",
    },
  ];

  const isAnyNearLimit = usageMetrics.some((m) => {
    const d = usage?.[m.key];
    return d?.limit && calcUsagePercent(d.used, d.limit) > 80;
  });

  if (loading.subscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat informasi billing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Billing & Langganan
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola plan, penggunaan, dan riwayat invoice
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: "subscription", label: "🎟️ Langganan" },
          { id: "usage", label: "📊 Penggunaan" },
          { id: "invoices", label: "📄 Invoice" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? "bg-white text-gray-900 shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Langganan ─── */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {plan?.name}
                  </h2>
                  {plan?.badge && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ Aktif
                  </span>
                </div>
                {sub.cancel_at_period_end && (
                  <div className="mt-2 bg-amber-100 text-amber-700 text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                    ⚠️ Akan dinonaktifkan pada akhir periode
                    <button
                      onClick={() => reactivate()}
                      className="underline ml-1 font-medium"
                    >
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-indigo-600">
                  {formatPrice(
                    billingCycle === "monthly"
                      ? (plan?.price_monthly ?? 0)
                      : (plan?.price_yearly ?? 0),
                    billingCycle,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Periode Aktif</p>
                <p className="font-medium text-gray-800">
                  {sub.current_period_start
                    ? `${formatDate(sub.current_period_start, { year: undefined })} – ${formatDate(sub.current_period_end)}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Metode Bayar</p>
                <div className="flex items-center gap-1.5">
                  <span>
                    {PAYMENT_METHODS.find((m) => m.value === sub.payment_method)
                      ?.icon || "💳"}
                  </span>
                  <span className="font-medium text-gray-800 capitalize">
                    {sub.payment_method
                      ? sub.payment_method.replace(/_/g, " ")
                      : "Belum diset"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5">
            <div>
              <p className="font-semibold text-gray-900">Siklus Pembayaran</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Bayar tahunan dan hemat lebih banyak
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-500"
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  billingCycle === "yearly"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-500"
                }`}
              >
                Tahunan
                {yearlySavings > 0 && (
                  <span className="ml-1 text-xs text-green-600 font-bold">
                    Hemat{" "}
                    {Math.round(
                      (yearlySavings / ((plan?.price_monthly || 1) * 12)) * 100,
                    )}
                    %
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((p) => {
              const isCurrent = plan?.id === p.id;
              const pIdx = PLAN_ORDER.indexOf(p.id);
              const isHigher = pIdx > currentPlanIdx;
              const price =
                billingCycle === "monthly" ? p.price_monthly : p.price_yearly;
              const savings =
                billingCycle === "yearly" ? calcYearlySavings(p) : 0;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border-2 flex flex-col transition-all ${
                    isCurrent
                      ? "border-indigo-500 bg-indigo-50 shadow-lg"
                      : "border-gray-200 bg-white hover:shadow-md"
                  }`}
                >
                  <div className="p-5 flex-1 space-y-4">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {p.name}
                        </h3>
                        {p.badge && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              p.badge === "Paling Populer"
                                ? "bg-amber-100 text-amber-700"
                                : p.badge === "Best Value"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{p.description}</p>
                    </div>

                    {/* Price */}
                    <div>
                      {p.id === "enterprise" ? (
                        <p className="text-2xl font-bold text-purple-600">
                          Custom
                        </p>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-gray-900">
                            {price === 0
                              ? "Gratis"
                              : formatPrice(price, billingCycle)}
                          </p>
                          {savings > 0 && (
                            <p className="text-xs text-green-600 font-semibold mt-0.5">
                              Hemat Rp {(savings / 1000).toFixed(0)}rb/thn
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-1.5">
                      {(expandedFeats[p.id]
                        ? p.features
                        : p.features.slice(0, 5)
                      ).map((f, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-1.5 text-xs ${f.included ? "text-gray-700" : "text-gray-400"}`}
                        >
                          <span
                            className={`mt-0.5 flex-shrink-0 ${f.included ? "text-green-500" : "text-gray-300"}`}
                          >
                            {f.included ? "✓" : "✕"}
                          </span>
                          {f.label}
                        </li>
                      ))}
                    </ul>
                    {p.features.length > 5 && (
                      <button
                        onClick={() =>
                          setExpandedFeats((prev) => ({
                            ...prev,
                            [p.id]: !prev[p.id],
                          }))
                        }
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {expandedFeats[p.id]
                          ? "Sembunyikan"
                          : `+${p.features.length - 5} fitur lagi`}
                      </button>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="p-4 pt-0">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                      >
                        Plan Aktif
                      </button>
                    ) : p.id === "enterprise" ? (
                      <button className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                        Hubungi Sales
                      </button>
                    ) : isHigher ? (
                      <button
                        onClick={() => setUpgradeModal(p.id)}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        🚀 Upgrade
                      </button>
                    ) : (
                      <button className="w-full py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Downgrade
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border-2 border-red-200 bg-red-50">
            <button
              onClick={() => setExpandedDanger(!expandedDanger)}
              className="flex items-center justify-between w-full px-5 py-4"
            >
              <span className="font-semibold text-red-800">
                ⚠️ Zona Berbahaya
              </span>
              <span className="text-red-500 text-sm">
                {expandedDanger ? "▲ Sembunyikan" : "▼ Tampilkan"}
              </span>
            </button>
            {expandedDanger && (
              <div className="px-5 pb-5 border-t border-red-200 pt-4">
                <p className="text-sm text-red-700 mb-3">
                  Membatalkan langganan akan menghentikan akses ke semua fitur
                  Pro di akhir periode berjalan.
                </p>
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm"
                >
                  Batalkan Langganan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: Penggunaan ─── */}
      {activeTab === "usage" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {usageMetrics.map((m) => {
              const d = usage?.[m.key] || { used: 0, limit: 0 };
              const pct = calcUsagePercent(d.used, d.limit);
              const colorKey = getUsageColor(pct);
              const barColor = {
                green: "bg-green-500",
                yellow: "bg-yellow-500",
                red: "bg-red-500",
              }[colorKey];
              const pctColor = {
                green: "text-green-600",
                yellow: "text-yellow-600",
                red: "text-red-600",
              }[colorKey];
              return (
                <div
                  key={m.key}
                  className="bg-white rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {m.label}
                        </p>
                        <p className="text-xs text-gray-400">
                          {d.used?.toLocaleString("id-ID") || 0}
                          {d.limit
                            ? ` / ${d.limit.toLocaleString("id-ID")} ${m.unit}`
                            : " (tidak terbatas)"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${pctColor}`}>
                      {d.limit ? `${pct}%` : "∞"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${d.limit ? Math.min(pct, 100) : 0}%` }}
                    />
                  </div>
                  {pct > 90 && d.limit && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      ⚠️ Hampir mencapai batas
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {isAnyNearLimit && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 flex items-center gap-4">
              <span className="text-4xl">🚀</span>
              <div>
                <p className="font-bold text-gray-900">
                  Butuh lebih kapasitas?
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Upgrade plan untuk fitur unlimited dan storage lebih besar.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("subscription")}
                className="ml-auto px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 whitespace-nowrap"
              >
                Lihat Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Invoice ─── */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {invoices?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="text-left py-3 px-5 font-medium">
                    No. Invoice
                  </th>
                  <th className="text-left py-3 px-5 font-medium">Periode</th>
                  <th className="text-left py-3 px-5 font-medium">Plan</th>
                  <th className="text-right py-3 px-5 font-medium">Jumlah</th>
                  <th className="text-center py-3 px-5 font-medium">Status</th>
                  <th className="text-center py-3 px-5 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const st = STATUS_STYLE[inv.status] || STATUS_STYLE.void;
                  const planName =
                    getPlanById(inv.plan_id)?.name || inv.plan_id || "-";
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-5 font-semibold text-gray-800">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {inv.period_start
                          ? `${formatDate(inv.period_start, { year: undefined })} – ${formatDate(inv.period_end)}`
                          : "-"}
                      </td>
                      <td className="py-3 px-5 text-gray-600">{planName}</td>
                      <td className="py-3 px-5 text-right font-semibold">
                        {inv.amount === 0
                          ? "Rp 0"
                          : `Rp ${(inv.amount / 1000).toFixed(0)}rb`}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}
                        >
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button
                          disabled={inv.status !== "paid"}
                          title={
                            inv.status !== "paid"
                              ? "PDF tersedia setelah pembayaran aktif"
                              : "Unduh invoice"
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            inv.status === "paid"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          📄 Unduh
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <span className="text-5xl mb-3 block">📄</span>
              <p className="text-gray-500 font-medium">Belum ada invoice</p>
              <p className="text-gray-400 text-sm mt-1">
                Invoice akan muncul setelah pembayaran pertama
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Upgrade Modal ─── */}
      {upgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Upgrade ke {getPlanById(upgradeModal)?.name}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {formatPrice(
                billingCycle === "monthly"
                  ? getPlanById(upgradeModal)?.price_monthly || 0
                  : getPlanById(upgradeModal)?.price_yearly || 0,
                billingCycle,
              )}
            </p>

            <div className="space-y-2 mb-5">
              <p className="text-sm font-medium text-gray-700">
                Pilih Metode Pembayaran
              </p>
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === m.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={() => setPaymentMethod(m.value)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xl">{m.icon}</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {m.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeModal(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading.upgrading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading.upgrading ? "Memproses…" : "Konfirmasi & Bayar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancel Confirm Modal ─── */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-red-700 mb-2">
              ⚠️ Konfirmasi Pembatalan
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Langganan akan dihentikan di akhir periode berjalan. Semua fitur
              Pro tetap bisa diakses hingga saat itu.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Tidak, Batalkan
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"
              >
                Ya, Batalkan Langganan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
