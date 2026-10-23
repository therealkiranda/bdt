import { ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PackageTile } from "@/src/components/PackageTile";
import { ErrorView, LoadingView } from "@/src/components/StateViews";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { useRemote } from "@/src/hooks/useRemote";
import { imageUri } from "@/src/lib/format";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  // Re-load when the sign-in state changes so the saved hearts are personalised.
  const home = useRemote(() => api.home(), [status], status !== "loading");
  const data = home.data;
  const heroUri = imageUri(data?.hero.image, "large");

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12) }]} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.reload} tintColor={colors.blue} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>BLACK DIAMOND TOURS</Text>
          <Text style={styles.greeting}>The world,{"\n"}a little closer.</Text>
        </View>
        <Pressable style={styles.avatar} onPress={() => router.push("/(tabs)/profile")} accessibilityLabel="Open profile">
          <Ionicons name="person-outline" size={21} color={colors.navy} />
        </Pressable>
      </View>

      <ImageBackground source={heroUri ? { uri: heroUri } : undefined} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>YOUR NEXT CHAPTER STARTS HERE</Text>
          <Text style={styles.heroTitle}>{data?.hero.title ?? "Find your kind\nof extraordinary."}</Text>
          {data?.hero.text ? <Text style={styles.heroSub}>{data.hero.text}</Text> : null}
          <Pressable style={styles.heroButton} onPress={() => router.push("/(tabs)/explore")}>
            <Text style={styles.heroButtonText}>Explore journeys</Text><Ionicons name="arrow-forward" size={17} color={colors.navy} />
          </Pressable>
        </View>
      </ImageBackground>

      <Pressable style={styles.mapBanner} onPress={() => router.push("/destination-map")}>
        <View style={styles.mapIcon}><Ionicons name="map" size={21} color={colors.blue} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mapTitle}>Explore the map</Text>
          <Text style={styles.mapSubtitle}>See where your next journey could take you</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>

      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionEyebrow}>MADE FOR DISCOVERY</Text><Text style={styles.sectionTitle}>Journeys to remember</Text></View>
        <Pressable onPress={() => router.push("/(tabs)/explore")}><Text style={styles.seeAll}>See all ↗</Text></Pressable>
      </View>
      {home.loading ? <LoadingView /> : home.error && !data ? <ErrorView error={home.error} onRetry={home.reload} /> : null}
      {data?.featured_packages.map((item) => <PackageTile key={item.id} item={item} onPress={() => router.push(`/packages/${item.slug}`)} />)}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
return StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ivory },
  content: { padding: spacing.lg, paddingTop: 22, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  eyebrow: { color: c.blue, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  greeting: { color: c.navy, fontSize: 29, fontWeight: "900", lineHeight: 32, marginTop: 8, letterSpacing: -0.7 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  hero: { height: 380, borderRadius: radius.lg, overflow: "hidden", justifyContent: "flex-end", backgroundColor: c.navy },
  heroImage: { borderRadius: radius.lg },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: c.heroOverlay },
  heroCopy: { padding: 23 },
  heroKicker: { color: "#D6E9F9", fontSize: 9, letterSpacing: 1.5, fontWeight: "900", marginBottom: 12 },
  heroTitle: { color: c.white, fontSize: 33, lineHeight: 36, fontWeight: "900", letterSpacing: -0.8 },
  heroSub: { color: "#F0F5FA", fontSize: 13, lineHeight: 20, marginTop: 12, maxWidth: 290 },
  heroButton: { backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 11, marginTop: 19 },
  heroButtonText: { color: c.navy, fontWeight: "800", fontSize: 13 },
  mapBanner: { backgroundColor: c.paleBlue, borderRadius: radius.md, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 30, borderWidth: 1, borderColor: c.border },
  mapIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
  mapTitle: { color: c.navy, fontWeight: "800", fontSize: 14 },
  mapSubtitle: { color: c.muted, fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 17 },
  sectionEyebrow: { color: c.blue, fontSize: 9, letterSpacing: 1.5, fontWeight: "900", marginBottom: 6 },
  sectionTitle: { color: c.navy, fontSize: 23, lineHeight: 28, fontWeight: "900", letterSpacing: -0.5 },
  seeAll: { color: c.blue, fontSize: 12, fontWeight: "800", paddingBottom: 4 },
  disclaimer: { color: c.muted, fontSize: 10, lineHeight: 16, marginTop: 2, marginBottom: 10 }
});
}
