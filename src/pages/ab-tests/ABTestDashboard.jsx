import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useABTest } from "../../hooks/useABTest";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import ProgressBar from "../../components/ui/ProgressBar";
import { formatDate, calculateCTR } from "../../utils/format";

const TEST_TYPE_LABELS = {
  content: "Konten",
  ad_copy: "Ad Copy",
  link_rotator: "Link Rotator",
  subject_line: "Subject Line",
};

const STATUS_COLORS = {
  draft: "gray",
  running: "green",
  paused: "yellow",
  completed: "blue",
};

const STATUS_LABELS = {
  draft: "Draft",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
};

export default function ABTestDashboard() {
  const navigate = useNavigate();
  const { tests, loading } = useABTest();
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredTests = useMemo(() => {
    if (filterStatus === "all") return tests;
    return tests.filter((t) => t.status === filterStatus);
  }, [tests, filterStatus]);

  const handleDetailClick = (testId) => {
    navigate(`/ab-tests/${testId}`);
  };

  const handlePauseResume = async (test) => {
    // Implementation will use useABTest pause/start functions
    console.log("Pause/Resume test:", test.id, "Current status:", test.status);
  };

  const handlePickWinner = (test) => {
    navigate(`/ab-tests/${test.id}?action=pick-winner`);
  };

  const filterButtons = [
    { label: "Semua", value: "all" },
    { label: "Running", value: "running" },
    { label: "Completed", value: "completed" },
    { label: "Draft", value: "draft" },
  ];

  return (
    <div>
      <TopBar
        title="A/B Tests"
        subtitle="Jalankan eksperimen untuk optimasi performa"
        actions={
          <Button variant="primary" onClick={() => navigate("/ab-tests/new")}>
            + New Test
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilterStatus(btn.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterStatus === btn.value
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat A/B tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <Card>
          <EmptyState
            title={
              filterStatus === "all"
                ? "Belum ada A/B test"
                : `Tidak ada test dengan status ${STATUS_LABELS[filterStatus]}`
            }
            description={
              filterStatus === "all"
                ? "Buat A/B test pertama Anda untuk mulai mengoptasi performa"
                : "Coba ubah filter atau buat test baru"
            }
            actionLabel={filterStatus === "all" ? "Buat Test Baru" : null}
            onAction={() => navigate("/ab-tests/new")}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTests.map((test) => {
            const variants = test.ab_test_variants || [];
            const totalImpressions = variants.reduce(
              (sum, v) => sum + (v.impressions || 0),
              0,
            );

            // Find variant with highest CTR
            const leaderVariant = variants.reduce((leader, v) => {
              const leaderCTR =
                leader.impressions > 0 ? leader.clicks / leader.impressions : 0;
              const vCTR = v.impressions > 0 ? v.clicks / v.impressions : 0;
              return vCTR > leaderCTR ? v : leader;
            }, variants[0]);

            return (
              <Card key={test.id} className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {test.name}
                      </h3>
                      <Badge color="blue">
                        {TEST_TYPE_LABELS[test.type] || test.type}
                      </Badge>
                      <Badge color={STATUS_COLORS[test.status]}>
                        {STATUS_LABELS[test.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(test.start_date)} —{" "}
                      {formatDate(
                        test.completed_date || new Date().toISOString(),
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDetailClick(test.id)}
                    >
                      Details
                    </Button>
                    {test.status === "running" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePickWinner(test)}
                      >
                        Pick Winner
                      </Button>
                    )}
                    {test.status === "running" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePauseResume(test)}
                      >
                        Pause
                      </Button>
                    )}
                    {test.status === "paused" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePauseResume(test)}
                      >
                        Resume
                      </Button>
                    )}
                  </div>
                </div>

                {/* Variants */}
                <div className="space-y-3">
                  {variants.map((variant, idx) => {
                    const ctr = calculateCTR(
                      variant.impressions,
                      variant.clicks,
                    );
                    const isLeader =
                      leaderVariant?.id === variant.id &&
                      test.status === "running";

                    return (
                      <div
                        key={variant.id}
                        className={`p-3 rounded-lg border ${
                          isLeader
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {variant.name}
                              {isLeader && (
                                <span className="ml-2 text-xs font-medium text-emerald-700">
                                  🏆 Leading
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {variant.impressions} impressions •{" "}
                              {variant.clicks} clicks • CTR: {ctr}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <ProgressBar
                          value={variant.clicks}
                          total={
                            variants.reduce(
                              (sum, v) => sum + (v.clicks || 0),
                              0,
                            ) || 1
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Stats Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-gray-500">Total Impressions</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {totalImpressions.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Clicks</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {variants
                        .reduce((sum, v) => sum + (v.clicks || 0), 0)
                        .toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg CTR</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {calculateCTR(
                        totalImpressions,
                        variants.reduce((sum, v) => sum + (v.clicks || 0), 0),
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
