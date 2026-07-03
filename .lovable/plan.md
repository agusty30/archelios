# Archelios → Circle-Powered Remittance Platform

Rebuilding the app end-to-end in one turn would produce a shallow result across ~30 screens. I'll deliver it in **4 phases**, each independently shippable. Confirm the phase order (or reshuffle) before I start.

## Scope decisions (locked unless you say otherwise)

- **Chain**: ARC Testnet only. All Polygon Amoy references stripped.
- **Wallets**: Existing per-user Circle wallets kept; migrated to ARC Testnet blockchain code. Treasury (`/wallets`) page removed from user nav (kept as admin-only).
- **Auth**: Existing email/password stays. Every new signup auto-provisions an ARC wallet (already happens on first `/app` visit).
- **CCTP / Solana / Pharos bridging**: Circle's CCTP v2 doesn't currently support ARC Testnet ↔ Solana in sandbox. I'll build the **UI + routing simulation** (source → dest → fee → ETA → status) and wire real CCTP calls only for corridors Circle's sandbox actually supports. Mock corridors will be labeled "Simulated".
- **StableFX**: Not GA in Circle sandbox. I'll implement FX preview using a static rate table (same pattern as current `getCorridors`) and label it "Indicative FX". Real StableFX swap-in later when Circle exposes it.
- **AI**: Uses existing Lovable AI Gateway (`google/gemini-3-flash-preview`), with tools that read wallet balance / transaction history via authenticated server fns.
- **Design**: Modern fintech (Wise/Mercury/Ramp-inspired). Dark-friendly neutral palette, generous spacing, data-dense but calm. I'll pick tokens directly — no design-directions round unless you want one.
- **IDR + existing corridors** kept and extended.

## Phase 1 — Foundation & Chain Migration

Ship first so nothing else breaks.

- Replace `MATIC-AMOY` / `POLY-AMOY` with `ARC-TESTNET` everywhere (DB default, server fns, UI labels).
- New app shell layout under `/app/*` with left sidebar nav: Home, Wallet, Payments, Remittance, Beneficiaries, Trade Finance, Invoices, Settlement, Transactions, Analytics, Settings.
- New design tokens in `src/styles.css` (fintech palette: near-black bg, single accent, muted borders, refined type scale).
- Landing page rebuild: Hero, Why Archelios, How It Works, Supported Chains, Circle Infrastructure, Business Solutions, FAQ, CTA, Footer.
- Remove treasury `/wallets` from user nav; keep route for admin.

## Phase 2 — Wallet & Remittance Core

The demo-critical path.

- `/app/wallet`: balance card, pending settlement, address + QR (via `qrcode.react`), deposit (faucet link), send USDC, receive, recent activity.
- `/app/remittance`: multi-step wizard (recipient → country/currency → amount → fee+FX preview → confirm → tracking).
- Transparent fee breakdown component (network fee estimate, platform fee, FX cost, recipient receives).
- `beneficiaries` table (name, country, currency, wallet address, notes) + CRUD UI.
- Real-time **settlement tracker** for each send: Initiated → Processing → On-chain → Settled. Polls Circle transaction status; shows tx hash + explorer link.

## Phase 3 — Dashboard, SME & Trade Finance

- `/app` home: fintech dashboard cards (Today's Volume, Monthly, Successful Settlements, Pending, Avg Settlement Time, USDC Balance, FX Savings, Fees) with Recharts (volume line, corridor bar, settlement-time histogram).
- **SME Finance** page: business wallet view, bulk payments (CSV upload), payroll batch, supplier payments, approval workflow (single-approver for demo), settlement report export.
- **Trade Finance** page: rebuild existing `/sme` flows (Invoice Factoring, Trade Escrow, PO Financing, Credit Passport) inside the new shell with better UX; add Purchase Orders + Milestone Payments views.
- **Transactions** page + transaction detail drawer (hash, addresses, chain, fees, FX rate, receipt download as PDF).

## Phase 4 — AI, CCTP UI, Settings, Polish

- **AI assistant** upgrade: tools for `get_balance`, `list_recent_transactions`, `get_settlement_status`, `explain_fee`, `suggest_route`. Floating panel accessible from every `/app/*` page.
- **CCTP Bridge UI**: source/dest chain selectors, fee & ETA preview, status tracker. Real API where Circle sandbox supports; clearly simulated otherwise.
- **Settings**: Profile, Business Profile, Security (change password), Notifications, API Keys (generate/revoke), Beneficiaries mgmt, Language, Theme, Developer Mode toggle.
- Empty states, loading skeletons, error boundaries on every route.
- Auth-lock sensitive server fns (fixes existing critical security findings before publish).
- Mobile responsive pass.

## Technical notes

- **DB migrations needed** (Phase 2 & 3): `beneficiaries`, `remittances` (with settlement status enum + tx hash), `invoices` (already exists in SME code — audit), `bulk_payment_batches`. All with RLS scoped to `auth.uid()`, service_role grants.
- **Server fns**: split `circle.functions.ts` (treasury/admin) from `user-wallets.functions.ts` (per-user). Add `remittances.functions.ts`, `beneficiaries.functions.ts`, `ai-chat.functions.ts`.
- **Explorer**: link to ARC Testnet explorer (`https://explorer.testnet.arc.network` — will verify actual URL).
- **QR**: add `qrcode.react`. **PDF receipts**: `pdf-lib` (Worker-compatible).
- Existing `_authenticated` gate re-used; new routes nested under `_authenticated/app/*`.
- Deployment/git ops (lint, typecheck, git push) — the Lovable platform handles this automatically on Publish; I don't run git commands.

## What I need from you

1. **Confirm phase order** (or say "just do Phase 1 first").
2. **Brand**: keep name "Archelios"? Any logo/wordmark preference or pick a clean typographic mark?
3. **Admin `/wallets` page**: hide behind a role check, or keep visible? (Currently anyone signed-in can call treasury.)
4. **Scope trim OK?** CCTP + StableFX will be partly simulated because Circle sandbox doesn't fully support them yet. If you need them real, we're blocked on Circle mainnet + KYB.

Reply with "go" (I'll start Phase 1) or adjust the plan.