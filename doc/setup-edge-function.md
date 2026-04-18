# Setup Supabase Edge Function — Panduan Lengkap

## Kenapa Perlu Edge Function?

Sekarang Groq API key (`VITE_GROQ_API_KEY`) ada di browser — siapapun bisa buka DevTools > Network dan lihat API key kamu. Edge Function memindahkan API call ke server Supabase, jadi key aman.

```
SEBELUM (tidak aman):
Browser → langsung ke Groq API (key ter-expose)

SESUDAH (aman):
Browser → Supabase Edge Function → Groq API (key di server)
```

---

## Persiapan (Sekali Saja)

### 1. Install Supabase CLI

**macOS (Homebrew):**
```bash
brew install supabase/tap/supabase
```

**npm (semua OS):**
```bash
npm install -g supabase
```

**Cek instalasi:**
```bash
supabase --version
```

### 2. Login ke Supabase

```bash
supabase login
```

Browser akan terbuka → login dengan akun Supabase kamu → copy token → paste di terminal.

### 3. Link Project

Masuk ke folder project, lalu jalankan:

```bash
cd marketing-tools
supabase link
```

Pilih project `henfyhuhleowauetulvj` dari list. Kalau diminta database password, masukkan password yang kamu buat waktu setup Supabase project.

---

## Deploy Edge Function (3 Langkah)

### Langkah 1: Set Secret (Groq API Key)

```bash
supabase secrets set GROQ_API_KEY=gsk_XXXXXXX_api_key_kamu_disini
```

Ini menyimpan Groq API key di server Supabase (aman, tidak ter-expose).

### Langkah 2: Deploy Function

```bash
supabase functions deploy generate-content
```

Tunggu sampai selesai. Output yang diharapkan:
```
Edge Function 'generate-content' deployed successfully.
Endpoint URL: https://henfyhuhleowauetulvj.supabase.co/functions/v1/generate-content
```

### Langkah 3: Hapus Groq Key dari .env

Edit file `.env` dan **hapus baris** `VITE_GROQ_API_KEY`:

```env
VITE_SUPABASE_URL=https://henfyhuhleowauetulvj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
# VITE_GROQ_API_KEY tidak perlu lagi!
```

---

## Test

### Cek Function Sudah Aktif

```bash
supabase functions list
```

Harus ada `generate-content` di list dengan status `Active`.

### Test Manual (opsional)

```bash
curl -X POST https://henfyhuhleowauetulvj.supabase.co/functions/v1/generate-content \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b-versatile","systemPrompt":"Kamu asisten","userPrompt":"Halo","temperature":0.8,"maxTokens":100}'
```

### Test di App

Jalankan `npm run dev` dan coba generate content. Cek browser console:
- Kalau berhasil: tidak ada warning
- Kalau Edge Function belum deploy: ada warning `[AI] Edge Function not found — falling back to direct Groq call`

---

## Cara Kerja di Code

File `src/services/ai.js` sudah diupdate otomatis:

1. **Supabase configured?** → Coba panggil Edge Function dulu
2. **Edge Function ada?** → Pakai itu (aman)
3. **Edge Function belum deploy?** → Fallback ke direct Groq call + warning
4. **Production mode + direct call?** → Error log di console

Jadi app kamu tetap jalan selama development walaupun Edge Function belum di-deploy.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `supabase: command not found` | Install ulang: `brew install supabase/tap/supabase` atau `npm i -g supabase` |
| `Error: Project ref not found` | Pastikan `supabase link` sudah jalan dan pilih project yang benar |
| `GROQ_API_KEY not configured` | Jalankan `supabase secrets set GROQ_API_KEY=...` |
| `401 Unauthorized` | User belum login di app. Edge Function memverifikasi auth token |
| Function deploy gagal | Cek `supabase functions list` dan pastikan project linked |

---

## Struktur File

```
supabase/
├── config.toml                          ← Project config (sudah dibuat)
├── migrations/
│   └── 001_phase1_schema.sql            ← Database schema
└── functions/
    ├── _shared/
    │   ├── cors.ts                      ← Shared CORS configuration
    │   └── crypto.ts                    ← Token encryption/decryption
    ├── generate-content/
    │   └── index.ts                ← AI content generation
    ├── oauth-connect/
    │   └── index.ts                     ← OAuth flow initiation
    ├── oauth-callback/
    │   └── index.ts                     ← OAuth callback handler
    ├── publish-content/
    │   └── index.ts                     ← Social media publishing
    └── threads-insights/
        └── index.ts                     ← Threads analytics
```

---

## CORS Configuration

Semua Edge Function menggunakan shared CORS utility (`_shared/cors.ts`) yang membaca allowed origins dari environment variable `ALLOWED_ORIGINS`.

### Production

Set allowed origins untuk domain frontend kamu:

```bash
supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Bisa disi berapa domain, dipisahkan koma. Contoh jika pakai custom domain + Vercel preview:

```bash
supabase secrets set ALLOWED_ORIGINS=https://app.karaya.id,https://karaya-marketing.vercel.app
```

### Development

Untuk development, **tidak perlu set `ALLOWED_ORIGINS`**. Jika tidak di-set, default-nya adalah `*` (mengizinkan semua origin) — cocok untuk local development dengan `localhost`.

### Cara Kerja

1. Edge Function membaca `ALLOWED_ORIGINS` env var saat startup
2. Setiap request dicek `Origin` header-nya terhadap daftar allowed origins
3. Jika origin cocok, `Access-Control-Allow-Origin` di-set ke origin tersebut
4. Jika tidak cocok, fallback ke origin pertama di daftar
5. Header `Vary: Origin` ditambahkan agar CDN/proxy cache per-origin
6. Di dev mode (`*`), semua origin diizinkan tanpa `Vary` header

### Verifikasi

Setelah deploy, test CORS dengan curl:

```bash
curl -I -X OPTIONS \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  https://henfyhuhleowauetulvj.supabase.co/functions/v1/generate-content
```

Response harus mengandung:
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Vary: Origin
```
