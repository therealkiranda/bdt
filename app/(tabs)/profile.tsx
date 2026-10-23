import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, errorMessage, fieldErrors, API_BASE_URL } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { Field, FormBanner, PrimaryButton } from "@/src/components/Form";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status, user, setUser, signOut, localSignOut } = useAuth();
  const signedIn = status === "signedIn" && !!user;
  const [panel, setPanel] = useState<"none" | "edit" | "delete">("none");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  function open(p: "edit" | "delete") {
    setErrors({}); setMsg(null); setPassword("");
    setName(user?.name ?? ""); setPhone(user?.phone ?? "");
    setPanel((cur) => (cur === p ? "none" : p));
  }
  async function saveProfile() {
    setBusy(true); setErrors({}); setMsg(null);
    try {
      const u = await api.updateMe({ name: name.trim(), phone: phone.trim() || null });
      setUser(u); setMsg({ text: "Profile updated.", tone: "info" });
    } catch (e) { setErrors(fieldErrors(e)); setMsg({ text: errorMessage(e), tone: "error" }); } finally { setBusy(false); }
  }
  async function resend() {
    try { Alert.alert(await api.resendVerification() ?? "Done"); } catch (e) { Alert.alert("Couldn't send", errorMessage(e)); }
  }
  async function deleteAccount() {
    setBusy(true); setMsg(null);
    try {
      await api.deleteAccount(password);
      await localSignOut();
      Alert.alert("Account deleted", "Your account has been deleted.");
    } catch (e) { setMsg({ text: errorMessage(e), tone: "error" }); } finally { setBusy(false); }
  }

  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>YOUR TRAVEL COMPANION</Text>
    <Text style={styles.title}>Profile</Text>
    <View style={styles.profileCard}>
      <View style={styles.avatar}><Ionicons name="person" size={29} color={colors.blue} /></View>
      <Text style={styles.name}>{signedIn ? user!.name : "Welcome, traveller"}</Text>
      <Text style={styles.guest}>{signedIn ? user!.email : "Browsing as a guest"}</Text>
      {signedIn && !user!.email_verified ? <Pressable onPress={resend}><Text style={[styles.helper, { color: colors.blue, fontWeight: "700" }]}>Email not verified. Tap to resend the link.</Text></Pressable> : null}
      {!signedIn ? <>
        <Text style={styles.helper}>Sign in with your Black Diamond Tours account to book, save journeys and see your trips.</Text>
        <Pressable style={styles.signIn} onPress={() => router.push("/auth")}><Text style={styles.signInText}>Sign in or create account</Text></Pressable>
      </> : null}
    </View>
    <View style={styles.themeCard}>
      <View style={styles.themeHeading}>
        <View style={styles.rowIcon}><Ionicons name="color-palette-outline" size={20} color={colors.blue} /></View>
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Appearance</Text><Text style={styles.rowDetail}>Choose how the app looks</Text></View>
      </View>
      <View style={styles.themeOptions}>
        {([{key:"system",label:"System",icon:"phone-portrait-outline"},{key:"light",label:"Light",icon:"sunny-outline"},{key:"dark",label:"Dark",icon:"moon-outline"}] as const).map(option=><Pressable key={option.key} accessibilityRole="button" accessibilityState={{selected:mode===option.key}} onPress={()=>setMode(option.key)} style={[styles.themeOption,mode===option.key&&styles.themeOptionActive]}><Ionicons name={option.icon} size={16} color={mode===option.key?colors.blue:colors.muted}/><Text style={[styles.themeOptionText,mode===option.key&&styles.themeOptionTextActive]}>{option.label}</Text></Pressable>)}
      </View>
    </View>
    <View style={styles.menu}>
      {signedIn ? <Pressable onPress={() => open("edit")} style={styles.row}>
        <View style={styles.rowIcon}><Ionicons name="person-outline" size={20} color={colors.blue} /></View>
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Account details</Text><Text style={styles.rowDetail}>{user!.phone ?? "Edit your name and phone"}</Text></View>
        <Ionicons name={panel === "edit" ? "chevron-down" : "chevron-forward"} size={18} color={colors.muted} />
      </Pressable> : null}
      {panel === "edit" ? <View style={{ paddingBottom: 14 }}>
        <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        {msg ? <FormBanner text={msg.text} tone={msg.tone} /> : null}
        <PrimaryButton title="Save changes" onPress={saveProfile} busy={busy} />
      </View> : null}
      {signedIn ? <Pressable onPress={() => router.push("/notifications")} style={styles.row}>
        <View style={styles.rowIcon}><Ionicons name="notifications-outline" size={20} color={colors.blue} /></View>
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Notifications</Text><Text style={styles.rowDetail}>Booking and ticket updates</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable> : null}
      <Pressable onPress={() => router.push("/enquiry")} style={styles.row}>
        <View style={styles.rowIcon}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.blue} /></View>
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Contact the team</Text><Text style={styles.rowDetail}>Send a travel enquiry</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </View>
    {signedIn ? <>
      <Pressable style={styles.outline} onPress={() => signOut()}><Text style={styles.outlineText}>Sign out</Text></Pressable>
      <Pressable style={{ alignItems: "center", marginTop: 18 }} onPress={() => open("delete")}><Text style={styles.danger}>Delete my account</Text></Pressable>
      {panel === "delete" ? <View style={styles.menu}>
        <Text style={[styles.rowDetail, { marginTop: 14 }]}>This permanently deletes your account. It is blocked while you have pending, confirmed or upcoming bookings. Enter your password to continue.</Text>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        {msg ? <FormBanner text={msg.text} tone={msg.tone} /> : null}
        <PrimaryButton title="Delete account" onPress={deleteAccount} busy={busy} disabled={!password} />
        <View style={{ height: 14 }} />
      </View> : null}
    </> : null}
    <Text style={styles.version}>BLACK DIAMOND TOURS · 1.0.0 · {API_BASE_URL.replace(/^https?:\/\//, "").toUpperCase()}</Text>
  </ScrollView>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
return StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ivory },
  content: { padding: spacing.lg, paddingTop: 27 },
  eyebrow: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: c.navy, fontSize: 30, fontWeight: "900", marginTop: 7, marginBottom: 20 },
  profileCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: 23, alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 23, backgroundColor: c.paleBlue, alignItems: "center", justifyContent: "center" },
  name: { color: c.navy, fontSize: 18, fontWeight: "900", marginTop: 13 },
  guest: { color: c.blue, fontSize: 12, fontWeight: "700", marginTop: 5 },
  helper: { color: c.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 11 },
  themeCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: 14, marginTop: 18 },
  themeHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  themeOptions: { flexDirection: "row", gap: 7, marginTop: 14 },
  themeOption: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, paddingVertical: 10, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
  themeOptionActive: { backgroundColor: c.paleBlue, borderColor: c.blue },
  themeOptionText: { color: c.muted, fontSize: 11, fontWeight: "700" },
  themeOptionTextActive: { color: c.blue, fontWeight: "800" },
  menu: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, marginTop: 18, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.border },
  rowIcon: { width: 38, height: 38, backgroundColor: c.paleBlue, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: c.navy, fontSize: 12, fontWeight: "800" },
  rowDetail: { color: c.muted, fontSize: 10, marginTop: 4 },
  version: { color: c.muted, textAlign: "center", fontSize: 8, letterSpacing: 1, marginTop: 24 },
  signIn: { backgroundColor: c.blue, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 22, marginTop: 16 },
  signInText: { color: c.white, fontWeight: "800", fontSize: 12 },
  outline: { alignItems: "center", borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.pill, padding: 14, marginTop: 18 },
  outlineText: { color: c.navy, fontWeight: "800", fontSize: 13 },
  danger: { color: "#D6455D", fontWeight: "700", fontSize: 12 }
});
}
