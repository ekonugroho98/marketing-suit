function brandContext(brand) {
  if (!brand) return "";
  return `
BRAND VOICE:
- Nama Brand: ${brand.name}
- Niche: ${brand.niche || "-"}
- Target Audience: ${brand.target_audience || "-"}
- Tone: ${(brand.tone || []).join(", ")}
- Kata Favorit: ${(brand.favorite_words || []).join(", ")}
- Kata yang Dihindari: ${(brand.avoided_words || []).join(", ")}
`.trim();
}

function productContext(product) {
  if (!product) return "";
  let context = `
PRODUK:
- Nama: ${product.name}
- Tipe: ${product.product_type || "digital"}
- Deskripsi: ${product.description || "-"}
- Harga: Rp ${(product.price || 0).toLocaleString("id-ID")}${product.original_price ? ` (dari Rp ${product.original_price.toLocaleString("id-ID")})` : ""}${product.discount_label ? ` — ${product.discount_label}` : ""}
- Link: ${product.link || "-"}
- USP: ${product.usp || "-"}
- Fitur: ${(product.features || []).join(", ")}
`.trim();

  if (product.target_buyer) {
    context += `\n\nTARGET BUYER:\n${product.target_buyer}`;
  }
  if (product.transformation) {
    context += `\n\nTRANSFORMASI (Before → After):\n${product.transformation}`;
  }
  if (product.outline) {
    context += `\n\nISI PRODUK:\n${product.outline}`;
  }
  if (product.social_proof) {
    context += `\n\nSOCIAL PROOF:\n${product.social_proof}`;
  }
  if (product.competitors) {
    context += `\n\nPERBANDINGAN KOMPETITOR:\n${product.competitors}`;
  }
  if (product.bonus_offers) {
    context += `\n\nBONUS & OFFER:\n${product.bonus_offers}`;
  }
  if (product.objections) {
    context += `\n\nFAQ / OBJECTION HANDLING:\n${product.objections}`;
  }
  return context;
}

const PILLAR_DESC = {
  awareness:
    "Awareness — konten untuk menarik perhatian dan menjangkau audience baru",
  showcase: "Showcase — konten untuk memamerkan produk, fitur, dan hasil kerja",
  education: "Education — konten edukatif, tips, dan tutorial untuk audience",
  social_proof:
    "Social Proof — testimoni, review, dan bukti nyata dari customer",
};

const WRITING_STYLE_RULES = `
ATURAN PENULISAN WAJIB:
- Bahasa Indonesia informal, campur istilah English yang umum di kalangan anak muda/creator
- Gunakan "lu/gue" atau "kamu/aku" sesuai brand voice, BUKAN "Anda"
- Angka harus SPESIFIK dan konkret (bukan "banyak", tapi "1.7 juta" atau "32 halaman" atau "14.400 request/hari")
- Emoji strategis di akhir kalimat penting, JANGAN berlebihan (max 1-2 per paragraf)
- Bullet points pakai simbol bervariasi: → ✅ • ❌ 📊 🎯 bukan cuma dash
- Setiap paragraf/tweet punya 1 FOKUS utama, jangan campur terlalu banyak ide
- Hook pembuka harus scroll-stopping: angka mengejutkan, statement kontroversial, atau cerita personal
- CTA di akhir harus ada: perbandingan harga kompetitor vs produk, lalu ajakan aksi ("link di bio", "RT biar temen lu juga tau")
- JANGAN pakai kata-kata generic: "terbaik", "luar biasa", "sangat bagus" — ganti dengan bukti spesifik
- Kalimat pendek. Satu baris = satu ide. Banyak whitespace/jeda.
`;

export const PROMPTS = {
  caption({
    platform,
    pillar,
    brand,
    product,
    angle,
    tone,
    includeHashtags,
    includeCTA,
    additionalContext,
  }) {
    const systemPrompt = `Kamu adalah copywriter Indonesia yang ahli membuat caption media sosial viral.
${WRITING_STYLE_RULES}
${brandContext(brand)}

Output JSON format:
{
  "variations": [
    { "style": "provokatif", "caption": "...", "hashtags": ["..."], "cta": "..." },
    { "style": "storytelling", "caption": "...", "hashtags": ["..."], "cta": "..." },
    { "style": "value bomb", "caption": "...", "hashtags": ["..."], "cta": "..." }
  ]
}`;

    const userPrompt = `Buatkan 3 variasi caption untuk platform ${platform}.
Pilar konten: ${PILLAR_DESC[pillar] || pillar}
${productContext(product)}
${angle ? `Angle/Hook: ${angle}` : ""}
${tone ? `Tone tambahan: ${tone}` : ""}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}
${includeHashtags ? "Sertakan hashtag relevan (5-10)." : "Tanpa hashtag."}
${includeCTA ? "Sertakan CTA yang kuat dengan link produk kalau ada." : ""}

Variasi 1: Provokatif — buka dengan statement kontroversial atau angka mengejutkan
Variasi 2: Storytelling — cerita personal singkat yang relatable
Variasi 3: Value bomb — langsung kasih insight/tips actionable

Caption harus scroll-stopping. Kalimat pendek-pendek. Banyak jeda baris.`;

    return { systemPrompt, userPrompt };
  },

  carousel({
    platform,
    brand,
    product,
    topic,
    slideCount,
    angle,
    additionalContext,
  }) {
    const systemPrompt = `Kamu adalah content strategist Indonesia yang ahli membuat script carousel viral.
${WRITING_STYLE_RULES}
${brandContext(brand)}

Output JSON format:
{
  "variations": [
    {
      "title": "...",
      "style": "edukatif|storytelling|listicle",
      "slides": [
        { "slide": 1, "type": "cover", "headline": "...", "subtext": "..." },
        { "slide": 2, "type": "content", "headline": "...", "body": "..." },
        ...
        { "slide": N, "type": "cta", "headline": "...", "cta": "..." }
      ],
      "caption": "...",
      "hashtags": ["..."]
    }
  ]
}`;

    const userPrompt = `Buatkan 3 variasi script carousel ${slideCount || 7} slide untuk ${platform}.
${productContext(product)}
${topic ? `Topik: ${topic}` : ""}
${angle ? `Angle: ${angle}` : ""}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}

Variasi 1: Edukatif — step-by-step tips, setiap slide 1 poin utama
Variasi 2: Storytelling — cover = problem yang relatable, body = journey, CTA = solusi
Variasi 3: Listicle — punchy list items, headline bold, body singkat

ATURAN SLIDE:
- Cover (slide 1): headline yang bikin orang swipe, pakai angka atau pertanyaan provokatif
- Content: 1 poin per slide, headline bold + body max 2 kalimat
- CTA (slide terakhir): perbandingan atau ringkasan + ajakan aksi${product?.link ? ` + link: ${product.link}` : ""}
- Caption harus engaging dan memperkuat carousel, bukan cuma deskripsi`;

    return { systemPrompt, userPrompt };
  },

  ad_copy({ platform, brand, product, objective, angle, additionalContext }) {
    const systemPrompt = `Kamu adalah performance marketer Indonesia yang ahli membuat ad copy high-converting.
${WRITING_STYLE_RULES}
${brandContext(brand)}

Output JSON format:
{
  "variations": [
    {
      "style": "pain point attack|social proof|FOMO",
      "headline": "...",
      "primary_text": "...",
      "description": "...",
      "cta_button": "...",
      "hook": "..."
    }
  ]
}`;

    const userPrompt = `Buatkan 3 variasi ad copy untuk ${platform} ads.
Objective: ${objective || "conversion"}
${productContext(product)}
${angle ? `Angle: ${angle}` : ""}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}

Variasi 1: Pain point attack — buka dengan masalah yang bikin audience merasa "ini gue banget", lalu kasih solusi
Variasi 2: Social proof — pakai angka user/testimoni/hasil nyata sebagai hook
Variasi 3: FOMO/urgency — scarcity atau limited-time angle

ATURAN:
- Hook harus bikin orang berhenti scroll dalam 1 kalimat pertama
- Pakai angka spesifik (bukan "banyak orang", tapi "2.847 creator sudah pakai")
- CTA jelas dan satu arah (1 tindakan, bukan pilihan)
- Primary text: kalimat pendek, banyak jeda baris, bullet points${product?.link ? `\n- Sertakan link produk: ${product.link}` : ""}`;

    return { systemPrompt, userPrompt };
  },

  thread({ platform, brand, product, topic, threadLength, additionalContext }) {
    const systemPrompt = `Kamu adalah content creator Indonesia yang ahli membuat thread viral di Twitter/Threads.
${WRITING_STYLE_RULES}
${brandContext(brand)}

REFERENSI STYLE THREAD YANG BAGUS:

Style Provokasi:
- Tweet 1: Buka dengan angka mengejutkan atau statement kontroversial ("Gue bayar Rp 49.000/bulan selama 3 tahun. Total Rp 1.7 juta. Bulan lalu gue bikin sendiri. Gratis.")
- Body: Serang pain point kompetitor dengan bullet points, tunjukkan alternatif yang lebih baik
- CTA: Perbandingan harga tabel (Kompetitor A → Rp X/tahun vs Produk → sekali beli, gratis selamanya)

Style Storytelling:
- Tweet 1: Mulai cerita personal kronologis ("3 tahun lalu gue mulai... Coba A → gagal. Coba B → gagal. Bulan lalu gue bikin solusi sendiri.")
- Body: Timeline cerita → frustrasi → riset → solusi → orang lain mulai tertarik → komunitas terbentuk
- CTA: Ajakan emosional ("Kalau lu capek... Atau lu mau... Panduannya ada di bio.")

Style Value Bomb:
- Tweet 1: Langsung promise ("Cara punya X dalam 15 menit. Gratis. Tanpa coding. Simpan thread ini 🔖🧵")
- Body: Step-by-step konkret, list fitur dengan emoji, FAQ singkat
- CTA: Ringkasan bullet semua yang didapet + link

FORMATTING:
- Setiap tweet: kalimat pendek, banyak jeda baris
- Bullet points bervariasi: → ✅ • ❌
- 1 tweet = 1 fokus
- Angka selalu spesifik

Output JSON format:
{
  "variations": [
    {
      "title": "...",
      "style": "provokasi|storytelling|value bomb",
      "tweets": [
        { "number": 1, "content": "...", "type": "hook" },
        { "number": 2, "content": "...", "type": "content" },
        ...
        { "number": N, "content": "...", "type": "cta" }
      ]
    }
  ]
}`;

    const userPrompt = `Buatkan 3 variasi thread ${threadLength || 7} tweet untuk ${platform}.
${productContext(product)}
Topik: ${topic}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}

Variasi 1: PROVOKASI — buka dengan angka mengejutkan, serang pain point, bandingkan kompetitor
Variasi 2: STORYTELLING — cerita personal kronologis, relatable, build up natural ke produk
Variasi 3: VALUE BOMB — langsung tips actionable step-by-step, list fitur, ringkasan di akhir

Tweet 1 = hook scroll-stopping (angka, kontroversial, atau promise).
Tweet terakhir = CTA dengan ringkasan + perbandingan${product?.link ? ` + link: ${product.link}` : ""} + "Like & RT".
Setiap tweet max 280 karakter.
WAJIB: kalimat pendek, banyak jeda baris, bullet points bervariasi, angka spesifik.`;

    return { systemPrompt, userPrompt };
  },

  repurpose({
    brand,
    sourceContent,
    sourceType,
    targetFormats,
    additionalContext,
  }) {
    const systemPrompt = `Kamu adalah content repurpose specialist Indonesia.
${WRITING_STYLE_RULES}
${brandContext(brand)}

Output JSON format:
{
  "repurposed": [
    { "format": "...", "platform": "...", "content": "...", "notes": "..." }
  ]
}`;

    const userPrompt = `Repurpose konten berikut ke format lain:

KONTEN ASLI (${sourceType}):
${sourceContent}

Target format: ${(targetFormats || ["caption", "thread", "carousel"]).join(", ")}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}

Adaptasi tone dan panjang sesuai masing-masing platform.
Pastikan setiap format punya hook pembuka yang kuat dan CTA di akhir.`;

    return { systemPrompt, userPrompt };
  },

  adapt({
    sourcePlatform,
    targetPlatform,
    sourceContent,
    brand,
    platformRules,
    additionalContext,
  }) {
    const systemPrompt = `Kamu adalah content adaptation specialist Indonesia.
${WRITING_STYLE_RULES}
${brandContext(brand)}

Output JSON format:
${
  targetPlatform === "Twitter" && sourceContent.length > 280
    ? `{
  "adapted_content": ["tweet1", "tweet2", ...],
  "hashtags": [],
  "notes": "..."
}`
    : `{
  "adapted_content": "...",
  "hashtags": ["..."],
  "notes": "..."
}`
}`;

    const platformRulesText = `
PLATFORM RULES UNTUK TARGET (${targetPlatform}):
- Max characters: ${platformRules?.max_caption || "unlimited"}
- Hashtags allowed: ${platformRules?.hashtags !== undefined ? (platformRules.hashtags ? "yes" : "no") : "yes"}
- Link in caption: ${platformRules?.link_in_caption !== undefined ? (platformRules.link_in_caption ? "yes" : "no") : "yes"}
- CTA required: ${platformRules?.cta ? platformRules.cta : "standard platform-appropriate CTA"}
`.trim();

    const userPrompt = `Adaptasi konten dari ${sourcePlatform} ke ${targetPlatform}.

KONTEN ASLI (dari ${sourcePlatform}):
${sourceContent}

${platformRulesText}

INSTRUKSI ADAPTASI:
1. Preserve pesan inti dari konten original
2. Adaptasi tone dan style sesuai karakteristik ${targetPlatform}
3. Respectkan character limit: maksimal ${platformRules?.max_caption || "limit platform default"}
4. Hashtag: ${platformRules?.hashtags ? "include 5-10 hashtag relevant" : "JANGAN pakai hashtag"}
5. Link: ${platformRules?.link_in_caption ? "boleh include link di caption" : "jangan include link di caption"}
6. CTA: ${
      platformRules?.cta
        ? `use "${platformRules.cta}"`
        : "gunakan CTA yang sesuai untuk " + targetPlatform
    }
${additionalContext ? `7. Context tambahan: ${additionalContext}` : ""}

${
  targetPlatform === "Twitter" && sourceContent.length > 280
    ? `KHUSUS UNTUK TWITTER & KONTEN > 280 CHAR:
Buat format THREAD (multiple tweets):
- Setiap tweet max 280 karakter
- Tweet pertama adalah hook yang bikin orang pengen baca tweet berikutnya
- Flow natural dari tweet ke tweet
- Tweet terakhir dengan CTA yang jelas
Output: array of tweets, bukan single string`
    : ""
}

Output WAJIB JSON sesuai format di atas. Sertakan catatan adaptasi di field "notes".`;

    return { systemPrompt, userPrompt };
  },

  video_script({
    platform,
    brand,
    product,
    topic,
    duration,
    additionalContext,
  }) {
    const systemPrompt = `Kamu adalah video content creator Indonesia yang ahli membuat script pendek viral.
${WRITING_STYLE_RULES}
${brandContext(brand)}

Output JSON format:
{
  "variations": [
    {
      "title": "...",
      "style": "hook kontroversial|storytelling|tutorial cepat",
      "duration": "${duration || "30-60"}s",
      "script": {
        "hook": { "duration": "0-3s", "visual": "...", "narration": "..." },
        "body": [
          { "duration": "3-20s", "visual": "...", "narration": "..." }
        ],
        "cta": { "duration": "last 5s", "visual": "...", "narration": "..." }
      },
      "caption": "...",
      "hashtags": ["..."]
    }
  ]
}`;

    const userPrompt = `Buatkan 3 variasi script video pendek ${duration || "30-60"} detik untuk ${platform}.
${productContext(product)}
${topic ? `Topik: ${topic}` : ""}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}

Variasi 1: Hook kontroversial — buka dengan statement mengejutkan atau angka yang bikin orang berhenti scroll
Variasi 2: Storytelling — "Kemarin gue..." cerita relatable yang build up ke solusi
Variasi 3: Tutorial cepat — "Cara ... dalam ... detik/menit" langsung actionable

ATURAN:
- Hook 3 detik pertama = penentu. Harus bikin orang BERHENTI scroll.
- Narasi pakai kalimat pendek, kayak ngomong ke temen
- Visual deskripsi harus spesifik dan bisa diproduksi
- CTA${product?.link ? ` dengan link: ${product.link}` : ""}: ajakan singkat + alasan kenapa sekarang`;

    return { systemPrompt, userPrompt };
  },

  hashtags({ platform, brand, niche, topic, additionalContext }) {
    const systemPrompt = `Kamu adalah social media strategist Indonesia yang ahli riset hashtag.

Output JSON format:
{
  "hashtags": [
    { "tag": "#...", "category": "niche|trending|branded|community", "estimated_reach": "high|medium|low" }
  ],
  "strategy": "..."
}`;

    const userPrompt = `Research hashtag untuk ${platform}.
Niche: ${niche || brand?.niche || "-"}
${topic ? `Topik spesifik: ${topic}` : ""}
${brand ? `Brand: ${brand.name}` : ""}
${additionalContext ? `Context tambahan: ${additionalContext}` : ""}

Berikan 15-20 hashtag mix: trending, niche-specific, dan community.
Sertakan strategi penggunaan hashtag yang spesifik (bukan generic).
Jelaskan KAPAN pakai hashtag mana dan KOMBINASI yang optimal.`;

    return { systemPrompt, userPrompt };
  },

  threads_post_performance({
    postText,
    metrics,
    permalink,
    linkInPost,
    externalLinkClicks,
    externalLinkUrl,
    threadPosition,
    totalThreadParts,
  }) {
    const systemPrompt = `Kamu adalah growth strategist untuk creator Indonesia di Threads.
Tugasmu menjelaskan GAP antara reach (views) vs minat klik link, dan memberi rekomendasi konkret.

Output WAJIB JSON valid:
{
  "summary": "2-3 kalimat executive summary",
  "funnel_read": "interpretasi singkat: views → engagement → klik (bahasa gaul Indonesia OK)",
  "likely_blockers": ["...", "..."],
  "cta_diagnosis": "...",
  "hook_diagnosis": "...",
  "thread_structure_tips": ["...", "..."],
  "next_experiment": ["...", "..."],
  "rewrite_snippets": [
    { "placement": "awal|tengah|akhir|reply_terakhir", "suggested_text": "..." }
  ]
}`;

    const m = metrics || {};
    const userPrompt = `Analisis performa SATU posting Threads berikut.

TEKS POSTING (potongan):
${(postText || "-").slice(0, 4500)}

METRIK DARI THREADS API (bisa kosong sebagian):
- views: ${m.views ?? "tidak ada data"}
- likes: ${m.likes ?? "-"}
- replies: ${m.replies ?? "-"}
- reposts: ${m.reposts ?? "-"}
- quotes: ${m.quotes ?? "-"}

${permalink ? `Permalink: ${permalink}` : ""}
${linkInPost ? `Link terdeteksi di teks/preview: ${linkInPost}` : "Tidak ada URL eksplisit di data."}
${threadPosition && totalThreadParts ? `Posisi dalam thread: bagian ${threadPosition} dari ${totalThreadParts}` : ""}

DATA DARI LUAR THREADS (isi manual creator, opsional):
${externalLinkUrl ? `- URL tujuan (mis. Lynk/bio): ${externalLinkUrl}` : ""}
${externalLinkClicks != null && externalLinkClicks !== "" ? `- Perkiraan/jumlah klik ke link itu: ${externalLinkClicks}` : "- Klik link eksternal: tidak diisi"}

INSTRUKSI:
1. Jangan menyalahkan creator; fokus diagnosa dan tindakan.
2. Jelaskan kenapa views tinggi bisa tetap dengan klik link rendah (scroll, posisi link, friction, trust).
3. Beri 3-5 next_experiment yang spesifik (bukan "tingkatkan engagement").
4. rewrite_snippets: max 3, singkat, siap tempel.`;

    return { systemPrompt, userPrompt };
  },

  competitor_analyze({ adText, platform, niche, brand }) {
    const systemPrompt = `Kamu adalah performance marketing analyst Indonesia yang ahli menganalisa iklan kompetitor.

Output JSON format:
{
  "hook_strength": <number 1-10>,
  "hook_analysis": "...",
  "value_proposition": "...",
  "cta_clarity": <number 1-10>,
  "cta_analysis": "...",
  "emotional_triggers": ["...", "..."],
  "weaknesses": ["...", "..."],
  "suggestions": ["...", "..."],
  "improved_copy": "..."
}`;

    const userPrompt = `Analisis iklan kompetitor berikut secara mendalam:

IKLAN:
${adText}

CONTEXT:
- Platform: ${platform}
- Niche: ${niche || "-"}
- Brand Kompetitor: ${brand || "-"}

INSTRUKSI ANALISIS:
1. Hook Strength (1-10): Rating kekuatan pembuka untuk stop scroll, dengan penjelasan
2. Hook Analysis: Penjelasan detail tentang apa yang membuat hook ini efektif/tidak efektif
3. Value Proposition: Identifikasi benefit utama yang ditawarkan
4. CTA Clarity (1-10): Rating kejelasan call-to-action, dengan penjelasan
5. CTA Analysis: Penjelasan tentang effectiveness CTA
6. Emotional Triggers: List semua emotional triggers yang terdeteksi (FOMO, social proof, urgency, hedonism, dll)
7. Weaknesses: Minimum 3 kelemahan dari iklan ini
8. Suggestions: Minimum 4 actionable suggestions untuk meningkatkan performance iklan
9. Improved Copy: Versi improved dari iklan dengan menerapkan insights dari analisis

Analisis harus spesifik, tidak generic, dan fokus pada elemen-elemen yang membuat iklan ini work (atau tidak work) di ${platform}.`;

    return { systemPrompt, userPrompt };
  },
};
