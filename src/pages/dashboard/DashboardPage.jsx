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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Content"
          value={stats?.totalContent || 0}
          color="primary"
        />
        <KPICard
          title="Published"
          value={stats?.published || 0}
          color="accent"
        />
        <KPICard
          title="Link Clicks"
          value={(stats?.totalClicks || 0).toLocaleString("id-ID")}
          color="warning"
        />
        <KPICard
          title="AI Generations"
          value={stats?.aiUsage || "0/50"}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Konten Terbaru</h3>
            <Link
              to="/calendar"
              className="text-sm text-primary-600 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {recentContent.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              Belum ada konten. Mulai buat di AI Generator!
            </p>
          ) : (
            <div className="space-y-3">
              {recentContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.platform} &middot;{" "}
                      {item.scheduled_date || "Tanpa jadwal"}
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

        <div className="card">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/generate/caption"
              className="block w-full text-left px-4 py-3 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors"
            >
              ✨ Generate Caption
            </Link>
            <Link
              to="/generate/carousel"
              className="block w-full text-left px-4 py-3 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
            >
              📑 Buat Carousel Script
            </Link>
            <Link
              to="/links"
              className="block w-full text-left px-4 py-3 rounded-lg bg-warning-50 text-warning-700 text-sm font-medium hover:bg-warning-100 transition-colors"
            >
              🔗 Buat Smart Link
            </Link>
            <Link
              to="/generate/ad-copy"
              className="block w-full text-left px-4 py-3 rounded-lg bg-accent-50 text-accent-700 text-sm font-medium hover:bg-accent-100 transition-colors"
            >
              📢 Generate Ad Copy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
