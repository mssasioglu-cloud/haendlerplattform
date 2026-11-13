"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/suche", label: "Suche", match: ["/suche", "/inserat"] },
  { href: "/meine-inserate", label: "Meine Inserate", match: ["/meine-inserate", "/inserieren"] },
  { href: "/nachrichten", label: "Nachrichten", match: ["/nachrichten"] },
  { href: "/gebote", label: "Gebote", match: ["/gebote"] },
  { href: "/gesuche", label: "Gesuche", match: ["/gesuche"] },
  { href: "/chat", label: "Händlerchat", match: ["/chat"] },
  { href: "/merkliste", label: "Merkliste", match: ["/merkliste"] },
  { href: "/suchauftraege", label: "Suchaufträge", match: ["/suchauftraege"] },
  { href: "/konto", label: "Konto", match: ["/konto", "/haendler"] },
];

export function NavLinks({ unread, isAdmin }: { unread: number; isAdmin: boolean }) {
  const path = usePathname();
  const all = isAdmin ? [...items, { href: "/admin", label: "Admin", match: ["/admin"] }] : items;
  return (
    <nav className="border-t border-white/10" aria-label="Hauptnavigation">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 text-sm">
        {all.map((i) => {
          const active = i.match.some((m) => path === m || path.startsWith(m + "/"));
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 border-b-[3px] px-2.5 pb-2 pt-2.5 font-display text-[15px] font-semibold uppercase tracking-wider ${active ? "border-accent text-accent" : "border-transparent text-brand-200 hover:text-white"}`}
              >
                {i.label}
                {i.href === "/nachrichten" && unread > 0 && (
                  <span className="badge bg-urgent text-white">{unread}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
