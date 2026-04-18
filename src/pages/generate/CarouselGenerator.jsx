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
  edukatif: "Edukatif",
  storytelling: "Storytelling",
  listicle: "Listicle",
};

export default function CarouselGenerator() {
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
    slideCount: "7",
    angle: "",
    platform: "instagram",
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

    const modelConfig = selectedModel || getModelForType("carousel");
    await generate({
      type: "carousel",
      platform: form.platform,
      brand: activeBrand,
      product: selectedProduct,
      params: {
        topic: form.topic,
        slideCount: parseInt(form.slideCount),
        angle: form.angle,
        additionalContext: combinedContext,
      },
      modelConfig,
    });
  }

  const handleSave = useCallback(
    async (variation, index) => {
      try {
        const content = (variation.slides || [])
          .map(
            (s) =>
              `[Slide ${s.slide} - ${s.type}]\n${s.headline}\n${s.body || s.subtext || s.cta || ""}`,
          )
          .join("\n\n");
        await saveToLibrary({
          generationId: result?.historyId,
          type: "carousel",
          title:
            variation.title ||
            `Carousel ${variation.style || `Variasi ${index + 1}`}`,
          content,
          metadata: {
            style: variation.style,
            slides: variation.slides,
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
        title="Carousel Script"
        subtitle="Generate script carousel multi-slide"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold mb-4">Input</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Textarea
              label="Topik Carousel"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="5 Kesalahan Copywriting yang Bikin Produk Nggak Laku"
              required
            />

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
            />

            <Input
              label="Jumlah Slide"
              type="number"
              min={3}
              max={15}
              value={form.slideCount}
              onChange={(e) => setForm({ ...form, slideCount: e.target.value })}
              placeholder="3 - 15"
            />
            <Input
              label="Angle (opsional)"
              value={form.angle}
              onChange={(e) => setForm({ ...form, angle: e.target.value })}
              placeholder="Storytelling, data-driven, controversial..."
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
                generationType="carousel"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Generating..." : "Generate Carousel"}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {active.title && (
                      <h4 className="font-medium text-lg">{active.title}</h4>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSave(active, activeTab)}
                    >
                      {saved[activeTab] ? "Tersimpan" : "Simpan"}
                    </Button>
                  </div>
                  {(active.slides || []).map((slide, i) => (
                    <Card
                      key={i}
                      className={`border-l-4 ${slide.type === "cover" ? "border-l-primary-500" : slide.type === "cta" ? "border-l-accent-500" : "border-l-gray-300"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400 uppercase">
                          {slide.type || `Slide ${slide.slide}`}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{slide.slide}
                        </span>
                      </div>
                      <p className="font-semibold text-sm">{slide.headline}</p>
                      {slide.body && (
                        <p className="text-sm text-gray-600 mt-1">
                          {slide.body}
                        </p>
                      )}
                      {slide.subtext && (
                        <p className="text-sm text-gray-500 mt-1">
                          {slide.subtext}
                        </p>
                      )}
                      {slide.cta && (
                        <p className="text-sm font-medium text-accent-600 mt-1">
                          {slide.cta}
                        </p>
                      )}
                    </Card>
                  ))}
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
              <p className="text-3xl mb-2">📑</p>
              <p className="text-sm">Script carousel akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
