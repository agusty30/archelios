import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createWalletSet,
  createDevWallet,
  listWalletSets,
  listDevWallets,
  sendDevWalletTransfer,
  getWalletBalances,
} from "@/lib/circle.functions";

export const Route = createFileRoute("/wallets")({
  head: () => ({
    meta: [
      { title: "Dev-Controlled Wallets — Swift Send" },
      { name: "description", content: "Create and manage Circle developer-controlled wallets." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.prefetchQuery({ queryKey: ["walletSets"], queryFn: () => listWalletSets() }),
  component: WalletsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const CHAINS = [
  "ARC-TESTNET",
  "MATIC-AMOY",
  "ETH-SEPOLIA",
  "ARB-SEPOLIA",
  "BASE-SEPOLIA",
  "AVAX-FUJI",
  "SOL-DEVNET",
];


function WalletsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("Treasury Set");
  const [activeSetId, setActiveSetId] = useState<string>("");
  const [chain, setChain] = useState("ARC-TESTNET");

  const [accountType, setAccountType] = useState<"SCA" | "EOA">("SCA");

  // Test transfer state
  const [sendWalletId, setSendWalletId] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("0xa66fc57404cd34342fe5d9a92598ee48b6eff898");
  const [amount, setAmount] = useState<string>("0.10");

  const { data: sets = [] } = useQuery({ queryKey: ["walletSets"], queryFn: () => listWalletSets() });
  const { data: wallets = [] } = useQuery({
    queryKey: ["devWallets", activeSetId],
    queryFn: () => listDevWallets({ data: { walletSetId: activeSetId || undefined } }),
  });

  const createSet = useMutation({
    mutationFn: () => createWalletSet({ data: { name } }),
    onSuccess: (set) => {
      qc.invalidateQueries({ queryKey: ["walletSets"] });
      if (set?.id) setActiveSetId(set.id);
    },
  });

  const createWallet = useMutation({
    mutationFn: () =>
      createDevWallet({
        data: { walletSetId: activeSetId, blockchains: [chain], count: 1, accountType },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devWallets"] }),
  });

  const { data: balances = [], refetch: refetchBalances } = useQuery({
    queryKey: ["walletBalances", sendWalletId],
    queryFn: () => getWalletBalances({ data: { walletId: sendWalletId } }),
    enabled: !!sendWalletId,
  });

  const sendTx = useMutation({
    mutationFn: () =>
      sendDevWalletTransfer({
        data: {
          walletId: sendWalletId,
          destinationAddress: recipient,
          amountUsd: Number(amount),
        },
      }),
    onSuccess: () => refetchBalances(),
  });

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-display font-semibold">Dev-Controlled Wallets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by Circle Programmable Wallets · entity secret encrypted per request.
          </p>
        </header>

        <section className="rounded-2xl bg-card p-6 shadow space-y-4">
          <h2 className="font-medium">1. Create a wallet set</h2>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Wallet set name"
            />
            <button
              onClick={() => createSet.mutate()}
              disabled={createSet.isPending || !name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createSet.isPending ? "Creating…" : "Create set"}
            </button>
          </div>
          {createSet.error && (
            <p className="text-sm text-destructive">{(createSet.error as Error).message}</p>
          )}
        </section>

        <section className="rounded-2xl bg-card p-6 shadow space-y-4">
          <h2 className="font-medium">2. Pick a wallet set</h2>
          {sets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallet sets yet.</p>
          ) : (
            <div className="space-y-2">
              {sets.map((s: any) => (
                <label key={s.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="set"
                    checked={activeSetId === s.id}
                    onChange={() => setActiveSetId(s.id)}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card p-6 shadow space-y-4">
          <h2 className="font-medium">3. Create a wallet</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-xs uppercase text-muted-foreground">Blockchain</span>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              >
                {CHAINS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-xs uppercase text-muted-foreground">Account type</span>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as "SCA" | "EOA")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              >
                <option value="SCA">SCA (smart account)</option>
                <option value="EOA">EOA</option>
              </select>
            </label>
          </div>
          <button
            onClick={() => createWallet.mutate()}
            disabled={createWallet.isPending || !activeSetId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createWallet.isPending ? "Creating…" : "Create wallet"}
          </button>
          {createWallet.error && (
            <p className="text-sm text-destructive">{(createWallet.error as Error).message}</p>
          )}
        </section>

        <section className="rounded-2xl bg-card p-6 shadow space-y-3">
          <h2 className="font-medium">Wallets {activeSetId && "in this set"}</h2>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallets yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {wallets.map((w: any) => (
                <div key={w.id} className="py-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{w.id}</p>
                    <p className="font-mono break-all">{w.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.blockchain} · {w.accountType} · {w.state}
                    </p>
                  </div>
                  <button
                    onClick={() => setSendWalletId(w.id)}
                    className="shrink-0 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                  >
                    Use for test send
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card p-6 shadow space-y-4">
          <h2 className="font-medium">4. Send a test USDC transfer</h2>
          <p className="text-xs text-muted-foreground">
            Sends from a dev-controlled wallet (e.g. ARC Testnet) to any blockchain address.
            The wallet must hold testnet USDC — fund via Circle's faucet first.
          </p>
          <label className="block text-sm space-y-1">
            <span className="text-xs uppercase text-muted-foreground">Source wallet ID</span>
            <input
              value={sendWalletId}
              onChange={(e) => setSendWalletId(e.target.value)}
              placeholder="Pick a wallet above or paste a wallet ID"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
          {sendWalletId && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs">
              <p className="font-medium mb-1">Balances</p>
              {balances.length === 0 ? (
                <p className="text-muted-foreground">No tokens yet — fund the wallet from a faucet.</p>
              ) : (
                <ul className="space-y-0.5">
                  {balances.map((b: any, i: number) => (
                    <li key={i} className="font-mono">
                      {b.amount} {b.token?.symbol} · {b.token?.blockchain}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm space-y-1 col-span-2">
              <span className="text-xs uppercase text-muted-foreground">Recipient address</span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-xs uppercase text-muted-foreground">Amount (USDC)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>
          </div>
          <button
            onClick={() => sendTx.mutate()}
            disabled={sendTx.isPending || !sendWalletId || !recipient || !amount}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {sendTx.isPending ? "Sending…" : "Send test USDC"}
          </button>
          {sendTx.error && (
            <p className="text-sm text-destructive">{(sendTx.error as Error).message}</p>
          )}
          {sendTx.data && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-medium">Transaction submitted ✓</p>
              <p className="font-mono break-all">id: {sendTx.data.id}</p>
              <p>state: {sendTx.data.state}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
