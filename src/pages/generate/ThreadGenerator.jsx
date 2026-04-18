import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  provokasi: "Provokasi",
  storytelling: "Storytelling",
  "value bomb": "Value Bomb",
};

export default function ThreadGenerator() {
  const { generate, generating, result, error, saveToLibrary } = useGenerator();
  const { activeBrand } = useBrand();
  const { getModelForType } = useAIModels();
  const { toast } = useToast();
  const location = useLocation();
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [contextData, setContextData] = useState({
    text: "",
    url: "",
    attachmentType: "text",
  });
  const [form, setForm] = useState({
    topic: "",
    threadLength: "7",
    platform: "twitter",
    additionalContext: "",
  });
  const [fromAnalysis, setFromAnalysis] = useState(false);

  useEffect(() => {
    if (location.state?.prefill) {
      const { topic, additionalContext, platform, threadLength } =
        location.state.prefill;
      setForm((prev) => ({
        ...prev,
        ...(topic !== undefined && { topic }),
        ...(additionalContext !== undefined && { additionalContext }),
        ...(platform !== undefined && { platform }),
        ...(threadLength !== undefined && { threadLength }),
      }));
      setFromAnalysis(true);
      // Bersihkan state agar tidak re-apply saat navigasi balik
      window.history.replaceState({}, "");
    }
  }, []);
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

    const modelConfig = selectedModel || getModelForType("thread");
    await generate({
      type: "thread",
      platform: form.platform,
      brand: activeBrand,
      product: selectedProduct,
      params: {
        topic: form.topic,
        threadLength: parseInt(form.threadLength),
        additionalContext: combinedContext,
      },
      modelConfig,
    });
  }

  const handleSave = useCallback(
    async (variation, index) => {
      try {
        const content = (variation.tweets || [])
          .map((t) => `${t.number}/${variation.tweets.length}\n${t.content}`)
          .join("\n\n");
        await saveToLibrary({
          generationId: result?.historyId,
          type: "thread",
          title:
            variation.title ||
            `Thread ${variation.style || `Variasi ${index + 1}`}`,
          content,
          metadata: { style: variation.style, tweets: variation.tweets },
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

  const handleCopyAll = useCallback((variation) => {
    const text = (variation.tweets || [])
      .map((t) => t.content)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  }, []);

  const variations = result?.variations || [];
  const active = variations[activeTab];

  return (
    <div>
      <TopBar
        title="Thread Generator"
        subtitle="Generate thread viral untuk Twitter/X & Threads"
      />
      {fromAnalysis && (
        <div className="mb-4 px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-800 flex items-start gap-2">
          <span className="text-lg leading-none">🔍</span>
          <div>
            <p className="font-semibold">Dilanjutkan dari Analisis Threads</p>
            <p className="text-primary-700">
              Form sudah diisi otomatis dengan konteks analisis AI. Review topik
              & context, lalu klik Generate.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              options={[
                { value: "twitter", label: "Twitter/X" },
                { value: "threads", label: "Threads" },
              ]}
            />

            <ProductSelector
              value={selectedProduct}
              onChange={setSelectedProduct}
            />

            <Textarea
              label="Topik Thread"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="5 pelajaran dari 3 tahun jualan digital product"
              required
            />
            <Input
              label="Jumlah Tweet/Post"
              type="number"
              min={1}
              max={10}
              value={form.threadLength}
              onChange={(e) =>
                setForm({ ...form, threadLength: e.target.value })
              }
              placeholder="1 - 10"
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
                generationType="thread"
                value={selectedModel}
                onChange={setSelectedModel}
              />
            </div>
            <Button type="submit" className="w-full" loading={generating}>
              {generating ? "Generating..." : "Generate Thread"}
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyAll(active)}
                      >
                        Copy All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(active, activeTab)}
                      >
                        {saved[activeTab] ? "Tersimpan" : "Simpan"}
                      </Button>
                    </div>
                  </div>
                  {(active.tweets || []).map((t, i) => (
                    <Card
                      key={i}
                      className={`border-l-4 ${t.type === "hook" ? "border-l-warning-500" : t.type === "cta" ? "border-l-accent-500" : "border-l-gray-200"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">
                          {t.number}/{active.tweets.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {t.content?.length || 0}/280
                          </span>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(t.content)
                            }
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{t.content}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🧵</p>
              <p className="text-sm">Thread akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
