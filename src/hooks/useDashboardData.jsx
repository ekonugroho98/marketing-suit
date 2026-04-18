import { useQuery } from "@tanstack/react-query";
import { supabase, isConfigured } from "../services/supabase";

const DEMO_CONTENT = [
  {
    id: "1",
    title: "Promo Ebook Copywriting",
    platform: "instagram",
    pillar: "awareness",
    status: "published",
    scheduled_date: "2026-04-10",
  },
  {
    id: "2",
    title: "Thread: 5 Tips Jualan Digital",
    platform: "threads",
    pillar: "education",
    status: "scheduled",
    scheduled_date: "2026-04-11",
  },
  {
    id: "3",
    title: "Carousel: Kesalahan Copywriting",
    platform: "instagram",
    pillar: "education",
    status: "scheduled",
    scheduled_date: "2026-04-12",
  },
  {
    id: "4",
    title: "Ad Copy: Diskon 50%",
    platform: "facebook",
    pillar: "showcase",
    status: "draft",
    scheduled_date: null,
  },
  {
    id: "5",
    title: "Testimoni Customer",
    platform: "instagram",
    pillar: "social_proof",
    status: "published",
    scheduled_date: "2026-04-09",
  },
];

const DEMO_STATS = {
  totalContent: 142,
  published: 89,
  totalClicks: 2847,
  aiUsage: "38/50",
};

async function fetchDashboardData(userId, brandId) {
  if (!isConfigured) {
    return {
      stats: DEMO_STATS,
      recentContent: DEMO_CONTENT,
    };
  }

  const [contentRes, linksRes, usageRes, calendarRes] = await Promise.all([
    supabase
      .from("generation_history")
      .select("id", { count: "exact" })
      .eq("user_id", userId),
    supabase.from("smart_links").select("click_count").eq("user_id", userId),
    supabase
      .from("usage_monthly")
      .select("generation_count, generation_limit")
      .eq("user_id", userId)
      .eq("month", new Date().toISOString().slice(0, 7) + "-01")
      .single(),
    supabase
      .from("content_calendar")
      .select("*")
      .eq("user_id", userId)
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const totalClicks = (linksRes.data || []).reduce(
    (sum, l) => sum + (l.click_count || 0),
    0,
  );
  const recentContent = calendarRes.data || [];
  const published = recentContent.filter(
    (c) => c.status === "published",
  ).length;

  const stats = {
    totalContent: contentRes.count || 0,
    published,
    totalClicks,
    aiUsage: usageRes.data
      ? `${usageRes.data.generation_count}/${usageRes.data.generation_limit}`
      : "0/50",
  };

  return { stats, recentContent };
}

export function useDashboardData(user, activeBrand) {
  return useQuery({
    queryKey: ["dashboard", user?.id, activeBrand?.id],
    queryFn: () => fetchDashboardData(user.id, activeBrand.id),
    enabled: !!user && !!activeBrand,
  });
}
