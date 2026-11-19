import { fetch } from "expo/fetch";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Action } from "../../components/action";
import { colors, typography } from "../../components/theme";
import { checkConnection, type ConnectionResult } from "./connection";

type CheckState = ConnectionResult | { status: "idle" | "checking" };

function describeCheck(result: CheckState) {
  switch (result.status) {
    case "reachable":
      return [
        "API reachable",
        "The public check passed. It doesn’t verify sign-in or service readiness.",
      ];
    case "unreachable":
      return [
        "Couldn’t reach the API",
        "Check your internet or local network connection, then try again.",
      ];
    case "unexpected-response":
      return [
        "Unexpected response",
        "This address didn’t return a Kipivo ping response. Check the workspace address.",
      ];
    case "http-error":
      return [
        "API check failed",
        `The server returned HTTP ${result.code}. Check the address or try again.`,
      ];
    case "timeout":
      return [
        "Connection timed out",
        "The API didn’t respond in time. Check your network, then try again.",
      ];
    case "checking":
      return ["Checking…", "Waiting for the public API to respond."];
    default:
      return ["Not checked", "Test whether this device can reach the public Kipivo API."];
  }
}

export function ConnectionCheck({ origin }: { origin: string }) {
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function testConnection() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setState({ status: "checking" });
    const result = await checkConnection(origin, fetch, { signal: controller.signal });
    if (controller.signal.aborted) return;
    active.current = null;
    setState(result);
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(describeCheck(result).join(". "));
    }
  }

  const [title, message] = describeCheck(state);
  const checking = state.status === "checking";
  const reachable = state.status === "reachable";
  const failed = state.status !== "idle" && !checking && !reachable;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.heading}>
        Connection check
      </Text>
      <View accessibilityLiveRegion="polite" style={styles.status}>
        <View style={styles.statusRow}>
          {checking ? <ActivityIndicator color={colors.accent} /> : null}
          <Text
            style={[
              typography.label,
              styles.statusLabel,
              reachable && styles.reachable,
              failed && typography.warning,
            ]}
          >
            {title}
          </Text>
        </View>
        <Text style={typography.body}>{message}</Text>
      </View>
      <Action
        label={
          checking
            ? "Testing connection…"
            : reachable
              ? "Test again"
              : failed
                ? "Retry connection"
                : "Test connection"
        }
        onPress={() => void testConnection()}
        busy={checking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  status: { gap: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusLabel: { flexShrink: 1 },
  reachable: { color: colors.success },
});
