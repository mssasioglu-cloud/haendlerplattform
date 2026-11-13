import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LiveChat } from "@/components/LiveChat";

export const metadata = { title: "Unterhaltung" };

export default async function Unterhaltung({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireAccess();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const otherId = c.initiator_id === s.userId ? c.recipient_id : c.initiator_id;
  const [{ data: other }, { data: msgs }] = await Promise.all([
    supabase.from("dealers").select("id, company_name, phone").eq("id", otherId).maybeSingle(),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at").limit(500),
    supabase.rpc("mark_conversation_read", { p_conversation: id }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/nachrichten" className="text-sm link">← Alle Nachrichten</Link>
      <div className="mb-4 mt-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="h1">
            <Link href={`/haendler/${otherId}`} className="hover:underline">{other?.company_name ?? "Händler"}</Link>
          </h1>
          <p className="text-sm text-muted">
            {c.subject}
            {c.listing_id && <> · <Link href={`/inserat/${c.listing_id}`} className="link">Inserat ansehen</Link></>}
            {c.wanted_id && <> · <Link href="/gesuche" className="link">Zu den Gesuchen</Link></>}
          </p>
        </div>
        {other?.phone && <a href={`tel:${other.phone.replace(/[^\d+]/g, "")}`} className="btn btn-secondary">Anrufen</a>}
      </div>
      <LiveChat mode="direct" channelId={id} myId={s.userId} initial={msgs ?? []} initialNames={{}} />
    </div>
  );
}
