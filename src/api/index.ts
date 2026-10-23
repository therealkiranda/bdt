import { API_BASE_URL } from "./config";
import { authHeader, request } from "./client";
import type {
  AppConfig, AppNotification, AuthResult, Availability, Booking, Category, CreateBookingInput, CreateEnquiryInput, Destination,
  DestinationDetail, EmergencyContact, Enquiry, HomeData, OfflineBundle, PackageCard, PackageDetail, PackageQuery, Paged,
  Review, TripDetail, TripDocument, TripSummary, User
} from "./types";

export * from "./types";
export { ApiError, errorMessage, fieldErrors, setSessionExpiredHandler } from "./client";
export { API_BASE_URL } from "./config";

/** One key per user attempt; reuse it for every retry of that same attempt (the server de-duplicates on it). */
export function newIdempotencyKey(): string {
  const r = () => Math.random().toString(36).slice(2, 10);
  return `bdt-${Date.now().toString(36)}-${r()}${r()}`;
}

const paged = <T,>(r: { data: T[]; meta: Record<string, any> }): Paged<T> => ({
  items: r.data,
  meta: { page: 1, limit: r.data.length, total: r.data.length, pages: 1, ...r.meta }
});

export const api = {
  // ---------- public catalogue (a token, if present, personalises is_saved) ----------
  home: () => request<HomeData>("/home", { auth: "optional" }).then((r) => r.data),
  config: () => request<AppConfig>("/config").then((r) => r.data),
  packages: (q: PackageQuery = {}) =>
    request<PackageCard[]>("/packages", { auth: "optional", query: { ...q, featured: q.featured ? 1 : undefined, limit: q.limit ?? 12 } }).then(paged),
  package: (slug: string) => request<PackageDetail>(`/packages/${encodeURIComponent(slug)}`, { auth: "optional" }).then((r) => r.data),
  availability: (slug: string, q: { departure_id?: number | null; adults?: number; children?: number } = {}) =>
    request<Availability>(`/packages/${encodeURIComponent(slug)}/availability`, { query: q }).then((r) => r.data),
  reviews: (slug: string, page = 1) =>
    request<Review[]>(`/packages/${encodeURIComponent(slug)}/reviews`, { query: { page, limit: 5 } }).then(paged),
  destinations: () => request<Destination[]>("/destinations").then((r) => r.data),
  destination: (slug: string) => request<DestinationDetail>(`/destinations/${encodeURIComponent(slug)}`, { auth: "optional" }).then((r) => r.data),
  categories: () => request<Category[]>("/categories").then((r) => r.data),
  emergencyContacts: (destination?: string) => request<EmergencyContact[]>("/emergency-contacts", { query: { destination } }).then((r) => r.data),

  // ---------- auth ----------
  register: (b: { name: string; email: string; phone?: string; password: string; device_name?: string }) =>
    request<AuthResult>("/auth/register", { method: "POST", body: b }).then((r) => r.data),
  login: (b: { email: string; password: string; device_name?: string }) =>
    request<AuthResult>("/auth/login", { method: "POST", body: b }).then((r) => r.data),
  logout: () => request<null>("/auth/logout", { method: "POST", auth: "required" }),
  forgotPassword: (email: string) => request<null>("/auth/forgot-password", { method: "POST", body: { email } }).then((r) => r.message),
  resendVerification: () => request<null>("/auth/resend-verification", { method: "POST", auth: "required" }).then((r) => r.message),

  // ---------- account ----------
  me: () => request<{ user: User }>("/me", { auth: "required" }).then((r) => r.data.user),
  updateMe: (b: { name: string; phone?: string | null }) =>
    request<{ user: User }>("/me", { method: "PATCH", auth: "required", body: b }).then((r) => r.data.user),
  changePassword: (b: { current_password: string; password: string }) => request<null>("/me/password", { method: "POST", auth: "required", body: b }),
  deleteAccount: (password: string) => request<null>("/me", { method: "DELETE", auth: "required", body: { password } }),

  // ---------- saved packages ----------
  savedPackages: (page = 1) => request<PackageCard[]>("/me/saved-packages", { auth: "required", query: { page, limit: 20 } }).then(paged),
  savePackage: (slug: string) => request<{ slug: string; is_saved: boolean }>(`/me/saved-packages/${encodeURIComponent(slug)}`, { method: "PUT", auth: "required" }),
  unsavePackage: (slug: string) => request<{ slug: string; is_saved: boolean }>(`/me/saved-packages/${encodeURIComponent(slug)}`, { method: "DELETE", auth: "required" }),

  // ---------- bookings (requests; payment is recorded offline by staff) ----------
  createBooking: (input: CreateBookingInput, idempotencyKey: string) =>
    request<{ booking: Booking }>("/bookings", { method: "POST", auth: "required", body: input, idempotencyKey }),
  booking: (ref: string) => request<Booking>(`/bookings/${encodeURIComponent(ref)}`, { auth: "required" }).then((r) => r.data),
  cancelBooking: (ref: string, reason?: string) =>
    request<{ result: string; booking: Booking }>(`/bookings/${encodeURIComponent(ref)}/cancel`, { method: "POST", auth: "required", body: { reason } }),
  myBookings: (page = 1, status?: string) => request<Booking[]>("/me/bookings", { auth: "required", query: { page, limit: 20, status } }).then(paged),

  // ---------- trips, documents, offline ----------
  trips: (scope: "upcoming" | "past" | "all" = "all") => request<TripSummary[]>("/me/trips", { auth: "required", query: { scope } }).then((r) => r.data),
  trip: (ref: string) => request<TripDetail>(`/me/trips/${encodeURIComponent(ref)}`, { auth: "required" }).then((r) => r.data),
  tripDocuments: (ref: string) => request<TripDocument[]>(`/me/trips/${encodeURIComponent(ref)}/documents`, { auth: "required" }).then((r) => r.data),
  offlineBundle: (since?: string) => request<OfflineBundle>("/me/offline-bundle", { auth: "required", query: { since } }).then((r) => r.data),

  // ---------- enquiries ----------
  createEnquiry: (input: CreateEnquiryInput, idempotencyKey: string) =>
    request<{ enquiry: Enquiry }>("/enquiries", { method: "POST", auth: "optional", body: input, idempotencyKey }),

  // ---------- notifications ----------
  notifications: (page = 1) => request<AppNotification[]>("/me/notifications", { auth: "required", query: { page, limit: 20 } }).then(paged),
  markNotificationRead: (id: number) => request<AppNotification>(`/me/notifications/${id}/read`, { method: "POST", auth: "required" }),
  markAllNotificationsRead: () => request<{ marked_read: number }>("/me/notifications/read-all", { method: "POST", auth: "required" }),

  // ---------- reviews ----------
  createReview: (b: { booking_reference: string; rating: number; title?: string; review: string }) =>
    request<{ id: number; status: string }>("/reviews", { method: "POST", auth: "required", body: b })
};

export function documentDownloadUrl(ref: string, id: number) {
  return `${API_BASE_URL}/me/trips/${encodeURIComponent(ref)}/documents/${id}/download`;
}
export { authHeader };
