import { supabase, isConfigured } from "./supabase";

// ============================================
// Platform Services — Auto-Publisher
// ============================================
// Handles OAuth connections, content publishing, and platform-specific rules.
// All external API calls go through Supabase Edge Functions (server-side).
// Falls back to mock data in demo mode when Supabase is not configured.
// ============================================

// --- Platform-specific rules and constraints ---
export const PLATFORM_RULES = {
  instagram: {
    max_caption: 2200,
    hashtags: true,
    link_in_caption: false,
    media_required: true,
    cta: "Link di bio",
  },
  twitter: {
    max_caption: 280,
    hashtags: false,
    link_in_caption: true,
    media_required: false,
    format: "thread_if_long",
  },
  threads: {
    max_caption: 500,
    hashtags: true,
    link_in_caption: true,
    media_required: false,
  },
  tiktok: {
    max_caption: 2200,
    hashtags: true,
    link_in_caption: false,
    media_required: true,
    media_type: "video",
    cta: "Link di bio!",
  },
  youtube: {
    max_caption: 100, // title
    max_description: 5000,
    hashtags: true,
    link_in_caption: true,
    media_required: true,
  },
  facebook: {
    max_caption: 63206,
    hashtags: false,
    link_in_caption: true,
    media_required: false,
  },
};

// --- Display metadata per platform ---
export const PLATFORM_META = {
  instagram: {
    name: "Instagram",
    icon: "📷",
    color: "#E1306C",
    connectLabel: "Hubungkan Instagram",
    requiredAccountType: "business",
  },
  twitter: {
    name: "Twitter / X",
    icon: "𝕏",
    color: "#000",
    connectLabel: "Hubungkan Twitter",
    requiredAccountType: "any",
  },
  threads: {
    name: "Threads",
    icon: "🧵",
    color: "#000",
    connectLabel: "Hubungkan Threads",
    requiredAccountType: "personal",
  },
  tiktok: {
    name: "TikTok",
    icon: "🎵",
    color: "#000000",
    connectLabel: "Hubungkan TikTok",
    requiredAccountType: "creator",
  },
  youtube: {
    name: "YouTube",
    icon: "▶️",
    color: "#FF0000",
    connectLabel: "Hubungkan YouTube",
    requiredAccountType: "channel",
  },
  facebook: {
    name: "Facebook",
    icon: "👍",
    color: "#1877F2",
    connectLabel: "Hubungkan Facebook",
    requiredAccountType: "page",
  },
};

/**
 * Initiate OAuth connection flow for a platform.
 * Calls Supabase Edge Function which handles OAuth redirect.
 * @param {string} platform - Platform key (instagram, twitter, tiktok, etc)
 * @returns {Promise<{data: {redirectUrl: string}|null, error: string|null}>}
 */
export async function connectPlatform(platform) {
  if (!isConfigured) {
    // Demo mode
    return {
      data: {
        redirectUrl: `https://demo.example.com/oauth/${platform}/callback`,
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("oauth-connect", {
      body: { platform },
    });

    if (error) {
      return {
        data: null,
        error: error.message || "Failed to initiate OAuth connection",
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error(
      `[Platforms] OAuth connect error for ${platform}:`,
      err.message,
    );
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Disconnect a platform from the user's account.
 * Removes the connection from the database.
 * @param {string} platform - Platform key to disconnect
 * @param {string} [accountId] - Specific account ID to disconnect
 * @returns {Promise<{data: null, error: string|null}>}
 */
export async function disconnectPlatform(platform, accountId) {
  if (!isConfigured) {
    // Demo mode
    console.log(`[Demo] Disconnected ${platform} (id: ${accountId})`);
    return { data: null, error: null };
  }

  try {
    const query = supabase.from("connected_accounts").delete();

    // Hapus by ID jika ada, fallback by platform
    const { error } = accountId
      ? await query.eq("id", accountId)
      : await query.eq("platform", platform);

    if (error) {
      return {
        data: null,
        error: error.message || "Failed to disconnect platform",
      };
    }

    return { data: null, error: null };
  } catch (err) {
    console.error(`[Platforms] Disconnect error for ${platform}:`, err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Publish content to a platform.
 * Calls Supabase Edge Function which handles the actual API calls.
 * @param {Object} params - Publishing parameters
 * @param {string} params.platform - Target platform
 * @param {string} params.content - Main content/caption text
 * @param {string[]} [params.mediaUrls] - URLs to media files (images, videos)
 * @param {string[]} [params.hashtags] - Hashtags to include
 * @returns {Promise<{data: {publishId: string, status: string, scheduledAt: string|null}|null, error: string|null}>}
 */
export async function publishContent({
  platform,
  content,
  mediaUrls = [],
  hashtags = [],
}) {
  if (!isConfigured) {
    // Demo mode: return mock published record
    return {
      data: {
        publishId: `demo-${Date.now()}`,
        status: "published",
        scheduledAt: null,
        platform,
        publishedAt: new Date().toISOString(),
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("publish-content", {
      body: {
        platform,
        content,
        mediaUrls,
        hashtags,
      },
    });

    if (error) {
      return {
        data: null,
        error: error.message || "Failed to publish content",
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`[Platforms] Publish error for ${platform}:`, err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Get publish history with pagination.
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number (1-indexed)
 * @param {number} [params.limit=10] - Items per page
 * @returns {Promise<{data: {items: any[], total: number, page: number, limit: number}|null, error: string|null}>}
 */
export async function getPublishHistory({ page = 1, limit = 10 }) {
  if (!isConfigured) {
    // Demo mode: return mock history
    return {
      data: {
        items: [
          {
            id: "demo-1",
            platform: "instagram",
            content: "Demo post 1",
            status: "published",
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "demo-2",
            platform: "twitter",
            content: "Demo post 2",
            status: "published",
            publishedAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ],
        total: 2,
        page,
        limit,
      },
      error: null,
    };
  }

  try {
    const offset = (page - 1) * limit;

    const { data, error: countError } = await supabase
      .from("publish_history")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("published_at", { ascending: false });

    if (countError) {
      return {
        data: null,
        error: countError.message || "Failed to fetch publish history",
      };
    }

    return {
      data: {
        items: data || [],
        total: data?.length || 0,
        page,
        limit,
      },
      error: null,
    };
  } catch (err) {
    console.error("[Platforms] Get history error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Retry publishing a previously failed post.
 * Calls Supabase Edge Function to reattempt publication.
 * @param {string} publishHistoryId - ID of the failed publish record
 * @returns {Promise<{data: {publishId: string, status: string}|null, error: string|null}>}
 */
export async function retryPublish(publishHistoryId) {
  if (!isConfigured) {
    // Demo mode
    return {
      data: {
        publishId: publishHistoryId,
        status: "retrying",
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("retry-publish", {
      body: { publishHistoryId },
    });

    if (error) {
      return { data: null, error: error.message || "Failed to retry publish" };
    }

    return { data, error: null };
  } catch (err) {
    console.error(
      `[Platforms] Retry error for ${publishHistoryId}:`,
      err.message,
    );
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Adapt content for a target platform based on its rules.
 * Uses AI service (via Edge Function) to rewrite content per platform constraints.
 * @param {Object} params - Adaptation parameters
 * @param {string} params.content - Original content to adapt
 * @param {string} [params.sourcePlatform] - Source platform (for context)
 * @param {string} params.targetPlatform - Target platform to adapt for
 * @returns {Promise<{data: {adaptedContent: string, hashtags: string[]}|null, error: string|null}>}
 */
export async function adaptContentForPlatform({
  content,
  sourcePlatform,
  targetPlatform,
}) {
  if (!isConfigured) {
    // Demo mode: return mock adaptation
    const rules = PLATFORM_RULES[targetPlatform];
    const maxLen = rules.max_caption || 500;
    const truncated = content.substring(0, maxLen);
    return {
      data: {
        adaptedContent: truncated,
        hashtags: rules.hashtags ? ["demo", "content"] : [],
      },
      error: null,
    };
  }

  try {
    const rules = PLATFORM_RULES[targetPlatform];
    const meta = PLATFORM_META[targetPlatform];

    const { data, error } = await supabase.functions.invoke("adapt-content", {
      body: {
        content,
        sourcePlatform,
        targetPlatform,
        platformRules: rules,
        platformName: meta?.name,
      },
    });

    if (error) {
      return { data: null, error: error.message || "Failed to adapt content" };
    }

    return { data, error: null };
  } catch (err) {
    console.error(
      `[Platforms] Adapt error for ${targetPlatform}:`,
      err.message,
    );
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Check if a platform is currently connected.
 * @param {string} platform - Platform key to check
 * @returns {Promise<{data: boolean, error: string|null}>}
 */
export async function isPlatformConnected(platform) {
  if (!isConfigured) {
    // Demo mode: always connected
    return { data: true, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("connected_accounts")
      .select("id")
      .eq("platform", platform)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      return {
        data: false,
        error: error.message || "Failed to check connection",
      };
    }

    return { data: !!data, error: null };
  } catch (err) {
    console.error(
      `[Platforms] Check connection error for ${platform}:`,
      err.message,
    );
    return { data: false, error: err.message || "Unknown error" };
  }
}

/**
 * Get all connected platforms for the current user.
 * @returns {Promise<{data: string[], error: string|null}>}
 */
export async function getConnectedPlatforms() {
  if (!isConfigured) {
    // Demo mode: return all platforms
    return { data: Object.keys(PLATFORM_META), error: null };
  }

  try {
    const { data, error } = await supabase
      .from("connected_accounts")
      .select("platform");

    if (error) {
      return {
        data: [],
        error: error.message || "Failed to get connected platforms",
      };
    }

    return { data: (data || []).map((row) => row.platform), error: null };
  } catch (err) {
    console.error("[Platforms] Get connected error:", err.message);
    return { data: [], error: err.message || "Unknown error" };
  }
}
