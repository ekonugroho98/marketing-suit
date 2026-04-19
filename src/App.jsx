import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider, ToastContainer } from "./components/ui/Toast";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import { PageLoader } from "./components/ui/LoadingSpinner";

// Auth pages — static imports (small, needed immediately)
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import OnboardingPage from "./pages/auth/OnboardingPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AuthCallbackPage from "./pages/auth/AuthCallbackPage";

// Dashboard
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));

// Generate
const GeneratorHub = lazy(() => import("./pages/generate/GeneratorHub"));
const CaptionGenerator = lazy(
  () => import("./pages/generate/CaptionGenerator"),
);
const CarouselGenerator = lazy(
  () => import("./pages/generate/CarouselGenerator"),
);
const AdCopyGenerator = lazy(() => import("./pages/generate/AdCopyGenerator"));
const ThreadGenerator = lazy(() => import("./pages/generate/ThreadGenerator"));
const VideoScriptGenerator = lazy(
  () => import("./pages/generate/VideoScriptGenerator"),
);
const RepurposeGenerator = lazy(
  () => import("./pages/generate/RepurposeGenerator"),
);
const HashtagResearch = lazy(() => import("./pages/generate/HashtagResearch"));
const LibraryPage = lazy(() => import("./pages/generate/LibraryPage"));
const HistoryPage = lazy(() => import("./pages/generate/HistoryPage"));

// Calendar
const CalendarPage = lazy(() => import("./pages/calendar/CalendarPage"));

// Assets
const AssetsPage = lazy(() => import("./pages/assets/AssetsPage"));

// Links
const LinksPage = lazy(() => import("./pages/links/LinksPage"));
const LinkAnalyticsPage = lazy(() => import("./pages/links/LinkAnalyticsPage"));

// Analytics
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage"));
const ThreadsInsightsPage = lazy(
  () => import("./pages/analytics/ThreadsInsightsPage"),
);
const WeeklyReportPage = lazy(
  () => import("./pages/analytics/WeeklyReportPage"),
);
const AdvancedAnalyticsPage = lazy(
  () => import("./pages/analytics/AdvancedAnalyticsPage"),
);
const FunnelPage = lazy(() => import("./pages/analytics/FunnelPage"));

// Publish
const PublishHistoryPage = lazy(
  () => import("./pages/publish/PublishHistoryPage"),
);

// Settings
const ConnectedAccountsPage = lazy(
  () => import("./pages/settings/ConnectedAccountsPage"),
);
const AIModelsPage = lazy(() => import("./pages/settings/AIModelsPage"));

// A/B Tests
const ABTestDashboard = lazy(() => import("./pages/ab-tests/ABTestDashboard"));
const NewABTestPage = lazy(() => import("./pages/ab-tests/NewABTestPage"));
const ABTestDetailPage = lazy(
  () => import("./pages/ab-tests/ABTestDetailPage"),
);

// Ads
const AdsDashboard = lazy(() => import("./pages/ads/AdsDashboard"));
const NewCampaignPage = lazy(() => import("./pages/ads/NewCampaignPage"));
const CampaignDetailPage = lazy(() => import("./pages/ads/CampaignDetailPage"));
const CompetitorSpyPage = lazy(() => import("./pages/ads/CompetitorSpyPage"));

// CRM
const CRMDashboard = lazy(() => import("./pages/crm/CRMDashboard"));
const LeadsPage = lazy(() => import("./pages/crm/LeadsPage"));
const NewLeadPage = lazy(() => import("./pages/crm/NewLeadPage"));
const LeadDetailPage = lazy(() => import("./pages/crm/LeadDetailPage"));
const SegmentsPage = lazy(() => import("./pages/crm/SegmentsPage"));
const SequencesPage = lazy(() => import("./pages/crm/SequencesPage"));

// Testimonials
const TestimonialsPage = lazy(
  () => import("./pages/testimonials/TestimonialsPage"),
);
const CollectPage = lazy(() => import("./pages/testimonials/CollectPage"));
const WidgetPage = lazy(() => import("./pages/testimonials/WidgetPage"));

// Billing
const BillingPage = lazy(() => import("./pages/billing/BillingPage"));

function SuspensePage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              <Route element={<AppLayout />}>
                <Route
                  path="/dashboard"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <DashboardPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <GeneratorHub />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/caption"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CaptionGenerator />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/carousel"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CarouselGenerator />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/ad-copy"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <AdCopyGenerator />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/thread"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <ThreadGenerator />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/video-script"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <VideoScriptGenerator />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/repurpose"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <RepurposeGenerator />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/generate/hashtags"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <HashtagResearch />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/library"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <LibraryPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <HistoryPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CalendarPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/assets"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <AssetsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/links"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <LinksPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/links/:linkId"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <LinkAnalyticsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <AnalyticsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/analytics/threads-insights"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <ThreadsInsightsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/analytics/reports"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <WeeklyReportPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/publish/history"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <PublishHistoryPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/settings/accounts"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <ConnectedAccountsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/settings/ai-models"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <AIModelsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ab-tests"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <ABTestDashboard />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ab-tests/new"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <NewABTestPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ab-tests/:testId"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <ABTestDetailPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ads"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <AdsDashboard />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ads/new"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <NewCampaignPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ads/:campaignId"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CampaignDetailPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ads/competitor"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CompetitorSpyPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CRMDashboard />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/leads"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <LeadsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/leads/new"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <NewLeadPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/leads/:id"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <LeadDetailPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/segments"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <SegmentsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/sequences"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <SequencesPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/testimonials"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <TestimonialsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/testimonials/forms"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <CollectPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/testimonials/widgets"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <WidgetPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/analytics/advanced"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <AdvancedAnalyticsPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/analytics/funnel"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <FunnelPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <ErrorBoundary>
                      <SuspensePage>
                        <BillingPage />
                      </SuspensePage>
                    </ErrorBoundary>
                  }
                />
              </Route>

              <Route path="/" element={<AuthCallbackPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
          <ToastContainer />
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
