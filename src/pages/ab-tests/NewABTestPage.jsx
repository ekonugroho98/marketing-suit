import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useABTest } from '../../hooks/useABTest'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input, { Textarea, Select } from '../../components/ui/Input'

const TEST_TYPE_OPTIONS = [
  { value: 'content', label: 'Content' },
  { value: 'ad_copy', label: 'Ad Copy' },
  { value: 'link_rotator', label: 'Link Rotator' },
  { value: 'subject_line', label: 'Subject Line' },
]

const VARIANT_NAMES = ['Varian A', 'Varian B', 'Varian C']

export default function NewABTestPage() {
  const navigate = useNavigate()
  const { create, start } = useABTest()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Step 1: Test Setup
  const [testName, setTestName] = useState('')
  const [testType, setTestType] = useState('content')
  const [autoPickWinner, setAutoPickWinner] = useState(false)
  const [minConfidence, setMinConfidence] = useState(95)
  const [duration, setDuration] = useState(7)

  // Step 2: Variants
  const [variants, setVariants] = useState([
    { id: 'var-1', name: VARIANT_NAMES[0], type: 'text', content: '', weight: 50 },
    { id: 'var-2', name: VARIANT_NAMES[1], type: 'text', content: '', weight: 50 },
  ])

  const [variantErrors, setVariantErrors] = useState({})

  // Step 3: Review
  const handleNext = () => {
    if (currentStep === 1) {
      if (!testName.trim()) {
        setError('Nama test harus diisi')
        return
      }
      setError(null)
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Validate variants
      const errors = {}
      let hasErrors = false

      variants.forEach((v, idx) => {
        if (!v.content.trim()) {
          errors[v.id] = `${v.name} tidak boleh kosong`
          hasErrors = true
        }
      })

      if (hasErrors) {
        setVariantErrors(errors)
        setError('Semua varian harus diisi')
        return
      }

      if (variants.length < 2) {
        setError('Minimal 2 varian harus ada')
        return
      }

      setError(null)
      setVariantErrors({})
      setCurrentStep(3)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleAddVariant = () => {
    if (variants.length >= 3) {
      setError('Maksimal 3 varian')
      return
    }

    const newId = `var-${variants.length + 1}`
    const newVariant = {
      id: newId,
      name: VARIANT_NAMES[variants.length],
      type: 'text',
      content: '',
      weight: 50,
    }

    setVariants([...variants, newVariant])
    setError(null)
  }

  const handleRemoveVariant = (id) => {
    if (variants.length <= 2) {
      setError('Minimal 2 varian harus ada')
      return
    }

    setVariants(variants.filter((v) => v.id !== id))
    const newErrors = { ...variantErrors }
    delete newErrors[id]
    setVariantErrors(newErrors)
  }

  const handleVariantChange = (id, field, value) => {
    setVariants(
      variants.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    )

    // Clear error for this variant
    if (variantErrors[id]) {
      const newErrors = { ...variantErrors }
      delete newErrors[id]
      setVariantErrors(newErrors)
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    setError(null)

    try {
      const newTest = await create({
        name: testName,
        type: testType,
        settings: {
          auto_pick_winner: autoPickWinner,
          min_confidence: minConfidence,
          duration: duration,
        },
      })

      // Create variants
      for (const variant of variants) {
        // Note: In real implementation, variants would be created
        // This is simplified for the current structure
      }

      navigate(`/ab-tests/${newTest.id}`)
    } catch (err) {
      setError(err.message || 'Gagal menyimpan draft')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTest = async () => {
    setLoading(true)
    setError(null)

    try {
      const newTest = await create({
        name: testName,
        type: testType,
        settings: {
          auto_pick_winner: autoPickWinner,
          min_confidence: minConfidence,
          duration: duration,
        },
      })

      // Start the test
      await start(newTest.id)

      navigate('/ab-tests')
    } catch (err) {
      setError(err.message || 'Gagal memulai test')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New A/B Test</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Step {currentStep} of 3
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                step <= currentStep ? 'bg-emerald-600' : 'bg-gray-200'
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

      {/* Step 1: Test Setup */}
      {currentStep === 1 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Test Setup
          </h2>

          <div className="space-y-5">
            <Input
              label="Test Name"
              placeholder="e.g., Email Subject Line Test"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />

            <Select
              label="Test Type"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              options={TEST_TYPE_OPTIONS}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Settings</h3>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="auto_pick"
                  checked={autoPickWinner}
                  onChange={(e) => setAutoPickWinner(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="auto_pick" className="text-sm text-gray-700 cursor-pointer">
                  Auto-pick winner kapan test selesai (jika signifikan)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Confidence Level: {minConfidence}%
                </label>
                <input
                  type="range"
                  min="80"
                  max="99"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Level kepercayaan sebelum hasil dianggap signifikan
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration: {duration} hari
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Durasi test (hanya untuk referensi)
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={() => navigate('/ab-tests')}>
              Batal
            </Button>
            <Button onClick={handleNext}>
              Lanjut ke Varian
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Add Variants */}
      {currentStep === 2 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Add Variants
          </h2>

          <div className="space-y-5 mb-6">
            {variants.map((variant, idx) => (
              <div key={variant.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-900">
                    {variant.name}
                  </label>
                  {variants.length > 2 && (
                    <button
                      onClick={() => handleRemoveVariant(variant.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {testType === 'link_rotator' ? (
                  <>
                    <Input
                      label="Destination URL"
                      placeholder="https://example.com"
                      value={variant.content}
                      onChange={(e) =>
                        handleVariantChange(variant.id, 'content', e.target.value)
                      }
                      error={variantErrors[variant.id]}
                      className="mb-3"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight: {variant.weight}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={variant.weight}
                        onChange={(e) =>
                          handleVariantChange(variant.id, 'weight', Number(e.target.value))
                        }
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  </>
                ) : testType === 'ad_copy' ? (
                  <>
                    <Input
                      label="Headline"
                      placeholder="e.g., 10X Your Productivity..."
                      value={variant.content.split('\n')[0] || ''}
                      onChange={(e) => {
                        const lines = variant.content.split('\n')
                        lines[0] = e.target.value
                        handleVariantChange(variant.id, 'content', lines.join('\n'))
                      }}
                      error={variantErrors[variant.id]}
                      className="mb-3"
                    />
                    <Textarea
                      label="Body"
                      placeholder="Write your ad copy here..."
                      value={variant.content.split('\n').slice(1).join('\n') || ''}
                      onChange={(e) => {
                        const lines = variant.content.split('\n')
                        const newContent = (lines[0] || '') + '\n' + e.target.value
                        handleVariantChange(variant.id, 'content', newContent)
                      }}
                      rows={3}
                    />
                  </>
                ) : (
                  <Textarea
                    label="Content"
                    placeholder="Enter variant content..."
                    value={variant.content}
                    onChange={(e) =>
                      handleVariantChange(variant.id, 'content', e.target.value)
                    }
                    error={variantErrors[variant.id]}
                    rows={3}
                  />
                )}
              </div>
            ))}
          </div>

          {variants.length < 3 && (
            <button
              onClick={handleAddVariant}
              className="w-full py-2 px-4 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              + Add Variant
            </button>
          )}

          <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={handlePrev}>
              ← Kembali
            </Button>
            <Button onClick={handleNext}>
              Lanjut ke Review
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Review & Launch */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Review & Launch
            </h2>

            <div className="space-y-5">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-600">Test Name</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {testName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Type</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {TEST_TYPE_OPTIONS.find((t) => t.value === testType)?.label}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {duration} hari
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Variants ({variants.length})
                </h3>
                <div className="space-y-2">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {variant.name}
                      </p>
                      <p className="text-xs text-gray-600 break-words line-clamp-2">
                        {variant.content || '(kosong)'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-900">
                  {autoPickWinner
                    ? '✓ Auto-pick winner aktif pada {minConfidence}% confidence'
                    : 'Manual winner selection'}
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
                <Button
                  onClick={handleStartTest}
                  loading={loading}
                >
                  Mulai Test
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
