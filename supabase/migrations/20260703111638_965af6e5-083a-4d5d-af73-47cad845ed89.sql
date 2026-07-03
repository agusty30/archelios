ALTER TABLE public.user_wallets ALTER COLUMN blockchain SET DEFAULT 'ARC-TESTNET';
UPDATE public.user_wallets SET blockchain = 'ARC-TESTNET' WHERE blockchain IN ('MATIC-AMOY','POLY-AMOY');

CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  currency text,
  address text NOT NULL,
  chain text NOT NULL DEFAULT 'ARC-TESTNET',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT ALL ON public.beneficiaries TO service_role;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own beneficiaries all" ON public.beneficiaries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_beneficiaries_updated BEFORE UPDATE ON public.beneficiaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_tx_id text,
  status text NOT NULL DEFAULT 'INITIATED',
  amount_usd numeric(18,2) NOT NULL,
  fee_usd numeric(18,2) NOT NULL DEFAULT 0,
  corridor text,
  fx_rate numeric(18,6),
  receive_amount numeric(18,2),
  recipient_name text,
  recipient_address text NOT NULL,
  source_chain text NOT NULL DEFAULT 'ARC-TESTNET',
  destination_chain text NOT NULL DEFAULT 'ARC-TESTNET',
  tx_hash text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remittances TO authenticated;
GRANT ALL ON public.remittances TO service_role;
ALTER TABLE public.remittances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own remittances all" ON public.remittances FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_remittances_updated BEFORE UPDATE ON public.remittances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();