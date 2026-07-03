import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { getOrCreateMyWallet, getMyWalletBalance, sendFromMyWallet } from "@/lib/user-wallets.functions";
import { PageHeader } from "./route";
import { Card, CardHead, EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/app/wallet")({
  head: () => ({ meta: [{ title: "Wallet · Archelios" }] }),
  component: WalletPage,
});

function WalletPage() {
  const qc = useQueryClient();
  const walletQ = useQuery({ queryKey: ["my-wallet"], queryFn: () => getOrCreateMyWallet() });
  const balQ = useQuery({
    queryKey: ["my-wallet", "balance", walletQ.data?.walletId],
    queryFn: () => getMyWalletBalance(),
    enabled: !!walletQ.data?.walletId,
    refetchInterval: 15000,
  });

  const [dest, setDest] = useState("");
  const [amt, setAmt] = useState("");

  const sendMut = useMutation({
    mutationFn: () => sendFromMyWallet({ data: { destinationAddress: dest, amountUsd: parseFloat(amt) } }),
    onSuccess: (r) => {
      toast.success(`Sent — ${r.status}`);
      setDest(""); setAmt("");
      qc.invalidateQueries({ queryKey: ["my-wallet", "balance"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Send failed"),
  });

  const copy = (v: string, label = "Copied") => { navigator.clipboard.writeText(v); toast.success(label); };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Wallet" subtitle="Your Circle-managed USDC wallet on ARC Testnet." />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Balance */}
        <Card className="lg:col-span-2 bg-primary text-primary-foreground border-primary">
          <p className="text-[11px] uppercase tracking-widest opacity-70">Available balance</p>
          <p className="mt-3 font-display text-5xl sm:text-6xl tracking-tight tabular-nums">
            ${balQ.data?.available ?? "—"}
          </p>
          <p className="mt-1.5 text-sm opacity-70">USDC · ARC Testnet</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { l: "Deposit", to: "#receive" },
              { l: "Send USDC", to: "#send" },
              { l: "Bridge", to: "/app/bridge" },
              { l: "Remit", to: "/app/remittance" },
            ].map((b) => (
              <a key={b.l} href={b.to}
                className="text-center rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-2.5 text-xs font-medium transition">
                {b.l}
              </a>
            ))}
          </div>
        </Card>

        {/* Address + QR */}
        <Card id="receive">
          <CardHead title="Receive" />
          {walletQ.data ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 grid place-items-center border border-border">
                <QRCodeSVG value={walletQ.data.address} size={140} bgColor="#ffffff" fgColor="#0f1216" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet address</p>
                <p className="mt-1 font-mono text-xs break-all">{walletQ.data.address}</p>
                <button
                  onClick={() => copy(walletQ.data!.address, "Address copied")}
                  className="mt-2 text-xs text-foreground hover:underline"
                >Copy address</button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fund testnet USDC at{" "}
                <a className="underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
                  faucet.circle.com
                </a>.
              </p>
            </div>
          ) : (
            <EmptyState title="Provisioning…" body="We're creating your Circle wallet." />
          )}
        </Card>
      </div>

      {/* Send */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card id="send">
          <CardHead title="Send USDC" />
          <div className="space-y-3">
            <Field label="Destination address">
              <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="0x…"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Amount (USDC)">
              <input value={amt} inputMode="decimal" onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <button
              disabled={sendMut.isPending || !dest.startsWith("0x") || !(parseFloat(amt) > 0)}
              onClick={() => sendMut.mutate()}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium disabled:opacity-40"
            >
              {sendMut.isPending ? "Submitting…" : "Send USDC"}
            </button>
          </div>
        </Card>

        <Card>
          <CardHead title="Wallet info" />
          <dl className="text-sm space-y-3">
            <Row label="Network" value="Arc Testnet" />
            <Row label="Wallet type" value="Circle SCA · Programmable" />
            <Row label="Wallet ID" value={<span className="font-mono text-xs">{walletQ.data?.walletId?.slice(0, 12)}…</span>} />
            <Row label="Custody" value="Circle-managed · non-custodial to platform" />
          </dl>
        </Card>
      </div>
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
