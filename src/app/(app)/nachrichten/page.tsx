import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTimeDe } from "@/lib/format";

export const metadata = { title: "Nachrichten" };

export default async function Nachrichten() {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(200);
  const rows = data ?? [];
  const otherIds = Array.from(new Set(rows.map((c) => (c.initiator_id === s.userId ? c.recipient_id : c.initiator_id))));
  const { data: dealers } = otherIds.length
    ? await supabase.from("dealers").select("id, company_name").in("id", otherIds)
    : { data: [] as { id: string; company_name: string }[] };
  const name = new Map((dealers ?? []).map((d) => [d.id, d.company_name]));

  return (
    <>
      <h1 className="h1 mb-5">Nachrichten</h1>
      {rows.length === 0 && (
        <div className="card p-8 text-center text-sm text-muted">
          Noch keine Unterhaltungen. Schreiben Sie einen Händler direkt über ein Inserat oder Gesuch an.
        </div>
      )}
      <ul className="card divide-y divide-line">
        {rows.map((c) => {
          const iAmInitiator = c.initiator_id === s.userId;
          const other = iAmInitiator ? c.recipient_id : c.initiator_id;
          const readAt = iAmInitiator ? c.initiator_read_at : c.recipient_read_at;
          const unread = c.last_sender_id && c.last_sender_id !== s.userId && new Date(c.last_message_at) > new Date(readAt);
          return (
            <li key={c.id}>
              <Link href={`/nachrichten/${c.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-brand-50">
                <span className="min-w-0">
                  <span className={`block truncate ${unread ? "font-bold" : "font-semibold"}`}>
                    {name.get(other) ?? "Händler"} <span className="font-normal text-muted">· {c.subject}</span>
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {c.last_sender_id === s.userId && "Sie: "}{c.last_preview}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted">
                  {dateTimeDe(c.last_message_at)}
                  {unread && <span className="badge bg-urgent text-white">neu</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
