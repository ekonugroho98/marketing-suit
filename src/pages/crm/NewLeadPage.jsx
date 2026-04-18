import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '../../hooks/useCRM';
import { LEAD_STATUSES, LEAD_SOURCES } from '../../services/crm';

export default function NewLeadPage() {
  const navigate = useNavigate();
  const { createLead, addActivity } = useCRM();

  const [formData, setFormData] = useState({
    namaLengkap: '',
    email: '',
    noTelepon: '',
    perusahaan: '',
    jabatan: '',
    status: 'new',
    sumber: 'manual',
    tags: [],
  });

  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.namaLengkap.trim()) {
      newErrors.namaLengkap = 'Nama lengkap tidak boleh kosong';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create the lead
      const newLead = await createLead({
        nama_lengkap: formData.namaLengkap,
        email: formData.email || null,
        no_telepon: formData.noTelepon || null,
        perusahaan: formData.perusahaan || null,
        jabatan: formData.jabatan || null,
        status: formData.status,
        sumber: formData.sumber,
        tags: formData.tags,
      });

      // Add initial note activity if provided
      if (note.trim() && newLead.id) {
        await addActivity(newLead.id, {
          type: 'note',
          title: 'Catatan awal',
          description: note,
        });
      }

      // Navigate to the new lead's detail page
      navigate(`/crm/leads/${newLead.id}`);
    } catch (error) {
      console.error('Error creating lead:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Terjadi kesalahan saat menyimpan lead',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Tambah Lead Baru</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Informasi Dasar */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Informasi Dasar
                </h2>

                <div className="space-y-4">
                  {/* Nama Lengkap */}
                  <div>
                    <label htmlFor="namaLengkap" className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="namaLengkap"
                      type="text"
                      name="namaLengkap"
                      value={formData.namaLengkap}
                      onChange={handleInputChange}
                      placeholder="Masukkan nama lengkap"
                      className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                        errors.namaLengkap ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.namaLengkap && (
                      <p className="mt-1 text-sm text-red-500">{errors.namaLengkap}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="nama@contoh.com"
                      className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* No. Telepon */}
                  <div>
                    <label htmlFor="noTelepon" className="block text-sm font-medium text-gray-700 mb-2">
                      No. Telepon
                    </label>
                    <input
                      id="noTelepon"
                      type="tel"
                      name="noTelepon"
                      value={formData.noTelepon}
                      onChange={handleInputChange}
                      placeholder="+62 8xx xxxx xxxx"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>

                  {/* Perusahaan */}
                  <div>
                    <label htmlFor="perusahaan" className="block text-sm font-medium text-gray-700 mb-2">
                      Perusahaan
                    </label>
                    <input
                      id="perusahaan"
                      type="text"
                      name="perusahaan"
                      value={formData.perusahaan}
                      onChange={handleInputChange}
                      placeholder="Nama perusahaan"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>

                  {/* Jabatan */}
                  <div>
                    <label htmlFor="jabatan" className="block text-sm font-medium text-gray-700 mb-2">
                      Jabatan
                    </label>
                    <input
                      id="jabatan"
                      type="text"
                      name="jabatan"
                      value={formData.jabatan}
                      onChange={handleInputChange}
                      placeholder="Posisi/Jabatan"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Klasifikasi */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Klasifikasi
                </h2>

                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    >
                      {LEAD_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sumber */}
                  <div>
                    <label htmlFor="sumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Sumber
                    </label>
                    <select
                      id="sumber"
                      name="sumber"
                      value={formData.sumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    >
                      {LEAD_SOURCES.map(source => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label htmlFor="tagInput" className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      id="tagInput"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleAddTag}
                      placeholder="Ketik tag dan tekan Enter"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                    {formData.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 text-blue-500 hover:text-blue-700 font-bold"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Catatan Awal */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Catatan Awal <span className="text-xs font-normal text-gray-500">(Opsional)</span>
                </h2>

                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Masukkan catatan awal tentang lead ini..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Catatan ini akan dibuat sebagai aktivitas pertama dari lead
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {errors.submit}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Lead'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
