import { createClient } from "@/lib/supabase/client";

export interface UserSettings {
  user_id: string;
  logo_data: string | null;
  updated_at: string;
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as UserSettings | null) ?? null;
}

export async function saveUserLogo(logoData: string | null): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      logo_data: logoData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
