// ============================================
// Supabase Edge Function: threads-insights
// Ambil daftar posting Threads + Media Insights, opsional simpan ke DB
// Deploy: supabase functions deploy threads-insights --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/crypto.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const GRAPH = "https://graph.threads.net/v1.0";
// views masih "in development" di Meta — fallback ke metrik tanpa views jika perlu
const INSIGHT_METRICS_FULL = "views,likes,replies,reposts,quotes";
const INSIGHT_METRICS_SAFE = "likes,replies,reposts,quotes";

type ThreadPost = {
  id: string;
  text?: string;
  timestamp?: string;
  media_type?: string;
  permalink?: string;
  link_attachment_url?: string;
};

function parseInsightsPayload(json: {
  data?: Array<Record<string, unknown>>;
}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of json.data || []) {
    const name = row.name as string | undefined;
    if (!name) continue;
    const vals = row.values as Array<{ value?: number }> | undefined;
    const tv = row.total_value as { value?: number } | undefined;
    const v = vals?.[0]?.value ?? tv?.value;
    if (typeof v === "number") out[name] = v;
  }
  return out;
}

/** Coba beberapa kombinasi field — beberapa app/API version menolak field tertentu */
const FIELD_SETS = [
  "id,text,timestamp,media_type,media_product_type,permalink,link_attachment_url",
  "id,text,timestamp,media_type,permalink,link_attachment_url",
  "id,text,timestamp,media_type,permalink",
  "id,text,permalink",
];

async function fetchThreadsListPage(url: string): Promise<{
  data: ThreadPost[];
  next: string | null;
  error?: { message?: string };
  ok: boolean;
  status: number;
  rawSnippet: string;
}> {
  const res = await fetch(url);
  const raw = await res.text();
  let json: {
    data?: ThreadPost[];
    paging?: { next?: string };
    error?: { message?: string };
  } = {};
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return {
      data: [],
      next: null,
      ok: false,
      status: res.status,
      rawSnippet: raw.slice(0, 300),
    };
  }
  const err = json.error;
  const ok = res.ok && !err;
  return {
    data: json.data || [],
    next: json.paging?.next ?? null,
    error: err,
    ok,
    status: res.status,
    rawSnippet: raw.slice(0, 200),
  };
}

async function fetchThreadsList(
  accessToken: string,
  threadsUserId: string,
  maxPosts: number,
): Promise<ThreadPost[]> {
  const enc = encodeURIComponent(accessToken);
  const candidates: string[] = [];

  for (const fields of FIELD_SETS) {
    const f = encodeURIComponent(fields);
    candidates.push(
      `${GRAPH}/me/threads?fields=${f}&limit=50&access_token=${enc}`,
    );
    if (threadsUserId && /^\d+$/.test(String(threadsUserId).trim())) {
      const uid = String(threadsUserId).trim();
      candidates.push(
        `${GRAPH}/${uid}/threads?fields=${f}&limit=50&access_token=${enc}`,
      );
    }
  }

  let lastError: string | null = null;

  for (const startUrl of candidates) {
    const items: ThreadPost[] = [];
    let url: string | null = startUrl;

    while (url && items.length < maxPosts) {
      const page = await fetchThreadsListPage(url);
      if (!page.ok) {
        lastError =
          page.error?.message || `HTTP ${page.status}: ${page.rawSnippet}`;
        break;
      }
      for (const item of page.data) {
        items.push(item);
        if (items.length >= maxPosts) break;
      }
      url = items.length < maxPosts && page.next ? page.next : null;
    }

    if (items.length > 0) return items.slice(0, maxPosts);
  }

  if (lastError) throw new Error(lastError);
  return [];
}

async function fetchMediaInsights(
  accessToken: string,
  mediaId: string,
): Promise<Record<string, number>> {
  const enc = encodeURIComponent(accessToken);
  for (const metric of [
    INSIGHT_METRICS_FULL,
    INSIGHT_METRICS_SAFE,
    "likes,replies",
  ]) {
    const url = `${GRAPH}/${mediaId}/insights?metric=${metric}&access_token=${enc}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      error?: { message?: string };
    };
    if (res.ok && !json.error) {
      const parsed = parseInsightsPayload(json);
      if (Object.keys(parsed).length > 0 || metric === "likes,replies")
        return parsed;
    }
  }
  return {};
}

type LinkClickRow = { link_url?: string; value?: number };

async function fetchUserLinkClicks(
  accessToken: string,
  threadsUserId: string,
  since: number,
  until: number,
): Promise<LinkClickRow[]> {
  const uid = String(threadsUserId).trim();
  if (!/^\d+$/.test(uid)) return [];
  const url = `${GRAPH}/${uid}/threads_insights?metric=clicks&since=${since}&until=${until}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    data?: Array<{ link_total_values?: LinkClickRow[] }>;
    error?: { message?: string };
  };
  if (!res.ok || json.error) {
    console.warn(
      "[threads-insights] threads_insights clicks:",
      json.error?.message || res.status,
    );
    return [];
  }
  const first = json.data?.[0];
  return first?.link_total_values || [];
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const accountId = body.accountId as string | undefined;
    const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 50);
    const save = Boolean(body.save);
    const includeAccountClicks = body.includeAccountClicks !== false;

    let query = supabase
      .from("connected_accounts")
      .select("id, access_token_encrypted, platform_user_id, platform_username")
      .eq("user_id", user.id)
      .eq("platform", "threads")
      .eq("status", "active");

    if (accountId) {
      query = query.eq("id", accountId);
    }

    const { data: accounts, error: accErr } = await query;

    if (accErr || !accounts?.length) {
      return new Response(
        JSON.stringify({
          error:
            "Tidak ada akun Threads aktif. Hubungkan di Pengaturan → Akun Terhubung.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const acc = accounts[0];
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY")!;

    let token: string;
    try {
      token = await decryptToken(acc.access_token_encrypted, encryptionKey);
    } catch (decryptErr) {
      const msg =
        decryptErr instanceof Error
          ? decryptErr.message
          : "Gagal mendekripsi token";
      console.error("[threads-insights] Token decryption failed:", msg);
      return new Response(
        JSON.stringify({
          error: msg,
          reconnect: true,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const threadsUserId = (acc.platform_user_id || "").trim();

    const posts = await fetchThreadsList(token, threadsUserId, limit);

    const enriched: Array<ThreadPost & { metrics: Record<string, number> }> =
      [];
    for (const p of posts) {
      const metrics = await fetchMediaInsights(token, p.id);
      enriched.push({ ...p, metrics });
      await new Promise((r) => setTimeout(r, 120));
    }

    let accountLinkClicks: LinkClickRow[] = [];
    if (includeAccountClicks && threadsUserId) {
      const until = Math.floor(Date.now() / 1000);
      const since = until - 7 * 24 * 3600;
      try {
        accountLinkClicks = await fetchUserLinkClicks(
          token,
          threadsUserId,
          since,
          until,
        );
      } catch (e) {
        console.warn("[threads-insights] account clicks skipped:", e);
      }
    }

    if (save && enriched.length > 0) {
      const rows = enriched.map((p) => ({
        user_id: user.id,
        connected_account_id: acc.id,
        platform_post_id: p.id,
        post_text: p.text ?? null,
        permalink: p.permalink ?? null,
        link_attachment_url: p.link_attachment_url ?? null,
        media_type: p.media_type ?? null,
        metrics: p.metrics,
        fetched_at: new Date().toISOString(),
      }));

      const { error: upErr } = await supabase
        .from("threads_post_insights")
        .upsert(rows, {
          onConflict: "connected_account_id,platform_post_id",
        });
      if (upErr) {
        console.error("[threads-insights] upsert:", upErr);
        return new Response(
          JSON.stringify({
            error: `Gagal menyimpan ke database: ${upErr.message}. Cek migrasi 010 & constraint unique.`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        accountId: acc.id,
        username: acc.platform_username,
        posts: enriched,
        accountLinkClicks,
        fetchedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[threads-insights]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
