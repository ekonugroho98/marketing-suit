import React, { useState } from "react";
import { useTestimonials } from "../../hooks/useTestimonials";
import { getFormEmbedUrl } from "../../services/testimonials";
import { useToast } from "../../components/ui/Toast";

export default function CollectPage() {
  const {
    forms,
    submissions,
    createForm,
    updateForm,
    deleteForm,
    testimonials,
  } = useTestimonials();
  const { toast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [selectedFormForEmail, setSelectedFormForEmail] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [emailData, setEmailData] = useState({
    recipientName: "",
    recipientEmail: "",
    subject: "",
    message: "",
  });

  // Form editor state
  const [formSettings, setFormSettings] = useState({
    name: "",
    description: "",
    headline: "Bagikan Testimoni Anda",
    subheadline: "Ceritakan pengalaman terbaik Anda bersama kami",
    cta_text: "Kirim Testimoni",
    success_message: "Terima kasih! Testimoni Anda telah diterima.",
    primary_color: "#8B5CF6",
    ask_rating: true,
    ask_company: true,
    ask_role: true,
    ask_media: false,
    max_characters: 500,
    auto_approve: false,
    redirect_url: "",
  });

  const [activeTab, setActiveTab] = useState("content");

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCreateNew = () => {
    setEditingForm(null);
    setFormSettings({
      name: "",
      description: "",
      headline: "Bagikan Testimoni Anda",
      subheadline: "Ceritakan pengalaman terbaik Anda bersama kami",
      cta_text: "Kirim Testimoni",
      success_message: "Terima kasih! Testimoni Anda telah diterima.",
      primary_color: "#8B5CF6",
      ask_rating: true,
      ask_company: true,
      ask_role: true,
      ask_media: false,
      max_characters: 500,
      auto_approve: false,
      redirect_url: "",
    });
    setActiveTab("content");
    setShowCreateModal(true);
  };

  const handleEditForm = (form) => {
    setEditingForm(form);
    setFormSettings(form);
    setActiveTab("content");
    setShowCreateModal(true);
  };

  const handleSaveDraft = () => {
    if (!formSettings.name) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama form tidak boleh kosong",
      });
      return;
    }

    if (editingForm) {
      updateForm(editingForm.id, { ...formSettings, status: "draft" });
    } else {
      createForm({ ...formSettings, status: "draft" });
    }
    setShowCreateModal(false);
  };

  const handleSaveAndActivate = () => {
    if (!formSettings.name) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama form tidak boleh kosong",
      });
      return;
    }

    if (editingForm) {
      updateForm(editingForm.id, { ...formSettings, status: "active" });
    } else {
      createForm({ ...formSettings, status: "active" });
    }
    setShowCreateModal(false);
  };

  const handleCopyLink = (formId) => {
    const embedUrl = getFormEmbedUrl(formId);
    navigator.clipboard.writeText(embedUrl);
    showSuccessToast("Link disalin!");
  };

  const handleOpenEmailModal = (form) => {
    setSelectedFormForEmail(form);
    setEmailData({
      recipientName: "",
      recipientEmail: "",
      subject: `Bagikan testimoni Anda di ${form.name}`,
      message: `Kami ingin mendengar pengalaman Anda. Silakan isi testimoni Anda di tautan berikut:\n\n${getFormEmbedUrl(form.id)}`,
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = () => {
    if (!emailData.recipientEmail || !emailData.recipientName) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama dan email penerima harus disi",
      });
      return;
    }
    // In a real app, this would send via API
    console.log("Sending email:", emailData);
    showSuccessToast("Email berhasil dikirim!");
    setShowEmailModal(false);
  };

  const handleDeleteForm = (formId) => {
    deleteForm(formId);
    setShowDeleteConfirm(false);
    showSuccessToast("Form berhasil dihapus");
  };

  const getFormStats = (form) => {
    const formSubmissions = submissions.filter((s) => s.form_id === form.id);
    const views = form.views || 0;
    const submitCount = formSubmissions.length;
    const conversionRate =
      views > 0 ? ((submitCount / views) * 100).toFixed(1) : 0;
    return { views, submitCount, conversionRate };
  };

  const calculateGlobalStats = () => {
    const totalForms = forms.length;
    const totalSubmissions = submissions.length;
    const totalViews = forms.reduce((sum, f) => sum + (f.views || 0), 0);
    const avgConversion =
      totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(1) : 0;
    return { totalForms, totalSubmissions, avgConversion, totalViews };
  };

  const colorPresets = [
    { name: "Purple", value: "#8B5CF6" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Pink", value: "#EC4899" },
    { name: "Red", value: "#EF4444" },
  ];

  const stats = calculateGlobalStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Kumpulkan Testimoni
            </h1>
            <p className="text-gray-600 mt-1">
              Buat dan kelola form untuk mengumpulkan testimoni pelanggan
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            ➕ Buat Form Baru
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Forms</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalForms}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Submissions</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalSubmissions}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Views</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalViews}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Avg Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.avgConversion}%
            </p>
          </div>
        </div>
      </div>

      {/* Form Cards */}
      <div className="p-8">
        {forms.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              Belum ada form testimoni
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Buat Form Pertama
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => {
              const { views, submitCount, conversionRate } = getFormStats(form);
              const fieldsSummary = [];
              if (form.ask_rating) fieldsSummary.push("Rating");
              if (form.ask_company) fieldsSummary.push("Perusahaan");
              if (form.ask_role) fieldsSummary.push("Jabatan");
              if (form.ask_media) fieldsSummary.push("Media");

              return (
                <div
                  key={form.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {form.name}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {form.description}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        form.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {form.status === "active" ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4 py-4 border-y border-gray-200">
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">
                        Views
                      </p>
                      <p className="text-xl font-bold text-gray-900">{views}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">
                        Submissions
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {submitCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">
                        Conversion
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {conversionRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide">
                        Fields
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {fieldsSummary.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(form.id)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      🔗 Copy Link
                    </button>
                    <button
                      onClick={() => handleOpenEmailModal(form)}
                      className="flex-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
                    >
                      📧 Kirim via Email
                    </button>
                    <button
                      onClick={() => handleEditForm(form)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        setEditingForm(form);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingForm ? "Edit Form" : "Buat Form Baru"}
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
                  PREVIEW
                </p>

                {/* Phone Frame Mockup */}
                <div className="relative mx-auto w-72 h-screen bg-white rounded-2xl border-8 border-black shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white overflow-y-auto">
                    {/* Status Bar */}
                    <div className="h-6 bg-black flex items-center justify-center text-white text-xs font-semibold">
                      9:41
                    </div>

                    {/* Form Content */}
                    <div
                      className="p-6 pt-8"
                      style={{
                        backgroundColor: formSettings.primary_color + "10",
                      }}
                    >
                      {/* Headline */}
                      <h1 className="text-xl font-bold text-gray-900 mb-2">
                        {formSettings.headline || "Headline"}
                      </h1>

                      {/* Subheadline */}
                      <p className="text-sm text-gray-600 mb-6">
                        {formSettings.subheadline || "Subheadline"}
                      </p>

                      {/* Rating Stars */}
                      {formSettings.ask_rating && (
                        <div className="mb-6">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Rating
                          </p>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span
                                key={i}
                                className="text-2xl"
                                style={{ color: formSettings.primary_color }}
                              >
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Form Fields */}
                      <div className="space-y-4 mb-6">
                        {/* Testimonial Text */}
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-2">
                            Testimoni
                          </label>
                          <textarea
                            placeholder="Ceritakan pengalaman Anda..."
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none h-20"
                            readOnly
                          />
                        </div>

                        {/* Company Field */}
                        {formSettings.ask_company && (
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-2">
                              Perusahaan
                            </label>
                            <input
                              type="text"
                              placeholder="Nama perusahaan"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              readOnly
                            />
                          </div>
                        )}

                        {/* Role Field */}
                        {formSettings.ask_role && (
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-2">
                              Jabatan
                            </label>
                            <input
                              type="text"
                              placeholder="Jabatan Anda"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              readOnly
                            />
                          </div>
                        )}

                        {/* Media Upload */}
                        {formSettings.ask_media && (
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-2">
                              Media (Foto/Video)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                              <p className="text-xs text-gray-600">
                                📸 Unggah media
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <button
                        style={{ backgroundColor: formSettings.primary_color }}
                        className="w-full py-3 text-white rounded-lg font-semibold text-sm"
                      >
                        {formSettings.cta_text || "Kirim"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Settings */}
              <div>
                {/* Form Name & Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Nama Form
                  </label>
                  <input
                    type="text"
                    value={formSettings.name}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, name: e.target.value })
                    }
                    placeholder="Contoh: Customer Testimonials 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Deskripsi
                  </label>
                  <input
                    type="text"
                    value={formSettings.description}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        description: e.target.value,
                      })
                    }
                    placeholder="Deskripsi singkat tentang form ini"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-6">
                  {["content", "fields", "after"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                        activeTab === tab
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab === "content" && "Konten"}
                      {tab === "fields" && "Fields"}
                      {tab === "after" && "After Submit"}
                    </button>
                  ))}
                </div>

                {/* CONTENT TAB */}
                {activeTab === "content" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Headline
                      </label>
                      <input
                        type="text"
                        value={formSettings.headline}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            headline: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Subheadline
                      </label>
                      <input
                        type="text"
                        value={formSettings.subheadline}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            subheadline: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={formSettings.cta_text}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            cta_text: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Success Message
                      </label>
                      <textarea
                        value={formSettings.success_message}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            success_message: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="3"
                      />
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
                              setFormSettings({
                                ...formSettings,
                                primary_color: color.value,
                              })
                            }
                            style={{ backgroundColor: color.value }}
                            className={`w-8 h-8 rounded-lg border-2 transition ${
                              formSettings.primary_color === color.value
                                ? "border-gray-900"
                                : "border-gray-300"
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* FIELDS TAB */}
                {activeTab === "fields" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tampilkan Rating
                      </label>
                      <input
                        type="checkbox"
                        checked={formSettings.ask_rating}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            ask_rating: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tanya Perusahaan
                      </label>
                      <input
                        type="checkbox"
                        checked={formSettings.ask_company}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            ask_company: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Tanya Jabatan
                      </label>
                      <input
                        type="checkbox"
                        checked={formSettings.ask_role}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            ask_role: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Izinkan Upload Media
                      </label>
                      <input
                        type="checkbox"
                        checked={formSettings.ask_media}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            ask_media: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        Max Characters: {formSettings.max_characters}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="1000"
                        step="50"
                        value={formSettings.max_characters}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            max_characters: parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">
                        Auto-approve Testimonials
                      </label>
                      <input
                        type="checkbox"
                        checked={formSettings.auto_approve}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            auto_approve: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>
                  </div>
                )}

                {/* AFTER SUBMIT TAB */}
                {activeTab === "after" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Redirect URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={formSettings.redirect_url}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            redirect_url: e.target.value,
                          })
                        }
                        placeholder="https://example.com/thank-you"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        Pengunjung akan diarahkan ke URL ini setelah mengisi
                        form
                      </p>
                    </div>
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
                onClick={handleSaveDraft}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Simpan Draft
              </button>
              <button
                onClick={handleSaveAndActivate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Simpan & Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Kirim via Email
              </h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Nama Penerima
                </label>
                <input
                  type="text"
                  value={emailData.recipientName}
                  onChange={(e) =>
                    setEmailData({
                      ...emailData,
                      recipientName: e.target.value,
                    })
                  }
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email Penerima
                </label>
                <input
                  type="email"
                  value={emailData.recipientEmail}
                  onChange={(e) =>
                    setEmailData({
                      ...emailData,
                      recipientEmail: e.target.value,
                    })
                  }
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) =>
                    setEmailData({ ...emailData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Message
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) =>
                    setEmailData({ ...emailData, message: e.target.value })
                  }
                  rows="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Kirim Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && editingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Hapus Form?
              </p>
              <p className="text-gray-600">
                Apakah Anda yakin ingin menghapus "{editingForm.name}"? Tindakan
                ini tidak dapat dibatalkan.
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
                onClick={() => handleDeleteForm(editingForm.id)}
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
