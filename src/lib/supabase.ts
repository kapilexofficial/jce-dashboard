import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

let adminClient: SupabaseClient | null = null;
let readClient: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!URL || !SECRET_KEY) {
    throw new Error("Supabase admin: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY ausente");
  }
  if (!adminClient) {
    adminClient = createClient(URL, SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function supabaseRead(): SupabaseClient {
  if (!URL || !PUBLISHABLE_KEY) {
    throw new Error("Supabase read: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente");
  }
  if (!readClient) {
    readClient = createClient(URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return readClient;
}
