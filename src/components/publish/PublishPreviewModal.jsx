import { useState, useEffect, useRef, useCallback } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useConnectedAccounts } from "../../hooks/useConnectedAccounts";
import { PLATFORM_RULES, PLATFORM_META } from "../../services/platforms";
import AccountSelector from "./AccountSelector";
import CaptionEditor from "./CaptionEditor";
import PublishProgress from "./PublishProgress";
import PublishResults from "./PublishResults";

// --------------------------------------------------------
// Helper: parse thread content menjadi array of string
// -----------------------------------------------------------
// Strip baris pertama jika itu hanya nomor urut seperti "1/8", "[1/8]", atau "1/8."
function stripNumberPrefix(block) {
  const lines = block.split("\n");
  const firstLine = lines[0].trim();
  if (/^\[?\d+\/\d+\]?\.?$/.test(firstLine)) {
    return lines.slice(1).join("\n").trim();
  }
  return block.trim();
}

function parseThreadParts(rawContent) {
  if (!rawContent) return [];

  // Strategy 1: Split by --- separator (used by Copy All in ThreadGenerator)
  const dashBlocks = rawContent.split(/\n\n---\n\n/);
  if (dashBlocks.length > 1) {
    return dashBlocks.map(stripNumberPrefix).filter(Boolean);
  }

  // Strategy 2: Split by tweet number patterns like "1/7", "[1/7]", "1/7.", "[1/7]."
  // These appear at the start of a line, possibly after newlines
  const numberPattern = /(?:^|\n\n)(?:\[?\d+\/\d+\]?\.?\s*\n)/;
  const hasNumberedParts = numberPattern.test(rawContent);

  if (hasNumberedParts) {
    // Split by the numbered headers: "1/7\n", "[2/7]\n", etc.
    const parts = rawContent.split(/\n?\[?\d+\/\d+\]?\.?\s*\n/);
    return parts.map((p) => p.trim()).filter(Boolean);
  }

  // Strategy 3: If content looks like "1/7\ntext\n\n2/7\ntext" (number on its own line)
  // Group consecutive lines between number markers
  const lines = rawContent.split("\n");
  const tweets = [];
  let current = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if this line is just a tweet number like "1/7", "[2/8]", etc.
    if (/^\[?\d+\/\d+\]?\.?$/.test(trimmed)) {
      // Save previous tweet if any
      if (current.length > 0) {
        const text = current.join("\n").trim();
        if (text) tweets.push(text);
      }
      current = [];
    } else {
      current.push(line);
    }
  }
  // Don't forget the last tweet
  if (current.length > 0) {
    const text = current.join("\n").trim();
    if (text) tweets.push(text);
  }

  if (tweets.length > 1) {
    return tweets;
  }

  // Strategy 4: Final fallback — split by double newline
  return rawContent
    .split(/\n{2,}/)
    .map(stripNumberPrefix)
    .filter(Boolean);
}

function isThreadContent(content) {
  if (!content) return false;
  if (content.type === "thread") return true;
  const body = content.body || "";
  // Deteksi format [1/8], 1/8 di awal baris, atau separator ---
  return (
    /\[\d+\/\d+\]/.test(body) ||
    body.includes("\n\n---\n\n") ||
    /^\d+\/\d+\s*\n/.test(body)
  );
}

export function PublishPreviewModal({ isOpen, onClose, content, onPublish }) {
  const { accounts } = useConnectedAccounts();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState(null);
  const [accountCaptions, setAccountCaptions] = useState({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState(null);
  const [scheduleMode, setScheduleMode] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Per-account editable thread parts: { [accountId]: { [partIndex]: editedText } }
  const [editableThreadParts, setEditableThreadParts] = useState({});

  // Progress: useRef + state counter to force re-render
  const progressRef = useRef({}); // { [accountId]: { current, total, status, error } }
  const [progressTick, setProgressTick] = useState(0);

  // Stable refs for data needed during publishing
  const selectedIdsRef = useRef(new Set());
  const threadPartsRef = useRef([]);

  const threadParts = isThreadContent(content)
    ? parseThreadParts(content?.body || "")
    : [];
  const isThread = threadParts.length > 1;

  const allAccounts = accounts.filter((a) => a.status === "active");

  // Keep refs in sync
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    threadPartsRef.current = threadParts;
  }, [content]); // eslint-disable-line

  // Reset when modal opens
  useEffect(() => {
    if (!isOpen || !content) return;
    const captions = {};
    const body = content.body || "";
    allAccounts.forEach((acc) => {
      if (acc.platform === "threads" && isThread) {
        captions[acc.id] = threadParts[0] || body;
      } else {
        captions[acc.id] = body;
      }
    });
    setAccountCaptions(captions);
    setSelectedIds(new Set());
    setActiveTab(null);
    setPublishResults(null);
    setScheduleMode("now");
    setScheduledDate("");
    setScheduledTime("");
    setEditableThreadParts({});
    progressRef.current = {};
    setProgressTick(0);
  }, [isOpen, content]); // eslint-disable-line

  useEffect(() => {
    const ids = [...selectedIds];
    if (ids.length > 0 && !selectedIds.has(activeTab)) {
      setActiveTab(ids[0]);
    } else if (ids.length === 0) {
      setActiveTab(null);
    }
  }, [selectedIds]); // eslint-disable-line

  function toggleAccount(accountId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }

  function updateCaption(accountId, caption) {
    setAccountCaptions((prev) => ({ ...prev, [accountId]: caption }));
  }

  function handleThreadPartChange(accountId, index, value) {
    setEditableThreadParts((prev) => ({
      ...prev,
      [accountId]: { ...(prev[accountId] || {}), [index]: value },
    }));
  }

  function getEditablePartsForAccount(accountId) {
    return editableThreadParts[accountId] || {};
  }

  function getAccount(accountId) {
    return allAccounts.find((a) => a.id === accountId);
  }

  // Stable progress callback using ref
  const onProgress = useCallback(
    ({ accountId, current, total, status, error }) => {
      progressRef.current = {
        ...progressRef.current,
        [accountId]: { current, total, status, error },
      };
      setProgressTick((t) => t + 1); // force re-render
    },
    [],
  );

  async function handlePublish() {
    if (selectedIds.size === 0) return;

    // Snapshot data sebelum mulai (agar tidak hilang saat re-render)
    const snapshotSelectedIds = [...selectedIds];
    const snapshotThreadParts = [...threadParts];

    setIsPublishing(true);
    progressRef.current = {};
    setProgressTick(0);

    try {
      // Snapshot editable thread parts
      const snapshotEditableThreadParts = { ...editableThreadParts };

      const publishData = {
        contentId: content?.id,
        accounts: snapshotSelectedIds.map((id) => {
          const acc = getAccount(id);
          const isThreadsAccount = acc?.platform === "threads";
          // Merge edited thread parts with originals for this account
          const accountEdits = snapshotEditableThreadParts[id] || {};
          const finalParts = snapshotThreadParts.map((part, i) =>
            accountEdits[i] !== undefined ? accountEdits[i] : part,
          );
          return {
            accountId: id,
            platform: acc?.platform,
            username: acc?.platform_username,
            caption: accountCaptions[id] || "",
            threadParts: isThreadsAccount && isThread ? finalParts : undefined,
          };
        }),
        mediaUrls: content?.media_urls || [],
        hashtags: content?.hashtags || [],
      };

      const results = await onPublish(publishData, onProgress);
      setPublishResults(
        results ||
          snapshotSelectedIds.map((id) => {
            const acc = getAccount(id);
            return {
              accountId: id,
              platform: acc?.platform,
              username: acc?.platform_username,
              status: "success",
            };
          }),
      );
    } catch (err) {
      setPublishResults(
        snapshotSelectedIds.map((id) => {
          const acc = getAccount(id);
          return {
            accountId: id,
            platform: acc?.platform,
            username: acc?.platform_username,
            status: "failed",
            error: err.message,
          };
        }),
      );
    } finally {
      setIsPublishing(false);
    }
  }

  const platformGroups = Object.keys(PLATFORM_META).reduce((acc, p) => {
    const list = allAccounts.filter((a) => a.platform === p);
    if (list.length > 0) acc[p] = list;
    return acc;
  }, {});

  return (
    <Modal
      open={isOpen}
      onClose={isPublishing ? undefined : onClose}
      title="Preview & Publish"
      size="xl"
    >
      {publishResults ? (
        <PublishResults results={publishResults} onClose={onClose} />
      ) : isPublishing ? (
        <PublishProgress
          progressData={progressRef.current}
          selectedAccounts={allAccounts}
          isThread={isThread}
          threadPartsCount={
            threadPartsRef.current.length > 0
              ? threadPartsRef.current.length
              : threadParts.length
          }
          totalSelectedCount={selectedIdsRef.current.size || selectedIds.size}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Pilih Akun yang Akan Dipakai
            </h3>
            <AccountSelector
              accounts={allAccounts}
              selectedIds={selectedIds}
              onToggle={toggleAccount}
              onSelectAll={() =>
                setSelectedIds(new Set(allAccounts.map((a) => a.id)))
              }
              onDeselectAll={() => setSelectedIds(new Set())}
              platformGroups={platformGroups}
            />
          </div>

          {selectedIds.size > 0 && (
            <CaptionEditor
              selectedAccounts={[...selectedIds]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              accountCaptions={accountCaptions}
              onCaptionChange={updateCaption}
              content={content}
              threadParts={threadParts}
              isThread={isThread}
              getAccount={getAccount}
              editableThreadParts={
                activeTab ? getEditablePartsForAccount(activeTab) : {}
              }
              onThreadPartChange={(index, value) => {
                if (activeTab) handleThreadPartChange(activeTab, index, value);
              }}
            />
          )}

          {selectedIds.size > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Jadwal Publish
              </h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  value="now"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700">Publish Sekarang</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  value="scheduled"
                  checked={scheduleMode === "scheduled"}
                  onChange={() => setScheduleMode("scheduled")}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700">
                  Schedule untuk nanti
                </span>
              </label>
              {scheduleMode === "scheduled" && (
                <div className="ml-7 grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Batal
            </Button>
            <Button
              onClick={handlePublish}
              variant="primary"
              disabled={selectedIds.size === 0}
              className="flex-1"
            >
              {isThread &&
              [...selectedIds].some(
                (id) => getAccount(id)?.platform === "threads",
              )
                ? `🧵 Publish Thread ${threadParts.length} Bagian`
                : scheduleMode === "now"
                  ? `Publish ke ${selectedIds.size || 0} Akun`
                  : `Schedule ke ${selectedIds.size || 0} Akun`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
