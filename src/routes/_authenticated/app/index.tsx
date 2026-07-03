import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, listRemittances } from "@/lib/remittances.functions";
import { getMyWalletBalance } from "@/lib/user-wallets.functions";
import { PageHeader } from "./route";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home · Archelios" }] }),
  component: Home,
});

function Home() {
  const statsQ = useQuery({ queryKey: ["dashboard", "stats"], queryFn: () => getDashboardStats(), refetchInterval: 30000 });
  const balQ = useQuery({ queryKey: ["my-wallet", "balance"], queryFn: () => getMyWalletBalance() });
  const remQ = useQuery({ queryKey: ["remittances"], queryFn: () => listRemittances(), refetchInterval: 15000 });

  const s = statsQ.data;
  const bal = balQ.data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Home"
        subtitle="Overview of your Archelios activity."
        actions={
          <div className="flex gap-2">
            <Link to="/app/remittance" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
              New payment
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="USDC balance" value={`$${bal?.available ?? "—"}`} sub="ARC Testnet · available" accent />
        <Kpi label="Today's volume" value={`$${fmt(s?.todayVol)}`} sub="Sent in last 24h" />
        <Kpi label="Monthly volume" value={`$${fmt(s?.monthVol)}`} sub="Month to date" />
        <Kpi label="Fees collected" value={`$${fmt(s?.fees)}`} sub={`${s?.totalCount ?? 0} transfers`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi label="Successful settlements" value={s?.completed ?? 0} tone="success" />
        <Kpi label="Pending" value={s?.pending ?? 0} tone="warning" />
        <Kpi label="Avg settlement time" value="~25s" sub="On-chain confirmation" />
      </div>

      <div className="mt-10 grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHead title="Recent transfers" action={<Link to="/app/transactions" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>} />
          {(!remQ.data || remQ.data.length === 0) ? (
            <EmptyState
              title="No transfers yet"
              body="Fund your wallet and send your first cross-border USDC payment in under a minute."
              cta={<Link to="/app/remittance" className="text-sm font-medium text-foreground hover:underline">Send USDC →</Link>}
            />
          ) : (
            <ul className="divide-y divide-border">
              {remQ.data.slice(0, 6).map((r: any) => (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <StatusDot status={r.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.recipient_name ?? r.recipient_address.slice(0, 10) + "…"}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {r.corridor ?? "—"} · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono tabular-nums">${Number(r.amount_usd).toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{r.status?.toLowerCase()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Quick actions" />
          <div className="space-y-2">
            <QuickAction to="/app/remittance" title="Send remittance" desc="Global payout, ~25s" />
            <QuickAction to="/app/wallet" title="Deposit USDC" desc="Fund your wallet" />
            <QuickAction to="/app/bridge" title="Bridge assets" desc="Cross-chain CCTP v2" />
            <QuickAction to="/app/beneficiaries" title="Add beneficiary" desc="Save for later" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function fmt(n?: number) {
  return (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Kpi({ label, value, sub, tone, accent }: { label: string; value: any; sub?: string; tone?: "success" | "warning"; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
      <p className={`text-[11px] uppercase tracking-widest ${accent ? "opacity-70" : "text-muted-foreground"}`}>{label}</p>
      <p className={`mt-2 font-display text-3xl tracking-tight tabular-nums ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : ""}`}>{value}</p>
      {sub && <p className={`mt-1 text-xs ${accent ? "opacity-70" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: any; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>{children}</div>;
}
export function CardHead({ title, action }: { title: string; action?: any }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-medium">{title}</h2>
      {action}
    </div>
  );
}
export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: any }) {
  return (
    <div className="text-center py-12">
      <p className="font-display text-xl">{title}</p>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
function QuickAction({ to, title, desc }: { to: any; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-secondary transition group">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <span className="text-muted-foreground group-hover:translate-x-0.5 transition">→</span>
    </Link>
  );
}
export function StatusDot({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  const cls =
    s === "COMPLETE" ? "bg-success" :
    s === "FAILED" ? "bg-destructive" :
    s === "ONCHAIN" ? "bg-accent pulse-dot" :
    "bg-warning pulse-dot";
  return <span className={`size-2 rounded-full shrink-0 ${cls}`} />;
}
