import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, errorMessage, fieldErrors, newIdempotencyKey, type CreateEnquiryInput } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { Field, FormBanner, PrimaryButton } from "@/src/components/Form";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EnquiryScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const params = useLocalSearchParams<{ packageSlug?: string; packageTitle?: string; type?: string; bookingReference?: string }>();
  const isSupport = params.type === "support" && !!params.bookingReference && status === "signedIn";
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [message, setMessage] = useState(params.packageTitle ? `I'm interested in ${params.packageTitle}. Please share more details.` : "");
  const [destination, setDestination] = useState("");
  const [adults, setAdults] = useState("2");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const attempt = useRef<{ key: string; fp: string } | null>(null);

  async function submit() {
    setErrors({}); setBanner(null);
    const type: CreateEnquiryInput["type"] = isSupport ? "support" : custom ? "custom_tour" : "general";
    const input: CreateEnquiryInput = { type, name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, message: message.trim() };
    if (params.packageSlug) input.package = params.packageSlug;
    if (isSupport) input.booking_reference = params.bookingReference;
    if (type === "custom_tour") {
      input.destination = destination.trim();
      input.adults = parseInt(adults, 10) || 0;
      if (startDate.trim()) input.start_date = startDate.trim();
      if (endDate.trim()) input.end_date = endDate.trim();
      // The API wants money as a decimal string with exactly 2 decimals ("300000.00").
      const b = budget.trim().replace(/,/g, "");
      if (b) input.budget = /^\d+(\.\d+)?$/.test(b) ? Number(b).toFixed(2) : b; // invalid text is sent as-is so the server reports the field error
    }
    const fp = JSON.stringify(input);
    if (!attempt.current || attempt.current.fp !== fp) attempt.current = { key: newIdempotencyKey(), fp };
    setBusy(true);
    try {
      const r = await api.createEnquiry(input, attempt.current.key);
      attempt.current = null;
      setDone(`${r.message ?? "Thank you. We will reply soon."} Your reference is ${r.data.enquiry.reference}.`);
    } catch (e) {
      const fe = fieldErrors(e);
      setErrors(fe);
      setBanner(e instanceof ApiError && Object.keys(fe).length ? "Please correct the highlighted fields." : errorMessage(e));
    } finally { setBusy(false); }
  }

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
      <Text style={styles.eyebrow}>{isSupport ? "BOOKING SUPPORT" : "LET'S PLAN SOMETHING MEMORABLE"}</Text>
      <Text style={styles.title}>{isSupport ? "How can we\nhelp?" : "Tell us what\nyou have in mind."}</Text>
      <Text style={styles.subtitle}>{isSupport ? `About booking ${params.bookingReference}.` : "Share a few details and the team will reply by email or phone. An enquiry is not a booking: nothing is reserved or priced."}</Text>

      {done ? <>
        <FormBanner tone="info" text={done} />
        <PrimaryButton title="Done" onPress={() => router.back()} />
      </> : <>
        {params.packageTitle ? <View style={styles.packageTag}><Ionicons name="airplane-outline" size={16} color={colors.blue} /><Text style={styles.packageTagText}>{params.packageTitle}</Text></View> : null}
        {!isSupport ? <View style={styles.switch}>
          {[{ k: false, t: "General question" }, { k: true, t: "Custom tour" }].map((o) => (
            <Pressable key={o.t} onPress={() => setCustom(o.k)} style={[styles.switchOpt, custom === o.k && styles.switchOn]}><Text style={[styles.switchText, custom === o.k && { color: colors.blue }]}>{o.t}</Text></Pressable>
          ))}
        </View> : null}
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" error={errors.name} />
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" editable={status !== "signedIn"} error={errors.email} />
        <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        {custom && !isSupport ? <>
          <Field label="Where would you like to go?" value={destination} onChangeText={setDestination} error={errors.destination} />
          <Field label="Adults" value={adults} onChangeText={(v) => setAdults(v.replace(/\D/g, ""))} keyboardType="number-pad" error={errors.adults} />
          <Field label="Start date (YYYY-MM-DD, optional)" value={startDate} onChangeText={setStartDate} error={errors.start_date} />
          <Field label="End date (YYYY-MM-DD, optional)" value={endDate} onChangeText={setEndDate} error={errors.end_date} />
          <Field label="Budget (optional)" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" error={errors.budget} />
        </> : null}
        <Field label="Your enquiry" value={message} onChangeText={setMessage} placeholder="Tell us about your plans..." multiline style={styles.textarea} error={errors.message || errors.booking_reference} />
        {banner ? <FormBanner text={banner} /> : null}
        <PrimaryButton title="Send enquiry" onPress={submit} busy={busy} />
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.ivory },
    content: { padding: spacing.lg, paddingTop: 16, paddingBottom: 35 },
    back: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    eyebrow: { color: c.blue, fontSize: 9, letterSpacing: 1.4, fontWeight: "900" },
    title: { color: c.navy, fontSize: 31, lineHeight: 36, fontWeight: "900", marginTop: 8, letterSpacing: -0.7 },
    subtitle: { color: c.muted, fontSize: 13, lineHeight: 21, marginTop: 12, marginBottom: 22 },
    packageTag: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.paleBlue, padding: 12, borderRadius: 12, marginBottom: 20 },
    packageTagText: { color: c.navy, fontSize: 12, fontWeight: "800", flex: 1 },
    switch: { flexDirection: "row", gap: 8, marginBottom: 6 },
    switchOpt: { flex: 1, alignItems: "center", paddingVertical: 11, borderWidth: 1, borderColor: c.border, borderRadius: radius.pill, backgroundColor: c.surface },
    switchOn: { backgroundColor: c.paleBlue, borderColor: c.blue },
    switchText: { color: c.muted, fontWeight: "800", fontSize: 12 },
    textarea: { minHeight: 130, lineHeight: 20, textAlignVertical: "top" }
  });
}
