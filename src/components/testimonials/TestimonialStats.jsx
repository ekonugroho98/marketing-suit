import { renderStars } from "../../services/testimonials";

export default function TestimonialStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Total Testimoni */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm font-medium text-gray-600">Total Testimoni</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
      </div>

      {/* Menunggu Review */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm font-medium text-gray-600">Menunggu Review</p>
        <div className="flex items-end justify-between mt-2">
          <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
          {stats.pending > 0 && (
            <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full">
              New
            </span>
          )}
        </div>
      </div>

      {/* Disetujui */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm font-medium text-gray-600">Disetujui</p>
        <div className="flex items-end justify-between mt-2">
          <p className="text-3xl font-bold text-gray-900">{stats.approved}</p>
          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
            Active
          </span>
        </div>
      </div>

      {/* Rata-rata Rating */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm font-medium text-gray-600">Rata-rata Rating</p>
        <div className="flex items-end gap-2 mt-2">
          <p className="text-3xl font-bold text-gray-900">
            {stats.avg_rating ? stats.avg_rating.toFixed(1) : "0"}
          </p>
          <span className="text-lg text-yellow-400 mb-1">
            {renderStars(Math.round(stats.avg_rating || 0))}
          </span>
        </div>
      </div>

      {/* Featured */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm font-medium text-gray-600">Featured</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {stats.featured}
        </p>
      </div>
    </div>
  );
}
