import { createServerFn } from "@tanstack/react-start";
import { publicEncrypt, constants } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Circle User-Controlled Wallets — Email OTP / Social Login / PIN
 *
 * Each end-user gets their own Circle wallet. Authentication is handled
 * by the Circle Web SDK (email OTP, social login, or PIN).
 * The developer backend can NEVER sign a transfer — only the user's
 * browser can, via the Circle Web SDK.
 */

const CIRCLE_BASE = "https://api.circle.com";
const DEFAULT_BLOCKCHAIN = "ARC-TESTNET";

function authHeaders(extra?: Record<string, string>) {
  const rawKey = process.env.CIRCLE_API_KEY?.trim();
  const key = rawKey && rawKey.split(":").length === 2 ? `TEST_API_KEY:${rawKey}` : rawKey;
  if (!key) throw new Error("CIRCLE_API_KEY not configured");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(extra || {}) };
}

async function circleFetch(path: string, init?: RequestInit, userToken?: string) {
  const headers: Record<string, string> = { ...authHeaders() };
  if (userToken) headers["X-User-Token"] = userToken;
  const res = await fetch(`${CIRCLE_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
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

// ----- entity-secret ciphertext (required to authorize wallet-level ops) -----
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

/**
 * 1. Ensure the signed-in Supabase user has a matching Circle user record.
 *    We use the Supabase user.id as the Circle userId (must be <= 50 chars, ASCII).
 */
export const ensureCircleUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    try {
      await circleFetch("/v1/w3s/users", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
    } catch (err: any) {
      const msg = err?.message ?? "";
      const isAlreadyExists =
        /already\s*(exists|created)|userAlreadyExisted|155101/i.test(msg) ||
        msg.includes("409");
      if (!isAlreadyExists) throw err;
    }

    // Store the circle_user_id on the user_wallets mapping row so we can
    // look it up quickly later. We may not yet have any wallet — insert a
    // placeholder row only if none exists for wallet_type = 'USER'.
    const { data: existing } = await supabase
      .from("user_wallets")
      .select("circle_user_id, address, circle_wallet_id")
      .eq("user_id", userId)
      .eq("wallet_type", "USER")
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_wallets").insert({
        user_id: userId,
        circle_user_id: userId,
        circle_wallet_id: "",
        address: "",
        blockchain: DEFAULT_BLOCKCHAIN,
        wallet_type: "USER",
      });
    } else if (!existing.circle_user_id) {
      await supabase
        .from("user_wallets")
        .update({ circle_user_id: userId })
        .eq("user_id", userId)
        .eq("wallet_type", "USER");
    }

    return { circleUserId: userId };
  });

/**
 * 2. Get a short-lived user session token (userToken + encryptionKey) for
 *    the browser to authenticate calls to Circle via the Web SDK.
 *    The client attaches these to the SDK before calling `.execute(challengeId)`.
 */
export const acquireCircleUserSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const json = await circleFetch("/v1/w3s/users/token", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    return {
      userToken: json?.data?.userToken as string,
      encryptionKey: json?.data?.encryptionKey as string,
    };
  });

/**
 * 3. Get the user's current wallet status (has PIN? initialized?).
 */
export const getCircleUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userToken: string }) => {
    if (!d?.userToken) throw new Error("userToken required");
    return d;
  })
  .handler(async ({ data }) => {
    const json = await circleFetch("/v1/w3s/user", { method: "GET" }, data.userToken);
    const status = (json?.data?.status ?? "UNKNOWN") as string;
    const pinStatus = (json?.data?.pinStatus ?? "UNSET") as string;
    const securityQuestionStatus = (json?.data?.securityQuestionStatus ?? "UNSET") as string;
    const hasWallet = status === "ENABLED" || pinStatus === "ENABLED";
    return { status, pinStatus, securityQuestionStatus, hasWallet };
  });

/**
 * 4. Ask Circle to create the initialization challenge (SET_PIN + CREATE_WALLET).
 *    The browser then executes it via the Web SDK to actually create the wallet.
 */
export const initializeCircleWalletChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userToken: string }) => {
    if (!d?.userToken) throw new Error("userToken required");
    return d;
  })
  .handler(async ({ data }) => {
    const entitySecretCiphertext = await makeEntitySecretCiphertext();
    const json = await circleFetch(
      "/v1/w3s/user/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          entitySecretCiphertext,
          blockchains: [DEFAULT_BLOCKCHAIN],
          accountType: "SCA",
        }),
      },
      data.userToken,
    );
    return { challengeId: json?.data?.challengeId as string };
  });

/**
 * 5. List the user's Circle wallets and mirror the primary one into user_wallets.
 *    Called after the SDK challenge finishes.
 */
export const syncMyCircleWallets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userToken: string }) => {
    if (!d?.userToken) throw new Error("userToken required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const json = await circleFetch("/v1/w3s/wallets?pageSize=20", { method: "GET" }, data.userToken);
    const wallets = (json?.data?.wallets ?? []) as any[];
    const primary = wallets.find((w) => w.blockchain === DEFAULT_BLOCKCHAIN) ?? wallets[0];
    if (primary?.id && primary?.address) {
      await supabase.from("user_wallets").upsert(
        {
          user_id: userId,
          circle_user_id: userId,
          circle_wallet_id: primary.id,
          address: primary.address,
          blockchain: primary.blockchain ?? DEFAULT_BLOCKCHAIN,
          wallet_type: "USER",
        },
        { onConflict: "user_id,wallet_type" as any },
      );
    }
    return {
      wallets: wallets.map((w) => ({
        id: w.id,
        address: w.address,
        blockchain: w.blockchain,
        state: w.state,
      })),
    };
  });

/**
 * 6. Fetch USDC balance for the user's own Circle wallet (via userToken).
 */
export const getMyUserWalletBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userToken: string; walletId: string }) => {
    if (!d?.userToken || !d?.walletId) throw new Error("userToken + walletId required");
    return d;
  })
  .handler(async ({ data }) => {
    const bal = await circleFetch(
      `/v1/w3s/wallets/${encodeURIComponent(data.walletId)}/balances`,
      { method: "GET" },
      data.userToken,
    );
    const list = (bal?.data?.tokenBalances ?? []) as any[];
    const usdc = list.find((x) => (x.token?.symbol || "").toUpperCase() === "USDC");
    return {
      available: usdc?.amount ?? "0.00",
      currency: "USD",
      tokenId: (usdc?.token?.id ?? null) as string | null,
    };
  });

/**
 * 7. Create a transfer challenge — the SDK opens a PIN prompt to sign.
 */
export const createUserTransferChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    userToken: string;
    walletId: string;
    tokenId: string;
    destinationAddress: string;
    amountUsd: number;
  }) => {
    if (!d?.userToken) throw new Error("userToken required");
    if (!d?.walletId) throw new Error("walletId required");
    if (!d?.tokenId) throw new Error("tokenId required (fund your wallet with USDC first)");
    if (!d?.destinationAddress?.trim()) throw new Error("destinationAddress required");
    if (!d?.amountUsd || d.amountUsd <= 0) throw new Error("Invalid amount");
    return d;
  })
  .handler(async ({ data }) => {
    const json = await circleFetch(
      "/v1/w3s/user/transactions/transfer",
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          walletId: data.walletId,
          destinationAddress: data.destinationAddress.trim(),
          tokenId: data.tokenId,
          amounts: [data.amountUsd.toFixed(2)],
          feeLevel: "MEDIUM",
        }),
      },
      data.userToken,
    );
    return {
      challengeId: json?.data?.challengeId as string,
    };
  });
