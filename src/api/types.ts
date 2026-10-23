// Types mirror the JSON shapes produced by the website's ApiPresenter (docs/api.md, API v1).
// Money is always a decimal STRING ("129000.00") plus a currency code. Never a float.

export type Envelope<T> = { success: true; data: T; message: string | null; meta: Record<string, any> };
export type ErrorEnvelope = { success: false; data: null; message: string; code: string; errors: Record<string, string> | null; meta: Record<string, any> };

export type ApiImage = {
  alt: string | null;
  width: number;
  height: number;
  small: string;
  medium: string;
  large: string;
  webp?: { small: string; medium: string; large: string };
};

export type DestinationRef = { name: string; slug: string; country: string };
export type Rating = { average: number; count: number };

export type PackageCard = {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  destination: DestinationRef | null;
  duration: { days: number; nights: number };
  currency: string;
  price: string;
  base_price: string;
  discount_price: string | null;
  discount_percent: number | null;
  featured: boolean;
  booking_status: string;
  availability: { state: string; text: string };
  next_departure: string | null;
  seats_left: number | null;
  rating: Rating | null;
  image: ApiImage | null;
  web_url: string;
  is_saved: boolean | null;
  updated_at: string | null;
};

export type Departure = {
  id: number;
  departure_date: string;
  return_date: string | null;
  price: string;
  currency: string;
  seats_total: number;
  seats_left: number;
  status: "open" | "closed" | "full";
};

export type MapLocation = {
  id: number;
  day: number | null;
  name: string;
  type: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  notes: string | null;
};

export type ItineraryDay = { day: number; title: string; description: string | null };

export type PackageDetail = Omit<PackageCard, "image" | "availability" | "next_departure" | "seats_left"> & {
  description: string | null;
  important_info: string | null;
  bookable: boolean;
  flexible_dates: boolean;
  availability: { state: string; text: string };
  images: (ApiImage | null)[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  departures: Departure[];
  categories: { name: string; slug: string }[];
  tags: string[];
  locations: MapLocation[];
  related: PackageCard[];
};

export type Destination = {
  id: number;
  slug: string;
  name: string;
  country: string;
  description: string | null;
  packages: number | null;
  from_price: string | null;
  currency: string | null;
  image: ApiImage | null;
  web_url: string;
};
export type DestinationDetail = Destination & { package_list: PackageCard[] };

export type Category = { id: number; slug: string; name: string; description?: string | null; packages: number };

export type HomeData = {
  hero: { title: string; text: string | null; image: ApiImage | null };
  featured_packages: PackageCard[];
  destinations: Destination[];
  categories: Category[];
  contact: { phone: string | null; whatsapp: string | null };
};

export type PaymentMethod = { code: string; label: string; description: string | null; online: boolean };

export type AppConfig = {
  site_name: string;
  currency: string;
  timezone: string;
  contact: { phone: string | null; email: string | null; address: string | null; whatsapp: string | null };
  booking: { requires_authentication: boolean; min_travelers: number; max_travelers: number; child_price_percent: number; require_passenger_names: boolean };
  payment_methods: PaymentMethod[];
  cancellation_policy: string | null;
  social: { facebook: string | null; instagram: string | null; youtube: string | null };
  offline_notice: string;
  payment_collection: string;
};

export type Availability = {
  package: { id: number; slug: string; title: string };
  bookable: boolean;
  flexible_dates: boolean;
  currency: string;
  min_travelers: number;
  max_travelers: number;
  departures: Departure[];
  quote: { adults: number; children: number; unit_price: string; child_unit_price: string; total: string; seats: number; currency: string; seats_available: boolean } | null;
};

export type Review = { rating: number; title: string | null; review: string; reviewer: string; date: string };

export type User = { id: number; name: string; email: string; phone: string | null; email_verified: boolean; created_at: string | null };

export type TokenPair = { token_type: "Bearer"; access_token: string; expires_in: number; refresh_token: string; refresh_expires_in: number };
export type AuthResult = TokenPair & { user: User };

export type BookingStatus = "pending" | "confirmed" | "cancellation_requested" | "cancelled" | "completed";
export type PaymentStatus = "unpaid" | "paid" | "refund_requested" | "refunded";

export type Booking = {
  reference: string;
  booking_status: BookingStatus;
  booking_status_label: string;
  payment_status: PaymentStatus;
  payment_status_label: string;
  package: { title: string; id: number; slug?: string | null };
  departure_date: string | null;
  return_date: string | null;
  preferred_date: string | null;
  adults: number;
  children: number;
  currency: string;
  total: string;
  amount_paid: string;
  balance_due: string;
  created_at: string;
  updated_at: string;
  can_cancel: boolean;
  // Present on the full (detail) shape only:
  customer?: { name: string; email: string; phone: string };
  special_requests?: string | null;
  unit_price?: string;
  child_unit_price?: string;
  payment?: { method: string; method_label: string; instructions: string | null };
  passengers?: { name: string; is_child: boolean; age: number | null }[];
  payments?: { type: string; method: string; amount: string; currency: string; date: string }[];
  timeline?: { at: string; event: string; from: string | null; to: string | null }[];
  web_url?: string;
};

export type TripDocument = {
  id: number;
  type: string;
  title: string;
  mime: string;
  size_bytes: number;
  version: number;
  status: "active" | "replaced" | "revoked";
  sha256: string;
  issued_at: string;
  updated_at: string;
  replaced_by: number | null;
  download_url: string | null;
};

export type EmergencyContact = {
  id: number;
  scope: string;
  destination: string | null;
  label: string;
  phone: string | null;
  email: string | null;
  availability: string | null;
  notes: string | null;
  updated_at: string | null;
};

export type AgencyContact = { phone: string | null; email: string | null; whatsapp: string | null; address: string | null };

export type TripDetail = {
  booking: Booking;
  itinerary: (ItineraryDay & { locations: MapLocation[] })[];
  locations: MapLocation[];
  inclusions: string[];
  exclusions: string[];
  important_info: string | null;
  documents: TripDocument[];
  emergency_contacts: EmergencyContact[];
  agency_contact: AgencyContact;
  verification: { server_time: string; booking_status: string; confirmed: boolean; must_verify_online: boolean; notice: string };
  updated_at: string;
};

export type TripSummary = { booking: Booking; documents_count: number; updated_at: string };

export type OfflineBundle = {
  generated_at: string;
  bundle_version: number;
  notice: string;
  customer: { id: number; name: string; email: string; phone: string | null };
  trips: TripDetail[];
  unchanged: string[];
  removed_trips: { reference: string; booking_status: string; updated_at: string | null }[];
  inactive_documents: { id: number; booking_reference: string; status: string; replaced_by: number | null; updated_at: string | null }[];
  emergency_contacts: EmergencyContact[];
  agency_contact: AgencyContact;
};

export type Enquiry = { reference: string; type: "general" | "custom_tour" | "support"; status: "received" | "handled"; created_at: string; updated_at: string };

export type AppNotification = { id: number; type: string; title: string; body: string; booking_reference: string | null; read: boolean; created_at: string | null };

export type PageMeta = { page: number; limit: number; total: number; pages: number; [k: string]: any };
export type Paged<T> = { items: T[]; meta: PageMeta };

export type PackageQuery = {
  q?: string;
  category?: string;
  destination?: string;
  sort?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
};

export type CreateBookingInput = {
  package: string;
  departure_id?: number | null;
  preferred_date?: string | null;
  adults: number;
  children: number;
  customer_name?: string;
  customer_phone: string;
  payment_method: string;
  special_requests?: string | null;
  accept_terms: true;
  expected_total?: string;
  passengers?: { name: string; age?: number }[];
};

export type CreateEnquiryInput = {
  type: "general" | "custom_tour" | "support";
  name?: string;
  email?: string;
  phone?: string;
  message: string;
  package?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  adults?: number;
  children?: number;
  budget?: string;
  currency?: string;
  booking_reference?: string;
};
