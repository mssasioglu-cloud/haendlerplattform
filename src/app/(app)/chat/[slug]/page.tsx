import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LiveChat } from "@/components/LiveChat";

export const metadata = { title: "Händlerchat" };

export default async function ChatRoom({ params }: { params: Promise<{ slug: string }> }) {
  const s = await requireAccess();
  const { slug } = await params;
  const supabase = await createClient();
  const { data: rooms } = await supabase.from("chat_rooms").select("*").order("sort");
  const room = (rooms ?? []).find((r) => r.slug === slug);
  if (!room) notFound();
  const { data: recent } = await supabase.from("chat_messages")
    .select("id, dealer_id, body, created_at").eq("room_id", room.id).order("created_at", { ascending: false }).limit(100);
  const msgs = (recent ?? []).reverse().map((m) => ({ id: m.id, sender_id: m.dealer_id, body: m.body, created_at: m.created_at }));
  const ids = Array.from(new Set(msgs.map((m) => m.sender_id)));
  const { data: dealers } = ids.length
    ? await supabase.from("dealers").select("id, company_name").in("id", ids)
    : { data: [] as { id: string; company_name: string }[] };
  const names = Object.fromEntries((dealers ?? []).map((d) => [d.id, d.company_name]));

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Chaträume">
        <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {(rooms ?? []).map((r) => (
            <li key={r.id} className="shrink-0">
              <Link href={`/chat/${r.slug}`} aria-current={r.slug === slug ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${r.slug === slug ? "bg-brand-600 text-white" : "bg-white text-ink hover:bg-brand-50"}`}>
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        <h1 className="h1">{room.name}</h1>
        <p className="mb-3 text-sm text-muted">{room.description} · Sichtbar für alle freigeschalteten Händler.</p>
        <LiveChat key={room.id} mode="room" channelId={room.id} myId={s.userId} initial={msgs} initialNames={names} />
      </div>
    </div>
  );
}
