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
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-60 p-4 lg:p-8">
        <Outlet context={{ onMenuToggle: () => setSidebarOpen(true) }} />
      </main>
    </div>
  );
}
