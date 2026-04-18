import { useState, useCallback } from "react";
import { useGenerator } from "../../hooks/useGenerator";
import { useBrand } from "../../hooks/useBrand";
import { useAIModels } from "../../hooks/useAIModels";
import { useToast } from "../../components/ui/Toast";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input, { Textarea } from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import ModelSelector from "../../components/generator/ModelSelector";
import ProductSelector from "../../components/generator/ProductSelector";
import ContextAttachment from "../../components/generator/ContextAttachment";

const PLATFORMS = [
  "instagram",
  "threads",
  "tiktok",
  "twitter",
  "facebook",
  "youtube",
];
const PILLARS = ["awareness", "showcase", "education", "social_proof"];

export default function CaptionGenerator() {
  const { generate, generating, result, error, saveToLibrary } = useGenerator();
  const { activeBrand } = useBrand();
  const { getModelForType } = useAIModels();
  const [selectedModel, setSelectedModel] = useState(null);
  const [form, setForm] = useState({
    platform: "instagram",
    pillar: "awareness",
    angle: "",
    tone: "",
    includeHashtags: true,
    includeCTA: true,
    additionalContext: "",
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [contextData, setContextData] = useState({
    text: "",
    url: "",
    attachmentType: "text",
  });
  const [activeTab, setActiveTab] = useState(0);
  const [saved, setSaved] = useState({});
  const { toast } = useToast();

  const handleSave = useCallback(
    async (variation, index) => {
      try {
        await saveToLibrary({
          generationId: result?.historyId,
          type: "caption",
          title: `Caption ${variation.style || `Variasi ${index + 1}`}`,
          content: variation.caption,
          metadata: {
            hashtags: variation.hashtags,
            cta: variation.cta,
            style: variation.style,
          },
          tags: [form.platform, form.pillar],
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

  async function handleGenerate(e) {
    e.preventDefault();
    setActiveTab(0);

    const combinedContext = [
      form.additionalContext,
      contextData.text,
      contextData.url ? `Referensi URL: ${contextData.url}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const modelConfig = selectedModel || getModelForType("caption");
    await generate({
      type: "caption",
      platform: form.platform,
      pillar: form.pillar,
      brand: activeBrand,
      product: selectedProduct,
      params: {
        angle: form.angle,
        tone: form.tone,
        includeHashtags: form.includeHashtags,
        includeCTA: form.includeCTA,
        additionalContext: combinedContext,
      },
      modelConfig,
    });
  }

  return (
    <div>
      <TopBar
        title="Caption Generator"
        subtitle="Generate caption untuk semua platform"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold mb-4">Input</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, platform: p })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                      form.platform === p
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilar Konten
              </label>
              <div className="flex flex-wrap gap-2">
                {PILLARS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, pillar: p })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                      form.pillar === p
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {p.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
            />

            <Textarea
              label="Angle / Hook"
              value={form.angle}
              onChange={(e) => setForm({ ...form, angle: e.target.value })}
              placeholder="Contoh: Pain point susah nulis copy yang converting"
            />
            <Input
              label="Tone Tambahan"
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              placeholder="Contoh: Santai, relatable, sedikit humor"
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

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.includeHashtags}
                  onChange={(e) =>
                    setForm({ ...form, includeHashtags: e.target.checked })
                  }
                  className="rounded"
                />
                Include Hashtags
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.includeCTA}
                  onChange={(e) =>
                    setForm({ ...form, includeCTA: e.target.checked })
                  }
                  className="rounded"
                />
                Include CTA
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model AI
              </label>
              <ModelSelector
                generationType="caption"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>

            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Generating..." : "Generate Caption"}
            </Button>
          </form>
        </Card>

        <div>
          <h3 className="font-semibold mb-4">Output</h3>
          {error && (
            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {result?.variations?.length > 0 ? (
            <div>
              <div className="flex gap-2 mb-4">
                {result.variations.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {v.style || `Variasi ${i + 1}`}
                  </button>
                ))}
              </div>
              {result.variations[activeTab] && (
                <Card className="relative">
                  <p className="text-sm whitespace-pre-wrap mb-3">
                    {result.variations[activeTab].caption}
                  </p>
                  {result.variations[activeTab].hashtags?.length > 0 && (
                    <p className="text-sm text-primary-600 mb-2">
                      {result.variations[activeTab].hashtags
                        .map((h) => (h.startsWith("#") ? h : `#${h}`))
                        .join(" ")}
                    </p>
                  )}
                  {result.variations[activeTab].cta && (
                    <p className="text-sm font-medium text-accent-600">
                      CTA: {result.variations[activeTab].cta}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          result.variations[activeTab].caption,
                        )
                      }
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleSave(result.variations[activeTab], activeTab)
                      }
                    >
                      {saved[activeTab] ? "Tersimpan" : "Simpan"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">✨</p>
              <p className="text-sm">Hasil generate akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
