-- ================================
-- Migration 015: Model Capabilities
-- Add capability columns to ai_models & user_custom_models,
-- then update seed data with correct per-model values.
-- ================================

-- ────────────────────────────────
-- 1. Add capability columns to ai_models
-- ────────────────────────
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS supports_tools BOOLEAN DEFAULT false;
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS supports_images BOOLEAN DEFAULT false;
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS supports_parallel_tool_calls BOOLEAN DEFAULT false;
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS supports_prompt_cache BOOLEAN DEFAULT false;
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS supports_chat_completions BOOLEAN DEFAULT true;

-- ────────────────────────────
-- 2. Add capability columns to user_custom_models
-- ────────────────────────
ALTER TABLE user_custom_models ADD COLUMN IF NOT EXISTS supports_tools BOOLEAN DEFAULT false;
ALTER TABLE user_custom_models ADD COLUMN IF NOT EXISTS supports_images BOOLEAN DEFAULT false;
ALTER TABLE user_custom_models ADD COLUMN IF NOT EXISTS supports_parallel_tool_calls BOOLEAN DEFAULT false;
ALTER TABLE user_custom_models ADD COLUMN IF NOT EXISTS supports_prompt_cache BOOLEAN DEFAULT false;
ALTER TABLE user_custom_models ADD COLUMN IF NOT EXISTS supports_chat_completions BOOLEAN DEFAULT true;

-- ────────────────────────────────
-- 3. Update seed data — Groq models
-- ────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = false,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = false,
  supports_chat_completions = true
WHERE id = 'groq/llama-3.3-70b';

UPDATE ai_models SET
  supports_tools = true,
  supports_images = false,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = false,
  supports_chat_completions = true
WHERE id = 'groq/llama-3.1-8b';

UPDATE ai_models SET
  supports_tools = true,
  supports_images = false,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = false,
  supports_chat_completions = true
WHERE id = 'groq/llama-4-scout';

-- ────────────────────────────
-- 4. Update seed data — OpenAI models
-- ────────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = true,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = true,
  supports_chat_completions = true
WHERE id = 'openai/gpt-4o-mini';

UPDATE ai_models SET
  supports_tools = true,
  supports_images = true,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = true,
  supports_chat_completions = true
WHERE id = 'openai/gpt-4o';

-- ────────────────────────────
-- 5. Update seed data — Anthropic
-- ────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = true,
  supports_parallel_tool_calls = false,
  supports_prompt_cache = true,
  supports_chat_completions = true
WHERE id = 'anthropic/claude-sonnet';

-- ────────────────────────────
-- 6. Update seed data — OpenRouter
-- ────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = true,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = false,
  supports_chat_completions = true
WHERE id = 'openrouter/auto';

-- ────────────────────────
-- 7. Update seed data — Google Gemini
-- ────────────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = true,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = true,
  supports_chat_completions = true
WHERE id = 'google/gemini-2.5-flash';

-- ────────────────────────────────
-- 8. Update seed data — DeepSeek
-- ────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = false,
  supports_parallel_tool_calls = true,
  supports_prompt_cache = true,
  supports_chat_completions = true
WHERE id = 'deepseek/deepseek-chat';

UPDATE ai_models SET
  supports_tools = false,
  supports_images = false,
  supports_parallel_tool_calls = false,
  supports_prompt_cache = true,
  supports_chat_completions = true
WHERE id = 'deepseek/deepseek-reasoner';

-- ────────────────────────────────
-- 9. Update seed data — GLM (ZhipuAI)
-- ────────────────────────────────
UPDATE ai_models SET
  supports_tools = true,
  supports_images = true,
  supports_parallel_tool_calls = false,
  supports_prompt_cache = false,
  supports_chat_completions = true
WHERE id = 'glm/glm-4-plus';

UPDATE ai_models SET
  supports_tools = true,
  supports_images = false,
  supports_parallel_tool_calls = false,
  supports_prompt_cache = false,
  supports_chat_completions = true
WHERE id = 'glm/glm-4-flash';
