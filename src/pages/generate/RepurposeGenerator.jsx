import { useState } from "react";
import { useGenerator } from "../../hooks/useGenerator";
import { useBrand } from "../../hooks/useBrand";
import { useAIModels } from "../../hooks/useAIModels";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import { Textarea, Select } from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import ModelSelector from "../../components/generator/ModelSelector";
import ProductSelector from "../../components/generator/ProductSelector";
import ContextAttachment from "../../components/generator/ContextAttachment";

const TARGET_FORMATS = [
  "caption",
  "thread",
  "carousel",
  "ad_copy",
  "video_script",
  "email",
];

export default function RepurposeGenerator() {
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
    sourceContent: "",
    sourceType: "caption",
    targetFormats: ["thread", "carousel"],
  });

  function toggleFormat(f) {
    setForm((prev) => ({
      ...prev,
      targetFormats: prev.targetFormats.includes(f)
        ? prev.targetFormats.filter((x) => x !== f)
        : [...prev.targetFormats, f],
    }));
  }

  async function handleGenerate(e) {
    e.preventDefault();

    const combinedContext = [
      contextData.text,
      contextData.url ? `Referensi URL: ${contextData.url}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const modelConfig = selectedModel || getModelForType("repurpose");
    await generate({
      type: "repurpose",
      brand: activeBrand,
      product: selectedProduct,
      params: {
        sourceContent: form.sourceContent,
        sourceType: form.sourceType,
        targetFormats: form.targetFormats,
        additionalContext: combinedContext || undefined,
      },
      modelConfig,
    });
  }

  return (
    <div>
      <TopBar title="Repurpose Content" subtitle="1 konten -> multi format" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Tipe Konten Asli"
              value={form.sourceType}
              onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
              options={[
                { value: "caption", label: "Caption" },
                { value: "thread", label: "Thread" },
                { value: "article", label: "Artikel/Blog" },
                { value: "video_script", label: "Video Script" },
              ]}
            />

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
            />

            <Textarea
              label="Konten Asli"
              value={form.sourceContent}
              onChange={(e) =>
                setForm({ ...form, sourceContent: e.target.value })
              }
              rows={6}
              placeholder="Paste konten yang ingin di-repurpose..."
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Format
              </label>
              <div className="flex flex-wrap gap-2">
                {TARGET_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFormat(f)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                      form.targetFormats.includes(f)
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {f.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <ContextAttachment value={contextData} onChange={setContextData} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model AI
              </label>
              <ModelSelector
                generationType="repurpose"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Repurposing..." : "Repurpose Content"}
            </Button>
          </form>
        </Card>

        <div>
          {error && (
            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          {result?.repurposed ? (
            <div className="space-y-4">
              {result.repurposed.map((item, i) => (
                <Card key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge bg-primary-100 text-primary-700 capitalize">
                      {item.format?.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.platform}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-2">
                      Notes: {item.notes}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => navigator.clipboard.writeText(item.content)}
                  >
                    Copy
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">♻️</p>
              <p className="text-sm">Hasil repurpose akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
