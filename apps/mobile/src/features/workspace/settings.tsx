import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Action } from "../../components/action";
import { Screen } from "../../components/screen";
import { colors, typography } from "../../components/theme";
import { AddressForm } from "./address-form";
import { ConnectionCheck } from "./connection-check";
import { OpenWorkspaceButton } from "./open-button";
import { useWorkspace } from "./session";

export function WorkspaceSettingsScreen() {
  const { origin, invalidDefault, setAddress } = useWorkspace();
  const [editing, setEditing] = useState(false);

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={typography.heading}>
          Workspace address
        </Text>
        {invalidDefault ? (
          <Text style={[typography.body, typography.warning]}>
            The app’s default address is invalid. Enter a workspace address below.
          </Text>
        ) : null}
        {editing || !origin ? (
          <AddressForm
            initialValue={origin ?? ""}
            onApply={(value) => {
              if (!setAddress(value)) return false;
              setEditing(false);
              return true;
            }}
            onCancel={origin ? () => setEditing(false) : undefined}
          />
        ) : (
          <>
            <Text selectable style={styles.address}>
              {origin}
            </Text>
            <Action label="Change address" onPress={() => setEditing(true)} variant="secondary" />
          </>
        )}
      </View>
      {origin && !editing ? (
        <View key={origin} style={styles.connected}>
          <ConnectionCheck origin={origin} />
          <OpenWorkspaceButton origin={origin} secondary />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  address: { color: colors.text, fontSize: 16, lineHeight: 24 },
  connected: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingTop: 24,
    gap: 12,
  },
});
