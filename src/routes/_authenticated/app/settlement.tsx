import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRemittances } from "@/lib/remittances.functions";
import { PageHeader } from "./route";
import { Card, StatusDot } from "./index";

export const Route = createFileRoute("/_authenticated/app/settlement")({
  head: () => ({ meta: [{ title: "Settlement · Archelios" }] }),
  component: SettlementPage,
});

function SettlementPage() {
  const q = useQuery({ queryKey: ["remittances"], queryFn: () => listRemittances(), refetchInterval: 10000 });
  const active = (q.data ?? []).filter((r: any) => !["COMPLETE", "FAILED"].includes(r.status));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Settlement" subtitle="Real-time status of your open USDC transfers." />
      <Card>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">All settlements are complete.</p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((r: any) => (
              <li key={r.id} className="py-4 flex items-center gap-4">
                <StatusDot status={r.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.recipient_name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{r.reference} · {r.corridor} · {new Date(r.created_at).toLocaleTimeString()}</p>
                </div>
                <p className="text-sm font-mono tabular-nums">${Number(r.amount_usd).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground w-24 text-right capitalize">{r.status.toLowerCase()}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
