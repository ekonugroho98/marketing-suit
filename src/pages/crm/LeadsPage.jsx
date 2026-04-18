import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCRM } from '../../hooks/useCRM';
import { LEAD_STATUSES, LEAD_SOURCES, getStatusMeta, getScoreCategory } from '../../services/crm';

export default function LeadsPage() {
  const navigate = useNavigate();
  const {
    leads,
    toggleSelect,
    toggleSelectAll,
    selected,
    bulkUpdate,
    applyFilters,
    fetchLeads,
    pagination,
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [columnMap, setColumnMap] = useState({
    name: 0,
    email: 1,
    phone: 2,
    company: 3,
    source: 4,
  });
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileInputRef = React.useRef(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const isFilterActive = searchTerm || statusFilter || sourceFilter;

  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSourceFilter('');
    applyFilters({ search: '', status: '', source: '' });
  };

  const handleApplyFilters = () => {
    applyFilters({
      search: searchTerm,
      status: statusFilter,
      source: sourceFilter,
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      setCsvData(text);
      const lines = text.split('\n').slice(0, 5);
      const preview = lines.map(line => line.split(','));
      setCsvPreview(preview);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    const lines = csvData.split('\n').filter(line => line.trim());
    const importedLeads = lines.map(line => {
      const cols = line.split(',');
      return {
        name: cols[columnMap.name]?.trim() || '',
        email: cols[columnMap.email]?.trim() || '',
        phone: cols[columnMap.phone]?.trim() || '',
        company: cols[columnMap.company]?.trim() || '',
        source: cols[columnMap.source]?.trim() || '',
      };
    });

    // Call import API (mock - replace with actual API call)
    console.log('Importing leads:', importedLeads);
    setShowImportModal(false);
    setCsvData('');
    setCsvPreview([]);
    fetchLeads();
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (!newStatus) return;
    await bulkUpdate({ status: newStatus });
    setBulkStatusUpdate('');
  };

  const handleBulkAddTag = async () => {
    if (!bulkTagInput.trim()) return;
    await bulkUpdate({ tag: bulkTagInput });
    setBulkTagInput('');
  };

  const handleBulkDelete = async () => {
    if (confirmDelete) {
      await bulkUpdate({ action: 'delete' });
      setConfirmDelete(false);
    }
  };

  const handleRowClick = (leadId, e) => {
    if (e.target.closest('input, button, [role="button"]')) {
      return;
    }
    navigate(`/crm/leads/${leadId}`);
  };

  const getInitial = (name) => {
    return (name || 'L')[0].toUpperCase();
  };

  const getStatusColor = (status) => {
    const statusMeta = getStatusMeta(status);
    return statusMeta?.color || 'bg-gray-100 text-gray-700';
  };

  const getScoreColor = (score) => {
    const category = getScoreCategory(score);
    const colorMap = {
      cold: 'bg-blue-100 text-blue-600',
      warm: 'bg-yellow-100 text-yellow-600',
      hot: 'bg-orange-100 text-orange-600',
      veryHot: 'bg-red-100 text-red-600',
    };
    return colorMap[category] || 'bg-gray-100 text-gray-700';
  };

  const getScoreBadgeText = (score) => {
    const category = getScoreCategory(score);
    const textMap = {
      cold: 'Cold',
      warm: 'Warm',
      hot: 'Hot',
      veryHot: '🔥',
    };
    return textMap[category] || '';
  };

  const formatRelativeTime = (date) => {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 30) return `${diffDays} hari lalu`;
    return past.toLocaleDateString('id-ID');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Semua Lead</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {leads.length}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImportClick}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors"
              >
                📥 Import CSV
              </button>
              <Link
                to="/crm/leads/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                ➕ Tambah Lead
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="text"
              placeholder="Cari nama, email, perusahaan..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 min-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Sumber</option>
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              Terapkan
            </button>
            {isFilterActive && (
              <button
                onClick={handleResetFilter}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex gap-3 flex-wrap items-center">
              <span className="text-sm font-medium text-gray-900">
                {selected.length} lead dipilih
              </span>
              <select
                value={bulkStatusUpdate}
                onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ubah Status</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama tag..."
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleBulkAddTag}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Tambah Tag
                </button>
              </div>
              <button
                onClick={() => setConfirmDelete(!confirmDelete)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  confirmDelete
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                {confirmDelete ? 'Yakin Hapus?' : 'Hapus'}
              </button>
              {confirmDelete && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Konfirmasi Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {leads.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-600 mb-6">Belum ada lead</p>
            <Link
              to="/crm/leads/new"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Tambah Lead Pertama
            </Link>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.length === leads.length && leads.length > 0}
                        onChange={() => toggleSelectAll()}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Perusahaan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Sumber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Aktivitas Terakhir
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={(e) => handleRowClick(lead.id, e)}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {getInitial(lead.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{lead.name}</p>
                            <p className="text-sm text-gray-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {lead.company || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(
                            lead.score
                          )}`}
                        >
                          {getScoreBadgeText(lead.score)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {lead.source || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatRelativeTime(lead.lastActivity)}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="relative group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="text-gray-400 hover:text-gray-600 p-2">
                            ⋯
                          </button>
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                            <Link
                              to={`/crm/leads/${lead.id}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Lihat Detail
                            </Link>
                            <Link
                              to={`/crm/leads/${lead.id}/edit`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() =>
                                bulkUpdate({ ids: [lead.id], action: 'delete' })
                              }
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Menampilkan {pagination.offset + 1}-
                {Math.min(pagination.offset + pagination.limit, pagination.total)}{' '}
                dari {pagination.total} lead
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLeads(Math.max(0, pagination.offset - pagination.limit))}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Sebelumnya
                </button>
                <button
                  onClick={() => fetchLeads(pagination.offset + pagination.limit)}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Import Lead dari CSV</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* CSV Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Preview Data (5 baris pertama)
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-gray-200">
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className="px-3 py-2 text-gray-700 max-w-xs truncate"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column Mapping */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Map Kolom CSV
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries({
                    name: 'Nama',
                    email: 'Email',
                    phone: 'Telepon',
                    company: 'Perusahaan',
                    source: 'Sumber',
                  }).map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                      <select
                        value={columnMap[field]}
                        onChange={(e) =>
                          setColumnMap({
                            ...columnMap,
                            [field]: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {csvPreview[0]?.map((_, idx) => (
                          <option key={idx} value={idx}>
                            Kolom {idx + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvData('');
                  setCsvPreview([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
