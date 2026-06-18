import { createServerFn } from "@tanstack/react-start";
import { publicEncrypt, constants, randomBytes } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";



const CIRCLE_BASE = "https://api.circle.com";

function authHeaders() {
  const rawKey = process.env.CIRCLE_API_KEY?.trim();
  const key = rawKey && rawKey.split(":").length === 2 ? `TEST_API_KEY:${rawKey}` : rawKey;
  if (!key) throw new Error("CIRCLE_API_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function circleFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${CIRCLE_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    throw new Error(`Circle API ${res.status}: ${msg}`);
  }
  return json;
}

/** Supported destination corridors with mocked FX (sandbox-friendly). */
const CORRIDORS = {
  PHP: { name: "Philippines", flag: "🇵🇭", rate: 58.42, symbol: "₱" },
  INR: { name: "India", flag: "🇮🇳", rate: 83.21, symbol: "₹" },
  NGN: { name: "Nigeria", flag: "🇳🇬", rate: 1547.5, symbol: "₦" },
  MXN: { name: "Mexico", flag: "🇲🇽", rate: 17.18, symbol: "$" },
  KES: { name: "Kenya", flag: "🇰🇪", rate: 129.4, symbol: "KSh" },
  EUR: { name: "Eurozone", flag: "🇪🇺", rate: 0.92, symbol: "€" },
  IDR: { name: "Indonesia", flag: "🇮🇩", rate: 16250, symbol: "Rp" },
} as const;

export type CorridorCode = keyof typeof CORRIDORS;

export const getCorridors = createServerFn({ method: "GET" }).handler(async () => {
  return Object.entries(CORRIDORS).map(([code, c]) => ({ code, ...c }));
});

/** Transparent quote: flat 0.5% network fee + 0 spread on FX. */
export const getQuote = createServerFn({ method: "POST" })
  .inputValidator((d: { amountUsd: number; corridor: CorridorCode }) => {
    if (!d || typeof d.amountUsd !== "number" || d.amountUsd <= 0) throw new Error("Invalid amount");
    if (!CORRIDORS[d.corridor]) throw new Error("Unsupported corridor");
    return d;
  })
  .handler(async ({ data }) => {
    const corridor = CORRIDORS[data.corridor];
    const feePct = 0.005; // 0.5% transparent network fee
    const fee = +(data.amountUsd * feePct).toFixed(2);
    const sendAmount = +(data.amountUsd - fee).toFixed(2);
    const receiveAmount = +(sendAmount * corridor.rate).toFixed(2);
    return {
      amountUsd: data.amountUsd,
      fee,
      feePct,
      sendAmount,
      rate: corridor.rate,
      receiveAmount,
      corridor: { code: data.corridor, ...corridor },
      etaSeconds: 30,
    };
  });

/** Pick the first dev-controlled wallet that holds USDC (fallback: first wallet). */
async function pickDefaultWallet(): Promise<{ wallet: any; usdc: any | null } | null> {
  const wlist = await circleFetch("/v1/w3s/wallets?pageSize=50");
  const wallets = (wlist?.data?.wallets ?? []) as any[];
  if (wallets.length === 0) return null;
  for (const w of wallets) {
    try {
      const b = await circleFetch(`/v1/w3s/wallets/${encodeURIComponent(w.id)}/balances`);
      const list = (b?.data?.tokenBalances ?? []) as any[];
      const usdc = list.find((x) => (x.token?.symbol || "").toUpperCase() === "USDC");
      if (usdc) return { wallet: w, usdc };
    } catch {}
  }
  return { wallet: wallets[0], usdc: null };
}

/** Treasury USDC balance — uses the dev-controlled wallet (W3S). */
export const getBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  try {
    const picked = await pickDefaultWallet();
    if (!picked) {
      return {
        available: "0.00",
        currency: "USD",
        error: "No dev-controlled wallet found. Create one in /wallets first.",
      };
    }
    return {
      available: picked.usdc?.amount ?? "0.00",
      currency: "USD",
    };
  } catch (e: any) {
    return { available: "0.00", currency: "USD", error: e.message as string };
  }
});

/** Send USDC from the default dev-controlled wallet to a blockchain address. */
export const sendTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      amountUsd: number;
      corridor: CorridorCode;
      recipientName: string;
      recipientAddress: string;
      chain?: "MATIC" | "ETH" | "ARB" | "BASE";
    }) => {
      if (!d.amountUsd || d.amountUsd <= 0) throw new Error("Invalid amount");
      if (!d.recipientName?.trim()) throw new Error("Recipient name required");
      if (!d.recipientAddress?.trim()) throw new Error("Recipient address required");
      if (!CORRIDORS[d.corridor]) throw new Error("Unsupported corridor");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const picked = await pickDefaultWallet();
    if (!picked) throw new Error("No dev-controlled wallet found. Create one in /wallets first.");
    if (!picked.usdc?.token?.id) {
      throw new Error("Treasury wallet has no USDC. Fund it via the Circle faucet first.");
    }

    const entitySecretCiphertext = await makeEntitySecretCiphertext();
    const body = {
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext,
      walletId: picked.wallet.id,
      destinationAddress: data.recipientAddress.trim(),
      tokenId: picked.usdc.token.id,
      amounts: [data.amountUsd.toFixed(2)],
      feeLevel: "MEDIUM",
    };
    const json = await circleFetch("/v1/w3s/developer/transactions/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const tx = json?.data ?? {};
    return {
      id: (tx.id ?? "") as string,
      status: (tx.state ?? "PENDING") as string,
      createDate: new Date().toISOString(),
      recipientName: data.recipientName,
      corridor: data.corridor,
    };
  });

export const getTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data }) => {
    const json = await circleFetch(`/v1/w3s/transactions/${encodeURIComponent(data.id)}`);
    return json?.data?.transaction;
  });

/** Recent W3S transactions, mapped to the UI's transfer shape. */
export const listTransfers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const json = await circleFetch("/v1/w3s/transactions?pageSize=20");
    const txs = (json?.data?.transactions ?? []) as any[];
    return txs.map((t) => ({
      id: t.id,
      status: (t.state || "").toLowerCase(),
      createDate: t.createDate,
      destination: { chain: t.blockchain },
      amount: { amount: Array.isArray(t.amounts) ? t.amounts[0] : t.amount },
    }));
  } catch {
    return [] as any[];
  }
});

/* ===================== Dev-Controlled Wallets ===================== */

let _publicKeyPem: string | null = null;
async function getEntityPublicKey(): Promise<string> {
  if (_publicKeyPem) return _publicKeyPem;
  const json = await circleFetch("/v1/w3s/config/entity/publicKey");
  const pem = json?.data?.publicKey;
  if (!pem) throw new Error("Failed to fetch Circle entity public key");
  _publicKeyPem = pem;
  return pem;
}

async function makeEntitySecretCiphertext(): Promise<string> {
  const secretHex = process.env.CIRCLE_ENTITY_SECRET;
  if (!secretHex) throw new Error("CIRCLE_ENTITY_SECRET not configured");
  if (!/^[0-9a-fA-F]{64}$/.test(secretHex.trim())) {
    throw new Error("CIRCLE_ENTITY_SECRET must be 64 hex characters");
  }
  const pem = await getEntityPublicKey();
  const encrypted = publicEncrypt(
    {
      key: pem,
      oaepHash: "sha256",
      padding: constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(secretHex.trim(), "hex"),
  );
  return encrypted.toString("base64");
}

/** Create a wallet set (container for dev-controlled wallets). */
export const createWalletSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => {
    if (!d?.name?.trim()) throw new Error("Wallet set name required");
    return d;
  })
  .handler(async ({ data }) => {
    const entitySecretCiphertext = await makeEntitySecretCiphertext();
    const json = await circleFetch("/v1/w3s/developer/walletSets", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        entitySecretCiphertext,
        name: data.name.trim(),
      }),
    });
    return json?.data?.walletSet;
  });

/** Create one or more dev-controlled wallets in a wallet set. */
export const createDevWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      walletSetId: string;
      blockchains?: string[];
      count?: number;
      accountType?: "SCA" | "EOA";
    }) => {
      if (!d?.walletSetId) throw new Error("walletSetId required");
      return d;
    },
  )
  .handler(async ({ data }) => {
    const entitySecretCiphertext = await makeEntitySecretCiphertext();
    const body = {
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext,
      walletSetId: data.walletSetId,
      blockchains: data.blockchains ?? ["MATIC-AMOY"],
      count: data.count ?? 1,
      accountType: data.accountType ?? "SCA",
    };
    const json = await circleFetch("/v1/w3s/developer/wallets", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return json?.data?.wallets ?? [];
  });

/** List all wallet sets. */
export const listWalletSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  try {
    const json = await circleFetch("/v1/w3s/walletSets?pageSize=20");
    return (json?.data?.walletSets ?? []) as any[];
  } catch (e: any) {
    return [] as any[];
  }
});

/** List wallets (optionally filtered by walletSetId). */
export const listDevWallets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { walletSetId?: string }) => d ?? {})
  .handler(async ({ data }) => {
    const qs = data?.walletSetId ? `?walletSetId=${encodeURIComponent(data.walletSetId)}&pageSize=50` : "?pageSize=50";
    try {
      const json = await circleFetch(`/v1/w3s/wallets${qs}`);
      return (json?.data?.wallets ?? []) as any[];
    } catch (e: any) {
      return [] as any[];
    }
  });

/** List token balances for a dev-controlled wallet. */
export const getWalletBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { walletId: string }) => {
    if (!d?.walletId) throw new Error("walletId required");
    return d;
  })
  .handler(async ({ data }) => {
    const json = await circleFetch(
      `/v1/w3s/wallets/${encodeURIComponent(data.walletId)}/balances`,
    );
    return (json?.data?.tokenBalances ?? []) as any[];
  });

/**
 * Send a USDC transfer from a dev-controlled wallet to a blockchain address.
 * Automatically resolves the USDC tokenId on the wallet's blockchain.
 */
export const sendDevWalletTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      walletId: string;
      destinationAddress: string;
      amountUsd: number;
      tokenId?: string;
      feeLevel?: "LOW" | "MEDIUM" | "HIGH";
    }) => {
      if (!d?.walletId) throw new Error("walletId required");
      if (!d?.destinationAddress?.trim()) throw new Error("destinationAddress required");
      if (!d?.amountUsd || d.amountUsd <= 0) throw new Error("Invalid amount");
      return d;
    },
  )
  .handler(async ({ data }) => {
    // Resolve USDC tokenId on this wallet if not provided
    let tokenId = data.tokenId;
    if (!tokenId) {
      const balances = await circleFetch(
        `/v1/w3s/wallets/${encodeURIComponent(data.walletId)}/balances`,
      );
      const list = (balances?.data?.tokenBalances ?? []) as any[];
      const usdc = list.find(
        (b) => (b.token?.symbol || "").toUpperCase() === "USDC",
      );
      if (!usdc?.token?.id) {
        throw new Error(
          "No USDC token found on this wallet. Fund it with testnet USDC from the Circle faucet first.",
        );
      }
      tokenId = usdc.token.id as string;
    }

    const entitySecretCiphertext = await makeEntitySecretCiphertext();
    const body = {
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext,
      walletId: data.walletId,
      destinationAddress: data.destinationAddress.trim(),
      tokenId,
      amounts: [data.amountUsd.toFixed(2)],
      feeLevel: data.feeLevel ?? "MEDIUM",
    };
    const json = await circleFetch("/v1/w3s/developer/transactions/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return json?.data;
  });
