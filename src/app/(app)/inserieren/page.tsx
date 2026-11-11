import { requireAccess } from "@/lib/auth";
import { ListingForm } from "@/components/ListingForm";

export const metadata = { title: "Fahrzeug inserieren" };

export default async function Inserieren() {
  const s = await requireAccess();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="h1">Fahrzeug inserieren</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Pflichtfelder sind mit * markiert. Alles Weitere können Sie später ergänzen.</p>
      <ListingForm userId={s.userId} defaultZip={s.dealer.zip} />
    </div>
  );
}
