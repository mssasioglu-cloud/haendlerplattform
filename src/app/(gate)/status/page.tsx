import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { site } from "@/config/site";

export const metadata = { title: "Status" };

export default async function Status() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.dealer) redirect("/onboarding");
  if (s.dealer.status === "freigegeben") redirect(s.hasAccess ? "/suche" : "/abo");

  if (s.dealer.status === "ausstehend") {
    return (
      <div className="card p-6">
        <h1 className="h1">Ihre Angaben werden geprüft</h1>
        <p className="mt-3 text-sm text-muted">
          Vielen Dank, {s.dealer.contact_name}. Wir prüfen den Gewerbenachweis von {s.dealer.company_name} und
          melden uns per E-Mail an {s.email}, sobald Ihr Account freigeschaltet ist. Das dauert in der Regel
          höchstens einen Werktag.
        </p>
        <Link href="/status" className="btn btn-secondary mt-5">Status aktualisieren</Link>
      </div>
    );
  }
  return (
    <div className="card p-6">
      <h1 className="h1">{s.dealer.status === "abgelehnt" ? "Freischaltung abgelehnt" : "Account gesperrt"}</h1>
      {s.dealer.rejection_reason && <p className="notice notice-error mt-3">Begründung: {s.dealer.rejection_reason}</p>}
      <p className="mt-3 text-sm text-muted">
        Bei Fragen erreichen Sie uns unter <a className="font-semibold text-brand-600" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </div>
  );
}
