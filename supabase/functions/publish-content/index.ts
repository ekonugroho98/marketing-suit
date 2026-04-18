// ============================================
// Supabase Edge Function: publish-content
// Support: Threads single post (dengan optional replyToId)
// ============================================
// Deploy: supabase functions deploy publish-content --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/crypto.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// -----------------------------------------------------------
// Buat satu container Threads dan publish, return postId
// -----------------------------------------------------------
async function createAndPublishThreadsPost(
  accessToken: string,
  platformUserId: string,
  text: string,
  mediaUrls: string[],
  replyToId?: string,
): Promise<string> {
  const firstMedia = mediaUrls?.[0] ?? null;
  let mediaType = "TEXT";
  if (firstMedia) {
    const isVideo = /\.(mp4|mov|avi|webm)(\?|$)/i.test(firstMedia);
    mediaType = isVideo ? "VIDEO" : "IMAGE";
  }

  const containerBody: Record<string, string> = {
    media_type: mediaType,
    text,
    access_token: accessToken,
  };
  if (firstMedia && mediaType === "IMAGE") containerBody.image_url = firstMedia;
  if (firstMedia && mediaType === "VIDEO") containerBody.video_url = firstMedia;
  if (replyToId) containerBody.reply_to_id = replyToId;

  console.log(
    `[threads] Creating container: media_type=${mediaType}, reply_to_id=${replyToId || "NONE"}, text_len=${text.length}`,
  );

  const containerRes = await fetch(
    `https://graph.threads.net/v1.0/${platformUserId}/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(containerBody).toString(),
    },
  );

  const containerRaw = await containerRes.text();
  console.log(
    `[threads] Container response (${containerRes.status}): ${containerRaw}`,
  );

  if (!containerRes.ok) {
    throw new Error(
      `Gagal membuat container (${containerRes.status}): ${containerRaw}`,
    );
  }

  const { id: creationId } = JSON.parse(containerRaw) as { id: string };

  // Tunggu container siap (status = FINISHED)
  console.log(`[threads] Polling status for container ${creationId}...`);
  await new Promise((r) => setTimeout(r, 3000)); // initial wait

  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusRes = await fetch(
      `https://graph.threads.net/v1.0/${creationId}?fields=status,id&access_token=${accessToken}`,
    );
    const statusData = (await statusRes.json()) as {
      status?: string;
      error?: unknown;
    };
    console.log(
      `[threads] Status check #${attempt}: ${JSON.stringify(statusData)}`,
    );

    if (statusData.status === "FINISHED") break;
    if (statusData.status === "ERROR")
      throw new Error(`Container gagal diproses`);
    if (attempt === maxAttempts)
      console.log(`[threads] Max attempts reached, trying to publish anyway`);

    await new Promise((r) => setTimeout(r, 2000));
  }

  // Publish container
  console.log(`[threads] Publishing container: ${creationId}`);
  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${platformUserId}/threads_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      }).toString(),
    },
  );

  const publishRaw = await publishRes.text();
  console.log(
    `[threads] Publish response (${publishRes.status}): ${publishRaw}`,
  );

  if (!publishRes.ok) {
    throw new Error(
      `Gagal publish ke Threads (${publishRes.status}): ${publishRaw}`,
    );
  }

  const { id: postId } = JSON.parse(publishRaw) as { id: string };
  console.log(`[threads] Published: postId=${postId}`);
  return postId;
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

    const body = await req.json();
    const { accounts, mediaUrls = [], hashtags = [] } = body;

    console.log(
      `[publish] accounts=${accounts?.length}, mediaUrls=${mediaUrls.length}`,
    );
    for (const a of accounts || []) {
      console.log(
        `[publish] account: ${a.platform}/${a.username}, caption_len=${a.caption?.length}, replyToId=${a.replyToId || "NONE"}`,
      );
    }

    if (!accounts?.length) {
      return new Response(
        JSON.stringify({ error: "Minimal satu akun harus dipilih" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results = [];

    for (const account of accounts) {
      // replyToId: untuk thread chain, dikirim dari frontend per bagian
      const { accountId, platform, username, caption, replyToId } = account;
      try {
        const { data: acc, error: accErr } = await supabase
          .from("connected_accounts")
          .select("access_token_encrypted, platform_user_id, platform_username")
          .eq("id", accountId)
          .eq("user_id", user.id)
          .single();

        if (accErr || !acc?.access_token_encrypted) {
          results.push({
            accountId,
            platform,
            username,
            status: "failed",
            error: "Akun tidak ditemukan",
          });
          continue;
        }

        // Decrypt the stored OAuth token
        let decryptedAccessToken: string;
        try {
          decryptedAccessToken = await decryptToken(
            acc.access_token_encrypted,
            Deno.env.get("TOKEN_ENCRYPTION_KEY")!,
          );
        } catch (decryptErr) {
          const decryptMsg =
            decryptErr instanceof Error
              ? decryptErr.message
              : "Gagal mendekripsi token";
          console.error(
            `[publish] Token decryption failed for ${platform}/${username}:`,
            decryptMsg,
          );
          results.push({
            accountId,
            platform,
            username,
            status: "failed",
            error: decryptMsg,
          });
          continue;
        }

        const tagStr =
          hashtags.length > 0
            ? "\n\n" +
              hashtags.map((h: string) => `#${h.replace("#", "")}`).join(" ")
            : "";
        const fullCaption = caption + tagStr;

        let postId = "",
          postUrl = "";

        if (platform === "threads") {
          postId = await createAndPublishThreadsPost(
            decryptedAccessToken,
            acc.platform_user_id || acc.platform_username,
            fullCaption,
            mediaUrls,
            replyToId, // undefined untuk post pertama, postId sebelumnya untuk reply
          );
          postUrl = `https://www.threads.net/t/${postId}`;
        } else {
          results.push({
            accountId,
            platform,
            username,
            status: "failed",
            error: `Platform ${platform} belum didukung`,
          });
          continue;
        }

        // Simpan ke history (hanya untuk post pertama / root post)
        if (!replyToId) {
          try {
            const { error: histErr } = await supabase
              .from("publish_history")
              .insert({
                user_id: user.id,
                platform,
                platform_post_id: postId,
                published_url: postUrl,
                status: "published",
                payload: { caption, mediaUrls, accountId },
                published_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
            if (histErr)
              console.error("[publish] History insert error:", histErr);
          } catch (e) {
            console.error("[publish] History insert exception:", e);
          }
        }

        results.push({
          accountId,
          platform,
          username,
          status: "success",
          postId,
          postUrl,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[publish] ${platform}/${username}:`, msg);
        results.push({
          accountId,
          platform,
          username,
          status: "failed",
          error: msg,
        });
      }
    }

    console.log(`[publish] Done:`, JSON.stringify(results));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
