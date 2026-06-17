import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listDevWallets,
  listWalletSets,
  getWalletBalances,
  sendDevWalletTransfer,
  listTransfers,
} from "@/lib/circle.functions";

export const Route = createFileRoute("/sme")({
  head: () => ({
    meta: [
      { title: "SME Finance & Trade — Swift Send" },
      {
        name: "description",
        content:
          "Prototype SME finance workflows on USDC: invoice factoring, trade escrow, PO financing, and an on-chain credit passport.",
      },
      { property: "og:title", content: "SME Finance & Trade — Swift Send" },
      {
        property: "og:description",
        content:
          "Programmable USDC rails for invoice factoring, trade escrow, PO financing, and credit passport.",
      },
    ],
  }),
  component: SmePage,
});

type TabId = "factoring" | "escrow" | "po" | "passport";

const TABS: { id: TabId; label: string; sub: string }[] = [
  { id: "factoring", label: "Invoice factoring", sub: "Receivables financing + repayment waterfall" },
  { id: "escrow", label: "Trade escrow", sub: "Milestone-based USDC release" },
  { id: "po", label: "PO financing", sub: "Proof-of-delivery trigger" },
  { id: "passport", label: "Credit passport", sub: "On-chain repayment history" },
];

function SmePage() {
  const [tab, setTab] = useState<TabId>("factoring");
  const [sourceWalletId, setSourceWalletId] = useState<string>("");

  const { data: walletSets = [] } = useQuery({
    queryKey: ["walletSets"],
    queryFn: () => listWalletSets(),
  });

  const firstSetId = walletSets[0]?.id as string | undefined;

  const { data: wallets = [] } = useQuery({
    queryKey: ["devWallets", firstSetId ?? "none"],
    queryFn: () => listDevWallets({ data: { walletSetId: firstSetId } }),
    enabled: !!firstSetId,
  });

  useEffect(() => {
    if (!sourceWalletId && wallets[0]?.id) setSourceWalletId(wallets[0].id);
  }, [wallets, sourceWalletId]);

  const { data: balances = [] } = useQuery({
    queryKey: ["walletBalances", sourceWalletId],
    queryFn: () => getWalletBalances({ data: { walletId: sourceWalletId } }),
    enabled: !!sourceWalletId,
    refetchInterval: 15000,
  });

  const usdc = (balances as any[]).find(
    (b) => (b.token?.symbol || "").toUpperCase() === "USDC",
  );
  const usdcBalance = parseFloat(usdc?.amount ?? "0");

  return (
    <main className="min-h-screen bg-background bg-grain pb-20">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-display text-lg">↻</Link>
            <div>
              <h1 className="text-base font-display font-semibold leading-none">SME Finance Hub</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">USDC-native trade & working capital</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Treasury</p>
            <p className="font-mono text-sm tabular-nums">${usdcBalance.toFixed(2)}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-6 space-y-6">
        <section className="rounded-3xl bg-card shadow-[var(--shadow-soft)] p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Funding wallet (source of USDC)
          </p>
          <select
            value={sourceWalletId}
            onChange={(e) => setSourceWalletId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— select a dev wallet —</option>
            {(wallets as any[]).map((w) => (
              <option key={w.id} value={w.id}>
                {w.blockchain} · {w.address?.slice(0, 10)}… ({w.id.slice(0, 8)}…)
              </option>
            ))}
          </select>
          {!firstSetId && (
            <p className="text-xs text-muted-foreground">
              No wallet set yet. <Link to="/wallets" className="text-primary underline">Create one first →</Link>
            </p>
          )}
          {sourceWalletId && (
            <p className="text-xs text-muted-foreground">
              Available: <span className="font-mono">${usdcBalance.toFixed(2)} USDC</span>
            </p>
          )}
        </section>

        <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                tab === t.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-secondary"
              }`}
            >
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.sub}</p>
            </button>
          ))}
        </nav>

        {tab === "factoring" && <FactoringPanel sourceWalletId={sourceWalletId} />}
        {tab === "escrow" && <EscrowPanel sourceWalletId={sourceWalletId} />}
        {tab === "po" && <PoPanel sourceWalletId={sourceWalletId} />}
        {tab === "passport" && <PassportPanel />}
      </div>
    </main>
  );
}

/* ===================== Shared deal store (localStorage) ===================== */

type DealKind = "factoring" | "escrow" | "po";

type LedgerEntry = {
  ts: number;
  kind: "advance" | "release" | "repay";
  amountUsd: number;
  txId?: string;
  note?: string;
};

type Deal = {
  id: string;
  kind: DealKind;
  createdAt: number;
  // common
  counterparty: string;
  destinationAddress: string;
  faceValueUsd: number;
  // factoring
  advanceRateBps?: number; // e.g. 8500 = 85%
  feeBps?: number; // e.g. 200 = 2%
  // escrow / po
  milestones?: { label: string; amountUsd: number; released: boolean; txId?: string }[];
  poDelivered?: boolean;
  status: "open" | "funded" | "settled" | "defaulted";
  ledger: LedgerEntry[];
};

const STORE_KEY = "sme.deals.v1";

function loadDeals(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveDeals(d: Deal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}

function useDeals(kind: DealKind) {
  const [all, setAll] = useState<Deal[]>([]);
  useEffect(() => setAll(loadDeals()), []);
  const list = useMemo(() => all.filter((d) => d.kind === kind), [all, kind]);
  const upsert = (d: Deal) => {
    const next = [...all.filter((x) => x.id !== d.id), d];
    setAll(next);
    saveDeals(next);
  };
  const remove = (id: string) => {
    const next = all.filter((x) => x.id !== id);
    setAll(next);
    saveDeals(next);
  };
  const refresh = () => setAll(loadDeals());
  return { list, all, upsert, remove, refresh };
}

/* ===================== Invoice Factoring ===================== */

function FactoringPanel({ sourceWalletId }: { sourceWalletId: string }) {
  const { list, upsert, remove } = useDeals("factoring");
  const [counterparty, setCounterparty] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("0xa66fc57404cd34342fe5d9a92598ee48b6eff898");
  const [face, setFace] = useState("1000");
  const [advanceBps, setAdvanceBps] = useState("8500");
  const [feeBps, setFeeBps] = useState("200");

  const createDeal = () => {
    const d: Deal = {
      id: crypto.randomUUID(),
      kind: "factoring",
      createdAt: Date.now(),
      counterparty: counterparty || "Acme SME Ltd",
      destinationAddress,
      faceValueUsd: parseFloat(face) || 0,
      advanceRateBps: parseInt(advanceBps) || 8500,
      feeBps: parseInt(feeBps) || 200,
      status: "open",
      ledger: [],
    };
    upsert(d);
    setCounterparty("");
    setDestinationAddress("");
  };

  return (
    <div className="space-y-5">
      <Card title="New invoice" subtitle="Borrower assigns receivable; we advance USDC immediately.">
        <Grid>
          <Input label="Borrower (SME)" value={counterparty} onChange={setCounterparty} placeholder="Acme SME Ltd" />
          <Input label="Face value (USD)" value={face} onChange={setFace} inputMode="decimal" />
          <Input label="Advance rate (bps)" value={advanceBps} onChange={setAdvanceBps} hint="8500 = 85%" />
          <Input label="Factoring fee (bps)" value={feeBps} onChange={setFeeBps} hint="200 = 2%" />
          <Input
            label="Borrower payout address"
            value={destinationAddress}
            onChange={setDestinationAddress}
            placeholder="0x…"
            full
            mono
          />
        </Grid>
        <PrimaryBtn onClick={createDeal} disabled={!destinationAddress.startsWith("0x") || !(parseFloat(face) > 0)}>
          Register invoice
        </PrimaryBtn>
      </Card>

      {list.length === 0 && <EmptyState text="No invoices yet — register one above." />}
      {list.map((d) => (
        <FactoringDealCard key={d.id} deal={d} sourceWalletId={sourceWalletId} onChange={upsert} onDelete={remove} />
      ))}
    </div>
  );
}

function FactoringDealCard({
  deal,
  sourceWalletId,
  onChange,
  onDelete,
}: {
  deal: Deal;
  sourceWalletId: string;
  onChange: (d: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const advanceAmt = (deal.faceValueUsd * (deal.advanceRateBps ?? 0)) / 10000;
  const feeAmt = (deal.faceValueUsd * (deal.feeBps ?? 0)) / 10000;
  const investorReturn = advanceAmt + feeAmt; // simplified waterfall
  const borrowerResidual = deal.faceValueUsd - investorReturn;

  const advanced = deal.ledger.find((l) => l.kind === "advance");
  const repaid = deal.ledger.filter((l) => l.kind === "repay").reduce((s, l) => s + l.amountUsd, 0);

  const advance = useMutation({
    mutationFn: () =>
      sendDevWalletTransfer({
        data: {
          walletId: sourceWalletId,
          destinationAddress: deal.destinationAddress,
          amountUsd: round2(advanceAmt),
        },
      }),
    onSuccess: (res: any) => {
      onChange({
        ...deal,
        status: "funded",
        ledger: [
          ...deal.ledger,
          { ts: Date.now(), kind: "advance", amountUsd: round2(advanceAmt), txId: res?.id, note: "Advance to borrower" },
        ],
      });
    },
  });

  const markRepaid = () => {
    onChange({
      ...deal,
      status: "settled",
      ledger: [
        ...deal.ledger,
        { ts: Date.now(), kind: "repay", amountUsd: deal.faceValueUsd, note: "Buyer paid invoice (simulated)" },
      ],
    });
  };

  return (
    <Card title={deal.counterparty} subtitle={`Invoice ${deal.id.slice(0, 8)} · face $${deal.faceValueUsd.toFixed(2)}`}>
      <StatusBadge status={deal.status} />
      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
        <Stat label="Advance" value={`$${advanceAmt.toFixed(2)}`} hint={`${(deal.advanceRateBps ?? 0) / 100}%`} />
        <Stat label="Factoring fee" value={`$${feeAmt.toFixed(2)}`} hint={`${(deal.feeBps ?? 0) / 100}%`} />
        <Stat label="Investor return" value={`$${investorReturn.toFixed(2)}`} />
        <Stat label="Borrower residual on repay" value={`$${borrowerResidual.toFixed(2)}`} />
      </div>

      <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs space-y-1">
        <p className="font-medium uppercase tracking-wider text-muted-foreground">Repayment waterfall</p>
        <p>1. Investor principal + fee — ${investorReturn.toFixed(2)}</p>
        <p>2. Borrower residual — ${borrowerResidual.toFixed(2)}</p>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {!advanced && (
          <PrimaryBtn
            onClick={() => advance.mutate()}
            disabled={!sourceWalletId || advance.isPending}
          >
            {advance.isPending ? "Advancing…" : `Advance $${advanceAmt.toFixed(2)} USDC`}
          </PrimaryBtn>
        )}
        {deal.status === "funded" && (
          <GhostBtn onClick={markRepaid}>Mark buyer-paid (settle)</GhostBtn>
        )}
        <GhostBtn onClick={() => onDelete(deal.id)}>Delete</GhostBtn>
      </div>

      {advance.error && <ErrorMsg>{(advance.error as Error).message}</ErrorMsg>}
      <Ledger entries={deal.ledger} />
      <p className="text-[11px] text-muted-foreground mt-2">
        Repaid: ${repaid.toFixed(2)} / ${deal.faceValueUsd.toFixed(2)}
      </p>
    </Card>
  );
}

/* ===================== Trade Escrow ===================== */

function EscrowPanel({ sourceWalletId }: { sourceWalletId: string }) {
  const { list, upsert, remove } = useDeals("escrow");
  const [counterparty, setCounterparty] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("0xa66fc57404cd34342fe5d9a92598ee48b6eff898");
  const [m1, setM1] = useState("300");
  const [m2, setM2] = useState("400");
  const [m3, setM3] = useState("300");

  const create = () => {
    const milestones = [
      { label: "Deposit on PO signed", amountUsd: parseFloat(m1) || 0, released: false },
      { label: "Bill of Lading issued", amountUsd: parseFloat(m2) || 0, released: false },
      { label: "Goods received & accepted", amountUsd: parseFloat(m3) || 0, released: false },
    ];
    const d: Deal = {
      id: crypto.randomUUID(),
      kind: "escrow",
      createdAt: Date.now(),
      counterparty: counterparty || "Exporter Co",
      destinationAddress,
      faceValueUsd: milestones.reduce((s, m) => s + m.amountUsd, 0),
      milestones,
      status: "open",
      ledger: [],
    };
    upsert(d);
    setCounterparty("");
    setDestinationAddress("");
  };

  return (
    <div className="space-y-5">
      <Card title="New trade escrow" subtitle="Importer locks USDC; releases unlock per milestone.">
        <Grid>
          <Input label="Exporter / beneficiary" value={counterparty} onChange={setCounterparty} placeholder="Exporter Co" />
          <Input label="Exporter USDC address" value={destinationAddress} onChange={setDestinationAddress} placeholder="0x…" full mono />
          <Input label="Milestone 1 (USD)" value={m1} onChange={setM1} inputMode="decimal" />
          <Input label="Milestone 2 (USD)" value={m2} onChange={setM2} inputMode="decimal" />
          <Input label="Milestone 3 (USD)" value={m3} onChange={setM3} inputMode="decimal" />
        </Grid>
        <PrimaryBtn onClick={create} disabled={!destinationAddress.startsWith("0x")}>
          Open escrow
        </PrimaryBtn>
      </Card>

      {list.length === 0 && <EmptyState text="No escrows open." />}
      {list.map((d) => (
        <EscrowDealCard key={d.id} deal={d} sourceWalletId={sourceWalletId} onChange={upsert} onDelete={remove} />
      ))}
    </div>
  );
}

function EscrowDealCard({
  deal,
  sourceWalletId,
  onChange,
  onDelete,
}: {
  deal: Deal;
  sourceWalletId: string;
  onChange: (d: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);

  const release = useMutation({
    mutationFn: async (idx: number) => {
      setPendingIdx(idx);
      const m = deal.milestones![idx];
      const res: any = await sendDevWalletTransfer({
        data: {
          walletId: sourceWalletId,
          destinationAddress: deal.destinationAddress,
          amountUsd: round2(m.amountUsd),
        },
      });
      return { idx, txId: res?.id, amount: m.amountUsd };
    },
    onSuccess: ({ idx, txId, amount }) => {
      const milestones = deal.milestones!.map((m, i) => (i === idx ? { ...m, released: true, txId } : m));
      const settled = milestones.every((m) => m.released);
      onChange({
        ...deal,
        milestones,
        status: settled ? "settled" : "funded",
        ledger: [
          ...deal.ledger,
          { ts: Date.now(), kind: "release", amountUsd: round2(amount), txId, note: `Milestone ${idx + 1}` },
        ],
      });
      setPendingIdx(null);
    },
    onError: () => setPendingIdx(null),
  });

  return (
    <Card title={deal.counterparty} subtitle={`Escrow ${deal.id.slice(0, 8)} · total $${deal.faceValueUsd.toFixed(2)}`}>
      <StatusBadge status={deal.status} />
      <ul className="space-y-2 mt-3">
        {deal.milestones!.map((m, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
            <span className={`size-2 rounded-full ${m.released ? "bg-success" : "bg-muted-foreground/40"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.label}</p>
              {m.txId && <p className="text-[11px] text-muted-foreground font-mono truncate">tx {m.txId.slice(0, 14)}…</p>}
            </div>
            <p className="text-sm font-mono tabular-nums">${m.amountUsd.toFixed(2)}</p>
            {!m.released && (
              <PrimaryBtn
                small
                disabled={!sourceWalletId || pendingIdx !== null}
                onClick={() => release.mutate(i)}
              >
                {pendingIdx === i ? "Releasing…" : "Release"}
              </PrimaryBtn>
            )}
          </li>
        ))}
      </ul>
      {release.error && <ErrorMsg>{(release.error as Error).message}</ErrorMsg>}
      <div className="mt-4">
        <GhostBtn onClick={() => onDelete(deal.id)}>Delete</GhostBtn>
      </div>
    </Card>
  );
}

/* ===================== PO Financing ===================== */

function PoPanel({ sourceWalletId }: { sourceWalletId: string }) {
  const { list, upsert, remove } = useDeals("po");
  const [supplier, setSupplier] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("0xa66fc57404cd34342fe5d9a92598ee48b6eff898");
  const [face, setFace] = useState("5000");

  const create = () => {
    const d: Deal = {
      id: crypto.randomUUID(),
      kind: "po",
      createdAt: Date.now(),
      counterparty: supplier || "Supplier Co",
      destinationAddress,
      faceValueUsd: parseFloat(face) || 0,
      poDelivered: false,
      status: "open",
      ledger: [],
    };
    upsert(d);
    setSupplier("");
    setDestinationAddress("");
  };

  return (
    <div className="space-y-5">
      <Card title="New purchase order" subtitle="Fund supplier 30% upfront; release 70% on proof-of-delivery.">
        <Grid>
          <Input label="Supplier" value={supplier} onChange={setSupplier} placeholder="Supplier Co" />
          <Input label="PO value (USD)" value={face} onChange={setFace} inputMode="decimal" />
          <Input label="Supplier USDC address" value={destinationAddress} onChange={setDestinationAddress} placeholder="0x…" full mono />
        </Grid>
        <PrimaryBtn onClick={create} disabled={!destinationAddress.startsWith("0x") || !(parseFloat(face) > 0)}>
          Register PO
        </PrimaryBtn>
      </Card>

      {list.length === 0 && <EmptyState text="No POs registered." />}
      {list.map((d) => (
        <PoDealCard key={d.id} deal={d} sourceWalletId={sourceWalletId} onChange={upsert} onDelete={remove} />
      ))}
    </div>
  );
}

function PoDealCard({
  deal,
  sourceWalletId,
  onChange,
  onDelete,
}: {
  deal: Deal;
  sourceWalletId: string;
  onChange: (d: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const upfront = round2(deal.faceValueUsd * 0.3);
  const onDelivery = round2(deal.faceValueUsd - upfront);
  const sentUpfront = deal.ledger.find((l) => l.note === "Upfront 30%");
  const sentFinal = deal.ledger.find((l) => l.note === "Proof-of-delivery release");

  const fund = useMutation({
    mutationFn: () =>
      sendDevWalletTransfer({
        data: { walletId: sourceWalletId, destinationAddress: deal.destinationAddress, amountUsd: upfront },
      }),
    onSuccess: (res: any) =>
      onChange({
        ...deal,
        status: "funded",
        ledger: [
          ...deal.ledger,
          { ts: Date.now(), kind: "advance", amountUsd: upfront, txId: res?.id, note: "Upfront 30%" },
        ],
      }),
  });

  const release = useMutation({
    mutationFn: () =>
      sendDevWalletTransfer({
        data: { walletId: sourceWalletId, destinationAddress: deal.destinationAddress, amountUsd: onDelivery },
      }),
    onSuccess: (res: any) =>
      onChange({
        ...deal,
        status: "settled",
        ledger: [
          ...deal.ledger,
          { ts: Date.now(), kind: "release", amountUsd: onDelivery, txId: res?.id, note: "Proof-of-delivery release" },
        ],
      }),
  });

  return (
    <Card title={deal.counterparty} subtitle={`PO ${deal.id.slice(0, 8)} · $${deal.faceValueUsd.toFixed(2)}`}>
      <StatusBadge status={deal.status} />
      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
        <Stat label="Upfront (30%)" value={`$${upfront.toFixed(2)}`} />
        <Stat label="On delivery (70%)" value={`$${onDelivery.toFixed(2)}`} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/60 p-3 text-sm">
        <span className="text-muted-foreground">Proof-of-delivery</span>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!deal.poDelivered}
            onChange={(e) => onChange({ ...deal, poDelivered: e.target.checked })}
          />
          <span className="text-xs">{deal.poDelivered ? "Verified" : "Pending"}</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {!sentUpfront && (
          <PrimaryBtn onClick={() => fund.mutate()} disabled={!sourceWalletId || fund.isPending}>
            {fund.isPending ? "Sending…" : `Send upfront $${upfront.toFixed(2)}`}
          </PrimaryBtn>
        )}
        {sentUpfront && !sentFinal && (
          <PrimaryBtn
            onClick={() => release.mutate()}
            disabled={!sourceWalletId || !deal.poDelivered || release.isPending}
          >
            {release.isPending ? "Releasing…" : `Release on delivery $${onDelivery.toFixed(2)}`}
          </PrimaryBtn>
        )}
        <GhostBtn onClick={() => onDelete(deal.id)}>Delete</GhostBtn>
      </div>

      {(fund.error || release.error) && (
        <ErrorMsg>{((fund.error || release.error) as Error).message}</ErrorMsg>
      )}
      <Ledger entries={deal.ledger} />
    </Card>
  );
}

/* ===================== Credit Passport ===================== */

function PassportPanel() {
  const [all, setAll] = useState<Deal[]>([]);
  useEffect(() => setAll(loadDeals()), []);

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => listTransfers(),
  });

  // Aggregate per counterparty
  const passports = useMemo(() => {
    const map = new Map<string, {
      name: string;
      addresses: Set<string>;
      totalFinanced: number;
      totalRepaid: number;
      dealsOpen: number;
      dealsSettled: number;
      dealsDefaulted: number;
      lastActivity: number;
    }>();
    for (const d of all) {
      const key = d.counterparty.toLowerCase();
      const p = map.get(key) ?? {
        name: d.counterparty,
        addresses: new Set<string>(),
        totalFinanced: 0,
        totalRepaid: 0,
        dealsOpen: 0,
        dealsSettled: 0,
        dealsDefaulted: 0,
        lastActivity: 0,
      };
      p.addresses.add(d.destinationAddress);
      for (const l of d.ledger) {
        if (l.kind === "advance" || l.kind === "release") p.totalFinanced += l.amountUsd;
        if (l.kind === "repay") p.totalRepaid += l.amountUsd;
        if (l.ts > p.lastActivity) p.lastActivity = l.ts;
      }
      if (d.status === "open" || d.status === "funded") p.dealsOpen += 1;
      if (d.status === "settled") p.dealsSettled += 1;
      if (d.status === "defaulted") p.dealsDefaulted += 1;
      map.set(key, p);
    }
    return Array.from(map.values()).sort((a, b) => b.totalFinanced - a.totalFinanced);
  }, [all]);

  const score = (p: (typeof passports)[number]) => {
    // Simple heuristic score 300-850
    const repaymentRatio = p.totalFinanced > 0 ? p.totalRepaid / p.totalFinanced : 0;
    const settledWeight = p.dealsSettled * 40;
    const defaultPenalty = p.dealsDefaulted * 120;
    const base = 500 + repaymentRatio * 250 + settledWeight - defaultPenalty;
    return Math.max(300, Math.min(850, Math.round(base)));
  };

  return (
    <div className="space-y-5">
      <Card
        title="SME credit passport"
        subtitle="Verifiable history derived from on-chain settlements + repayment behavior across deals."
      >
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="Counterparties" value={String(passports.length)} />
          <Stat label="Total financed" value={`$${passports.reduce((s, p) => s + p.totalFinanced, 0).toFixed(2)}`} />
          <Stat label="On-chain settlements" value={String((transfers as any[]).length)} />
        </div>
      </Card>

      {passports.length === 0 && <EmptyState text="Run a factoring, escrow, or PO deal to start building credit history." />}
      {passports.map((p) => {
        const s = score(p);
        const ratio = p.totalFinanced > 0 ? (p.totalRepaid / p.totalFinanced) * 100 : 0;
        return (
          <Card key={p.name} title={p.name} subtitle={`${p.addresses.size} address(es) on file`}>
            <div className="flex items-center gap-4">
              <div className="size-20 rounded-full grid place-items-center bg-primary/10 border border-primary/30">
                <div className="text-center">
                  <p className="text-2xl font-display font-semibold tabular-nums">{s}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">score</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1 text-sm">
                <Stat label="Financed" value={`$${p.totalFinanced.toFixed(2)}`} />
                <Stat label="Repaid" value={`$${p.totalRepaid.toFixed(2)}`} hint={`${ratio.toFixed(0)}%`} />
                <Stat label="Settled" value={String(p.dealsSettled)} />
                <Stat label="Open / defaulted" value={`${p.dealsOpen} / ${p.dealsDefaulted}`} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Last activity: {p.lastActivity ? new Date(p.lastActivity).toLocaleString() : "—"}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

/* ===================== UI primitives ===================== */

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card shadow-[var(--shadow-soft)] p-5 sm:p-6 space-y-3">
      <div>
        <h3 className="text-base font-display font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function Input({
  label,
  value,
  onChange,
  placeholder,
  hint,
  inputMode,
  full,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  inputMode?: "decimal" | "text";
  full?: boolean;
  mono?: boolean;
}) {
  return (
    <label className={`block space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        spellCheck={false}
        className={`w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
          mono ? "font-mono" : ""
        }`}
      />
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
function PrimaryBtn({
  children,
  onClick,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-primary text-primary-foreground font-medium transition active:scale-[0.98] disabled:opacity-40 ${
        small ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
      }`}
    >
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
    >
      {children}
    </button>
  );
}
function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {children}
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-medium font-mono tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
function StatusBadge({ status }: { status: Deal["status"] }) {
  const cls =
    status === "settled"
      ? "bg-success/15 text-success border-success/30"
      : status === "funded"
      ? "bg-primary/10 text-primary border-primary/30"
      : status === "defaulted"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
function Ledger({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-border bg-background/40 divide-y divide-border text-xs">
      {entries.map((e, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <span
            className={`size-1.5 rounded-full ${
              e.kind === "advance" ? "bg-primary" : e.kind === "release" ? "bg-success" : "bg-warning"
            }`}
          />
          <span className="uppercase tracking-wider text-muted-foreground w-16">{e.kind}</span>
          <span className="flex-1 truncate">{e.note}</span>
          <span className="font-mono tabular-nums">${e.amountUsd.toFixed(2)}</span>
          {e.txId && <span className="font-mono text-muted-foreground truncate max-w-[120px]">{e.txId.slice(0, 10)}…</span>}
        </div>
      ))}
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
