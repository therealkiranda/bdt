import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, type AppNotification } from "@/src/api";
import { useAuth } from "@/src/auth/AuthProvider";
import { EmptyView, ErrorView, LoadingView, SignInPrompt } from "@/src/components/StateViews";
import { useRemote } from "@/src/hooks/useRemote";
import { formatDateTime } from "@/src/lib/format";
import { radius, spacing } from "@/src/theme/tokens";
import { useAppTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const s = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  // Push delivery is not implemented on the server yet, so notifications are polled when this screen opens.
  const list = useRemote(() => api.notifications(), [signedIn], signedIn);

  async function open(n: AppNotification) {
    if (!n.read) {
      list.setData(list.data ? { ...list.data, items: list.data.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) } : null);
      api.markNotificationRead(n.id).catch(() => {});
    }
    if (n.booking_reference) router.push(`/trip/${n.booking_reference}`);
  }
  async function readAll() {
    try { await api.markAllNotificationsRead(); await list.reload(); } catch { /* ignore */ }
  }
  const unread = (list.data?.meta.unread_count as number | undefined) ?? 0;

  return <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top, 16) }]}
    refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={colors.blue} />}>
    <Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color={colors.navy} /></Pressable>
    <View style={s.titleRow}><Text style={s.title}>Notifications</Text>{unread > 0 ? <Pressable onPress={readAll}><Text style={s.link}>Mark all read</Text></Pressable> : null}</View>
    {!signedIn ? <SignInPrompt title="Stay up to date" text="Sign in to see updates about your bookings and tickets." /> : null}
    {signedIn && list.loading ? <LoadingView /> : null}
    {signedIn && list.error && !list.data ? <ErrorView error={list.error} onRetry={list.reload} /> : null}
    {list.data?.items.map((n) => (
      <Pressable key={n.id} onPress={() => open(n)} style={[s.card, !n.read && s.unread]}>
        <Text style={s.cardTitle}>{n.title}</Text>
        <Text style={s.body}>{n.body}</Text>
        <Text style={s.meta}>{formatDateTime(n.created_at)}{n.booking_reference ? ` · ${n.booking_reference}` : ""}</Text>
      </Pressable>
    ))}
    {list.data && list.data.items.length === 0 ? <EmptyView icon="notifications-outline" title="No notifications yet" /> : null}
  </ScrollView>;
}

function makeStyles(c: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.ivory },
    content: { padding: spacing.lg, paddingBottom: 40 },
    back: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
    title: { color: c.navy, fontSize: 28, fontWeight: "900" },
    link: { color: c.blue, fontWeight: "800", fontSize: 12, paddingBottom: 4 },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 14, marginBottom: 10 },
    unread: { borderColor: c.blue, backgroundColor: c.paleBlue },
    cardTitle: { color: c.navy, fontWeight: "800", fontSize: 13 },
    body: { color: c.text, fontSize: 12, lineHeight: 18, marginTop: 5 },
    meta: { color: c.muted, fontSize: 10, marginTop: 8 }
  });
}
