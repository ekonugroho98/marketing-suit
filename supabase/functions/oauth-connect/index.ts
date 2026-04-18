// ============================================
// Supabase Edge Function: oauth-connect
// Initiates OAuth connection for social media platforms
// ============================================
// Deploy: supabase functions deploy oauth-connect
// Secrets yang dibutuhkan:
//   supabase secrets set META_APP_ID=928664966602184
//   supabase secrets set META_APP_SECRET=your-app-secret
//   supabase secrets set TWITTER_CLIENT_ID=your-client-id
//   supabase secrets set TWITTER_CLIENT_SECRET=your-client-secret
//   supabase secrets set TIKTOK_CLIENT_KEY=your-client-key
//   supabase secrets set TIKTOK_CLIENT_SECRET=your-client-secret
//   supabase secrets set SITE_URL=https://your-frontend-domain.com
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Verifikasi user sudah login
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Client dengan user token untuk verifikasi identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Service role client untuk operasi DB (bypass RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const platform: string = body.platform;
    if (!platform) {
      return new Response(JSON.stringify({ error: "platform is required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const platformLower = platform.toLowerCase();

    // Callback URL = Edge Function ini sendiri (harus sama persis dengan yang di-register di tiap platform)
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

    // Generate CSRF state dan PKCE code challenge
    const state = generateState();
    const codeChallenge = generateState(); // untuk Twitter PKCE

    // Build auth URL berdasarkan platform
    let authUrl: string;
    let params: URLSearchParams;

    switch (platformLower) {
      case "threads": {
        // Threads menggunakan App ID khusus (META_THREADS_APP_ID), bukan main app ID
        const threadsAppId =
          Deno.env.get("META_THREADS_APP_ID") ??
          Deno.env.get("META_APP_ID") ??
          "";
        authUrl = "https://threads.net/oauth/authorize";
        params = new URLSearchParams({
          client_id: threadsAppId,
          redirect_uri: callbackUrl,
          scope:
            "threads_basic,threads_content_publish,threads_manage_insights",
          response_type: "code",
          state,
        });
        break;
      }

      case "instagram": {
        authUrl = "https://www.facebook.com/v19.0/dialog/oauth";
        params = new URLSearchParams({
          client_id: Deno.env.get("META_APP_ID") ?? "",
          redirect_uri: callbackUrl,
          scope:
            "pages_show_list,instagram_basic,instagram_content_publish,instagram_manage_insights",
          response_type: "code",
          state,
        });
        break;
      }

      case "facebook": {
        authUrl = "https://www.facebook.com/v19.0/dialog/oauth";
        params = new URLSearchParams({
          client_id: Deno.env.get("META_APP_ID") ?? "",
          redirect_uri: callbackUrl,
          scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
          response_type: "code",
          state,
        });
        break;
      }

      case "twitter": {
        const twitterClientId = Deno.env.get("TWITTER_CLIENT_ID") ?? "";
        if (!twitterClientId) {
          return new Response(
            JSON.stringify({ error: "Twitter credentials not configured" }),
            {
              status: 500,
              headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
              },
            },
          );
        }
        authUrl = "https://twitter.com/i/oauth2/authorize";
        params = new URLSearchParams({
          client_id: twitterClientId,
          redirect_uri: callbackUrl,
          scope: "tweet.write tweet.read users.read offline.access",
          response_type: "code",
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "plain",
        });
        break;
      }

      case "tiktok": {
        const tiktokClientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
        if (!tiktokClientKey) {
          return new Response(
            JSON.stringify({ error: "TikTok credentials not configured" }),
            {
              status: 500,
              headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
              },
            },
          );
        }
        authUrl = "https://www.tiktok.com/v2/auth/authorize/";
        params = new URLSearchParams({
          client_key: tiktokClientKey,
          redirect_uri: callbackUrl,
          scope: "user.info.basic,video.publish",
          response_type: "code",
          state,
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Platform tidak didukung: ${platform}` }),
          {
            status: 400,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
    }

    // Verifikasi META_APP_ID untuk platform Meta
    if (["threads", "instagram", "facebook"].includes(platformLower)) {
      if (!Deno.env.get("META_APP_ID")) {
        return new Response(
          JSON.stringify({ error: "META_APP_ID not configured" }),
          {
            status: 500,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    // Simpan state ke database untuk verifikasi CSRF saat callback
    const { error: stateError } = await supabase.from("oauth_states").insert({
      user_id: user.id,
      platform: platformLower,
      state,
      code_challenge: codeChallenge,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 menit
    });

    if (stateError) {
      console.error("Gagal menyimpan OAuth state:", stateError);
      return new Response(
        JSON.stringify({ error: "Gagal memulai alur OAuth" }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const redirectUrl = `${authUrl}?${params.toString()}`;

    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("OAuth connect error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
