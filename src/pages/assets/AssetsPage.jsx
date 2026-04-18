import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useBrand } from "../../hooks/useBrand";
import { uploadFile } from "../../services/storage";
import { resizeImage, RESIZE_PRESETS } from "../../utils/image-resize";
import { useToast } from "../../components/ui/Toast";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import EmptyState from "../../components/ui/EmptyState";
import BrandKitSection from "../../components/assets/BrandKitSection";

export default function AssetsPage() {
  const { user } = useAuth();
  const { activeBrand } = useBrand();
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showResizer, setShowResizer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("media");

  const loadAssets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (filter) query = query.contains("tags", [filter]);
    const { data } = await query;
    setAssets(data || []);
    setLoading(false);
  }, [user, filter]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { data: uploadData, error: uploadError } = await uploadFile(file);
        if (uploadError) {
          toast({ type: "error", title: "Error", message: uploadError });
          continue;
        }
        await supabase.from("assets").insert({
          user_id: user.id,
          brand_id: activeBrand?.id,
          filename: file.name,
          file_url: uploadData.url,
          file_type: file.type,
          file_size: file.size,
          tags: [],
          folder: "root",
        });
      }
      loadAssets();
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function handleResize(preset) {
    if (!selectedFile) return;
    try {
      const { w, h } = RESIZE_PRESETS[preset];
      const blob = await resizeImage(selectedFile, w, h);
      const file = new File([blob], `${preset}_${selectedFile.name}`, {
        type: "image/jpeg",
      });
      const { data: uploadData, error: uploadError } = await uploadFile(file);
      if (uploadError) {
        toast({ type: "error", title: "Error", message: uploadError });
        return;
      }
      await supabase.from("assets").insert({
        user_id: user.id,
        brand_id: activeBrand?.id,
        filename: file.name,
        file_url: uploadData.url,
        file_type: file.type,
        file_size: file.size,
        width: w,
        height: h,
        tags: [preset],
        folder: "resized",
      });
      loadAssets();
      setShowResizer(false);
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  }

  async function handleDelete(id) {
    await supabase
      .from("assets")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    loadAssets();
  }

  const tabs = [
    { key: "media", label: "Media Library" },
    { key: "brandkit", label: "Brand Kit" },
  ];

  return (
    <div>
      <TopBar
        title="Asset Manager"
        subtitle="Upload & organize media marketing"
        actions={
          activeTab === "media" ? (
            <div className="flex gap-2">
              <label className="btn-primary cursor-pointer inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium">
                {uploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/mp4"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResizer(true);
                  setSelectedFile(null);
                }}
              >
                Resize
              </Button>
            </div>
          ) : null
        }
      />

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "media" && (
        <>
          <Input
            placeholder="Filter by tag..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-4 max-w-xs"
          />

          {assets.length === 0 && !loading ? (
            <EmptyState
              icon="🖼️"
              title="Belum ada asset"
              description="Upload gambar atau video untuk mulai"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map((asset) => (
                <Card key={asset.id} className="p-2 group relative">
                  {asset.file_type?.startsWith("image") ? (
                    <img
                      src={asset.file_url}
                      alt={asset.filename}
                      className="w-full h-36 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      🎬
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-2 truncate">
                    {asset.filename}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(asset.file_size / 1024).toFixed(0)} KB
                  </p>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="absolute top-3 right-3 bg-white/80 hover:bg-danger-50 text-danger-500 rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </Card>
              ))}
            </div>
          )}

          <Modal
            open={showResizer}
            onClose={() => setShowResizer(false)}
            title="Image Resizer"
            size="lg"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih gambar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
              </div>
              {selectedFile && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(RESIZE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handleResize(key)}
                      className="p-3 border rounded-lg hover:border-primary-400 hover:bg-primary-50 text-left transition-colors"
                    >
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="text-xs text-gray-400">
                        {preset.w} x {preset.h}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        </>
      )}

      {activeTab === "brandkit" && <BrandKitSection />}
    </div>
  );
}
