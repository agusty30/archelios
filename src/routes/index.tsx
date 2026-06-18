import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  getCorridors,
  getQuote,
  listTransfers,
  type CorridorCode,
} from "@/lib/circle.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Swift Send — Transparent USDC Remittance" },
      {
        name: "description",
        content:
          "Send money globally in seconds. Transparent 0.5% fee, real-time USDC settlement on Circle. No hidden FX spread.",
      },
      { property: "og:title", content: "Swift Send — Transparent USDC Remittance" },
      {
        property: "og:description",
        content: "Send money globally in seconds with real-time USDC settlement.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "/icon-512.png" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery({ queryKey: ["corridors"], queryFn: () => getCorridors() }),
      context.queryClient.prefetchQuery({ queryKey: ["transfers"], queryFn: () => listTransfers() }),
    ]);
    return null;
  },
  component: Home,
});

function Home() {
  const router = useRouter();
  const { data: corridors = [] } = useQuery({ queryKey: ["corridors"], queryFn: () => getCorridors() });
  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => listTransfers(),
    refetchInterval: 5000,
  });

  const [corridor, setCorridor] = useState<CorridorCode>("PHP");
  const [amount, setAmount] = useState<string>("250");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [chain, setChain] = useState<"MATIC" | "ETH" | "ARB" | "BASE">("MATIC");
  const [confirm, setConfirm] = useState(false);
  const [lastTransfer, setLastTransfer] = useState<{ id: string; status: string; recipientName: string } | null>(null);

  const amountNum = useMemo(() => Math.max(0, parseFloat(amount || "0") || 0), [amount]);

  const quoteQuery = useQuery({
    queryKey: ["quote", corridor, amountNum],
    queryFn: () => getQuote({ data: { amountUsd: amountNum, corridor } }),
    enabled: amountNum > 0,
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      // Public users must sign in and use their own wallet — never the treasury.
      router.navigate({ to: "/my-wallet" });
      return { id: "", status: "redirect", recipientName } as const;
    },
  });

  const selectedCorridor = corridors.find((c) => c.code === corridor);

  return (
    <main className="min-h-screen bg-background bg-grain pb-20">
      <Header />

      <div className="mx-auto max-w-2xl px-5 pt-6 space-y-8">


        {lastTransfer && <SettlementToast t={lastTransfer} onClose={() => setLastTransfer(null)} />}

        <section className="rounded-3xl bg-card shadow-[var(--shadow-lift)] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">You send</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl text-muted-foreground">$</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent text-5xl sm:text-6xl font-display font-medium tracking-tight outline-none placeholder:text-muted-foreground/40"
                placeholder="0"
              />
              <span className="text-base font-medium text-muted-foreground">USDC</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Recipient gets</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl text-muted-foreground">{selectedCorridor?.symbol}</span>
              <span className="text-5xl sm:text-6xl font-display font-medium tracking-tight">
                {quoteQuery.data ? formatNum(quoteQuery.data.receiveAmount) : "—"}
              </span>
              <select
                value={corridor}
                onChange={(e) => setCorridor(e.target.value as CorridorCode)}
                className="ml-auto rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
              >
                {corridors.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {quoteQuery.data && (
            <div className="rounded-2xl bg-secondary/60 p-4 space-y-2 text-sm">
              <Row label="Network fee (0.5%, no spread)" value={`$${quoteQuery.data.fee.toFixed(2)}`} />
              <Row
                label="Exchange rate"
                value={`1 USDC = ${quoteQuery.data.rate} ${corridor}`}
              />
              <Row
                label="Estimated settlement"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-success pulse-dot" />
                    ~{quoteQuery.data.etaSeconds}s on-chain
                  </span>
                }
              />
            </div>
          )}

          <button
            onClick={() => setConfirm(true)}
            disabled={!quoteQuery.data || amountNum <= 0}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
          >
            Continue
          </button>
        </section>

        <RecentTransfers transfers={transfers} />

        <SmeCallout />
      </div>

      {confirm && quoteQuery.data && (
        <ConfirmSheet
          onClose={() => setConfirm(false)}
          onSubmit={() => sendMut.mutate()}
          submitting={sendMut.isPending}
          error={sendMut.error?.message}
          quote={quoteQuery.data}
          recipientName={recipientName}
          setRecipientName={setRecipientName}
          recipientAddress={recipientAddress}
          setRecipientAddress={setRecipientAddress}
          chain={chain}
          setChain={setChain}
        />
      )}
    </main>
  );
}

function Header({ balance, hasError }: { balance?: string; hasError: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="mx-auto max-w-2xl flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-display text-lg">
            ↻
          </div>
          <div>
            <h1 className="text-base font-display font-semibold leading-none">Swift Send</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Powered by Circle · USDC</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/my-wallet"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            My Wallet
          </a>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Treasury</p>
            <p className="font-mono text-sm tabular-nums">
              {hasError ? "—" : `$${formatNum(parseFloat(balance ?? "0"))}`}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono tabular-nums">{value}</span>
    </div>
  );
}

function ConfirmSheet({
  onClose,
  onSubmit,
  submitting,
  error,
  quote,
  recipientName,
  setRecipientName,
  recipientAddress,
  setRecipientAddress,
  chain,
  setChain,
}: any) {
  const canSubmit = recipientName.trim() && recipientAddress.trim().startsWith("0x");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-[var(--shadow-lift)] space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold">Confirm payout</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="rounded-2xl bg-secondary/60 p-4 text-sm space-y-2">
          <Row label="Sending" value={`$${quote.amountUsd.toFixed(2)} USDC`} />
          <Row
            label="Recipient gets"
            value={`${quote.corridor.symbol}${formatNum(quote.receiveAmount)} ${quote.corridor.code}`}
          />
          <Row label="Fee" value={`$${quote.fee.toFixed(2)}`} />
        </div>

        <div className="space-y-3">
          <Field label="Recipient name">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Maria Santos"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Recipient USDC address">
            <input
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Settlement chain (CCTP-routable)">
            <div className="grid grid-cols-4 gap-2">
              {(["MATIC", "ETH", "ARB", "BASE"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChain(c)}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                    chain === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
          className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? "Submitting to Circle…" : `Send $${quote.amountUsd.toFixed(2)} now`}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SettlementToast({
  t,
  onClose,
}: {
  t: { id: string; status: string; recipientName: string };
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-success/40 bg-success/10 p-4 flex items-start gap-3">
      <div className="size-9 shrink-0 rounded-full bg-success text-success-foreground grid place-items-center font-bold">
        ✓
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Transfer submitted to Circle</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          To {t.recipientName} · Status:{" "}
          <span className="font-mono">{t.status}</span> · ID:{" "}
          <span className="font-mono">{t.id.slice(0, 8)}…</span>
        </p>
      </div>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
    </div>
  );
}

function RecentTransfers({ transfers }: { transfers: any[] }) {
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-3 px-1">
        Recent settlements
      </h2>
      <div className="rounded-3xl bg-card shadow-[var(--shadow-soft)] divide-y divide-border overflow-hidden">
        {transfers.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No transfers yet — your sandbox payouts will appear here in real time.
          </div>
        )}
        {transfers.slice(0, 6).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
            <StatusDot status={t.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium font-mono truncate">{t.id.slice(0, 12)}…</p>
              <p className="text-xs text-muted-foreground">
                {t.destination?.chain ?? "—"} ·{" "}
                {t.createDate ? new Date(t.createDate).toLocaleString() : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium font-mono tabular-nums">
                ${t.amount?.amount ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground capitalize">{t.status}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusDot({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    s === "complete"
      ? "bg-success"
      : s === "failed"
      ? "bg-destructive"
      : "bg-warning pulse-dot";
  return <span className={`size-2 rounded-full ${cls}`} />;
}

function SmeCallout() {
  const items = [
    { k: "Invoice factoring", v: "Advance USDC against receivables, automated waterfall on repayment." },
    { k: "Trade escrow", v: "Milestone-based USDC release for import/export settlement." },
    { k: "PO financing", v: "Fund purchase orders, unlock on proof-of-delivery." },
    { k: "Credit passport", v: "On-chain transaction & repayment history for SMEs." },
  ];
  return (
    <section className="rounded-3xl border border-border bg-accent/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          SME finance & trade workflows
        </p>
        <a href="/sme" className="text-xs font-medium text-primary hover:underline">Open hub →</a>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((i) => (
          <a key={i.k} href="/sme" className="rounded-xl bg-card/70 px-3 py-2.5 hover:bg-card transition">
            <p className="text-sm font-medium">{i.k}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{i.v}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function formatNum(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
