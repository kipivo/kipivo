import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Action } from "../../components/action";
import { typography } from "../../components/theme";

export function OpenWorkspaceButton({
  origin,
  secondary = false,
}: {
  origin: string;
  secondary?: boolean;
}) {
  const [state, setState] = useState<"idle" | "opening" | "error">("idle");

  async function openWorkspace() {
    setState("opening");
    try {
      await Linking.openURL(`${origin}/`);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <View style={styles.group}>
      <Action
        label={state === "opening" ? "Opening browser…" : "Open Web workspace"}
        onPress={() => void openWorkspace()}
        variant={secondary ? "secondary" : "primary"}
        busy={state === "opening"}
      />
      {state === "error" ? (
        <Text accessibilityRole="alert" style={[typography.body, typography.warning]}>
          Couldn’t open the browser. Try again or open the address in your browser directly.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ group: { gap: 8 } });
