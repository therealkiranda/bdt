import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type Booking } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { EmptyView, ErrorView, LoadingView, SignInPrompt } from "@/src/components/StateViews";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useRemote } from "@/src/hooks/useRemote";
import { formatDateRange, formatDateTime, formatMoney } from "@/src/lib/format";
import { loadOffline, syncOffline } from "@/src/lib/offline";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Row = { booking: Booking };
type Result = { rows: Row[]; offlineSince: string | null };

const TRIP_STATES = ["confirmed", "cancellation_requested", "completed"];

export default function TripsScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const signedIn = status === "signedIn" && !!user;

  const load = useCallback(async (): Promise<Result> => {
    try {
      const page = await api.myBookings(1);
      syncOffline(user!.id).catch(() => {}); // refresh the offline copy in the background
      return { rows: page.items.map((booking) => ({ booking })), offlineSince: null };
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) {
        const cache = await loadOffline(user!.id);
        const rows = Object.values(cache.trips).map((t) => ({ booking: t.booking }));
        if (rows.length) return { rows, offlineSince: cache.generatedAt };
      }
      throw e;
    }
  }, [user]);

  const trips = useRemote(load, [user?.id], signedIn);
  const [first, setFirst] = useState(true);
  useFocusEffect(useCallback(() => { if (first) setFirst(false); else if (signedIn) trips.reload(); }, [signedIn])); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = trips.data?.rows ?? [];
  const confirmed = rows.filter((r) => TRIP_STATES.includes(r.booking.booking_status));
  const requests = rows.filter((r) => !TRIP_STATES.includes(r.booking.booking_status));

  const renderRow = ({ booking: b }: Row) => (
    <Pressable key={b.reference} style={styles.card} onPress={() => router.push(`/trip/${b.reference}`)}>
      <View style={styles.cardTop}><Text style={styles.ref}>{b.reference}</Text><StatusBadge status={b.booking_status} label={b.booking_status_label} /></View>
      <Text style={styles.pkg}>{b.package.title}</Text>
      <Text style={styles.meta}>{formatDateRange(b.departure_date ?? b.preferred_date, b.return_date) || "Dates to be confirmed"} · {b.adults + b.children} traveller{b.adults + b.children === 1 ? "" : "s"}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.total}>{formatMoney(b.total, b.currency)}</Text>
        <StatusBadge status={b.payment_status} label={b.payment_status_label} />
      </View>
    </Pressable>
  );

  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
    refreshControl={signedIn ? <RefreshControl refreshing={trips.refreshing} onRefresh={trips.reload} tintColor={colors.blue} /> : undefined}>
    <View style={styles.titleRow}>
      <View><Text style={styles.eyebrow}>YOUR TRAVEL SPACE</Text><Text style={styles.title}>My trips</Text></View>
      {signedIn ? <Pressable onPress={() => router.push("/notifications")} accessibilityLabel="Notifications" style={styles.bell}><Ionicons name="notifications-outline" size={20} color={colors.navy} /></Pressable> : null}
    </View>

    {!signedIn && status !== "loading" ? <SignInPrompt title="See your bookings" text="Sign in to follow your booking requests, confirmed trips, itineraries and tickets." /> : null}
    {signedIn && trips.loading ? <LoadingView /> : null}
    {signedIn && trips.error && !trips.data ? <ErrorView error={trips.error} onRetry={trips.reload} /> : null}

    {trips.data?.offlineSince ? <View style={styles.offline}><Ionicons name="cloud-offline-outline" size={17} color={colors.blue} /><Text style={styles.offlineText}>You're offline. Showing your saved copy from {formatDateTime(trips.data.offlineSince)}. This is not proof that a booking is confirmed or a ticket is valid; check again online.</Text></View> : null}

    {confirmed.length > 0 ? <><Text style={styles.section}>TRIPS</Text>{confirmed.map(renderRow)}</> : null}
    {requests.length > 0 ? <><Text style={styles.section}>BOOKING REQUESTS</Text>{requests.map(renderRow)}</> : null}
    {signedIn && trips.data && rows.length === 0 ? <EmptyView icon="briefcase-outline" title="Your next story starts here" text="Request a booking from any journey and it will appear here." /> : null}
    {signedIn && trips.data && requests.some((r) => r.booking.booking_status === "pending") ? <Text style={styles.note}>A booking is a request until our team confirms it. No payment is taken in the app.</Text> : null}
  </ScrollView>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.ivory },
    content: { padding: spacing.lg, paddingTop: 27, paddingBottom: 30 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
    eyebrow: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
    title: { color: c.navy, fontSize: 30, fontWeight: "900", marginTop: 7 },
    bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
    section: { color: c.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.4, marginTop: 18, marginBottom: 12 },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: 16, marginBottom: 12 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    ref: { color: c.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
    pkg: { color: c.navy, fontSize: 17, fontWeight: "900", marginTop: 10 },
    meta: { color: c.muted, fontSize: 12, marginTop: 5 },
    cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
    total: { color: c.text, fontWeight: "800", fontSize: 14 },
    offline: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: c.paleBlue, borderRadius: 12, padding: 12, marginTop: 6 },
    offlineText: { color: c.navy, fontSize: 11, lineHeight: 16, flex: 1 },
    note: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: 6 }
  });
}
