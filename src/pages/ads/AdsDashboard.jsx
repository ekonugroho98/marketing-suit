import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAds } from "../../hooks/useAds";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Card, { KPICard } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import ProgressBar from "../../components/ui/ProgressBar";
import { formatRupiah, formatNumber } from "../../utils/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PLATFORM_LABELS = {
  meta: "Meta",
  tiktok: "TikTok",
  google: "Google",
};

const PLATFORM_COLORS = {
  meta: "blue",
  tiktok: "pink",
  google: "red",
};

const OBJECTIVE_LABELS = {
  awareness: "Awareness",
  traffic: "Traffic",
  conversion: "Conversion",
  retargeting: "Retargeting",
};

const STATUS_COLORS = {
  active: "green",
  paused: "yellow",
  draft: "gray",
  completed: "blue",
};

const STATUS_LABELS = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
  completed: "Completed",
};

function BudgetAlertBanner({ alert, onDismiss }) {
  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="font-semibold text-amber-900">{alert.message}</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Created {new Date(alert.created_at).toLocaleDateString("id-ID")}
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-600 hover:text-amber-900 font-semibold text-sm"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function AdsDashboard() {
  const navigate = useNavigate();
  const {
    campaigns,
    overview,
    alerts,
    loading,
    fetchCampaigns,
    fetchOverview,
    readAlert,
    fetchInsights,
  } = useAds();
  const [insightsData, setInsightsData] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Fetch insights data for the spend trend chart
  useEffect(() => {
    const loadInsights = async () => {
      if (campaigns.length > 0) {
        try {
          // Get insights from first campaign as demo
          const insights = await fetchInsights(campaigns[0].id, 7);
          if (insights) {
            setInsightsData(insights.reverse());
          }
        } catch (err) {
          console.error("Error loading insights:", err);
        }
      }
    };
    loadInsights();
  }, [campaigns, fetchInsights]);

  const unreadAlerts = useMemo(() => {
    return alerts.filter((a) => !a.read && !dismissedAlerts.has(a.id));
  }, [alerts, dismissedAlerts]);

  const handleDismissAlert = async (alertId) => {
    try {
      await readAlert(alertId);
      setDismissedAlerts((prev) => new Set([...prev, alertId]));
    } catch (err) {
      console.error("Error dismissing alert:", err);
    }
  };

  const handleCampaignDetails = (campaignId) => {
    navigate(`/ads/${campaignId}`);
  };

  const handlePauseResume = async (campaign) => {
    // Implementation deferred to campaign update
    console.log(
      "Pause/Resume campaign:",
      campaign.id,
      "Current status:",
      campaign.status,
    );
  };

  // Prepare KPI data
  const kpiData = useMemo(() => {
    if (!overview) {
      return {
        totalSpend: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
      };
    }

    const totalSpend = overview.total_spend || 0;
    const totalClicks = overview.total_clicks || 0;
    const totalImpressions = overview.total_impressions || 0;
    const totalConversions = overview.total_conversions || 0;

    const ctr =
      totalImpressions > 0
        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
        : "0";
    const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(0) : 0;
    const roas =
      totalSpend > 0
        ? ((overview.total_conversions * 100000) / totalSpend).toFixed(2)
        : 0;

    return {
      totalSpend,
      ctr,
      cpc,
      roas,
    };
  }, [overview]);

  const activeCampaigns = useMemo(() => {
    return campaigns.filter((c) => c.status === "active");
  }, [campaigns]);

  const totalBudget = useMemo(() => {
    return campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  }, [campaigns]);

  const totalSpent = useMemo(() => {
    return campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  }, [campaigns]);

  return (
    <div>
      <TopBar
        title="Ads Manager"
        subtitle="Kelola kampanye iklan di semua platform"
        actions={
          <Button variant="primary" onClick={() => navigate("/ads/new")}>
            + New Campaign
          </Button>
        }
      />

      {/* Budget Alerts */}
      {unreadAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {unreadAlerts.map((alert) => (
            <BudgetAlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => handleDismissAlert(alert.id)}
            />
          ))}
        </div>
      )}

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Total Spend"
            value={formatRupiah(kpiData.totalSpend)}
            subtitle="Last 7 days"
            icon="💰"
            color="primary"
          />
          <KPICard
            title="CTR"
            value={`${kpiData.ctr}%`}
            subtitle="Last 7 days"
            icon="📊"
            color="accent"
          />
          <KPICard
            title="CPC"
            value={formatRupiah(kpiData.cpc)}
            subtitle="Last 7 days"
            icon="💵"
            color="purple"
          />
          <KPICard
            title="ROAS"
            value={`${kpiData.roas}x`}
            subtitle="Last 7 days"
            icon="📈"
            color="warning"
          />
        </div>
      )}

      {/* Spend Trend Chart */}
      {insightsData.length > 0 && (
        <Card className="mb-6">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Spend Trend (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={insightsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  label={{
                    value: "Amount (Rp)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tickFormatter={(value) => `Rp ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "spend") {
                      return [formatRupiah(value), "Daily Spend"];
                    }
                    return [formatRupiah(value), "Revenue"];
                  }}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("id-ID")
                  }
                />
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#10b981"
                  dot={false}
                  name="spend"
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#3b82f6"
                  dot={false}
                  name="conversions"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            title="No campaigns yet"
            description="Create your first ad campaign to start reaching your audience"
            actionLabel="Create Campaign"
            onAction={() => navigate("/ads/new")}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const creativeCount = campaign.ad_creatives?.length || 0;
            const daysRunning = campaign.start_date
              ? Math.ceil(
                  (Date.now() - new Date(campaign.start_date).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 1;
            const dailyBudget = campaign.budget ? campaign.budget / 30 : 0;
            const budgetProgressPercent =
              dailyBudget > 0
                ? ((campaign.spend || 0) / (dailyBudget * daysRunning)) * 100
                : 0;

            // Calculate campaign metrics from creatives
            const totalImpressions = (campaign.ad_creatives || []).reduce(
              (sum, c) => sum + (c.impressions || 0),
              0,
            );
            const totalClicks = (campaign.ad_creatives || []).reduce(
              (sum, c) => sum + (c.clicks || 0),
              0,
            );
            const ctr =
              totalImpressions > 0
                ? ((totalClicks / totalImpressions) * 100).toFixed(2)
                : "0";
            const roas =
              campaign.spend > 0
                ? (
                    ((campaign.ad_creatives || []).reduce(
                      (sum, c) => sum + (c.conversions || 0),
                      0,
                    ) *
                      100000) /
                    campaign.spend
                  ).toFixed(2)
                : "0";

            const showRoasWarning = parseFloat(roas) < 1.0;

            const platforms = campaign.platforms || [];

            return (
              <Card key={campaign.id} className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {campaign.name}
                      </h3>
                      {platforms.map((platform) => (
                        <Badge
                          key={platform}
                          color={PLATFORM_COLORS[platform] || "gray"}
                        >
                          {PLATFORM_LABELS[platform] || platform}
                        </Badge>
                      ))}
                      <Badge color="blue">
                        {OBJECTIVE_LABELS[campaign.objective] ||
                          campaign.objective}
                      </Badge>
                      <Badge color={STATUS_COLORS[campaign.status]}>
                        {STATUS_LABELS[campaign.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {creativeCount} creative{creativeCount !== 1 ? "s" : ""} •{" "}
                      {daysRunning} day{daysRunning !== 1 ? "s" : ""} running
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCampaignDetails(campaign.id)}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePauseResume(campaign)}
                    >
                      {campaign.status === "active" ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="secondary">
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Spent</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatRupiah(campaign.spend)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reach</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNumber(totalImpressions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Clicks</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNumber(totalClicks)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">CTR</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {ctr}%
                    </p>
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">
                      Budget Used
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRupiah(campaign.spend)} /{" "}
                      {formatRupiah(campaign.budget)}
                    </p>
                  </div>
                  <ProgressBar value={campaign.spend} total={campaign.budget} />
                </div>

                {/* ROAS Warning & CTA */}
                <div className="flex items-center justify-between">
                  {showRoasWarning && (
                    <div className="text-xs font-medium text-red-600 flex items-center gap-1">
                      ⚠️ Low ROAS: {roas}x
                    </div>
                  )}
                  {!showRoasWarning && (
                    <div className="text-xs font-medium text-emerald-600">
                      ROAS: {roas}x
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
