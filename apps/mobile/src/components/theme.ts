import { StyleSheet } from "react-native";

export const colors = {
  canvas: "#191510",
  surface: "#241e17",
  border: "#6b5946",
  text: "#fff9ee",
  muted: "#d6c7b4",
  accent: "#ffb02e",
  success: "#b9dfa0",
  warning: "#ffbc9f",
};

export const typography = StyleSheet.create({
  title: { color: colors.text, fontSize: 40, fontWeight: "700", letterSpacing: -1.2 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "600" },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.text, fontSize: 15, fontWeight: "600" },
  warning: { color: colors.warning },
});
