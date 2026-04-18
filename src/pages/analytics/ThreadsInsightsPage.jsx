import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input, { Select } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { PageLoader } from "../../components/ui/LoadingSpinner";
import { supabase, isConfigured } from "../../services/supabase";
import { invokeEdgeFunction } from "../../services/edgeFunctions";
import { useAuth } from "../../hooks/useAuth";
import { useConnectedAccounts } from "../../hooks/useConnectedAccounts";
import { generateContent, cleanJsonResponse } from "../../services/ai";
import { PROMPTS } from "../../utils/prompts";
import { useAIModels } from "../../hooks/useAIModels";
import ModelSelector from "../../components/generator/ModelSelector";

function metricCell(v) {
  if (v === undefined || v === null) return "—";
  return typeof v === "number" ? v.toLocaleString("id-ID") : String(v);
}

export default function ThreadsInsightsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getAccountsForPlatform, loading: accountsLoading } =
    useConnectedAccounts();
  const { getModelForType } = useAIModels();
  const threadsAccounts = getAccountsForPlatform("threads");

  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [analyzePost, setAnalyzePost] = useState(null);
  const [externalClicks, setExternalClicks] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [threadPart, setThreadPart] = useState("");
  const [threadTotal, setThreadTotal] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [accountLinkClicks, setAccountLinkClicks] = useState(null);

  // Next Post Suggestion state
  const [nextPostLoading, setNextPostLoading] = useState(false);
  const [nextPostResult, setNextPostResult] = useState(null);
  const [nextPostError, setNextPostError] = useState("");
  const [nextPostModel, setNextPostModel] = useState(null);

  useEffect(() => {
    if (threadsAccounts.length && !accountId) {
      setAccountId(threadsAccounts[0].id);
    }
  }, [threadsAccounts, accountId]);

  const loadSaved = useCallback(async () => {
    if (!user || !isConfigured || !accountId) {
      setRows([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    const { data, error } = await supabase
      .from("threads_post_insights")
      .select("*")
      .eq("user_id", user.id)
      .eq("connected_account_id", accountId)
      .order("fetched_at", { ascending: false })
      .limit(100);

    if (!error && data) setRows(data);
    setLoadingList(false);
  }, [user, accountId]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  // ── Next Post Suggestion ────────────────
  async function generateNextPostSuggestion() {
    if (rows.length === 0) return;
    setNextPostLoading(true);
    setNextPostError("");
    setNextPostResult(null);

    // Build performance summary from all synced posts
    const postsSummary = rows
      .slice(0, 20)
      .map((r, i) => {
        const m = r.metrics || {};
        const text = (r.post_text || "").slice(0, 200);
        const linkPart = r.link_attachment_url
          ? " | Link: " + r.link_attachment_url
          : "";
        return (
          "Post " +
          (i + 1) +
          ': "' +
          text +
          (r.post_text?.length > 200 ? "..." : "") +
          "\n  Views: " +
          (m.views ?? "?") +
          " | Likes: " +
          (m.likes ?? "?") +
          " | Replies: " +
          (m.replies ?? "?") +
          " | Reposts: " +
          (m.reposts ?? "?") +
          linkPart
        );
      })
      .join("\n\n");

    // Find top performing posts
    const sorted = [...rows]
      .filter((r) => r.metrics?.views)
      .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
    const topPosts = sorted
      .slice(0, 3)
      .map((r, i) => {
        const m = r.metrics || {};
        return (
          "#" +
          (i + 1) +
          " (" +
          m.views +
          " views, " +
          m.likes +
          " likes, " +
          m.replies +
          ' replies): "' +
          (r.post_text || "").slice(0, 150) +
          '..."'
        );
      })
      .join("\n");

    const worstPosts = sorted
      .slice(-3)
      .reverse()
      .map((r, i) => {
        const m = r.metrics || {};
        return (
          "#" +
          (i + 1) +
          " (" +
          m.views +
          " views, " +
          m.likes +
          " likes, " +
          m.replies +
          ' replies): "' +
          (r.post_text || "").slice(0, 150) +
          '..."'
        );
      })
      .join("\n");

    // Calculate averages
    const totalViews = rows.reduce((s, r) => s + (r.metrics?.views || 0), 0);
    const totalLikes = rows.reduce((s, r) => s + (r.metrics?.likes || 0), 0);
    const totalReplies = rows.reduce(
      (s, r) => s + (r.metrics?.replies || 0),
      0,
    );
    const avgViews = Math.round(totalViews / rows.length);
    const avgLikes = Math.round(totalLikes / rows.length);
    const avgReplies = Math.round(totalReplies / rows.length);

    const systemPrompt =
      'Kamu adalah content strategist Indonesia yang ahli menganalisa performa konten Threads/Twitter dan memberikan rekomendasi konten berikutnya.\n\nBerdasarkan data performa postingan, analisa pattern apa yang berhasil dan gagal, lalu rekomendasikan 3 ide konten berikutnya.\n\nOutput WAJIB JSON valid (tanpa markdown code block):\n{"performance_insight":"2-3 kalimat ringkasan pattern performa","what_works":["pattern yang berhasil 1","pattern 2","pattern 3"],"what_fails":["pattern yang gagal 1","pattern 2"],"suggestions":[{"title":"Judul/topik post","type":"thread|single_post|carousel_thread","angle":"angle/hook yang direkomendasikan","why":"kenapa ini diprediksi perform well berdasarkan data","hook_example":"contoh kalimat pembuka","best_time":"rekomendasi waktu posting","estimated_performance":"prediksi views/engagement berdasarkan pattern","content_pilar":"awareness|showcase|education|social_proof","tweet_count":5}],"general_tips":["tip um 1","tip 2","tip 3"]}';

    const userPrompt = [
      "Analisa performa " +
        rows.length +
        " postingan Threads terakhir dan rekomendasikan 3 ide next post.",
      "",
      "RATA-RATA PERFORMA:",
      "- Views: " +
        avgViews +
        "/post | Likes: " +
        avgLikes +
        "/post | Replies: " +
        avgReplies +
        "/post",
      "- Total postingan dianalisa: " + rows.length,
      "",
      "TOP 3 POSTINGAN (performa terbaik):",
      topPosts || "(tidak ada data)",
      "",
      "BOTTOM 3 POSTINGAN (performa terendah):",
      worstPosts || "(tidak ada data)",
      "",
      "SEMUA POSTINGAN:",
      postsSummary,
      "",
      "INSTRUKSI:",
      "1. Identifikasi PATTERN apa yang bikin postingan perform well (topik, format, hook style, panjang, emoji usage, dll)",
      "2. Identifikasi PATTERN yang bikin postingan gagal",
      "3. Rekomendasikan 3 ide konten SPESIFIK yang diprediksi perform well berdasarkan pattern",
      "4. Setiap saran harus punya hook example yang siap pakai",
      "5. Saran harus VARIATIF (beda angle, beda pilar, beda format)",
      "6. Fokus pada apa yang TERBUKTI dari data, bukan teori um",
    ].join("\n");

    try {
      const modelConfig = nextPostModel || getModelForType("thread");
      const { data: aiResult, error: aiError } = await generateContent({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 4096,
        provider: modelConfig?.provider?.id,
        modelId: modelConfig?.model?.model_id,
        customModelId: modelConfig?.isCustom
          ? modelConfig?.model?.id
          : undefined,
        customBaseUrl:
          modelConfig?.customBaseUrl ||
          modelConfig?.provider?.custom_base_url ||
          undefined,
        customApiKey: modelConfig?.userApiKey || undefined,
      });

      if (aiError) {
        setNextPostError(aiError);
        setNextPostLoading(false);
        return;
      }

      let parsed = aiResult?.content;
      if (typeof parsed === "string") {
        const cleaned = cleanJsonResponse(parsed);
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = { text: cleaned };
        }
      }
      if (parsed?.text && !parsed?.suggestions) {
        const cleaned2 = cleanJsonResponse(parsed.text);
        try {
          parsed = JSON.parse(cleaned2);
        } catch {
          /* keep as-is */
        }
      }

      setNextPostResult(parsed);
    } catch (err) {
      setNextPostError(err.message || "Gagal generate suggestion");
    } finally {
      setNextPostLoading(false);
    }
  }

  function handleGenerateFromSuggestion(suggestion) {
    const topic =
      suggestion.title +
      "\n\nAngle: " +
      suggestion.angle +
      "\nHook: " +
      suggestion.hook_example;
    const additionalContext =
      "KONTEKS DARI ANALISIS PERFORMA:\n- Kenapa topik ini: " +
      suggestion.why +
      "\n- Content pilar: " +
      (suggestion.content_pillar || "awareness") +
      "\n- Estimasi performa: " +
      suggestion.estimated_performance +
      "\n- Best time: " +
      (suggestion.best_time || "kapan saja");
    navigate("/generate/thread", {
      state: {
        prefill: {
          topic: topic,
          additionalContext: additionalContext,
          platform: "threads",
          threadLength: String(suggestion.tweet_count || 7),
        },
      },
    });
  }

  async function handleSync() {
    if (!isConfigured || !accountId) return;
    setSyncing(true);
    setSyncError("");
    const { data, error } = await invokeEdgeFunction("threads-insights", {
      accountId,
      limit: 30,
      save: true,
      includeAccountClicks: true,
    });
    if (error) {
      setSyncError(error || "Sinkron gagal");
      setSyncing(false);
      return;
    }
    setAccountLinkClicks(
      Array.isArray(data?.accountLinkClicks) ? data.accountLinkClicks : [],
    );
    await loadSaved();
    setSyncing(false);
  }

  function handleGenerateFromAnalysis() {
    if (!analyzePost || !analysisResult) return;
    const lines = [];
    if (analysisResult.summary)
      lines.push(`📊 Ringkasan analisis:\n${analysisResult.summary}`);
    if (analysisResult.hook_diagnosis)
      lines.push(`🎣 Masalah hook:\n${analysisResult.hook_diagnosis}`);
    if (analysisResult.cta_diagnosis)
      lines.push(`📣 Masalah CTA:\n${analysisResult.cta_diagnosis}`);
    if (
      Array.isArray(analysisResult.likely_blockers) &&
      analysisResult.likely_blockers.length
    ) {
      lines.push(
        `🚧 Hambatan:\n${analysisResult.likely_blockers.map((b) => `- ${b}`).join("\n")}`,
      );
    }
    if (
      Array.isArray(analysisResult.thread_structure_tips) &&
      analysisResult.thread_structure_tips.length
    ) {
      lines.push(
        `💡 Saran struktur:\n${analysisResult.thread_structure_tips.map((t) => `- ${t}`).join("\n")}`,
      );
    }
    if (
      Array.isArray(analysisResult.next_experiment) &&
      analysisResult.next_experiment.length
    ) {
      lines.push(
        `🧪 Eksperimen:\n${analysisResult.next_experiment.map((e) => `- ${e}`).join("\n")}`,
      );
    }
    if (
      Array.isArray(analysisResult.rewrite_snippets) &&
      analysisResult.rewrite_snippets.length
    ) {
      const snippets = analysisResult.rewrite_snippets
        .map((s) => `[${s.placement}] ${s.suggested_text}`)
        .join("\n\n");
      lines.push(`✏️ Cuplikan revisi:\n${snippets}`);
    }

    const topic = `Revisi dan perbaiki konten thread ini berdasarkan hasil analisis AI:\n\n${(analyzePost.post_text || "").slice(0, 300)}`;
    const additionalContext = lines.join("\n\n");

    navigate("/generate/thread", {
      state: {
        prefill: {
          topic,
          additionalContext,
          platform: "threads",
          threadLength: "8",
        },
      },
    });
  }

  async function runAnalysis() {
    if (!analyzePost) return;
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);
    const { systemPrompt, userPrompt } = PROMPTS.threads_post_performance({
      postText: analyzePost.post_text || "",
      metrics: analyzePost.metrics || {},
      permalink: analyzePost.permalink,
      linkInPost: analyzePost.link_attachment_url,
      externalLinkClicks: externalClicks.trim() || undefined,
      externalLinkUrl: externalUrl.trim() || undefined,
      threadPosition: threadPart.trim() ? parseInt(threadPart, 10) : undefined,
      totalThreadParts: threadTotal.trim()
        ? parseInt(threadTotal, 10)
        : undefined,
    });
    const { data: aiResult, error: aiError } = await generateContent({
      systemPrompt,
      userPrompt,
      temperature: 0.65,
      maxTokens: 2500,
    });
    if (aiError) {
      setAnalysisError(aiError);
      setAnalyzing(false);
      return;
    }
    try {
      const raw = aiResult.content;
      setAnalysisResult(typeof raw === "string" ? JSON.parse(raw) : raw);
    } catch (e) {
      setAnalysisError("Gagal parsing hasil analisis AI");
    }
    setAnalyzing(false);
  }

  if (accountsLoading) return <PageLoader />;

  return (
    <div>
      <TopBar
        title="Analisis Threads"
        subtitle="Sinkron insight postingan dari API + diagnosis AI (views vs klik link)"
        actions={
          <Link
            to="/settings/accounts"
            className="text-sm text-primary-600 font-medium hover:underline"
          >
            Akun Terhubung
          </Link>
        }
      />

      {!isConfigured && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Supabase belum dikonfigurasi. Hubungkan{" "}
            <code className="text-xs">VITE_SUPABASE_URL</code> dan key, lalu
            deploy Edge Function{" "}
            <code className="text-xs">threads-insights</code> dan jalankan
            migrasi{" "}
            <code className="text-xs">010_threads_post_insights.sql</code>.
          </p>
        </Card>
      )}

      {isConfigured && threadsAccounts.length === 0 && (
        <Card className="mb-6">
          <p className="text-sm text-gray-700 mb-3">
            Belum ada akun Threads. Hubungkan dulu dengan scope insights.
          </p>
          <Link to="/settings/accounts">
            <Button>Ke Akun Terhubung</Button>
          </Link>
        </Card>
      )}

      {threadsAccounts.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select
                label="Akun Threads"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={threadsAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.account_label || a.platform_username || a.id} (${a.platform_username || "—"})`,
                }))}
              />
            </div>
            <Button
              onClick={handleSync}
              loading={syncing}
              disabled={!isConfigured || !accountId}
            >
              {syncing ? "Sinkron…" : "Sinkron dari Threads"}
            </Button>
          </div>
          {syncError && (
            <p className="text-sm text-red-600 mt-2">{syncError}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Data views/likes/replies diambil lewat Media Insights. Setelah
            sinkron, cek juga blok di bawah: klik URL menurut Threads (7 hari)
            vs klik di Lynk/Smart Link kamu.
          </p>
          {accountLinkClicks && accountLinkClicks.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs">
              <p className="font-semibold text-slate-800 mb-2">
                Klik link (Threads API, ~7 hari terakhir)
              </p>
              <ul className="space-y-1 text-slate-700">
                {accountLinkClicks.map((row, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      {row.value?.toLocaleString?.("id-ID") ?? row.value}
                    </span>
                    {row.link_url ? (
                      <>
                        {" "}
                        → <span className="break-all">{row.link_url}</span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* ── Next Post Suggestion Section ── */}
      {rows.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                🎯 Saran Next Post
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                AI analisa {rows.length} postingan terakhir dan rekomendasikan
                konten berikutnya
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-48">
                <ModelSelector
                  generationType="thread"
                  value={nextPostModel}
                  onChange={setNextPostModel}
                />
              </div>
              <Button
                onClick={generateNextPostSuggestion}
                loading={nextPostLoading}
                variant="primary"
              >
                {nextPostLoading ? "Menganalisa..." : "✨ Generate Saran"}
              </Button>
            </div>
          </div>

          {nextPostError && (
            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {nextPostError}
            </div>
          )}

          {nextPostResult?.suggestions ? (
            <div className="space-y-4">
              {/* Performance Insight */}
              {nextPostResult.performance_insight && (
                <div className="bg-primary-50 border-primary-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-primary-800 mb-2">
                    📊 Insight Performa
                  </p>
                  <p className="text-sm text-primary-700">
                    {nextPostResult.performance_insight}
                  </p>
                </div>
              )}

              {/* What Works & Fails */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.isArray(nextPostResult.what_works) &&
                  nextPostResult.what_works.length > 0 && (
                    <div className="bg-accent-50 border border-accent-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-accent-800 mb-2">
                        ✅ Yang Berhasil
                      </p>
                      <ul className="space-y-1">
                        {nextPostResult.what_works.map((w, i) => (
                          <li
                            key={i}
                            className="text-xs text-accent-700 flex items-start gap-1.5"
                          >
                            <span className="text-accent-500 mt-0.5">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(nextPostResult.what_fails) &&
                  nextPostResult.what_fails.length > 0 && (
                    <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-danger-800 mb-2">
                        ❌ Yang Kurang Perform
                      </p>
                      <ul className="space-y-1">
                        {nextPostResult.what_fails.map((f, i) => (
                          <li
                            key={i}
                            className="text-xs text-danger-700 flex items-start gap-1.5"
                          >
                            <span className="text-danger-500 mt-0.5">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Suggestion Cards */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">
                  💡 3 Ide Next Post
                </p>
                {nextPostResult.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-primary-600">
                            #{i + 1}
                          </span>
                          <h4 className="font-semibold text-gray-900">
                            {s.title}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                            {s.type === "thread"
                              ? "🧵 Thread"
                              : s.type === "single_post"
                                ? "📝 Single"
                                : "📑 Carousel"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                            {s.content_pilar || "awareness"}
                          </span>
                          {s.tweet_count && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {s.tweet_count} tweets
                            </span>
                          )}
                          {s.best_time && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                              🕐 {s.best_time}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleGenerateFromSuggestion(s)}
                      >
                        🚀 Generate
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-0.5">
                          Angle
                        </p>
                        <p className="text-sm text-gray-700">{s.angle}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-0.5">
                          Contoh Hook
                        </p>
                        <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 italic border-l-3 border-primary-400">
                          &ldquo;{s.hook_example}&rdquo;
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📈 {s.estimated_performance}</span>
                        <span>💡 {s.why}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* General Tips */}
              {Array.isArray(nextPostResult.general_tips) &&
                nextPostResult.general_tips.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      💡 Tips Umum
                    </p>
                    <ul className="space-y-1">
                      {nextPostResult.general_tips.map((t, i) => (
                        <li
                          key={i}
                          className="text-xs text-gray-600 flex items-start gap-1.5"
                        >
                          <span className="text-gray-400 mt-0.5">→</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          ) : nextPostResult?.text ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {nextPostResult.text}
              </p>
            </div>
          ) : (
            !nextPostLoading && (
              <div className="text-center py-6 text-gray-400">
                <p className="text-2xl mb-2">🎯</p>
                <p className="text-sm">
                  Klik "Generate Saran" untuk mendapatkan rekomendasi next post
                  berdasarkan data performa
                </p>
              </div>
            )
          )}
        </Card>
      )}

      {loadingList ? (
        <PageLoader />
      ) : (
        <Card>
          <h3 className="font-semibold mb-4">Postingan terbaru (tersimpan)</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada data. Klik &quot;Sinkron dari Threads&quot;.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3">Teks (awal)</th>
                    <th className="py-2 pr-3">Views</th>
                    <th className="py-2 pr-3">Likes</th>
                    <th className="py-2 pr-3">Replies</th>
                    <th className="py-2 pr-3">Link</th>
                    <th className="py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const m = r.metrics || {};
                    const preview = (r.post_text || "")
                      .replace(/\s+/g, " ")
                      .slice(0, 80);
                    return (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td
                          className="py-2 pr-3 max-w-xs truncate"
                          title={r.post_text || ""}
                        >
                          {preview || "—"}
                        </td>
                        <td className="py-2 pr-3">{metricCell(m.views)}</td>
                        <td className="py-2 pr-3">{metricCell(m.likes)}</td>
                        <td className="py-2 pr-3">{metricCell(m.replies)}</td>
                        <td className="py-2 pr-3">
                          {r.link_attachment_url ? (
                            <a
                              href={r.link_attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary-600 truncate max-w-[120px] inline-block align-bottom"
                            >
                              link
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setAnalyzePost(r)}
                          >
                            Analisis AI
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!analyzePost}
        onClose={() => {
          setAnalyzePost(null);
          setAnalysisResult(null);
          setAnalysisError("");
        }}
        title="Analisis performa + AI"
        size="lg"
      >
        {analyzePost && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50 p-2 rounded-lg">
              {analyzePost.post_text || "(tanpa teks)"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Klik link eksternal (opsional, mis. Lynk)"
                type="number"
                min={0}
                placeholder="50"
                value={externalClicks}
                onChange={(e) => setExternalClicks(e.target.value)}
              />
              <Input
                label="URL landing (opsional)"
                placeholder="https://lynk.id/..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Posisi bagian thread (opsional)"
                type="number"
                min={1}
                placeholder="1"
                value={threadPart}
                onChange={(e) => setThreadPart(e.target.value)}
              />
              <Input
                label="Total bagian thread (opsional)"
                type="number"
                min={1}
                placeholder="9"
                value={threadTotal}
                onChange={(e) => setThreadTotal(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={runAnalysis}
              loading={analyzing}
            >
              {analyzing ? "Menganalisis…" : "Jalankan analisis AI"}
            </Button>
            {analysisError && (
              <p className="text-sm text-red-600">{analysisError}</p>
            )}
            {analysisResult && (
              <div className="space-y-3 text-sm border-t pt-4">
                <Button className="w-full" onClick={handleGenerateFromAnalysis}>
                  🚀 Generate konten baru berdasarkan analisis ini
                </Button>
                <div>
                  <p className="font-semibold text-gray-800">Ringkasan</p>
                  <p className="text-gray-700">{analysisResult.summary}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Baca funnel</p>
                  <p className="text-gray-700">{analysisResult.funnel_read}</p>
                </div>
                {Array.isArray(analysisResult.likely_blockers) &&
                  analysisResult.likely_blockers.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-800">
                        Kemungkinan hambatan
                      </p>
                      <ul className="list-disc pl-5 text-gray-700">
                        {analysisResult.likely_blockers.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {analysisResult.cta_diagnosis && (
                  <div>
                    <p className="font-semibold text-gray-800">Diagnosis CTA</p>
                    <p className="text-gray-700">
                      {analysisResult.cta_diagnosis}
                    </p>
                  </div>
                )}
                {analysisResult.hook_diagnosis && (
                  <div>
                    <p className="font-semibold text-gray-800">
                      Diagnosis hook
                    </p>
                    <p className="text-gray-700">
                      {analysisResult.hook_diagnosis}
                    </p>
                  </div>
                )}
                {Array.isArray(analysisResult.thread_structure_tips) &&
                  analysisResult.thread_structure_tips.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-800">
                        Struktur thread
                      </p>
                      <ul className="list-disc pl-5 text-gray-700">
                        {analysisResult.thread_structure_tips.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(analysisResult.next_experiment) &&
                  analysisResult.next_experiment.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-800">
                        Eksperimen berikutnya
                      </p>
                      <ul className="list-disc pl-5 text-gray-700">
                        {analysisResult.next_experiment.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(analysisResult.rewrite_snippets) &&
                  analysisResult.rewrite_snippets.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-800">
                        Cuplikan revisi
                      </p>
                      <div className="space-y-2">
                        {analysisResult.rewrite_snippets.map((s, i) => (
                          <div
                            key={i}
                            className="bg-emerald-50 border border-emerald-100 rounded-lg p-2"
                          >
                            <p className="text-xs font-medium text-emerald-800">
                              {s.placement}
                            </p>
                            <p className="text-gray-800 whitespace-pre-wrap">
                              {s.suggested_text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
