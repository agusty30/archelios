import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateMyWallet } from "@/lib/user-wallets.functions";
import { PageHeader } from "./route";
import { Card } from "./index";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings · Archelios" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const walletQ = useQuery({ queryKey: ["my-wallet"], queryFn: () => getOrCreateMyWallet() });
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
      <PageHeader title="Settings" subtitle="Your account, wallet, and platform preferences." />

      <Card>
        <h2 className="font-medium mb-4">Profile</h2>
        <Row label="Email" value={email || "—"} />
        <Row label="Signed in" value="Active" />
      </Card>

      <Card>
        <h2 className="font-medium mb-4">Wallet</h2>
        <Row label="Network" value="Arc Testnet" />
        <Row label="Wallet address" value={
          walletQ.data?.address
            ? <span className="font-mono text-xs break-all">{walletQ.data.address}</span>
            : <span className="text-muted-foreground">Not created yet — visit Wallet page</span>
        } />
        <Row label="Circle wallet ID" value={
          walletQ.data?.walletId
            ? <span className="font-mono text-xs">{walletQ.data.walletId.slice(0, 20)}…</span>
            : <span className="text-muted-foreground">—</span>
        } />
        <Row label="Custody" value="User-controlled · PIN secured" />
      </Card>

      <Card>
        <h2 className="font-medium mb-4">Preferences</h2>
        <Row label="Language" value="English (US)" />
        <Row label="Base currency" value="USD" />
        <Row label="Theme" value="System" />
        <Row label="Notifications" value="Email · Enabled" />
      </Card>

      <Card>
        <h2 className="font-medium mb-4">Developer</h2>
        <Row label="API keys" value={<button onClick={() => toast.info("API keys unlock after mainnet launch.")} className="text-sm underline">Manage</button>} />
        <Row label="Webhooks" value={<button onClick={() => toast.info("Coming soon.")} className="text-sm underline">Configure</button>} />
        <Row label="Developer mode" value="Off" />
      </Card>

      <Card>
        <h2 className="font-medium mb-4">Danger zone</h2>
        <button onClick={signOut} className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
          Sign out
        </button>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 last:border-0 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right min-w-0">{value}</dd>
    </div>
  );
}
