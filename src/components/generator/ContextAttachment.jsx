import { useState, useRef, useEffect } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { Textarea } from "../ui/Input";

const TABS = [
  { id: "text", label: "📝 Teks Bebas" },
  { id: "pdf", label: "📄 PDF" },
  { id: "url", label: "🔗 URL" },
  { id: "quick", label: "📋 Quick Context" },
];

const QUICK_TEMPLATES = [
  {
    label: "💬 Testimoni Customer",
    icon: "💬",
    template: 'TESTIMONI:\n1. "..." — @username\n2. "..." — @username',
  },
  {
    label: "📊 Data & Statistik",
    icon: "📊",
    template: "DATA & STATISTIK:\n- ..\n- ...",
  },
  {
    label: "🔍 Kompetitor",
    icon: "🔍",
    template:
      "KOMPETITOR:\n- Nama: .., Harga: ..., Kekurangan: ...\n- Nama: ., Harga: ., Kekurangan: .",
  },
  {
    label: "😩 Pain Points Audience",
    icon: "😩",
    template: "PAIN POINTS AUDIENCE:\n1. ...\n2. ...\n3. ...",
  },
  {
    label: "🎁 Promo/Offer",
    icon: "🎁",
    template: "PROMO AKTIF:\n- Diskon: ...\n- Bonus: ...\n- Deadline: ...",
  },
];

const MAX_CHARS = 50000;

export default function ContextAttachment({ value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // PDF-specific state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(null); // { currentPage, totalPages, percent }
  const [pdfInfo, setPdfInfo] = useState(null); // { fileName, pages, totalPages, truncated, fileSize }
  const [pdfError, setPdfError] = useState(null);
  const fileInputRef = useRef(null);

  // Derive state from value prop with defaults
  const text = value?.text || "";
  const url = value?.url || "";
  const attachmentType = value?.attachmentType || "text";

  // Measure content height for smooth transition
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, activeTab, text, url, pdfLoading, pdfInfo, pdfError]);

  function emitChange(updates) {
    const next = {
      text,
      url,
      attachmentType,
      ...updates,
    };
    onChange?.(next);
  }

  function handleTextChange(e) {
    const newText = e.target.value;
    if (newText.length <= MAX_CHARS) {
      emitChange({ text: newText, attachmentType: "text" });
    }
  }

  function handleUrlChange(e) {
    emitChange({ url: e.target.value, attachmentType: "url" });
  }

  function handleQuickTemplate(template) {
    const separator = text.length > 0 ? "\n\n" : "";
    const newText = text + separator + template;
    if (newText.length <= MAX_CHARS) {
      emitChange({ text: newText, attachmentType: "text" });
      setActiveTab("text");
    }
  }

  async function handlePDFUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfError(null);

    if (file.type !== "application/pdf") {
      setPdfError("File harus berformat PDF.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setPdfError("Ukuran file melebihi batas maksimum 20MB.");
      return;
    }

    setPdfLoading(true);
    setPdfProgress({ currentPage: 0, totalPages: 0, percent: 0 });

    try {
      const { extractTextFromPDF } = await import("../../utils/pdf-extract");
      const result = await extractTextFromPDF(file, {
        maxChars: MAX_CHARS,
        onProgress: setPdfProgress,
      });

      setPdfInfo({
        fileName: result.fileName,
        pages: result.pages,
        totalPages: result.totalPages,
        truncated: result.truncated,
        fileSize: result.fileSize,
      });

      // Set the extracted text as the context text
      emitChange({ text: result.text, attachmentType: "pdf" });

      // Switch to text tab so user can see/edit the extracted text
      setActiveTab("text");
    } catch (err) {
      console.error("PDF extraction error:", err);
      setPdfError(
        "Gagal mengekstrak teks dari PDF. File mungkin rusak, terproteksi password, atau tidak mengandung teks.",
      );
    } finally {
      setPdfLoading(false);
      setPdfProgress(null);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const hasContent = text.length > 0 || url.length > 0;

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200
          ${
            expanded
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : hasContent
                ? "border-primary-200 bg-primary-50/50 text-primary-600 hover:bg-primary-50"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
          }
        `}
      >
        <span className="text-base">📎</span>
        <span className="flex-1 text-left">Tambah Konteks Tambahan</span>
        {hasContent && !expanded && (
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
            {pdfInfo
              ? `📄 ${pdfInfo.fileName}`
              : text.length > 0
                ? `${text.length} karakter`
                : "URL"}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7"
          />
        </svg>
      </button>

      {/* Collapsible content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? `${contentHeight + 32}px` : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div ref={contentRef}>
          <Card className="mt-2 p-0 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                      flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative
                      ${
                        activeTab === tab.id
                          ? "text-primary-700 bg-white"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }
                    `}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">
              {/* Teks Bebas */}
              {activeTab === "text" && (
                <div>
                  <Textarea
                    rows={5}
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Paste apa aja yang bisa bantu AI bikin konten lebih relevan: isi ebook, landing page copy, research notes, contoh konten kompetitor, dll..."
                    className="w-full"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">
                      Konteks ini akan dimasukkan ke dalam prompt AI
                    </p>
                    <span
                      className={`text-xs font-medium ${text.length > MAX_CHARS * 0.9 ? "text-amber-600" : "text-gray-400"}`}
                    >
                      {text.length.toLocaleString("id-ID")}/
                      {MAX_CHARS.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}

              {/* PDF Upload */}
              {activeTab === "pdf" && (
                <div>
                  {/* Upload area */}
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePDFUpload({ target: { files: [file] } });
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePDFUpload}
                      className="hidden"
                    />

                    {pdfLoading ? (
                      <div>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
                        <p className="text-sm font-medium text-primary-700">
                          Mengekstrak teks dari PDF...
                        </p>
                        {pdfProgress && (
                          <div className="mt-2">
                            <div className="w-48 mx-auto bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-primary-600 h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${pdfProgress.percent}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Halaman {pdfProgress.currentPage}/
                              {pdfProgress.totalPages}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl mb-2 block">📄</span>
                        <p className="text-sm font-medium text-gray-700">
                          Klik atau drag PDF ke sini
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Maks 20MB • Teks akan diekstrak otomatis sebagai
                          konteks AI
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {pdfError && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border-red-200">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-500">❌</span>
                        <span className="font-medium text-red-700">
                          {pdfError}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PDF info after extraction */}
                  {pdfInfo && (
                    <div className="mt-3 p-3 bg-accent-50 rounded-lg border border-accent-200">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-accent-600">✅</span>
                        <span className="font-medium text-accent-800">
                          {pdfInfo.fileName}
                        </span>
                      </div>
                      <p className="text-xs text-accent-600 mt-1">
                        {pdfInfo.pages} dari {pdfInfo.totalPages} halaman
                        diekstrak
                        {pdfInfo.truncated &&
                          " (terpotong karena batas karakter)"}
                        {" • "}
                        {(pdfInfo.fileSize / 1024).toFixed(0)} KB
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Teks hasil ekstraksi ada di tab "📝 Teks Bebas" — bisa
                        diedit sebelum generate.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* URL */}
              {activeTab === "url" && (
                <div>
                  <Input
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="https://landingpage.com/produk-kamu"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    💡 AI akan mengunakan URL ini sebagai referensi konteks.
                    <span className="text-gray-300 ml-1">
                      (Scraping otomatis belum tersedia — URL akan dikirim
                      sebagai teks konteks)
                    </span>
                  </p>
                </div>
              )}

              {/* Quick Context */}
              {activeTab === "quick" && (
                <div>
                  <p className="text-xs text-gray-500 mb-3">
                    Klik template untuk menambahkan ke teks konteks. Edit sesuai
                    kebutuhan.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => handleQuickTemplate(tpl.template)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-gray-200 bg-white text-left text-sm text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                      >
                        <span className="text-base flex-shrink-0">
                          {tpl.icon}
                        </span>
                        <span className="font-medium text-xs">{tpl.label}</span>
                      </button>
                    ))}
                  </div>
                  {text.length > 0 && (
                    <p className="text-xs text-primary-600 mt-3 flex items-center gap-1">
                      <span>✅</span>
                      <span>
                        Template akan ditambahkan ke teks yang sudah ada (
                        {text.length} karakter)
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Clear button — shown when there's content */}
            {hasContent && (
              <div className="px-4 pb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    emitChange({ text: "", url: "", attachmentType: "text" });
                    setPdfInfo(null);
                    setPdfError(null);
                  }}
                  className="text-xs text-gray-400 hover:text-danger-600 transition-colors flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Hapus semua konteks</span>
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
