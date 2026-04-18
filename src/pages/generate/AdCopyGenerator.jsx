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
  "pain point attack": "Pain Point",
  "social proof": "Social Proof",
  FOMO: "FOMO",
};

export default function AdCopyGenerator() {
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
    platform: "meta_ads",
    objective: "conversion",
    angle: "",
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

    const modelConfig = selectedModel || getModelForType("ad_copy");
    await generate({
      type: "ad_copy",
      platform: form.platform,
      brand: activeBrand,
      product: selectedProduct,
      params: {
        objective: form.objective,
        angle: form.angle,
        additionalContext: combinedContext,
      },
      modelConfig,
    });
  }

  const handleSave = useCallback(
    async (variation, index) => {
      try {
        await saveToLibrary({
          generationId: result?.historyId,
          type: "ad_copy",
          title:
            variation.headline ||
            `Ad Copy ${variation.style || `Variasi ${index + 1}`}`,
          content: `${variation.headline}\n\n${variation.primary_text}`,
          metadata: {
            style: variation.style,
            headline: variation.headline,
            primary_text: variation.primary_text,
            description: variation.description,
            cta_button: variation.cta_button,
            hook: variation.hook,
          },
          tags: [form.platform, form.objective],
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
        title="Ad Copy Generator"
        subtitle="Generate headline + body + CTA untuk ads"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Platform Ads"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              options={[
                { value: "meta_ads", label: "Meta Ads (FB/IG)" },
                { value: "tiktok_ads", label: "TikTok Ads" },
                { value: "google_ads", label: "Google Ads" },
              ]}
            />
            <Select
              label="Objective"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              options={[
                { value: "conversion", label: "Conversion" },
                { value: "traffic", label: "Traffic" },
                { value: "awareness", label: "Awareness" },
                { value: "leads", label: "Lead Generation" },
              ]}
            />

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
              prominent={true}
            />

            <Textarea
              label="Angle / Hook"
              value={form.angle}
              onChange={(e) => setForm({ ...form, angle: e.target.value })}
              placeholder="FOMO, social proof, urgency..."
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
                generationType="ad_copy"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Generating..." : "Generate Ad Copy"}
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
                <Card>
                  {active.hook && (
                    <p className="text-xs text-warning-600 font-medium mb-2">
                      Hook: {active.hook}
                    </p>
                  )}
                  <p className="font-bold">{active.headline}</p>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                    {active.primary_text}
                  </p>
                  {active.description && (
                    <p className="text-sm text-gray-500 mt-1 italic">
                      {active.description}
                    </p>
                  )}
                  {active.cta_button && (
                    <span className="inline-block mt-2 px-3 py-1 bg-primary-600 text-white rounded text-sm font-medium">
                      {active.cta_button}
                    </span>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${active.headline}\n\n${active.primary_text}`,
                        )
                      }
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSave(active, activeTab)}
                    >
                      {saved[activeTab] ? "Tersimpan" : "Simpan"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📢</p>
              <p className="text-sm">Ad copy akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
