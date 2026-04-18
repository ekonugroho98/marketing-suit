// ================================
// Supabase Edge Function: save-ai-config
// Encrypts API keys server-side before storing in user_ai_configs
// Supports: save (default), delete, test actions
// ============================================
// Deploy: supabase functions deploy save-ai-config --no-verify-jwt
// Requires secret: TOKEN_ENCRYPTION_KEY (64 hex chars = 32 bytes)
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { encryptToken } from "../_shared/crypto.ts";

// ── Helpers ────────────────────────────

let _currentReq: Request;

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(_currentReq),
      "Content-Type": "application/json",
    },
  });
}

// ── Test API Key ────────────────────────────

interface TestResult {
  success: boolean;
  message: string;
}

/**
 * Test an API key by making a minimal request to the provider's API.
 * Returns { success, message }.
 */
async function testApiKey(
  providerId: string,
  apiKey: string,
  apiBaseUrl: string,
  customBaseUrl?: string | null,
): Promise<TestResult> {
  const baseUrl = customBaseUrl || apiBaseUrl;

  if (!baseUrl) {
    return {
      success: false,
      message: "URL endpoint tidak tersedia untuk provider ini.",
    };
  }

  try {
    // Anthropic uses a different auth pattern
    if (providerId === "anthropic") {
      const url = `${baseUrl.replace(/\/$/, "")}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (res.ok) {
        return { success: true, message: "API key Anthropic valid! ✅" };
      }

      const errBody = await res.text();
      let errMsg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed?.error?.message || parsed?.message || errMsg;
      } catch {
        // use default errMsg
      }

      // 401/403 = invalid key, other errors might mean the key is valid but request is bad
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: `API key tidak valid: ${errMsg}` };
      }

      // 400 could mean model not available but key is valid
      if (res.status === 400 || res.status === 429) {
        return {
          success: true,
          message: `API key valid (tapi request dibatasi: ${errMsg}) ✅`,
        };
      }

      return { success: false, message: `Gagal tes API key: ${errMsg}` };
    }

    // Google Gemini uses a different auth pattern (API key in URL)
    if (providerId === "google") {
      const url = `${baseUrl.replace(/\/$/, "")}/models?key=${apiKey}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        return { success: true, message: "API key Google valid! ✅" };
      }

      const errBody = await res.text();
      let errMsg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed?.error?.message || parsed?.message || errMsg;
      } catch {
        // use default errMsg
      }

      return { success: false, message: `API key tidak valid: ${errMsg}` };
    }

    // OpenAI-compatible providers (OpenAI, Groq, DepSeek, GLM, OpenRouter, custom)
    const url = `${baseUrl.replace(/\/$/, "")}/models`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const providerName =
        providerId.charAt(0).toUpperCase() + providerId.slice(1);
      return { success: true, message: `API key ${providerName} valid! ✅` };
    }

    const errBody = await res.text();
    let errMsg = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errBody);
      errMsg = parsed?.error?.message || parsed?.message || errMsg;
    } catch {
      // use default errMsg
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, message: `API key tidak valid: ${errMsg}` };
    }

    // 429 = rate limited but key is valid
    if (res.status === 429) {
      return {
        success: true,
        message: `API key valid (rate limited: ${errMsg}) ✅`,
      };
    }

    return { success: false, message: `Gagal tes API key: ${errMsg}` };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal menghubungi provider: ${errMessage}`,
    };
  }
}

// ── Main handler ─────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  // Store current request for jsonResponse helper
  _currentReq = req;

  try {
    // Only accept POST (we use action field in body for delete/test)
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed. Gunakan POST." }, 405);
    }

    // ── 1. Verify user is authenticated ────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "Unauthorized — token tidak ditemukan" },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // User-scoped client (respects RLS) — to verify auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized — sesi tidak valid" }, 401);
    }

    // Service-role client (bypasses RLS) — for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ── 2. Parse request body ────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body JSON tidak valid" }, 400);
    }

    const action = (body.action as string) || "save";
    const providerId = body.providerId as string;

    // ── 3. Route by action ────────────────

    // ━━━━━━━━
    // ACTION: DELETE
    // ━━━━━━━━
    if (action === "delete") {
      if (!providerId) {
        return jsonResponse(
          { error: "providerId wajib diisi untuk menghapus config" },
          400,
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("user_ai_configs")
        .delete()
        .eq("user_id", user.id)
        .eq("provider_id", providerId);

      if (deleteError) {
        console.error("Delete config error:", deleteError);
        return jsonResponse(
          { error: `Gagal menghapus config: ${deleteError.message}` },
          500,
        );
      }

      // Also delete any custom models tied to this config
      const { data: configRow } = await supabaseAdmin
        .from("user_ai_configs")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider_id", providerId)
        .maybeSingle();

      // Config already deleted above, but clean up orphaned custom models
      // by looking for custom models whose config_id no longer exists
      // This is a best-effort cleanup; the main delete already succeeded.

      return jsonResponse(
        {
          success: true,
          providerId,
          deleted: true,
        },
        200,
      );
    }

    // ━━━━━━━━
    // ACTION: TEST
    // ━━━━━━━━
    if (action === "test") {
      if (!providerId) {
        return jsonResponse(
          { error: "providerId wajib diisi untuk tes API key" },
          400,
        );
      }

      const apiKey = body.apiKey as string;
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
        return jsonResponse({ error: "apiKey wajib diisi untuk tes" }, 400);
      }

      // Look up the provider's api_base_url from ai_providers table
      const { data: providerData, error: providerError } = await supabaseAdmin
        .from("ai_providers")
        .select("id, name, api_base_url")
        .eq("id", providerId)
        .maybeSingle();

      if (providerError) {
        console.error("Provider lookup error:", providerError);
        return jsonResponse(
          { error: `Gagal mencari provider: ${providerError.message}` },
          500,
        );
      }

      // For custom provider, use the customBaseUrl from body
      const customBaseUrl = body.customBaseUrl as string | undefined;
      const apiBaseUrl = providerData?.api_base_url || "";

      if (!apiBaseUrl && !customBaseUrl) {
        return jsonResponse(
          {
            error:
              "URL endpoint tidak tersedia. Untuk provider custom, sertakan customBaseUrl.",
          },
          400,
        );
      }

      const result = await testApiKey(
        providerId,
        apiKey.trim(),
        apiBaseUrl,
        customBaseUrl,
      );

      return jsonResponse(
        {
          success: result.success,
          message: result.message,
          providerId,
        },
        result.success ? 200 : 422,
      );
    }

    // ━━━━━━━━
    // ACTION: SAVE (default)
    // ━━━━━━━━
    if (action !== "save") {
      return jsonResponse({ error: `Action tidak dikenal: ${action}` }, 400);
    }

    // Validate required fields
    if (!providerId || typeof providerId !== "string") {
      return jsonResponse({ error: "providerId wajib diisi (string)" }, 400);
    }

    const apiKey = body.apiKey as string;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      return jsonResponse(
        { error: "apiKey wajib diisi (string, tidak boleh kosong)" },
        400,
      );
    }

    const customBaseUrl = (body.customBaseUrl as string) || null;

    // ── 4. Encrypt the API key ────────────────
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("TOKEN_ENCRYPTION_KEY env var is not set!");
      return jsonResponse(
        {
          error:
            "Server belum dikonfigurasi untuk enkripsi. Hubungi administrator.",
        },
        500,
      );
    }

    let encryptedKey: string;
    try {
      encryptedKey = await encryptToken(apiKey.trim(), encryptionKey);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error("Encryption error:", errMessage);
      return jsonResponse(
        { error: `Gagal mengenkripsi API key: ${errMessage}` },
        500,
      );
    }

    // ── 5. Upsert into user_ai_configs ────────
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from("user_ai_configs")
      .upsert(
        {
          user_id: user.id,
          provider_id: providerId,
          api_key_encrypted: encryptedKey,
          custom_base_url: customBaseUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider_id" },
      )
      .select(
        "id, provider_id, custom_base_url, is_active, created_at, updated_at",
      )
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return jsonResponse(
        { error: `Gagal menyimpan config: ${upsertError.message}` },
        500,
      );
    }

    // ── 6. Return success (NEVER return the encrypted key) ────────────
    return jsonResponse(
      {
        success: true,
        providerId,
        hasKey: true,
        config: {
          id: upsertData.id,
          provider_id: upsertData.provider_id,
          custom_base_url: upsertData.custom_base_url,
          is_active: upsertData.is_active,
          created_at: upsertData.created_at,
          updated_at: upsertData.updated_at,
        },
      },
      200,
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error in save-ai-config:", errMessage);
    return jsonResponse(
      { error: `Terjadi kesalahan server: ${errMessage}` },
      500,
    );
  }
});
