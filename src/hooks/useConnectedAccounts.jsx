import { useCallback, useEffect, useState } from "react";
import { supabase, isConfigured } from "../services/supabase";
import { useAuth } from "./useAuth";
import { connectPlatform, disconnectPlatform } from "../services/platforms";

const DEMO_ACCOUNTS_KEY = "karaya_demo_connected_accounts";

// Default demo data: pre-seded with 2 Threads accounts to showcase multi-account
const DEFAULT_DEMO_ACCOUNTS = [
  {
    id: "demo-ig-1",
    platform: "instagram",
    platform_username: "@karaya_studio",
    account_label: "Karaya Studio",
    status: "active",
    platform_avatar_url: null,
    connected_at: new Date().toISOString(),
  },
  {
    id: "demo-threads-1",
    platform: "threads",
    platform_username: "@karaya_studio",
    account_label: "Karaya Studio",
    status: "active",
    platform_avatar_url: null,
    connected_at: new Date().toISOString(),
  },
  {
    id: "demo-threads-2",
    platform: "threads",
    platform_username: "@karaya_personal",
    account_label: "Personal",
    status: "active",
    platform_avatar_url: null,
    connected_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-tw-1",
    platform: "twitter",
    platform_username: "@karaya_id",
    account_label: "Karaya ID",
    status: "active",
    platform_avatar_url: null,
    connected_at: new Date().toISOString(),
  },
];

function loadDemoAccounts() {
  try {
    const stored = localStorage.getItem(DEMO_ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_DEMO_ACCOUNTS;
  } catch {
    return DEFAULT_DEMO_ACCOUNTS;
  }
}

function saveDemoAccounts(accounts) {
  try {
    localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export function useConnectedAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectResult, setConnectResult] = useState(null); // { type, platform, message }

  const fetchAccounts = useCallback(async () => {
    setLoading(true);

    if (!isConfigured) {
      setAccounts(loadDemoAccounts());
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });

    if (!error) setAccounts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Deteksi redirect balik dari OAuth provider (?connected=platform&username=xxx)
  useEffect(() => {
    if (!isConfigured) return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const username = params.get("username");
    const error = params.get("error");

    if (connected) {
      // Refresh daftar akun dari DB
      fetchAccounts();
      setConnectResult({
        type: "success",
        platform: connected,
        message: `Akun ${username ? `@${username}` : connected} berhasil terhubung!`,
      });
      // Bersihkan URL params agar tidak muncul lagi saat refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    } else if (error) {
      setConnectResult({
        type: "error",
        platform: params.get("platform") || "unknown",
        message: decodeURIComponent(error),
      });
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss result notification after 4 seconds
  useEffect(() => {
    if (!connectResult) return;
    const t = setTimeout(() => setConnectResult(null), 4000);
    return () => clearTimeout(t);
  }, [connectResult]);

  // connect(platform, username) — always ADDS a new account, never overwrites
  // username: for demo mode to label the account (e.g. "@brand_a")
  async function connect(platform, username = "") {
    if (!isConfigured) {
      const label = username || `@demo_${platform}_${Date.now().toString(36)}`;
      const newAccount = {
        id: crypto.randomUUID(),
        platform,
        platform_username: label,
        account_label: username ? username.replace(/^@/, "") : `Demo Account`,
        status: "active",
        platform_avatar_url: null,
        connected_at: new Date().toISOString(),
      };
      const updated = [newAccount, ...accounts];
      setAccounts(updated);
      saveDemoAccounts(updated);
      setConnectResult({
        type: "demo",
        platform,
        message: `Akun ${label} berhasil ditambahkan (Demo Mode).`,
      });
      return { success: true, account: newAccount };
    }

    // Real OAuth — redirect to platform login
    const { data, error } = await connectPlatform(platform);
    if (error) {
      setConnectResult({ type: "error", platform, message: error });
      return { success: false };
    }

    const redirectUrl = data?.redirectUrl;
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return { success: true };
    } else {
      setConnectResult({
        type: "error",
        platform,
        message: "Gagal mendapatkan URL OAuth.",
      });
      return { success: false };
    }
  }

  // disconnect(accountId) — disconnects ONE specific account by its ID
  async function disconnect(accountId) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    if (!isConfigured) {
      const updated = accounts.filter((a) => a.id !== accountId);
      setAccounts(updated);
      saveDemoAccounts(updated);
      setConnectResult({
        type: "success",
        platform: account.platform,
        message: `Akun ${account.platform_username} berhasil diputuskan.`,
      });
      return;
    }

    const { error } = await disconnectPlatform(account.platform, accountId);
    if (error) {
      setConnectResult({
        type: "error",
        platform: account.platform,
        message: error,
      });
      return;
    }

    await fetchAccounts();
    setConnectResult({
      type: "success",
      platform: account.platform,
      message: `Akun ${account.platform_username} berhasil diputuskan.`,
    });
  }

  // Returns all active accounts for a specific platform (array)
  function getAccountsForPlatform(platform) {
    return accounts.filter(
      (a) => a.platform === platform && a.status === "active",
    );
  }

  // Returns true if platform has at least one connected account
  function isConnected(platform) {
    return accounts.some(
      (a) => a.platform === platform && a.status === "active",
    );
  }

  function clearResult() {
    setConnectResult(null);
  }

  return {
    accounts,
    loading,
    connect,
    disconnect,
    getAccountsForPlatform,
    isConnected,
    fetchAccounts,
    connectResult,
    clearResult,
  };
}
