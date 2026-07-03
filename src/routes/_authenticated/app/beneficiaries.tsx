import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listBeneficiaries, addBeneficiary, deleteBeneficiary } from "@/lib/beneficiaries.functions";
import { PageHeader } from "./route";
import { Card, EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/app/beneficiaries")({
  head: () => ({ meta: [{ title: "Beneficiaries · Archelios" }] }),
  component: BeneficiariesPage,
});

function BeneficiariesPage() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["beneficiaries"], queryFn: () => listBeneficiaries() });
  const [f, setF] = useState({ name: "", country: "", currency: "", address: "", note: "" });

  const add = useMutation({
    mutationFn: () => addBeneficiary({ data: f }),
    onSuccess: () => { toast.success("Beneficiary added"); setF({ name: "", country: "", currency: "", address: "", note: "" }); qc.invalidateQueries({ queryKey: ["beneficiaries"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteBeneficiary({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beneficiaries"] }),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Beneficiaries" subtitle="Saved recipients for one-tap remittance." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium mb-4">Add beneficiary</h2>
          <div className="space-y-3">
            <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Country" value={f.country} onChange={(v) => setF({ ...f, country: v })} placeholder="Philippines" />
              <Input label="Currency" value={f.currency} onChange={(v) => setF({ ...f, currency: v })} placeholder="PHP" />
            </div>
            <Input label="USDC address (0x…)" value={f.address} onChange={(v) => setF({ ...f, address: v })} mono />
            <Input label="Note" value={f.note} onChange={(v) => setF({ ...f, note: v })} />
            <button disabled={add.isPending || !f.name || !f.address.startsWith("0x")}
              onClick={() => add.mutate()}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium disabled:opacity-40">
              {add.isPending ? "Saving…" : "Save beneficiary"}
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="font-medium mb-4">Your beneficiaries ({listQ.data?.length ?? 0})</h2>
          {(!listQ.data || listQ.data.length === 0) ? (
            <EmptyState title="No beneficiaries yet" body="Save a recipient to skip re-entering their address every time." />
          ) : (
            <ul className="divide-y divide-border">
              {listQ.data.map((b: any) => (
                <li key={b.id} className="py-3 flex items-start gap-3">
                  <div className="size-9 rounded-full bg-secondary grid place-items-center text-sm font-medium">{b.name.slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.country ?? "—"} · {b.currency ?? "—"} · {b.chain}</p>
                    <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">{b.address}</p>
                  </div>
                  <button onClick={() => del.mutate(b.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ${mono ? "font-mono" : ""}`} />
    </label>
  );
}
