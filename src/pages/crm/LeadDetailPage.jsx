import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCRM } from '../../hooks/useCRM';
import { LEAD_STATUSES, ACTIVITY_TYPES, getStatusMeta, getScoreCategory, formatLeadSource } from '../../services/crm';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchLeadDetail, deleteLead, updateLead, addActivity, updateActivity } = useCRM();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Activity form
  const [activityForm, setActivityForm] = useState({
    type: 'note',
    title: '',
    description: '',
  });

  // Contact info edit
  const [editInfo, setEditInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
  });

  // Load lead
  useEffect(() => {
    const loadLead = async () => {
      try {
        setLoading(true);
        const data = await fetchLeadDetail(id);
        setLead(data);
        setEditInfo({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          job_title: data.job_title || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadLead();
  }, [id]);

  // Handlers
  const handleAddActivity = async () => {
    if (!activityForm.title.trim()) return;
    try {
      await addActivity(id, activityForm);
      const updated = await fetchLeadDetail(id);
      setLead(updated);
      setActivityForm({ type: 'note', title: '', description: '' });
      setShowActivityForm(false);
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  };

  const handleDeleteLead = async () => {
    try {
      await deleteLead(id);
      navigate('/crm/leads');
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateLead(id, { status: newStatus });
      const updated = await fetchLeadDetail(id);
      setLead(updated);
      setShowStatusDropdown(false);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveContactInfo = async () => {
    try {
      await updateLead(id, editInfo);
      const updated = await fetchLeadDetail(id);
      setLead(updated);
      setEditingInfo(false);
    } catch (err) {
      console.error('Failed to update contact info:', err);
    }
  };

  const handleAddTag = async (newTag) => {
    if (!newTag.trim()) return;
    const tags = [...(lead.tags || []), newTag.trim()];
    try {
      await updateLead(id, { tags });
      const updated = await fetchLeadDetail(id);
      setLead(updated);
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    const tags = (lead.tags || []).filter(t => t !== tagToRemove);
    try {
      await updateLead(id, { tags });
      const updated = await fetchLeadDetail(id);
      setLead(updated);
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const triggerQuickActivity = (type) => {
    setActivityForm({ ...activityForm, type });
    setShowActivityForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lead tidak ditemukan</h2>
          <p className="text-gray-600 mb-4">{error || 'Lead tidak ada atau sudah dihapus'}</p>
          <Link to="/crm/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Kembali ke daftar lead
          </Link>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(lead.status);
  const scoreCategory = getScoreCategory(lead.score || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/crm/leads"
              className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
            >
              ← Kembali
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50 p-2 rounded font-medium text-sm"
              >
                🗑️ Hapus
              </button>
              <Link
                to={`/crm/leads/${id}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm"
              >
                ✏️ Edit
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusMeta.badgeClass}`}
              >
                {lead.status}
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded shadow-lg z-20">
                  {Object.entries(LEAD_STATUSES).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm first:rounded-t last:rounded-b"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Lead?</h3>
            <p className="text-gray-600 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteLead}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - 65% */}
          <div className="col-span-2 space-y-8">
            {/* Activity Section */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Aktivitas
                </h2>
                <button
                  onClick={() => setShowActivityForm(!showActivityForm)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  ➕ Tambah Aktivitas
                </button>
              </div>

              {/* Add Activity Form */}
              {showActivityForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipe Aktivitas
                      </label>
                      <select
                        value={activityForm.type}
                        onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(ACTIVITY_TYPES).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Judul
                      </label>
                      <input
                        type="text"
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                        placeholder="Judul aktivitas..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deskripsi
                      </label>
                      <textarea
                        value={activityForm.description}
                        onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                        placeholder="Detail aktivitas..."
                        rows="3"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      ></textarea>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowActivityForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleAddActivity}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity List */}
              {lead.activities && lead.activities.length > 0 ? (
                <div className="space-y-4">
                  {lead.activities.map((activity, idx) => {
                    const icons = {
                      note: '📝',
                      email: '📧',
                      call: '📞',
                      meeting: '🤝',
                      sequence: '🔄',
                    };
                    const typeColors = {
                      note: 'border-l-4 border-gray-400',
                      email: 'border-l-4 border-blue-400',
                      call: 'border-l-4 border-green-400',
                      meeting: 'border-l-4 border-purple-400',
                      sequence: 'border-l-4 border-yellow-400',
                    };

                    return (
                      <div
                        key={idx}
                        className={`p-4 bg-gray-50 rounded ${typeColors[activity.type] || 'border-l-4 border-gray-400'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{icons[activity.type] || '•'}</span>
                              <h4 className="font-bold text-gray-900">{activity.title}</h4>
                            </div>
                            {activity.description && (
                              <p className="text-gray-600 text-sm ml-6">{activity.description}</p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                            {activity.created_at
                              ? new Date(activity.created_at).toLocaleDateString('id-ID')
                              : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-6">Belum ada aktivitas. Mulai dengan menambah aktivitas baru.</p>
              )}
            </div>

            {/* Sequences Section */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                📨 Sequence Email
              </h2>
              <div className="flex gap-3 items-center">
                <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Pilih sequence...</option>
                </select>
                <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Enroll
                </button>
              </div>
              {lead.sequences && lead.sequences.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  Sudah di-enroll di {lead.sequences.length} sequence
                </div>
              )}
            </div>
          </div>

          {/* Right Column - 35% */}
          <div className="col-span-1 space-y-6">
            {/* Lead Score Card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Lead Score</h3>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${scoreCategory.color}`}>
                  {lead.score || 0}
                </div>
                <p className="text-sm font-medium text-gray-700 mb-4">{scoreCategory.label}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${scoreCategory.barColor}`}
                    style={{ width: `${Math.min(lead.score || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600">Informasi Kontak</h3>
                <button
                  onClick={() => setEditingInfo(!editingInfo)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {editingInfo ? 'Batal' : 'Edit'}
                </button>
              </div>

              {editingInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama</label>
                    <input
                      type="text"
                      value={editInfo.name}
                      onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editInfo.email}
                      onChange={(e) => setEditInfo({ ...editInfo, email: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Telepon</label>
                    <input
                      type="tel"
                      value={editInfo.phone}
                      onChange={(e) => setEditInfo({ ...editInfo, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Perusahaan</label>
                    <input
                      type="text"
                      value={editInfo.company}
                      onChange={(e) => setEditInfo({ ...editInfo, company: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={editInfo.job_title}
                      onChange={(e) => setEditInfo({ ...editInfo, job_title: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setEditingInfo(false)}
                      className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveContactInfo}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{
                        backgroundColor: `hsl(${(lead.name?.charCodeAt(0) || 0) * 10}, 70%, 60%)`,
                      }}
                    >
                      {lead.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.job_title || 'Jabatan tidak ada'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {lead.email && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-gray-900">{lead.email}</p>
                      </div>
                    )}
                    {lead.phone && (
                      <div>
                        <p className="text-xs text-gray-500">Telepon</p>
                        <p className="text-gray-900">{lead.phone}</p>
                      </div>
                    )}
                    {lead.company && (
                      <div>
                        <p className="text-xs text-gray-500">Perusahaan</p>
                        <p className="text-gray-900">{lead.company}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Lead Details Card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Detail Lead</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusMeta.badgeClass}`}>
                    {lead.status}
                  </div>
                </div>

                {lead.source && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sumber</p>
                    <p className="text-gray-900">{formatLeadSource(lead.source)}</p>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Tag</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags && lead.tags.length > 0 ? (
                      lead.tags.map((tag) => (
                        <div
                          key={tag}
                          className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-gray-900 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-xs">Belum ada tag</p>
                    )}
                  </div>
                  <TagInput onAddTag={handleAddTag} />
                </div>

                {lead.created_at && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dibuat</p>
                    <p className="text-gray-900">{new Date(lead.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                )}

                {lead.last_activity_at && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Aktivitas Terakhir</p>
                    <p className="text-gray-900">{new Date(lead.last_activity_at).toLocaleDateString('id-ID')}</p>
                  </div>
                )}

                {lead.converted_at && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Converted</p>
                    <p className="text-green-600 font-medium">{new Date(lead.converted_at).toLocaleDateString('id-ID')}</p>
                  </div>
                )}

                {lead.lost_reason && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Alasan Kalah</p>
                    <p className="text-red-600">{lead.lost_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Aksi Cepat</h3>
              <div className="space-y-2">
                <button
                  onClick={() => triggerQuickActivity('email')}
                  className="w-full px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
                >
                  📧 Kirim Email
                </button>
                <button
                  onClick={() => triggerQuickActivity('call')}
                  className="w-full px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
                >
                  📞 Log Telepon
                </button>
                <button
                  onClick={() => triggerQuickActivity('meeting')}
                  className="w-full px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
                >
                  🤝 Log Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tag Input Component */
function TagInput({ onAddTag }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      onAddTag(input);
      setInput('');
    }
  };

  return (
    <div className="mt-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tambah tag..."
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
