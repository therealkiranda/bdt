import { Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeProvider";

const tone: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FFF1DC", fg: "#8A5A12" },
  confirmed: { bg: "#DFF3EA", fg: "#1F6B54" },
  completed: { bg: "#E3EDF7", fg: "#1D4E7A" },
  cancellation_requested: { bg: "#FFF1DC", fg: "#8A5A12" },
  cancelled: { bg: "#F1E3E5", fg: "#8F2B3B" },
  unpaid: { bg: "#FFF1DC", fg: "#8A5A12" },
  paid: { bg: "#DFF3EA", fg: "#1F6B54" },
  refund_requested: { bg: "#FFF1DC", fg: "#8A5A12" },
  refunded: { bg: "#E3EDF7", fg: "#1D4E7A" }
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const { colors } = useAppTheme();
  const t = tone[status] ?? { bg: colors.paleBlue, fg: colors.navy };
  return <View style={{ backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: t.fg, fontSize: 10, fontWeight: "800" }}>{label}</Text></View>;
}
