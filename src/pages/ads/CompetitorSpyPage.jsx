import { useState, useEffect } from "react";
import { useAds } from "../../hooks/useAds";
import { useGenerator } from "../../hooks/useGenerator";
import { PROMPTS } from "../../utils/prompts";
import { useToast } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";

export default function CompetitorSpyPage() {
  const { searchCompetitors, fetchSavedCompetitors, saveCompetitor } = useAds();
  const { generating } = useGenerator();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [savedAds, setSavedAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Analysis modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Demo competitor ads
  const DEMO_COMPETITOR_DATA = [
    {
      id: "comp-demo-1",
      competitor_name: "Fashion Brand A",
      platform: "meta",
      active_ads_count: 12,
      running_since: "2024-01-15",
      ads: [
        {
          id: "ad-1",
          headline: "Koleksi Musim Semi Terbaru",
          text: "Dapatkan diskon hingga 70% untuk semua item pilihan. Jangan lewatkan kesempatan emas ini! Stok terbatas untuk member premium.",
          platform: "meta",
          image_url: "https://via.placeholder.com/300x200",
        },
      ],
    },
    {
      id: "comp-demo-2",
      competitor_name: "Tech Brand B",
      platform: "tiktok",
      active_ads_count: 8,
      running_since: "2024-02-20",
      ads: [
        {
          id: "ad-2",
          headline: "Teknologi Terbaru Hadir",
          text: "2,500+ customer sudah merasakan perbedaannya. Performa 3x lebih cepat, harga terjangkau. Gratis ongkir untuk pembelian hari ini!",
          platform: "tiktok",
          image_url: "https://via.placeholder.com/300x200",
        },
      ],
    },
  ];

  useEffect(() => {
    loadSavedAds();
  }, []);

  const loadSavedAds = async () => {
    try {
      const ads = await fetchSavedCompetitors();
      setSavedAds(ads || []);
    } catch (err) {
      console.error("Error loading saved ads:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Masukkan brand atau keyword untuk dicari");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In real implementation, this would call the actual search function
      // For now, using demo data filtered by search query
      const results = DEMO_COMPETITOR_DATA.filter(
        (item) =>
          item.competitor_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.ads[0]?.headline
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );

      if (results.length === 0) {
        setError(
          `Tidak ada hasil untuk "${searchQuery}". Coba dengan nama brand lain.`,
        );
        setSearchResults([]);
      } else {
        setSearchResults(results);
        setError(null);
      }
    } catch (err) {
      setError(err.message || "Gagal mencari competitor ads");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAd = async (ad) => {
    setSelectedAd(ad);
    setShowAnalysisModal(true);
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Demo analysis result
      const mockAnalysis = {
        hook_strength: 8.5,
        hook_analysis:
          "Membuka dengan angka spesifik (2,500+ customer) menciptakan social proof yang kuat dan membuat audience merasa FOMO.",
        value_proposition:
          "Performa lebih baik + harga terjangkau + free shipping menciptakan value proposition yang komprehensif.",
        cta_clarity: 9,
        cta_analysis:
          'CTA sangat clear dan urgent: "Pembelian hari ini" dengan incentive "Gratis ongkir" membuat action menjadi irresistible.',
        emotional_triggers: [
          "FOMO (stok terbatas, kesempatan emas)",
          "Social proof (2,500+ customer)",
          "Urgency (pembelian hari ini)",
          "Hedonism (diskon besar)",
        ],
        weaknesses: [
          "Tidak ada testimonial atau rating",
          "Tidak jelas produk apa yang ditawarkan secara spesifik",
          "Tidak ada detail tentang kualitas atau spesifikasi",
        ],
        suggestions: [
          "Tambahkan testimonial dengan nama dan foto customer asli",
          "Gunakan photo produk yang lebih menarik atau lifestyle imagery",
          "Highlight unique selling point yang membedakan dari kompetitor",
          'A/B test dengan CTA alternatif seperti "Beli Sekarang" vs "Cek Koleksi"',
        ],
        improved_copy:
          "Koleksi Musim Semi Terbaru dari Fashion Brand A. Dipercaya 2,500+ fashion lovers di Indonesia. Kualitas premium, harga terjangkau. Dapatkan diskon hingga 70% + gratis ongkir hari ini. Garansi kepuasan 100% atau uang kembali. Jangan lewatkan!",
      };

      setAnalysisResult(mockAnalysis);
    } catch (err) {
      console.error("Error analyzing ad:", err);
      setError("Gagal menganalisis ad");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAd = async (ad) => {
    try {
      const newAd = await saveCompetitor({
        competitor_name: ad.competitor_name || "Unknown",
        platform: ad.platform,
        headline: ad.headline,
        description: ad.text,
        image_url: ad.image_url,
      });

      setSavedAds([...savedAds, newAd]);
      setError(null);
      toast({
        type: "success",
        title: "Berhasil",
        message: "Ad berhasil disimpan!",
      });
    } catch (err) {
      setError(err.message || "Gagal menyimpan ad");
    }
  };

  const toggleAdFavorite = (id) => {
    setSavedAds(
      savedAds.map((ad) =>
        ad.id === id ? { ...ad, is_favorite: !ad.is_favorite } : ad,
      ),
    );
  };

  const handleDeleteAd = (id) => {
    setSavedAds(savedAds.filter((ad) => ad.id !== id));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Competitor Ad Spy</h1>
        <p className="text-gray-500 mt-2">
          Analisis ad kompetitor untuk memperkuat strategi marketing Anda
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-6 mb-8">
        <div className="flex gap-3">
          <Input
            placeholder="Cari brand atau keyword kompetitor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} loading={loading}>
            Cari
          </Button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Hasil Pencarian
          </h2>
          <div className="space-y-6">
            {searchResults.map((competitor) => (
              <Card key={competitor.id} className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {competitor.competitor_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {competitor.active_ads_count} active ads • Running since{" "}
                      {new Date(competitor.running_since).toLocaleDateString(
                        "id-ID",
                      )}
                    </p>
                  </div>
                </div>

                {/* Ad Cards */}
                <div className="space-y-4">
                  {competitor.ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex gap-4">
                        {/* Ad Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={ad.image_url}
                            alt="Ad"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        </div>

                        {/* Ad Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {ad.headline}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {ad.text}
                              </p>
                            </div>
                          </div>

                          {/* Platform Badge */}
                          <div className="flex gap-2 mb-3">
                            <Badge
                              variant={
                                ad.platform === "meta"
                                  ? "blue"
                                  : ad.platform === "tiktok"
                                    ? "purple"
                                    : "gray"
                              }
                            >
                              {ad.platform === "meta"
                                ? "📘 Meta"
                                : ad.platform === "tiktok"
                                  ? "🎵 TikTok"
                                  : "🔎 Google"}
                            </Badge>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handleSaveAd({
                                  ...ad,
                                  competitor_name: competitor.competitor_name,
                                })
                              }
                            >
                              💾 Simpan
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handleAnalyzeAd({
                                  ...ad,
                                  competitor_name: competitor.competitor_name,
                                })
                              }
                            >
                              🤖 AI Analyze
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Saved Ads Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Iklan Tersimpan
        </h2>

        {savedAds.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">Belum ada iklan yang disimpan</p>
            <p className="text-sm text-gray-400 mt-1">
              Gunakan tombol "Simpan" pada iklan kompetitor untuk menyimpannya
              di sini
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedAds.map((ad) => (
              <Card key={ad.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {ad.headline}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ad.competitor_name}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAdFavorite(ad.id)}
                    className={`text-xl transition-colors ${
                      ad.is_favorite
                        ? "text-yellow-400"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  >
                    ★
                  </button>
                </div>

                {ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt="Saved ad"
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {ad.description}
                </p>

                <div className="flex gap-2">
                  <Badge variant="gray">{ad.platform}</Badge>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteAd(ad.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis Modal */}
      {showAnalysisModal && selectedAd && (
        <Modal
          title={`AI Analysis: ${selectedAd.headline}`}
          onClose={() => {
            setShowAnalysisModal(false);
            setSelectedAd(null);
            setAnalysisResult(null);
          }}
        >
          {analyzing ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-600">Menganalisis iklan dengan AI...</p>
              </div>
            </div>
          ) : analysisResult ? (
            <div className="space-y-6 py-6">
              {/* Ad Preview */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Ad Preview
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedAd.headline}
                </p>
                <p className="text-sm text-gray-700 mt-2">{selectedAd.text}</p>
              </div>

              {/* Hook Strength */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">
                    Hook Strength
                  </label>
                  <span className="text-lg font-bold text-emerald-600">
                    {analysisResult.hook_strength}/10
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{
                      width: `${(analysisResult.hook_strength / 10) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {analysisResult.hook_analysis}
                </p>
              </div>

              {/* Value Proposition */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Value Proposition
                </p>
                <p className="text-sm text-gray-700 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {analysisResult.value_proposition}
                </p>
              </div>

              {/* CTA Clarity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-900">
                    CTA Clarity
                  </label>
                  <span className="text-lg font-bold text-emerald-600">
                    {analysisResult.cta_clarity}/10
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{
                      width: `${(analysisResult.cta_clarity / 10) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {analysisResult.cta_analysis}
                </p>
              </div>

              {/* Emotional Triggers */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Emotional Triggers
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.emotional_triggers.map((trigger, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Weaknesses
                </p>
                <ul className="space-y-2">
                  {analysisResult.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Suggestions for Your Ads
                </p>
                <ul className="space-y-2">
                  {analysisResult.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improved Copy */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-900 mb-2">
                  Improved Copy Suggestion
                </p>
                <p className="text-sm text-emerald-800">
                  {analysisResult.improved_copy}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-gray-500">
              <p>Tidak ada hasil analisis</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
