import { createServerFn } from "@tanstack/react-start";
import { publicEncrypt, constants } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CIRCLE_BASE = "https://api.circle.com";
const USER_WALLET_SET_NAME = "SwiftSend User Wallets";
const DEFAULT_BLOCKCHAIN = "ARC-TESTNET";

function authHeaders() {
  const rawKey = process.env.CIRCLE_API_KEY?.trim();
  const key = rawKey && rawKey.split(":").length === 2 ? `TEST_API_KEY:${rawKey}` : rawKey;
  if (!key) throw new Error("CIRCLE_API_KEY not configured");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
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
  const secretHex = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (!secretHex) throw new Error("CIRCLE_ENTITY_SECRET not configured");
  if (!/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    throw new Error("CIRCLE_ENTITY_SECRET must be 64 hex characters");
  }
  const pem = await getEntityPublicKey();
  const encrypted = publicEncrypt(
    { key: pem, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(secretHex, "hex"),
  );
  return encrypted.toString("base64");
}

let _userWalletSetId: string | null = null;
async function getOrCreateUserWalletSet(): Promise<string> {
  if (_userWalletSetId) return _userWalletSetId;
  const list = await circleFetch("/v1/w3s/walletSets?pageSize=50");
  const sets = (list?.data?.walletSets ?? []) as any[];
  const found = sets.find((s) => s.name === USER_WALLET_SET_NAME);
  if (found?.id) {
    _userWalletSetId = found.id;
    return found.id;
  }
  const entitySecretCiphertext = await makeEntitySecretCiphertext();
  const created = await circleFetch("/v1/w3s/developer/walletSets", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      entitySecretCiphertext,
      name: USER_WALLET_SET_NAME,
    }),
  });
  const id = created?.data?.walletSet?.id as string;
  if (!id) throw new Error("Failed to create user wallet set");
  _userWalletSetId = id;
  return id;
}

/** Get the signed-in user's wallet (user-controlled or dev-controlled). */
export const getOrCreateMyWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!supabase?.from) return { walletId: "", address: "", blockchain: DEFAULT_BLOCKCHAIN };

    try {
      const { data: existing } = await supabase
        .from("user_wallets")
        .select("circle_wallet_id, address, blockchain")
        .eq("user_id", userId)
        .neq("circle_wallet_id", "")
        .neq("address", "")
        .maybeSingle();

      if (existing) {
        return {
          walletId: existing.circle_wallet_id,
          address: existing.address,
          blockchain: existing.blockchain,
        };
      }
    } catch {}

    return { walletId: "", address: "", blockchain: DEFAULT_BLOCKCHAIN };
  });

/** USDC balance for the signed-in user's wallet. */
export const getMyWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!supabase?.from) return { available: "0.00", currency: "USD", hasWallet: false };
    try {
      const { data: row } = await supabase
        .from("user_wallets")
        .select("circle_wallet_id")
        .eq("user_id", userId)
        .neq("circle_wallet_id", "")
        .maybeSingle();
      if (!row?.circle_wallet_id) return { available: "0.00", currency: "USD", hasWallet: false };
      const bal = await circleFetch(
        `/v1/w3s/wallets/${encodeURIComponent(row.circle_wallet_id)}/balances`,
      );
      const list = (bal?.data?.tokenBalances ?? []) as any[];
      const usdc = list.find((x) => (x.token?.symbol || "").toUpperCase() === "USDC");
      return {
        available: usdc?.amount ?? "0.00",
        currency: "USD",
        hasWallet: true,
      };
    } catch {
      return { available: "0.00", currency: "USD", hasWallet: false };
    }
  });

/** Send USDC from the signed-in user's wallet to a blockchain address. */
export const sendFromMyWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { destinationAddress: string; amountUsd: number }) => {
    if (!d?.destinationAddress?.trim()) throw new Error("destinationAddress required");
    if (!d?.amountUsd || d.amountUsd <= 0) throw new Error("Invalid amount");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("user_wallets")
      .select("circle_wallet_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("No wallet — create one first");

    const balances = await circleFetch(
      `/v1/w3s/wallets/${encodeURIComponent(row.circle_wallet_id)}/balances`,
    );
    const list = (balances?.data?.tokenBalances ?? []) as any[];
    const usdc = list.find((b) => (b.token?.symbol || "").toUpperCase() === "USDC");
    if (!usdc?.token?.id) {
      throw new Error(
        "No USDC on your wallet. Fund it from the Circle testnet faucet first.",
      );
    }

    const entitySecretCiphertext = await makeEntitySecretCiphertext();
    const json = await circleFetch("/v1/w3s/developer/transactions/transfer", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        entitySecretCiphertext,
        walletId: row.circle_wallet_id,
        destinationAddress: data.destinationAddress.trim(),
        tokenId: usdc.token.id,
        amounts: [data.amountUsd.toFixed(2)],
        feeLevel: "MEDIUM",
      }),
    });
    const tx = json?.data ?? {};
    return {
      id: (tx.id ?? "") as string,
      status: (tx.state ?? "PENDING") as string,
    };
  });
