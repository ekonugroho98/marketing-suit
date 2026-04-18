import React from "react";
import {
  TESTIMONIAL_STATUSES,
  TESTIMONIAL_SOURCES,
} from "../../services/testimonials";

const statusOptions = [
  { label: "All", value: "all" },
  ...TESTIMONIAL_STATUSES.map((s) => ({ label: s.label, value: s.value })),
];

const sourceOptions = [
  { label: "All Sources", value: "all" },
  ...TESTIMONIAL_SOURCES.map((s) => ({ label: s.label, value: s.value })),
];

const ratingOptions = [
  { stars: 0, label: "All Ratings" },
  { stars: 1, label: "1+ ⭐" },
  { stars: 2, label: "2+ ⭐" },
  { stars: 3, label: "3+ ⭐" },
  { stars: 4, label: "4+ ⭐" },
  { stars: 5, label: "5 ⭐" },
];

export default function TestimonialFilters({
  filters,
  onFilterChange,
  selectedCount,
  onBulkAction,
}) {
  const handleStatusFilter = (status) => {
    onFilterChange({ ...filters, status: status === "all" ? null : status });
  };

  const handleSourceChange = (source) => {
    onFilterChange({ ...filters, source: source === "all" ? null : source });
  };

  const handleMinRating = (rating) => {
    onFilterChange({ ...filters, minRating: rating === 0 ? null : rating });
  };

  const handleSearch = (query) => {
    onFilterChange({ ...filters, search: query });
  };

  return (
    <>
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {/* Status Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  !filters.status && option.value === "all"
                    ? "bg-blue-600 text-white"
                    : filters.status === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Source Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={filters.source || "all"}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Rating
              </label>
              <div className="flex gap-2">
                {ratingOptions.map((option) => (
                  <button
                    key={option.stars}
                    onClick={() => handleMinRating(option.stars)}
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      filters.minRating === option.stars ||
                      (!filters.minRating && option.stars === 0)
                        ? "bg-yellow-400 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Cari nama, email, company..."
                value={filters.search || ""}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              {selectedCount} dipilih
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onBulkAction("approve")}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                ✅ Setujui Semua
              </button>
              <button
                onClick={() => onBulkAction("delete")}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                🗑️ Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
