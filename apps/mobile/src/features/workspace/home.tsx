import { StyleSheet, Text, View } from "react-native";
import { Action } from "../../components/action";
import { Screen } from "../../components/screen";
import { colors, typography } from "../../components/theme";
import { OpenWorkspaceButton } from "./open-button";
import { useWorkspace } from "./session";

export function HomeScreen({ onConnection }: { onConnection: () => void }) {
  const { origin } = useWorkspace();

  return (
    <Screen>
      <Text style={styles.brand}>Kipivo</Text>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={typography.title}>
          Your workspace
        </Text>
        <Text style={typography.body}>
          Sign in and work in your browser. Use this app to check the connection to your Kipivo
          instance.
        </Text>
      </View>
      <View style={styles.actions}>
        {origin ? (
          <>
            <Text selectable style={typography.body}>
              {origin}
            </Text>
            <OpenWorkspaceButton key={origin} origin={origin} />
          </>
        ) : (
          <Text style={typography.body}>Add your Kipivo address to get started.</Text>
        )}
        <Action
          label={origin ? "Connection settings" : "Set workspace address"}
          onPress={onConnection}
          variant={origin ? "secondary" : "primary"}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { color: colors.accent, fontSize: 20, fontWeight: "700" },
  intro: { gap: 10 },
  actions: { gap: 12 },
});
