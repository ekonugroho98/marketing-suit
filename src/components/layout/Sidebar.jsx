import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/settings/accounts", label: "Akun Terhubung", icon: "🔌" },
  { path: "/settings/ai-models", label: "Model AI", icon: "🤖" },
  { type: "divider" },
  { path: "/generate", label: "AI Generator", icon: "✨" },
  { path: "/library", label: "Content Library", icon: "📚" },
  { path: "/history", label: "Riwayat", icon: "🕐" },
  { path: "/calendar", label: "Calendar", icon: "📅" },
  { path: "/assets", label: "Assets", icon: "🖼️" },
  { path: "/links", label: "Smart Links", icon: "🔗" },
  { path: "/analytics", label: "Analytics", icon: "📈" },
  {
    path: "/analytics/threads-insights",
    label: "Analisis Threads",
    icon: "🧵",
  },
  { type: "divider" },
  { path: "/publish/history", label: "Publish History", icon: "📤" },
  { path: "/ab-tests", label: "A/B Tests", icon: "🧪" },
  { path: "/ads", label: "Ads Manager", icon: "📢" },
  { path: "/ads/competitor", label: "Competitor Spy", icon: "🕵️" },
  { type: "divider" },
  { path: "/crm", label: "CRM Leads", icon: "👥" },
  { path: "/crm/segments", label: "Segmentasi", icon: "🎯" },
  { path: "/crm/sequences", label: "Email Sequence", icon: "📨" },
  { type: "divider" },
  { path: "/analytics/advanced", label: "Advanced Analytics", icon: "📊" },
  { path: "/analytics/funnel", label: "Funnel Konversi", icon: "🔽" },
  { type: "divider" },
  { path: "/testimonials", label: "Testimoni", icon: "⭐" },
  { path: "/testimonials/forms", label: "Kumpulkan Testimoni", icon: "📋" },
  { path: "/testimonials/widgets", label: "Widget Embed", icon: "🖼️" },
  { type: "divider" },
  { path: "/billing", label: "Langganan & Billing", icon: "💳" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { profile, signOut } = useAuth();

  const handleNavClick = () => {
    // Auto-close sidebar on mobile when a nav link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop overlay — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-60 bg-sidebar flex flex-col z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Header with close button on mobile */}
        <div className="p-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              KARAYA
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Marketing Suite</p>
          </div>
          {/* Close button — visible only on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition-colors p-1 -mr-1"
            aria-label="Tutup menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map((item, i) =>
            item.type === "divider" ? (
              <div
                key={`divider-${i}`}
                className="my-3 border-t border-white/10"
              />
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {profile?.subscription_tier || "free"}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
