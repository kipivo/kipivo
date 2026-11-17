import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.brand}>Kipivo</Text>
          <Text accessibilityRole="header" style={styles.title}>
            From spark to done.
          </Text>
          <Text style={styles.description}>
            Kipivo gives developers AI bots that understand their projects, do the work, and show
            what they did.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 560, paddingHorizontal: 24, paddingVertical: 48, gap: 24 },
  brand: { color: "#ffb02e", fontSize: 20, fontWeight: "600" },
  title: { color: "#fff9ee", fontSize: 56, fontWeight: "700", letterSpacing: -2.6, lineHeight: 57 },
  description: { color: "#d6c7b4", fontSize: 18, lineHeight: 27 },
});
