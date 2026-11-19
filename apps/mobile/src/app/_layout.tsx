import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../components/theme";
import { WorkspaceProvider } from "../features/workspace/session";

export default function RootLayout() {
  return (
    <WorkspaceProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Kipivo", headerShown: false }} />
        <Stack.Screen name="connection" options={{ title: "Connection" }} />
      </Stack>
    </WorkspaceProvider>
  );
}
