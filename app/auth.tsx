import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, fieldErrors } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { Field, FormBanner, PrimaryButton } from "@/src/components/Form";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "signin" | "signup" | "forgot";

export default function AuthScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const s = makeStyles(colors);

  function switchMode(m: Mode) { setMode(m); setErrors({}); setBanner(null); }

  async function submit() {
    setBusy(true); setErrors({}); setBanner(null);
    try {
      if (mode === "signin") { await signIn(email, password); router.back(); }
      else if (mode === "signup") { await signUp({ name, email, phone, password }); router.back(); }
      else { const msg = await api.forgotPassword(email.trim()); setBanner({ text: msg ?? "If that email has an account, a reset link is on its way.", tone: "info" }); }
    } catch (e) {
      const fe = fieldErrors(e);
      setErrors(fe);
      setBanner({ text: Object.keys(fe).length ? "Please correct the highlighted fields." : errorMessage(e), tone: "error" });
    } finally { setBusy(false); }
  }

  const title = mode === "signin" ? "Welcome back." : mode === "signup" ? "Create your\naccount." : "Reset your\npassword.";
  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top, 16) }]} keyboardShouldPersistTaps="handled">
        <Pressable style={s.back} onPress={() => router.back()} accessibilityLabel="Close"><Ionicons name="close" size={21} color={colors.navy} /></Pressable>
        <Text style={s.eyebrow}>BLACK DIAMOND TOURS</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{mode === "forgot" ? "Enter your email and we'll send a reset link." : "Use the same account as blackdiamondtours.com.np to see your bookings and saved journeys."}</Text>

        {mode === "signup" ? <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" error={errors.name} /> : null}
        <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" error={errors.email} />
        {mode === "signup" ? <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+977 9800000000" error={errors.phone} /> : null}
        {mode !== "forgot" ? <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType={mode === "signup" ? "newPassword" : "password"} error={errors.password} /> : null}
        {mode === "signup" ? <Text style={s.hint}>8–72 characters with at least one letter and one number.</Text> : null}

        {banner ? <FormBanner text={banner.text} tone={banner.tone} /> : null}
        <PrimaryButton title={mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"} onPress={submit} busy={busy} />

        <View style={s.links}>
          {mode === "signin" ? <>
            <Pressable onPress={() => switchMode("forgot")}><Text style={s.link}>Forgot password?</Text></Pressable>
            <Pressable onPress={() => switchMode("signup")}><Text style={s.link}>Create an account</Text></Pressable>
          </> : <Pressable onPress={() => switchMode("signin")}><Text style={s.link}>Back to sign in</Text></Pressable>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.ivory },
    content: { padding: spacing.lg, paddingBottom: 40 },
    back: { width: 42, height: 42, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    eyebrow: { color: c.blue, fontSize: 9, letterSpacing: 1.4, fontWeight: "900" },
    title: { color: c.navy, fontSize: 31, lineHeight: 36, fontWeight: "900", marginTop: 8, letterSpacing: -0.7 },
    subtitle: { color: c.muted, fontSize: 13, lineHeight: 21, marginTop: 12, marginBottom: 10 },
    hint: { color: c.muted, fontSize: 11, marginTop: 8 },
    links: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
    link: { color: c.blue, fontWeight: "800", fontSize: 12 }
  });
}
