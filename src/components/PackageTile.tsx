import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/auth/AuthProvider";
import { useSaved } from "@/src/lib/saved-store";
import { formatDuration, formatMoney, packageImage } from "@/src/lib/format";
import type { PackageCard } from "@/src/api";

type Props = { item: PackageCard; onPress: () => void; compact?: boolean };

export function PackageTile({ item, onPress, compact = false }: Props) {
  const { colors } = useAppTheme();
  const { status } = useAuth();
  const { saved, toggle } = useSaved(item.slug, item.is_saved, status === "signedIn");
  const styles = makeStyles(colors);
  const uri = packageImage(item);
  const hasDiscount = item.discount_price !== null && item.discount_percent;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, compact && styles.compact]}>
      <View>
        {uri ? <Image source={{ uri }} style={[styles.image, compact && styles.compactImage]} /> : <View style={[styles.image, compact && styles.compactImage]} />}
        <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Remove from saved" : "Save journey"} onPress={toggle} hitSlop={8} style={styles.heart}>
          <Ionicons name={saved ? "heart" : "heart-outline"} size={19} color={saved ? "#D6455D" : colors.navy} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.topline}>
          <Text style={styles.category}>{(item.destination?.country ?? "").toUpperCase()}</Text>
          <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.destination ? <Text style={styles.destination}>{item.destination.name}</Text> : null}
        <View style={styles.footer}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, flexShrink: 1 }}>
            <Text style={styles.price}>From {formatMoney(item.price, item.currency)}</Text>
            {hasDiscount ? <Text style={styles.strike}>{formatMoney(item.base_price, item.currency)}</Text> : null}
          </View>
          {item.rating ? <Text style={styles.rating}>★ {item.rating.average.toFixed(1)}</Text> : <Text style={styles.arrow}>↗</Text>}
        </View>
        {item.availability?.text ? <Text style={styles.availability}>{item.availability.text}</Text> : null}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: c.border, marginBottom: spacing.lg },
    compact: { flexDirection: "row", marginBottom: spacing.md, borderRadius: radius.md },
    image: { width: "100%", height: 188, backgroundColor: c.paleBlue },
    compactImage: { width: 118, height: "100%", minHeight: 148 },
    heart: { position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
    content: { padding: spacing.lg, flex: 1 },
    topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    category: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3, color: c.blue },
    duration: { color: c.muted, fontSize: 12 },
    title: { color: c.navy, fontSize: 19, lineHeight: 24, fontWeight: "800" },
    destination: { color: c.muted, fontSize: 13, marginTop: 5 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
    price: { color: c.text, fontWeight: "700", fontSize: 13 },
    strike: { color: c.muted, fontSize: 11, textDecorationLine: "line-through" },
    rating: { color: c.amber, fontWeight: "800", fontSize: 12 },
    arrow: { color: c.blue, fontSize: 20, fontWeight: "700" },
    availability: { color: c.green, fontSize: 11, fontWeight: "700", marginTop: 8 }
  });
}
