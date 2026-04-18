import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isConfigured } from "../services/supabase";
import { useAuth } from "./useAuth";
import { useBrand } from "./useBrand";

// ── Demo products with rich data for AI content generation ────────

const DEMO_PRODUCTS = [
  {
    id: "demo-product-1",
    brand_id: "demo-brand",
    user_id: "demo-user",
    name: "Copywriting Mastery: Framework Caption Viral",
    description:
      "Ebook panduan lengkap bikin caption yang converting untuk jualan digital product",
    price: 149000,
    original_price: 299000,
    discount_label: "Early Bird 50% OFF",
    currency: "IDR",
    link: "https://link.karaya.id/copywriting-mastery",
    usp: "Framework proven yang sudah dipakai 2.847 creator dengan rata-rata engagement naik 3x",
    features: [
      "10 Hook Formula",
      "50 Template Caption",
      "Swipe File 100 Iklan Viral",
      "Bonus Grup Telegram",
    ],
    images: [],
    product_type: "digital_ebook",
    target_buyer:
      "Content creator & seller digital product yang punya 1-10K followers, struggle bikin caption yang converting, capek bikin konten 2 jam tapi hasilnya mediocre",
    transformation:
      "SEBELUM: Bikin caption 2 jam, copy-paste template orang, engagement rendah, jarang ada yang beli. SESUDAH: 15 menit bikin caption original pakai framework, engagement naik 3x, closing rate naik dari konten organik.",
    outline:
      "Bab 1: Anatomi Caption Viral (Hook, Body, CTA)\nBab 2: 10 Hook Formula yang Proven\nBab 3: Storytelling Framework untuk Jualan\nBab 4: CTA yang Bikin Orang Klik\nBab 5: Platform-Specific Strategy (IG, Threads, TikTok)\nBONUS:\n\u2192 50 Template Caption Siap Pakai\n\u2192 Swipe File 100 Iklan Viral\n\u2192 Akses Grup Telegram Copywriting\n\u2192 Update Lifetime",
    social_proof:
      '\u2b50 4.9/5 dari 847 review\n\u2192 "Omzet naik 3x dalam sebulan pertama" \u2014 @creativesarah\n\u2192 "Akhirnya ngerti cara bikin hook yang bikin orang berhenti scroll" \u2014 @bisnisdigital_id\n\u2192 2.847 creator sudah pakai\n\u2192 127 testimoni verified di Google Review',
    competitors:
      "vs Copywriting Course A (Rp 2.5 juta, 12 jam video, English)\nvs Template Pack B (Rp 99K, cuma template tanpa framework)\nvs Karaya Ebook (Rp 149K sekali bayar, Bahasa Indonesia, framework + template + community, lifetime update)",
    bonus_offers:
      "\ud83c\udf81 BONUS (total value Rp 500K+):\n1. Template Canva 50 desain carousel \u2014 Rp 150K\n2. Grup Telegram Copywriting Exclusive \u2014 Rp 200K/tahun\n3. Swipe File 100 Iklan Viral \u2014 Rp 99K\n4. Update Lifetime \u2014 Priceless\n5. 30 Hari Garansi Uang Kembali",
    objections:
      "Q: Kenapa harus beli ini kalau bisa belajar gratis di YouTube?\nA: YouTube kasih teori. Ini kasih framework + 50 template yang tinggal pakai + community yang bantu review caption lu.\n\nQ: Gue bukan content creator, cocok gak?\nA: Justru. Framework ini dirancang untuk seller yang pengen jualan lewat konten, bukan content creator.\nQ: Kalau gak cocok?\nA: 30 hari garansi uang kembali. No questions asked.",
    is_active: true,
    created_at: "2025-01-15T08:00:00Z",
    updated_at: "2025-01-15T08:00:00Z",
  },
  {
    id: "demo-product-2",
    brand_id: "demo-brand",
    user_id: "demo-user",
    name: "Karaya Masterclass: Digital Marketing 0 to Hero",
    description:
      "Video course lengkap digital marketing dari nol sampai profitable",
    price: 499000,
    original_price: 999000,
    discount_label: "Promo Launching",
    currency: "IDR",
    link: "https://link.karaya.id/masterclass-digimar",
    usp: "Satu-satunya course digital marketing Bahasa Indonesia yang ngajarin dari nol sampai bisa jalanin ads profitable sendiri, dengan studi kasus UMKM lokal",
    features: [
      "12 Modul Video HD",
      "Studi Kasus UMKM Lokal",
      "Template Ads Siap Pakai",
      "Grup Mentoring Bulanan",
      "Sertifikat Completion",
    ],
    images: [],
    product_type: "digital_course",
    target_buyer:
      "Pemilik UMKM & freelancer yang mau mulai jualan online tapi bingung cara marketing digital yang efektif, belum pernah ngiklan, budget marketing terbatas",
    transformation:
      "SEBELUM: Jualan offline aja, gak ngerti IG ads, cuma posting produk tanpa strategi, buang duit di ads tapi gak ada hasil. SESUDAH: Punya funel marketing lengkap, bisa jalanin ads profitable, content strategy yang konsisten, ROAS minimal 3x.",
    outline:
      "Modul 1: Mindset & Fondasi Digital Marketing\nModul 2: Riset Pasar & Customer Avatar\nModul 3: Branding & Positioning\nModul 4: Content Strategy & Pilar\nModul 5: Instagram Marketing Deep Dive\nModul 6: TikTok & Short-Form Video\nModul 7: Facebook & Instagram Ads Dasar\nModul 8: Ads Optimization & Scaling\nModul 9: Landing Page & Funnel\nModul 10: Email Marketing & CRM\nModul 11: Analytics & KPI Tracking\nModul 12: Action Plan 30 Hari\n\nBONUS:\n\u2192 Template Campaign Planner\n\u2192 Kalkulator Budget Ads\n\u2192 Swipe File Landing Page\n\u2192 Grup Mentoring Bulanan",
    social_proof:
      '\u2b50 4.8/5 dari 423 alumni\n\u2192 "Dari gak ngerti apa-apa, sekarang ROAS konsisten 5x" \u2014 @tokobunda_id\n\u2192 "Course ini worth it banget, studi kasusnya relevan buat UMKM Indo" \u2014 @pakbranding\n\u2192 1.256 alumni sudah lulus\n\u2192 89% alumni report peningkatan omzet dalam 60 hari',
    competitors:
      "vs Bootcamp X (Rp 5 juta, 3 bulan, terlalu advanced)\nvs Course Y (Rp 1.2 juta, English, gak ada studi kasus lokal)\nvs Karaya Masterclass (Rp 499K, Bahasa Indonesia, lifetime access, studi kasus UMKM, mentoring bulanan)",
    bonus_offers:
      "\ud83c\udf81 BONUS (total value Rp 1.5 juta+):\n1. Template Campaign Planner \u2014 Rp 200K\n2. Kalkulator Budget Ads (Google Sheet) \u2014 Rp 150K\n3. Swipe File 20 Landing Page High-Converting \u2014 Rp 300K\n4. Grup Mentoring Bulanan (3 bulan) \u2014 Rp 750K\n5. Sertifikat Digital Completion\n6. Lifetime Access + Update",
    objections:
      "Q: Gue bener-bener dari nol, bisa ngikutin gak?\nA: Justru course ini dirancang dari NOL. Modul 1-3 khusus fondasi, gak perlu pengalaman sebelumnya.\n\nQ: Bedanya sama YouTube gratis?\nA: Struktur step-by-step, studi kasus lokal, template siap pakai, dan ada mentoring. Di YouTube lu harus nyari sendiri dan sering outdated.\n\nQ: Berapa lama sampai lihat hasil?\nA: 89% alumni report peningkatan omzet dalam 60 hari. Tapi tergantung eksekusi juga.\n\nQ: Ada garansi?\nA: 14 hari money-back guarantee kalau udah nonton sampai Modul 3 tapi merasa gak cocok.",
    is_active: true,
    created_at: "2025-01-20T10:00:00Z",
    updated_at: "2025-01-20T10:00:00Z",
  },
];

// ── localStorage helpers for demo persistence ────────────────────────

const DEMO_STORAGE_KEY = "karaya_demo_products";

function getDemoProducts() {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors, fall through to defaults
  }
  // Initialize with defaults
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEMO_PRODUCTS));
  return DEMO_PRODUCTS;
}

function saveDemoProducts(products) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(products));
}

// ── Supabase fetch helper ────────────────────────────────

async function fetchProductsFromSupabase(userId, brandId) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Hook ────────────────────────────────

export function useProducts() {
  const { user } = useAuth();
  const { activeBrand } = useBrand();
  const queryClient = useQueryClient();

  const brandId = activeBrand?.id;
  const userId = user?.id;

  // ── Query: fetch all products for the active brand ────────────────
  const {
    data: products = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["products", userId, brandId],
    queryFn: async () => {
      if (!isConfigured) {
        const all = getDemoProducts();
        return all.filter((p) => p.brand_id === brandId);
      }
      return fetchProductsFromSupabase(userId, brandId);
    },
    enabled: !!userId && !!brandId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ── Get single product by id ────────────────────────────────
  function getProduct(id) {
    return products.find((p) => p.id === id) || null;
  }

  // ── Create ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (productData) => {
      if (!isConfigured) {
        const now = new Date().toISOString();
        const newProduct = {
          id: crypto.randomUUID(),
          brand_id: brandId,
          user_id: userId,
          currency: "IDR",
          features: [],
          images: [],
          is_active: true,
          product_type: "digital_ebook",
          target_buyer: null,
          transformation: null,
          outline: null,
          social_proof: null,
          competitors: null,
          bonus_offers: null,
          objections: null,
          original_price: null,
          discount_label: null,
          created_at: now,
          updated_at: now,
          ...productData,
          // Enforce ownership — always overwrite these after spread
          brand_id: brandId,
          user_id: userId,
        };
        const all = getDemoProducts();
        const updated = [newProduct, ...all];
        saveDemoProducts(updated);
        return newProduct;
      }

      const { data, error } = await supabase
        .from("products")
        .insert({
          ...productData,
          user_id: userId,
          brand_id: brandId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newProduct) => {
      queryClient.setQueryData(["products", userId, brandId], (old = []) => [
        newProduct,
        ...old,
      ]);
    },
  });

  // ── Update ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured) {
        const all = getDemoProducts();
        const now = new Date().toISOString();
        const idx = all.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error("Product not found");
        all[idx] = { ...all[idx], ...updates, updated_at: now };
        saveDemoProducts(all);
        return all[idx];
      }

      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(["products", userId, brandId], (old = []) =>
        old.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
      );
    },
  });

  // ── Delete ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!isConfigured) {
        const all = getDemoProducts();
        const filtered = all.filter((p) => p.id !== id);
        saveDemoProducts(filtered);
        return id;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["products", userId, brandId], (old = []) =>
        old.filter((p) => p.id !== deletedId),
      );
    },
  });

  // ── Wrapper functions for a clean API surface ────────────────────

  async function createProduct(productData) {
    return createMutation.mutateAsync(productData);
  }

  async function updateProduct(id, updates) {
    return updateMutation.mutateAsync({ id, updates });
  }

  async function deleteProduct(id) {
    return deleteMutation.mutateAsync(id);
  }

  return {
    products,
    loading,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch,
  };
}
