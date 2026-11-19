import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Action } from "../../components/action";
import { colors, typography } from "../../components/theme";

export function AddressForm({
  initialValue,
  onApply,
  onCancel,
}: {
  initialValue: string;
  onApply: (value: string) => boolean;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [invalid, setInvalid] = useState(false);

  function submit() {
    if (!onApply(value)) setInvalid(true);
  }

  return (
    <View style={styles.form}>
      <Text style={typography.label}>Kipivo Web address</Text>
      <TextInput
        accessibilityLabel="Kipivo Web address"
        style={styles.input}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setInvalid(false);
        }}
        keyboardType="url"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="go"
        maxLength={512}
        onSubmitEditing={submit}
      />
      <Text style={typography.body}>
        Enter the address you use in your browser, without a page path. This change lasts only for
        this app session.
      </Text>
      {invalid ? (
        <Text accessibilityRole="alert" style={[typography.body, typography.warning]}>
          Enter an HTTPS address without credentials, a path, or a query.
          {__DEV__ ? " HTTP is allowed only for local development addresses." : ""}
        </Text>
      ) : null}
      <Action label="Use address" onPress={submit} />
      {onCancel ? <Action label="Cancel" onPress={onCancel} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
