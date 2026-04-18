import React, { useState } from "react";
import { useCRM } from "../../hooks/useCRM";
import { SEGMENT_FIELDS, SEGMENT_OPERATORS } from "../../services/crm";
import { useToast } from "../../components/ui/Toast";

const SegmentsPage = () => {
  const {
    segments,
    createSegment,
    updateSegment,
    deleteSegment,
    previewSegment,
  } = useCRM();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [previewSegmentId, setPreviewSegmentId] = useState(null);
  const [previewLeads, setPreviewLeads] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logic: "AND",
    conditions: [{ field: "status", operator: "equals", value: "" }],
    autoTag: "",
    active: true,
  });

  const openCreateModal = () => {
    setEditingSegment(null);
    setFormData({
      name: "",
      description: "",
      logic: "AND",
      conditions: [{ field: "status", operator: "equals", value: "" }],
      autoTag: "",
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (segment) => {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description,
      logic: segment.logic || "AND",
      conditions: segment.conditions || [
        { field: "status", operator: "equals", value: "" },
      ],
      autoTag: segment.autoTag || "",
      active: segment.active !== false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSegment(null);
  };

  const handleSaveSegment = async () => {
    if (!formData.name.trim()) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama segment tidak boleh kosong",
      });
      return;
    }

    if (formData.conditions.some((c) => !c.value)) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Semua kondisi harus diisi",
      });
      return;
    }

    const segmentData = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };

    if (editingSegment) {
      await updateSegment(editingSegment.id, segmentData);
    } else {
      await createSegment({
        ...segmentData,
        createdAt: new Date().toISOString(),
      });
    }

    closeModal();
  };

  const handleDeleteSegment = async (id) => {
    if (window.confirm("Yakin ingin menghapus segment ini?")) {
      await deleteSegment(id);
    }
  };

  const handleAddCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: "status", operator: "equals", value: "" },
      ],
    });
  };

  const handleRemoveCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const handleConditionChange = (index, key, value) => {
    const newConditions = [...formData.conditions];
    newConditions[index][key] = value;

    // Reset operator when field changes
    if (key === "field") {
      const fieldDef = SEGMENT_FIELDS.find((f) => f.id === value);
      newConditions[index].operator = fieldDef?.defaultOperator || "equals";
    }

    setFormData({
      ...formData,
      conditions: newConditions,
    });
  };

  const getOperatorsForField = (fieldId) => {
    const field = SEGMENT_FIELDS.find((f) => f.id === fieldId);
    if (!field) return [];
    return SEGMENT_OPERATORS.filter((op) => field.operators.includes(op.id));
  };

  const getFieldLabel = (fieldId) => {
    const field = SEGMENT_FIELDS.find((f) => f.id === fieldId);
    return field?.label || fieldId;
  };

  const handlePreviewSegment = async (segment) => {
    setPreviewSegmentId(segment.id);
    setPreviewLoading(true);
    const leads = await previewSegment(segment);
    setPreviewLeads(leads || []);
    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewSegmentId(null);
    setPreviewLeads([]);
  };

  const formatFilterSummary = (segment) => {
    if (!segment.conditions || segment.conditions.length === 0)
      return "Tidak ada filter";
    const parts = segment.conditions.map((c) => {
      const field = getFieldLabel(c.field);
      return `${field} ${c.operator} ${c.value}`;
    });
    return parts.join(` ${segment.logic} `);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Segmentasi Lead
            </h1>
            <p className="text-slate-600 mt-2">
              Buat dan kelola segment lead untuk campaign Anda
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
          >
            <span>➕</span> Buat Segment
          </button>
        </div>

        {/* Empty State */}
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-slate-200">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Belum ada segment
            </h2>
            <p className="text-slate-600 mb-6">
              Mulai dengan membuat segment pertama Anda
            </p>
            <button
              onClick={openCreateModal}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buat Segment Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">
                        {segment.name}
                      </h3>
                      <p className="text-slate-600 text-sm mt-1">
                        {segment.description}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          segment.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {segment.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>

                  {/* Filter Summary */}
                  <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                      Filter
                    </p>
                    <p className="text-sm text-slate-800">
                      {formatFilterSummary(segment)}
                    </p>
                  </div>

                  {/* Lead Count Badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="inline-flex items-center justify-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {segment.leadCount || 0} Lead
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePreviewSegment(segment)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                    >
                      <span>👁️</span> Preview
                    </button>
                    <button
                      onClick={() => openEditModal(segment)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium text-sm"
                    >
                      <span>✏️</span> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSegment(segment.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                    >
                      <span>🗑️</span> Hapus
                    </button>
                  </div>
                </div>

                {/* Preview Panel */}
                {previewSegmentId === segment.id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-900">
                        Preview Lead ({previewLeads.length})
                      </h4>
                      <button
                        onClick={closePreview}
                        className="text-slate-500 hover:text-slate-700 text-lg"
                      >
                        ✕
                      </button>
                    </div>

                    {previewLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin inline-block w-6 h-6 border-3 border-slate-300 border-t-blue-600 rounded-full"></div>
                      </div>
                    ) : previewLeads.length === 0 ? (
                      <p className="text-slate-600 text-sm">
                        Tidak ada lead yang cocok dengan filter ini
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {previewLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="bg-white p-3 rounded border border-slate-200 text-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {lead.name}
                                </p>
                                <p className="text-slate-600 text-xs">
                                  {lead.email}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                  {lead.status}
                                </span>
                                <p className="text-slate-600 text-xs mt-1">
                                  Score: {lead.score}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                      Enroll ke Sequence
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-slate-200 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingSegment ? "Edit Segment" : "Buat Segment Baru"}
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
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Nama Segment
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. High-Value Leads"
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
                  placeholder="Jelaskan purpose segment ini"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Logic Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Filter Logic
                </label>
                <div className="flex gap-3">
                  {["AND", "OR"].map((logic) => (
                    <button
                      key={logic}
                      onClick={() => setFormData({ ...formData, logic })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        formData.logic === logic
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {logic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Builder */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-900">
                  Filter Conditions
                </label>

                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      {/* Field */}
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">
                          Field
                        </label>
                        <select
                          value={condition.field}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              "field",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          {SEGMENT_FIELDS.map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operator */}
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">
                          Operator
                        </label>
                        <select
                          value={condition.operator}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              "operator",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          {getOperatorsForField(condition.field).map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Value */}
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">
                          Value
                        </label>
                        <input
                          type={
                            SEGMENT_FIELDS.find((f) => f.id === condition.field)
                              ?.type === "number"
                              ? "number"
                              : "text"
                          }
                          value={condition.value}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              "value",
                              e.target.value,
                            )
                          }
                          placeholder="Masukkan nilai"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveCondition(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddCondition}
                  className="w-full py-2 px-4 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <span>➕</span> Tambah Kondisi
                </button>
              </div>

              {/* Auto-tag */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Auto-Tag (Optional)
                </label>
                <input
                  type="text"
                  value={formData.autoTag}
                  onChange={(e) =>
                    setFormData({ ...formData, autoTag: e.target.value })
                  }
                  placeholder="e.g. vip-leads"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setFormData({ ...formData, active: !formData.active })
                  }
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    formData.active ? "bg-green-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      formData.active ? "translate-x-5" : "translate-x-1"
                    } my-auto`}
                  />
                </button>
                <label className="text-sm font-semibold text-slate-900">
                  Aktifkan Segment
                </label>
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
                onClick={handleSaveSegment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Simpan Segment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentsPage;
