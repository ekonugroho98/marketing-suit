import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAds } from "../../hooks/useAds";
import { useGenerator } from "../../hooks/useGenerator";
import { useToast } from "../../components/ui/Toast";
import { OBJECTIVES, CTA_TYPES, AD_PLATFORMS } from "../../services/ads";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input, { Textarea, Select } from "../../components/ui/Input";

const BID_STRATEGIES = [
  { value: "lowest_cost", label: "Lowest Cost (Automatic)" },
  { value: "cost_cap", label: "Cost Cap (Manual)" },
];

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const { createNew } = useAds();
  const { generating, result } = useGenerator();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGenerationBrowser, setShowGenerationBrowser] = useState(false);

  // Step 1: Campaign Setup
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [objective, setObjective] = useState("awareness");

  // Step 2: Audience
  const [savedAudiences, setSavedAudiences] = useState([]);
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationInput, setLocationInput] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState("all");
  const [interests, setInterests] = useState([]);
  const [interestInput, setInterestInput] = useState("");

  // Step 3: Budget & Schedule
  const [dailyBudget, setDailyBudget] = useState("");
  const [durationMode, setDurationMode] = useState("ongoing");
  const [endDate, setEndDate] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [bidStrategy, setBidStrategy] = useState("lowest_cost");
  const [costCap, setCostCap] = useState("");

  // Step 4: Creative
  const [creatives, setCreatives] = useState([
    {
      id: "creative-1",
      primaryText: "",
      headline: "",
      description: "",
      cta: "learn_more",
      mediaUrl: "",
      destinationUrl: "",
    },
  ]);

  // Step 5: Review
  const [campaignDraft, setCampaignDraft] = useState(null);

  // Load saved audiences on mount
  useEffect(() => {
    loadAudiences();
  }, []);

  const loadAudiences = async () => {
    try {
      // Mock data - replace with actual hook call
      setSavedAudiences([
        { id: "aud-1", name: "Fashion Enthusiasts 18-35" },
        { id: "aud-2", name: "Website Visitors" },
      ]);
    } catch (err) {
      console.error("Error loading audiences:", err);
    }
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!campaignName.trim()) {
        setError("Nama campaign harus diisi");
        return false;
      }
      setError(null);
      return true;
    }

    if (currentStep === 2) {
      if (locations.length === 0) {
        setError("Minimal 1 lokasi harus dipilih");
        return false;
      }
      setError(null);
      return true;
    }

    if (currentStep === 3) {
      if (!dailyBudget || parseFloat(dailyBudget) <= 0) {
        setError("Daily budget harus lebih dari 0");
        return false;
      }
      if (durationMode === "end_date" && !endDate) {
        setError("Tanggal akhir harus diisi");
        return false;
      }
      if (
        bidStrategy === "cost_cap" &&
        (!costCap || parseFloat(costCap) <= 0)
      ) {
        setError("Cost cap harus diisi ketika menggunakan Cost Cap strategy");
        return false;
      }
      setError(null);
      return true;
    }

    if (currentStep === 4) {
      const validCreatives = creatives.filter(
        (c) => c.primaryText.trim() && c.headline.trim(),
      );
      if (validCreatives.length === 0) {
        setError(
          "Minimal 1 creative dengan Primary Text dan Headline harus ada",
        );
        return false;
      }
      setError(null);
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleAddLocation = () => {
    if (locationInput.trim()) {
      setLocations([...locations, locationInput.trim()]);
      setLocationInput("");
    }
  };

  const handleRemoveLocation = (index) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleAddInterest = () => {
    if (interestInput.trim()) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput("");
    }
  };

  const handleRemoveInterest = (index) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleAddCreative = () => {
    if (creatives.length < 3) {
      const newId = `creative-${creatives.length + 1}`;
      setCreatives([
        ...creatives,
        {
          id: newId,
          primaryText: "",
          headline: "",
          description: "",
          cta: "learn_more",
          mediaUrl: "",
          destinationUrl: "",
        },
      ]);
      setError(null);
    } else {
      setError("Maksimal 3 creative");
    }
  };

  const handleRemoveCreative = (id) => {
    if (creatives.length > 1) {
      setCreatives(creatives.filter((c) => c.id !== id));
    } else {
      setError("Minimal 1 creative harus ada");
    }
  };

  const handleCreativeChange = (id, field, value) => {
    setCreatives(
      creatives.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const generateUTMPreview = () => {
    const campaignSlug = campaignName.toLowerCase().replace(/\s+/g, "-");
    return {
      utm_source: "ads",
      utm_medium: "paid",
      utm_campaign: campaignSlug,
    };
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);

    try {
      const campaign = {
        name: campaignName,
        platform,
        objective,
        status: "draft",
        audience: {
          saved_audience_id: selectedAudience,
          locations,
          age_range: `${ageMin}-${ageMax}`,
          gender,
          interests,
        },
        budget: {
          daily: parseFloat(dailyBudget),
          limit: budgetLimit ? parseFloat(budgetLimit) : null,
          total: 0,
        },
        schedule: {
          duration_mode: durationMode,
          end_date: endDate || null,
        },
        bid_strategy: bidStrategy,
        cost_cap: bidStrategy === "cost_cap" ? parseFloat(costCap) : null,
        creatives: creatives.filter(
          (c) => c.primaryText.trim() && c.headline.trim(),
        ),
      };

      const newCampaign = await createNew(campaign);
      navigate(`/ads/${newCampaign.id}`);
    } catch (err) {
      setError(err.message || "Gagal menyimpan draft");
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchCampaign = async () => {
    setLoading(true);
    setError(null);

    try {
      const campaign = {
        name: campaignName,
        platform,
        objective,
        status: "active",
        audience: {
          saved_audience_id: selectedAudience,
          locations,
          age_range: `${ageMin}-${ageMax}`,
          gender,
          interests,
        },
        budget: {
          daily: parseFloat(dailyBudget),
          limit: budgetLimit ? parseFloat(budgetLimit) : null,
          total: 0,
        },
        schedule: {
          duration_mode: durationMode,
          end_date: endDate || null,
        },
        bid_strategy: bidStrategy,
        cost_cap: bidStrategy === "cost_cap" ? parseFloat(costCap) : null,
        creatives: creatives.filter(
          (c) => c.primaryText.trim() && c.headline.trim(),
        ),
      };

      const newCampaign = await createNew(campaign);
      navigate("/ads");
    } catch (err) {
      setError(err.message || "Gagal meluncurkan campaign");
    } finally {
      setLoading(false);
    }
  };

  const applyGeneratedCreative = (generatedData, index) => {
    const creative = creatives[index];
    if (!creative) return;

    try {
      const data =
        typeof generatedData === "string"
          ? JSON.parse(generatedData)
          : generatedData;
      const variation = data.variations?.[0] || data;

      handleCreativeChange(
        creative.id,
        "primaryText",
        variation.primary_text || "",
      );
      handleCreativeChange(creative.id, "headline", variation.headline || "");
      handleCreativeChange(
        creative.id,
        "description",
        variation.description || "",
      );
      handleCreativeChange(
        creative.id,
        "cta",
        variation.cta_button || "learn_more",
      );

      setShowGenerationBrowser(false);
    } catch (err) {
      console.error("Error applying generated creative:", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Buat Campaign Baru
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Step {currentStep} of 5
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                step <= currentStep ? "bg-emerald-600" : "bg-gray-200"
              }`}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Campaign Setup */}
      {currentStep === 1 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Campaign Setup
          </h2>

          <div className="space-y-5">
            <Input
              label="Nama Campaign"
              placeholder="e.g., Summer Product Launch"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />

            <Select
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              options={AD_PLATFORMS}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                Objektif Campaign
              </label>
              <div className="grid grid-cols-2 gap-3">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.value}
                    onClick={() => setObjective(obj.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      objective === obj.value
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">{obj.icon}</div>
                    <p className="text-sm font-semibold text-gray-900">
                      {obj.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{obj.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={() => navigate("/ads")}>
              Batal
            </Button>
            <Button onClick={handleNext}>Lanjut ke Audience</Button>
          </div>
        </Card>
      )}

      {/* Step 2: Audience */}
      {currentStep === 2 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Audience</h2>

          <div className="space-y-6">
            {/* Saved Audiences */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Saved Audiences
              </label>
              <div className="flex flex-wrap gap-2">
                {savedAudiences.map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => setSelectedAudience(aud.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedAudience === aud.id
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {aud.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Lokasi Targeting
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="e.g., Indonesia, Jakarta, Surabaya"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddLocation}>Tambah</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    {loc}
                    <button
                      onClick={() => handleRemoveLocation(idx)}
                      className="hover:text-blue-900 font-semibold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Umur Minimal: {ageMin}
                </label>
                <input
                  type="range"
                  min="13"
                  max="120"
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Umur Maksimal: {ageMax}
                </label>
                <input
                  type="range"
                  min="13"
                  max="120"
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Gender
              </label>
              <div className="flex gap-4">
                {[
                  { value: "all", label: "Semua" },
                  { value: "male", label: "Pria" },
                  { value: "female", label: "Wanita" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value={opt.value}
                      checked={gender === opt.value}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Interests
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="e.g., Fashion, Technology, Sports"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddInterest}>Tambah</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
                  >
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(idx)}
                      className="hover:text-purple-900 font-semibold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  type: "info",
                  title: "Info",
                  message: "Simpan audience untuk reuse di campaign berikutnya",
                })
              }
            >
              Simpan Audience
            </Button>
          </div>

          <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={handlePrev}>
              ← Kembali
            </Button>
            <Button onClick={handleNext}>Lanjut ke Budget & Schedule</Button>
          </div>
        </Card>
      )}

      {/* Step 3: Budget & Schedule */}
      {currentStep === 3 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Budget & Schedule
          </h2>

          <div className="space-y-5">
            <Input
              label="Daily Budget (Rp)"
              type="number"
              placeholder="e.g., 100000"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Duration
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="duration"
                    value="ongoing"
                    checked={durationMode === "ongoing"}
                    onChange={(e) => setDurationMode(e.target.value)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">
                    Ongoing (Tidak ada tanggal akhir)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="duration"
                    value="end_date"
                    checked={durationMode === "end_date"}
                    onChange={(e) => setDurationMode(e.target.value)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">
                    Dengan tanggal akhir
                  </span>
                </label>
                {durationMode === "end_date" && (
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="ml-7"
                  />
                )}
              </div>
            </div>

            <Input
              label="Total Budget Limit (Opsional, Rp)"
              type="number"
              placeholder="e.g., 5000000"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Bid Strategy
              </label>
              <Select
                value={bidStrategy}
                onChange={(e) => setBidStrategy(e.target.value)}
                options={BID_STRATEGIES}
              />
              {bidStrategy === "cost_cap" && (
                <Input
                  label="Cost Cap (Rp)"
                  type="number"
                  placeholder="e.g., 2000"
                  value={costCap}
                  onChange={(e) => setCostCap(e.target.value)}
                  className="mt-3"
                />
              )}
            </div>
          </div>

          <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={handlePrev}>
              ← Kembali
            </Button>
            <Button onClick={handleNext}>Lanjut ke Creative</Button>
          </div>
        </Card>
      )}

      {/* Step 4: Creative */}
      {currentStep === 4 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Creative</h2>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <button
              onClick={() => setShowGenerationBrowser(!showGenerationBrowser)}
              className="text-sm font-medium text-blue-700 hover:text-blue-900 flex items-center gap-2"
            >
              <span>🤖</span> Import dari AI Generator
            </button>
            {showGenerationBrowser && (
              <div className="mt-3 p-3 bg-white rounded border border-blue-200 text-xs text-gray-600">
                Pilih creative dari generation history untuk di-import ke form
                di bawah
              </div>
            )}
          </div>

          <div className="space-y-6 mb-6">
            {creatives.map((creative, idx) => (
              <div
                key={creative.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-gray-900">
                    Creative {idx + 1}
                  </label>
                  {creatives.length > 1 && (
                    <button
                      onClick={() => handleRemoveCreative(creative.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <Textarea
                    label="Primary Text"
                    placeholder="Main message untuk audience..."
                    value={creative.primaryText}
                    onChange={(e) =>
                      handleCreativeChange(
                        creative.id,
                        "primaryText",
                        e.target.value,
                      )
                    }
                    rows={3}
                  />

                  <Input
                    label="Headline"
                    placeholder="e.g., Diskon 50% untuk Member Baru"
                    value={creative.headline}
                    onChange={(e) =>
                      handleCreativeChange(
                        creative.id,
                        "headline",
                        e.target.value,
                      )
                    }
                  />

                  <Textarea
                    label="Description"
                    placeholder="Detail produk atau penawaran..."
                    value={creative.description}
                    onChange={(e) =>
                      handleCreativeChange(
                        creative.id,
                        "description",
                        e.target.value,
                      )
                    }
                    rows={2}
                  />

                  <Select
                    label="CTA Button"
                    value={creative.cta}
                    onChange={(e) =>
                      handleCreativeChange(creative.id, "cta", e.target.value)
                    }
                    options={CTA_TYPES}
                  />

                  <Input
                    label="Media URL"
                    placeholder="https://example.com/image.jpg"
                    value={creative.mediaUrl}
                    onChange={(e) =>
                      handleCreativeChange(
                        creative.id,
                        "mediaUrl",
                        e.target.value,
                      )
                    }
                  />

                  <Input
                    label="Destination URL"
                    placeholder="https://example.com/landing-page"
                    value={creative.destinationUrl}
                    onChange={(e) =>
                      handleCreativeChange(
                        creative.id,
                        "destinationUrl",
                        e.target.value,
                      )
                    }
                  />

                  {creative.destinationUrl && (
                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        UTM Preview
                      </p>
                      <div className="text-xs text-gray-700 space-y-1 font-mono">
                        {Object.entries(generateUTMPreview()).map(
                          ([key, val]) => (
                            <div key={key}>
                              {key}: {val}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {creatives.length < 3 && (
            <button
              onClick={handleAddCreative}
              className="w-full py-2 px-4 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              + Tambah Variasi
            </button>
          )}

          <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={handlePrev}>
              ← Kembali
            </Button>
            <Button onClick={handleNext}>Lanjut ke Review</Button>
          </div>
        </Card>
      )}

      {/* Step 5: Review & Launch */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Review & Launch
            </h2>

            <div className="space-y-5">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-600">
                  Nama Campaign
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {campaignName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Platform</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {AD_PLATFORMS.find((p) => p.value === platform)?.label}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Objektif</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {OBJECTIVES.find((o) => o.value === objective)?.label}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600">
                    Daily Budget
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    Rp {parseFloat(dailyBudget || 0).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {durationMode === "ongoing"
                      ? "Ongoing"
                      : `Hingga ${endDate}`}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Audience ({locations.length} lokasi, {interests.length}{" "}
                  interests)
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                  <div>Lokasi: {locations.join(", ")}</div>
                  <div>
                    Umur: {ageMin}-{ageMax}
                  </div>
                  <div>Gender: {gender === "all" ? "Semua" : gender}</div>
                  {interests.length > 0 && (
                    <div>Interests: {interests.join(", ")}</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Creatives ({creatives.length})
                </h3>
                <div className="space-y-2">
                  {creatives.map((creative, idx) => (
                    <div
                      key={creative.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Creative {idx + 1}
                      </p>
                      <p className="text-xs text-gray-600">
                        {creative.headline || "(No headline)"} —{" "}
                        {creative.primaryText.substring(0, 50) || "(empty)"}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-900">
                  ✓ Siap untuk diluncurkan
                </p>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
              <Button variant="secondary" onClick={handlePrev}>
                ← Kembali
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  loading={loading}
                >
                  Simpan Draft
                </Button>
                <Button onClick={handleLaunchCampaign} loading={loading}>
                  Launch Campaign
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
