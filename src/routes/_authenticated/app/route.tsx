import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateMyWallet, getMyWalletBalance } from "@/lib/user-wallets.functions";
import { Logo } from "@/routes/index";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Archelios — Dashboard" }] }),
  component: AppShell,
});

const NAV = [
  { group: "Overview", items: [
    { to: "/app", label: "Home", icon: "home", exact: true },
    { to: "/app/analytics", label: "Analytics", icon: "chart" },
  ]},
  { group: "Money", items: [
    { to: "/app/wallet", label: "Wallet", icon: "wallet" },
    { to: "/app/remittance", label: "Remittance", icon: "send" },
    { to: "/app/bridge", label: "Bridge (CCTP)", icon: "bridge" },
    { to: "/app/payments", label: "Payments", icon: "card" },
    { to: "/app/beneficiaries", label: "Beneficiaries", icon: "users" },
  ]},
  { group: "Business", items: [
    { to: "/app/trade-finance", label: "Trade Finance", icon: "trade" },
    { to: "/app/invoices", label: "Invoices", icon: "invoice" },
  ]},
  { group: "History", items: [
    { to: "/app/transactions", label: "Transactions", icon: "list" },
    { to: "/app/settlement", label: "Settlement", icon: "check" },
  ]},
  { group: "Account", items: [
    { to: "/app/settings", label: "Settings", icon: "settings" },
  ]},
];

function AppShell() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const walletQ = useQuery({ queryKey: ["my-wallet"], queryFn: () => getOrCreateMyWallet() });
  const balanceQ = useQuery({
    queryKey: ["my-wallet", "balance", walletQ.data?.walletId],
    queryFn: () => getMyWalletBalance(),
    enabled: !!walletQ.data?.walletId,
    refetchInterval: 20000,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky lg:top-0 z-40 h-screen lg:h-screen w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform`}
      >
        <Link to="/app" className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <Logo />
          <span className="font-display text-lg leading-none">Archelios</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Icon name={it.icon} />
                        <span>{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-3">
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">USDC balance</p>
            <p className="font-mono text-lg tabular-nums mt-0.5">${balanceQ.data?.available ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">ARC Testnet</p>
          </div>
          <button
            onClick={signOut}
            className="w-full text-xs text-muted-foreground hover:text-foreground text-left"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm">
            ☰
          </button>
          <Link to="/app" className="flex items-center gap-2">
            <Logo small />
            <span className="font-display">Archelios</span>
          </Link>
          <div className="w-10" />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const c = "size-4 shrink-0";
  const s = "1.6";
  switch (name) {
    case "home": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "chart": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M3 3v18h18M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "wallet": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2" strokeLinecap="round"/></svg>;
    case "send": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M4 12l16-8-6 18-3-8-7-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "bridge": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M3 12h18M6 12v6M18 12v6M9 8V4M15 8V4" strokeLinecap="round"/></svg>;
    case "card": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20" /></svg>;
    case "users": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 100-6M22 21c0-3-2-5-5-5" strokeLinecap="round"/></svg>;
    case "trade": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M3 7h13l-3-3M21 17H8l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "invoice": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M6 3h9l3 3v15l-3-2-3 2-3-2-3 2V3z" strokeLinejoin="round"/><path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round"/></svg>;
    case "list": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/></svg>;
    case "check": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "settings": return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8L4.2 7a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" strokeLinejoin="round"/></svg>;
    default: return <span className={c} />;
  }
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
