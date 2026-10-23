import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { errorMessage } from "@/src/api";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";

export function LoadingView({ label }: { label?: string }) {
  const { colors } = useAppTheme();
  return <View style={{ paddingVertical: 48, alignItems: "center", gap: 10 }}><ActivityIndicator color={colors.blue} />{label ? <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text> : null}</View>;
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 44, paddingHorizontal: spacing.lg }}>
      <Ionicons name="cloud-offline-outline" size={30} color={colors.muted} />
      <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 16, marginTop: 12 }}>Couldn't load this</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6 }}>{errorMessage(error)}</Text>
      {onRetry ? <Pressable onPress={onRetry} style={{ marginTop: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, paddingVertical: 10 }}><Text style={{ color: colors.blue, fontWeight: "800", fontSize: 12 }}>Try again</Text></Pressable> : null}
    </View>
  );
}

export function EmptyView({ icon = "search-outline", title, text }: { icon?: keyof typeof Ionicons.glyphMap; title: string; text?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 44 }}>
      <Ionicons name={icon} size={28} color={colors.muted} />
      <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 17, marginTop: 12 }}>{title}</Text>
      {text ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" }}>{text}</Text> : null}
    </View>
  );
}

export function SignInPrompt({ title, text }: { title: string; text: string }) {
  const { colors } = useAppTheme();
  const s = StyleSheet.create({
    box: { alignItems: "center", padding: 24, marginTop: 30, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
    title: { color: colors.navy, fontSize: 18, fontWeight: "900", textAlign: "center" },
    text: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8 },
    btn: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 26, marginTop: 18 },
    btnText: { color: colors.white, fontWeight: "800", fontSize: 13 }
  });
  return (
    <View style={s.box}>
      <Ionicons name="person-circle-outline" size={34} color={colors.blue} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.text}>{text}</Text>
      <Pressable style={s.btn} onPress={() => router.push("/auth")}><Text style={s.btnText}>Sign in or create account</Text></Pressable>
    </View>
  );
}
