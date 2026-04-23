import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useBrand } from "../../hooks/useBrand";
import { useDashboardData } from "../../hooks/useDashboardData";
import TopBar from "../../components/layout/TopBar";
import { KPICard } from "../../components/ui/Card";
import { StatusBadge, PillarBadge } from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/LoadingSpinner";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { activeBrand } = useBrand();
  const { data, isLoading } = useDashboardData(user, activeBrand);

  const stats = data?.stats ?? null;
  const recentContent = data?.recentContent ?? [];

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`Selamat datang, ${profile?.full_name || "User"}!`}
      />

      {/* Bento Grid KPI Section */}
      <div className="bento-grid mb-8">
        <div className="bento-item-sm">
          <KPICard
            title="Total Content"
            value={stats?.totalContent || 0}
            color="primary"
            icon="📊"
          />
        </div>
        <div className="bento-item-sm">
          <KPICard
            title="Published"
            value={stats?.published || 0}
            color="accent"
            icon="✅"
          />
        </div>
        <div className="bento-item-sm">
          <KPICard
            title="Link Clicks"
            value={(stats?.totalClicks || 0).toLocaleString("id-ID")}
            color="warning"
            icon="🔗"
          />
        </div>
        <div className="bento-item-sm">
          <KPICard
            title="AI Generations"
            value={stats?.aiUsage || "0/50"}
            color="purple"
            icon="✨"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Content - Takes 2 columns */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Konten Terbaru</h3>
            <Link
              to="/calendar"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Lihat semua →
            </Link>
          </div>
          {recentContent.length === 0 ? (
            <p className="text-text-tertiary text-sm py-8 text-center">
              Belum ada konten. Mulai buat di AI Generator!
            </p>
          ) : (
            <div className="space-y-3">
              {recentContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {item.platform} · {item.scheduled_date || "Tanpa jadwal"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.pillar && <PillarBadge pillar={item.pillar} />}
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 text-text-primary">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/generate/caption"
              className="block w-full text-left px-4 py-3 rounded-xl bg-primary-500/10 text-primary-400 text-sm font-medium hover:bg-primary-500/20 transition-all border border-primary-500/20 hover:border-primary-500/30"
            >
              ✨ Generate Caption
            </Link>
            <Link
              to="/generate/carousel"
              className="block w-full text-left px-4 py-3 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-medium hover:bg-purple-500/20 transition-all border border-purple-500/20 hover:border-purple-500/30"
            >
              📑 Buat Carousel Script
            </Link>
            <Link
              to="/links"
              className="block w-full text-left px-4 py-3 rounded-xl bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-all border border-warning/20 hover:border-warning/30"
            >
              🔗 Buat Smart Link
            </Link>
            <Link
              to="/generate/ad-copy"
              className="block w-full text-left px-4 py-3 rounded-xl bg-success/10 text-success text-sm font-medium hover:bg-success/20 transition-all border border-success/20 hover:border-success/30"
            >
              📢 Generate Ad Copy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
