import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser-only Supabase Auth client.
 * The publishable/anon key is safe for browser use when database access remains
 * protected by RLS. Never place the service-role key in this module.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("SUPABASE_BROWSER_CLIENT_REQUIRES_WINDOW");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) {
    throw new Error("SUPABASE_BROWSER_CONFIG_MISSING");
  }

  if (!browserClient) {
    browserClient = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    });
  }

  return browserClient;
}
