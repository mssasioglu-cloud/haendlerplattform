"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMsg = { id: string; sender_id: string; body: string; created_at: string };

const time = (d: string) =>
  new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Echtzeit-Chat für Direktnachrichten (mode="direct") und Gruppenräume (mode="room").
export function LiveChat({ mode, channelId, myId, initial, initialNames }: {
  mode: "direct" | "room"; channelId: string; myId: string; initial: ChatMsg[]; initialNames: Record<string, string>;
}) {
  const table = mode === "direct" ? "messages" : "chat_messages";
  const fk = mode === "direct" ? "conversation_id" : "room_id";
  const senderCol = mode === "direct" ? "sender_id" : "dealer_id";
  const [msgs, setMsgs] = useState<ChatMsg[]>(initial);
  const [names, setNames] = useState(initialNames);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  const add = (m: ChatMsg) =>
    setMsgs((o) => (o.some((x) => x.id === m.id) ? o : [...o, m].sort((x, y) => x.created_at.localeCompare(y.created_at))));

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`${table}:${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: `${fk}=eq.${channelId}` }, async (payload) => {
        const r = payload.new as Record<string, string>;
        const sender = r[senderCol];
        add({ id: r.id, sender_id: sender, body: r.body, created_at: r.created_at });
        setNames((n) => {
          if (n[sender]) return n;
          supabase.from("dealers").select("company_name").eq("id", sender).maybeSingle()
            .then(({ data }) => data && setNames((x) => ({ ...x, [sender]: data.company_name })));
          return n;
        });
        if (mode === "direct" && sender !== myId) supabase.rpc("mark_conversation_read", { p_conversation: channelId }).then(() => {});
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { catchUp(); timer = setTimeout(catchUp, 3000); }
      });

    // Lädt die neuesten Nachrichten nach: schließt die Lücke zwischen Seitenaufbau und
    // stehender Echtzeit-Verbindung und holt Verpasstes, wenn der Tab wieder aktiv wird.
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function catchUp() {
      const { data } = await supabase.from(table).select("*").eq(fk, channelId)
        .order("created_at", { ascending: false }).limit(30);
      const rows = (data ?? []) as Record<string, string>[];
      rows.forEach((r) => add({ id: r.id, sender_id: r[senderCol], body: r.body, created_at: r.created_at }));
      const unknown = Array.from(new Set(rows.map((r) => r[senderCol])));
      if (mode === "room" && unknown.length) {
        const { data: ds } = await supabase.from("dealers").select("id, company_name").in("id", unknown);
        if (ds) setNames((n) => ({ ...Object.fromEntries(ds.map((d) => [d.id, d.company_name])), ...n }));
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") catchUp(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [table, fk, senderCol, channelId, mode, myId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabaseRef.current.from(table)
      .insert({ [fk]: channelId, [senderCol]: myId, body }).select("id, body, created_at").single();
    setSending(false);
    if (err || !data) return setError("Nachricht konnte nicht gesendet werden.");
    add({ id: data.id, sender_id: myId, body: data.body, created_at: data.created_at });
    setText("");
  }

  return (
    <div className="card flex h-[65vh] min-h-96 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.length === 0 && <p className="text-center text-sm text-muted">Noch keine Nachrichten.</p>}
        {msgs.map((m) => {
          const own = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${own ? "bg-brand-600 text-white" : "bg-page"}`}>
                {!own && mode === "room" && (
                  <a href={`/haendler/${m.sender_id}`} className="mb-0.5 block text-xs font-semibold text-brand-700">{names[m.sender_id] ?? "Händler"}</a>
                )}
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[11px] ${own ? "text-brand-100" : "text-muted"}`}>{time(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="chat-input" className="sr-only">Nachricht</label>
        <input id="chat-input" className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={mode === "direct" ? 4000 : 2000} placeholder="Nachricht schreiben …" autoComplete="off" />
        <button className="btn btn-primary" disabled={sending || !text.trim()}>Senden</button>
      </form>
      {error && <p className="notice notice-error m-3 mt-0" role="alert">{error}</p>}
    </div>
  );
}
