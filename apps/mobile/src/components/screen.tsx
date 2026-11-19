import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "./theme";

export function Screen({ children, edges }: { children: ReactNode; edges?: Edge[] }) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, alignItems: "center" },
  content: { width: "100%", maxWidth: 520, paddingHorizontal: 24, paddingVertical: 32, gap: 32 },
});
