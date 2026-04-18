import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isConfigured } from "../services/supabase";
import { invokeEdgeFunction } from "../services/edgeFunctions";
import { useAuth } from "./useAuth";
import { useCallback, useMemo } from "react";

// ================================
// Demo data for when Supabase is not configured
// ============================================

const DEMO_PROVIDERS = [
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    description: "Inference super cepat, gratis untuk Llama models",
    api_base_url: "https://api.groq.com/openai/v1",
    requires_user_key: false,
    is_active: true,
    sort_order: 1,
    created_at: "2024-01T00:00:00Z",
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🧠",
    description: "GPT-4o, GPT-4o-mini — model paling populer",
    api_base_url: "https://api.openai.com/v1",
    requires_user_key: true,
    is_active: true,
    sort_order: 2,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🔮",
    description: "Claude 3.5 Sonnet — reasoning kuat, output berkualitas",
    api_base_url: "https://api.anthropic.com/v1",
    requires_user_key: true,
    is_active: true,
    sort_order: 3,
    created_at: "2024-01-01T00:00Z",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐋",
    description:
      "DeepSeek — model reasoning kuat, harga terjangkau. Butuh API key sendiri.",
    api_base_url: "https://api.deepseek.com/v1",
    requires_user_key: true,
    is_active: true,
    sort_order: 4,
    created_at: "2024-01T00:00:00Z",
  },
  {
    id: "glm",
    name: "ZhipuAI (GLM)",
    icon: "🔮",
    description:
      "ZhipuAI GLM — model bilingual CN/EN berkualitas tinggi. Butuh API key sendiri.",
    api_base_url: "https://open.bigmodel.cn/api/paas/v4",
    requires_user_key: true,
    is_active: true,
    sort_order: 5,
    created_at: "2024-01-01T00:00Z",
  },
  {
    id: "custom",
    name: "Custom / Self-hosted",
    icon: "🔧",
    description: "Gunakan endpoint OpenAI-compatible milikmu sendiri",
    api_base_url: "",
    requires_user_key: true,
    is_active: true,
    sort_order: 99,
    created_at: "2024-01-01T00:00:00Z",
  },
];

const DEMO_MODELS = [
  {
    id: "groq-llama-3.3-70b",
    provider_id: "groq",
    model_id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    description: "Model utama — cepat, gratis, output bagus",
    context_window: 131072,
    max_output_tokens: 32768,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: false,
    supports_parallel_tool_calls: true,
    supports_prompt_cache: false,
    supports_chat_completions: true,
    speed_rating: 5,
    quality_rating: 4,
    is_free: true,
    is_active: true,
  },
  {
    id: "groq-llama-3.1-8b",
    provider_id: "groq",
    model_id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    description: "Fallback — ultra cepat, ringan",
    context_window: 131072,
    max_output_tokens: 8192,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: false,
    supports_parallel_tool_calls: true,
    supports_prompt_cache: false,
    supports_chat_completions: true,
    speed_rating: 5,
    quality_rating: 3,
    is_free: true,
    is_active: true,
  },
  {
    id: "groq-mixtral-8x7b",
    provider_id: "groq",
    model_id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    description: "MoE model — balance kecepatan & kualitas",
    context_window: 32768,
    max_output_tokens: 4096,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: false,
    supports_parallel_tool_calls: true,
    supports_prompt_cache: false,
    supports_chat_completions: true,
    speed_rating: 4,
    quality_rating: 3,
    is_free: true,
    is_active: true,
  },
  {
    id: "openai-gpt-4o",
    provider_id: "openai",
    model_id: "gpt-4o",
    name: "GPT-4o",
    description: "Flagship model — kualitas terbaik, multimodal",
    context_window: 128000,
    max_output_tokens: 16384,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: true,
    supports_parallel_tool_calls: true,
    supports_prompt_cache: true,
    supports_chat_completions: true,
    speed_rating: 3,
    quality_rating: 5,
    is_free: false,
    is_active: true,
  },
  {
    id: "openai-gpt-4o-mini",
    provider_id: "openai",
    model_id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Ringan & murah, cocok untuk task sederhana",
    context_window: 128000,
    max_output_tokens: 16384,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: true,
    supports_parallel_tool_calls: true,
    supports_prompt_cache: true,
    supports_chat_completions: true,
    speed_rating: 4,
    quality_rating: 4,
    is_free: false,
    is_active: true,
  },
  {
    id: "anthropic-claude-3.5-sonnet",
    provider_id: "anthropic",
    model_id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description: "Output berkualitas tinggi, reasoning kuat",
    context_window: 2000,
    max_output_tokens: 8192,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: true,
    supports_parallel_tool_calls: false,
    supports_prompt_cache: true,
    supports_chat_completions: true,
    speed_rating: 3,
    quality_rating: 5,
    is_free: false,
    is_active: true,
  },
  {
    id: "deepseek-deepseek-chat",
    provider_id: "deepseek",
    model_id: "deepseek-chat",
    name: "DeepSeek V3",
    description:
      "Model utama DeepSeek — kualitas tinggi, harga sangat terjangkau.",
    context_window: 65536,
    max_output_tokens: 8192,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: false,
    supports_parallel_tool_calls: true,
    supports_prompt_cache: true,
    supports_chat_completions: true,
    speed_rating: 4,
    quality_rating: 5,
    is_free: false,
    is_active: true,
  },
  {
    id: "deepseek-deepseek-reasoner",
    provider_id: "deepseek",
    model_id: "deepseek-reasoner",
    name: "DeepSeek R1 (Reasoning)",
    description:
      "Model reasoning DeepSeek — chain-of-thought, sangat baik untuk analisis.",
    context_window: 65536,
    max_output_tokens: 8192,
    supports_json_mode: true,
    supports_tools: false,
    supports_images: false,
    supports_parallel_tool_calls: false,
    supports_prompt_cache: true,
    supports_chat_completions: true,
    speed_rating: 3,
    quality_rating: 5,
    is_free: false,
    is_active: true,
  },
  {
    id: "glm-glm-4-plus",
    provider_id: "glm",
    model_id: "glm-4-plus",
    name: "GLM-4 Plus",
    description: "Model flagship ZhipuAI — bilingual berkualitas tinggi.",
    context_window: 128000,
    max_output_tokens: 4096,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: true,
    supports_parallel_tool_calls: false,
    supports_prompt_cache: false,
    supports_chat_completions: true,
    speed_rating: 3,
    quality_rating: 4,
    is_free: false,
    is_active: true,
  },
  {
    id: "glm-glm-4-flash",
    provider_id: "glm",
    model_id: "glm-4-flash",
    name: "GLM-4 Flash",
    description: "Model cepat ZhipuAI — gratis untuk penggunaan terbatas.",
    context_window: 128000,
    max_output_tokens: 4096,
    supports_json_mode: true,
    supports_tools: true,
    supports_images: false,
    supports_parallel_tool_calls: false,
    supports_prompt_cache: false,
    supports_chat_completions: true,
    speed_rating: 5,
    quality_rating: 3,
    is_free: false,
    is_active: true,
  },
];

const DEMO_USER_CONFIGS = [
  {
    id: "config-groq-default",
    user_id: "demo-user",
    provider_id: "groq",
    api_key_encrypted: null,
    custom_base_url: null,
    is_active: true,
    created_at: "2024-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const DEMO_CUSTOM_MODELS = [];

const DEMO_PREFERENCES = [
  {
    id: "pref-default",
    user_id: "demo-user",
    generation_type: null, // null = default for all types
    preset_model_id: "groq-llama-3.3-70b",
    custom_model_id: null,
    created_at: "2024-01T00:00:00Z",
    updated_at: "2024-01-01T00:00Z",
  },
];

// ================================
// localStorage helpers for demo mode persistence
// ============================================
const LS_PREFIX = "karaya_ai_";
const LOCAL_KEY_PREFIX = "karaya_local_apikey_";

// --- sessionStorage helpers for local/custom API keys ---
// For custom providers with local URLs (localhost, 192.168.x, etc.),
// we cache the plaintext API key in sessionStorage so direct browser
// calls can authenticate. sessionStorage is cleared when the tab closes.
function saveLocalApiKey(providerId, apiKey) {
  try {
    if (apiKey) {
      sessionStorage.setItem(LOCAL_KEY_PREFIX + providerId, apiKey);
    }
  } catch {
    /* ignore */
  }
}

function getLocalApiKey(providerId) {
  try {
    return sessionStorage.getItem(LOCAL_KEY_PREFIX + providerId) || null;
  } catch {
    return null;
  }
}

function removeLocalApiKey(providerId) {
  try {
    sessionStorage.removeItem(LOCAL_KEY_PREFIX + providerId);
  } catch {
    /* ignore */
  }
}

function loadFromLS(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return fallback;
}

function saveToLS(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// ============================================
// Main Hook
// ============================================

export function useAIModels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- Fetch Providers (public catalog) ---
  const { data: providers = [] } = useQuery({
    queryKey: ["ai_providers"],
    queryFn: async () => {
      if (!isConfigured) return DEMO_PROVIDERS;

      const { data, error } = await supabase
        .from("ai_providers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  // --- Fetch Preset Models (public catalog) ---
  const { data: presetModels = [] } = useQuery({
    queryKey: ["ai_models"],
    queryFn: async () => {
      if (!isConfigured) return DEMO_MODELS;

      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("quality_rating", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // --- Fetch User Configs (API keys per provider) ---
  const { data: userConfigs = [] } = useQuery({
    queryKey: ["user_ai_configs", user?.id],
    queryFn: async () => {
      if (!isConfigured) return loadFromLS("user_configs", DEMO_USER_CONFIGS);

      const { data, error } = await supabase
        .from("user_ai_configs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // --- Fetch Custom Models ---
  const { data: customModels = [] } = useQuery({
    queryKey: ["user_custom_models", user?.id],
    queryFn: async () => {
      if (!isConfigured) return loadFromLS("custom_models", DEMO_CUSTOM_MODELS);

      const { data, error } = await supabase
        .from("user_custom_models")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // --- Fetch User Preferences ---
  const { data: preferences = [] } = useQuery({
    queryKey: ["user_model_preferences", user?.id],
    queryFn: async () => {
      if (!isConfigured)
        return loadFromLS("model_preferences", DEMO_PREFERENCES);

      const { data, error } = await supabase
        .from("user_model_preferences")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // --- Save/Update Provider Config ---
  const saveConfigMutation = useMutation({
    mutationFn: async ({ providerId, apiKey, customBaseUrl }) => {
      // Cache plaintext key in sessionStorage for custom/local direct calls
      if (providerId === "custom" && apiKey) {
        saveLocalApiKey(providerId, apiKey);
      }

      if (!isConfigured) {
        // Demo mode — store in localStorage with masked key
        const existing = loadFromLS("user_configs", DEMO_USER_CONFIGS);
        const idx = existing.findIndex((c) => c.provider_id === providerId);
        const record = {
          id: `config-${providerId}-${Date.now()}`,
          user_id: user?.id || "demo-user",
          provider_id: providerId,
          api_key_encrypted: apiKey ? "••••" + apiKey.slice(-4) : null,
          api_key_last4: apiKey ? apiKey.slice(-4) : null,
          custom_base_url: customBaseUrl || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...record, id: existing[idx].id };
        } else {
          existing.push(record);
        }
        saveToLS("user_configs", existing);
        return record;
      }

      // Call Edge Function to encrypt and store the API key server-side
      const { data, error } = await invokeEdgeFunction("save-ai-config", {
        providerId,
        apiKey,
        customBaseUrl: customBaseUrl || null,
      });

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_ai_configs", user?.id],
      });
    },
  });

  // --- Delete Provider Config ---
  const deleteConfigMutation = useMutation({
    mutationFn: async (providerId) => {
      // Also remove cached local API key
      removeLocalApiKey(providerId);

      if (!isConfigured) {
        const existing = loadFromLS("user_configs", DEMO_USER_CONFIGS);
        const filtered = existing.filter((c) => c.provider_id !== providerId);
        saveToLS("user_configs", filtered);
        return;
      }

      // Call Edge Function to delete the config server-side
      const { data, error } = await invokeEdgeFunction("save-ai-config", {
        providerId,
        action: "delete",
      });

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_ai_configs", user?.id],
      });
    },
  });

  // --- Add Custom Model ---
  const addCustomModelMutation = useMutation({
    mutationFn: async (modelData) => {
      // Resolve config_id from providerId if not explicitly provided
      const configId =
        modelData.configId ||
        (() => {
          const cfg = userConfigs.find(
            (c) => c.provider_id === modelData.providerId && c.is_active,
          );
          return cfg?.id || null;
        })();

      const record = {
        id: `custom-${Date.now()}`,
        user_id: user?.id || "demo-user",
        config_id: configId,
        model_id: modelData.modelId,
        name: modelData.name,
        description: modelData.description || null,
        context_window: modelData.contextWindow || 4096,
        max_output_tokens: modelData.maxOutputTokens || 2048,
        supports_json_mode: modelData.supportsJson || false,
        supports_tools: modelData.supportsTools || false,
        supports_images: modelData.supportsImages || false,
        supports_parallel_tool_calls:
          modelData.supportsParallelToolCalls || false,
        supports_prompt_cache: modelData.supportsPromptCache || false,
        supports_chat_completions: modelData.supportsChatCompletions !== false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!isConfigured) {
        const existing = loadFromLS("custom_models", DEMO_CUSTOM_MODELS);
        existing.push(record);
        saveToLS("custom_models", existing);
        return record;
      }

      const { data, error } = await supabase
        .from("user_custom_models")
        .insert({
          user_id: user.id,
          config_id: configId,
          model_id: modelData.modelId,
          name: modelData.name,
          description: modelData.description || null,
          context_window: modelData.contextWindow || 4096,
          max_output_tokens: modelData.maxOutputTokens || 2048,
          supports_json_mode: modelData.supportsJson || false,
          supports_tools: modelData.supportsTools || false,
          supports_images: modelData.supportsImages || false,
          supports_parallel_tool_calls:
            modelData.supportsParallelToolCalls || false,
          supports_prompt_cache: modelData.supportsPromptCache || false,
          supports_chat_completions:
            modelData.supportsChatCompletions !== false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_custom_models", user?.id],
      });
    },
  });

  // --- Delete Custom Model ---
  const deleteCustomModelMutation = useMutation({
    mutationFn: async (modelId) => {
      if (!isConfigured) {
        const existing = loadFromLS("custom_models", DEMO_CUSTOM_MODELS);
        const filtered = existing.filter((m) => m.id !== modelId);
        saveToLS("custom_models", filtered);
        return;
      }

      const { error } = await supabase
        .from("user_custom_models")
        .delete()
        .eq("id", modelId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_custom_models", user?.id],
      });
    },
  });

  // --- Set Preference ---
  const setPreferenceMutation = useMutation({
    mutationFn: async ({
      generationType = null,
      presetModelId = null,
      customModelId = null,
    }) => {
      const record = {
        id: `pref-${generationType || "default"}-${Date.now()}`,
        user_id: user?.id || "demo-user",
        generation_type: generationType,
        preset_model_id: presetModelId,
        custom_model_id: customModelId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!isConfigured) {
        const existing = loadFromLS("model_preferences", DEMO_PREFERENCES);
        const idx = existing.findIndex(
          (p) => p.generation_type === generationType,
        );
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...record, id: existing[idx].id };
        } else {
          existing.push(record);
        }
        saveToLS("model_preferences", existing);
        return record;
      }

      const { data, error } = await supabase
        .from("user_model_preferences")
        .upsert(
          {
            user_id: user.id,
            generation_type: generationType,
            preset_model_id: presetModelId,
            custom_model_id: customModelId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,generation_type" },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_model_preferences", user?.id],
      });
    },
  });

  // --- Helper: check if provider has user config (API key) ---
  const hasProviderConfig = useCallback(
    (providerId) => {
      const provider = providers.find((p) => p.id === providerId);
      // Built-in providers don't need a key
      if (provider && !provider.requires_user_key) return true;
      return userConfigs.some(
        (c) => c.provider_id === providerId && c.is_active,
      );
    },
    [providers, userConfigs],
  );

  // --- Helper: get provider config for a provider ---
  const getProviderConfig = useCallback(
    (providerId) => {
      return (
        userConfigs.find((c) => c.provider_id === providerId && c.is_active) ||
        null
      );
    },
    [userConfigs],
  );

  // --- Helper: resolve provider_id from a custom model's config_id ---
  const getProviderIdForCustomModel = useCallback(
    (model) => {
      if (model.provider_id) return model.provider_id;
      if (model.config_id) {
        const cfg = userConfigs.find((c) => c.id === model.config_id);
        return cfg?.provider_id || null;
      }
      return null;
    },
    [userConfigs],
  );

  // --- All available models (preset + custom) ---
  const allModels = useMemo(() => {
    const preset = presetModels.map((m) => ({ ...m, isCustom: false }));
    const custom = customModels.map((m) => ({
      ...m,
      isCustom: true,
      provider_id: getProviderIdForCustomModel(m),
      speed_rating: m.speed_rating || 3,
      quality_rating: m.quality_rating || 3,
      is_free: false,
      supports_json_mode: m.supports_json_mode || false,
      supports_tools: m.supports_tools || false,
      supports_images: m.supports_images || false,
      supports_parallel_tool_calls: m.supports_parallel_tool_calls || false,
      supports_prompt_cache: m.supports_prompt_cache || false,
      supports_chat_completions: m.supports_chat_completions !== false,
      description: m.description || `Custom model: ${m.model_id}`,
    }));
    return [...preset, ...custom];
  }, [presetModels, customModels, getProviderIdForCustomModel]);

  // --- Models grouped by provider ---
  const modelsByProvider = useMemo(() => {
    const grouped = {};
    for (const provider of providers) {
      grouped[provider.id] = allModels.filter(
        (m) => m.provider_id === provider.id,
      );
    }
    return grouped;
  }, [providers, allModels]);

  // --- Get the active model for a given generation type ---
  const getModelForType = useCallback(
    (generationType = null) => {
      // 1. Check specific type preference
      let pref = preferences.find((p) => p.generation_type === generationType);

      // 2. Fall back to default preference (generation_type = null)
      if (!pref && generationType !== null) {
        pref = preferences.find((p) => p.generation_type === null);
      }

      // 3. Fall back to groq/llama-3.3-70b
      if (!pref) {
        const defaultModel =
          presetModels.find((m) => m.model_id === "llama-3.3-70b-versatile") ||
          presetModels[0];
        const defaultProvider =
          providers.find((p) => p.id === "groq") || providers[0];

        return {
          provider: defaultProvider || null,
          model: defaultModel || null,
          isCustom: false,
          userApiKey: null,
          customBaseUrl: null,
        };
      }

      // Resolve model — could be a custom model or a preset model
      let model = null;
      let isCustom = false;
      let resolvedProviderId = null;

      if (pref.custom_model_id) {
        model = customModels.find((m) => m.id === pref.custom_model_id) || null;
        isCustom = true;
        // Derive provider from custom model's config_id
        if (model) {
          resolvedProviderId = getProviderIdForCustomModel(model);
        }
      } else if (pref.preset_model_id) {
        model =
          allModels.find((m) => m.id === pref.preset_model_id) ||
          presetModels.find((m) => m.model_id === pref.preset_model_id) ||
          null;
        // Derive provider from the preset model's provider_id
        if (model) {
          resolvedProviderId = model.provider_id;
        }
      }

      // Resolve provider from the model
      const provider = resolvedProviderId
        ? providers.find((p) => p.id === resolvedProviderId) || null
        : null;

      // Get user API key config
      const config = resolvedProviderId
        ? getProviderConfig(resolvedProviderId)
        : null;

      // For custom provider, try to get the plaintext key from sessionStorage
      // (cached there when user saves config, for direct browser calls to local endpoints)
      const localPlaintextKey =
        resolvedProviderId === "custom"
          ? getLocalApiKey(resolvedProviderId)
          : null;

      return {
        provider,
        model,
        isCustom,
        userApiKey: localPlaintextKey || config?.api_key_encrypted || null,
        customBaseUrl: config?.custom_base_url || null,
      };
    },
    [
      preferences,
      providers,
      presetModels,
      customModels,
      allModels,
      getProviderConfig,
      getProviderIdForCustomModel,
    ],
  );

  // --- Get active (default) model ---
  const activeModel = useMemo(() => getModelForType(null), [getModelForType]);

  return {
    // Data
    providers,
    presetModels,
    userConfigs,
    customModels,
    preferences,
    allModels,
    modelsByProvider,
    activeModel,

    // Helpers
    hasProviderConfig,
    getProviderConfig,
    getModelForType,

    // Mutations
    saveConfig: saveConfigMutation.mutateAsync,
    saveConfigLoading: saveConfigMutation.isPending,
    deleteConfig: deleteConfigMutation.mutateAsync,
    deleteConfigLoading: deleteConfigMutation.isPending,
    addCustomModel: addCustomModelMutation.mutateAsync,
    addCustomModelLoading: addCustomModelMutation.isPending,
    deleteCustomModel: deleteCustomModelMutation.mutateAsync,
    deleteCustomModelLoading: deleteCustomModelMutation.isPending,
    setPreference: setPreferenceMutation.mutateAsync,
    setPreferenceLoading: setPreferenceMutation.isPending,
  };
}

export default useAIModels;
