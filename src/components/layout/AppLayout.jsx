import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Sidebar from "./Sidebar";
import { PageLoader } from "../ui/LoadingSpinner";

export default function AppLayout() {
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_completed)
    return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-base relative">
      {/* Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-60 p-4 lg:p-8 relative z-10">
        <Outlet context={{ onMenuToggle: () => setSidebarOpen(true) }} />
      </main>
    </div>
  );
}
