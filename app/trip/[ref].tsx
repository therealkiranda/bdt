import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, errorMessage, type Booking, type TripDetail } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { Field, FormBanner, PrimaryButton } from "@/src/components/Form";
import { ErrorView, LoadingView } from "@/src/components/StateViews";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useRemote } from "@/src/hooks/useRemote";
import { openDocument, purgeInactive } from "@/src/lib/documents";
import { formatBytes, formatDate, formatDateRange, formatDateTime, formatMoney, toTitle } from "@/src/lib/format";
import { loadOffline, rememberTrip } from "@/src/lib/offline";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Loaded = { booking: Booking; trip: TripDetail | null; offlineSince: string | null };
const TRIP_STATES = ["confirmed", "cancellation_requested", "completed"];

export default function TripDetailScreen() {
  const { colors } = useAppTheme();
  const s = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewMsg, setReviewMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  const load = useCallback(async (): Promise<Loaded> => {
    try {
      const booking = await api.booking(String(ref));
      let trip: TripDetail | null = null;
      if (TRIP_STATES.includes(booking.booking_status)) {
        trip = await api.trip(String(ref));
        if (user) { rememberTrip(user.id, trip).catch(() => {}); purgeInactive(trip.booking.reference, trip.documents).catch(() => {}); }
      }
      return { booking, trip, offlineSince: null };
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork && user) {
        const cache = await loadOffline(user.id);
        const t = cache.trips[String(ref)];
        if (t) return { booking: t.booking, trip: t, offlineSince: cache.generatedAt };
      }
      throw e;
    }
  }, [ref, user]);
  const res = useRemote(load, [ref, user?.id], !!user);
  const d = res.data;
  const b = d?.booking;
  const t = d?.trip;
  const online = !!d && !d.offlineSince;

  function confirmCancel() {
    if (!b) return;
    const paid = b.payment_status === "paid";
    Alert.alert(b.booking_status === "pending" ? "Cancel this request?" : "Request cancellation?",
      paid ? "This booking is paid. Our team will review the cancellation and any refund." : "Seats held for this booking will be released.",
      [{ text: "Keep booking", style: "cancel" }, { text: "Continue", style: "destructive", onPress: doCancel }]);
  }
  async function doCancel() {
    setBusy("cancel");
    try {
      const r = await api.cancelBooking(String(ref));
      Alert.alert(r.message ?? "Done");
      await res.reload();
    } catch (e) { Alert.alert("Couldn't cancel", errorMessage(e)); } finally { setBusy(null); }
  }
  async function openDoc(doc: TripDetail["documents"][number]) {
    setBusy(`doc${doc.id}`);
    try { await openDocument(String(ref), doc); }
    catch (e) { Alert.alert("Couldn't open document", errorMessage(e)); res.reload(); } finally { setBusy(null); }
  }
  async function submitReview() {
    setReviewMsg(null);
    if (rating < 1) { setReviewMsg({ text: "Choose a star rating.", tone: "error" }); return; }
    setBusy("review");
    try {
      const r = await api.createReview({ booking_reference: String(ref), rating, review: reviewText.trim() });
      setReviewMsg({ text: r.message ?? "Thank you. Your review will appear after approval.", tone: "info" });
      setRating(0); setReviewText("");
    } catch (e) { setReviewMsg({ text: errorMessage(e), tone: "error" }); } finally { setBusy(null); }
  }
  const call = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`).catch(() => {});

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top, 16) }]} refreshControl={<RefreshControl refreshing={res.refreshing} onRefresh={res.reload} tintColor={colors.blue} />}>
        <Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
        {res.loading ? <LoadingView /> : null}
        {res.error && !d ? <ErrorView error={res.error} onRetry={res.reload} /> : null}

        {b ? <>
          <Text style={s.eyebrow}>{b.reference}</Text>
          <Text style={s.title}>{b.package.title}</Text>
          <View style={s.badges}><StatusBadge status={b.booking_status} label={b.booking_status_label} /><StatusBadge status={b.payment_status} label={b.payment_status_label} /></View>

          {t ? (
            <View style={s.verify}>
              <Ionicons name={online ? "shield-checkmark-outline" : "cloud-offline-outline"} size={17} color={colors.blue} />
              <Text style={s.verifyText}>{online
                ? `Verified with our server at ${formatDateTime(t.verification.server_time)}.`
                : `Offline copy, last verified ${formatDateTime(d!.offlineSince)}. ${t.verification.notice}`}</Text>
            </View>
          ) : null}
          {b.booking_status === "pending" ? <View style={s.verify}><Ionicons name="time-outline" size={17} color={colors.blue} /><Text style={s.verifyText}>This is a booking request. Seats are held while our team reviews it; it is not confirmed until you see "Confirmed".</Text></View> : null}

          <Card title="Booking" s={s}>
            <Row s={s} k="Dates" v={formatDateRange(b.departure_date ?? b.preferred_date, b.return_date) || "To be confirmed"} />
            <Row s={s} k="Travellers" v={`${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`} />
            <Row s={s} k="Total" v={formatMoney(b.total, b.currency)} />
            <Row s={s} k="Paid" v={formatMoney(b.amount_paid, b.currency)} />
            <Row s={s} k="Balance due" v={formatMoney(b.balance_due, b.currency)} />
            {b.payment?.method_label ? <Row s={s} k="Payment method" v={b.payment.method_label} /> : null}
            {b.payment?.instructions ? <Text style={s.instructions}>{b.payment.instructions}</Text> : null}
          </Card>

          {b.passengers && b.passengers.length > 0 ? <Card title="Travellers" s={s}>{b.passengers.map((p, i) => <Row key={i} s={s} k={p.is_child ? "Child" : "Adult"} v={`${p.name}${p.age != null ? ` (${p.age})` : ""}`} />)}</Card> : null}

          {t && t.documents.length > 0 ? (
            <Card title="Tickets and documents" s={s}>
              {t.documents.map((doc) => (
                <Pressable key={doc.id} disabled={doc.status !== "active" || !!busy} onPress={() => openDoc(doc)} style={s.docRow}>
                  <Ionicons name={doc.mime === "application/pdf" ? "document-text-outline" : "image-outline"} size={22} color={doc.status === "active" ? colors.blue : colors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.docTitle, doc.status !== "active" && { textDecorationLine: "line-through", color: colors.muted }]}>{doc.title}</Text>
                    <Text style={s.docMeta}>{toTitle(doc.type)} · v{doc.version} · {formatBytes(doc.size_bytes)}{doc.status !== "active" ? ` · ${doc.status === "replaced" ? "replaced by a newer version" : "no longer valid"}` : ""}</Text>
                  </View>
                  {doc.status === "active" ? <Text style={s.docAction}>{busy === `doc${doc.id}` ? "…" : "Open"}</Text> : null}
                </Pressable>
              ))}
            </Card>
          ) : null}

          {t && t.itinerary.length > 0 ? (
            <Card title="Itinerary" s={s}>
              {t.itinerary.map((day) => (
                <View key={day.day} style={{ marginBottom: 14 }}>
                  <Text style={s.day}>DAY {day.day}</Text>
                  <Text style={s.dayTitle}>{day.title}</Text>
                  {day.description ? <Text style={s.body}>{day.description}</Text> : null}
                  {day.locations.map((l) => <Text key={l.id} style={s.loc}>📍 {l.name}{l.address ? ` · ${l.address}` : ""}</Text>)}
                </View>
              ))}
            </Card>
          ) : null}

          {t && (t.inclusions.length > 0 || t.exclusions.length > 0) ? (
            <Card title="What's included" s={s}>
              {t.inclusions.map((x, i) => <Text key={`i${i}`} style={s.body}>✓ {x}</Text>)}
              {t.exclusions.map((x, i) => <Text key={`e${i}`} style={[s.body, { color: colors.muted }]}>✕ {x}</Text>)}
            </Card>
          ) : null}
          {t?.important_info ? <Card title="Important information" s={s}><Text style={s.body}>{t.important_info}</Text></Card> : null}

          {t && t.emergency_contacts.length > 0 ? (
            <Card title="Emergency contacts" s={s}>
              {t.emergency_contacts.map((c) => (
                <Pressable key={c.id} disabled={!c.phone} onPress={() => c.phone && call(c.phone)} style={s.docRow}>
                  <Ionicons name="call-outline" size={20} color={colors.blue} />
                  <View style={{ flex: 1 }}><Text style={s.docTitle}>{c.label}</Text><Text style={s.docMeta}>{[c.phone, c.availability].filter(Boolean).join(" · ")}</Text></View>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {t?.agency_contact?.phone || t?.agency_contact?.email ? (
            <Card title="Contact the agency" s={s}>
              {t.agency_contact.phone ? <Pressable onPress={() => call(t.agency_contact.phone!)}><Text style={s.link}>{t.agency_contact.phone}</Text></Pressable> : null}
              {t.agency_contact.email ? <Pressable onPress={() => Linking.openURL(`mailto:${t.agency_contact.email}`)}><Text style={s.link}>{t.agency_contact.email}</Text></Pressable> : null}
              {t.agency_contact.whatsapp ? <Pressable onPress={() => Linking.openURL(`https://wa.me/${t.agency_contact.whatsapp!.replace(/\D/g, "")}`)}><Text style={s.link}>WhatsApp</Text></Pressable> : null}
            </Card>
          ) : null}

          {online && b.booking_status === "completed" ? (
            <Card title="Review this trip" s={s}>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}><Ionicons name={n <= rating ? "star" : "star-outline"} size={28} color={colors.amber} /></Pressable>)}
              </View>
              <Field label="Your review" value={reviewText} onChangeText={setReviewText} multiline placeholder="At least 10 characters" style={{ minHeight: 90, textAlignVertical: "top" }} />
              {reviewMsg ? <FormBanner text={reviewMsg.text} tone={reviewMsg.tone} /> : null}
              <PrimaryButton title="Submit review" onPress={submitReview} busy={busy === "review"} />
            </Card>
          ) : null}

          {online ? (
            <Pressable style={s.help} onPress={() => router.push({ pathname: "/enquiry", params: { type: "support", bookingReference: b.reference } })}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.blue} /><Text style={s.helpText}>Ask about this booking</Text>
            </Pressable>
          ) : null}
          {online && b.can_cancel ? (
            <Pressable style={s.cancel} onPress={confirmCancel} disabled={!!busy}>
              <Text style={s.cancelText}>{busy === "cancel" ? "Please wait…" : b.booking_status === "pending" ? "Cancel request" : "Request cancellation"}</Text>
            </Pressable>
          ) : null}
        </> : null}
      </ScrollView>
    </View>
  );
}

function Card({ title, children, s }: { title: string; children: React.ReactNode; s: ReturnType<typeof makeStyles> }) {
  return <View style={s.card}><Text style={s.cardTitle}>{title}</Text>{children}</View>;
}
function Row({ k, v, s }: { k: string; v: string; s: ReturnType<typeof makeStyles> }) {
  return <View style={s.row}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.ivory },
    content: { padding: spacing.lg, paddingBottom: 40 },
    back: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 22 },
    eyebrow: { color: c.blue, fontSize: 10, letterSpacing: 1.3, fontWeight: "900" },
    title: { color: c.navy, fontSize: 27, lineHeight: 32, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 },
    badges: { flexDirection: "row", gap: 8, marginTop: 14 },
    verify: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: c.paleBlue, borderRadius: 12, padding: 12, marginTop: 16 },
    verifyText: { color: c.navy, fontSize: 11, lineHeight: 16, flex: 1 },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: 16, marginTop: 16 },
    cardTitle: { color: c.navy, fontSize: 15, fontWeight: "900", marginBottom: 12 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
    k: { color: c.muted, fontSize: 12 },
    v: { color: c.text, fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right" },
    instructions: { color: c.text, fontSize: 12, lineHeight: 18, marginTop: 10, backgroundColor: c.surfaceAlt, padding: 10, borderRadius: 10 },
    docRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 },
    docTitle: { color: c.navy, fontSize: 13, fontWeight: "800" },
    docMeta: { color: c.muted, fontSize: 10, marginTop: 3 },
    docAction: { color: c.blue, fontWeight: "800", fontSize: 12 },
    day: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
    dayTitle: { color: c.navy, fontSize: 14, fontWeight: "800", marginTop: 3 },
    body: { color: c.text, fontSize: 12, lineHeight: 19, marginTop: 4 },
    loc: { color: c.muted, fontSize: 11, marginTop: 4 },
    link: { color: c.blue, fontWeight: "800", fontSize: 13, paddingVertical: 5 },
    help: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.pill, padding: 14, marginTop: 18 },
    helpText: { color: c.blue, fontWeight: "800", fontSize: 13 },
    cancel: { alignItems: "center", borderWidth: 1, borderColor: "#D6455D", borderRadius: radius.pill, padding: 14, marginTop: 12 },
    cancelText: { color: "#D6455D", fontWeight: "800", fontSize: 13 }
  });
}
