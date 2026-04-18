import { useState, useEffect, useCallback } from "react";
import {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  createVariant,
  updateVariant,
  deleteVariant,
  startTest,
  pauseTest,
  completeTest,
  getTestResults,
} from "../services/ab-testing";
import { useAuth } from "./useAuth";
import { useBrand } from "./useBrand";

export function useABTest() {
  const { user } = useAuth();
  const { activeBrand } = useBrand();

  const [tests, setTests] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTests = useCallback(
    async (filters = {}) => {
      if (!activeBrand) return;

      setLoading(true);
      setError(null);

      const { data, error } = await getTests(filters);
      if (error) {
        console.error("Error fetching tests:", error);
        setError(error);
        setTests([]);
      } else {
        setTests(data || []);
      }
      setLoading(false);
    },
    [activeBrand],
  );

  const fetchTest = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    const { data, error } = await getTestById(id);
    if (error) {
      console.error("Error fetching test:", error);
      setError(error);
      setActiveTest(null);
    } else {
      setActiveTest(data);
    }
    setLoading(false);
    return data;
  }, []);

  const create = useCallback(
    async (payload) => {
      if (!activeBrand) {
        const msg = "No active brand selected";
        setError(msg);
        return { data: null, error: msg };
      }

      setError(null);
      const { data, error } = await createTest({
        ...payload,
        brandId: activeBrand.id,
      });
      if (error) {
        console.error("Error creating test:", error);
        setError(error);
        return { data: null, error };
      }
      setTests((prev) => [data, ...prev]);
      return { data, error: null };
    },
    [activeBrand],
  );

  const update = useCallback(async (id, payload) => {
    setError(null);
    const { data, error } = await updateTest(id, payload);
    if (error) {
      console.error("Error updating test:", error);
      setError(error);
      return { data: null, error };
    }
    setTests((prev) => prev.map((t) => (t.id === id ? data : t)));
    setActiveTest((prev) => (prev?.id === id ? data : prev));
    return { data, error: null };
  }, []);

  const remove = useCallback(async (id) => {
    setError(null);
    const { error } = await deleteTest(id);
    if (error) {
      console.error("Error deleting test:", error);
      setError(error);
      return { error };
    }
    setTests((prev) => prev.filter((t) => t.id !== id));
    setActiveTest((prev) => (prev?.id === id ? null : prev));
    return { error: null };
  }, []);

  const addVariant = useCallback(
    async (payload) => {
      if (!activeTest) {
        const msg = "No active test selected";
        setError(msg);
        return { data: null, error: msg };
      }

      setError(null);
      const { data, error } = await createVariant({
        testId: activeTest.id,
        ...payload,
      });
      if (error) {
        console.error("Error adding variant:", error);
        setError(error);
        return { data: null, error };
      }

      setActiveTest((prev) => ({
        ...prev,
        ab_test_variants: [...(prev.ab_test_variants || []), data],
      }));
      return { data, error: null };
    },
    [activeTest],
  );

  const removeVariant = useCallback(async (id) => {
    setError(null);
    const { error } = await deleteVariant(id);
    if (error) {
      console.error("Error removing variant:", error);
      setError(error);
      return { error };
    }
    setActiveTest((prev) => ({
      ...prev,
      ab_test_variants: (prev.ab_test_variants || []).filter(
        (v) => v.id !== id,
      ),
    }));
    return { error: null };
  }, []);

  const start = useCallback(async (id) => {
    setError(null);
    const { data, error } = await startTest(id);
    if (error) {
      console.error("Error starting test:", error);
      setError(error);
      return { data: null, error };
    }
    setTests((prev) => prev.map((t) => (t.id === id ? data : t)));
    setActiveTest((prev) => (prev?.id === id ? data : prev));
    return { data, error: null };
  }, []);

  const pause = useCallback(async (id) => {
    setError(null);
    const { data, error } = await pauseTest(id);
    if (error) {
      console.error("Error pausing test:", error);
      setError(error);
      return { data: null, error };
    }
    setTests((prev) => prev.map((t) => (t.id === id ? data : t)));
    setActiveTest((prev) => (prev?.id === id ? data : prev));
    return { data, error: null };
  }, []);

  const complete = useCallback(async (id, winnerId) => {
    setError(null);
    const { data, error } = await completeTest(id, winnerId);
    if (error) {
      console.error("Error completing test:", error);
      setError(error);
      return { data: null, error };
    }
    setTests((prev) => prev.map((t) => (t.id === id ? data : t)));
    setActiveTest((prev) => (prev?.id === id ? data : prev));
    return { data, error: null };
  }, []);

  const getResults = useCallback(async (id) => {
    setError(null);
    const { data, error } = await getTestResults(id);
    if (error) {
      console.error("Error fetching results:", error);
      setError(error);
      return { data: null, error };
    }
    return { data, error: null };
  }, []);

  // Fetch tests on mount and when brand changes
  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return {
    tests,
    activeTest,
    setActiveTest,
    loading,
    error,
    fetchTests,
    fetchTest,
    create,
    update,
    remove,
    addVariant,
    removeVariant,
    start,
    pause,
    complete,
    getResults,
  };
}
