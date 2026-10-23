import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PackageTile } from "@/src/components/PackageTile";
import { EmptyView, ErrorView, LoadingView } from "@/src/components/StateViews";
import { api, type PackageCard } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { useRemote } from "@/src/hooks/useRemote";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [extra, setExtra] = useState<PackageCard[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 350); return () => clearTimeout(t); }, [query]);

  const categories = useRemote(() => api.categories(), []);
  const list = useRemote(() => api.packages({ q: debounced.length >= 2 ? debounced : undefined, category: category || undefined }), [debounced, category, status], status !== "loading");
  useEffect(() => { setExtra([]); }, [debounced, category, status]);

  const meta = list.data?.meta;
  const shown = [...(list.data?.items ?? []), ...extra];
  const hasMore = !!meta && meta.page < meta.pages && shown.length < meta.total;

  async function loadMore() {
    if (!meta || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(shown.length / meta.limit) + 1;
      const r = await api.packages({ q: debounced.length >= 2 ? debounced : undefined, category: category || undefined, page: nextPage });
      setExtra((prev) => [...prev, ...r.items.filter((i) => !shown.some((s) => s.id === i.id))]);
    } catch { /* leave the list as is; the user can tap again */ } finally { setLoadingMore(false); }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={colors.blue} />}>
      <Text style={styles.eyebrow}>GO BEYOND THE EXPECTED</Text>
      <Text style={styles.title}>Explore journeys</Text>
      <Text style={styles.subtitle}>Find a place that feels like your next story.</Text>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search places or experiences" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {[{ slug: "", name: "All" }, ...(categories.data ?? [])].map((f) => (
          <Pressable key={f.slug || "all"} onPress={() => setCategory(f.slug)} style={[styles.filter, category === f.slug && styles.filterActive]}>
            <Text style={[styles.filterText, category === f.slug && styles.filterTextActive]}>{f.name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/destination-map")} style={styles.mapFilter}><Ionicons name="map-outline" size={15} color={colors.blue} /><Text style={styles.mapFilterText}>Map</Text></Pressable>
      </ScrollView>
      {meta ? <Text style={styles.count}>{meta.total} {meta.total === 1 ? "JOURNEY" : "JOURNEYS"}</Text> : null}
      {list.loading ? <LoadingView /> : list.error && !list.data ? <ErrorView error={list.error} onRetry={list.reload} /> : null}
      {shown.map((item) => <PackageTile key={item.id} item={item} onPress={() => router.push(`/packages/${item.slug}`)} />)}
      {list.data && shown.length === 0 && <EmptyView title="No journeys found" text="Try another place or category." />}
      {hasMore ? (
        <Pressable onPress={loadMore} style={styles.more}>{loadingMore ? <LoadingView /> : <Text style={styles.moreText}>Show more journeys</Text>}</Pressable>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ivory },
  content: { padding: spacing.lg, paddingTop: 27, paddingBottom: 28 },
  eyebrow: { color: c.blue, fontSize: 10, letterSpacing: 1.8, fontWeight: "900" },
  title: { color: c.navy, fontSize: 31, fontWeight: "900", marginTop: 7, letterSpacing: -0.8 },
  subtitle: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  search: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 51, gap: 10, marginTop: 22 },
  searchInput: { flex: 1, color: c.text, fontSize: 13 },
  filters: { gap: 8, paddingVertical: 17 },
  filter: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.pill },
  filterActive: { backgroundColor: c.navy, borderColor: c.navy },
  filterText: { color: c.muted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: c.white },
  mapFilter: { flexDirection: "row", gap: 5, alignItems: "center", borderWidth: 1, borderColor: "#BBD8F0", backgroundColor: c.paleBlue, paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill },
  mapFilterText: { color: c.blue, fontWeight: "800", fontSize: 12 },
  count: { color: c.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.4, marginBottom: 13 },
  empty: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { color: c.navy, fontWeight: "800", fontSize: 17, marginTop: 12 },
  more: { alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: radius.pill, paddingVertical: 13, backgroundColor: c.surface },
  moreText: { color: c.blue, fontWeight: "800", fontSize: 12 }
});
}
