import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "./route";
import { Card } from "./index";

export const Route = createFileRoute("/_authenticated/app/trade-finance")({
  head: () => ({ meta: [{ title: "Trade Finance · Archelios" }] }),
  component: () => (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Trade Finance" subtitle="Programmable USDC rails for working capital and trade settlement." />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { t: "Invoice factoring", d: "Advance USDC against receivables with automated repayment waterfall." },
          { t: "Trade escrow", d: "Milestone-based USDC releases for import/export settlement." },
          { t: "Purchase-order financing", d: "Fund purchase orders, unlock on proof-of-delivery." },
          { t: "Credit passport", d: "On-chain transaction & repayment history for SMEs." },
          { t: "Export finance", d: "Pre-shipment USDC funding for exporters." },
          { t: "Import finance", d: "Letter-of-credit style guarantees with programmable release." },
        ].map((c) => (
          <Card key={c.t} className="card-hover">
            <h3 className="font-medium">{c.t}</h3>
            <p className="text-sm text-muted-foreground mt-1.5">{c.d}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Card>
          <p className="text-sm">
            Full workflow prototypes for factoring, escrow, PO financing, and the credit passport are available in the SME Hub.
          </p>
          <Link to="/sme" className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline">Open SME Hub →</Link>
        </Card>
      </div>
    </div>
  ),
});
