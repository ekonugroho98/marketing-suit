import React, { useState } from "react";
import { useCRM } from "../../hooks/useCRM";
import { useToast } from "../../components/ui/Toast";

const SequencesPage = () => {
  const { sequences, createSequence, updateSequence, deleteSequence } =
    useCRM();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger: {
      type: "manual",
      value: "",
    },
    steps: [
      {
        delayDays: 0,
        subject: "",
        body: "",
      },
    ],
    status: "draft",
  });

  const triggerTypes = [
    { id: "manual", label: "Manual" },
    { id: "tag_added", label: "Tag ditambahkan" },
    { id: "status_change", label: "Status berubah" },
    { id: "form_submitted", label: "Form dikirim" },
  ];

  const openCreateModal = () => {
    setEditingSequence(null);
    setFormData({
      name: "",
      description: "",
      trigger: {
        type: "manual",
        value: "",
      },
      steps: [
        {
          delayDays: 0,
          subject: "",
          body: "",
        },
      ],
      status: "draft",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sequence) => {
    setEditingSequence(sequence);
    setFormData({
      name: sequence.name,
      description: sequence.description,
      trigger: sequence.trigger || { type: "manual", value: "" },
      steps: sequence.steps || [{ delayDays: 0, subject: "", body: "" }],
      status: sequence.status || "draft",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSequence(null);
  };

  const handleAddStep = () => {
    const maxDelay = Math.max(...formData.steps.map((s) => s.delayDays), 0);
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          delayDays: maxDelay + 1,
          subject: "",
          body: "",
        },
      ],
    });
  };

  const handleRemoveStep = (index) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const handleStepChange = (index, key, value) => {
    const newSteps = [...formData.steps];
    newSteps[index][key] = key === "delayDays" ? parseInt(value, 10) : value;
    setFormData({
      ...formData,
      steps: newSteps,
    });
  };

  const handleSaveSequence = async () => {
    if (!formData.name.trim()) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama sequence tidak boleh kosong",
      });
      return;
    }

    if (formData.steps.length === 0) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Minimal ada 1 langkah email",
      });
      return;
    }

    if (formData.steps.some((s) => !s.subject.trim() || !s.body.trim())) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Semua subject dan body email harus diisi",
      });
      return;
    }

    const sequenceData = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };

    if (editingSequence) {
      await updateSequence(editingSequence.id, sequenceData);
    } else {
      await createSequence({
        ...sequenceData,
        createdAt: new Date().toISOString(),
        enrolled: 0,
        completed: 0,
        replyRate: 0,
      });
    }

    closeModal();
  };

  const handleDeleteSequence = async (id) => {
    if (window.confirm("Yakin ingin menghapus sequence ini?")) {
      await deleteSequence(id);
    }
  };

  const handleActivateSequence = async (id) => {
    const sequence = sequences.find((s) => s.id === id);
    if (sequence) {
      await updateSequence(id, {
        ...sequence,
        status: "active",
      });
    }
  };

  const handlePauseSequence = async (id) => {
    const sequence = sequences.find((s) => s.id === id);
    if (sequence) {
      await updateSequence(id, {
        ...sequence,
        status: "paused",
      });
    }
  };

  const formatTrigger = (trigger) => {
    const triggerType = triggerTypes.find((t) => t.id === trigger.type);
    if (trigger.type === "manual") {
      return `Trigger: ${triggerType?.label}`;
    }
    return `Trigger: ${triggerType?.label} — ${trigger.value}`;
  };

  const calculateStats = () => {
    if (sequences.length === 0) {
      return { active: 0, enrolled: 0, replyRate: 0 };
    }

    const activeSequences = sequences.filter(
      (s) => s.status === "active",
    ).length;
    const totalEnrolled = sequences.reduce(
      (sum, s) => sum + (s.enrolled || 0),
      0,
    );
    const avgReplyRate =
      sequences.length > 0
        ? Math.round(
            sequences.reduce((sum, s) => sum + (s.replyRate || 0), 0) /
              sequences.length,
          )
        : 0;

    return {
      active: activeSequences,
      enrolled: totalEnrolled,
      replyRate: avgReplyRate,
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Sequence Email
            </h1>
            <p className="text-slate-600 mt-2">
              Buat dan kelola email sequence otomatis untuk nurture lead
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
          >
            <span>➕</span> Buat Sequence
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium">Sequence Aktif</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {stats.active}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium">
              Total Terdaftar
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {stats.enrolled}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium">Avg Reply Rate</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {stats.replyRate}%
            </p>
          </div>
        </div>

        {/* Empty State */}
        {sequences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-slate-200">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Belum ada sequence
            </h2>
            <p className="text-slate-600 mb-6">
              Buat email sequence pertama untuk otomatisasi nurturing
            </p>
            <button
              onClick={openCreateModal}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buat Sequence Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sequences.map((sequence) => (
              <div
                key={sequence.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200 p-6"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">
                      {sequence.name}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {sequence.description}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        sequence.status === "active"
                          ? "bg-green-100 text-green-800"
                          : sequence.status === "paused"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {sequence.status === "active"
                        ? "Aktif"
                        : sequence.status === "paused"
                          ? "Dijeda"
                          : "Draft"}
                    </span>
                  </div>
                </div>

                {/* Trigger Info */}
                <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-200">
                  <p className="text-sm text-slate-800">
                    {formatTrigger(sequence.trigger)}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold">
                      Terdaftar
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {sequence.enrolled || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold">
                      Selesai
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {sequence.completed || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold">
                      Reply Rate
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {sequence.replyRate || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold">
                      Langkah
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {sequence.steps?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {sequence.status === "draft" ||
                  sequence.status === "paused" ? (
                    <button
                      onClick={() => handleActivateSequence(sequence.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
                    >
                      <span>▶</span> Aktifkan
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseSequence(sequence.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors font-medium text-sm"
                    >
                      <span>⏸</span> Jeda
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(sequence)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium text-sm"
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSequence(sequence.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                  >
                    <span>🗑️</span> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-slate-200 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingSequence ? "Edit Sequence" : "Buat Sequence Baru"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Nama Sequence
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Welcome Series"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Deskripsi
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Jelaskan purpose sequence ini"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-semibold text-slate-900">
                  Trigger
                </label>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Tipe Trigger
                  </label>
                  <select
                    value={formData.trigger.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trigger: {
                          ...formData.trigger,
                          type: e.target.value,
                          value: "",
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {triggerTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.trigger.type !== "manual" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">
                      {formData.trigger.type === "tag_added"
                        ? "Tag Name"
                        : formData.trigger.type === "status_change"
                          ? "Status"
                          : "Form Name"}
                    </label>
                    <input
                      type="text"
                      value={formData.trigger.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger: {
                            ...formData.trigger,
                            value: e.target.value,
                          },
                        })
                      }
                      placeholder="Enter trigger value"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Step Builder */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-900">
                  Email Steps
                </label>

                <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {formData.steps.map((step, index) => (
                    <div
                      key={index}
                      className="bg-white p-4 rounded-lg border border-slate-300 space-y-3"
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-900">
                          Email {index + 1}
                          {index === 0 && " (Hari 0)"}
                        </h4>
                        {formData.steps.length > 1 && (
                          <button
                            onClick={() => handleRemoveStep(index)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          >
                            ✕ Hapus
                          </button>
                        )}
                      </div>

                      {/* Delay Days */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600">
                          Hari ke-
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={step.delayDays}
                          onChange={(e) =>
                            handleStepChange(index, "delayDays", e.target.value)
                          }
                          disabled={index === 0}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={step.subject}
                          onChange={(e) =>
                            handleStepChange(index, "subject", e.target.value)
                          }
                          placeholder="Contoh: Welcome to our platform!"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Body */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600">
                          Email Body
                        </label>
                        <textarea
                          value={step.body}
                          onChange={(e) =>
                            handleStepChange(index, "body", e.target.value)
                          }
                          placeholder="Tulis isi email..."
                          rows="4"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddStep}
                  className="w-full py-2 px-4 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <span>➕</span> Tambah Langkah
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex gap-3 p-6 border-t border-slate-200 bg-white">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, status: "draft" });
                  setTimeout(handleSaveSequence, 0);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Simpan sebagai Draft
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, status: "active" });
                  setTimeout(handleSaveSequence, 0);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Aktifkan Sequence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SequencesPage;
