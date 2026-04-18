import { supabase, isConfigured } from "./supabase";

// ============================================
// A/B Testing Services
// ============================================
// Handles A/B test management, variants, and result tracking.
// All database operations use Supabase.
// Falls back to mock data in demo mode when Supabase is not configured.
// PATTERN: All exported async functions return { data, error }.
//   Success → { data: <result>, error: null }
//   Failure → { data: null, error: 'message' }
// ============================================

// --- Demo mode constants ---
const DEMO_TESTS = [
  {
    id: "demo-test-1",
    name: "Email Subject Line Test",
    type: "content",
    brand_id: "brand-demo",
    status: "running",
    created_at: new Date(Date.now() - 604800000).toISOString(),
    start_date: new Date(Date.now() - 432000000).toISOString(),
    completed_date: null,
    winner_variant_id: null,
    settings: {
      audience: "all_subscribers",
      duration: 14,
    },
    variants: [
      {
        id: "var-1a",
        test_id: "demo-test-1",
        name: "Variant A",
        content_id: "content-101",
        link_id: null,
        destination_url: null,
        weight: 50,
        impressions: 1250,
        clicks: 185,
        conversions: 42,
      },
      {
        id: "var-1b",
        test_id: "demo-test-1",
        name: "Variant B",
        content_id: "content-102",
        link_id: null,
        destination_url: null,
        weight: 50,
        impressions: 1248,
        clicks: 201,
        conversions: 48,
      },
    ],
  },
  {
    id: "demo-test-2",
    name: "CTA Link Rotation",
    type: "link_rotator",
    brand_id: "brand-demo",
    status: "completed",
    created_at: new Date(Date.now() - 1209600000).toISOString(),
    start_date: new Date(Date.now() - 1209600000).toISOString(),
    completed_date: new Date(Date.now() - 259200000).toISOString(),
    winner_variant_id: "var-2b",
    settings: {
      audience: "all_traffic",
    },
    variants: [
      {
        id: "var-2a",
        test_id: "demo-test-2",
        name: "Short URL",
        content_id: null,
        link_id: "link-201",
        destination_url: "https://example.com/short",
        weight: 50,
        impressions: 3420,
        clicks: 412,
        conversions: 82,
      },
      {
        id: "var-2b",
        test_id: "demo-test-2",
        name: "Custom Landing",
        content_id: null,
        link_id: "link-202",
        destination_url: "https://example.com/custom-lp",
        weight: 50,
        impressions: 3398,
        clicks: 524,
        conversions: 115,
      },
      {
        id: "var-2c",
        test_id: "demo-test-2",
        name: "Direct Link",
        content_id: null,
        link_id: "link-203",
        destination_url: "https://example.com",
        weight: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    ],
  },
];

/**
 * Create a new A/B test.
 * @param {Object} params - Test creation parameters
 * @param {string} params.name - Test name
 * @param {string} params.type - Test type ('content', 'link_rotator', 'subject_line', etc)
 * @param {string} params.brandId - Brand ID this test belongs to
 * @param {Object} [params.settings] - Test configuration settings
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function createTest({ name, type, brandId, settings = {} }) {
  try {
    if (!isConfigured) {
      // Demo mode
      const demoTest = {
        id: `demo-test-${Date.now()}`,
        name,
        type,
        brand_id: brandId,
        status: "draft",
        created_at: new Date().toISOString(),
        start_date: null,
        completed_date: null,
        winner_variant_id: null,
        settings,
      };
      return { data: demoTest, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .insert({
        name,
        type,
        brand_id: brandId,
        status: "draft",
        settings,
      })
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to create test" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Create test error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Update an existing A/B test.
 * @param {string} id - Test ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function updateTest(id, updates) {
  try {
    if (!isConfigured) {
      // Demo mode
      const test = DEMO_TESTS.find((t) => t.id === id);
      const updated = test ? { ...test, ...updates } : updates;
      return { data: updated, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to update test" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Update test error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Delete an A/B test and its variants.
 * @param {string} id - Test ID
 * @returns {Promise<{data: null, error: string|null}>}
 */
export async function deleteTest(id) {
  try {
    if (!isConfigured) {
      // Demo mode
      console.log(`[Demo] Deleted test ${id}`);
      return { data: null, error: null };
    }

    // Delete variants first (due to foreign key constraint)
    await supabase.from("ab_test_variants").delete().eq("test_id", id);

    // Then delete the test
    const { error } = await supabase.from("ab_tests").delete().eq("id", id);

    if (error)
      return { data: null, error: error.message || "Failed to delete test" };
    return { data: null, error: null };
  } catch (err) {
    console.error("[A/B Testing] Delete test error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Query A/B tests with optional filters.
 * @param {Object} params - Query parameters
 * @param {string} [params.status] - Filter by status ('draft', 'running', 'paused', 'completed')
 * @param {string} [params.type] - Filter by type ('content', 'link_rotator', etc)
 * @returns {Promise<{data: Array|null, error: string|null}>}
 */
export async function getTests({ status, type } = {}) {
  try {
    if (!isConfigured) {
      // Demo mode
      let tests = DEMO_TESTS;
      if (status) tests = tests.filter((t) => t.status === status);
      if (type) tests = tests.filter((t) => t.type === type);
      return { data: tests, error: null };
    }

    let query = supabase
      .from("ab_tests")
      .select("*, ab_test_variants(id)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;

    if (error)
      return { data: null, error: error.message || "Failed to fetch tests" };
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[A/B Testing] Get tests error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Get a single A/B test with all its variants.
 * @param {string} id - Test ID
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function getTestById(id) {
  try {
    if (!isConfigured) {
      // Demo mode
      const test = DEMO_TESTS.find((t) => t.id === id);
      return { data: test || null, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .select("*, ab_test_variants(*)")
      .eq("id", id)
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to fetch test" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Get test by ID error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Create a test variant.
 * @param {Object} params - Variant creation parameters
 * @param {string} params.testId - Parent test ID
 * @param {string} params.name - Variant name (e.g., 'Control', 'Variant A')
 * @param {string} [params.contentId] - Content ID (for content tests)
 * @param {string} [params.linkId] - Link ID (for link rotator tests)
 * @param {string} [params.destinationUrl] - Destination URL (for link rotator)
 * @param {number} [params.weight=50] - Traffic weight percentage
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function createVariant({
  testId,
  name,
  contentId,
  linkId,
  destinationUrl,
  weight = 50,
}) {
  try {
    if (!isConfigured) {
      // Demo mode
      const demoVariant = {
        id: `demo-var-${Date.now()}`,
        test_id: testId,
        name,
        content_id: contentId,
        link_id: linkId,
        destination_url: destinationUrl,
        weight,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      };
      return { data: demoVariant, error: null };
    }

    const { data, error } = await supabase
      .from("ab_test_variants")
      .insert({
        test_id: testId,
        name,
        content_id: contentId,
        link_id: linkId,
        destination_url: destinationUrl,
        weight,
      })
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to create variant" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Create variant error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Update a test variant.
 * @param {string} id - Variant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function updateVariant(id, updates) {
  try {
    if (!isConfigured) {
      // Demo mode
      return { data: updates, error: null };
    }

    const { data, error } = await supabase
      .from("ab_test_variants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to update variant" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Update variant error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Delete a test variant.
 * @param {string} id - Variant ID
 * @returns {Promise<{data: null, error: string|null}>}
 */
export async function deleteVariant(id) {
  try {
    if (!isConfigured) {
      // Demo mode
      console.log(`[Demo] Deleted variant ${id}`);
      return { data: null, error: null };
    }

    const { error } = await supabase
      .from("ab_test_variants")
      .delete()
      .eq("id", id);

    if (error)
      return { data: null, error: error.message || "Failed to delete variant" };
    return { data: null, error: null };
  } catch (err) {
    console.error("[A/B Testing] Delete variant error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Start a test (change status to running and set start_date).
 * @param {string} id - Test ID
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function startTest(id) {
  try {
    if (!isConfigured) {
      // Demo mode
      const test = DEMO_TESTS.find((t) => t.id === id);
      if (test) {
        test.status = "running";
        test.start_date = new Date().toISOString();
        return { data: test, error: null };
      }
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .update({
        status: "running",
        start_date: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to start test" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Start test error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Pause a running test.
 * @param {string} id - Test ID
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function pauseTest(id) {
  try {
    if (!isConfigured) {
      // Demo mode
      const test = DEMO_TESTS.find((t) => t.id === id);
      if (test) {
        test.status = "paused";
        return { data: test, error: null };
      }
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .update({ status: "paused" })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to pause test" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Pause test error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Complete a test and declare a winner.
 * @param {string} id - Test ID
 * @param {string} winnerVariantId - Winning variant ID
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function completeTest(id, winnerVariantId) {
  try {
    if (!isConfigured) {
      // Demo mode
      const test = DEMO_TESTS.find((t) => t.id === id);
      if (test) {
        test.status = "completed";
        test.completed_date = new Date().toISOString();
        test.winner_variant_id = winnerVariantId;
        return { data: test, error: null };
      }
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .update({
        status: "completed",
        completed_date: new Date().toISOString(),
        winner_variant_id: winnerVariantId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return { data: null, error: error.message || "Failed to complete test" };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Complete test error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}

/**
 * Get test results with all variants and their metrics.
 * @param {string} testId - Test ID
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function getTestResults(testId) {
  try {
    if (!isConfigured) {
      // Demo mode
      const test = DEMO_TESTS.find((t) => t.id === testId);
      return { data: test || null, error: null };
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .select("*, ab_test_variants(*)")
      .eq("id", testId)
      .single();

    if (error)
      return {
        data: null,
        error: error.message || "Failed to fetch test results",
      };
    return { data, error: null };
  } catch (err) {
    console.error("[A/B Testing] Get test results error:", err.message);
    return { data: null, error: err.message || "Unknown error" };
  }
}
