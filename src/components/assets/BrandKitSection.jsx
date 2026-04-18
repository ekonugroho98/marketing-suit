import { useEffect, useState } from "react";
import { useBrand } from "../../hooks/useBrand";
import { uploadFile } from "../../services/storage";
import { useToast } from "../ui/Toast";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import EmptyState from "../ui/EmptyState";

export default function BrandKitSection() {
  const { activeBrand, updateBrand } = useBrand();
  const { toast } = useToast();
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(
    activeBrand?.primary_color || "#000000",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    activeBrand?.secondary_color || "#000000",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeBrand) {
      setPrimaryColor(activeBrand.primary_color || "#000000");
      setSecondaryColor(activeBrand.secondary_color || "#000000");
    }
  }, [activeBrand]);

  async function handleSaveColors() {
    if (!activeBrand) return;
    setSaving(true);
    try {
      await updateBrand(activeBrand.id, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      });
      setShowColorEditor(false);
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;
    const { data, error } = await uploadFile(file);
    if (error) {
      toast({ type: "error", title: "Error", message: error });
      return;
    }
    await updateBrand(activeBrand.id, { logo_url: data.url });
  }

  if (!activeBrand) {
    return (
      <EmptyState
        icon="🏷️"
        title="Belum ada brand"
        description="Buat brand terlebih dahulu di halaman onboarding"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Logo Brand
        </h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
            {activeBrand.logo_url ? (
              <img
                src={activeBrand.logo_url}
                alt={activeBrand.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-3xl text-gray-300">🏷️</span>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {activeBrand.logo_url
                ? "Ganti logo brand kamu"
                : "Upload logo brand kamu"}
            </p>
            <label className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
              {activeBrand.logo_url ? "Ganti Logo" : "Upload Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Warna Brand */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Warna Brand</h3>
          <Button variant="secondary" onClick={() => setShowColorEditor(true)}>
            Edit Warna
          </Button>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border border-gray-200 shadow-sm"
              style={{
                backgroundColor: activeBrand.primary_color || "#000000",
              }}
            />
            <div>
              <p className="text-xs text-gray-500">Warna Utama</p>
              <p className="text-sm font-mono font-medium">
                {activeBrand.primary_color || "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border border-gray-200 shadow-sm"
              style={{
                backgroundColor: activeBrand.secondary_color || "#000000",
              }}
            />
            <div>
              <p className="text-xs text-gray-500">Warna Sekunder</p>
              <p className="text-sm font-mono font-medium">
                {activeBrand.secondary_color || "-"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Brand Voice */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Brand Voice
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Tone</p>
            <div className="flex flex-wrap gap-2">
              {activeBrand.tone?.length > 0 ? (
                activeBrand.tone.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-50 text-primary-700 font-medium"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Belum diatur</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Kata Favorit</p>
            <div className="flex flex-wrap gap-2">
              {activeBrand.favorite_words?.length > 0 ? (
                activeBrand.favorite_words.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success-50 text-success-700"
                  >
                    {w}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Belum diatur</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Kata yang Dihindari</p>
            <div className="flex flex-wrap gap-2">
              {activeBrand.avoided_words?.length > 0 ? (
                activeBrand.avoided_words.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-danger-50 text-danger-700"
                  >
                    {w}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Belum diatur</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Edit Warna */}
      <Modal
        open={showColorEditor}
        onClose={() => setShowColorEditor(false)}
        title="Edit Warna Brand"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warna Utama
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border border-gray-200"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warna Sekunder
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border border-gray-200"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <p className="text-sm text-gray-500">Preview:</p>
            <div
              className="w-10 h-10 rounded-lg border"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="w-10 h-10 rounded-lg border"
              style={{ backgroundColor: secondaryColor }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowColorEditor(false)}
            >
              Batal
            </Button>
            <Button onClick={handleSaveColors} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
