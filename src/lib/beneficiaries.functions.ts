import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBeneficiaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("beneficiaries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addBeneficiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    country?: string;
    currency?: string;
    address: string;
    chain?: string;
    note?: string;
  }) => {
    if (!d?.name?.trim()) throw new Error("Name required");
    if (!d?.address?.trim().startsWith("0x")) throw new Error("Valid 0x address required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("beneficiaries")
      .insert({
        user_id: context.userId,
        name: data.name.trim(),
        country: data.country?.trim() || null,
        currency: data.currency?.trim() || null,
        address: data.address.trim(),
        chain: data.chain?.trim() || "ARC-TESTNET",
        note: data.note?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBeneficiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("beneficiaries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
