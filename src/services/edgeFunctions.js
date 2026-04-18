import { supabase, isConfigured } from "./supabase";

const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function buildHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    "Content-Type": "application/json",
  };
}

async function parseResponse(res) {
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text?.slice(0, 500) || res.statusText };
  }
  return { payload, res };
}

function errorMessageFrom(payload, res) {
  const errVal = payload?.error ?? payload?.message;
  return (
    (typeof errVal === "string" && errVal) ||
    (errVal != null ? JSON.stringify(errVal) : null) ||
    res.statusText ||
    `HTTP ${res.status}`
  );
}

/**
 * Panggil Edge Function via fetch + refresh token otomatis jika 401.
 * Returns { data, error } — never throws.
 */
export async function invokeEdgeFunction(functionName, body) {
  try {
    if (!isConfigured || !baseUrl || !anonKey) {
      return { data: null, error: "Supabase belum dikonfigurasi" };
    }

    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const { data: ref, error: refErr } = await supabase.auth.refreshSession();
      if (refErr || !ref?.session?.access_token) {
        return { data: null, error: "Sesi habis — silakan login ulang" };
      }
      session = ref.session;
    }

    let accessToken = session.access_token;

    const url = `${baseUrl}/functions/v1/${encodeURIComponent(functionName)}`;
    const reqBody = JSON.stringify(body ?? {});

    let res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(accessToken),
      body: reqBody,
    });

    if (res.status === 401) {
      const { data: refreshed, error: refreshErr } =
        await supabase.auth.refreshSession();
      if (refreshErr || !refreshed?.session?.access_token) {
        return {
          data: null,
          error:
            "Sesi kedaluwarsa (401). Silakan keluar lalu login lagi, lalu coba Sinkron.",
        };
      }
      accessToken = refreshed.session.access_token;
      res = await fetch(url, {
        method: "POST",
        headers: buildHeaders(accessToken),
        body: reqBody,
      });
    }

    const { payload } = await parseResponse(res);

    if (!res.ok) {
      return { data: null, error: errorMessageFrom(payload, res) };
    }

    if (payload && typeof payload === "object" && payload.error != null) {
      const errVal = payload.error;
      return {
        data: null,
        error: typeof errVal === "string" ? errVal : JSON.stringify(errVal),
      };
    }

    return { data: payload, error: null };
  } catch (err) {
    return { data: null, error: err.message || "Unknown error" };
  }
}
