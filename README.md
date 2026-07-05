# Archelios

Fast. Transparent. Borderless. Cross-border payments on Circle USDC.

Archelios is a cross-border payments platform built on Circle's USDC infrastructure, running on **ARC Testnet**. Settle in seconds with transparent fees and zero FX spread.

**Live:** https://archelios.lovable.app

## Features

- **Transparent fees** — flat 0.5% network fee, no hidden FX spread
- **Real-time settlement** — on-chain status tracking (Initiated → Processing → Settled) in ~25 seconds
- **Self-custody wallets** — Circle user-controlled programmable wallets, secured by PIN (no seed phrase)
- **Cross-chain USDC** — CCTP v2 bridging between ARC Testnet, Ethereum, and Solana
- **Remittance** — send USDC to 190+ countries with live FX quotes
- **SME Finance** — business wallets, payroll, bulk transfers
- **Trade Finance** — milestone escrow, invoice factoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui |
| Routing | TanStack Router + TanStack Start (SSR) |
| Auth | Supabase Auth (email + password) |
| Database | Supabase (PostgreSQL) |
| Wallets | Circle Programmable Wallets (user-controlled, PIN-based) |
| Payments | Circle USDC, CCTP v2, Circle Gateway |
| Blockchain | ARC Testnet (primary), Ethereum & Solana (via CCTP v2) |
| Hosting | Lovable Cloud |

## Architecture

```
User (Browser)
  ├── Supabase Auth (email/password login)
  ├── Circle Web SDK (PIN entry, wallet ops — secure iframe)
  └── TanStack Start (SSR + server functions)
        ├── Circle API (wallet creation, transfers, balances)
        └── Supabase DB (user_wallets mapping, beneficiaries)
```

- **Authentication:** Supabase handles email/password signup and login (no email confirmation required). After signup, users are automatically signed in.
- **Wallet creation:** Each user gets a Circle user-controlled wallet (SCA on ARC Testnet), auto-provisioned on first visit to the wallet page. The user sets a 6-digit PIN via Circle's secure iframe — Archelios never sees the PIN or private keys.
- **Transfers:** USDC transfers are signed by the user's PIN via the Circle Web SDK. The backend creates transfer challenges; the frontend executes them.

## Getting Started

### Prerequisites

- Node.js 20+
- A [Circle Developer](https://console.circle.com) account (App ID + API key)
- A [Supabase](https://supabase.com) project

### Environment Variables

```env
# Circle
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_64_hex_char_entity_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### Supabase Configuration

1. Create a `user_wallets` table with columns: `user_id`, `circle_user_id`, `circle_wallet_id`, `address`, `blockchain`, `wallet_type`
2. Disable email confirmation: **Authentication → Providers → Email → uncheck "Confirm email"**
3. Enable Row Level Security on `user_wallets`

### Circle Configuration

1. Create an app at [console.circle.com](https://console.circle.com) to get your App ID
2. Generate an API key and Entity Secret
3. The App ID (`1fb6f1fa-488c-51af-b5b0-90f63eec267e`) is configured in the frontend wallet page

## Supported Corridors

| Country | Currency | FX Rate (mocked) |
|---------|----------|-------------------|
| Philippines | PHP | 58.42 |
| India | INR | 83.21 |
| Nigeria | NGN | 1,547.50 |
| Mexico | MXN | 17.18 |
| Kenya | KES | 129.40 |
| Eurozone | EUR | 0.92 |
| Indonesia | IDR | 16,250 |

## Project Structure

```
src/
├── routes/
│   ├── index.tsx              # Landing page
│   ├── auth.tsx               # Sign in / Sign up
│   └── _authenticated/
│       └── app/
│           ├── route.tsx      # App shell (sidebar, nav)
│           ├── index.tsx      # Dashboard home
│           ├── wallet.tsx     # Circle wallet (PIN setup, balance, send)
│           ├── remittance.tsx # Cross-border remittance
│           ├── bridge.tsx     # CCTP v2 bridge
│           └── ...
├── lib/
│   ├── circle.functions.ts              # Dev-controlled wallet server functions
│   ├── circle-user-wallets.functions.ts # User-controlled wallet server functions
│   ├── user-wallets.functions.ts        # Legacy wallet functions
│   └── remittances.functions.ts         # Remittance quotes & transfers
└── integrations/
    └── supabase/
        ├── client.ts          # Browser Supabase client
        ├── client.server.ts   # Server Supabase client
        └── auth-middleware.ts # Auth middleware for server functions
```

## License

Built for the Arc Hackathon.
