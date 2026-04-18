import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useBrand } from "../../hooks/useBrand";
import { supabase } from "../../services/supabase";
import { useToast } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input, { Textarea } from "../../components/ui/Input";

const TONE_OPTIONS = [
  "Santai",
  "Profesional",
  "Edukatif",
  "Inspiratif",
  "Lucu",
  "Persuasif",
  "Friendly",
  "Bold",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { createBrand } = useBrand();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [brand, setBrand] = useState({
    name: "",
    niche: "",
    description: "",
    target_audience: "",
  });
  const [voice, setVoice] = useState({
    tone: [],
    favorite_words: "",
    avoided_words: "",
  });
  const [product, setProduct] = useState({
    name: "",
    description: "",
    price: "",
    link: "",
    usp: "",
    features: "",
  });

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboarding_completed)
    return <Navigate to="/dashboard" replace />;

  function toggleTone(t) {
    setVoice((prev) => ({
      ...prev,
      tone: prev.tone.includes(t)
        ? prev.tone.filter((x) => x !== t)
        : [...prev.tone, t],
    }));
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName, onboarding_completed: true });

      const newBrand = await createBrand({
        name: brand.name,
        niche: brand.niche,
        description: brand.description,
        target_audience: brand.target_audience,
        tone: voice.tone,
        favorite_words: voice.favorite_words
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
        avoided_words: voice.avoided_words
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
      });

      if (product.name) {
        await supabase.from("products").insert({
          user_id: user.id,
          brand_id: newBrand.id,
          name: product.name,
          description: product.description,
          price: parseInt(product.price) || 0,
          link: product.link,
          usp: product.usp,
          features: product.features
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
        });
      }

      navigate("/dashboard");
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { num: 1, label: "Profil" },
    { num: 2, label: "Brand" },
    { num: 3, label: "Voice" },
    { num: 4, label: "Produk" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Setup Awal</h1>
          <p className="text-gray-500 text-sm mt-1">Step {step} dari 4</p>
        </div>

        <div className="flex gap-2 mb-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`flex-1 h-2 rounded-full ${step >= s.num ? "bg-primary-600" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Selamat datang! 👋</h2>
              <p className="text-gray-500 text-sm">
                Kenalan dulu, siapa nama kamu?
              </p>
              <Input
                label="Nama Lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Eko Nugroho"
                required
              />
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!fullName.trim()}
              >
                Lanjut
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Setup Brand Kamu</h2>
              <Input
                label="Nama Brand"
                value={brand.name}
                onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                placeholder="Contoh: Karaya Studio"
                required
              />
              <Input
                label="Niche"
                value={brand.niche}
                onChange={(e) => setBrand({ ...brand, niche: e.target.value })}
                placeholder="Contoh: Digital Marketing, Copywriting"
              />
              <Textarea
                label="Deskripsi Brand"
                value={brand.description}
                onChange={(e) =>
                  setBrand({ ...brand, description: e.target.value })
                }
                placeholder="Apa yang brand kamu lakukan?"
              />
              <Input
                label="Target Audience"
                value={brand.target_audience}
                onChange={(e) =>
                  setBrand({ ...brand, target_audience: e.target.value })
                }
                placeholder="Contoh: Content creator pemula usia 20-35 tahun"
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Kembali
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!brand.name.trim()}
                >
                  Lanjut
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Brand Voice</h2>
              <p className="text-gray-500 text-sm">
                Pilih tone yang cocok dengan brand kamu (bisa lebih dari 1)
              </p>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTone(t)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      voice.tone.includes(t)
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Input
                label="Kata Favorit (pisah koma)"
                value={voice.favorite_words}
                onChange={(e) =>
                  setVoice({ ...voice, favorite_words: e.target.value })
                }
                placeholder="gratis, tanpa ribet, auto cuan"
              />
              <Input
                label="Kata yang Dihindari (pisah koma)"
                value={voice.avoided_words}
                onChange={(e) =>
                  setVoice({ ...voice, avoided_words: e.target.value })
                }
                placeholder="murah, diskon, beli sekarang"
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Kembali
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)}>
                  Lanjut
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Produk Pertama (opsional)
              </h2>
              <p className="text-gray-500 text-sm">
                Bisa diisi nanti kalau belum siap.
              </p>
              <Input
                label="Nama Produk"
                value={product.name}
                onChange={(e) =>
                  setProduct({ ...product, name: e.target.value })
                }
                placeholder="Ebook Copywriting Mastery"
              />
              <Textarea
                label="Deskripsi"
                value={product.description}
                onChange={(e) =>
                  setProduct({ ...product, description: e.target.value })
                }
                placeholder="Ebook panduan copywriting untuk pemula..."
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Harga (Rp)"
                  type="number"
                  value={product.price}
                  onChange={(e) =>
                    setProduct({ ...product, price: e.target.value })
                  }
                  placeholder="99000"
                />
                <Input
                  label="Link Produk"
                  value={product.link}
                  onChange={(e) =>
                    setProduct({ ...product, link: e.target.value })
                  }
                  placeholder="https://lynk.id/..."
                />
              </div>
              <Input
                label="USP (Unique Selling Point)"
                value={product.usp}
                onChange={(e) =>
                  setProduct({ ...product, usp: e.target.value })
                }
                placeholder="Satu-satunya ebook copywriting full Bahasa Indonesia"
              />
              <Input
                label="Fitur Utama (pisah koma)"
                value={product.features}
                onChange={(e) =>
                  setProduct({ ...product, features: e.target.value })
                }
                placeholder="50+ template, studi kasus lokal, update gratis"
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)}>
                  Kembali
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleFinish}
                  loading={loading}
                >
                  Mulai Pakai Karaya
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
