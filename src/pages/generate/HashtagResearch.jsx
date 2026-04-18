import { useState } from "react";
import { useGenerator } from "../../hooks/useGenerator";
import { useBrand } from "../../hooks/useBrand";
import { useAIModels } from "../../hooks/useAIModels";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input, { Select } from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ModelSelector from "../../components/generator/ModelSelector";
import ProductSelector from "../../components/generator/ProductSelector";
import ContextAttachment from "../../components/generator/ContextAttachment";

export default function HashtagResearch() {
  const { generate, generating, result, error } = useGenerator();
  const { activeBrand } = useBrand();
  const { getModelForType } = useAIModels();
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [contextData, setContextData] = useState({
    text: "",
    url: "",
    attachmentType: "text",
  });
  const [form, setForm] = useState({
    platform: "instagram",
    topic: "",
    niche: "",
  });

  async function handleGenerate(e) {
    e.preventDefault();

    const combinedContext = [
      contextData.text,
      contextData.url ? `Referensi URL: ${contextData.url}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const modelConfig = selectedModel || getModelForType("hashtags");
    await generate({
      type: "hashtags",
      platform: form.platform,
      brand: activeBrand,
      product: selectedProduct,
      params: {
        topic: form.topic,
        niche: form.niche || activeBrand?.niche,
        additionalContext: combinedContext || undefined,
      },
      modelConfig,
    });
  }

  const reachColors = { high: "green", medium: "yellow", low: "gray" };
  const catColors = {
    trending: "red",
    niche: "blue",
    branded: "purple",
    community: "green",
  };

  return (
    <div>
      <TopBar
        title="Hashtag Research"
        subtitle="Riset hashtag trending & niche"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              options={[
                { value: "instagram", label: "Instagram" },
                { value: "tiktok", label: "TikTok" },
                { value: "twitter", label: "Twitter/X" },
                { value: "threads", label: "Threads" },
              ]}
            />
            <Input
              label="Niche"
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              placeholder={
                activeBrand?.niche || "Digital marketing, copywriting..."
              }
            />
            <Input
              label="Topik Spesifik (opsional)"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Launch ebook baru"
            />

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
            />

            <ContextAttachment value={contextData} onChange={setContextData} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model AI
              </label>
              <ModelSelector
                generationType="hashtags"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Researching..." : "Research Hashtag"}
            </Button>
          </form>
        </Card>

        <div>
          {error && (
            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          {result?.hashtags ? (
            <div className="space-y-4">
              <Card>
                <h4 className="font-semibold mb-3">
                  Hasil ({result.hashtags.length} hashtag)
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.hashtags.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => navigator.clipboard.writeText(h.tag)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                    >
                      {h.tag}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      result.hashtags.map((h) => h.tag).join(" "),
                    )
                  }
                >
                  Copy Semua
                </Button>
              </Card>

              <Card>
                <h4 className="font-semibold mb-3">Detail</h4>
                <div className="space-y-2">
                  {result.hashtags.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-sm font-medium">{h.tag}</span>
                      <div className="flex gap-2">
                        <Badge color={catColors[h.category]}>
                          {h.category}
                        </Badge>
                        <Badge color={reachColors[h.estimated_reach]}>
                          {h.estimated_reach}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {result.strategy && (
                <Card className="bg-primary-50 border-primary-200">
                  <h4 className="font-semibold text-primary-800 mb-1">
                    Strategi
                  </h4>
                  <p className="text-sm text-primary-700">{result.strategy}</p>
                </Card>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">#️⃣</p>
              <p className="text-sm">Hasil riset hashtag akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
