// ================================
// Supabase Edge Function: generate-content
// Multi-provider AI content generation
// Supports: Groq (built-in), OpenAI, Anthropic, Google Gemini, OpenRouter, Custom
// ============================================
// Deploy: supabase functions deploy generate-content --no-verify-jwt
// Set secrets:
//   supabase secrets set GROQ_API_KEY=your-key-here
//   supabase secrets set TOKEN_ENCRYPTION_KEY=your-64-hex-char-key
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/crypto.ts";

// ── Constants ────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Legacy allowed models for backward compatibility (Groq-only flow)
const LEGACY_ALLOWED_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
] as const;
type LegacyModel = (typeof LEGACY_ALLOWED_MODELS)[number];

const FALLBACK_MODEL: LegacyModel = "llama-3.1-8b-instant";
const PRIMARY_MODEL: LegacyModel = "llama-3.3-70b-versatile";

// ── Types ────────────────────────────────

interface ProviderConfig {
  id: string;
  name: string;
  api_base_url: string;
  is_openai_compatible: boolean;
  auth_header: string;
  auth_prefix: string;
  requires_user_key: boolean;
}

interface ModelConfig {
  model_id: string;
  provider_id: string;
  context_window: number | null;
  max_output_tokens: number | null;
  supports_json_mode: boolean;
}

interface AICallResult {
  content: string;
  tokensUsed: number;
}

// ── Helpers ────────────────────────────────

// jsonResponse needs access to the current request for dynamic CORS headers
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

/**
 * Get the first day of the current month as a DATE string (YYYY-MM-DD)
 * matching the `month DATE` column in usage_monthly.
 */
function getCurrentMonthDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Validate the incoming request body and return an error message if invalid.
 * When a custom provider/model is specified, we skip legacy model validation.
 */
function validateInput(body: {
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  provider?: string;
  modelId?: string;
  customModelId?: string;
}): string | null {
  const {
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    model,
    provider,
    modelId,
    customModelId,
  } = body;

  if (!systemPrompt || !userPrompt) {
    return "systemPrompt and userPrompt are required";
  }

  if (typeof systemPrompt !== "string" || systemPrompt.length > 10000) {
    return "systemPrompt harus berupa string dengan maksimal 10.000 karakter";
  }

  if (typeof userPrompt !== "string" || userPrompt.length > 60000) {
    return "userPrompt harus berupa string dengan maksimal 60.000 karakter";
  }

  if (temperature !== undefined) {
    if (
      typeof temperature !== "number" ||
      temperature < 0.0 ||
      temperature > 2.0
    ) {
      return "temperature harus antara 0.0 dan 2.0";
    }
  }

  if (maxTokens !== undefined) {
    if (
      typeof maxTokens !== "number" ||
      !Number.isInteger(maxTokens) ||
      maxTokens < 1 ||
      maxTokens > 65536
    ) {
      return "maxTokens harus berupa integer antara 1 dan 65536";
    }
  }

  // If a custom provider or model is specified, skip legacy model validation
  const isCustomFlow = provider || modelId || customModelId;

  if (!isCustomFlow && model !== undefined) {
    if (!LEGACY_ALLOWED_MODELS.includes(model as LegacyModel)) {
      return `model harus salah satu dari: ${LEGACY_ALLOWED_MODELS.join(", ")}`;
    }
  }

  return null;
}

// ── Provider-specific API call helpers ────────

/**
 * Call an OpenAI-compatible API (Groq, OpenAI, OpenRouter, custom endpoints).
 */
async function callOpenAICompatible(
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
  authHeader: string = "Authorization",
  authPrefix: string = "Bearer",
): Promise<AICallResult> {
  const baseUrl = apiBaseUrl.endsWith("/")
    ? apiBaseUrl.slice(0, -1)
    : apiBaseUrl;
  const url = baseUrl + "/chat/completions";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authPrefix) {
    headers[authHeader] = `${authPrefix} ${apiKey}`;
  } else {
    headers[authHeader] = apiKey;
  }

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const tokensUsed = data.usage?.total_tokens || 0;

  return { content, tokensUsed };
}

/**
 * Call the Anthropic Messages API.
 * Anthropic uses a different format from OpenAI.
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  _jsonMode: boolean,
): Promise<AICallResult> {
  // Extract system prompt from messages (Anthropic uses a separate 'system' field)
  let systemPrompt = "";
  const userMessages: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
    } else {
      userMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // If json mode requested, add instruction to system prompt
  if (_jsonMode && systemPrompt) {
    systemPrompt +=
      "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no extra text.";
  }

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: userMessages,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();

  // Anthropic returns content as an array of content blocks
  let content = "";
  if (data.content && Array.isArray(data.content)) {
    content = data.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("");
  }

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const tokensUsed = inputTokens + outputTokens;

  return { content, tokensUsed };
}

/**
 * Call the Google Gemini API.
 * Uses the generateContent endpoint with API key as query parameter.
 */
async function callGemini(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<AICallResult> {
  // Combine system prompt and user prompt into a single content block
  // Gemini uses a different structure: contents[] with parts[]
  let systemPrompt = "";
  let userPrompt = "";

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt += (systemPrompt ? "\n" : "") + msg.content;
    } else {
      userPrompt += (userPrompt ? "\n\n" : "") + msg.content;
    }
  }

  const combinedText = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
  };

  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: combinedText }],
        },
      ],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();

  // Gemini returns candidates[].content.parts[].text
  let content = "";
  if (data.candidates && data.candidates[0]?.content?.parts) {
    content = data.candidates[0].content.parts
      .map((part: { text?: string }) => part.text || "")
      .join("");
  }

  // Gemini usage metadata
  const promptTokens = data.usageMetadata?.promptTokenCount || 0;
  const candidateTokens = data.usageMetadata?.candidatesTokenCount || 0;
  const tokensUsed = promptTokens + candidateTokens;

  return { content, tokensUsed };
}

/**
 * Call the legacy Groq API directly (backward compatible).
 * Returns the raw fetch Response for fallback handling.
 */
async function callGroqRaw(
  groqApiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<Response> {
  return await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
}

// ── Resolve model configuration ────────────────

interface ResolvedModel {
  providerId: string;
  modelId: string; // actual model identifier to send to API
  providerConfig: ProviderConfig;
  apiKey: string;
  apiBaseUrl: string; // may be overridden for custom provider
  maxOutputTokens: number | null;
  supportsJsonMode: boolean;
}

/**
 * Resolve the provider, model, and API key based on request parameters.
 * Looks up from ai_providers, ai_models, user_ai_configs, user_custom_models.
 */
async function resolveModelConfig(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  provider?: string,
  modelId?: string,
  customModelId?: string,
): Promise<ResolvedModel> {
  // ── Case 1: Custom model by UUID ──
  if (customModelId) {
    const { data: customModel, error: cmErr } = await supabaseAdmin
      .from("user_custom_models")
      .select(
        `
        id, model_id, supports_json_mode, max_output_tokens,
        config_id,
        user_ai_configs!inner (
          id, provider_id, api_key_encrypted, custom_base_url, is_active,
          ai_providers!inner (
            id, name, api_base_url, is_openai_compatible,
            auth_header, auth_prefix, requires_user_key
          )
        )
      `,
      )
      .eq("id", customModelId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (cmErr || !customModel) {
      throw new Error("Custom model tidak ditemukan atau tidak aktif.");
    }

    // Navigate the joined data
    const config = customModel.user_ai_configs as unknown as {
      id: string;
      provider_id: string;
      api_key_encrypted: string | null;
      custom_base_url: string | null;
      is_active: boolean;
      ai_providers: ProviderConfig;
    };

    if (!config.is_active) {
      throw new Error(
        "Konfigurasi provider untuk custom model ini tidak aktif.",
      );
    }

    const providerConfig = config.ai_providers;
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? "";
    let apiKey = "";

    if (config.api_key_encrypted) {
      apiKey = await decryptToken(config.api_key_encrypted, encryptionKey);
    }

    // For custom provider, use user's custom_base_url
    const apiBaseUrl = config.custom_base_url || providerConfig.api_base_url;

    return {
      providerId: providerConfig.id,
      modelId: customModel.model_id,
      providerConfig,
      apiKey,
      apiBaseUrl,
      maxOutputTokens: customModel.max_output_tokens,
      supportsJsonMode: customModel.supports_json_mode,
    };
  }

  // ── Case 2: Preset model by provider + modelId or just modelId ──

  // If modelId is provided, look it up in ai_models
  if (modelId) {
    const { data: presetModel, error: pmErr } = await supabaseAdmin
      .from("ai_models")
      .select(
        `
        id, model_id, provider_id, max_output_tokens, supports_json_mode,
        ai_providers!inner (
          id, name, api_base_url, is_openai_compatible,
          auth_header, auth_prefix, requires_user_key
        )
      `,
      )
      .eq("id", modelId)
      .eq("is_active", true)
      .maybeSingle();

    if (pmErr || !presetModel) {
      throw new Error(`Model '${modelId}' tidak ditemukan atau tidak aktif.`);
    }

    const providerConfig =
      presetModel.ai_providers as unknown as ProviderConfig;
    let apiKey = "";

    if (providerConfig.requires_user_key) {
      // Fetch user's API key for this provider
      const { data: userConfig, error: ucErr } = await supabaseAdmin
        .from("user_ai_configs")
        .select("api_key_encrypted, custom_base_url, is_active")
        .eq("user_id", userId)
        .eq("provider_id", providerConfig.id)
        .eq("is_active", true)
        .maybeSingle();

      if (ucErr || !userConfig || !userConfig.api_key_encrypted) {
        throw new Error(
          `API key untuk provider '${providerConfig.name}' belum dikonfigurasi. ` +
            `Silakan tambahkan API key di Pengaturan → AI Models.`,
        );
      }

      const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? "";
      apiKey = await decryptToken(userConfig.api_key_encrypted, encryptionKey);
    } else if (providerConfig.id === "groq") {
      // Groq uses built-in key
      apiKey = Deno.env.get("GROQ_API_KEY") ?? "";
      if (!apiKey) {
        throw new Error("GROQ_API_KEY not configured on server.");
      }
    }

    return {
      providerId: providerConfig.id,
      modelId: presetModel.model_id,
      providerConfig,
      apiKey,
      apiBaseUrl: providerConfig.api_base_url,
      maxOutputTokens: presetModel.max_output_tokens,
      supportsJsonMode: presetModel.supports_json_mode,
    };
  }

  // ── Case 3: Provider specified without modelId — use provider's first active model ──
  if (provider) {
    const { data: providerData, error: provErr } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .eq("id", provider)
      .eq("is_active", true)
      .maybeSingle();

    if (provErr || !providerData) {
      throw new Error(
        `Provider '${provider}' tidak ditemukan atau tidak aktif.`,
      );
    }

    // Get the first active model for this provider
    const { data: firstModel, error: fmErr } = await supabaseAdmin
      .from("ai_models")
      .select("id, model_id, max_output_tokens, supports_json_mode")
      .eq("provider_id", provider)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fmErr || !firstModel) {
      throw new Error(
        `Tidak ada model aktif untuk provider '${providerData.name}'.`,
      );
    }

    const providerConfig = providerData as ProviderConfig;
    let apiKey = "";

    if (providerConfig.requires_user_key) {
      const { data: userConfig, error: ucErr } = await supabaseAdmin
        .from("user_ai_configs")
        .select("api_key_encrypted, custom_base_url, is_active")
        .eq("user_id", userId)
        .eq("provider_id", providerConfig.id)
        .eq("is_active", true)
        .maybeSingle();

      if (ucErr || !userConfig || !userConfig.api_key_encrypted) {
        throw new Error(
          `API key untuk provider '${providerConfig.name}' belum dikonfigurasi. ` +
            `Silakan tambahkan API key di Pengaturan → AI Models.`,
        );
      }

      const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? "";
      apiKey = await decryptToken(userConfig.api_key_encrypted, encryptionKey);
    } else if (providerConfig.id === "groq") {
      apiKey = Deno.env.get("GROQ_API_KEY") ?? "";
      if (!apiKey) {
        throw new Error("GROQ_API_KEY not configured on server.");
      }
    }

    return {
      providerId: providerConfig.id,
      modelId: firstModel.model_id,
      providerConfig,
      apiKey,
      apiBaseUrl: providerConfig.api_base_url,
      maxOutputTokens: firstModel.max_output_tokens,
      supportsJsonMode: firstModel.supports_json_mode,
    };
  }

  // Should not reach here — caller should check before calling
  throw new Error("No provider, modelId, or customModelId specified.");
}

/**
 * Route the AI call to the correct provider-specific helper.
 */
async function callProvider(
  resolved: ResolvedModel,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<AICallResult> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Cap maxTokens to model's max_output_tokens if known
  if (resolved.maxOutputTokens && maxTokens > resolved.maxOutputTokens) {
    maxTokens = resolved.maxOutputTokens;
  }

  // Determine json mode support
  const useJsonMode = jsonMode && resolved.supportsJsonMode;

  switch (resolved.providerId) {
    case "anthropic":
      return await callAnthropic(
        resolved.apiKey,
        resolved.modelId,
        messages,
        temperature,
        maxTokens,
        useJsonMode,
      );

    case "google":
      return await callGemini(
        resolved.apiKey,
        resolved.modelId,
        messages,
        temperature,
        maxTokens,
        useJsonMode,
      );

    case "groq":
    case "openai":
    case "openrouter":
    case "custom":
    default:
      // All OpenAI-compatible providers
      return await callOpenAICompatible(
        resolved.apiBaseUrl,
        resolved.apiKey,
        resolved.modelId,
        messages,
        temperature,
        maxTokens,
        useJsonMode,
        resolved.providerConfig.auth_header,
        resolved.providerConfig.auth_prefix,
      );
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
    // ── 1. Verify user is authenticated ────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // User-scoped client (respects RLS)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Service-role client (bypasses RLS) for usage queries & provider lookups
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ── 2. Parse & validate request body ────────────────
    const body = await req.json();
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.8,
      maxTokens = 2000,
      model,
      // New multi-provider parameters
      provider,
      modelId,
      customModelId,
    } = body;

    const validationError = validateInput({
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
      model,
      provider,
      modelId,
      customModelId,
    });
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    // Determine if this is a multi-provider request or legacy Groq-only
    const isMultiProviderRequest = Boolean(
      provider || modelId || customModelId,
    );

    // ── 3. Usage quota check ────────────────────────
    const currentMonth = getCurrentMonthDate();

    const { data: usageData, error: usageError } = await supabaseAdmin
      .from("usage_monthly")
      .select("generation_count, generation_limit")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    if (usageError) {
      console.error("Usage query error:", usageError);
      return jsonResponse({ error: "Gagal mengecek kuota usage" }, 500);
    }

    // If a row exists, check the quota. If no row exists the user hasn't
    // used anything this month yet — increment_usage will create the row.
    if (usageData) {
      const { generation_count, generation_limit } = usageData;
      if (generation_count >= generation_limit) {
        return jsonResponse(
          {
            error:
              "Kuota AI generation bulan ini sudah habis. Upgrade ke plan Creator untuk unlimited.",
            usage: { count: generation_count, limit: generation_limit },
          },
          429,
        );
      }
    }

    // ── 4. Call AI provider ───────────────────────

    let content: string;
    let tokensUsed: number;
    let usedModel: string;
    let usedProvider: string;
    let didFallback = false;

    if (isMultiProviderRequest) {
      // ── Multi-provider flow ──
      try {
        const resolved = await resolveModelConfig(
          supabaseAdmin,
          user.id,
          provider,
          modelId,
          customModelId,
        );

        const result = await callProvider(
          resolved,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          true, // jsonMode — always request JSON for content generation
        );

        content = result.content;
        tokensUsed = result.tokensUsed;
        usedModel = resolved.modelId;
        usedProvider = resolved.providerId;
      } catch (providerError) {
        console.error("Multi-provider call error:", providerError);
        const errMessage =
          providerError instanceof Error
            ? providerError.message
            : "Unknown provider error";
        return jsonResponse(
          {
            error: `AI provider error: ${errMessage}`,
            provider: provider || "unknown",
          },
          502,
        );
      }
    } else {
      // ── Legacy Groq-only flow (backward compatible) ──
      const groqApiKey = Deno.env.get("GROQ_API_KEY");
      if (!groqApiKey) {
        return jsonResponse({ error: "GROQ_API_KEY not configured" }, 500);
      }

      const requestedModel: LegacyModel =
        (model as LegacyModel) || PRIMARY_MODEL;

      let groqRes = await callGroqRaw(
        groqApiKey,
        requestedModel,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      );

      usedModel = requestedModel;
      usedProvider = "groq";

      // If Groq returns 429 and we were using the primary model, retry with fallback
      if (groqRes.status === 429 && requestedModel === PRIMARY_MODEL) {
        console.warn(
          `Groq rate limited on ${PRIMARY_MODEL}, falling back to ${FALLBACK_MODEL}`,
        );
        groqRes = await callGroqRaw(
          groqApiKey,
          FALLBACK_MODEL,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
        );
        usedModel = FALLBACK_MODEL;
        didFallback = true;
      }

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return jsonResponse(
          { error: `Groq API error: ${groqRes.status}`, details: errText },
          groqRes.status,
        );
      }

      const data = await groqRes.json();
      content = data.choices[0].message.content;
      tokensUsed = data.usage?.total_tokens || 0;
    }

    // ── 5. Increment usage after successful generation ───
    const { error: incrementError } = await supabaseAdmin.rpc(
      "increment_usage",
      {
        p_user_id: user.id,
        p_month: currentMonth,
      },
    );

    if (incrementError) {
      // Log but don't fail the request — the user already got their content
      console.error("Failed to increment usage:", incrementError);
    }

    // ── 6. Return result ────────────────
    const responseBody: Record<string, unknown> = {
      content,
      tokensUsed,
      model: usedModel,
      provider: usedProvider,
    };
    if (didFallback) {
      responseBody.fallback = true;
    }

    return jsonResponse(responseBody, 200);
  } catch (err) {
    console.error("generate-content error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
