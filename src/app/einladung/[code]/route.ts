import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Persönlicher Einladungslink eines Händlers: merkt den Code und führt zur Registrierung
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const target = new URL("/registrieren", request.url);
  if (!/^[a-z0-9]{6,16}$/.test(code)) return NextResponse.redirect(target);
  const supabase = await createClient();
  const { data: name } = await supabase.rpc("inviter_name", { p_code: code });
  if (!name) return NextResponse.redirect(target);
  target.searchParams.set("einladung", "1");
  const res = NextResponse.redirect(target);
  res.cookies.set("hd_invite", code, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
