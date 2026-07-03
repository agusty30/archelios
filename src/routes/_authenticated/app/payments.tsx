import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "./route";
import { Card, EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/app/payments")({
  head: () => ({ meta: [{ title: "Payments · Archelios" }] }),
  component: () => (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Payments" subtitle="Supplier payments, payroll, and bulk USDC transfers." />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: "Bulk payments", d: "Upload a CSV and pay hundreds of recipients." },
          { t: "Payroll", d: "Recurring monthly USDC payroll runs." },
          { t: "Suppliers", d: "One-off vendor payments with approval workflow." },
        ].map((c) => (
          <Card key={c.t}>
            <h3 className="font-medium">{c.t}</h3>
            <p className="text-sm text-muted-foreground mt-1.5">{c.d}</p>
            <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">Coming soon</p>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Card>
          <EmptyState
            title="Send your first payment"
            body="Use Remittance for individual transfers today. Bulk workflows unlock next."
            cta={<Link to="/app/remittance" className="text-sm font-medium underline">Go to Remittance →</Link>}
          />
        </Card>
      </div>
    </div>
  ),
});
