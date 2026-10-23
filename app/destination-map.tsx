import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { api, type MapLocation } from "@/src/api";
import { ErrorView, LoadingView } from "@/src/components/StateViews";
import { useRemote } from "@/src/hooks/useRemote";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Pin = MapLocation & { key: string; packageSlug: string; packageTitle: string };
const fallbackRegion: Region = { latitude: 28.1, longitude: 84.3, latitudeDelta: 3.2, longitudeDelta: 3.2 };

// With ?slug=... shows that journey's locations. Without it, shows the locations of the latest journeys
// (the API publishes coordinates per package, not per destination).
async function loadPins(slug?: string): Promise<{ pins: Pin[]; title: string }> {
  if (slug) {
    const p = await api.package(slug);
    return { title: p.title, pins: p.locations.map((l) => ({ ...l, key: `${p.id}-${l.id}`, packageSlug: p.slug, packageTitle: p.title })) };
  }
  const list = await api.packages({ limit: 12 });
  const details = await Promise.allSettled(list.items.map((i) => api.package(i.slug)));
  const pins: Pin[] = [];
  for (const d of details) if (d.status === "fulfilled") for (const l of d.value.locations) pins.push({ ...l, key: `${d.value.id}-${l.id}`, packageSlug: d.value.slug, packageTitle: d.value.title });
  return { title: "Destination map", pins };
}

export default function DestinationMapScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const map = useRef<MapView>(null);
  const data = useRemote(() => loadPins(slug), [slug]);
  const pins = data.data?.pins ?? [];
  const current = pins.find((p) => p.key === selected);

  const fit = useCallback(() => {
    if (pins.length > 0) map.current?.fitToCoordinates(pins.map((p) => ({ latitude: p.latitude, longitude: p.longitude })), { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
  }, [pins]);
  const focus = (p: Pin) => { setSelected(p.key); map.current?.animateToRegion({ latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }, 400); };

  return (
    <View style={styles.page}>
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>PLAN BY PLACE</Text><Text style={styles.title} numberOfLines={1}>{data.data?.title ?? "Destination map"}</Text></View>
      </View>
      <View style={styles.mapWrap}>
        <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={fallbackRegion} onMapReady={fit} onLayout={fit}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined} showsCompass toolbarEnabled={false}>
          {pins.map((p) => <Marker key={p.key} coordinate={{ latitude: p.latitude, longitude: p.longitude }} title={p.name} description={slug ? p.type ?? undefined : p.packageTitle} onPress={() => setSelected(p.key)} />)}
        </MapView>
      </View>
      <View style={styles.sheet}>
        {data.loading ? <LoadingView /> : data.error ? <ErrorView error={data.error} onRetry={data.reload} /> : <>
          <Text style={styles.sheetEyebrow}>START EXPLORING</Text>
          <Text style={styles.sheetTitle}>{current?.name ?? (pins.length ? `${pins.length} place${pins.length === 1 ? "" : "s"} to explore` : "No locations yet")}</Text>
          <Text style={styles.sheetText}>{current ? [current.packageTitle, current.address, current.notes].filter(Boolean).join(" · ") : pins.length ? "Choose a pin or a place below. The app does not access your location." : "Locations appear here once they are added to a journey."}</Text>
          <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={styles.destinationList}>
            {pins.map((p) => <Pressable key={p.key} onPress={() => focus(p)} style={[styles.destination, selected === p.key && styles.destinationSelected]}>
              <View style={styles.pin}><Ionicons name="location" size={16} color={colors.blue} /></View>
              <View style={{ flex: 1 }}><Text style={styles.destinationTitle}>{p.name}</Text><Text style={styles.destinationNote}>{p.packageTitle}</Text></View>
              <Pressable hitSlop={8} onPress={() => router.push(`/packages/${p.packageSlug}`)}><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>
            </Pressable>)}
          </ScrollView>
        </>}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ivory },
  top: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 17 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
  eyebrow: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: c.navy, fontSize: 24, fontWeight: "900", marginTop: 3 },
  mapWrap: { flex: 1, marginHorizontal: 14, borderRadius: radius.lg, overflow: "hidden", minHeight: 250, borderWidth: 1, borderColor: c.border, backgroundColor: c.paleBlue },
  sheet: { paddingHorizontal: spacing.lg, paddingTop: 19, paddingBottom: 22 },
  sheetEyebrow: { color: c.blue, fontSize: 9, letterSpacing: 1.4, fontWeight: "900" },
  sheetTitle: { color: c.navy, fontSize: 21, fontWeight: "900", marginTop: 6 },
  sheetText: { color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  destinationList: { marginTop: 11 },
  destination: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  destinationSelected: { backgroundColor: c.paleBlue, marginHorizontal: -7, paddingHorizontal: 7, borderRadius: radius.sm },
  pin: { width: 34, height: 34, borderRadius: 12, backgroundColor: c.paleBlue, alignItems: "center", justifyContent: "center" },
  destinationTitle: { color: c.navy, fontSize: 12, fontWeight: "800" },
  destinationNote: { color: c.muted, fontSize: 10, marginTop: 3 },
  disclaimer: { color: c.muted, fontSize: 9, lineHeight: 14, marginTop: 11 }
});
}
