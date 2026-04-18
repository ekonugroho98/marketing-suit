/**
 * CRM Dashboard | Karaya Marketing Suite
 * Overview of leads, pipeline, and sequences
 * Sprint 11-12
 */
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCRM } from "../../hooks/useCRM";
import { LEAD_STATUSES, getStatusMeta } from "../../services/crm";
import { formatDate } from "../../utils/format";

export default function CRMDashboard() {
  const { leads, overview, sequences, loading, fetchLeads, fetchSequences } =
    useCRM();

  useEffect(() => {
    if (!overview) fetchLeads();
    if (!sequences.length) fetchSequences();
  }, []); // eslint-disable-line

  // Loading state
  const isLoading = loading.overview || loading.leads || loading.sequences;

  // Get score color badge
  const getScoreBadgeColor = (score) => {
    if (score >= 81)
      return { bg: "bg-red-100", text: "text-red-800", label: "🔥" };
    if (score >= 61)
      return { bg: "bg-orange-100", text: "text-orange-800", label: "Hot" };
    if (score >= 31)
      return { bg: "bg-yellow-100", text: "text-yellow-800", label: "Warm" };
    return { bg: "bg-blue-100", text: "text-blue-800", label: "Cold" };
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusMeta = getStatusMeta(status);
    const colorMap = {
      blue: "bg-blue-100 text-blue-800",
      yellow: "bg-yellow-100 text-yellow-800",
      purple: "bg-purple-100 text-purple-800",
      orange: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
    };
    return colorMap[statusMeta.color] || "bg-gray-100 text-gray-800";
  };

  // Get status label
  const getStatusLabel = (status) => {
    const statusMeta = getStatusMeta(status);
    return statusMeta.label;
  };

  // Count leads by status
  const countByStatus = (status) => {
    return leads.filter((l) => l.status === status).length;
  };

  // Calculate pipeline totals
  const pipelineOrder = [
    "new",
    "contacted",
    "qualified",
    "negotiating",
    "converted",
  ];
  const pipelineData = pipelineOrder.map((status) => ({
    status,
    count: countByStatus(status),
    label: getStatusLabel(status),
  }));
  const lostCount = countByStatus("lost");
  const totalPipeline = leads.length;

  // Extract top tags
  const getTopTags = () => {
    const tagCounts = {};
    leads.forEach((lead) => {
      lead.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  };

  // Calculate pipeline health
  const qualifiedAndConverted =
    countByStatus("qualified") +
    countByStatus("negotiating") +
    countByStatus("converted");
  const healthPercent =
    totalPipeline > 0
      ? Math.round((qualifiedAndConverted / totalPipeline) * 100)
      : 0;

  // Get active sequences count
  const activeSequencesCount = sequences.filter(
    (s) => s.status === "active",
  ).length;

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-gray-900">
            CRM & Lead Management
          </h1>
          <div className="flex gap-3">
            <Link
              to="/crm/leads/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              ➕ Tambah Lead
            </Link>
            <Link
              to="/crm/leads"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
            >
              👥 Semua Lead
            </Link>
          </div>
        </div>
        <p className="text-gray-600">
          Pantau lead pipeline, nurture, dan conversion metrics Anda
        </p>
      </div>

      {/* ─── KPI Cards Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Total Lead */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Total Lead
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {overview?.total_leads || 0}
              </p>
            </div>
            <div className="text-4xl">👤</div>
          </div>
        </div>

        {/* Konversi */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Konversi</p>
              <p className="text-3xl font-bold text-green-600">
                {overview?.converted || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {overview?.conversion_rate || 0}%
              </p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>

        {/* Lead Baru Hari Ini */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Lead Baru Hari Ini
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {overview?.leads_today || 0}
              </p>
            </div>
            <div className="text-4xl">🆕</div>
          </div>
        </div>

        {/* Avg Score */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">
                Avg Score
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {overview?.avg_score || 0}
              </p>
              <div className="mt-2">
                {overview?.avg_score >= 81 ? (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-semibold">
                    🔥 Hot
                  </span>
                ) : overview?.avg_score >= 61 ? (
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded font-semibold">
                    Hot
                  </span>
                ) : overview?.avg_score >= 31 ? (
                  <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-semibold">
                    Warm
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-semibold">
                    Cold
                  </span>
                )}
              </div>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* ─── Pipeline Funnel ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          Pipeline Funnel
        </h2>

        {/* Pipeline stages */}
        <div className="space-y-4 mb-6">
          {pipelineData.map(({ status, count, label }) => {
            const percent =
              totalPipeline > 0 ? (count / totalPipeline) * 100 : 0;
            const statusMeta = getStatusMeta(status);
            const colorMap = {
              blue: "bg-blue-500",
              yellow: "bg-yellow-500",
              purple: "bg-purple-500",
              orange: "bg-orange-500",
              green: "bg-green-500",
              red: "bg-red-500",
            };
            const barColor = colorMap[statusMeta.color] || "bg-gray-500";

            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-sm text-gray-600">{count} leads</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full ${barColor} flex items-center justify-center transition-all duration-300`}
                    style={{ width: `${Math.max(percent, 5)}%` }}
                  >
                    {percent > 10 && (
                      <span className="text-white text-xs font-semibold">
                        {Math.round(percent)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Lost separately */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">Hilang</span>
              <span className="text-sm text-gray-600">{lostCount} leads</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
              <div
                className="h-full bg-red-500 flex items-center justify-center"
                style={{
                  width:
                    totalPipeline > 0
                      ? `${Math.max((lostCount / totalPipeline) * 100, 5)}%`
                      : "0%",
                }}
              >
                {totalPipeline > 0 &&
                  (lostCount / totalPipeline) * 100 > 10 && (
                    <span className="text-white text-xs font-semibold">
                      {Math.round((lostCount / totalPipeline) * 100)}%
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-8">
        {/* Recent Leads Table (left 70%) */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Lead Terbaru</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Sumber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.slice(0, 5).map((lead) => {
                    const scoreColor = getScoreBadgeColor(lead.score);
                    const createdDate = formatDate(lead.created_at, {
                      year: "2-digit",
                    });

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() => {
                          window.location.href = `/crm/leads/${lead.id}`;
                        }}
                      >
                        <td className="px-6 py-4">
                          <Link
                            to={`/crm/leads/${lead.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {lead.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}
                          >
                            {getStatusLabel(lead.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${scoreColor.bg} ${scoreColor.text}`}
                          >
                            {scoreColor.label} {lead.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {lead.source === "form" && "📋 Form"}
                          {lead.source === "social" && "📱 Social"}
                          {lead.source === "ads" && "📢 Ads"}
                          {lead.source === "referral" && "🤝 Referral"}
                          {lead.source === "organic" && "🔍 Organic"}
                          {lead.source === "manual" && "✋ Manual"}
                          {lead.source === "import" && "📥 Import"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {createdDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link
                to="/crm/leads"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Lihat Semua Lead →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Sidebar (right 30%) */}
        <div className="space-y-6">
          {/* Top Tags */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Tags</h3>
            <div className="space-y-3">
              {getTopTags().length > 0 ? (
                getTopTags().map(({ tag, count }) => (
                  <div key={tag} className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      #{tag}
                    </span>
                    <span className="text-gray-600 text-sm font-semibold">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Belum ada tag</p>
              )}
            </div>
          </div>

          {/* Pipeline Health */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Pipeline Health
            </h3>
            <div className="mb-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {healthPercent}%
                </span>
                <span className="text-xs text-gray-500">qualified+</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    healthPercent >= 60
                      ? "bg-green-500"
                      : healthPercent >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              {qualifiedAndConverted} dari {totalPipeline} lead siap closing
            </p>
          </div>

          {/* Sequences Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Email Sequences
            </h3>
            <div className="mb-4">
              <p className="text-3xl font-bold text-blue-600">
                {activeSequencesCount}
              </p>
              <p className="text-xs text-gray-600 mt-1">Active sequences</p>
            </div>
            <Link
              to="/crm/sequences"
              className="inline-block px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
            >
              Kelola Sequences →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
