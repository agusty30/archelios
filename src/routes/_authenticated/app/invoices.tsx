import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./route";
import { Card, EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/app/invoices")({
  head: () => ({ meta: [{ title: "Invoices · Archelios" }] }),
  component: () => (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Invoices" subtitle="Issue invoices settled in USDC on ARC." />
      <Card>
        <EmptyState title="No invoices yet" body="Create your first USDC invoice — recipient pays with a single click, funds land in your wallet within seconds." />
      </Card>
    </div>
  ),
});
