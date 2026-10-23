import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { PackageTile } from "@/src/components/PackageTile";
import { EmptyView, ErrorView, LoadingView, SignInPrompt } from "@/src/components/StateViews";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { useRemote } from "@/src/hooks/useRemote";
import { spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SavedScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  const saved = useRemote(() => api.savedPackages(), [signedIn], signedIn);
  const reload = saved.reload;
  // Refresh whenever the tab is shown so hearts toggled elsewhere are reflected.
  const [first, setFirst] = useState(true);
  useFocusEffect(useCallback(() => { if (first) setFirst(false); else if (signedIn) reload(); }, [signedIn])); // eslint-disable-line react-hooks/exhaustive-deps

  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
    refreshControl={signedIn ? <RefreshControl refreshing={saved.refreshing} onRefresh={saved.reload} tintColor={colors.blue} /> : undefined}>
    <Text style={styles.eyebrow}>KEEP THE POSSIBILITIES CLOSE</Text>
    <Text style={styles.title}>Saved journeys</Text>
    {!signedIn && status !== "loading" ? <SignInPrompt title="Save journeys you love" text="Sign in to keep your favourites in sync with the Black Diamond Tours website." /> : null}
    {signedIn && saved.loading ? <LoadingView /> : null}
    {signedIn && saved.error && !saved.data ? <ErrorView error={saved.error} onRetry={saved.reload} /> : null}
    {saved.data?.items.map((item) => <PackageTile key={item.id} item={{ ...item, is_saved: true }} onPress={() => router.push(`/packages/${item.slug}`)} />)}
    {signedIn && saved.data && saved.data.items.length === 0 ? <EmptyView icon="heart-outline" title="Nothing saved yet" text="Tap the heart on any journey to keep it here." /> : null}
  </ScrollView>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ivory },
  content: { padding: spacing.lg, paddingTop: 27 },
  eyebrow: { color: c.blue, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: c.navy, fontSize: 30, fontWeight: "900", marginTop: 7, marginBottom: 20 }
});
}
