import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { WantedForm } from "./WantedForm";

export const metadata = { title: "Gesuch einstellen" };

export default async function GesuchNeu() {
  await requireAccess();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/gesuche" className="text-sm link">← Alle Gesuche</Link>
      <h1 className="h1 mb-5 mt-2">Gesuch einstellen</h1>
      <div className="card p-5"><WantedForm /></div>
    </div>
  );
}
