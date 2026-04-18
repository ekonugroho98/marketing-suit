/**
 * Testimonial Collector Service
 * Sprint 12 | Karaya Marketing Suite
 */
import { supabase, isConfigured } from "./supabase";

// Sanitize search input to prevent PostgREST filter injection
function sanitizeSearch(str) {
  return str
    .replace(/[,%()\\]/g, "")
    .trim()
    .substring(0, 100);
}

// ─── Constants ───────────────────────────────────────────────
export const TESTIMONIAL_STATUSES = [
  { value: "pending", label: "Menunggu", color: "yellow" },
  { value: "approved", label: "Disetujui", color: "green" },
  { value: "rejected", label: "Ditolak", color: "red" },
  { value: "archived", label: "Arsip", color: "gray" },
];

export const TESTIMONIAL_SOURCES = [
  { value: "form", label: "Form", icon: "📋" },
  { value: "manual", label: "Manual", icon: "✍️" },
  { value: "import", label: "Import", icon: "📥" },
  { value: "social", label: "Social", icon: "📱" },
  { value: "google", label: "Google", icon: "🔍" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
];

export const WIDGET_LAYOUTS = [
  { value: "grid", label: "Grid", icon: "⊞" },
  { value: "carousel", label: "Carousel", icon: "◁▷" },
  { value: "list", label: "List", icon: "≡" },
  { value: "masonry", label: "Masonry", icon: "⊟" },
  { value: "single", label: "Single", icon: "□" },
];

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_TESTIMONIALS = [
  {
    id: "t1",
    name: "Reza Firmansyah",
    email: "reza@agency.com",
    company: "Agency Kreatif",
    role: "Creative Director",
    content:
      "Karaya benar-benar mengubah cara kerja tim konten kami! Dulu kami butuh 2 jam untuk brainstorm ide, sekarang dalam 10 menit sudah dapat 20 variasi caption yang siap pakai. ROI-nya luar biasa.",
    rating: 5,
    status: "approved",
    source: "form",
    tags: ["produktivitas", "konten"],
    is_featured: true,
    display_order: 1,
    submitted_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "t2",
    name: "Siti Rahayu",
    email: "siti@umkm.id",
    company: "UMKM Batik Nusantara",
    role: "Owner",
    content:
      "Sebagai pemilik UMKM yang tidak paham marketing, Karaya sangat membantu. Saya bisa buat caption Instagram yang menarik tanpa perlu hire copywriter. Penjualan online naik 40% dalam sebulan!",
    rating: 5,
    status: "approved",
    source: "form",
    tags: ["umkm", "instagram"],
    is_featured: true,
    display_order: 2,
    submitted_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "t3",
    name: "Budi Santoso",
    email: "budi@startup.id",
    company: "Startup Fintech",
    role: "Head of Marketing",
    content:
      "Fitur A/B Testing dan Ads Manager sangat powerful. Kami bisa optimasi iklan lebih cepat dan hemat budget 30%. Tim kami sangat puas dengan hasilnya.",
    rating: 4,
    status: "approved",
    source: "manual",
    tags: ["ads", "ab-testing"],
    is_featured: false,
    display_order: 3,
    submitted_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "t4",
    name: "Dewi Lestari",
    email: "dewi@brand.co.id",
    company: "Brand Fashion Lokal",
    role: "Social Media Manager",
    content:
      "Auto-publisher yang bisa langsung posting ke semua platform sekaligus menghemat waktu saya berjam-jam per minggu. Sangat direkomendasikan untuk content creator!",
    rating: 5,
    status: "pending",
    source: "form",
    tags: ["social-media", "automation"],
    is_featured: false,
    submitted_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "t5",
    name: "Ahmad Wijaya",
    email: "ahmad@konsultan.com",
    company: "Konsultan Digital",
    role: "Digital Strategist",
    content:
      "Tool CRM dan segmentasi lead-nya sangat lengkap. Bisa nurture lead secara otomatis dengan email sequence. Worth every penny!",
    rating: 4,
    status: "pending",
    source: "google",
    tags: ["crm", "lead-management"],
    is_featured: false,
    submitted_at: new Date(Date.now() - 0.5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "t6",
    name: "Nina Kusuma",
    email: "nina@korporat.id",
    company: "Perusahaan Multinasional",
    role: "Brand Manager",
    content:
      "Interfacenya kurang intuitif untuk penggunaan korporat. Butuh lebih banyak fitur approval workflow.",
    rating: 2,
    status: "rejected",
    source: "form",
    tags: [],
    is_featured: false,
    submitted_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    rejected_at: new Date(Date.now() - 19 * 24 * 3600 * 1000).toISOString(),
    reject_reason:
      "Testimoni kurang representatif / feedback negatif belum resolved",
  },
];

const DEMO_FORMS = [
  {
    id: "f1",
    name: "Form Utama",
    description: "Form koleksi testimoni standar untuk semua produk",
    primary_color: "#6366f1",
    ask_rating: true,
    ask_company: true,
    ask_role: true,
    ask_media: false,
    headline: "Bagikan Pengalamanmu! 🌟",
    subheadline: "Testimoni kamu sangat berarti bagi perkembangan Karaya.",
    cta_text: "Kirim Testimoni",
    success_message: "Terima kasih! Kami akan segera review testimoni kamu.",
    auto_approve: false,
    is_active: true,
    views: 245,
    submissions: 18,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "f2",
    name: "Form Post-Purchase",
    description: "Dikirim otomatis setelah pembelian",
    primary_color: "#10b981",
    ask_rating: true,
    ask_company: false,
    ask_role: false,
    ask_media: true,
    headline: "Gimana pengalaman kamu? 😊",
    subheadline: "Ceritakan pengalaman kamu menggunakan produk kami.",
    cta_text: "Kirim Review",
    success_message: "Makasih banyak! Kamu sudah membantu kami berkembang.",
    auto_approve: true,
    is_active: true,
    views: 89,
    submissions: 12,
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
];

const DEMO_WIDGETS = [
  {
    id: "w1",
    name: "Widget Halaman Utama",
    layout: "grid",
    theme: "light",
    primary_color: "#6366f1",
    show_avatar: true,
    show_rating: true,
    show_company: true,
    show_date: false,
    filter_rating: 4,
    show_featured_only: false,
    max_items: 6,
    card_shadow: true,
    embed_key: "karaya-widget-main-2024",
    total_views: 1234,
    is_active: true,
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
  },
];

// ─── TESTIMONIALS ─────────────────────────────────────────────
export async function getTestimonials({
  status,
  source,
  rating,
  tag,
  search,
  featured,
  page = 1,
  perPage = 20,
} = {}) {
  if (!isConfigured) {
    let list = [...DEMO_TESTIMONIALS];
    if (status) list = list.filter((t) => t.status === status);
    if (source) list = list.filter((t) => t.source === source);
    if (rating) list = list.filter((t) => t.rating >= Number(rating));
    if (tag) list = list.filter((t) => t.tags?.includes(tag));
    if (featured) list = list.filter((t) => t.is_featured);
    if (search)
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.content.toLowerCase().includes(search.toLowerCase()) ||
          t.company?.toLowerCase().includes(search.toLowerCase()),
      );
    const total = list.length;
    return {
      data: list.slice((page - 1) * perPage, page * perPage),
      total,
      page,
      perPage,
      error: null,
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let query = supabase
    .from("testimonials")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source);
  if (rating) query = query.gte("rating", rating);
  if (tag) query = query.contains("tags", [tag]);
  if (featured) query = query.eq("is_featured", true);
  if (search) {
    const safe = sanitizeSearch(search);
    if (safe)
      query = query.or(
        `name.ilike.%${safe}%,content.ilike.%${safe}%,company.ilike.%${safe}%`,
      );
  }
  const { data, error, count } = await query;
  return { data: data || [], total: count || 0, page, perPage, error };
}

export async function getTestimonialOverview() {
  if (!isConfigured) {
    const t = DEMO_TESTIMONIALS;
    return {
      data: {
        total: t.length,
        pending: t.filter((x) => x.status === "pending").length,
        approved: t.filter((x) => x.status === "approved").length,
        rejected: t.filter((x) => x.status === "rejected").length,
        featured: t.filter((x) => x.is_featured).length,
        avg_rating: (
          t.filter((x) => x.rating).reduce((s, x) => s + x.rating, 0) /
          t.filter((x) => x.rating).length
        ).toFixed(1),
        five_star: t.filter((x) => x.rating === 5).length,
        with_media: t.filter((x) => x.media_url).length,
      },
      error: null,
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc("get_testimonials_overview", {
    p_user_id: user.id,
  });
  return { data, error };
}

export async function createTestimonial(payload) {
  if (!isConfigured) {
    const t = {
      id: `t${Date.now()}`,
      ...payload,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    DEMO_TESTIMONIALS.unshift(t);
    return { data: t, error: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("testimonials")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  return { data, error };
}

export async function updateTestimonial(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_TESTIMONIALS.findIndex((t) => t.id === id);
    if (idx >= 0) Object.assign(DEMO_TESTIMONIALS[idx], updates);
    return { data: DEMO_TESTIMONIALS[idx], error: null };
  }
  const { data, error } = await supabase
    .from("testimonials")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function approveTestimonial(id) {
  return updateTestimonial(id, {
    status: "approved",
    approved_at: new Date().toISOString(),
  });
}

export async function rejectTestimonial(id, reason) {
  return updateTestimonial(id, {
    status: "rejected",
    reject_reason: reason,
    rejected_at: new Date().toISOString(),
  });
}

export async function toggleFeatured(id, isFeatured) {
  return updateTestimonial(id, { is_featured: isFeatured });
}

export async function deleteTestimonial(id) {
  if (!isConfigured) {
    const idx = DEMO_TESTIMONIALS.findIndex((t) => t.id === id);
    if (idx >= 0) DEMO_TESTIMONIALS.splice(idx, 1);
    return { error: null };
  }
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  return { error };
}

export async function bulkApprove(ids) {
  if (!isConfigured) {
    ids.forEach((id) => {
      const idx = DEMO_TESTIMONIALS.findIndex((t) => t.id === id);
      if (idx >= 0)
        Object.assign(DEMO_TESTIMONIALS[idx], {
          status: "approved",
          approved_at: new Date().toISOString(),
        });
    });
    return { error: null };
  }
  const { error } = await supabase
    .from("testimonials")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .in("id", ids);
  return { error };
}

// ─── FORMS ────────────────────────────────────────────────────
export async function getForms() {
  if (!isConfigured) return { data: DEMO_FORMS, error: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("testimonial_forms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function createForm(payload) {
  if (!isConfigured) {
    const f = {
      id: `f${Date.now()}`,
      ...payload,
      views: 0,
      submissions: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    DEMO_FORMS.unshift(f);
    return { data: f, error: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("testimonial_forms")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  return { data, error };
}

export async function updateForm(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_FORMS.findIndex((f) => f.id === id);
    if (idx >= 0) Object.assign(DEMO_FORMS[idx], updates);
    return { data: DEMO_FORMS[idx], error: null };
  }
  const { data, error } = await supabase
    .from("testimonial_forms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteForm(id) {
  if (!isConfigured) {
    const idx = DEMO_FORMS.findIndex((f) => f.id === id);
    if (idx >= 0) DEMO_FORMS.splice(idx, 1);
    return { error: null };
  }
  const { error } = await supabase
    .from("testimonial_forms")
    .delete()
    .eq("id", id);
  return { error };
}

export function getFormEmbedUrl(formId) {
  return `${window.location.origin}/t/${formId}`;
}

// ─── WIDGETS ──────────────────────────────────────────────────
export async function getWidgets() {
  if (!isConfigured) return { data: DEMO_WIDGETS, error: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("testimonial_widgets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function createWidget(payload) {
  if (!isConfigured) {
    const w = {
      id: `w${Date.now()}`,
      ...payload,
      total_views: 0,
      is_active: true,
      embed_key: `karaya-widget-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    DEMO_WIDGETS.unshift(w);
    return { data: w, error: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("testimonial_widgets")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  return { data, error };
}

export async function updateWidget(id, updates) {
  if (!isConfigured) {
    const idx = DEMO_WIDGETS.findIndex((w) => w.id === id);
    if (idx >= 0) Object.assign(DEMO_WIDGETS[idx], updates);
    return { data: DEMO_WIDGETS[idx], error: null };
  }
  const { data, error } = await supabase
    .from("testimonial_widgets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteWidget(id) {
  if (!isConfigured) {
    const idx = DEMO_WIDGETS.findIndex((w) => w.id === id);
    if (idx >= 0) DEMO_WIDGETS.splice(idx, 1);
    return { error: null };
  }
  const { error } = await supabase
    .from("testimonial_widgets")
    .delete()
    .eq("id", id);
  return { error };
}

export function getWidgetEmbedCode(widget) {
  return `<!-- Karaya Testimonial Widget -->
<div id="karaya-widget-${widget.embed_key}"></div>
<script src="${window.location.origin}/widget.js"
  data-key="${widget.embed_key}"
  data-layout="${widget.layout}"
  data-theme="${widget.theme}"
  async>
</script>`;
}

// ─── HELPERS ─────────────────────────────────────────────────
export function renderStars(rating, size = "sm") {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function getStatusMeta(status) {
  return (
    TESTIMONIAL_STATUSES.find((s) => s.value === status) ||
    TESTIMONIAL_STATUSES[0]
  );
}

export function getSourceMeta(source) {
  return (
    TESTIMONIAL_SOURCES.find((s) => s.value === source) || {
      label: source,
      icon: "📝",
    }
  );
}

export function avatarInitials(name) {
  return (
    name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function avatarColor(name) {
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-red-500",
    "bg-indigo-500",
  ];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
}
