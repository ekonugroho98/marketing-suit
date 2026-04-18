import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isConfigured } from "../services/supabase";
import { useAuth } from "./useAuth";

const DEMO_BRAND = {
  id: "demo-brand",
  name: "Karaya Studio",
  niche: "Digital Marketing & Copywriting",
  description: "Platform edukasi digital marketing untuk creator Indonesia",
  target_audience: "Content creator & digital product seller usia 20-35 tahun",
  tone: ["Santai", "Edukatif", "Friendly"],
  favorite_words: ["gratis", "tanpa ribet", "auto cuan", "gampang banget"],
  avoided_words: ["murah", "diskon besar", "beli sekarang"],
  primary_color: "#10b981",
  secondary_color: "#0d1117",
};

async function fetchBrandsFromSupabase(userId) {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export function useBrand() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeBrand, setActiveBrand] = useState(null);

  const {
    data: brands = [],
    isLoading: loading,
    refetch: fetchBrands,
  } = useQuery({
    queryKey: ["brands", user?.id],
    queryFn: async () => {
      if (!isConfigured) {
        return [DEMO_BRAND];
      }
      return fetchBrandsFromSupabase(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Set activeBrand when brands are first loaded or change
  useEffect(() => {
    if (brands.length > 0 && !activeBrand) {
      setActiveBrand(brands[0]);
    }
  }, [brands, activeBrand]);

  const createBrandMutation = useMutation({
    mutationFn: async (brandData) => {
      if (!isConfigured) {
        const newBrand = { ...brandData, id: crypto.randomUUID() };
        return newBrand;
      }
      const { data, error } = await supabase
        .from("brands")
        .insert({ ...brandData, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newBrand) => {
      queryClient.setQueryData(["brands", user?.id], (old = []) => [
        newBrand,
        ...old,
      ]);
      setActiveBrand(newBrand);
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured) {
        return { id, ...updates };
      }
      const { data, error } = await supabase
        .from("brands")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedBrand) => {
      queryClient.setQueryData(["brands", user?.id], (old = []) =>
        old.map((b) => (b.id === updatedBrand.id ? updatedBrand : b)),
      );
      if (activeBrand?.id === updatedBrand.id) {
        setActiveBrand(updatedBrand);
      }
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id) => {
      if (!isConfigured) {
        return id;
      }
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["brands", user?.id], (old = []) =>
        old.filter((b) => b.id !== deletedId),
      );
      if (activeBrand?.id === deletedId) {
        const remaining = queryClient.getQueryData(["brands", user?.id]) || [];
        setActiveBrand(remaining[0] || null);
      }
    },
  });

  // Wrapper functions to preserve the existing API surface
  async function createBrand(brandData) {
    return createBrandMutation.mutateAsync(brandData);
  }

  async function updateBrand(id, updates) {
    return updateBrandMutation.mutateAsync({ id, updates });
  }

  async function deleteBrand(id) {
    return deleteBrandMutation.mutateAsync(id);
  }

  return {
    brands,
    activeBrand,
    setActiveBrand,
    loading,
    createBrand,
    updateBrand,
    deleteBrand,
    fetchBrands,
  };
}
