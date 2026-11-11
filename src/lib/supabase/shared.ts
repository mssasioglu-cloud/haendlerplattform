// Gemeinsame Einstellungen für alle Supabase-Clients.
// Fester Cookie-Name, damit Server und Browser dieselbe Sitzung lesen, auch wenn sie
// Supabase unter verschiedenen Adressen ansprechen.
export const AUTH_COOKIE = "sb-haendler-auth";

// Vorschau-/Entwicklungsmodus: Der Browser erreicht Supabase über die Website selbst
// (/sb/...), z. B. wenn Supabase nur lokal neben der App läuft.
export const VIA_PROXY = process.env.NEXT_PUBLIC_SUPABASE_PROXY === "1";

export function browserSupabaseUrl() {
  return VIA_PROXY ? `${window.location.origin}/sb` : process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export const publicStorageBase = VIA_PROXY ? "/sb" : process.env.NEXT_PUBLIC_SUPABASE_URL;
