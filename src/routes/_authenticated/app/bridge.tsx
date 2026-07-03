import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getRemittanceQuote } from "@/lib/remittances.functions";
import { PageHeader } from "./route";
import { Card, CardHead } from "./index";

export const Route = createFileRoute("/_authenticated/app/bridge")({
  head: () => ({ meta: [{ title: "Bridge · Archelios" }] }),
  component: BridgePage,
});

const CHAINS = [
  { id: "ARC-TESTNET", label: "Arc Testnet", native: true },
  { id: "ETH-SEPOLIA", label: "Ethereum (via CCTP v2)" },
  { id: "SOL-DEVNET", label: "Solana (via CCTP v2)" },
  { id: "PHAROS", label: "Pharos (preview)" },
];

function BridgePage() {
  const [src, setSrc] = useState("ARC-TESTNET");
  const [dst, setDst] = useState("ETH-SEPOLIA");
  const [amt, setAmt] = useState("50");

  const q = useQuery({
    queryKey: ["bridge-quote", src, dst, amt],
    queryFn: () => getRemittanceQuote({ data: { amountUsd: parseFloat(amt) || 0, corridor: "USD", sourceChain: src, destinationChain: dst } }),
    enabled: parseFloat(amt) > 0,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader title="Bridge USDC" subtitle="Cross-chain USDC via Circle CCTP v2." />

      <Card>
        <CardHead title="Route" />
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-end">
          <ChainPicker label="From" value={src} onChange={setSrc} />
          <div className="text-muted-foreground text-2xl pb-2 text-center">→</div>
          <ChainPicker label="To" value={dst} onChange={setDst} />
        </div>
        <div className="mt-6">
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Amount</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-muted-foreground">$</span>
              <input value={amt} inputMode="decimal" onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent font-display text-4xl tracking-tight outline-none" />
              <span className="text-sm text-muted-foreground">USDC</span>
            </div>
          </label>
        </div>

        {q.data && (
          <div className="mt-6 rounded-xl bg-secondary p-4 space-y-2 text-sm">
            <Row label="Bridge fee" value={`$${q.data.networkFee.toFixed(2)}`} />
            <Row label="Platform fee" value={`$${q.data.platformFee.toFixed(2)}`} />
            <Row label="Estimated time" value={`~${q.data.etaSeconds}s`} />
            <Row label="Route type" value={q.data.bridged ? "CCTP v2 burn/mint" : "Same-chain transfer"} />
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          CCTP v2 quotes on the ARC sandbox are indicative. Real bridge execution will unlock as Circle enables the corridor.
          For real ARC ↔ ARC transfers, use{" "}
          <Link to="/app/remittance" className="underline">Remittance</Link>.
        </p>

        <button disabled className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium opacity-50">
          Bridge · sandbox preview
        </button>
      </Card>
    </div>
  );
}

function ChainPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
        {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
