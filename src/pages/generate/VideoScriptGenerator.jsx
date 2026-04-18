import { useState, useCallback } from "react";
import { useGenerator } from "../../hooks/useGenerator";
import { useBrand } from "../../hooks/useBrand";
import { useAIModels } from "../../hooks/useAIModels";
import { useToast } from "../../components/ui/Toast";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input, { Textarea, Select } from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import ModelSelector from "../../components/generator/ModelSelector";
import ProductSelector from "../../components/generator/ProductSelector";
import ContextAttachment from "../../components/generator/ContextAttachment";

const STYLE_LABELS = {
  "hook kontroversial": "Hook Kontroversial",
  storytelling: "Storytelling",
  "tutorial cepat": "Tutorial Cepat",
};

export default function VideoScriptGenerator() {
  const { generate, generating, result, error, saveToLibrary } = useGenerator();
  const { activeBrand } = useBrand();
  const { getModelForType } = useAIModels();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [contextData, setContextData] = useState({
    text: "",
    url: "",
    attachmentType: "text",
  });
  const [form, setForm] = useState({
    topic: "",
    platform: "tiktok",
    duration: "30-60",
    additionalContext: "",
  });
  const [activeTab, setActiveTab] = useState(0);
  const [saved, setSaved] = useState({});

  async function handleGenerate(e) {
    e.preventDefault();
    setActiveTab(0);
    setSaved({});

    const combinedContext = [
      form.additionalContext,
      contextData.text,
      contextData.url ? `Referensi URL: ${contextData.url}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const modelConfig = selectedModel || getModelForType("video_script");
    await generate({
      type: "video_script",
      platform: form.platform,
      brand: activeBrand,
      product: selectedProduct,
      params: {
        topic: form.topic,
        duration: form.duration,
        additionalContext: combinedContext,
      },
      modelConfig,
    });
  }

  const handleSave = useCallback(
    async (variation, index) => {
      try {
        const content = `[Hook] ${variation.script?.hook?.narration || ""}\n\n${(variation.script?.body || []).map((s, i) => `[Scene ${i + 1}] ${s.narration}`).join("\n\n")}\n\n[CTA] ${variation.script?.cta?.narration || ""}`;
        await saveToLibrary({
          generationId: result?.historyId,
          type: "video_script",
          title:
            variation.title ||
            `Video Script ${variation.style || `Variasi ${index + 1}`}`,
          content,
          metadata: {
            style: variation.style,
            script: variation.script,
            caption: variation.caption,
            hashtags: variation.hashtags,
          },
          tags: [form.platform],
        });
        setSaved((prev) => ({ ...prev, [index]: true }));
      } catch (err) {
        toast({
          type: "error",
          title: "Gagal Menyimpan",
          message: err.message,
        });
      }
    },
    [result, form],
  );

  const variations = result?.variations || [];
  const active = variations[activeTab];

  return (
    <div>
      <TopBar
        title="Video Script Generator"
        subtitle="Script untuk Reels, TikTok, & YouTube Shorts"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              options={[
                { value: "tiktok", label: "TikTok" },
                { value: "instagram", label: "Instagram Reels" },
                { value: "youtube", label: "YouTube Shorts" },
              ]}
            />
            <Select
              label="Durasi"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              options={[
                { value: "15-30", label: "15-30 detik" },
                { value: "30-60", label: "30-60 detik" },
                { value: "60-90", label: "60-90 detik" },
              ]}
            />

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
            />

            <Textarea
              label="Topik Video"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Review jujur: apakah ebook ini worth it?"
              required
            />
            <Textarea
              label="Context Tambahan (opsional)"
              value={form.additionalContext}
              onChange={(e) =>
                setForm({ ...form, additionalContext: e.target.value })
              }
              placeholder="Paste info produk, ringkasan ebook, poin-poin penting, dll..."
              rows={3}
            />

            <ContextAttachment value={contextData} onChange={setContextData} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model AI
              </label>
              <ModelSelector
                generationType="video_script"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Generating..." : "Generate Script"}
            </Button>
          </form>
        </Card>

        <div>
          {error && (
            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          {variations.length > 0 ? (
            <div>
              <div className="flex gap-2 mb-4">
                {variations.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {v.style
                      ? STYLE_LABELS[v.style] || v.style
                      : `Variasi ${i + 1}`}
                  </button>
                ))}
              </div>
              {active && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {active.title && (
                      <h4 className="font-medium">{active.title}</h4>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSave(active, activeTab)}
                    >
                      {saved[activeTab] ? "Tersimpan" : "Simpan"}
                    </Button>
                  </div>
                  <Card className="border-l-4 border-l-warning-500">
                    <p className="text-xs font-medium text-warning-600 uppercase mb-1">
                      Hook ({active.script?.hook?.duration})
                    </p>
                    <p className="text-sm font-medium">
                      {active.script?.hook?.narration}
                    </p>
                    {active.script?.hook?.visual && (
                      <p className="text-xs text-gray-400 mt-1">
                        Visual: {active.script.hook.visual}
                      </p>
                    )}
                  </Card>
                  {active.script?.body?.map((scene, i) => (
                    <Card key={i}>
                      <p className="text-xs text-gray-400 mb-1">
                        Scene {i + 1} ({scene.duration})
                      </p>
                      <p className="text-sm">{scene.narration}</p>
                      {scene.visual && (
                        <p className="text-xs text-gray-400 mt-1">
                          Visual: {scene.visual}
                        </p>
                      )}
                    </Card>
                  ))}
                  <Card className="border-l-4 border-l-accent-500">
                    <p className="text-xs font-medium text-accent-600 uppercase mb-1">
                      CTA ({active.script?.cta?.duration})
                    </p>
                    <p className="text-sm font-medium">
                      {active.script?.cta?.narration}
                    </p>
                  </Card>
                  {active.caption && (
                    <Card className="bg-gray-50">
                      <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                        Caption
                      </p>
                      <p className="text-sm">{active.caption}</p>
                      {active.hashtags && (
                        <p className="text-sm text-primary-600 mt-2">
                          {active.hashtags
                            .map((h) => (h.startsWith("#") ? h : `#${h}`))
                            .join(" ")}
                        </p>
                      )}
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🎬</p>
              <p className="text-sm">Video script akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
