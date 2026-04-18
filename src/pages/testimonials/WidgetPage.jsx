import React, { useState } from "react";
import { useTestimonials } from "../../hooks/useTestimonials";
import { useToast } from "../../components/ui/Toast";
import {
  WIDGET_LAYOUTS,
  getWidgetEmbedCode,
  renderStars,
  avatarInitials,
  avatarColor,
} from "../../services/testimonials";

export default function WidgetPage() {
  const { widgets, testimonials, createWidget, updateWidget, deleteWidget } =
    useTestimonials();
  const { toast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [embedCodeCopied, setEmbedCodeCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("display");

  const [widgetSettings, setWidgetSettings] = useState({
    name: "",
    layout: "grid",
    theme: "light",
    primary_color: "#8B5CF6",
    max_items: 6,
    show_avatar: true,
    show_rating: true,
    show_company: true,
    show_date: true,
    card_shadow: true,
    only_featured: false,
    min_rating: 0,
  });

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCreateNew = () => {
    setEditingWidget(null);
    setWidgetSettings({
      name: "",
      layout: "grid",
      theme: "light",
      primary_color: "#8B5CF6",
      max_items: 6,
      show_avatar: true,
      show_rating: true,
      show_company: true,
      show_date: true,
      card_shadow: true,
      only_featured: false,
      min_rating: 0,
    });
    setActiveTab("display");
    setEmbedCodeCopied(false);
    setShowCreateModal(true);
  };

  const handleEditWidget = (widget) => {
    setEditingWidget(widget);
    setWidgetSettings(widget);
    setActiveTab("display");
    setEmbedCodeCopied(false);
    setShowCreateModal(true);
  };

  const handleSaveWidget = () => {
    if (!widgetSettings.name) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama widget tidak boleh kosong",
      });
      return;
    }

    if (editingWidget) {
      updateWidget(editingWidget.id, widgetSettings);
    } else {
      createWidget(widgetSettings);
    }
    setShowCreateModal(false);
    showSuccessToast("Widget berhasil disimpan!");
  };

  const handleDeleteWidget = (widgetId) => {
    deleteWidget(widgetId);
    setShowDeleteConfirm(false);
    showSuccessToast("Widget berhasil dihapus");
  };

  const handleCopyEmbedCode = () => {
    const embedCode = getWidgetEmbedCode(
      editingWidget || { id: "new", ...widgetSettings },
    );
    navigator.clipboard.writeText(embedCode);
    setEmbedCodeCopied(true);
    setTimeout(() => setEmbedCodeCopied(false), 2000);
  };

  const colorPresets = [
    { name: "Purple", value: "#8B5CF6" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Pink", value: "#EC4899" },
    { name: "Red", value: "#EF4444" },
  ];

  // Get preview testimonials
  const getPreviewTestimonials = () => {
    let filtered = testimonials.filter(
      (t) => t.status === "approved" && t.rating >= widgetSettings.min_rating,
    );

    if (widgetSettings.only_featured) {
      filtered = filtered.filter((t) => t.featured);
    }

    return filtered.slice(0, widgetSettings.max_items);
  };

  // Render widget preview
  const renderWidgetPreview = () => {
    const previewTestimonials = getPreviewTestimonials();

    const baseCardClass = `bg-white rounded-lg p-4 ${
      widgetSettings.card_shadow ? "shadow-md" : "border border-gray-200"
    }`;

    const bgClass =
      widgetSettings.theme === "dark" ? "bg-gray-900" : "bg-gray-50";

    const textColor =
      widgetSettings.theme === "dark" ? "text-white" : "text-gray-900";

    const cardBg =
      widgetSettings.theme === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-white";

    // Preview card component
    const TestimonialCard = ({ testimonial }) => (
      <div
        className={`${cardBg} rounded-lg p-4 ${
          widgetSettings.card_shadow ? "shadow-md" : "border border-gray-200"
        }`}
      >
        {/* Avatar & Name */}
        {widgetSettings.show_avatar && (
          <div className="flex items-center gap-3 mb-3">
            <div
              style={{
                backgroundColor: avatarColor(testimonial.name),
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            >
              {avatarInitials(testimonial.name)}
            </div>
            <div className="flex-1">
              <p
                className={`font-semibold text-sm ${
                  widgetSettings.theme === "dark"
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                {testimonial.name}
              </p>
              {widgetSettings.show_company && (
                <p className="text-xs text-gray-500">{testimonial.company}</p>
              )}
            </div>
          </div>
        )}

        {/* Rating */}
        {widgetSettings.show_rating && (
          <div className="mb-3 flex items-center gap-2">
            {renderStars(testimonial.rating, widgetSettings.primary_color)}
            <span className="text-xs text-gray-500">
              {testimonial.rating}/5
            </span>
          </div>
        )}

        {/* Quote */}
        <p
          className={`text-sm mb-3 ${
            widgetSettings.theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          "{testimonial.testimonial}"
        </p>

        {/* Date */}
        {widgetSettings.show_date && (
          <p className="text-xs text-gray-500">
            {new Date(testimonial.created_at).toLocaleDateString("id-ID")}
          </p>
        )}
      </div>
    );

    if (previewTestimonials.length === 0) {
      return (
        <div className={`${bgClass} rounded-lg p-8 text-center`}>
          <p
            className={`${
              widgetSettings.theme === "dark"
                ? "text-gray-400"
                : "text-gray-600"
            }`}
          >
            Belum ada testimoni yang sesuai untuk ditampilkan
          </p>
        </div>
      );
    }

    // GRID Layout
    if (widgetSettings.layout === "grid") {
      return (
        <div className={`${bgClass} rounded-lg p-4`}>
          <div className="grid grid-cols-3 gap-4">
            {previewTestimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        </div>
      );
    }

    // CAROUSEL Layout (show 1 card with nav)
    if (widgetSettings.layout === "carousel") {
      return (
        <div className={`${bgClass} rounded-lg p-4`}>
          <div className="flex items-center justify-between gap-4">
            <button className="text-gray-400 text-2xl">‹</button>
            <div className="flex-1">
              <TestimonialCard testimonial={previewTestimonials[0]} />
            </div>
            <button className="text-gray-400 text-2xl">›</button>
          </div>
          <div className="flex gap-2 justify-center mt-4">
            {previewTestimonials.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === 0 ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      );
    }

    // LIST Layout
    if (widgetSettings.layout === "list") {
      return (
        <div className={`${bgClass} rounded-lg p-4 space-y-4`}>
          {previewTestimonials.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      );
    }

    // MASONRY Layout
    if (widgetSettings.layout === "masonry") {
      return (
        <div className={`${bgClass} rounded-lg p-4`}>
          <div className="columns-3 gap-4">
            {previewTestimonials.map((t) => (
              <div key={t.id} className="break-inside-avoid mb-4">
                <TestimonialCard testimonial={t} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // SINGLE Layout
    if (widgetSettings.layout === "single") {
      return (
        <div className={`${bgClass} rounded-lg p-8 text-center`}>
          <TestimonialCard testimonial={previewTestimonials[0]} />
        </div>
      );
    }

    return null;
  };

  const embedCode = editingWidget
    ? getWidgetEmbedCode(editingWidget)
    : getWidgetEmbedCode({ id: "new", ...widgetSettings });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Widget Embed</h1>
            <p className="text-gray-600 mt-1">
              Buat dan kelola widget untuk menampilkan testimoni di website
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            ➕ Buat Widget Baru
          </button>
        </div>
      </div>

      {/* Widget Cards */}
      <div className="p-8">
        {widgets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              Belum ada widget dibuat
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Buat Widget Pertama
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {widget.name}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      widget.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {widget.status === "active" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Layout
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {WIDGET_LAYOUTS.find((l) => l.value === widget.layout)
                        ?.label || widget.layout}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Theme
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      {widget.theme === "light" ? "Light" : "Dark"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Views
                    </span>
                    <span className="font-bold text-gray-900">
                      {widget.views || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditWidget(widget)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    📋 Copy Embed Code
                  </button>
                  <button
                    onClick={() => handleEditWidget(widget)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => {
                      setEditingWidget(widget);
                      setShowDeleteConfirm(true);
                    }}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Widget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingWidget ? "Edit Widget" : "Buat Widget Baru"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-8 p-8">
              {/* LEFT: Preview */}
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <p className="text-sm font-semibold text-gray-600 mb-4">
                  LIVE PREVIEW
                </p>
                <div className="min-h-96">{renderWidgetPreview()}</div>
              </div>

              {/* RIGHT: Settings */}
              <div>
                {/* Widget Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Nama Widget
                  </label>
                  <input
                    type="text"
                    value={widgetSettings.name}
                    onChange={(e) =>
                      setWidgetSettings({
                        ...widgetSettings,
                        name: e.target.value,
                      })
                    }
                    placeholder="Contoh: Homepage Widget"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-6">
                  {["display", "content", "embed"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                        activeTab === tab
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab === "display" && "Tampilan"}
                      {tab === "content" && "Konten"}
                      {tab === "embed" && "Embed Code"}
                    </button>
                  ))}
                </div>

                {/* DISPLAY TAB */}
                {activeTab === "display" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        Layout
                      </label>
                      <select
                        value={widgetSettings.layout}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            layout: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {WIDGET_LAYOUTS.map((layout) => (
                          <option key={layout.value} value={layout.value}>
                            {layout.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        Theme
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            setWidgetSettings({
                              ...widgetSettings,
                              theme: "light",
                            })
                          }
                          className={`flex-1 px-4 py-2 rounded-lg font-medium border-2 transition ${
                            widgetSettings.theme === "light"
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          ☀️ Light
                        </button>
                        <button
                          onClick={() =>
                            setWidgetSettings({
                              ...widgetSettings,
                              theme: "dark",
                            })
                          }
                          className={`flex-1 px-4 py-2 rounded-lg font-medium border-2 transition ${
                            widgetSettings.theme === "dark"
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          🌙 Dark
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        Primary Color
                      </label>
                      <div className="flex gap-2">
                        {colorPresets.map((color) => (
                          <button
                            key={color.value}
                            onClick={() =>
                              setWidgetSettings({
                                ...widgetSettings,
                                primary_color: color.value,
                              })
                            }
                            style={{ backgroundColor: color.value }}
                            className={`w-8 h-8 rounded-lg border-2 transition ${
                              widgetSettings.primary_color === color.value
                                ? "border-gray-900"
                                : "border-gray-300"
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        Max Items
                      </label>
                      <div className="flex gap-2">
                        {[3, 6, 9, 12].map((count) => (
                          <button
                            key={count}
                            onClick={() =>
                              setWidgetSettings({
                                ...widgetSettings,
                                max_items: count,
                              })
                            }
                            className={`flex-1 px-3 py-2 rounded-lg font-medium border-2 transition ${
                              widgetSettings.max_items === count
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTENT TAB */}
                {activeTab === "content" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tampilkan Avatar
                      </label>
                      <input
                        type="checkbox"
                        checked={widgetSettings.show_avatar}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            show_avatar: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tampilkan Rating
                      </label>
                      <input
                        type="checkbox"
                        checked={widgetSettings.show_rating}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            show_rating: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tampilkan Perusahaan
                      </label>
                      <input
                        type="checkbox"
                        checked={widgetSettings.show_company}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            show_company: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tampilkan Tanggal
                      </label>
                      <input
                        type="checkbox"
                        checked={widgetSettings.show_date}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            show_date: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Card Shadow
                      </label>
                      <input
                        type="checkbox"
                        checked={widgetSettings.card_shadow}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            card_shadow: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Hanya Featured
                      </label>
                      <input
                        type="checkbox"
                        checked={widgetSettings.only_featured}
                        onChange={(e) =>
                          setWidgetSettings({
                            ...widgetSettings,
                            only_featured: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        Min Rating
                      </label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() =>
                              setWidgetSettings({
                                ...widgetSettings,
                                min_rating: rating,
                              })
                            }
                            className={`w-10 h-10 rounded-lg font-medium border-2 transition ${
                              widgetSettings.min_rating === rating
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            {rating === 0 ? "All" : rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* EMBED TAB */}
                {activeTab === "embed" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Embed Code
                      </label>
                      <textarea
                        value={embedCode}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none resize-none font-mono text-xs bg-gray-50"
                        rows="8"
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        Tempel kode ini di website kamu sebelum tag{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          &lt;/body&gt;
                        </code>
                      </p>
                    </div>

                    <button
                      onClick={handleCopyEmbedCode}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                        embedCodeCopied
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {embedCodeCopied ? "✓ Copied!" : "📋 Copy Code"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveWidget}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Simpan Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && editingWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Hapus Widget?
              </p>
              <p className="text-gray-600">
                Apakah Anda yakin ingin menghapus "{editingWidget.name}"?
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteWidget(editingWidget.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-out z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
