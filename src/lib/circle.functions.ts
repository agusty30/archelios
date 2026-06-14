import { createServerFn } from "@tanstack/react-start";
import { publicEncrypt, constants, randomBytes } from "node:crypto";



const CIRCLE_BASE = "https://api-sandbox.circle.com";

function authHeaders() {
  const key = process.env.CIRCLE_API_KEY;
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

/** Live Circle business account USDC balance (sandbox). */
export const getBalance = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const json = await circleFetch("/v1/businessAccount/balances");
    const usdc = (json?.data?.available ?? []).find(
      (b: any) => b.currency === "USD",
    );
    return { available: usdc?.amount ?? "0.00", currency: "USD" };
  } catch (e: any) {
    return { available: "0.00", currency: "USD", error: e.message as string };
  }
});

/** Create a USDC payout (Circle sandbox: master wallet -> blockchain address). */
export const sendTransfer = createServerFn({ method: "POST" })
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
    // 1) Resolve the sandbox master wallet ID
    const cfg = await circleFetch("/v1/configuration");
    const masterWalletId = cfg?.data?.payments?.masterWalletId;
    if (!masterWalletId) throw new Error("No master wallet configured in sandbox");

    const chain = data.chain ?? "MATIC";
    const idempotencyKey = crypto.randomUUID();

    const body = {
      idempotencyKey,
      source: { type: "wallet", id: masterWalletId },
      destination: {
        type: "blockchain",
        address: data.recipientAddress.trim(),
        chain,
      },
      amount: { amount: data.amountUsd.toFixed(2), currency: "USD" },
    };

    const json = await circleFetch("/v1/transfers", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      id: json?.data?.id as string,
      status: json?.data?.status as string,
      createDate: json?.data?.createDate as string,
      recipientName: data.recipientName,
      corridor: data.corridor,
    };
  });

export const getTransfer = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data }) => {
    const json = await circleFetch(`/v1/transfers/${data.id}`);
    return json?.data;
  });

export const listTransfers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const json = await circleFetch("/v1/transfers?pageSize=20");
    return (json?.data ?? []) as any[];
  } catch (e: any) {
    return [] as any[];
  }
});
