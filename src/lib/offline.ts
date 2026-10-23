import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, type AgencyContact, type EmergencyContact, type TripDetail } from "@/src/api";

// Offline copy of the customer's trips, built from GET /me/offline-bundle.
// IMPORTANT (API rule): offline data is a convenience copy, never proof. Screens must show "last verified at ..."
// and re-check online before treating a booking as confirmed or a ticket as valid.

export type OfflineCache = {
  userId: number;
  generatedAt: string | null;
  trips: Record<string, TripDetail>;
  emergencyContacts: EmergencyContact[];
  agencyContact: AgencyContact | null;
};

const key = (userId: number) => `bdt.offline.v1:${userId}`;
const empty = (userId: number): OfflineCache => ({ userId, generatedAt: null, trips: {}, emergencyContacts: [], agencyContact: null });

export async function loadOffline(userId: number): Promise<OfflineCache> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as OfflineCache) : empty(userId);
  } catch {
    return empty(userId);
  }
}

async function save(c: OfflineCache) {
  try { await AsyncStorage.setItem(key(c.userId), JSON.stringify(c)); } catch { /* storage full or unavailable */ }
}

export async function clearOffline(userId: number) {
  try { await AsyncStorage.removeItem(key(userId)); } catch { /* ignore */ }
}

/** Incremental sync. Unchanged trips are kept, changed ones replaced, cancelled / aged-out ones deleted, revoked documents marked. */
export async function syncOffline(userId: number): Promise<OfflineCache> {
  let cache = await loadOffline(userId);
  let bundle = await api.offlineBundle(cache.generatedAt ?? undefined);
  if (bundle.customer.id !== userId) return cache; // never mix another account's data into this cache
  // If the server says "unchanged" for something we don't hold, ask again for everything.
  if (bundle.unchanged.some((ref) => !cache.trips[ref])) {
    cache = empty(userId);
    bundle = await api.offlineBundle();
  }
  const trips: Record<string, TripDetail> = {};
  for (const ref of bundle.unchanged) trips[ref] = cache.trips[ref];
  for (const t of bundle.trips) trips[t.booking.reference] = t;
  for (const r of bundle.removed_trips) delete trips[r.reference];
  // Revoked / replaced documents: never keep them as valid.
  for (const d of bundle.inactive_documents) {
    const t = trips[d.booking_reference];
    if (t) t.documents = t.documents.map((x) => (x.id === d.id ? { ...x, status: d.status as any, download_url: null } : x));
  }
  const next: OfflineCache = { userId, generatedAt: bundle.generated_at, trips, emergencyContacts: bundle.emergency_contacts, agencyContact: bundle.agency_contact };
  await save(next);
  return next;
}

/** Remember a freshly verified online trip so it is available offline next time. */
export async function rememberTrip(userId: number, trip: TripDetail) {
  const c = await loadOffline(userId);
  c.trips[trip.booking.reference] = trip;
  await save(c);
}
