import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Archelios — Cross-border payments on Circle USDC" },
      {
        name: "description",
        content:
          "Fast. Transparent. Borderless. Send USDC globally with real-time settlement on ARC. Built for remittance, SME finance, and trade.",
      },
      { property: "og:title", content: "Archelios — Cross-border payments on Circle USDC" },
      {
        property: "og:description",
        content: "Send USDC globally with real-time settlement on ARC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <TrustBar />
      <Why />
      <HowItWorks />
      <SupportedChains />
      <CircleInfra />
      <BusinessSolutions />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-lg leading-none">Archelios</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#why" className="hover:text-foreground">Why Archelios</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#solutions" className="hover:text-foreground">Solutions</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">
            Sign in
          </Link>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            Open app
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-dot opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent pulse-dot" />
            Live on Arc Testnet · Circle-powered
          </p>
          <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
            Cross-border payments,{" "}
            <span className="italic text-muted-foreground">powered by</span> Circle USDC.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Fast. Transparent. Borderless. Settle in seconds on ARC — for remittance, SME finance, and trade.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90"
            >
              Start sending
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/app/wallet"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:border-foreground/30"
            >
              Create wallet
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground hover:text-foreground"
            >
              View demo
            </a>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
          <Stat kpi="~25s" label="Settlement time" />
          <Stat kpi="0.5%" label="Flat platform fee" />
          <Stat kpi="0" label="FX spread" />
          <Stat kpi="24/7" label="Global rails" />
        </div>
      </div>
    </section>
  );
}

function Stat({ kpi, label }: { kpi: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl tracking-tight">{kpi}</p>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function TrustBar() {
  const items = ["Circle USDC", "CCTP v2", "Circle Wallets", "Circle Gateway", "Arc Testnet"];
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-5 flex flex-wrap items-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="text-foreground/70">Built with</span>
        {items.map((i) => <span key={i}>{i}</span>)}
      </div>
    </section>
  );
}

function Why() {
  const cards = [
    { k: "Transparent fees", v: "Flat 0.5% platform fee. No hidden FX spread. See every basis point before you send." },
    { k: "Real-time settlement", v: "Watch the transfer land on-chain in seconds — Initiated → Processing → Settled." },
    { k: "Embedded wallets", v: "Every user gets a Circle programmable wallet auto-provisioned on sign-up. No seed phrase." },
    { k: "Programmable rails", v: "USDC + CCTP v2 for atomic cross-chain settlement across supported networks." },
    { k: "SME-ready", v: "Bulk payouts, supplier payments, invoice factoring, escrow — all on the same rail." },
    { k: "Compliance-native", v: "Circle's regulated USDC issuer + on-chain audit trail for every transaction." },
  ];
  return (
    <section id="why" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Why Archelios</p>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
          A payments stack that respects your money.
        </h2>
      </div>
      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.k} className="rounded-2xl border border-border bg-card p-6 card-hover">
            <div className="size-8 rounded-lg bg-accent/20 text-accent-foreground grid place-items-center mb-4">
              <span className="size-1.5 rounded-full bg-accent" />
            </div>
            <h3 className="text-lg font-medium tracking-tight">{c.k}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Fund your wallet", d: "Auto-provisioned on sign-up. Top up USDC from any supported chain or the Circle faucet." },
    { n: "02", t: "Pick a corridor", d: "Choose recipient country. Preview fees + FX before confirming — no surprises." },
    { n: "03", t: "Send & track", d: "USDC leaves your wallet, hits Circle rails, and lands in the recipient wallet within ~25 seconds." },
    { n: "04", t: "Settle & receive", d: "Real-time status: Initiated → Processing → On-chain → Settled. With tx hash + explorer link." },
  ];
  return (
    <section id="how" className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">How it works</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
            Four steps. Seconds to settle.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <p className="font-mono text-xs text-muted-foreground">{s.n}</p>
              <h3 className="mt-2 font-medium text-lg">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportedChains() {
  const chains = [
    { name: "Arc Testnet", status: "Primary", note: "Native settlement layer" },
    { name: "Ethereum", status: "via CCTP v2", note: "Cross-chain USDC bridge" },
    { name: "Solana", status: "via CCTP v2", note: "Cross-chain USDC bridge" },
    { name: "Pharos", status: "Preview", note: "Coming soon" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Supported chains</p>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
          Native on Arc. Bridged everywhere.
        </h2>
      </div>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {chains.map((c) => (
          <div key={c.name} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
                {c.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{c.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CircleInfra() {
  const parts = [
    { k: "Circle USDC", v: "Fully-reserved digital dollar issued by Circle." },
    { k: "Circle Wallets", v: "Programmable, dev-controlled wallets — one per user, no seed phrase." },
    { k: "CCTP v2", v: "Native cross-chain USDC transfer without wrapped assets." },
    { k: "Circle Gateway", v: "Unified USDC balance across supported chains." },
  ];
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 grid lg:grid-cols-2 gap-12">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Circle infrastructure</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
            Built on rails you can trust.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-md leading-relaxed">
            Archelios uses Circle's production-grade USDC stack end-to-end — regulated issuance,
            audited smart accounts, and native cross-chain settlement.
          </p>
        </div>
        <div className="space-y-3">
          {parts.map((p) => (
            <div key={p.k} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
              <div className="size-9 shrink-0 rounded-lg bg-accent/20 grid place-items-center">
                <span className="size-2 rounded-full bg-accent" />
              </div>
              <div>
                <p className="font-medium">{p.k}</p>
                <p className="text-sm text-muted-foreground mt-1">{p.v}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BusinessSolutions() {
  const items = [
    { t: "Remittance", d: "Send USDC to 190+ countries in seconds. Transparent fees, real-time settlement, receipt on every transaction." },
    { t: "SME Finance", d: "Business wallet, supplier payments, payroll, bulk transfers, and approval workflows." },
    { t: "Trade Finance", d: "Milestone escrow, invoice factoring, purchase-order financing, on-chain credit passport." },
    { t: "Developer API", d: "REST + webhooks. Programmable USDC rails without touching custody or private keys." },
  ];
  return (
    <section id="solutions" className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Business solutions</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
            One platform. Every payment workflow.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-4">
          {items.map((i) => (
            <Link
              key={i.t}
              to="/app"
              className="rounded-2xl border border-border bg-card p-8 card-hover group"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl tracking-tight">{i.t}</h3>
                <span className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition">→</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{i.d}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    { q: "Is Archelios live on mainnet?", a: "The current build runs on Arc Testnet with real Circle sandbox USDC. Mainnet is roadmap-gated on Circle Arc GA." },
    { q: "Do I need a crypto wallet?", a: "No. Every account gets a Circle-managed programmable wallet auto-provisioned on sign-up. No seed phrase, no browser extension." },
    { q: "What are the fees?", a: "A flat 0.5% platform fee plus network gas. Zero FX spread — you get the mid-market rate." },
    { q: "Which chains do you support?", a: "Arc Testnet natively. Ethereum and Solana via Circle CCTP v2. Pharos is on the roadmap." },
    { q: "Can businesses integrate via API?", a: "Yes — the same programmable USDC rails power our own product. Developer keys can be issued from Settings." },
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">FAQ</p>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight text-center">
        Frequently asked.
      </h2>
      <div className="mt-12 divide-y divide-border border-y border-border">
        {qs.map((q) => (
          <details key={q.q} className="group py-5">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium">{q.q}</span>
              <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{q.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="font-display text-5xl sm:text-6xl tracking-tight">
          Move money like it's <span className="italic text-muted-foreground">2026</span>.
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Open your wallet in under a minute. Send your first USDC settlement today.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90"
          >
            Get started free
          </Link>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:border-foreground/30"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Logo small />
          <span>© {new Date().getFullYear()} Archelios · Built for the Arc Hackathon</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#why" className="hover:text-foreground">Why</a>
          <a href="#how" className="hover:text-foreground">How</a>
          <a href="#solutions" className="hover:text-foreground">Solutions</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </div>
      </div>
    </footer>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  const size = small ? "size-6" : "size-8";
  return (
    <div className={`${size} rounded-lg bg-primary text-primary-foreground grid place-items-center font-display shrink-0`}>
      <svg viewBox="0 0 24 24" className={small ? "size-3.5" : "size-4"} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18L12 4l8 14M8 14h8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
