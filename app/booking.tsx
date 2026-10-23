import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, errorMessage, fieldErrors, newIdempotencyKey, type Availability, type CreateBookingInput } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { Field, FormBanner, PrimaryButton } from "@/src/components/Form";
import { ErrorView, LoadingView, SignInPrompt } from "@/src/components/StateViews";
import { useRemote } from "@/src/hooks/useRemote";
import { formatDate, formatMoney } from "@/src/lib/format";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookingScreen() {
  const { colors } = useAppTheme();
  const s = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const signedIn = status === "signedIn";

  const pkg = useRemote(() => api.package(String(slug)), [slug]);
  const config = useRemote(() => api.config(), []);
  const cfg = config.data;

  const [departureId, setDepartureId] = useState<number | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [method, setMethod] = useState("");
  const [requests, setRequests] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<Availability | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  // One idempotency key per user attempt; reused for retries of the same request body (so a dropped connection can never double-book).
  const attempt = useRef<{ key: string; fp: string } | null>(null);

  useEffect(() => { if (!phone && user?.phone) setPhone(user.phone); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!method && cfg?.payment_methods[0]) setMethod(cfg.payment_methods[0].code); }, [cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = pkg.data;
  const hasDates = !!p && !p.flexible_dates;
  const maxTravelers = cfg?.booking.max_travelers ?? 20;
  const others = Math.max(0, adults + children - 1);

  // Live price quote from the server (never computed locally).
  useEffect(() => {
    if (!p) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const q = await api.availability(p.slug, { departure_id: departureId, adults, children });
        if (alive) { setQuote(q); setQuoteError(null); }
      } catch (e) { if (alive) { setQuote(null); setQuoteError(errorMessage(e)); } }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [p, departureId, adults, children]);

  const total = quote?.quote?.total;
  const currency = quote?.quote?.currency ?? p?.currency ?? "";

  async function submit() {
    if (!p) return;
    setErrors({}); setBanner(null);
    if (!terms) { setErrors({ accept_terms: "You must accept the booking terms." }); return; }
    const input: CreateBookingInput = {
      package: p.slug,
      departure_id: hasDates ? departureId : null,
      preferred_date: !hasDates && preferredDate.trim() ? preferredDate.trim() : null,
      adults, children,
      customer_phone: phone.trim(),
      payment_method: method,
      special_requests: requests.trim() || null,
      accept_terms: true,
      expected_total: total,
      passengers: Array.from({ length: others }, (_, i) => {
        const age = (ages[i] ?? "").trim();
        return { name: (names[i] ?? "").trim(), ...(age ? { age: parseInt(age, 10) } : {}) };
      })
    };
    const fp = JSON.stringify(input);
    if (!attempt.current || attempt.current.fp !== fp) attempt.current = { key: newIdempotencyKey(), fp };
    setBusy(true);
    try {
      const r = await api.createBooking(input, attempt.current.key);
      attempt.current = null;
      Alert.alert("Booking request received", "Our team will review it and confirm. No payment has been taken.");
      router.replace(`/trip/${r.data.booking.reference}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(fieldErrors(e));
        if (e.code === "price_changed") {
          setBanner("The price changed since you last viewed it. Please review the new total below and submit again.");
          attempt.current = null;
        } else if (e.isNetwork) {
          setBanner("We couldn't confirm whether your request was received. Tap submit again: retrying is safe and will not create a duplicate booking.");
        } else if (e.status === 401) {
          setBanner("Please sign in again to continue.");
        } else setBanner(e.status === 422 && Object.keys(e.errors ?? {}).length ? "Please correct the highlighted fields." : errorMessage(e));
      } else setBanner(errorMessage(e));
    } finally { setBusy(false); }
  }

  const err = (k: string) => errors[k];
  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top, 16) }]} keyboardShouldPersistTaps="handled">
        <Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
        <Text style={s.eyebrow}>BOOKING REQUEST</Text>
        <Text style={s.title}>{p?.title ?? "Request a booking"}</Text>
        <Text style={s.subtitle}>Send a request and our team will confirm it. No payment is taken in the app.</Text>

        {!signedIn && status !== "loading" ? <SignInPrompt title="Sign in to book" text="Booking requests are tied to your Black Diamond Tours account so you can follow them under My Trips." /> : null}
        {pkg.loading || config.loading ? <LoadingView /> : null}
        {pkg.error && !p ? <ErrorView error={pkg.error} onRetry={pkg.reload} /> : null}
        {config.error && !cfg ? <ErrorView error={config.error} onRetry={config.reload} /> : null}

        {signedIn && p && cfg ? <>
          {hasDates ? <>
            <Text style={s.label}>DEPARTURE</Text>
            {p.departures.map((d) => {
              const open = d.status === "open";
              const on = departureId === d.id;
              return <Pressable key={d.id} disabled={!open} onPress={() => setDepartureId(d.id)} style={[s.option, on && s.optionOn, !open && { opacity: 0.45 }]}>
                <View style={{ flex: 1 }}><Text style={s.optTitle}>{formatDate(d.departure_date)}{d.return_date ? ` – ${formatDate(d.return_date)}` : ""}</Text><Text style={s.optMeta}>{open ? `${d.seats_left} seats left` : d.status === "full" ? "Fully booked" : "Closed"} · {formatMoney(d.price, d.currency)} per person</Text></View>
                <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.blue : colors.muted} />
              </Pressable>;
            })}
            {err("departure_id") ? <Text style={s.error}>{err("departure_id")}</Text> : null}
          </> : <Field label="Preferred date (YYYY-MM-DD)" value={preferredDate} onChangeText={setPreferredDate} placeholder="2026-12-01" keyboardType="numbers-and-punctuation" error={err("preferred_date")} />}

          <Text style={s.label}>TRAVELLERS</Text>
          <Stepper s={s} colors={colors} label="Adults" value={adults} min={1} max={maxTravelers - children} onChange={setAdults} />
          <Stepper s={s} colors={colors} label="Children" value={children} min={0} max={maxTravelers - adults} onChange={setChildren} />
          {err("adults") ? <Text style={s.error}>{err("adults")}</Text> : null}
          {err("children") ? <Text style={s.error}>{err("children")}</Text> : null}

          {others > 0 ? <>
            <Text style={s.label}>OTHER TRAVELLERS{cfg.booking.require_passenger_names ? "" : " (OPTIONAL)"}</Text>
            <Text style={s.hint}>You ({user?.name}) are traveller 1.</Text>
            {Array.from({ length: others }, (_, i) => {
              const child = i >= adults - 1;
              return <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Field label={`${child ? "Child" : "Adult"} ${i + 2} name`} value={names[i] ?? ""} onChangeText={(v) => setNames((a) => { const n = [...a]; n[i] = v; return n; })} autoCapitalize="words" error={err(`passengers.${i}`)} /></View>
                {child ? <View style={{ width: 80 }}><Field label="Age" value={ages[i] ?? ""} onChangeText={(v) => setAges((a) => { const n = [...a]; n[i] = v.replace(/\D/g, ""); return n; })} keyboardType="number-pad" /></View> : null}
              </View>;
            })}
          </> : null}

          <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+977 9800000000" error={err("customer_phone")} />
          <Field label="Special requests (optional)" value={requests} onChangeText={setRequests} multiline style={{ minHeight: 80, textAlignVertical: "top" }} error={err("special_requests")} />

          <Text style={s.label}>PAYMENT METHOD</Text>
          {cfg.payment_methods.map((m) => {
            const on = method === m.code;
            return <Pressable key={m.code} onPress={() => setMethod(m.code)} style={[s.option, on && s.optionOn]}>
              <View style={{ flex: 1 }}><Text style={s.optTitle}>{m.label}</Text>{m.description ? <Text style={s.optMeta}>{m.description}</Text> : null}</View>
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.blue : colors.muted} />
            </Pressable>;
          })}
          <Text style={s.hint}>Payment is arranged with our team after your request. You'll pay offline (for example bank transfer), not in the app.</Text>
          {err("payment_method") ? <Text style={s.error}>{err("payment_method")}</Text> : null}

          {cfg.cancellation_policy ? <View style={s.policy}><Text style={s.policyTitle}>Cancellation policy</Text><Text style={s.policyText}>{cfg.cancellation_policy}</Text></View> : null}
          <Pressable style={s.terms} onPress={() => setTerms((v) => !v)}>
            <Ionicons name={terms ? "checkbox" : "square-outline"} size={22} color={terms ? colors.blue : colors.muted} />
            <Text style={s.termsText}>I accept the booking terms and understand this is a request that the agency must confirm.</Text>
          </Pressable>
          {err("accept_terms") ? <Text style={s.error}>{err("accept_terms")}</Text> : null}

          <View style={s.totalBox}>
            <Text style={s.totalLabel}>ESTIMATED TOTAL</Text>
            <Text style={s.totalValue}>{total ? formatMoney(total, currency) : "—"}</Text>
            {quote?.quote && !quote.quote.seats_available ? <Text style={s.error}>Not enough seats left on this departure.</Text> : null}
            {quoteError ? <Text style={s.error}>{quoteError}</Text> : null}
          </View>

          {banner ? <FormBanner text={banner} /> : null}
          <PrimaryButton title="Send booking request" onPress={submit} busy={busy} disabled={hasDates && departureId === null} />
        </> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stepper({ label, value, min, max, onChange, s, colors }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; s: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  return <View style={s.stepper}>
    <Text style={s.optTitle}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Pressable disabled={value <= min} onPress={() => onChange(value - 1)} style={[s.stepBtn, value <= min && { opacity: 0.4 }]} accessibilityLabel={`Fewer ${label}`}><Ionicons name="remove" size={18} color={colors.navy} /></Pressable>
      <Text style={[s.optTitle, { minWidth: 18, textAlign: "center" }]}>{value}</Text>
      <Pressable disabled={value >= max} onPress={() => onChange(value + 1)} style={[s.stepBtn, value >= max && { opacity: 0.4 }]} accessibilityLabel={`More ${label}`}><Ionicons name="add" size={18} color={colors.navy} /></Pressable>
    </View>
  </View>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.ivory },
    content: { padding: spacing.lg, paddingBottom: 40 },
    back: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 22 },
    eyebrow: { color: c.blue, fontSize: 9, letterSpacing: 1.4, fontWeight: "900" },
    title: { color: c.navy, fontSize: 27, lineHeight: 32, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 },
    subtitle: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
    label: { color: c.navy, fontSize: 9, letterSpacing: 1.3, fontWeight: "900", marginBottom: 8, marginTop: 20 },
    hint: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
    error: { color: "#D6455D", fontSize: 11, marginTop: 6 },
    option: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 14, marginBottom: 8 },
    optionOn: { borderColor: c.blue, backgroundColor: c.paleBlue },
    optTitle: { color: c.navy, fontWeight: "800", fontSize: 13 },
    optMeta: { color: c.muted, fontSize: 11, marginTop: 3 },
    stepper: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.paleBlue, alignItems: "center", justifyContent: "center" },
    policy: { backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 18 },
    policyTitle: { color: c.navy, fontWeight: "800", fontSize: 12 },
    policyText: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    terms: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 16 },
    termsText: { color: c.text, fontSize: 12, lineHeight: 18, flex: 1 },
    totalBox: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: 16, marginTop: 20 },
    totalLabel: { color: c.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
    totalValue: { color: c.navy, fontSize: 24, fontWeight: "900", marginTop: 6 }
  });
}
