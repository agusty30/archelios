import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ensureCircleUser,
  acquireCircleUserSession,
  getCircleUserStatus,
  initializeCircleWalletChallenge,
  syncMyCircleWallets,
  getMyUserWalletBalance,
  createUserTransferChallenge,
} from "@/lib/circle-user-wallets.functions";
import { PageHeader } from "./route";
import { Card, CardHead, EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/app/wallet")({
  head: () => ({ meta: [{ title: "Wallet · Archelios" }] }),
  component: WalletPage,
});

const CIRCLE_APP_ID = "1fb6f1fa-488c-51af-b5b0-90f63eec267e";

async function loadCircleSdk() {
  const mod = await import("@circle-fin/w3s-pw-web-sdk");
  return mod.W3SSdk;
}

function WalletPage() {
  const qc = useQueryClient();
  const sdkRef = useRef<any>(null);
  const [session, setSession] = useState<{ userToken: string; encryptionKey: string } | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const initAttempted = useRef(false);

  const bootstrap = useMutation({
    mutationFn: async () => {
      setSdkReady(false);
      sdkRef.current = null;
      await ensureCircleUser();
      return await acquireCircleUserSession();
    },
    onSuccess: async (s) => {
      setSession(s);
      const W3SSdk = await loadCircleSdk();
      const sdk = new W3SSdk({ appSettings: { appId: CIRCLE_APP_ID } });
      sdk.setAuthentication({ userToken: s.userToken, encryptionKey: s.encryptionKey });
      sdkRef.current = sdk;
      setSdkReady(true);
    },
    onError: (e: any) => {
      setSdkReady(false);
      sdkRef.current = null;
      toast.error(e.message ?? "Failed to init Circle session");
    },
  });

  useEffect(() => {
    bootstrap.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusQ = useQuery({
    queryKey: ["circle-user-status", session?.userToken],
    queryFn: () => getCircleUserStatus({ data: { userToken: session!.userToken } }),
    enabled: !!session?.userToken,
    refetchInterval: 8000,
  });

  const walletsQ = useQuery({
    queryKey: ["circle-wallets", session?.userToken, statusQ.data?.hasWallet],
    queryFn: () => syncMyCircleWallets({ data: { userToken: session!.userToken } }),
    enabled: !!session?.userToken && !!statusQ.data?.hasWallet,
  });
  const primary = walletsQ.data?.wallets?.[0];

  const balQ = useQuery({
    queryKey: ["circle-balance", primary?.id],
    queryFn: () =>
      getMyUserWalletBalance({ data: { userToken: session!.userToken, walletId: primary!.id } }),
    enabled: !!session?.userToken && !!primary?.id,
    refetchInterval: 15000,
  });

  const initMut = useMutation({
    mutationFn: async () => {
      const sdk = sdkRef.current;
      if (!session?.userToken || !sdkReady || !sdk?.execute) {
        throw new Error("Circle secure wallet setup is still loading. Please try again.");
      }
      const { challengeId } = await initializeCircleWalletChallenge({
        data: { userToken: session.userToken },
      });
      return new Promise<void>((resolve, reject) => {
        sdk.execute(challengeId, (error: any, result: any) => {
          if (error) {
            if (error?.code === 155106) return resolve();
            return reject(new Error(error?.message ?? "Wallet creation cancelled"));
          }
          if (result?.status === "COMPLETE") resolve();
          else reject(new Error(`Status: ${result?.status ?? "unknown"}`));
        });
      });
    },
    onSuccess: async () => {
      toast.success("Wallet created — your keys, your funds.");
      await statusQ.refetch();
      qc.invalidateQueries({ queryKey: ["circle-wallets"] });
    },
    onError: (e: any) => {
      if (/155106|already.*initialized/i.test(e?.message ?? "")) {
        statusQ.refetch();
        qc.invalidateQueries({ queryKey: ["circle-wallets"] });
        return;
      }
      toast.error(e.message ?? "Wallet setup failed");
    },
  });

  // Auto-trigger wallet creation when session is ready and user has no wallet
  useEffect(() => {
    if (
      session &&
      statusQ.data &&
      !statusQ.data.hasWallet &&
      !initAttempted.current &&
      !initMut.isPending &&
      sdkReady &&
      sdkRef.current
    ) {
      initAttempted.current = true;
      initMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusQ.data, sdkReady]);

  const [dest, setDest] = useState("");
  const [amt, setAmt] = useState("");
  const sendMut = useMutation({
    mutationFn: async () => {
      const sdk = sdkRef.current;
      if (!session?.userToken || !sdkReady || !sdk?.execute) {
        throw new Error("Circle secure PIN prompt is still loading. Please try again.");
      }
      if (!balQ.data?.tokenId) throw new Error("No USDC found. Fund your wallet from the faucet first.");
      const { challengeId } = await createUserTransferChallenge({
        data: {
          userToken: session.userToken,
          walletId: primary!.id,
          tokenId: balQ.data.tokenId,
          destinationAddress: dest,
          amountUsd: parseFloat(amt),
        },
      });
      return new Promise<any>((resolve, reject) => {
        sdk.execute(challengeId, (error: any, result: any) => {
          if (error) return reject(new Error(error?.message ?? "Send cancelled"));
          resolve(result);
        });
      });
    },
    onSuccess: (r: any) => {
      toast.success(`Sent — ${r?.status ?? "submitted"}`);
      setDest("");
      setAmt("");
      qc.invalidateQueries({ queryKey: ["circle-balance"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Send failed"),
  });

  const copy = (v: string, label = "Copied") => {
    navigator.clipboard.writeText(v);
    toast.success(label);
  };

  const notReady = !session || bootstrap.isPending;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Wallet"
        subtitle="Your self-custody Circle wallet on ARC Testnet — protected by your PIN, not by us."
      />

      {notReady && (
        <Card>
          <EmptyState title="Initializing…" body="Setting up your Circle session." />
        </Card>
      )}

      {session && statusQ.data && !statusQ.data.hasWallet && (
        <Card className="max-w-2xl">
          <CardHead title="Create your wallet" />
          <p className="text-sm text-muted-foreground mb-5">
            Your wallet is <span className="font-medium text-foreground">user-controlled</span> — Archelios never
            sees your PIN or keys. Circle will guide you through creating a 6-digit PIN in a secure iframe.
          </p>
          <button
            disabled={initMut.isPending || !sdkReady}
            onClick={() => { initAttempted.current = true; initMut.mutate(); }}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-medium disabled:opacity-40"
          >
            {!sdkReady
              ? "Loading secure setup…"
              : initMut.isPending
                ? "Opening secure setup…"
                : "Create wallet with PIN"}
          </button>
        </Card>
      )}

      {session && statusQ.data?.hasWallet && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 bg-primary text-primary-foreground border-primary">
              <p className="text-[11px] uppercase tracking-widest opacity-70">Available balance</p>
              <p className="mt-3 font-display text-5xl sm:text-6xl tracking-tight tabular-nums">
                ${balQ.data?.available ?? "—"}
              </p>
              <p className="mt-1.5 text-sm opacity-70">USDC · ARC Testnet · self-custody</p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { l: "Deposit", to: "#receive" },
                  { l: "Send USDC", to: "#send" },
                  { l: "Bridge", to: "/app/bridge" },
                  { l: "Remit", to: "/app/remittance" },
                ].map((b) => (
                  <a
                    key={b.l}
                    href={b.to}
                    className="text-center rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-2.5 text-xs font-medium transition"
                  >
                    {b.l}
                  </a>
                ))}
              </div>
            </Card>

            <Card id="receive">
              <CardHead title="Receive" />
              {primary?.address ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white p-4 grid place-items-center border border-border">
                    <QRCodeSVG value={primary.address} size={140} bgColor="#ffffff" fgColor="#0f1216" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Wallet address
                    </p>
                    <p className="mt-1 font-mono text-xs break-all">{primary.address}</p>
                    <button
                      onClick={() => copy(primary.address, "Address copied")}
                      className="mt-2 text-xs text-foreground hover:underline"
                    >
                      Copy address
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Fund testnet USDC at{" "}
                    <a
                      className="underline"
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      faucet.circle.com
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <EmptyState title="Loading address…" body="Fetching from Circle." />
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card id="send">
              <CardHead title="Send USDC" />
              <div className="space-y-3">
                <Field label="Destination address">
                  <input
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder="0x…"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <Field label="Amount (USDC)">
                  <input
                    value={amt}
                    inputMode="decimal"
                    onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
                <button
                  disabled={
                    sendMut.isPending ||
                    !dest.startsWith("0x") ||
                    !(parseFloat(amt) > 0) ||
                    !primary?.id ||
                    !sdkReady
                  }
                  onClick={() => sendMut.mutate()}
                  className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium disabled:opacity-40"
                >
                  {sendMut.isPending ? "Enter PIN in the Circle popup…" : "Send USDC (requires PIN)"}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Circle opens a secure iframe to collect your PIN and sign the transaction. Archelios
                  never sees your PIN.
                </p>
              </div>
            </Card>

            <Card>
              <CardHead title="Wallet info" />
              <dl className="text-sm space-y-3">
                <Row label="Network" value="Arc Testnet" />
                <Row label="Wallet type" value="Circle SCA · User-controlled" />
                <Row
                  label="Wallet ID"
                  value={<span className="font-mono text-xs">{primary?.id?.slice(0, 12)}…</span>}
                />
                <Row label="Custody" value="You hold the PIN · Archelios cannot move funds" />
                <Row label="PIN status" value={statusQ.data?.pinStatus} />
              </dl>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 last:border-0 pb-2 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
