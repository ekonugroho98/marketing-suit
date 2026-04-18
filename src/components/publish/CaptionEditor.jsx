import { PLATFORM_RULES, PLATFORM_META } from "../../services/platforms";

function accountLabel(acc) {
  const meta = PLATFORM_META[acc.platform];
  return `${meta?.name || acc.platform} — ${acc.platform_username}`;
}

export default function CaptionEditor({
  selectedAccounts,
  activeTab,
  onTabChange,
  accountCaptions,
  onCaptionChange,
  content,
  threadParts,
  isThread,
  getAccount,
  editableThreadParts = {},
  onThreadPartChange,
}) {
  function getCharCount(accountId) {
    const acc = getAccount(accountId);
    if (!acc) return { current: 0, max: 500 };
    const caption = accountCaptions[accountId] || "";
    const rules = PLATFORM_RULES[acc.platform];
    return { current: caption.length, max: rules?.max_caption || 500 };
  }

  function renderPreview() {
    if (!activeTab) return null;
    const acc = getAccount(activeTab);
    if (!acc) return null;
    const platform = acc.platform;
    const caption = accountCaptions[activeTab] || "";
    const { current, max } = getCharCount(activeTab);
    const pct = Math.min((current / max) * 100, 100);
    const overLimit = current > max;
    const progressColor =
      pct > 100 ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-emerald-500";
    const showThreadChain = platform === "threads" && isThread;

    return (
      <div className="space-y-4">
        {showThreadChain && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            🧵 Konten ini akan dipublish sebagai{" "}
            <strong>thread {threadParts.length} bagian</strong> (reply berantai
            di Threads).
          </div>
        )}
        {overLimit && !showThreadChain && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Caption melebihi batas {PLATFORM_META[platform]?.name} sebesar{" "}
            {current - max} karakter.
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{PLATFORM_META[platform]?.icon}</span>
            <span className="text-sm font-semibold text-gray-700">
              {accountLabel(acc)}
            </span>
          </div>

          {showThreadChain ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {threadParts.map((part, i) => {
                const currentValue =
                  editableThreadParts[i] !== undefined
                    ? editableThreadParts[i]
                    : part;
                const charCount = currentValue.length;
                return (
                  <div
                    key={i}
                    className="bg-white border-gray-200 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-emerald-600">
                        {i + 1}/{threadParts.length}
                      </p>
                      <span
                        className={`text-xs ${charCount > 500 ? "text-red-500 font-semibold" : "text-gray-400"}`}
                      >
                        {charCount}/500
                      </span>
                    </div>
                    <textarea
                      value={currentValue}
                      onChange={(e) => onThreadPartChange?.(i, e.target.value)}
                      rows={3}
                      className="w-full text-sm text-gray-800 border border-gray-100 rounded-lg p-2 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                );
              })}
            </div>
          ) : platform === "twitter" || platform === "threads" ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-sm">
              <p className="text-xs text-gray-400 mb-2">
                {platform === "twitter" ? "𝕏 Twitter" : "Threads"} ·{" "}
                {acc.platform_username}
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {caption || "Tidak ada konten"}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {current}/{max}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {caption || "Tidak ada konten"}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {current}/{max}
              </p>
            </div>
          )}
        </div>

        {!showThreadChain && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Caption untuk {accountLabel(acc)}
            </label>
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(activeTab, e.target.value)}
              rows={4}
              placeholder="Edit caption untuk akun ini..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className={overLimit ? "text-red-600 font-semibold" : ""}>
                {current}/{max}
              </span>
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${progressColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        {selectedAccounts.map((id) => {
          const acc = getAccount(id);
          if (!acc) return null;
          const meta = PLATFORM_META[acc.platform];
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === id
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {meta?.icon} {acc.platform_username}
            </button>
          );
        })}
      </div>
      {renderPreview()}
    </div>
  );
}
