import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTestimonials } from "../../hooks/useTestimonials";
import { useToast } from "../../components/ui/Toast";
import TestimonialStats from "../../components/testimonials/TestimonialStats";
import TestimonialFilters from "../../components/testimonials/TestimonialFilters";
import TestimonialCard from "../../components/testimonials/TestimonialCard";
import AddTestimonialModal from "../../components/testimonials/AddTestimonialModal";
import RejectModal from "../../components/testimonials/RejectModal";

export default function TestimonialsPage() {
  const { toast } = useToast();
  const {
    testimonials,
    overview,
    loading,
    error,
    filters,
    setFilters,
    pagination,
    setPagination,
    bulkApprove,
    bulkDelete,
    approveTestimonial,
    rejectTestimonial,
    toggleFeatured,
    deleteTestimonial,
    addManualTestimonial,
  } = useTestimonials();

  // Local state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);

  // Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(testimonials.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    if (action === "approve") {
      await bulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set());
    } else if (action === "delete") {
      if (
        confirm(
          `Hapus ${selectedIds.size} testimoni? Tindakan ini tidak dapat dibatalkan.`,
        )
      ) {
        await bulkDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
      }
    }
  };

  const handleRejectClick = (id) => {
    setRejectingId(id);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (reason) => {
    if (rejectingId) {
      await rejectTestimonial(rejectingId, reason);
      setShowRejectModal(false);
      setRejectingId(null);
    }
  };

  const handleAddManual = async (formData) => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        type: "warning",
        title: "Validasi",
        message: "Nama dan Konten harus diisi",
      });
      return;
    }
    await addManualTestimonial(formData);
    setShowAddModal(false);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Testimoni</h1>
            <div className="flex gap-3">
              <Link
                to="/testimonials/forms"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition"
              >
                Kelola Form
              </Link>
              <Link
                to="/testimonials/widgets"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition"
              >
                Widget Embed
              </Link>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                ➕ Tambah Manual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <TestimonialStats stats={overview} />
      </div>

      {/* Filters & Bulk Actions */}
      <TestimonialFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        selectedCount={selectedIds.size}
        onBulkAction={handleBulkAction}
      />

      {/* Testimonials Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {testimonials.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">
              Tidak ada testimoni untuk filter ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                isSelected={selectedIds.has(testimonial.id)}
                onSelect={handleSelectOne}
                onApprove={approveTestimonial}
                onReject={handleRejectClick}
                onDelete={deleteTestimonial}
                onFeature={toggleFeatured}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {testimonials.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.max(1, pagination.page - 1),
                  })
                }
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded font-medium transition"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.min(
                      Math.ceil(pagination.total / pagination.limit),
                      pagination.page + 1,
                    ),
                  })
                }
                disabled={
                  pagination.page >=
                  Math.ceil(pagination.total / pagination.limit)
                }
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded font-medium transition"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectingId(null);
        }}
        onConfirm={handleConfirmReject}
      />

      {/* Add Manual Modal */}
      <AddTestimonialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddManual}
      />
    </div>
  );
}
