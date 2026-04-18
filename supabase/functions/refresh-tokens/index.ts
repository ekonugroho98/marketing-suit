// ================================
// Supabase Edge Function: refresh-tokens
// Background job untuk me-refresh OAuth tokens yang akan expired.
// Dipanggil via cron (pg_cron + pg_net) atau manual trigger.
// ============================================
// Deploy: supabase functions deploy refresh-tokens
// Auth: Service role key (background job, bukan user request)
// Query param: ?platform=threads (opsional, filter platform tertentu)
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/crypto.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// ---- Types ----

interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_username: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string;
  metadata: Record<string, unknown>;
}

interface RefreshResult {
  id: string;
  platform: string;
  platform_username: string;
  status: "refreshed" | "failed";
  error?: string;
  new_expires_at?: string;
}

// ---- Platform-specific refresh logic ----

async function refreshMetaToken(
  currentAccessToken: string,
  platform: string,
): Promise<{ access_token: string; expires_in: number }> {
  // Meta platforms (threads, instagram, facebook) use long-lived token exchange
  // Long-lived tokens can be refreshed by exchanging them for a new long-lived token
  // Valid long-lived tokens that are at least 24 hours old can be refreshed

  const appId =
    platform === "threads"
      ? (Deno.env.get("META_THREADS_APP_ID") ??
        Deno.env.get("META_APP_ID") ??
        "")
      : (Deno.env.get("META_APP_ID") ?? "");
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";

  if (!appId || !appSecret) {
    throw new Error(`Meta credentials tidak dikonfigurasi untuk ${platform}`);
  }

  // Threads uses a different endpoint and grant_type
  if (platform === "threads") {
    const url =
      `https://graph.threads.net/refresh_access_token?` +
      `grant_type=th_refresh_token` +
      `&access_token=${encodeURIComponent(currentAccessToken)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `Threads token refresh gagal (${res.status}): ${errBody}`,
      );
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      throw new Error("Threads refresh response tidak mengandung access_token");
    }

    return {
      access_token: data.access_token,
      // Threads long-lived tokens last 60 days
      expires_in: data.expires_in ?? 60 * 24 * 60 * 60,
    };
  }

  // Instagram & Facebook use the Graph API exchange endpoint
  const url =
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(currentAccessToken)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Meta token refresh gagal untuk ${platform} (${res.status}): ${errBody}`,
    );
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  if (!data.access_token) {
    throw new Error(
      `Meta refresh response tidak mengandung access_token untuk ${platform}`,
    );
  }

  return {
    access_token: data.access_token,
    // Meta long-lived tokens last ~60 days
    expires_in: data.expires_in ?? 60 * 24 * 60 * 60,
  };
}

async function refreshTwitterToken(refreshTokenPlain: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = Deno.env.get("TWITTER_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("TWITTER_CLIENT_SECRET") ?? "";

  if (!clientId || !clientSecret) {
    throw new Error("Twitter credentials tidak dikonfigurasi");
  }

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenPlain,
      client_id: clientId,
    }).toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twitter token refresh gagal (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("Twitter refresh response tidak mengandung access_token");
  }

  return {
    access_token: data.access_token,
    // Twitter issues a new refresh token with each refresh
    refresh_token: data.refresh_token ?? refreshTokenPlain,
    // Twitter access tokens typically expire in 2 hours (7200 seconds)
    expires_in: data.expires_in ?? 7200,
  };
}

async function refreshTikTokToken(refreshTokenPlain: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok credentials tidak dikonfigurasi");
  }

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshTokenPlain,
    }).toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`TikTok token refresh gagal (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    data?: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
  };

  // TikTok API can return tokens at root level or nested in data
  const accessToken = data.access_token ?? data.data?.access_token;
  const refreshToken = data.refresh_token ?? data.data?.refresh_token;
  const expiresIn = data.expires_in ?? data.data?.expires_in;

  if (!accessToken) {
    throw new Error("TikTok refresh response tidak mengandung access_token");
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken ?? refreshTokenPlain,
    // TikTok access tokens typically expire in 24 hours (86400 seconds)
    expires_in: expiresIn ?? 86400,
  };
}

// ---- Main handler ----

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // ---- Auth: Verify service role key ----
    // This function is a background job — only callable with the service role key,
    // NOT regular user JWTs.
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Accept either "Bearer <service_role_key>" or the key directly
    const providedToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (providedToken !== serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: hanya bisa dipanggil dengan service role key",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- Parse optional platform filter ----
    const url = new URL(req.url);
    const platformFilter = url.searchParams.get("platform");

    // ---- Create Supabase client with service role ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- Query tokens expiring within 7 days ----
    let query = supabase
      .from("connected_accounts")
      .select(
        "id, user_id, platform, platform_username, access_token_encrypted, refresh_token_encrypted, token_expires_at, metadata",
      )
      .eq("status", "active")
      .not("token_expires_at", "is", null)
      .lt(
        "token_expires_at",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (platformFilter) {
      query = query.eq("platform", platformFilter);
    }

    const { data: expiringAccounts, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(
        JSON.stringify({
          error: "Gagal query connected_accounts",
          details: queryError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!expiringAccounts || expiringAccounts.length === 0) {
      console.log(
        `Tidak ada token yang perlu di-refresh${platformFilter ? ` untuk platform ${platformFilter}` : ""}.`,
      );
      return new Response(
        JSON.stringify({
          message: "Tidak ada token yang perlu di-refresh",
          platform_filter: platformFilter,
          checked_at: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Ditemukan ${expiringAccounts.length} token yang perlu di-refresh.`,
    );

    // ---- Refresh each token ----
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? "";
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: "TOKEN_ENCRYPTION_KEY tidak dikonfigurasi" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: RefreshResult[] = [];

    for (const account of expiringAccounts as ConnectedAccount[]) {
      const {
        id,
        platform,
        platform_username,
        access_token_encrypted,
        refresh_token_encrypted,
      } = account;

      console.log(
        `Refreshing token: ${platform} / ${platform_username} (${id})`,
      );

      try {
        // Decrypt current tokens
        const currentAccessToken = await decryptToken(
          access_token_encrypted,
          encryptionKey,
        );
        const currentRefreshToken = refresh_token_encrypted
          ? await decryptToken(refresh_token_encrypted, encryptionKey)
          : null;

        let newAccessToken: string;
        let newRefreshToken: string | null = null;
        let expiresInSeconds: number;

        // ---- Platform-specific refresh ----
        if (
          platform === "threads" ||
          platform === "instagram" ||
          platform === "facebook"
        ) {
          // Meta platforms: refresh using the access token itself (long-lived token exchange)
          const result = await refreshMetaToken(currentAccessToken, platform);
          newAccessToken = result.access_token;
          expiresInSeconds = result.expires_in;
          // Meta doesn't use refresh tokens for long-lived token renewal
          newRefreshToken = currentRefreshToken;
        } else if (platform === "twitter") {
          // Twitter: requires a refresh_token
          if (!currentRefreshToken) {
            throw new Error(
              "Twitter account tidak memiliki refresh_token — perlu reconnect",
            );
          }
          const result = await refreshTwitterToken(currentRefreshToken);
          newAccessToken = result.access_token;
          newRefreshToken = result.refresh_token;
          expiresInSeconds = result.expires_in;
        } else if (platform === "tiktok") {
          // TikTok: requires a refresh_token
          if (!currentRefreshToken) {
            throw new Error(
              "TikTok account tidak memiliki refresh_token — perlu reconnect",
            );
          }
          const result = await refreshTikTokToken(currentRefreshToken);
          newAccessToken = result.access_token;
          newRefreshToken = result.refresh_token;
          expiresInSeconds = result.expires_in;
        } else {
          console.warn(
            `Platform "${platform}" tidak didukung untuk auto-refresh, skip.`,
          );
          results.push({
            id,
            platform,
            platform_username,
            status: "failed",
            error: `Platform "${platform}" tidak didukung untuk auto-refresh`,
          });
          continue;
        }

        // ---- Encrypt new tokens ----
        const encryptedNewAccess = await encryptToken(
          newAccessToken,
          encryptionKey,
        );
        const encryptedNewRefresh = newRefreshToken
          ? await encryptToken(newRefreshToken, encryptionKey)
          : refresh_token_encrypted; // Keep existing encrypted refresh token if unchanged

        // ---- Calculate new expiry ----
        const newExpiresAt = new Date(
          Date.now() + expiresInSeconds * 1000,
        ).toISOString();

        // ---- Update database ----
        const { error: updateError } = await supabase
          .from("connected_accounts")
          .update({
            access_token_encrypted: encryptedNewAccess,
            refresh_token_encrypted: encryptedNewRefresh,
            token_expires_at: newExpiresAt,
            status: "active",
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (updateError) {
          throw new Error(`Database update gagal: ${updateError.message}`);
        }

        console.log(
          `✅ Token refreshed: ${platform} / ${platform_username} — expires ${newExpiresAt}`,
        );

        results.push({
          id,
          platform,
          platform_username,
          status: "refreshed",
          new_expires_at: newExpiresAt,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(
          `❌ Refresh gagal: ${platform} / ${platform_username} — ${errorMessage}`,
        );

        // Mark account as needs_reconnect so user knows to re-auth
        try {
          await supabase
            .from("connected_accounts")
            .update({
              status: "needs_reconnect",
              metadata: {
                ...account.metadata,
                last_refresh_error: errorMessage,
                last_refresh_attempt: new Date().toISOString(),
              },
            })
            .eq("id", id);
        } catch (dbErr) {
          console.error(
            `Gagal update status needs_reconnect untuk ${id}:`,
            dbErr instanceof Error ? dbErr.message : dbErr,
          );
        }

        results.push({
          id,
          platform,
          platform_username,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    // ---- Summary ----
    const refreshed = results.filter((r) => r.status === "refreshed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(
      `\nToken refresh selesai: ${refreshed} berhasil, ${failed} gagal dari ${results.length} total.`,
    );

    return new Response(
      JSON.stringify({
        message: "Token refresh selesai",
        platform_filter: platformFilter,
        summary: {
          total: results.length,
          refreshed,
          failed,
        },
        results,
        executed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("refresh-tokens fatal error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
