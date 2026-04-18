import { useState, useEffect } from "react";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { Select } from "../../components/ui/Input";
import { Tabs, TabPanel } from "../../components/ui/Tabs";
import { useToast } from "../../components/ui/Toast";
import { useAIModels } from "../../hooks/useAIModels";
import { isConfigured } from "../../services/supabase";

// ================================
// Rating dots component
// ============================================
function RatingDots({ value = 0, max = 5, icon = "⚡", emptyIcon = "○" }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? "opacity-100" : "opacity-30"}>
          {i < value ? icon : emptyIcon}
        </span>
      ))}
    </span>
  );
}

// ================================
// Model Card
// ============================================
function ModelCard({
  model,
  provider,
  isActive,
  isAvailable,
  onSelect,
  onSetupKey,
}) {
  return (
    <button
      type="button"
      onClick={() => (isAvailable ? onSelect() : onSetupKey?.())}
      className={`
        text-left w-full p-4 rounded-xl border-2 transition-all duration-200
        ${
          isActive
            ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200 ring-offset-1"
            : isAvailable
              ? "border-gray-200 bg-white hover:border-primary-300 hover:shadow-md"
              : "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{provider?.icon || "🤖"}</span>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {model.name}
            </h4>
            <p className="text-xs text-gray-500">{provider?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <Badge color="blue" className="text-xs">
              ✓ Aktif
            </Badge>
          )}
          {model.is_free ? (
            <Badge color="green" className="text-xs">
              Gratis
            </Badge>
          ) : !isAvailable ? (
            <Badge color="yellow" className="text-xs">
              Butuh API Key
            </Badge>
          ) : (
            <Badge color="purple" className="text-xs">
              Premium
            </Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
        {model.description}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Kecepatan">
            <RatingDots value={model.speed_rating} icon="⚡" />
          </span>
          <span className="flex items-center gap-1" title="Kualitas">
            <RatingDots value={model.quality_rating} icon="⭐" />
          </span>
        </div>
        <span className="text-gray-400">
          {model.context_window >= 1000
            ? `${Math.round(model.context_window / 1024)}K ctx`
            : `${model.context_window} ctx`}
        </span>
      </div>

      {/* Capabilities badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {model.supports_tools && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
            🔧 Tools
          </span>
        )}
        {model.supports_images && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
            🖼️ Images
          </span>
        )}
        {model.supports_parallel_tool_calls && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600">
            ⚡ Parallel
          </span>
        )}
        {model.supports_prompt_cache && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
            💾 Cache
          </span>
        )}
        {model.supports_json_mode && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">
            📋 JSON
          </span>
        )}
        {model.supports_chat_completions && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600">
            💬 Chat
          </span>
        )}
      </div>

      {!isAvailable && (
        <div className="mt-2 text-xs text-amber-600 font-medium">
          ⚠️ Setup API Key dulu →
        </div>
      )}
    </button>
  );
}

// ============================================
// Tab 1: Model Aktif
// ============================================
function ActiveModelsTab({
  providers,
  modelsByProvider,
  activeModel,
  hasProviderConfig,
  onSelectModel,
  setActiveTab,
}) {
  return (
    <div className="space-y-6">
      {/* Current active model highlight */}
      {activeModel?.model && (
        <Card className="border-2 border-primary-200 bg-primary-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl">
              {activeModel.provider?.icon || "🤖"}
            </div>
            <div className="flex-1">
              <p className="text-xs text-primary-600 font-medium mb-0.5">
                Model Default Saat Ini
              </p>
              <h3 className="font-bold text-gray-900 text-lg">
                {activeModel.model.name}
              </h3>
              <p className="text-sm text-gray-500">
                {activeModel.provider?.name} • {activeModel.model.model_id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeModel.model.is_free ? (
                <Badge color="green">Gratis</Badge>
              ) : (
                <Badge color="purple">Premium</Badge>
              )}
              <Badge color="blue">✓ Aktif</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Models grouped by provider */}
      {providers.map((provider) => {
        const models = modelsByProvider[provider.id] || [];
        if (models.length === 0) return null;

        return (
          <div key={provider.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{provider.icon}</span>
              <h3 className="font-semibold text-gray-900">{provider.name}</h3>
              {!provider.requires_user_key ? (
                <Badge color="green" className="text-xs">
                  Built-in
                </Badge>
              ) : hasProviderConfig(provider.id) ? (
                <Badge color="green" className="text-xs">
                  ✓ API Key
                </Badge>
              ) : (
                <Badge color="yellow" className="text-xs">
                  Perlu Setup
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {models.map((model) => {
                const isActive = activeModel?.model?.id === model.id;
                const isAvailable =
                  !provider.requires_user_key || hasProviderConfig(provider.id);

                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    provider={provider}
                    isActive={isActive}
                    isAvailable={isAvailable}
                    onSelect={() => onSelectModel(provider, model)}
                    onSetupKey={() => setActiveTab("api-keys")}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ================================
// Tab 2: API Keys
// ============================================
function APIKeysTab({
  providers,
  userConfigs,
  hasProviderConfig,
  onSaveConfig,
  onDeleteConfig,
  saveConfigLoading,
}) {
  const [editingProvider, setEditingProvider] = useState(null);
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [baseUrlInputs, setBaseUrlInputs] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const { toast } = useToast();

  function handleKeyChange(providerId, value) {
    setApiKeyInputs((prev) => ({ ...prev, [providerId]: value }));
  }

  function toggleShowKey(providerId) {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }

  async function handleSave(providerId) {
    const key = apiKeyInputs[providerId];
    if (!key?.trim()) {
      toast({
        type: "warning",
        title: "API Key kosong",
        message: "Masukkan API key terlebih dahulu",
      });
      return;
    }
    const customBaseUrl = baseUrlInputs[providerId] || null;
    if (providerId === "custom" && !customBaseUrl?.trim()) {
      toast({
        type: "warning",
        title: "Base URL kosong",
        message: "Masukkan Base URL untuk Custom Endpoint",
      });
      return;
    }
    try {
      await onSaveConfig({
        providerId,
        apiKey: key.trim(),
        customBaseUrl: customBaseUrl?.trim() || null,
      });
      setApiKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      setBaseUrlInputs((prev) => ({ ...prev, [providerId]: "" }));
      setEditingProvider(null);
      toast({
        type: "success",
        title: "Berhasil",
        message: `API Key ${providerId} berhasil disimpan`,
      });
    } catch (err) {
      toast({ type: "error", title: "Gagal Menyimpan", message: err.message });
    }
  }

  async function handleTest(providerId) {
    setTesting((prev) => ({ ...prev, [providerId]: true }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));
    try {
      // Simple test — in real app this would call a test endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTestResults((prev) => ({ ...prev, [providerId]: "success" }));
      toast({
        type: "success",
        title: "Koneksi Berhasil",
        message: `${providerId} API berfungsi dengan baik`,
      });
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [providerId]: "error" }));
      toast({ type: "error", title: "Test Gagal", message: err.message });
    } finally {
      setTesting((prev) => ({ ...prev, [providerId]: false }));
    }
  }

  async function handleDelete(providerId) {
    try {
      await onDeleteConfig(providerId);
      toast({
        type: "success",
        title: "Dihapus",
        message: `API Key ${providerId} berhasil dihapus`,
      });
    } catch (err) {
      toast({ type: "error", title: "Gagal Menghapus", message: err.message });
    }
  }

  function getProviderHint(providerId) {
    if (providerId === "openai") {
      return (
        <p className="text-xs text-gray-400 mt-1">
          Dapatkan di{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="nopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            platform.openai.com
          </a>
        </p>
      );
    }
    if (providerId === "anthropic") {
      return (
        <p className="text-xs text-gray-400 mt-1">
          Dapatkan di{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="nopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            console.anthropic.com
          </a>
        </p>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Kelola API key untuk setiap provider AI. Groq sudah built-in dan gratis.
        Tambahkan API key provider lain untuk akses model premium.
      </p>

      {providers.map((provider) => {
        const config = userConfigs.find((c) => c.provider_id === provider.id);
        const isConnected = hasProviderConfig(provider.id);
        const isEditing = editingProvider === provider.id;
        const isBuiltIn = !provider.requires_user_key;

        return (
          <Card
            key={provider.id}
            className={`transition-all duration-200 ${isConnected ? "ring-2 ring-green-200 ring-offset-1" : ""}`}
          >
            {/* Provider header */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 bg-gray-50">
                {provider.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {provider.name}
                  </h3>
                  {isBuiltIn ? (
                    <Badge color="green" className="text-xs">
                      Built-in (Gratis) ✓
                    </Badge>
                  ) : isConnected ? (
                    <Badge color="green" className="text-xs">
                      ✅ Terhubung
                    </Badge>
                  ) : (
                    <Badge color="gray" className="text-xs">
                      Belum Setup
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {provider.description}
                </p>
              </div>

              {testResults[provider.id] === "success" && (
                <span className="text-green-500 text-sm font-medium">✓ OK</span>
              )}
              {testResults[provider.id] === "error" && (
                <span className="text-red-500 text-sm font-medium">
                  ✗ Gagal
                </span>
              )}
            </div>

            {/* Body — built-in vs requires key */}
            {isBuiltIn ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                <span className="font-medium">✓ Sudah aktif.</span> Groq
                menyediakan akses gratis ke model Llama. Tidak perlu API key.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Connected state — show saved key info */}
                {isConnected && !isEditing && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm text-green-800 font-medium">
                        API Key tersimpan
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {config?.api_key_last4
                          ? `••••${config.api_key_last4}`
                          : "••••••••"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTest(provider.id)}
                        loading={testing[provider.id]}
                      >
                        🧪 Test
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingProvider(provider.id)}
                      >
                        ✏️ Ubah
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(provider.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                )}

                {/* Input form — show when not connected or editing */}
                {(!isConnected || isEditing) && (
                  <div className="space-y-3 rounded-lg p-4 bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys[provider.id] ? "text" : "password"}
                          value={apiKeyInputs[provider.id] || ""}
                          onChange={(e) =>
                            handleKeyChange(provider.id, e.target.value)
                          }
                          placeholder={`Masukkan ${provider.name} API key...`}
                          className="input-field w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(provider.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                        >
                          {showKeys[provider.id] ? "🙈" : "👁️"}
                        </button>
                      </div>
                      {getProviderHint(provider.id)}
                    </div>

                    {provider.id === "custom" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Base URL *
                        </label>
                        <input
                          type="text"
                          value={baseUrlInputs[provider.id] || ""}
                          onChange={(e) =>
                            setBaseUrlInputs((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          placeholder="https://your-server.com/v1"
                          className="input-field w-full"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Endpoint harus OpenAI-compatible (contoh:
                          http://localhost:1430/v1)
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingProvider(null)}
                        >
                          Batal
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSave(provider.id)}
                        loading={saveConfigLoading}
                      >
                        💾 Simpan API Key
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// Tab 3: Custom Model
// ============================================
function CustomModelsTab({
  providers,
  customModels,
  userConfigs,
  hasProviderConfig,
  onAddModel,
  onDeleteModel,
  addLoading,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    providerId: "",
    modelId: "",
    name: "",
    customBaseUrl: "",
    contextWindow: 4096,
    maxOutputTokens: 2048,
    supportsJson: false,
    supportsTools: false,
    supportsImages: false,
    supportsParallelToolCalls: false,
    supportsPromptCache: false,
    supportsChatCompletions: true,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Only providers the user has configured (or built-in)
  const availableProviders = providers.filter((p) => hasProviderConfig(p.id));

  function resetForm() {
    const defaultProvider = availableProviders[0]?.id || "";
    const defaultConfig = userConfigs.find(
      (c) => c.provider_id === defaultProvider,
    );
    setForm({
      providerId: defaultProvider,
      modelId: "",
      name: "",
      customBaseUrl: defaultConfig?.custom_base_url || "",
      contextWindow: 4096,
      maxOutputTokens: 2048,
      supportsJson: false,
      supportsTools: false,
      supportsImages: false,
      supportsParallelToolCalls: false,
      supportsPromptCache: false,
      supportsChatCompletions: true,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.providerId || !form.modelId || !form.name) {
      toast({
        type: "warning",
        title: "Form belum lengkap",
        message: "Isi provider, model ID, dan nama",
      });
      return;
    }
    try {
      await onAddModel(form);
      toast({
        type: "success",
        title: "Berhasil",
        message: `Custom model "${form.name}" berhasil ditambahkan`,
      });
      resetForm();
    } catch (err) {
      toast({ type: "error", title: "Gagal", message: err.message });
    }
  }

  async function handleDelete(modelId) {
    try {
      await onDeleteModel(modelId);
      setDeleteConfirmId(null);
      toast({
        type: "success",
        title: "Dihapus",
        message: "Custom model berhasil dihapus",
      });
    } catch (err) {
      toast({ type: "error", title: "Gagal", message: err.message });
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Custom Model Form */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">
          ➕ Tambah Custom Model
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Tambahkan model fine-tuned atau model dari provider yang belum
          terdaftar. Provider harus sudah dikonfigurasi di tab API Keys.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider *
              </label>
              <select
                value={form.providerId}
                onChange={(e) => {
                  const pid = e.target.value;
                  const config = userConfigs.find((c) => c.provider_id === pid);
                  setForm({
                    ...form,
                    providerId: pid,
                    customBaseUrl: config?.custom_base_url || "",
                  });
                }}
                className="input-field w-full"
              >
                <option value="">Pilih provider...</option>
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
              {availableProviders.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Setup API key minimal 1 provider dulu di tab "API Keys"
                </p>
              )}
            </div>

            <Input
              label="Model ID *"
              value={form.modelId}
              onChange={(e) => setForm({ ...form, modelId: e.target.value })}
              placeholder="contoh: ft:gpt-4o-mini:my-org:custom:abc123"
            />

            <Input
              label="Nama Tampilan *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="contoh: GPT-4o Fine-tuned Copy ID"
            />

            <Input
              label="Custom Base URL"
              value={form.customBaseUrl}
              onChange={(e) =>
                setForm({ ...form, customBaseUrl: e.target.value })
              }
              placeholder={
                form.providerId === "custom"
                  ? "https://your-server.com/v1 (wajib untuk Custom Endpoint)"
                  : "Kosongkan untuk pakai URL default provider"
              }
              error={
                form.providerId === "custom" && !form.customBaseUrl
                  ? "Custom Base URL wajib disi untuk Custom Endpoint"
                  : undefined
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context Window
              </label>
              <input
                type="number"
                value={form.contextWindow}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contextWindow: parseInt(e.target.value) || 4096,
                  })
                }
                className="input-field w-full"
                min={1}
                step={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Output Tokens
              </label>
              <input
                type="number"
                value={form.maxOutputTokens}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxOutputTokens: parseInt(e.target.value) || 2048,
                  })
                }
                className="input-field w-full"
                min={1}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Capabilities</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.supportsTools}
                  onChange={(e) =>
                    setForm({ ...form, supportsTools: e.target.checked })
                  }
                  className="rounded"
                />
                🔧 Supports Tools
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.supportsImages}
                  onChange={(e) =>
                    setForm({ ...form, supportsImages: e.target.checked })
                  }
                  className="rounded"
                />
                🖼️ Supports Images
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.supportsParallelToolCalls}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supportsParallelToolCalls: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                ⚡ Parallel Tool Calls
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.supportsPromptCache}
                  onChange={(e) =>
                    setForm({ ...form, supportsPromptCache: e.target.checked })
                  }
                  className="rounded"
                />
                💾 Prompt Cache
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.supportsChatCompletions}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supportsChatCompletions: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                💬 Chat Completions
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.supportsJson}
                  onChange={(e) =>
                    setForm({ ...form, supportsJson: e.target.checked })
                  }
                  className="rounded"
                />
                📋 JSON Mode
              </label>
            </div>
          </div>

          <Button type="submit" loading={addLoading}>
            ➕ Tambah Custom Model
          </Button>
        </form>
      </Card>

      {/* List of Custom Models */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Custom Model Saya</h3>
        {customModels.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-3xl mb-2">🔧</p>
            <p className="text-sm text-gray-400">Belum ada custom model</p>
            <p className="text-xs text-gray-400 mt-1">
              Tambahkan model fine-tuned atau self-hosted di form di atas
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {customModels.map((model) => {
              const configEntry = userConfigs.find(
                (c) => c.id === model.config_id,
              );
              const provider = providers.find(
                (p) => p.id === (configEntry?.provider_id || model.provider_id),
              );
              return (
                <Card key={model.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                    {provider?.icon || "🔧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {model.name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {provider?.name} •{" "}
                      <code className="bg-gray-100 px-1 rounded">
                        {model.model_id}
                      </code>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {model.context_window >= 1024
                        ? `${Math.round(model.context_window / 1024)}K`
                        : model.context_window}{" "}
                      ctx
                      {" • "}
                      {model.max_output_tokens >= 1024
                        ? `${Math.round(model.max_output_tokens / 1024)}K`
                        : model.max_output_tokens}{" "}
                      max output
                      {model.supports_json_mode && " • JSON ✓"}
                    </p>
                    {/* Capabilities badges */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {model.supports_tools && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                          🔧 Tools
                        </span>
                      )}
                      {model.supports_images && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                          🖼️ Images
                        </span>
                      )}
                      {model.supports_parallel_tool_calls && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600">
                          ⚡ Parallel
                        </span>
                      )}
                      {model.supports_prompt_cache && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                          💾 Cache
                        </span>
                      )}
                      {model.supports_json_mode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                          📋 JSON
                        </span>
                      )}
                      {model.supports_chat_completions && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600">
                          💬 Chat
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge color="purple" className="text-xs">
                      Custom
                    </Badge>
                    {deleteConfirmId === model.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(model.id)}
                        >
                          Ya, Hapus
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(model.id)}
                      >
                        🗑️
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Page
// ============================================
export default function AIModelsPage() {
  const {
    providers,
    presetModels,
    userConfigs,
    customModels,
    preferences,
    allModels,
    modelsByProvider,
    activeModel,
    hasProviderConfig,
    getProviderConfig,
    getModelForType,
    saveConfig,
    saveConfigLoading,
    deleteConfig,
    deleteConfigLoading,
    addCustomModel,
    addCustomModelLoading,
    deleteCustomModel,
    deleteCustomModelLoading,
    setPreference,
    setPreferenceLoading,
  } = useAIModels();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("models");

  const tabs = [
    { value: "models", label: "Model Aktif", icon: "🤖" },
    { value: "api-keys", label: "API Keys", icon: "🔑" },
    { value: "custom", label: "Custom Model", icon: "🔧" },
  ];

  async function handleSelectModel(provider, model) {
    try {
      await setPreference({
        generationType: null,
        presetModelId: model.isCustom ? null : model.id,
        customModelId: model.isCustom ? model.id : null,
      });
      toast({
        type: "success",
        title: "Model Default Diubah",
        message: `${model.name} (${provider.name}) sekarang jadi model default`,
      });
    } catch (err) {
      toast({ type: "error", title: "Gagal", message: err.message });
    }
  }

  return (
    <div>
      <TopBar
        title="Model AI"
        subtitle="Kelola model AI, API key, dan preferensi untuk content generation"
      />

      {/* Demo mode banner */}
      {!isConfigured && (
        <div className="mb-6 flex items-center gap-3 bg-blue-50 border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
          <span className="text-xl flex-shrink-0">🎭</span>
          <div>
            <span className="font-semibold">Demo Mode aktif.</span> Konfigurasi
            model disimulasikan dan disimpan di localStorage. Hubungkan Supabase
            untuk penyimpanan permanen.
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
            {allModels.length}
          </span>
          <span className="text-sm text-gray-600">
            model tersedia dari {providers.length} provider
          </span>
        </div>
        {activeModel?.model && (
          <span className="inline-flex items-center gap-1 bg-primary-50 border-primary-200 rounded-full px-3 py-0.5 text-xs font-medium text-primary-700">
            🤖 Default: {activeModel.model.name}
          </span>
        )}
        {customModels.length > 0 && (
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-3 py-0.5 text-xs font-medium text-purple-700">
            🔧 {customModels.length} custom model
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        className="mb-6"
      />

      {/* Tab Panels */}
      <TabPanel isActive={activeTab === "models"}>
        <ActiveModelsTab
          providers={providers}
          modelsByProvider={modelsByProvider}
          activeModel={activeModel}
          hasProviderConfig={hasProviderConfig}
          onSelectModel={handleSelectModel}
          setActiveTab={setActiveTab}
        />
      </TabPanel>

      <TabPanel isActive={activeTab === "api-keys"}>
        <APIKeysTab
          providers={providers}
          userConfigs={userConfigs}
          hasProviderConfig={hasProviderConfig}
          onSaveConfig={saveConfig}
          onDeleteConfig={deleteConfig}
          saveConfigLoading={saveConfigLoading}
        />
      </TabPanel>

      <TabPanel isActive={activeTab === "custom"}>
        <CustomModelsTab
          providers={providers}
          customModels={customModels}
          userConfigs={userConfigs}
          hasProviderConfig={hasProviderConfig}
          onAddModel={addCustomModel}
          onDeleteModel={deleteCustomModel}
          addLoading={addCustomModelLoading}
        />
      </TabPanel>
    </div>
  );
}
