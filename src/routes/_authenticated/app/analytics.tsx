import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRemittances, getDashboardStats } from "@/lib/remittances.functions";
import { PageHeader } from "./route";
import { Card } from "./index";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Archelios" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const statsQ = useQuery({ queryKey: ["dashboard", "stats"], queryFn: () => getDashboardStats() });
  const listQ = useQuery({ queryKey: ["remittances"], queryFn: () => listRemittances() });

  const byCorridor = useMemo(() => {
    const m = new Map<string, number>();
    (listQ.data ?? []).forEach((r: any) => m.set(r.corridor ?? "—", (m.get(r.corridor ?? "—") ?? 0) + Number(r.amount_usd || 0)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [listQ.data]);

  const dailyBars = useMemo(() => {
    const days: { day: string; total: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), total: 0 });
    }
    (listQ.data ?? []).forEach((r: any) => {
      const rd = new Date(r.created_at); rd.setHours(0, 0, 0, 0);
      const label = rd.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const b = days.find((x) => x.day === label);
      if (b) b.total += Number(r.amount_usd || 0);
    });
    return days;
  }, [listQ.data]);

  const max = Math.max(1, ...dailyBars.map((b) => b.total));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Analytics" subtitle="Payment volume, corridors, and settlement trends." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total sent</p>
          <p className="mt-2 font-display text-3xl tabular-nums">${(statsQ.data?.monthVol ?? 0).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Settlements</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{statsQ.data?.completed ?? 0}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fees paid</p>
          <p className="mt-2 font-display text-3xl tabular-nums">${(statsQ.data?.fees ?? 0).toFixed(2)}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="font-medium mb-4">Daily volume (last 14 days)</h2>
        <div className="flex items-end gap-1 h-40">
          {dailyBars.map((b) => (
            <div key={b.day} className="flex-1 flex flex-col items-center gap-1">
              <div title={`$${b.total.toFixed(2)}`}
                className="w-full bg-accent/60 rounded-t transition-all"
                style={{ height: `${(b.total / max) * 100}%`, minHeight: 2 }} />
              <span className="text-[9px] text-muted-foreground rotate-45 origin-left mt-1 hidden sm:block">{b.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-medium mb-4">By corridor</h2>
        {byCorridor.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
        ) : (
          <ul className="space-y-3">
            {byCorridor.map(([code, total]) => {
              const pct = (total / byCorridor[0][1]) * 100;
              return (
                <li key={code}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-mono">{code}</span>
                    <span className="font-mono tabular-nums">${total.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
