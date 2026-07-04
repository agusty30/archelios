ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_pkey;
ALTER TABLE public.user_wallets ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (user_id, wallet_type);