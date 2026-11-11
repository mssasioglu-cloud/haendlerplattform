import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/ListingForm";
import type { Listing } from "@/lib/types";

export const metadata = { title: "Inserat bearbeiten" };
const tri = (b: boolean | null) => (b == null ? "" : b ? "ja" : "nein");

export default async function Bearbeiten({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireAccess();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).eq("dealer_id", s.userId).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;
  const { data: imgs } = await supabase.from("listing_images").select("path").eq("listing_id", id).order("position");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="h1 mb-5">Inserat bearbeiten</h1>
      <ListingForm
        userId={s.userId}
        id={id}
        initialImages={(imgs ?? []).map((i) => i.path)}
        initial={{
          category: l.category, make: l.make, model: l.model, variant: l.variant,
          first_registration: l.first_registration?.slice(0, 7) ?? "", mileage: l.mileage?.toString() ?? "",
          fuel: l.fuel ?? "", transmission: l.transmission ?? "", power_kw: l.power_kw?.toString() ?? "",
          color: l.color ?? "", hu_until: l.hu_until?.slice(0, 7) ?? "", owners: l.owners?.toString() ?? "",
          accident_free: tri(l.accident_free), service_history: tri(l.service_history), roadworthy: l.roadworthy,
          vin: l.vin ?? "", damage_notes: l.damage_notes, description: l.description, features: l.features,
          extra: l.extra ?? {}, price: String(l.price), vat_type: l.vat_type, price_is_net: l.price_is_net,
          urgent: l.urgent, zip: l.zip, b2b: true,
        }}
      />
    </div>
  );
}
