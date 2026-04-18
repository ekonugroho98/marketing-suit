import { useState } from "react";
import { supabase, isConfigured } from "../services/supabase";

const DEMO_PUBLISH_RESULT = {
  id: crypto.randomUUID(),
  status: "success",
  platform: "instagram",
  post_url: "https://instagram.com/p/demo",
  published_at: new Date().toISOString(),
};

const DEMO_HISTORY = [
  {
    id: "demo-pub-1",
    content_id: "demo-content-1",
    platform: "instagram",
    status: "success",
    caption: "Beautiful sunset moments ✨",
    published_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-pub-2",
    content_id: "demo-content-1",
    platform: "twitter",
    status: "success",
    caption: "Check out our latest design! #design #creative",
    published_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "demo-pub-3",
    content_id: "demo-content-2",
    platform: "instagram",
    status: "failed",
    caption: "Limited time offer 🎉",
    published_at: null,
    error_message: "Rate limit exceeded",
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
];

export function usePublisher() {
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  async function publish({
    contentId,
    platforms,
    caption,
    mediaUrls,
    hashtags,
  }) {
    setPublishing(true);
    setError(null);
    setResults([]);

    if (!isConfigured) {
      // Simulate successful publish after 2s delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mockResults = platforms.map((platform) => ({
        ...DEMO_PUBLISH_RESULT,
        platform,
        content_id: contentId,
        caption,
      }));
      setResults(mockResults);
      setPublishing(false);
      return mockResults;
    }

    const { data, error: invokeError } = await supabase.functions.invoke(
      "publish-content",
      {
        body: { contentId, platforms, caption, mediaUrls, hashtags },
      },
    );

    if (invokeError) {
      const errorMessage = invokeError.message || "Failed to publish content";
      setError(errorMessage);
      setPublishing(false);
      return null;
    }

    setResults(data || []);
    setPublishing(false);
    return data;
  }

  async function getHistory({ page = 0, limit = 10 }) {
    if (!isConfigured) {
      const start = page * limit;
      const end = start + limit;
      const paginatedData = DEMO_HISTORY.slice(start, end);
      return { data: paginatedData, count: DEMO_HISTORY.length };
    }

    // Ambil user dari session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return { data: [], count: 0 };

    let query = supabase
      .from("publish_history")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    const { data, count, error: queryError } = await query;

    if (queryError) {
      console.error("[publish_history] query error:", queryError);
      return { data: [], count: 0 };
    }
    return { data: data || [], count: count || 0 };
  }

  async function retry(publishHistoryId) {
    if (!isConfigured) {
      // Simulate retry after 2s delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const retryResult = {
        ...DEMO_PUBLISH_RESULT,
        id: publishHistoryId,
        status: "success",
      };
      setResults((prev) => [retryResult, ...prev]);
      return retryResult;
    }

    const { data, error: invokeError } = await supabase.functions.invoke(
      "retry-publish",
      {
        body: { publishHistoryId },
      },
    );

    if (invokeError) {
      const errorMessage = invokeError.message || "Failed to retry publish";
      setError(errorMessage);
      return null;
    }

    setResults((prev) => [data, ...prev]);
    return data;
  }

  return { publish, publishing, results, error, getHistory, retry };
}
