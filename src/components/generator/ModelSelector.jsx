import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAIModels } from "../../hooks/useAIModels";
import Badge from "../ui/Badge";

// ================================
// Rating dots (compact)
// ================================
function MiniRating({ value = 0, max = 5, icon = "⚡" }) {
  return (
    <span className="inline-flex items-center gap-px text-[10px]">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? "opacity-100" : "opacity-20"}>
          {icon}
        </span>
      ))}
    </span>
  );
}

/**
 * ModelSelector — compact dropdown for selecting AI model in generator pages.
 * @param {Object} props
 * @param {'caption'|'carousel'|'ad_copy'|'thread'|'repurpose'|'video_script'|'hashtags'} props.generationType
 * @param {(modelInfo: object) => void} props.onChange — called when user picks a different model
 * @param {object} [props.value] — current model info (from useAIModels.getModelForType)
 */
export default function ModelSelector({ generationType, onChange, value }) {
  const {
    providers,
    modelsByProvider,
    activeModel,
    hasProviderConfig,
    getModelForType,
    setPreference,
  } = useAIModels();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Resolve the current model to display
  const currentModel = value || getModelForType(generationType) || activeModel;

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleSelect(provider, model) {
    const modelInfo = {
      provider,
      model,
      isCustom: model.isCustom || false,
      userApiKey: null,
    };

    // Optionally persist as a type-specific preference
    try {
      await setPreference({
        generationType: generationType || null,
        presetModelId: model.isCustom ? null : model.id,
        customModelId: model.isCustom ? model.id : null,
      });
    } catch {
      // Non-critical — still update local state
    }

    onChange?.(modelInfo);
    setOpen(false);
  }

  return (
    <div className="relative inline-block w-full">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors
          ${
            open
              ? "border-primary-400 ring-2 ring-primary-100 bg-white"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
          }
        `}
      >
        <span className="text-base flex-shrink-0">
          {currentModel?.provider?.icon || "🤖"}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-800 truncate block">
            {currentModel?.model?.name || "Pilih Model"}
          </span>
        </div>
        {currentModel?.model?.is_free && (
          <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
            Gratis
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full min-w-[320px] max-h-[400px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pilih Model AI
            </p>
          </div>

          {/* Models grouped by provider */}
          {providers.map((provider) => {
            const models = modelsByProvider[provider.id] || [];
            if (models.length === 0) return null;

            const providerAvailable =
              !provider.requires_user_key || hasProviderConfig(provider.id);

            return (
              <div key={provider.id} className="py-1">
                {/* Provider header */}
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <span className="text-sm">{provider.icon}</span>
                  <span className="text-xs font-semibold text-gray-500">
                    {provider.name}
                  </span>
                  {!provider.requires_user_key && (
                    <span className="text-[10px] bg-green-100 text-green-700 rounded px-1 font-medium">
                      Built-in
                    </span>
                  )}
                  {provider.requires_user_key && !providerAvailable && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1 font-medium">
                      Perlu API Key
                    </span>
                  )}
                </div>

                {/* Model list */}
                {models.map((model) => {
                  const isSelected = currentModel?.model?.id === model.id;
                  const isDisabled = !providerAvailable;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelect(provider, model)}
                      className={`
                        w-full text-left px-3 py-2 flex items-center gap-3 transition-colors
                        ${
                          isSelected
                            ? "bg-primary-50 text-primary-800"
                            : isDisabled
                              ? "opacity-50 cursor-not-allowed bg-gray-50"
                              : "hover:bg-gray-50 text-gray-700"
                        }
                      `}
                    >
                      {/* Selection indicator */}
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "border-primary-500 bg-primary-500"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4a1 1 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>

                      {/* Model info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {model.name}
                          </span>
                          {model.is_free && (
                            <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-green-100 text-green-700 flex-shrink-0">
                              Gratis
                            </span>
                          )}
                          {model.isCustom && (
                            <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-purple-100 text-purple-700 flex-shrink-0">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MiniRating value={model.speed_rating} icon="⚡" />
                          <MiniRating value={model.quality_rating} icon="⭐" />
                          <span className="text-[10px] text-gray-400">
                            {model.context_window >= 1024
                              ? `${Math.round(model.context_window / 1024)}K ctx`
                              : `${model.context_window} ctx`}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {model.supports_tools && "🔧"}
                            {model.supports_images && "🖼️"}
                            {model.supports_parallel_tool_calls && "⚡"}
                            {model.supports_prompt_cache && "💾"}
                            {model.supports_chat_completions && "💬"}
                          </span>
                        </div>
                      </div>

                      {/* Disabled notice */}
                      {isDisabled && (
                        <span className="text-[10px] text-amber-600 font-medium flex-shrink-0 whitespace-nowrap">
                          Setup API Key
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-3 py-2">
            <Link
              to="/settings/ai-models"
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              <span>⚙️</span>
              <span>Kelola Model AI</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
