import {
  getStatusMeta,
  getSourceMeta,
  renderStars,
  avatarInitials,
  avatarColor,
} from "../../services/testimonials";

export default function TestimonialCard({
  testimonial,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onDelete,
  onFeature,
}) {
  const statusMeta = getStatusMeta(testimonial.status);
  const sourceMeta = getSourceMeta(testimonial.source);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden relative">
      {/* Select Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(testimonial.id)}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.bgColor} ${statusMeta.textColor} ${statusMeta.borderColor}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-6 pt-16">
        {/* Header: Avatar + Name + Role + Source + Date */}
        <div className="mb-4">
          <div className="flex items-start gap-3 mb-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${avatarColor(
                testimonial.name,
              )} flex-shrink-0`}
            >
              {avatarInitials(testimonial.name)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{testimonial.name}</p>
              {testimonial.role && testimonial.company && (
                <p className="text-sm text-gray-600">
                  {testimonial.role} @ {testimonial.company}
                </p>
              )}
              {!testimonial.role && testimonial.company && (
                <p className="text-sm text-gray-600">{testimonial.company}</p>
              )}
              {testimonial.role && !testimonial.company && (
                <p className="text-sm text-gray-600">{testimonial.role}</p>
              )}
            </div>
          </div>

          {/* Source and Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500 ml-15">
            {sourceMeta && <span>{sourceMeta.icon}</span>}
            <span>{sourceMeta?.label || testimonial.source}</span>
            <span>•</span>
            <span>
              {new Date(testimonial.createdAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-3">
          <span className="text-lg">{renderStars(testimonial.rating)}</span>
        </div>

        {/* Content Quote */}
        <p className="text-gray-700 italic line-clamp-4 mb-4">
          {testimonial.content}
        </p>

        {/* Tags */}
        {testimonial.tags && testimonial.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {testimonial.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          {testimonial.status === "pending" && (
            <>
              <button
                onClick={() => onApprove(testimonial.id)}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition"
              >
                ✅ Setujui
              </button>
              <button
                onClick={() => onReject(testimonial.id)}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
              >
                ❌ Tolak
              </button>
            </>
          )}

          {testimonial.status === "approved" && (
            <button
              onClick={() => onFeature(testimonial.id)}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                testimonial.featured
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              {testimonial.featured ? "⭐ Featured" : "☆ Unfeatured"}
            </button>
          )}

          <button
            onClick={() => {
              if (
                confirm(
                  "Hapus testimoni ini? Tindakan ini tidak dapat dibatalkan.",
                )
              ) {
                onDelete(testimonial.id);
              }
            }}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded text-sm font-medium transition"
          >
            🗑️ Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
