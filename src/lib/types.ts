export type Dealer = {
  id: string;
  company_name: string;
  contact_name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  whatsapp: string;
  about: string;
  status: "ausstehend" | "freigegeben" | "abgelehnt" | "gesperrt";
  rejection_reason: string | null;
  is_admin: boolean;
  is_founding: boolean;
  founding_number: number | null;
  approved_at: string | null;
  created_at: string;
};

export type DealerPrivate = {
  dealer_id: string;
  email: string;
  vat_id: string;
  license_path: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export type Listing = {
  id: string;
  dealer_id: string;
  category: string;
  make: string;
  model: string;
  variant: string;
  first_registration: string | null;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  power_kw: number | null;
  color: string | null;
  hu_until: string | null;
  owners: number | null;
  accident_free: boolean | null;
  service_history: boolean | null;
  roadworthy: boolean;
  vin: string | null;
  damage_notes: string;
  description: string;
  features: string[];
  extra: Record<string, string>;
  price: number;
  vat_type: "ausweisbar" | "differenz";
  price_is_net: boolean;
  price_gross: number;
  urgent: boolean;
  status: "aktiv" | "reserviert" | "verkauft" | "deaktiviert";
  zip: string;
  city: string;
  created_at: string;
  updated_at: string;
};

export type ListingCard = Pick<
  Listing,
  | "id" | "dealer_id" | "category" | "make" | "model" | "variant" | "first_registration" | "mileage"
  | "fuel" | "transmission" | "power_kw" | "price" | "price_gross" | "vat_type" | "price_is_net"
  | "urgent" | "status" | "zip" | "city" | "created_at"
> & {
  cover_path: string | null;
  image_count?: number;
  company_name?: string;
  distance?: number | null;
  total_count?: number;
};

export type Offer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  counter_amount: number | null;
  note: string;
  status: "offen" | "gegenangebot" | "angenommen" | "abgelehnt" | "zurueckgezogen";
  created_at: string;
  updated_at: string;
};

export type ActionState = { error?: string; ok?: string } | null;
