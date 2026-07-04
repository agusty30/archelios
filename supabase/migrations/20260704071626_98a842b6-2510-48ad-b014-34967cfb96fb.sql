ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS circle_user_id text,
  ADD COLUMN IF NOT EXISTS wallet_type text NOT NULL DEFAULT 'USER';

UPDATE public.user_wallets SET wallet_type = 'DEVELOPER' WHERE wallet_type IS NULL OR wallet_type = 'USER' AND circle_user_id IS NULL;

CREATE INDEX IF NOT EXISTS user_wallets_user_type_idx ON public.user_wallets(user_id, wallet_type);

-- Allow users to update / delete their own wallet mappings (needed for re-provisioning)
DROP POLICY IF EXISTS "Users update own wallet" ON public.user_wallets;
CREATE POLICY "Users update own wallet" ON public.user_wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own wallet" ON public.user_wallets;
CREATE POLICY "Users delete own wallet" ON public.user_wallets FOR DELETE TO authenticated USING (auth.uid() = user_id);