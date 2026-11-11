import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE, browserSupabaseUrl } from "./shared";

export function createClient() {
  return createBrowserClient(
    browserSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: AUTH_COOKIE } },
  );
}
