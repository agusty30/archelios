import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getOrCreateMyWallet,
  getMyWalletBalance,
  sendFromMyWallet,
} from "@/lib/user-wallets.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-wallet")({
  component: MyWalletPage,
  head: () => ({ meta: [{ title: "My Wallet · Swift Send" }] }),
});

function MyWalletPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(getOrCreateMyWallet);
  const fetchBal = useServerFn(getMyWalletBalance);
  const send = useServerFn(sendFromMyWallet);

  const walletQ = useQuery({
    queryKey: ["my-wallet"],
    queryFn: () => create(),
  });

  const balQ = useQuery({
    queryKey: ["my-wallet", "balance", walletQ.data?.walletId],
    queryFn: () => fetchBal(),
    enabled: !!walletQ.data?.walletId,
    refetchInterval: 15000,
  });

  const [destination, setDestination] = useState("0xa66fc57404cd34342fe5d9a92598ee48b6eff898");
  const [amount, setAmount] = useState("0.10");

  const sendMut = useMutation({
    mutationFn: (vars: { destinationAddress: string; amountUsd: number }) =>
      send({ data: vars }),
    onSuccess: (r) => {
      toast.success(`Sent — status ${r.status}`);
      qc.invalidateQueries({ queryKey: ["my-wallet", "balance"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Send failed"),
  });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your wallet</CardTitle>
            <CardDescription>
              Personal ARC / Polygon Amoy testnet wallet — fully separate from the demo treasury.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {walletQ.isPending && <p className="text-sm text-muted-foreground">Provisioning your wallet…</p>}
            {walletQ.error && (
              <p className="text-sm text-destructive">{(walletQ.error as Error).message}</p>
            )}
            {walletQ.data && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="font-mono text-xs break-all">{walletQ.data.address}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Network</div>
                  <div className="text-sm">{walletQ.data.blockchain}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">USDC balance</div>
                  <div className="text-2xl font-semibold">
                    ${balQ.data?.available ?? "—"}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fund this address with testnet USDC at{" "}
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    faucet.circle.com
                  </a>
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send USDC</CardTitle>
            <CardDescription>Transfer from your wallet to any address on the same network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Destination address</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (USDC)</Label>
              <Input
                type="number" step="0.01" min="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={sendMut.isPending || !walletQ.data}
              onClick={() =>
                sendMut.mutate({
                  destinationAddress: destination,
                  amountUsd: parseFloat(amount),
                })
              }
            >
              {sendMut.isPending ? "Sending…" : "Send USDC"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
