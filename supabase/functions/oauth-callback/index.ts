// ============================================
// Supabase Edge Function: oauth-callback
// Menerima redirect dari OAuth provider (GET request dari browser)
// dan menyimpan access token ke database
// ============================================
// Deploy: supabase functions deploy oauth-callback
// PENTING: Redirect URI yang di-register di semua platform HARUS:
//   https://henfyhuhleowauetulyj.supabase.co/functions/v1/oauth-callback
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/crypto.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Redirect browser ke URL tertentu menggunakan HTML meta refresh
function htmlRedirect(url: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${url}">
  <script>window.location.replace("${url}");</script>
</head>
<body>
  <p>Mengarahkan ulang... <a href="${url}">Klik di sini</a> jika tidak otomatis.</p>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;

  // URL sukses dan gagal untuk redirect ke frontend
  const successBase = siteUrl
    ? `${siteUrl}/settings?tab=integrations`
    : `${supabaseUrl}/connected`;
  const failureBase = siteUrl
    ? `${siteUrl}/settings?tab=integrations`
    : `${supabaseUrl}/error`;

  // Service role client — dibutuhkan karena request ini dari OAuth provider,
  // bukan dari user (tidak ada Authorization header)
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    const oauthErrorDesc = url.searchParams.get("error_description");

    // Provider mengembalikan error (user menolak izin, dsb)
    if (oauthError) {
      console.error("OAuth provider error:", oauthError, oauthErrorDesc);
      const msg = oauthErrorDesc ?? oauthError;
      return htmlRedirect(`${failureBase}&error=${encodeURIComponent(msg)}`);
    }

    if (!code || !state) {
      return htmlRedirect(`${failureBase}&error=Parameter+tidak+lengkap`);
    }

    // ---- CSRF Verification: cek state di database ----
    const { data: stateRecord, error: stateErr } = await supabase
      .from("oauth_states")
      .select("id, user_id, platform, code_challenge")
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (stateErr || !stateRecord) {
      console.error("State tidak valid atau sudah kadaluarsa:", stateErr);
      return htmlRedirect(`${failureBase}&error=State+tidak+valid`);
    }

    // Hapus state yang sudah dipakai (one-time use)
    await supabase.from("oauth_states").delete().eq("id", stateRecord.id);

    const {
      user_id: userId,
      platform,
      code_challenge: codeVerifier,
    } = stateRecord;

    // ---- Token Exchange per platform ----
    let accessToken = "";
    let refreshToken = "";
    let platformUsername = "";
    let platformAvatarUrl: string | undefined;
    let platformUserId: string | undefined;
    let tokenExpiresAt: string | null = null; // ISO timestamp for token expiry

    // ================================================================
    if (platform === "threads") {
      // ================================================================
      // Step 1: Short-lived token (gunakan Threads App ID khusus)
      const threadsAppId =
        Deno.env.get("META_THREADS_APP_ID") ??
        Deno.env.get("META_APP_ID") ??
        "";
      const threadsAppSecret =
        Deno.env.get("META_THREADS_APP_SECRET") ??
        Deno.env.get("META_APP_SECRET") ??
        "";
      const tokenRes = await fetch(
        "https://graph.threads.net/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: threadsAppId,
            client_secret: threadsAppSecret,
            redirect_uri: callbackUrl,
            code,
            grant_type: "authorization_code",
          }).toString(),
        },
      );

      if (!tokenRes.ok) {
        const e = await tokenRes.text();
        console.error("Threads short token error:", e);
        return htmlRedirect(`${failureBase}&error=Gagal+tukar+token+Threads`);
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };
      const shortToken = tokenData.access_token;

      // Step 2: Long-lived token (60 hari)
      try {
        const longRes = await fetch(
          `https://graph.threads.net/access_token?` +
            `grant_type=th_exchange_token` +
            `&client_secret=${encodeURIComponent(Deno.env.get("META_APP_SECRET") ?? "")}` +
            `&access_token=${encodeURIComponent(shortToken)}`,
        );
        if (longRes.ok) {
          const longData = (await longRes.json()) as {
            access_token: string;
            expires_in?: number;
          };
          accessToken = longData.access_token ?? shortToken;
          // Threads long-lived tokens last 60 days; use expires_in if provided
          const expiresInSec = longData.expires_in ?? 60 * 24 * 60 * 60;
          tokenExpiresAt = new Date(
            Date.now() + expiresInSec * 1000,
          ).toISOString();
        } else {
          accessToken = shortToken;
          // Short-lived token — ~1 hour expiry
          tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        }
      } catch {
        accessToken = shortToken;
        tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      }

      // Step 3: Ambil profil user dari Threads API
      try {
        const meRes = await fetch(
          `https://graph.threads.net/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
        );
        if (meRes.ok) {
          const me = (await meRes.json()) as { id?: string; username?: string };
          platformUserId = me.id;
          platformUsername =
            me.username ?? `threads_${me.id ?? userId.substring(0, 8)}`;
        } else {
          platformUsername = `threads_user`;
        }
      } catch {
        platformUsername = `threads_user`;
      }

      // ================================================================
    } else if (platform === "instagram") {
      // ================================================================
      // Step 1: Short-lived token via Facebook endpoint
      const tokenRes = await fetch(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: Deno.env.get("META_APP_ID") ?? "",
            client_secret: Deno.env.get("META_APP_SECRET") ?? "",
            redirect_uri: callbackUrl,
            code,
          }).toString(),
        },
      );

      if (!tokenRes.ok) {
        const e = await tokenRes.text();
        console.error("Instagram/Meta token error:", e);
        return htmlRedirect(`${failureBase}&error=Gagal+tukar+token+Instagram`);
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };
      const shortToken = tokenData.access_token;

      // Step 2: Long-lived token (60 hari)
      try {
        const longRes = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?` +
            `grant_type=fb_exchange_token` +
            `&client_id=${encodeURIComponent(Deno.env.get("META_APP_ID") ?? "")}` +
            `&client_secret=${encodeURIComponent(Deno.env.get("META_APP_SECRET") ?? "")}` +
            `&fb_exchange_token=${encodeURIComponent(shortToken)}`,
        );
        if (longRes.ok) {
          const longData = (await longRes.json()) as {
            access_token: string;
            expires_in?: number;
          };
          accessToken = longData.access_token ?? shortToken;
          const expiresInSec = longData.expires_in ?? 60 * 24 * 60 * 60;
          tokenExpiresAt = new Date(
            Date.now() + expiresInSec * 1000,
          ).toISOString();
        } else {
          accessToken = shortToken;
          tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        }
      } catch {
        accessToken = shortToken;
        tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      }

      // Step 3: Ambil profil Instagram
      try {
        const meRes = await fetch(
          `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`,
        );
        if (meRes.ok) {
          const me = (await meRes.json()) as {
            id?: string;
            username?: string;
            profile_picture_url?: string;
          };
          platformUserId = me.id;
          platformUsername = me.username ?? `ig_${me.id ?? "user"}`;
          platformAvatarUrl = me.profile_picture_url;
        } else {
          platformUsername = `instagram_user`;
        }
      } catch {
        platformUsername = `instagram_user`;
      }

      // ================================================================
    } else if (platform === "facebook") {
      // ================================================================
      const tokenRes = await fetch(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: Deno.env.get("META_APP_ID") ?? "",
            client_secret: Deno.env.get("META_APP_SECRET") ?? "",
            redirect_uri: callbackUrl,
            code,
          }).toString(),
        },
      );

      if (!tokenRes.ok) {
        const e = await tokenRes.text();
        console.error("Facebook token error:", e);
        return htmlRedirect(`${failureBase}&error=Gagal+tukar+token+Facebook`);
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };
      const shortToken = tokenData.access_token;

      // Long-lived token
      try {
        const longRes = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?` +
            `grant_type=fb_exchange_token` +
            `&client_id=${encodeURIComponent(Deno.env.get("META_APP_ID") ?? "")}` +
            `&client_secret=${encodeURIComponent(Deno.env.get("META_APP_SECRET") ?? "")}` +
            `&fb_exchange_token=${encodeURIComponent(shortToken)}`,
        );
        if (longRes.ok) {
          const longData = (await longRes.json()) as {
            access_token: string;
            expires_in?: number;
          };
          accessToken = longData.access_token ?? shortToken;
          const expiresInSec = longData.expires_in ?? 60 * 24 * 60 * 60;
          tokenExpiresAt = new Date(
            Date.now() + expiresInSec * 1000,
          ).toISOString();
        } else {
          accessToken = shortToken;
          tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        }
      } catch {
        accessToken = shortToken;
        tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      }

      try {
        const meRes = await fetch(
          `https://graph.facebook.com/me?fields=id,name,picture&access_token=${encodeURIComponent(accessToken)}`,
        );
        if (meRes.ok) {
          const me = (await meRes.json()) as {
            id?: string;
            name?: string;
            picture?: { data?: { url?: string } };
          };
          platformUserId = me.id;
          platformUsername = me.name ?? `fb_${me.id ?? "user"}`;
          platformAvatarUrl = me.picture?.data?.url;
        } else {
          platformUsername = `facebook_user`;
        }
      } catch {
        platformUsername = `facebook_user`;
      }

      // ================================================================
    } else if (platform === "twitter") {
      // ================================================================
      const clientId = Deno.env.get("TWITTER_CLIENT_ID") ?? "";
      const clientSecret = Deno.env.get("TWITTER_CLIENT_SECRET") ?? "";

      if (!clientId || !clientSecret) {
        return htmlRedirect(
          `${failureBase}&error=Twitter+credentials+tidak+dikonfigurasi`,
        );
      }

      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          code_verifier: codeVerifier ?? "",
          client_id: clientId,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const e = await tokenRes.text();
        console.error("Twitter token error:", e);
        return htmlRedirect(`${failureBase}&error=Gagal+tukar+token+Twitter`);
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      accessToken = tokenData.access_token;
      if (tokenData.refresh_token) refreshToken = tokenData.refresh_token;
      // Twitter access tokens typically expire in 2 hours (7200s)
      const twitterExpiresIn = tokenData.expires_in ?? 7200;
      tokenExpiresAt = new Date(
        Date.now() + twitterExpiresIn * 1000,
      ).toISOString();

      try {
        const meRes = await fetch(
          "https://api.twitter.com/2/users/me?user.fields=username,profile_image_url",
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (meRes.ok) {
          const me = (await meRes.json()) as {
            data?: {
              id?: string;
              username?: string;
              profile_image_url?: string;
            };
          };
          platformUserId = me.data?.id;
          platformUsername = me.data?.username ?? `twitter_user`;
          platformAvatarUrl = me.data?.profile_image_url;
        } else {
          platformUsername = `twitter_user`;
        }
      } catch {
        platformUsername = `twitter_user`;
      }

      // ================================================================
    } else if (platform === "tiktok") {
      // ================================================================
      const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
      const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";

      if (!clientKey || !clientSecret) {
        return htmlRedirect(
          `${failureBase}&error=TikTok+credentials+tidak+dikonfigurasi`,
        );
      }

      const tokenRes = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: callbackUrl,
          }).toString(),
        },
      );

      if (!tokenRes.ok) {
        const e = await tokenRes.text();
        console.error("TikTok token error:", e);
        return htmlRedirect(`${failureBase}&error=Gagal+tukar+token+TikTok`);
      }

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        data?: {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };
      };
      accessToken =
        tokenData.access_token ?? tokenData.data?.access_token ?? "";
      refreshToken =
        tokenData.refresh_token ?? tokenData.data?.refresh_token ?? "";
      // TikTok access tokens typically expire in 24 hours (86400s)
      const tiktokExpiresIn =
        tokenData.expires_in ?? tokenData.data?.expires_in ?? 86400;
      tokenExpiresAt = new Date(
        Date.now() + tiktokExpiresIn * 1000,
      ).toISOString();

      try {
        const meRes = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (meRes.ok) {
          const me = (await meRes.json()) as {
            data?: {
              user?: {
                open_id?: string;
                display_name?: string;
                avatar_url?: string;
              };
            };
          };
          platformUserId = me.data?.user?.open_id;
          platformUsername =
            me.data?.user?.display_name ??
            me.data?.user?.open_id ??
            `tiktok_user`;
          platformAvatarUrl = me.data?.user?.avatar_url;
        } else {
          platformUsername = `tiktok_user`;
        }
      } catch {
        platformUsername = `tiktok_user`;
      }
    } else {
      return htmlRedirect(`${failureBase}&error=Platform+tidak+didukung`);
    }

    // ---- Encrypt tokens before storing ----
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY")!;
    const encryptedAccessToken = await encryptToken(accessToken, encryptionKey);
    const encryptedRefreshToken = refreshToken
      ? await encryptToken(refreshToken, encryptionKey)
      : null;

    // ---- Simpan ke database connected_accounts ----
    // Kolom sesuai schema migration 002 + 008:
    // status (bukan is_active), tidak ada token_type, tidak ada updated_at
    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .upsert(
        {
          user_id: userId,
          platform,
          platform_user_id: platformUserId ?? platformUsername,
          platform_username: platformUsername,
          platform_avatar_url: platformAvatarUrl ?? null,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          status: "active",
          connected_at: new Date().toISOString(),
          account_label: platformUsername,
        },
        {
          onConflict: "user_id,platform,platform_username",
          ignoreDuplicates: false,
        },
      );

    if (upsertError) {
      console.error("Gagal menyimpan connected account:", upsertError);
      return htmlRedirect(`${failureBase}&error=Gagal+menyimpan+koneksi`);
    }

    // ---- Berhasil! Redirect ke halaman settings ----
    return htmlRedirect(
      `${successBase}&connected=${encodeURIComponent(platform)}&username=${encodeURIComponent(platformUsername)}`,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("OAuth callback error:", errorMessage);
    return htmlRedirect(
      `${failureBase}&error=${encodeURIComponent(errorMessage)}`,
    );
  }
});
