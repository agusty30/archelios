import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listCorridors, getRemittanceQuote, createRemittance, listRemittances, refreshRemittanceStatus } from "@/lib/remittances.functions";
import { listBeneficiaries } from "@/lib/beneficiaries.functions";
import { getMyWalletBalance } from "@/lib/user-wallets.functions";
import { PageHeader } from "./route";
import { Card, CardHead, StatusDot } from "./index";

export const Route = createFileRoute("/_authenticated/app/remittance")({
  head: () => ({ meta: [{ title: "Remittance · Archelios" }] }),
  component: RemittancePage,
});

type Step = 1 | 2 | 3 | 4;

function RemittancePage() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [corridor, setCorridor] = useState("PHP");
  const [amount, setAmount] = useState("100");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);

  const corridorsQ = useQuery({ queryKey: ["corridors"], queryFn: () => listCorridors() });
  const beneQ = useQuery({ queryKey: ["beneficiaries"], queryFn: () => listBeneficiaries() });
  const balQ = useQuery({ queryKey: ["my-wallet", "balance"], queryFn: () => getMyWalletBalance() });

  const amountNum = useMemo(() => Math.max(0, parseFloat(amount || "0") || 0), [amount]);
  const quoteQ = useQuery({
    queryKey: ["quote", corridor, amountNum],
    queryFn: () => getRemittanceQuote({ data: { amountUsd: amountNum, corridor } }),
    enabled: amountNum > 0 && !!corridor,
  });

  const send = useMutation({
    mutationFn: () => createRemittance({ data: { amountUsd: amountNum, corridor, recipientName, recipientAddress } }),
    onSuccess: (r: any) => {
      setLastId(r.id);
      setStep(4);
      qc.invalidateQueries({ queryKey: ["remittances"] });
      qc.invalidateQueries({ queryKey: ["my-wallet", "balance"] });
      toast.success("Payment submitted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const selected = corridorsQ.data?.find((c: any) => c.code === corridor);
  const insufficient = balQ.data ? parseFloat(balQ.data.available) < amountNum : false;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader title="New remittance" subtitle="Send USDC anywhere. Transparent fees, real-time settlement." />

      <Stepper step={step} />

      {step === 1 && (
        <Card>
          <CardHead title="Amount & corridor" />
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">You send</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl text-muted-foreground">$</span>
                <input inputMode="decimal" value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent font-display text-5xl tracking-tight outline-none"
                  placeholder="0" />
                <span className="text-sm text-muted-foreground font-medium">USDC</span>
              </div>
              <p className={`mt-2 text-xs ${insufficient ? "text-destructive" : "text-muted-foreground"}`}>
                Wallet balance: ${balQ.data?.available ?? "—"}
                {insufficient && " · insufficient"}
              </p>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Recipient gets</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl text-muted-foreground">{selected?.symbol}</span>
                <span className="font-display text-5xl tracking-tight flex-1">
                  {quoteQ.data ? quoteQ.data.receiveAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                </span>
                <select value={corridor} onChange={(e) => setCorridor(e.target.value)}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm">
                  {corridorsQ.data?.map((c: any) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              disabled={!quoteQ.data || amountNum <= 0}
              onClick={() => setStep(2)}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHead title="Recipient" />
          <div className="space-y-3">
            {beneQ.data && beneQ.data.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Saved beneficiaries</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {beneQ.data.slice(0, 4).map((b: any) => (
                    <button key={b.id}
                      onClick={() => { setRecipientName(b.name); setRecipientAddress(b.address); }}
                      className="text-left rounded-xl border border-border p-3 hover:border-foreground/30">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{b.address}</p>
                    </button>
                  ))}
                </div>
                <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}
            <Field label="Recipient name">
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Maria Santos"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
            </Field>
            <Field label="Recipient USDC address (Arc Testnet)">
              <input value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="0x…" spellCheck={false}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-mono" />
            </Field>
            <p className="text-xs text-muted-foreground">
              New beneficiary?{" "}
              <Link to="/app/beneficiaries" className="underline">Save for later →</Link>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-border py-3 text-sm">Back</button>
              <button
                disabled={!recipientName.trim() || !recipientAddress.startsWith("0x")}
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium disabled:opacity-40"
              >
                Review
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && quoteQ.data && (
        <Card>
          <CardHead title="Confirm" />
          <div className="space-y-4">
            <div className="rounded-xl bg-secondary p-4 space-y-2 text-sm">
              <FeeRow label="Amount" value={`$${quoteQ.data.amountUsd.toFixed(2)} USDC`} />
              <FeeRow label="Platform fee (0.5%)" value={`$${quoteQ.data.platformFee.toFixed(2)}`} muted />
              <FeeRow label="Network fee" value={`$${quoteQ.data.networkFee.toFixed(2)}`} muted />
              <div className="h-px bg-border my-1" />
              <FeeRow label="FX rate" value={`1 USDC = ${quoteQ.data.rate} ${quoteQ.data.corridor.code}`} muted />
              <FeeRow label="Recipient receives" value={`${quoteQ.data.corridor.symbol}${quoteQ.data.receiveAmount.toLocaleString()} ${quoteQ.data.corridor.code}`} strong />
              <FeeRow label="Est. settlement" value={`~${quoteQ.data.etaSeconds}s on-chain`} muted />
              <FeeRow label="Route" value={`${quoteQ.data.sourceChain} → ${quoteQ.data.destinationChain}`} muted />
            </div>
            <div className="rounded-xl border border-border p-4 text-sm space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-widest">Recipient</p>
              <p className="font-medium">{recipientName}</p>
              <p className="text-xs font-mono text-muted-foreground break-all">{recipientAddress}</p>
            </div>
            {send.error && <p className="text-sm text-destructive">{(send.error as Error).message}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-border py-3 text-sm">Back</button>
              <button
                disabled={send.isPending || insufficient}
                onClick={() => send.mutate()}
                className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium disabled:opacity-40"
              >
                {send.isPending ? "Sending…" : `Send $${quoteQ.data.amountUsd.toFixed(2)}`}
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && lastId && <SettlementTracker id={lastId} onReset={() => { setStep(1); setLastId(null); }} />}
    </div>
  );
}

function SettlementTracker({ id, onReset }: { id: string; onReset: () => void }) {
  const qc = useQueryClient();
  const remsQ = useQuery({
    queryKey: ["remittances"],
    queryFn: () => listRemittances(),
    refetchInterval: 5000,
  });
  const remit = remsQ.data?.find((r: any) => r.id === id);

  // trigger refresh from Circle every 5s
  useQuery({
    queryKey: ["remit-refresh", id],
    queryFn: async () => {
      const r = await refreshRemittanceStatus({ data: { id } });
      qc.invalidateQueries({ queryKey: ["remittances"] });
      return r;
    },
    refetchInterval: 5000,
    enabled: remit?.status !== "COMPLETE" && remit?.status !== "FAILED",
  });

  const stages = [
    { key: "INITIATED", label: "Initiated", desc: "Payment created" },
    { key: "PROCESSING", label: "Processing", desc: "Submitted to Circle" },
    { key: "ONCHAIN", label: "On-chain", desc: "Broadcast to ARC" },
    { key: "COMPLETE", label: "Settled", desc: "Delivered to recipient" },
  ];
  const order = ["INITIATED", "PROCESSING", "ONCHAIN", "COMPLETE"];
  const currentIdx = Math.max(0, order.indexOf(remit?.status ?? "INITIATED"));
  const failed = remit?.status === "FAILED";

  return (
    <Card>
      <CardHead title="Settlement" action={<button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground">New payment →</button>} />
      <div className="rounded-xl bg-secondary p-4 mb-6 flex items-center gap-3">
        <StatusDot status={remit?.status ?? "INITIATED"} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Reference {remit?.reference}</p>
          <p className="text-xs text-muted-foreground">${remit?.amount_usd} → {remit?.recipient_name}</p>
        </div>
        {remit?.tx_hash && (
          <a href={`https://explorer.testnet.arc.network/tx/${remit.tx_hash}`} target="_blank" rel="noreferrer"
            className="text-xs underline">Explorer →</a>
        )}
      </div>

      <ol className="space-y-4">
        {stages.map((s, i) => {
          const done = !failed && i <= currentIdx;
          const active = !failed && i === currentIdx && remit?.status !== "COMPLETE";
          return (
            <li key={s.key} className="flex gap-4">
              <div className={`mt-0.5 size-6 rounded-full grid place-items-center text-xs ${
                done ? "bg-success text-success-foreground" : active ? "bg-warning text-warning-foreground pulse-dot" : "bg-secondary text-muted-foreground"
              }`}>{done ? "✓" : i + 1}</div>
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          );
        })}
        {failed && <li className="text-sm text-destructive">Transaction failed — please try again.</li>}
      </ol>
    </Card>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Amount", "Recipient", "Review", "Track"];
  return (
    <div className="flex items-center gap-2 mb-6">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex items-center gap-2 flex-1">
            <div className={`size-6 rounded-full grid place-items-center text-xs shrink-0 ${
              done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>{done ? "✓" : n}</div>
            <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{l}</span>
            {i < labels.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
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
function FeeRow({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`font-mono tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
