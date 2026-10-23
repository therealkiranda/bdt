import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { PackageTile } from "@/src/components/PackageTile";
import { ErrorView, LoadingView } from "@/src/components/StateViews";
import { useRemote } from "@/src/hooks/useRemote";
import { formatDate, formatDuration, formatMoney, imageUri } from "@/src/lib/format";
import { useSaved } from "@/src/lib/saved-store";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PackageDetailScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const pkg = useRemote(() => api.package(String(slug)), [slug, status], status !== "loading");
  const reviews = useRemote(() => api.reviews(String(slug)), [slug]);
  const item = pkg.data;
  const [photo, setPhoto] = useState(0);
  const { saved, toggle } = useSaved(String(slug), item?.is_saved, status === "signedIn");

  if (pkg.loading) return <View style={styles.center}><LoadingView /></View>;
  if (!item) {
    const notFound = pkg.error instanceof ApiError && pkg.error.status === 404;
    return <View style={styles.center}>
      {notFound ? <Text style={styles.title}>Journey not found</Text> : <ErrorView error={pkg.error} onRetry={pkg.reload} />}
      <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
    </View>;
  }
  const images = item.images.filter(Boolean) as NonNullable<(typeof item.images)[number]>[];
  const hero = images[photo] ?? images[0];
  const heroUri = imageUri(hero, "large");
  const openDeps = item.departures.filter((d) => d.status === "open");

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          {heroUri ? <Image source={{ uri: heroUri }} style={styles.hero} /> : <View style={styles.hero} />}
          <Pressable style={[styles.back, { top: insets.top + 10 }]} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.navy} /></Pressable>
          <Pressable style={[styles.heart, { top: insets.top + 10 }]} onPress={toggle} accessibilityLabel={saved ? "Remove from saved" : "Save journey"}>
            <Ionicons name={saved ? "heart" : "heart-outline"} size={22} color={saved ? "#D6455D" : colors.navy} />
          </Pressable>
          {item.discount_percent ? <View style={styles.imageTag}><Text style={styles.imageTagText}>{item.discount_percent}% OFF</Text></View> : null}
        </View>
        {images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {images.map((im, i) => <Pressable key={i} onPress={() => setPhoto(i)}><Image source={{ uri: imageUri(im, "small") }} style={[styles.thumb, i === photo && { borderWidth: 2, borderColor: colors.blue }]} /></Pressable>)}
          </ScrollView>
        ) : null}
        <View style={styles.content}>
          <Text style={styles.eyebrow}>{(item.categories[0]?.name ?? item.destination?.country ?? "").toUpperCase()}  ·  {formatDuration(item.duration).toUpperCase()}</Text>
          <Text style={styles.title}>{item.title}</Text>
          {item.destination ? <Text style={styles.destination}><Ionicons name="location-outline" size={15} color={colors.blue} /> {item.destination.name}, {item.destination.country}</Text> : null}
          {item.rating ? <Text style={styles.rating}>★ {item.rating.average.toFixed(1)} <Text style={{ color: colors.muted, fontWeight: "500" }}>({item.rating.count} review{item.rating.count === 1 ? "" : "s"})</Text></Text> : null}
          {item.short_description ? <Text style={styles.summary}>{item.short_description}</Text> : null}
          {item.description ? <Text style={[styles.body, { marginTop: 14 }]}>{item.description}</Text> : null}

          {item.itinerary.length > 0 ? <>
            <View style={styles.divider} /><Text style={styles.sectionTitle}>Itinerary</Text>
            {item.itinerary.map((d) => <View key={d.day} style={{ marginBottom: 16 }}><Text style={styles.day}>DAY {d.day}</Text><Text style={styles.dayTitle}>{d.title}</Text>{d.description ? <Text style={[styles.body, { marginTop: 4 }]}>{d.description}</Text> : null}</View>)}
          </> : null}

          {item.inclusions.length > 0 || item.exclusions.length > 0 ? <>
            <View style={styles.divider} /><Text style={styles.sectionTitle}>What's included</Text>
            {item.inclusions.map((h, i) => <View key={`i${i}`} style={styles.highlight}><Ionicons name="checkmark-circle" size={19} color={colors.green} /><Text style={styles.highlightText}>{h}</Text></View>)}
            {item.exclusions.map((h, i) => <View key={`e${i}`} style={styles.highlight}><Ionicons name="close-circle-outline" size={19} color={colors.muted} /><Text style={[styles.highlightText, { color: colors.muted }]}>{h}</Text></View>)}
          </> : null}

          {item.departures.length > 0 ? <>
            <View style={styles.divider} /><Text style={styles.sectionTitle}>Departures</Text>
            {item.departures.map((d) => (
              <View key={d.id} style={styles.dep}>
                <View><Text style={styles.depDate}>{formatDate(d.departure_date)}{d.return_date ? ` – ${formatDate(d.return_date)}` : ""}</Text><Text style={styles.depMeta}>{d.status === "open" ? `${d.seats_left} seat${d.seats_left === 1 ? "" : "s"} left` : d.status === "full" ? "Fully booked" : "Closed"}</Text></View>
                <Text style={styles.depDate}>{formatMoney(d.price, d.currency)}</Text>
              </View>
            ))}
          </> : null}

          {item.important_info ? <View style={styles.notice}><Ionicons name="information-circle-outline" size={19} color={colors.blue} /><Text style={styles.noticeText}>{item.important_info}</Text></View> : null}

          {item.locations.length > 0 ? <Pressable style={styles.mapButton} onPress={() => router.push({ pathname: "/destination-map", params: { slug: item.slug } })}><Ionicons name="map-outline" size={18} color={colors.blue} /><Text style={styles.mapButtonText}>View locations on map</Text></Pressable> : null}

          {reviews.data && reviews.data.items.length > 0 ? <>
            <View style={styles.divider} /><Text style={styles.sectionTitle}>Traveller reviews</Text>
            {reviews.data.items.map((r, i) => <View key={i} style={{ marginBottom: 14 }}><Text style={styles.reviewer}>{r.reviewer}  <Text style={{ color: colors.amber }}>{"★".repeat(r.rating)}</Text></Text>{r.title ? <Text style={styles.dayTitle}>{r.title}</Text> : null}<Text style={[styles.body, { marginTop: 3 }]}>{r.review}</Text></View>)}
          </> : null}

          {item.related.length > 0 ? <>
            <View style={styles.divider} /><Text style={styles.sectionTitle}>You may also like</Text>
            {item.related.map((r) => <PackageTile key={r.id} item={r} compact onPress={() => router.push(`/packages/${r.slug}`)} />)}
          </> : null}
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 13) }]}>
        <View><Text style={styles.from}>FROM</Text><Text style={styles.price}>{formatMoney(item.price, item.currency)} <Text style={styles.per}>/ person</Text></Text></View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.secondary} onPress={() => router.push({ pathname: "/enquiry", params: { packageSlug: item.slug, packageTitle: item.title } })}><Text style={styles.secondaryText}>Enquire</Text></Pressable>
          {item.bookable ? <Pressable style={styles.enquire} onPress={() => router.push({ pathname: "/booking", params: { slug: item.slug } })}><Text style={styles.enquireText}>Request booking</Text><Ionicons name="arrow-forward" size={17} color={colors.white} /></Pressable> : null}
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ivory },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.ivory, gap: 14 },
  hero: { height: 330, backgroundColor: c.paleBlue },
  back: { position: "absolute", top: 48, left: 18, width: 44, height: 44, backgroundColor: c.surface, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  imageTag: { position: "absolute", bottom: 16, left: 18, backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  imageTagText: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  content: { padding: spacing.lg, paddingBottom: 30 },
  eyebrow: { color: c.blue, fontSize: 10, letterSpacing: 1.3, fontWeight: "900" },
  title: { color: c.navy, fontSize: 29, lineHeight: 34, fontWeight: "900", marginTop: 8, letterSpacing: -0.6 },
  destination: { color: c.muted, marginTop: 10, fontSize: 13 },
  summary: { color: c.text, fontSize: 14, lineHeight: 23, marginTop: 20 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 23 },
  sectionTitle: { color: c.navy, fontSize: 19, fontWeight: "900", marginBottom: 15 },
  highlight: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 13 },
  highlightText: { color: c.text, fontSize: 13, flex: 1 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 13, backgroundColor: c.paleBlue, borderRadius: radius.md, marginTop: 11 },
  noticeText: { color: c.navy, fontSize: 11, lineHeight: 17, flex: 1 },
  mapButton: { flexDirection: "row", alignItems: "center", gap: 8, padding: 15, marginTop: 15, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, backgroundColor: c.surface },
  mapButtonText: { color: c.blue, fontWeight: "800", fontSize: 13 },
  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 13, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  from: { color: c.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  price: { color: c.navy, fontSize: 20, fontWeight: "900", marginTop: 3 },
  per: { color: c.muted, fontSize: 10, fontWeight: "500" },
  enquire: { backgroundColor: c.blue, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", gap: 10 },
  enquireText: { color: c.white, fontSize: 13, fontWeight: "800" },
  link: { color: c.blue, fontWeight: "700" },
  heart: { position: "absolute", top: 0, right: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
  thumbs: { gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  thumb: { width: 84, height: 60, borderRadius: 10, backgroundColor: c.paleBlue },
  rating: { color: c.amber, fontWeight: "800", fontSize: 13, marginTop: 8 },
  body: { color: c.text, fontSize: 13, lineHeight: 21 },
  day: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  dayTitle: { color: c.navy, fontSize: 14, fontWeight: "800", marginTop: 3 },
  dep: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.border },
  depDate: { color: c.navy, fontWeight: "800", fontSize: 13 },
  depMeta: { color: c.muted, fontSize: 11, marginTop: 3 },
  reviewer: { color: c.navy, fontWeight: "800", fontSize: 12 },
  secondary: { borderWidth: 1, borderColor: c.border, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.pill },
  secondaryText: { color: c.blue, fontSize: 13, fontWeight: "800" },
  related: { marginTop: 4 }
});
}
