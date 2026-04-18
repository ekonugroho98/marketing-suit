import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useBrand } from "../../hooks/useBrand";
import { useToast } from "../../components/ui/Toast";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input, { Textarea } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { PublishPreviewModal } from "../../components/publish/PublishPreviewModal";

const CONTENT_TYPES = [
  { value: "all", label: "Semua" },
  { value: "caption", label: "Caption" },
  { value: "thread", label: "Thread" },
  { value: "carousel", label: "Carousel" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "video_script", label: "Video Script" },
  { value: "hashtags", label: "Hashtags" },
  { value: "repurpose", label: "Repurpose" },
];

const TYPE_COLORS = {
  caption: "blue",
  thread: "purple",
  carousel: "green",
  ad_copy: "red",
  video_script: "yellow",
  hashtags: "pink",
  repurpose: "gray",
};

const TYPE_LABELS = {
  caption: "Caption",
  thread: "Thread",
  carousel: "Carousel",
  ad_copy: "Ad Copy",
  video_script: "Video Script",
  hashtags: "Hashtags",
  repurpose: "Repurpose",
};

function truncate(text, maxLength = 120) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PLATFORMS = [
  "twitter",
  "threads",
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
];

function detectContentType(text) {
  const lower = text.toLowerCase();
  if (
    /tweet\s*\d+[/\\]\d+/i.test(text) ||
    /thread/i.test(text.slice(0, 100)) ||
    /🧵/.test(text)
  )
    return "thread";
  if (/slide\s*\d+/i.test(text) || /carousel/i.test(text.slice(0, 100)))
    return "carousel";
  if (/headline|body|cta|ad copy/i.test(text.slice(0, 200))) return "ad_copy";
  if (
    /\[hook\]|\[scene|\[cut/i.test(text) ||
    /video script/i.test(text.slice(0, 100))
  )
    return "video_script";
  if (/#\w+/.test(text) && (text.match(/#\w+/g) || []).length > 5)
    return "hashtags";
  return "caption";
}

function parseThreadContent(rawText) {
  // Try to split by TWEET N/N pattern
  const tweetPattern = /(?:TWEET\s*(\d+)[/\\](\d+))/gi;
  const matches = [...rawText.matchAll(tweetPattern)];

  if (matches.length >= 2) {
    const tweets = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end =
        i + 1 < matches.length ? matches[i + 1].index : rawText.length;
      const content = rawText
        .slice(start, end)
        .trim()
        .replace(/^[\s\n=]+/, "") // remove leading whitespace/equals
        .replace(/[\s\n=]+$/, ""); // remove trailing whitespace/equals
      if (content) tweets.push(content);
    }
    return tweets;
  }

  // Fallback: split by double newline for generic multi-part content
  return rawText
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatThreadForStorage(tweets) {
  return tweets
    .map(
      (t, i) =>
        `[${i + 1}/${tweets.length}]\n${typeof t === "object" ? t.content : t}`,
    )
    .join("\n\n---\n\n");
}

function ThreadEditor({ content, onChange }) {
  // Parse content into tweets (reuse existing parseThreadContent)
  const rawTweets = parseThreadContent(content);
  const tweets = rawTweets.map((t, i) => ({
    number: i + 1,
    content: typeof t === "object" ? t.content : t,
  }));

  function updateTweet(index, newText) {
    const updated = [...tweets];
    updated[index] = { ...updated[index], content: newText };
    onChange(formatThreadForStorage(updated));
  }

  function addTweet() {
    const updated = [...tweets, { number: tweets.length + 1, content: "" }];
    onChange(formatThreadForStorage(updated));
  }

  function removeTweet(index) {
    const updated = tweets
      .filter((_, i) => i !== index)
      .map((t, i) => ({ ...t, number: i + 1 }));
    onChange(formatThreadForStorage(updated));
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Thread ({tweets.length} tweet)
      </label>
      {tweets.map((tweet, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-xs font-bold text-primary-600 mt-3 w-8 flex-shrink-0">
            {i + 1}/{tweets.length}
          </span>
          <div className="flex-1">
            <textarea
              value={tweet.content}
              onChange={(e) => updateTweet(i, e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={`Tweet ${i + 1}...`}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>{tweet.content.length}/280</span>
              {tweets.length > 1 && (
                <button
                  onClick={() => removeTweet(i)}
                  className="text-danger-500 hover:text-danger-700"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={addTweet}>
        ➕ Tambah Tweet
      </Button>
    </div>
  );
}

function ImportContentModal({ open, onClose, onSaved, userId }) {
  const { activeBrand } = useBrand();
  const [rawContent, setRawContent] = useState("");
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("caption");
  const [platform, setPlatform] = useState("twitter");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  // Auto-detect when content changes
  useEffect(() => {
    if (!rawContent.trim()) {
      setPreview(null);
      return;
    }
    const detected = detectContentType(rawContent);
    setContentType(detected);

    if (detected === "thread") {
      const tweets = parseThreadContent(rawContent);
      setPreview({ type: "thread", tweets });
      // Auto-generate title from first tweet
      if (!title) {
        const firstLine = tweets[0]?.split("\n")[0]?.slice(0, 60);
        if (firstLine) setTitle(firstLine);
      }
    } else {
      setPreview(null);
    }
  }, [rawContent]);

  function resetForm() {
    setRawContent("");
    setTitle("");
    setContentType("caption");
    setPlatform("twitter");
    setTags("");
    setPreview(null);
    setError("");
  }

  async function handleSave() {
    if (!rawContent.trim()) return setError("Paste konten dulu");
    if (!title.trim()) return setError("Judul harus diisi");

    setSaving(true);
    setError("");

    let finalContent = rawContent.trim();

    // Format thread nicely
    if (contentType === "thread" && preview?.tweets?.length) {
      finalContent = formatThreadForStorage(preview.tweets);
    }

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error: saveError } = await supabase.from("saved_content").insert({
      user_id: userId,
      brand_id: activeBrand?.id || null,
      type: contentType,
      title: title.trim(),
      content: finalContent,
      metadata: { platform, source: "import" },
      tags: tagArray.length > 0 ? tagArray : null,
      is_favorite: false,
    });

    if (saveError) {
      setError(saveError.message);
    } else {
      resetForm();
      onSaved();
      onClose();
    }
    setSaving(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Import Konten"
      size="xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paste Konten
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-y focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={8}
            placeholder="Paste thread, caption, carousel script, atau konten lainnya di sini..."
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
          />
          {rawContent.trim() && (
            <p className="text-xs text-gray-400 mt-1">
              Auto-detected:{" "}
              <span className="font-medium text-primary-600">
                {TYPE_LABELS[contentType] || contentType}
              </span>
              {preview?.tweets && <> &middot; {preview.tweets.length} tweets</>}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Judul konten..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Konten
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              {CONTENT_TYPES.filter((t) => t.value !== "all").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (pisahkan koma)
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="provokasi, karaya finance, thread"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        {/* Thread Preview */}
        {contentType === "thread" && preview?.tweets?.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview Thread ({preview.tweets.length} tweets)
            </label>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {preview.tweets.map((tweet, i) => (
                <div
                  key={i}
                  className={`p-3 text-sm ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <span className="text-xs font-bold text-primary-600 block mb-1">
                    {i + 1}/{preview.tweets.length}
                  </span>
                  <p className="text-gray-700 whitespace-pre-line">{tweet}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Batal
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Simpan ke Library
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [copiedTweetIdx, setCopiedTweetIdx] = useState(null);
  const [publishItem, setPublishItem] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("saved_content")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching saved content:", error);
      setItems([]);
    } else {
      // Filter out archived items
      setItems((data || []).filter((item) => !item.metadata?.archived));
    }
    setLoading(false);
  }, [user, typeFilter, search]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  async function toggleFavorite(item) {
    const newValue = !item.is_favorite;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_favorite: newValue } : i)),
    );

    const { error } = await supabase
      .from("saved_content")
      .update({ is_favorite: newValue })
      .eq("id", item.id);

    if (error) {
      console.error("Error toggling favorite:", error);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_favorite: item.is_favorite } : i,
        ),
      );
    }
  }

  async function archiveItem(item) {
    setArchivingId(item.id);
    try {
      // Tandai sebagai archived di DB
      await supabase
        .from("saved_content")
        .update({
          metadata: {
            ...item.metadata,
            archived: true,
            archived_at: new Date().toISOString(),
          },
        })
        .eq("id", item.id);

      // Hapus dari tampilan
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      // Langsung ke Publish History
      navigate("/publish/history");
    } catch (err) {
      console.error("Error archiving item:", err);
    } finally {
      setArchivingId(null);
    }
  }

  async function deleteItem(item) {
    if (!window.confirm("Hapus konten ini dari library?")) return;

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const { error } = await supabase
      .from("saved_content")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error("Error deleting content:", error);
      fetchContent();
    }
  }

  function openEditFromItem(item) {
    setEditForm({
      title: item.title || "",
      content: item.content || "",
      tags: (item.tags || []).join(", "),
    });
    setEditItem(item);
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("saved_content")
        .update({
          title: editForm.title,
          content: editForm.content,
          tags: editForm.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editItem.id);

      if (error) throw error;

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === editItem.id
            ? {
                ...item,
                title: editForm.title,
                content: editForm.content,
                tags: editForm.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }
            : item,
        ),
      );
      setEditItem(null);
      toast({
        type: "success",
        title: "Berhasil",
        message: "Konten berhasil diupdate",
      });
    } catch (err) {
      toast({ type: "error", title: "Gagal", message: err.message });
    } finally {
      setEditSaving(false);
    }
  }

  async function copyToClipboard(item) {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function handlePublish(publishData, onProgress) {
    const { accounts, mediaUrls = [], hashtags = [] } = publishData;
    const results = [];

    for (const account of accounts) {
      const { accountId, platform, username, caption, threadParts } = account;
      const isThreadChain = platform === "threads" && threadParts?.length > 1;

      if (isThreadChain) {
        // Publish satu per satu agar bisa lihat progress
        let prevPostId = null;
        let rootPostUrl = "";
        let allSuccess = true;
        let lastError = "";
        const total = threadParts.length;

        console.log(
          `[publish-ui] Thread chain: ${total} parts for ${username}`,
        );
        threadParts.forEach((p, i) =>
          console.log(
            `[publish-ui] part[${i}]: "${p.substring(0, 40)}..." (${p.length} chars)`,
          ),
        );

        for (let i = 0; i < total; i++) {
          const isLast = i === total - 1;
          const partCaption = threadParts[i];

          console.log(
            `[publish-ui] Publishing part ${i + 1}/${total}, replyTo=${prevPostId || "NONE"}`,
          );
          onProgress?.({
            accountId,
            username,
            current: i + 1,
            total,
            status: "publishing",
          });

          const { data, error: invokeError } = await supabase.functions.invoke(
            "publish-content",
            {
              body: {
                accounts: [
                  {
                    accountId,
                    platform,
                    username,
                    caption: partCaption,
                    replyToId: prevPostId || undefined,
                  },
                ],
                mediaUrls: i === 0 ? mediaUrls : [],
                hashtags: isLast ? hashtags : [],
              },
            },
          );

          if (
            invokeError ||
            !Array.isArray(data) ||
            data[0]?.status !== "success"
          ) {
            const errMsg = invokeError?.message || data?.[0]?.error || "Gagal";
            onProgress?.({
              accountId,
              username,
              current: i + 1,
              total: threadParts.length,
              status: "failed",
              error: errMsg,
            });
            allSuccess = false;
            lastError = errMsg;
            break;
          }

          prevPostId = data[0].postId;
          if (i === 0) rootPostUrl = data[0].postUrl;
          onProgress?.({
            accountId,
            username,
            current: i + 1,
            total: threadParts.length,
            status: "done",
          });

          // Tunggu sebelum post berikutnya (Threads butuh waktu untuk index)
          if (!isLast) await new Promise((r) => setTimeout(r, 8000));
        }

        results.push({
          accountId,
          platform,
          username,
          status: allSuccess ? "success" : "failed",
          postUrl: rootPostUrl,
          totalParts: threadParts.length,
          error: allSuccess ? undefined : lastError,
        });
      } else {
        // Single post biasa
        const { data, error: invokeError } = await supabase.functions.invoke(
          "publish-content",
          {
            body: {
              accounts: [{ accountId, platform, username, caption }],
              mediaUrls,
              hashtags,
            },
          },
        );
        if (invokeError)
          throw new Error(invokeError.message || "Gagal publish");
        results.push(
          Array.isArray(data)
            ? data[0]
            : { accountId, platform, username, status: "failed" },
        );
      }
    }

    return results;
  }

  return (
    <div>
      <TopBar
        title="Content Library"
        subtitle="Semua konten AI yang sudah kamu simpan"
        actions={
          <Button onClick={() => setShowImport(true)}>+ Import Konten</Button>
        }
      />

      {/* Publish Modal */}
      <PublishPreviewModal
        isOpen={!!publishItem}
        onClose={() => setPublishItem(null)}
        content={
          publishItem ? { ...publishItem, body: publishItem.content } : null
        }
        onPublish={handlePublish}
      />

      <ImportContentModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSaved={fetchContent}
        userId={user?.id}
      />

      {/* Detail View Modal */}
      <Modal
        open={!!viewItem}
        onClose={() => {
          setViewItem(null);
          setCopiedTweetIdx(null);
        }}
        title={viewItem?.title || "Detail Konten"}
        size="lg"
      >
        {viewItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge color={TYPE_COLORS[viewItem.type] || "gray"}>
                {TYPE_LABELS[viewItem.type] || viewItem.type}
              </Badge>
              {viewItem.metadata?.platform && (
                <span className="text-xs text-gray-400 capitalize">
                  {viewItem.metadata.platform}
                </span>
              )}
              {viewItem.metadata?.source === "import" && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  Imported
                </span>
              )}
            </div>

            {viewItem.type === "thread" && viewItem.content.includes("[1/") ? (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {viewItem.content.split(/\n\n---\n\n/).map((block, i) => {
                  const lines = block.split("\n");
                  const header = lines[0];
                  const body = lines.slice(1).join("\n").trim();
                  return (
                    <div key={i} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary-600">
                          {header}
                        </span>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(body);
                            setCopiedTweetIdx(i);
                            setTimeout(() => setCopiedTweetIdx(null), 2000);
                          }}
                          className="text-xs text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          {copiedTweetIdx === i ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {body}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {viewItem.content}
                </p>
              </div>
            )}

            {viewItem.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {viewItem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(viewItem.content);
                  setCopiedId(viewItem.id);
                  setTimeout(() => setCopiedId(null), 2000);
                }}
              >
                {copiedId === viewItem.id ? "✓ Copied!" : "Copy Semua"}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  openEditFromItem(viewItem);
                  setViewItem(null); // close view modal
                }}
              >
                ✏️ Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Konten"
        size="lg"
      >
        {editItem && (
          <div className="space-y-4">
            <Input
              label="Judul"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
            />

            {editItem.type === "thread" ? (
              <ThreadEditor
                content={editForm.content}
                onChange={(newContent) =>
                  setEditForm({ ...editForm, content: newContent })
                }
              />
            ) : (
              <Textarea
                label="Konten"
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                rows={10}
              />
            )}

            <Input
              label="Tags (pisahkan dengan koma)"
              value={editForm.tags}
              onChange={(e) =>
                setEditForm({ ...editForm, tags: e.target.value })
              }
              placeholder="threads, marketing, tips"
            />

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditItem(null)}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                loading={editSaving}
              >
                💾 Simpan Perubahan
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Cari judul atau konten..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                typeFilter === t.value
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat konten...</p>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada konten tersimpan"
            description={
              search || typeFilter !== "all"
                ? "Coba ubah filter atau kata kunci pencarian kamu."
                : "Konten yang kamu simpan dari AI Generator akan muncul di sini."
            }
            actionLabel={search || typeFilter !== "all" ? "Reset Filter" : null}
            onAction={
              search || typeFilter !== "all"
                ? () => {
                    setSearch("");
                    setTypeFilter("all");
                  }
                : null
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {items.length} konten ditemukan
          </p>
          {items.map((item) => (
            <Card
              key={item.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewItem(item)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={TYPE_COLORS[item.type] || "gray"}>
                      {TYPE_LABELS[item.type] || item.type}
                    </Badge>
                    {item.metadata?.source === "import" && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                        Import
                      </span>
                    )}
                    {item.is_favorite && (
                      <span className="text-yellow-500 text-sm" title="Favorit">
                        &#9733;
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  {item.title && (
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                      {item.title}
                    </h3>
                  )}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {truncate(item.content)}
                  </p>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditFromItem(item)}
                    title="Edit konten"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400 hover:text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </Button>
                  {/* Publish Button */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPublishItem(item)}
                    title="Publish konten ini"
                    className="text-xs px-2 py-1"
                  >
                    🚀 Publish
                  </Button>
                  {/* Archive Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => archiveItem(item)}
                    disabled={archivingId === item.id}
                    title="Arsipkan & lihat Publish History"
                    className="text-xs px-2 py-1"
                  >
                    {archivingId === item.id ? "..." : "📦 Arsip"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(item)}
                    title={
                      item.is_favorite ? "Hapus dari favorit" : "Tandai favorit"
                    }
                  >
                    {item.is_favorite ? (
                      <svg
                        className="w-4 h-4 text-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(item)}
                    title="Salin ke clipboard"
                  >
                    {copiedId === item.id ? (
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                        />
                      </svg>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item)}
                    title="Hapus konten"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400 hover:text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
