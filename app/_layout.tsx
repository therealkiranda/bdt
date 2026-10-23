import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/src/auth/AuthProvider";
import { ThemeProvider, useAppTheme } from "@/src/theme/ThemeProvider";

function AppStack() {
  const { isDark, colors } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} translucent={false} backgroundColor={colors.ivory} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="packages/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="booking" options={{ presentation: "card" }} />
        <Stack.Screen name="trip/[ref]" options={{ presentation: "card" }} />
        <Stack.Screen name="notifications" options={{ presentation: "card" }} />
        <Stack.Screen name="destination-map" options={{ presentation: "modal" }} />
        <Stack.Screen name="enquiry" options={{ presentation: "modal" }} />
        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
