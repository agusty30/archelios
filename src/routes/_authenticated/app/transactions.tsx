import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listRemittances, refreshRemittanceStatus } from "@/lib/remittances.functions";
import { PageHeader } from "./route";
import { Card, EmptyState, StatusDot } from "./index";

export const Route = createFileRoute("/_authenticated/app/transactions")({
  head: () => ({ meta: [{ title: "Transactions · Archelios" }] }),
  component: TxPage,
});

function TxPage() {
  const listQ = useQuery({ queryKey: ["remittances"], queryFn: () => listRemittances(), refetchInterval: 15000 });
  const [selected, setSelected] = useState<any | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Transactions" subtitle="Full audit trail of your USDC settlements." />
      <Card className="p-0 overflow-hidden">
        {(!listQ.data || listQ.data.length === 0) ? (
          <EmptyState title="No transactions" body="Your USDC transfers will appear here." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary/50">
              <tr>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Recipient</th>
                <th className="text-left px-5 py-3">Corridor</th>
                <th className="text-right px-5 py-3">Amount</th>
                <th className="text-right px-5 py-3">Fee</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {listQ.data.map((r: any) => (
                <tr key={r.id} onClick={() => setSelected(r)} className="border-t border-border hover:bg-secondary/30 cursor-pointer">
                  <td className="px-5 py-3"><span className="inline-flex items-center gap-2"><StatusDot status={r.status} /><span className="capitalize text-xs">{r.status.toLowerCase()}</span></span></td>
                  <td className="px-5 py-3">{r.recipient_name ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.corridor ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono">${Number(r.amount_usd).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">${Number(r.fee_usd).toFixed(2)}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selected && <TxDrawer tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TxDrawer({ tx, onClose }: { tx: any; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => refreshRemittanceStatus({ data: { id: tx.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remittances"] }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-background border-l border-border h-full overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Transaction</p>
            <p className="font-mono text-xs mt-1">{tx.reference}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground text-xl">×</button>
        </div>
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Amount</p>
          <p className="font-display text-4xl tabular-nums">${Number(tx.amount_usd).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Recipient gets {tx.corridor} {Number(tx.receive_amount ?? 0).toLocaleString()}</p>
        </div>
        <Detail label="Status" value={<span className="inline-flex items-center gap-2"><StatusDot status={tx.status} />{tx.status}</span>} />
        <Detail label="Recipient" value={tx.recipient_name ?? "—"} />
        <Detail label="Recipient address" value={<span className="font-mono text-xs break-all">{tx.recipient_address}</span>} />
        <Detail label="Source chain" value={tx.source_chain} />
        <Detail label="Destination chain" value={tx.destination_chain} />
        <Detail label="FX rate" value={tx.fx_rate ? `1 USDC = ${tx.fx_rate} ${tx.corridor}` : "—"} />
        <Detail label="Fee" value={`$${Number(tx.fee_usd).toFixed(2)}`} />
        <Detail label="Circle tx ID" value={<span className="font-mono text-xs break-all">{tx.circle_tx_id ?? "—"}</span>} />
        <Detail label="Tx hash" value={tx.tx_hash ? (
          <a className="underline text-xs" href={`https://testnet.arcscan.app/tx/${tx.tx_hash}`} target="_blank" rel="noreferrer">
            {tx.tx_hash.slice(0, 20)}…
          </a>
        ) : "Pending"} />
        <Detail label="Created" value={new Date(tx.created_at).toLocaleString()} />
        <button
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
          className="w-full rounded-xl border border-border py-2.5 text-sm hover:bg-secondary">
          {refresh.isPending ? "Refreshing…" : "Refresh status"}
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5 text-sm">
      <dt className="text-muted-foreground text-xs uppercase tracking-widest">{label}</dt>
      <dd className="text-right min-w-0">{value}</dd>
    </div>
  );
}
