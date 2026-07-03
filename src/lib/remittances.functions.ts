import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicEncrypt, constants } from "node:crypto";

const CIRCLE_BASE = "https://api.circle.com";

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
async function makeCipher(): Promise<string> {
  const secretHex = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (!secretHex || !/^[0-9a-fA-F]{64}$/.test(secretHex)) throw new Error("CIRCLE_ENTITY_SECRET invalid");
  if (!_publicKeyPem) {
    const json = await circleFetch("/v1/w3s/config/entity/publicKey");
    _publicKeyPem = json?.data?.publicKey;
  }
  if (!_publicKeyPem) throw new Error("No entity public key");
  return publicEncrypt(
    { key: _publicKeyPem, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(secretHex, "hex"),
  ).toString("base64");
}

const CORRIDORS: Record<string, { rate: number; symbol: string; flag: string; name: string }> = {
  PHP: { rate: 58.42, symbol: "₱", flag: "🇵🇭", name: "Philippines" },
  INR: { rate: 83.21, symbol: "₹", flag: "🇮🇳", name: "India" },
  NGN: { rate: 1547.5, symbol: "₦", flag: "🇳🇬", name: "Nigeria" },
  MXN: { rate: 17.18, symbol: "$", flag: "🇲🇽", name: "Mexico" },
  KES: { rate: 129.4, symbol: "KSh", flag: "🇰🇪", name: "Kenya" },
  EUR: { rate: 0.92, symbol: "€", flag: "🇪🇺", name: "Eurozone" },
  IDR: { rate: 16250, symbol: "Rp", flag: "🇮🇩", name: "Indonesia" },
  USD: { rate: 1, symbol: "$", flag: "🇺🇸", name: "United States" },
};

/** Public: list corridors + fee model. */
export const getRemittanceQuote = createServerFn({ method: "POST" })
  .inputValidator((d: { amountUsd: number; corridor: string; sourceChain?: string; destinationChain?: string }) => {
    if (!(d?.amountUsd > 0)) throw new Error("amountUsd required");
    if (!CORRIDORS[d.corridor]) throw new Error("Unsupported corridor");
    return d;
  })
  .handler(async ({ data }) => {
    const c = CORRIDORS[data.corridor];
    const platformFeePct = 0.005;
    const platformFee = +(data.amountUsd * platformFeePct).toFixed(2);
    const bridge = data.sourceChain && data.destinationChain && data.sourceChain !== data.destinationChain;
    const networkFee = bridge ? 0.15 : 0.02; // simulated
    const totalFee = +(platformFee + networkFee).toFixed(2);
    const send = +(data.amountUsd - totalFee).toFixed(2);
    return {
      amountUsd: data.amountUsd,
      platformFee,
      networkFee,
      totalFee,
      feePct: platformFeePct,
      rate: c.rate,
      receiveAmount: +(send * c.rate).toFixed(2),
      corridor: { code: data.corridor, ...c },
      sourceChain: data.sourceChain ?? "ARC-TESTNET",
      destinationChain: data.destinationChain ?? "ARC-TESTNET",
      etaSeconds: bridge ? 90 : 25,
      bridged: !!bridge,
    };
  });

export const listCorridors = createServerFn({ method: "GET" }).handler(async () => {
  return Object.entries(CORRIDORS).map(([code, c]) => ({ code, ...c }));
});

/** Create a remittance: sends real USDC from user's Circle wallet, persists record. */
export const createRemittance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    amountUsd: number;
    corridor: string;
    recipientName: string;
    recipientAddress: string;
    destinationChain?: string;
  }) => {
    if (!(d?.amountUsd > 0)) throw new Error("Invalid amount");
    if (!d?.recipientName?.trim()) throw new Error("Recipient name required");
    if (!d?.recipientAddress?.trim().startsWith("0x")) throw new Error("Valid recipient address required");
    if (!CORRIDORS[d.corridor]) throw new Error("Unsupported corridor");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Get user's wallet
    const { data: row } = await supabase
      .from("user_wallets")
      .select("circle_wallet_id, address")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("No wallet — create one from Wallet page first.");

    // 2. Resolve USDC tokenId
    const balances = await circleFetch(`/v1/w3s/wallets/${encodeURIComponent(row.circle_wallet_id)}/balances`);
    const list = (balances?.data?.tokenBalances ?? []) as any[];
    const usdc = list.find((b) => (b.token?.symbol || "").toUpperCase() === "USDC");
    if (!usdc?.token?.id) throw new Error("No USDC on your wallet. Fund it from faucet.circle.com first.");

    const c = CORRIDORS[data.corridor];
    const platformFee = +(data.amountUsd * 0.005).toFixed(2);
    const networkFee = 0.02;
    const totalFee = +(platformFee + networkFee).toFixed(2);
    const sendAmt = +(data.amountUsd - totalFee).toFixed(2);
    const receiveAmount = +(sendAmt * c.rate).toFixed(2);
    const reference = "ARC-" + Math.random().toString(36).slice(2, 10).toUpperCase();

    // 3. Insert pending row
    const { data: rem, error: insErr } = await supabase
      .from("remittances")
      .insert({
        user_id: userId,
        status: "INITIATED",
        amount_usd: data.amountUsd,
        fee_usd: totalFee,
        corridor: data.corridor,
        fx_rate: c.rate,
        receive_amount: receiveAmount,
        recipient_name: data.recipientName.trim(),
        recipient_address: data.recipientAddress.trim(),
        source_chain: "ARC-TESTNET",
        destination_chain: data.destinationChain ?? "ARC-TESTNET",
        reference,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    // 4. Fire Circle transfer
    try {
      const entitySecretCiphertext = await makeCipher();
      const json = await circleFetch("/v1/w3s/developer/transactions/transfer", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          entitySecretCiphertext,
          walletId: row.circle_wallet_id,
          destinationAddress: data.recipientAddress.trim(),
          tokenId: usdc.token.id,
          amounts: [data.amountUsd.toFixed(2)],
          feeLevel: "MEDIUM",
        }),
      });
      const tx = json?.data ?? {};
      await supabase
        .from("remittances")
        .update({ circle_tx_id: tx.id ?? null, status: "PROCESSING" })
        .eq("id", rem.id);
      return { ...rem, circle_tx_id: tx.id, status: "PROCESSING" };
    } catch (e: any) {
      await supabase.from("remittances").update({ status: "FAILED" }).eq("id", rem.id);
      throw e;
    }
  });

export const listRemittances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("remittances")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const refreshRemittanceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("remittances")
      .select("id, circle_tx_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!r?.circle_tx_id) return r;
    try {
      const json = await circleFetch(`/v1/w3s/transactions/${encodeURIComponent(r.circle_tx_id)}`);
      const tx = json?.data?.transaction ?? {};
      const state = String(tx.state ?? "").toUpperCase();
      const status =
        state === "COMPLETE" ? "COMPLETE" :
        state === "FAILED" || state === "CANCELLED" ? "FAILED" :
        state === "SENT" || state === "CONFIRMED" ? "ONCHAIN" :
        "PROCESSING";
      const txHash = tx.txHash ?? tx.transactionHash ?? null;
      await context.supabase
        .from("remittances")
        .update({ status, tx_hash: txHash })
        .eq("id", r.id);
      return { id: r.id, status, tx_hash: txHash, raw: tx };
    } catch {
      return r;
    }
  });

/** Dashboard stats for the signed-in user. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase
      .from("remittances")
      .select("amount_usd, fee_usd, status, created_at");
    const list = rows ?? [];
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const month0 = new Date(); month0.setDate(1); month0.setHours(0, 0, 0, 0);
    const todayVol = list.filter((r: any) => new Date(r.created_at) >= today0).reduce((s: number, r: any) => s + Number(r.amount_usd || 0), 0);
    const monthVol = list.filter((r: any) => new Date(r.created_at) >= month0).reduce((s: number, r: any) => s + Number(r.amount_usd || 0), 0);
    const completed = list.filter((r: any) => r.status === "COMPLETE").length;
    const pending = list.filter((r: any) => !["COMPLETE", "FAILED"].includes(r.status)).length;
    const fees = list.reduce((s: number, r: any) => s + Number(r.fee_usd || 0), 0);
    return {
      todayVol: +todayVol.toFixed(2),
      monthVol: +monthVol.toFixed(2),
      completed,
      pending,
      fees: +fees.toFixed(2),
      totalCount: list.length,
      recent: list.slice(0, 30),
    };
  });
