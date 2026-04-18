import { supabase, isConfigured } from "./supabase";
import { invokeEdgeFunction } from "./edgeFunctions";

// ============================================
// AI Service — with Supabase Edge Function proxy
// ============================================
// PRODUCTION: Calls Supabase Edge Function (API key stays server-side)
// DEV/DEMO:   Falls back to direct Groq call if Edge Function not available
// ============================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

// --- Clean JSON from markdown code blocks and other wrappers ---
export function cleanJsonResponse(raw) {
  if (!raw || typeof raw !== "string") return raw;

  let cleaned = raw.trim();

  // Strategy 0: Replace smart/curly quotes with standard quotes
  cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  cleaned = cleaned.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

  // Strategy 1: Line-by-line backtick removal
  // Split into lines, remove lines that are just backticks (with optional language tag)
  const lines = cleaned.split("\n");
  const filteredLines = [];
  let insideCodeBlock = false;
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Match opening ``` or ```json or ```JSON etc.
    if (/^`{3,}\s*(?:json|JSON|javascript|JS)?$/i.test(trimmedLine)) {
      insideCodeBlock = !insideCodeBlock;
      continue; // skip the backtick line itself
    }
    filteredLines.push(line);
  }
  cleaned = filteredLines.join("\n").trim();

  // Strategy 2: Greedy regex for code blocks (handles various formats)
  // Matches ```json\n..\n``` or ```\n...\n``` with gredy inner match
  const greedyMatch = cleaned.match(/^`{3,}[^\n]*\n([\s\S]+)\n\s*`{3,}\s*$/);
  if (greedyMatch) {
    cleaned = greedyMatch[1].trim();
  }

  // Strategy 3: If still starts with ``` remove them
  if (cleaned.startsWith("```")) {
    // Remove first line (```json or similar)
    cleaned = cleaned.replace(/^`{3,}[^\n]*\n?/, "");
    // Remove trailing ```
    cleaned = cleaned.replace(/\n?\s*`{3,}\s*$/, "");
    cleaned = cleaned.trim();
  }

  // Strategy 4: Extract JSON object/array from surrounding text
  // Find the first { or [ and the last matching } or ]
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    // Find first JSON start
    const objStart = cleaned.indexOf("{");
    const arrStart = cleaned.indexOf("[");
    let jsonStart = -1;
    if (objStart === -1) jsonStart = arrStart;
    else if (arrStart === -1) jsonStart = objStart;
    else jsonStart = Math.min(objStart, arrStart);

    if (jsonStart !== -1) {
      const startChar = cleaned[jsonStart];
      const endChar = startChar === "{" ? "}" : "]";
      const jsonEnd = cleaned.lastIndexOf(endChar);
      if (jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }
    }
  }

  return cleaned;
}

// --- Attempt to repair truncated JSON (unclosed brackets/braces) ---
function repairTruncatedJson(str) {
  if (!str || typeof str !== "string") return str;

  let cleaned = str.trim();

  // Remove trailing comma if present (common in truncated arrays/objects)
  cleaned = cleaned.replace(/,\s*$/, "");

  // Remove incomplete key-value pair at the end (e.g., "key": "unterminated...)
  // Match trailing incomplete string value
  cleaned = cleaned.replace(/,?\s*"[^"]*":\s*"[^"]*$/, "");
  // Match trailing incomplete key
  cleaned = cleaned.replace(/,?\s*"[^"]*$/, "");

  // Count unclosed brackets and braces
  const opens = { "{": 0, "[": 0 };
  const closeMap = { "{": "}", "[": "]" };
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      if (stack.length > 0) {
        stack.pop();
      }
    }
  }

  // If we're still inside a string, close it
  if (inString) {
    cleaned += '"';
  }

  // Close all unclosed brackets/braces in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    // Remove trailing comma before closing
    cleaned = cleaned.replace(/,\s*$/, "");
    cleaned += closeMap[open];
  }

  return cleaned;
}

// --- Safely parse AI response content as JSON ---
function parseAIContent(raw) {
  if (!raw) return { text: "" };

  // If already an object, return as-is
  if (typeof raw === "object") return raw;

  // Clean markdown wrappers and try to parse
  const cleaned = cleanJsonResponse(raw);

  console.log("[parseAIContent] raw length:", raw.length);
  console.log(
    "[parseAIContent] raw starts with:",
    JSON.stringify(raw.substring(0, 30)),
  );
  console.log("[parseAIContent] cleaned length:", cleaned.length);
  console.log(
    "[parseAIContent] cleaned starts with:",
    JSON.stringify(cleaned.substring(0, 30)),
  );

  // Try parsing the cleaned version
  try {
    const parsed = JSON.parse(cleaned);
    console.log(
      "[parseAIContent] JSON.parse SUCCESS, keys:",
      Object.keys(parsed),
    );
    return parsed;
  } catch (e1) {
    console.warn("[parseAIContent] JSON.parse FAILED on cleaned:", e1.message);

    // Try more aggressive extraction: find outermost { ... }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        const parsed2 = JSON.parse(extracted);
        console.log(
          "[parseAIContent] Brace extraction SUCCESS, keys:",
          Object.keys(parsed2),
        );
        return parsed2;
      } catch (e2) {
        console.warn(
          "[parseAIContent] Brace extraction also FAILED:",
          e2.message,
        );
      }
    }

    // Try to repair truncated JSON (unclosed brackets/braces from max_tokens cutoff)
    try {
      const repaired = repairTruncatedJson(cleaned);
      const parsed3 = JSON.parse(repaired);
      console.log(
        "[parseAIContent] Truncated JSON REPAIRED, keys:",
        Object.keys(parsed3),
      );
      return parsed3;
    } catch (e3) {
      console.warn("[parseAIContent] JSON repair also FAILED:", e3.message);
    }

    // Return cleaned text (not raw) so normalizer has a better chance
    console.warn("[parseAIContent] Falling back to { text: cleaned }");
    return { text: cleaned };
  }
}

// --- Check if a URL is a local/private endpoint ---
function isLocalUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

// --- In-memory cache + localStorage persistence ---
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const LS_CACHE_KEY = "karaya_ai_cache";
const MAX_CACHE_ENTRIES = 50;

const memoryCache = new Map();

function loadCacheFromStorage() {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw);
    const now = Date.now();
    for (const [key, value] of entries) {
      if (now - value.timestamp < CACHE_TTL) {
        memoryCache.set(key, value);
      }
    }
  } catch {
    // localStorage not available or corrupted — ignore
  }
}

function saveCacheToStorage() {
  try {
    const entries = [...memoryCache.entries()]
      .filter(([, v]) => Date.now() - v.timestamp < CACHE_TTL)
      .slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or not available — ignore
  }
}

// Load persisted cache on module init
loadCacheFromStorage();

function getCacheKey(params) {
  return JSON.stringify(params);
}

// --- Rate limiting (max 2 concurrent requests) ---
let activeRequests = 0;
const MAX_CONCURRENT = 2;
const requestQueue = [];

function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      activeRequests++;
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    if (activeRequests < MAX_CONCURRENT) {
      execute();
    } else {
      requestQueue.push(execute);
    }
  });
}

function processQueue() {
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = requestQueue.shift();
    next();
  }
}

// --- Main generate function ---
export async function generateContent({
  systemPrompt,
  userPrompt,
  temperature = 0.8,
  maxTokens = 4096,
  provider, // optional: provider ID (e.g. 'groq', 'openai', 'anthropic')
  modelId, // optional: specific model ID (e.g. 'gpt-4o', 'llama-3.3-70b-versatile')
  customModelId, // optional: custom model UUID from user_custom_models
  customBaseUrl, // optional: base URL for custom/local endpoint
  customApiKey, // optional: API key for custom endpoint (plaintext, for direct calls)
}) {
  const cacheKey = getCacheKey({
    systemPrompt,
    userPrompt,
    temperature,
    provider,
    modelId,
  });
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { data: cached.data, error: null };
  }

  try {
    const result = await enqueueRequest(async () => {
      // Double-check cache after waiting in queue
      const cachedAgain = memoryCache.get(cacheKey);
      if (cachedAgain && Date.now() - cachedAgain.timestamp < CACHE_TTL) {
        return cachedAgain.data;
      }

      // Determine which model to use:
      // 1. Explicit modelId from caller (user preference)
      // 2. Default PRIMARY_MODEL (Groq llama-3.3-70b)
      let model = modelId || PRIMARY_MODEL;
      let response;

      try {
        response = await callAI({
          model,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          provider,
          customModelId,
          customBaseUrl,
          customApiKey,
        });
      } catch (err) {
        if (err.status === 429 || err.status === 503) {
          // Only fall back if we were using the default provider/model
          model = !modelId && !provider ? FALLBACK_MODEL : model;
          response = await callAI({
            model: !modelId && !provider ? FALLBACK_MODEL : model,
            systemPrompt,
            userPrompt,
            temperature,
            maxTokens,
            provider,
            customModelId,
            customBaseUrl,
            customApiKey,
          });
        } else {
          throw err;
        }
      }

      const aiResult = { ...response, model };
      memoryCache.set(cacheKey, { data: aiResult, timestamp: Date.now() });
      saveCacheToStorage();
      return aiResult;
    });

    return { data: result, error: null };
  } catch (err) {
    console.error("[AI] generateContent error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

// --- Unified AI caller: prefers Edge Function, falls back to direct ---
async function callAI(params) {
  const isNonGroqProvider = params.provider && params.provider !== "groq";
  const isCustomModel = Boolean(params.customModelId);

  // ── Special case: Custom provider with local/private URL ──
  // Local endpoints (localhost, 192.168.x, etc.) cannot be reached by
  // Supabase Edge Functions running in the cloud. Call directly from browser.
  if (
    params.provider === "custom" &&
    params.customBaseUrl &&
    isLocalUrl(params.customBaseUrl)
  ) {
    console.info(
      `[AI] Custom model with local URL detected (${params.customBaseUrl}). Calling directly from browser.`,
    );
    return await callCustomDirect(params);
  }

  // Try Supabase Edge Function first (secure — API key server-side)
  if (isConfigured) {
    try {
      return await callViaEdgeFunction(params);
    } catch (err) {
      // If Edge Function itself is not deployed (function-level 404),
      // we can only fall back to Groq direct for Groq requests.
      const isFunctionNotFound =
        err.message?.includes("Function not found") ||
        err.message?.includes("function not found") ||
        (err.status === 404 && !err.message?.includes("API error"));

      if (isFunctionNotFound && !isNonGroqProvider && !isCustomModel) {
        console.warn(
          "[AI] Edge Function not found — falling back to direct Groq call. Deploy the edge function for production!",
        );
        return await callGroqDirect(params);
      }

      // For custom provider, try direct call as fallback
      if (params.provider === "custom" && params.customBaseUrl) {
        console.warn(
          `[AI] Edge Function gagal untuk custom provider. Mencoba direct call ke ${params.customBaseUrl}...`,
        );
        return await callCustomDirect(params);
      }

      // For non-Groq / custom models, rethrow with a clear message
      if (isNonGroqProvider || isCustomModel) {
        const providerName = params.provider || "custom";
        throw new Error(
          `Gagal memanggil provider "${providerName}". Pastikan Edge Function "generate-content" sudah di-deploy dengan versi terbaru (multi-provider). Error: ${err.message}`,
        );
      }

      throw err;
    }
  }

  // Demo mode or Supabase not configured
  // Custom provider with base URL — call directly
  if (params.provider === "custom" && params.customBaseUrl) {
    return await callCustomDirect(params);
  }

  if (isNonGroqProvider || isCustomModel) {
    // Non-Groq providers (OpenAI, Anthropic, etc.) REQUIRE the Edge Function
    // because their API keys are stored server-side (encrypted in DB).
    // In demo mode, fall back to Groq with default model and warn the user.
    console.warn(
      `[AI] Provider "${params.provider || "custom"}" membutuhkan Edge Function. Mengunakan Groq sebagai fallback di demo mode.`,
    );
    return await callGroqDirect({
      ...params,
      model: PRIMARY_MODEL,
      provider: undefined,
      customModelId: undefined,
    });
  }

  return await callGroqDirect(params);
}

// --- Supabase Edge Function proxy (RECOMMENDED for production) ---
async function callViaEdgeFunction({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
  provider,
  customModelId,
}) {
  const { data, error } = await invokeEdgeFunction("generate-content", {
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    provider: provider || undefined,
    customModelId: customModelId || undefined,
  });

  if (error) {
    const err = new Error(error);
    throw err;
  }

  return {
    content:
      typeof data.content === "string"
        ? parseAIContent(data.content)
        : data.content,
    tokensUsed: data.tokensUsed || 0,
  };
}

// --- Direct call to custom/local OpenAI-compatible endpoint ---
async function callCustomDirect({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
  customBaseUrl,
  customApiKey,
}) {
  if (!customBaseUrl) {
    throw new Error(
      "Custom Base URL tidak tersedia. Set di Settings > Model AI > API Keys.",
    );
  }

  const baseUrl = customBaseUrl.endsWith("/")
    ? customBaseUrl.slice(0, -1)
    : customBaseUrl;
  const url = `${baseUrl}/chat/completions`;

  const headers = { "Content-Type": "application/json" };
  if (customApiKey) {
    headers["Authorization"] = `Bearer ${customApiKey}`;
  }

  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  console.info(`[AI] Direct custom call → ${url} (model: ${model})`);

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    const err = new Error(
      `Custom API error (${res.status}): ${errText.substring(0, 200)}`,
    );
    err.status = res.status;
    throw err;
  }

  const data = await res.json();

  // Handle OpenAI-compatible response format
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  if (!content) {
    throw new Error(
      "Response dari custom model tidak mengandung content. Pastikan endpoint OpenAI-compatible.",
    );
  }

  return {
    content: parseAIContent(content),
    tokensUsed,
  };
}

// --- Direct Groq call (DEV only — API key exposed in browser!) ---
async function callGroqDirect({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
  provider: _provider, // ignored for direct Groq calls
  customModelId: _custom, // ignored for direct Groq calls
}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Groq API key tidak ditemukan. Set VITE_GROQ_API_KEY di .env atau deploy Edge Function.",
    );
  }

  if (import.meta.env.PROD) {
    console.error(
      "[AI] WARNING: Direct Groq API call in production! API key ter-expose di browser. Deploy Supabase Edge Function segera.",
    );
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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

  if (!res.ok) {
    const err = new Error(`Groq API error: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  return {
    content: parseAIContent(content),
    tokensUsed,
  };
}
