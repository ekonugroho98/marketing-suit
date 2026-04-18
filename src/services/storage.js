import { supabase, isConfigured } from "./supabase";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
];

export async function uploadFile(file, folder = "assets") {
  try {
    if (file.size > MAX_FILE_SIZE) {
      return { data: null, error: "File terlalu besar. Maksimal 10MB." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { data: null, error: "Tipe file tidak didukung." };
    }

    if (!isConfigured) {
      return {
        data: {
          url: "https://demo.example.com/assets/demo-file.jpg",
          path: "demo/file.jpg",
        },
        error: null,
      };
    }

    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("media")
      .upload(fileName, file, { contentType: file.type });

    if (error) {
      return { data: null, error: error.message || "Upload gagal" };
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(data.path);

    return { data: { path: data.path, url: urlData.publicUrl }, error: null };
  } catch (err) {
    return { data: null, error: err.message || "Unknown error" };
  }
}

export async function deleteFile(path) {
  try {
    if (!isConfigured) {
      return { data: { success: true }, error: null };
    }

    const { error } = await supabase.storage.from("media").remove([path]);

    if (error) {
      return { data: null, error: error.message || "Delete gagal" };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err.message || "Unknown error" };
  }
}
