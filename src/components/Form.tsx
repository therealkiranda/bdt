import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { radius } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";

export function Field({ label, error, ...input }: { label: string; error?: string } & TextInputProps) {
  const { colors } = useAppTheme();
  const s = StyleSheet.create({
    label: { color: colors.navy, fontSize: 9, letterSpacing: 1.3, fontWeight: "900", marginBottom: 8, marginTop: 13 },
    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: error ? "#D6455D" : colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 13, color: colors.text },
    error: { color: "#D6455D", fontSize: 11, marginTop: 6 }
  });
  return (
    <View>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <TextInput placeholderTextColor={colors.muted} {...input} style={[s.input, input.style]} />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress, busy, disabled }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const { colors } = useAppTheme();
  const off = busy || disabled;
  return (
    <Pressable accessibilityRole="button" disabled={off} onPress={onPress}
      style={{ backgroundColor: colors.blue, opacity: off ? 0.6 : 1, borderRadius: radius.pill, padding: 16, alignItems: "center", marginTop: 23 }}>
      <Text style={{ color: colors.white, fontWeight: "800", fontSize: 13 }}>{busy ? "Please wait…" : title}</Text>
    </Pressable>
  );
}

export function FormBanner({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ backgroundColor: tone === "error" ? "#FBE9EC" : colors.paleBlue, borderRadius: 12, padding: 12, marginTop: 14 }}>
      <Text style={{ color: tone === "error" ? "#9B2339" : colors.navy, fontSize: 12, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}
