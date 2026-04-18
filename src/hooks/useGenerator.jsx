import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateContent, cleanJsonResponse } from "../services/ai";
import { supabase, isConfigured } from "../services/supabase";
import { useAuth } from "./useAuth";
import { PROMPTS } from "../utils/prompts";

export function useGenerator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Cached usage query — stale after 1 minute since it changes with each generation
  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ["usage", user?.id],
    queryFn: async () => {
      if (!isConfigured) {
        return { used: 38, limit: 50 };
      }

      const month = new Date().toISOString().slice(0, 7) + "-01";
      const { data } = await supabase
        .from("usage_monthly")
        .select("generation_count, generation_limit")
        .eq("user_id", user.id)
        .eq("month", month)
        .single();

      return data;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  async function checkUsage() {
    // Re-fetch to get the latest usage before generating
    const { data: freshUsage } = await refetchUsage();

    if (!isConfigured) {
      return freshUsage;
    }

    if (
      freshUsage &&
      freshUsage.generation_count >= freshUsage.generation_limit
    ) {
      throw new Error(
        "Limit generasi bulan ini sudah tercapai. Upgrade untuk unlimited.",
      );
    }
    return freshUsage;
  }

  async function incrementUsage() {
    if (!isConfigured) {
      // Optimistically update the cached usage for demo mode
      queryClient.setQueryData(["usage", user?.id], (prev) =>
        prev ? { ...prev, used: prev.used + 1 } : { used: 39, limit: 50 },
      );
      return;
    }

    const month = new Date().toISOString().slice(0, 7) + "-01";
    await supabase.rpc("increment_usage", {
      p_user_id: user.id,
      p_month: month,
    });

    // Invalidate usage cache so it refetches with the new count
    queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
  }

  // generate remains a regular async function — it's an action, not a fetch
  async function generate({
    type,
    platform,
    pillar,
    brand,
    product,
    params,
    modelConfig,
  }) {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      await checkUsage();

      const promptBuilder = PROMPTS[type];
      if (!promptBuilder) throw new Error(`Unknown generation type: ${type}`);

      const { systemPrompt, userPrompt } = promptBuilder({
        platform,
        pillar,
        brand,
        product,
        ...params,
      });

      console.log("[Generator] Calling AI with:", {
        type,
        provider: modelConfig?.provider?.id,
        modelId: modelConfig?.model?.model_id,
        isCustom: modelConfig?.isCustom,
        hasBaseUrl: Boolean(
          modelConfig?.customBaseUrl || modelConfig?.provider?.custom_base_url,
        ),
        hasApiKey: Boolean(modelConfig?.userApiKey),
      });

      const { data: aiResult, error: aiError } = await generateContent({
        systemPrompt,
        userPrompt,
        provider: modelConfig?.provider?.id,
        modelId: modelConfig?.model?.model_id,
        customModelId: modelConfig?.isCustom
          ? modelConfig?.model?.id
          : undefined,
        customBaseUrl:
          modelConfig?.customBaseUrl ||
          modelConfig?.provider?.custom_base_url ||
          undefined,
        customApiKey: modelConfig?.userApiKey || undefined,
      });

      if (aiError) {
        console.error("[Generator] AI error:", aiError);
        setError(aiError);
        return null;
      }

      if (!aiResult) {
        console.error("[Generator] AI returned empty result");
        setError("AI mengembalikan response kosong. Coba lagi.");
        return null;
      }

      console.log("[Generator] AI result received:", {
        hasContent: Boolean(aiResult.content),
        contentType: typeof aiResult.content,
        contentKeys:
          aiResult.content && typeof aiResult.content === "object"
            ? Object.keys(aiResult.content)
            : "N/A",
        tokensUsed: aiResult.tokensUsed,
        model: aiResult.model,
      });

      // Normalize AI response — handle different content structures
      let normalizedContent = aiResult.content;

      // If content is a string (not parsed JSON), try to clean and parse it
      if (typeof normalizedContent === "string") {
        const cleaned = cleanJsonResponse(normalizedContent);
        try {
          normalizedContent = JSON.parse(cleaned);
          console.log("[Generator] Parsed string content as JSON");
        } catch {
          // If it's just plain text, wrap it in a standard format
          console.warn(
            "[Generator] Content is plain text, wrapping in variations format",
          );
          normalizedContent = {
            variations: [
              {
                style: "generated",
                caption: normalizedContent,
                content: normalizedContent,
                tweets: [
                  { number: 1, content: normalizedContent, type: "content" },
                ],
              },
            ],
            text: normalizedContent,
          };
        }
      }

      // If content has a "text" field (from custom model non-JSON response),
      // try to parse the text as JSON first (it might be markdown-wrapped JSON)
      if (
        normalizedContent &&
        normalizedContent.text &&
        !normalizedContent.variations
      ) {
        const rawText = normalizedContent.text;
        const cleanedText = cleanJsonResponse(rawText);
        let parsedFromText = null;
        try {
          parsedFromText = JSON.parse(cleanedText);
        } catch {
          // not JSON
        }

        if (parsedFromText && parsedFromText.variations) {
          console.log(
            "[Generator] Extracted valid JSON with variations from text field",
          );
          normalizedContent = parsedFromText;
        } else {
          console.warn(
            "[Generator] Content has text but no variations, wrapping",
          );
          normalizedContent = {
            variations: [
              {
                style: "generated",
                caption: rawText,
                content: rawText,
                tweets: [{ number: 1, content: rawText, type: "content" }],
              },
            ],
            text: rawText,
          };
        }
      }

      // Save to history (non-blocking — don't fail the whole flow if DB insert fails)
      let historyId = null;
      try {
        const { data: historyRecord } = await supabase
          .from("generation_history")
          .insert({
            user_id: user.id,
            brand_id: brand?.id,
            product_id: product?.id,
            type,
            platform,
            pillar,
            input_params: { platform, pillar, ...params },
            output: normalizedContent,
            model: aiResult.model,
            tokens_used: aiResult.tokensUsed,
          })
          .select()
          .single();
        historyId = historyRecord?.id;
      } catch (dbErr) {
        console.warn("[Generator] Failed to save to history:", dbErr.message);
        // Non-critical — continue showing the result
      }

      await incrementUsage();
      setResult({ ...normalizedContent, historyId });

      // Invalidate dashboard data since generation history changed
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      return normalizedContent;
    } catch (err) {
      console.error("[Generator] Error:", err);
      setError(err.message || "Terjadi kesalahan saat generate. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  // saveToLibrary as a mutation with automatic cache invalidation
  const saveToLibraryMutation = useMutation({
    mutationFn: async ({
      generationId,
      type,
      title,
      content,
      metadata,
      tags,
    }) => {
      const { data, error: err } = await supabase
        .from("saved_content")
        .insert({
          user_id: user.id,
          generation_id: generationId,
          type,
          title,
          content,
          metadata,
          tags,
        })
        .select()
        .single();
      if (err) throw err;
      return data;
    },
    onSuccess: () => {
      // Invalidate any saved content / library queries so they refetch
      queryClient.invalidateQueries({ queryKey: ["saved_content"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  // Wrapper to keep the same API surface as before
  async function saveToLibrary({
    generationId,
    type,
    title,
    content,
    metadata,
    tags,
  }) {
    return saveToLibraryMutation.mutateAsync({
      generationId,
      type,
      title,
      content,
      metadata,
      tags,
    });
  }

  return {
    generate,
    generating,
    result,
    error,
    setResult,
    saveToLibrary,
    usage,
  };
}
