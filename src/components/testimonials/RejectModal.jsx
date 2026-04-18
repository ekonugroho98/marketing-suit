import { useState } from "react";

export default function RejectModal({ isOpen, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Alasan Penolakan
        </h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Masukkan alasan penolakan (opsional)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          rows={4}
        />
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            Tolak
          </button>
        </div>
      </div>
    </div>
  );
}
