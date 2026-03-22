import React, { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FieldKey = "email" | "password";

export default function KeyboardFormScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // `keyboardVerticalOffset` ensures KeyboardAvoidingView accounts for any header/status-bar.
  // Works well inside navigation stacks when a header is present.
  const keyboardVerticalOffset = useMemo(
    () => headerHeight + insets.top,
    [headerHeight, insets.top]
  );

  const scrollRef = useRef<ScrollView>(null);
  const inputY = useRef<Record<FieldKey, number | undefined>>({
    email: undefined,
    password: undefined,
  });

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToField = (key: FieldKey) => {
    const y = inputY.current[key];
    if (typeof y !== "number") return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      scrollToField("email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      scrollToField("password");
      return;
    }

    try {
      setSubmitting(true);
      // TODO: call your API here
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Keyboard-Safe Form" }} />

      {/* Tap outside inputs to dismiss keyboard */}
      <Pressable style={styles.root} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.root}
          // iOS: padding works best; Android: height avoids layout "jumping"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              This screen keeps focused inputs visible and prevents the keyboard
              from covering the UI on both iOS and Android.
            </Text>

            <View
              style={styles.field}
              onLayout={(e) => {
                inputY.current.email = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#8A8A8A"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onFocus={() => scrollToField("email")}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View
              style={styles.field}
              onLayout={(e) => {
                inputY.current.password = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.label}>Password</Text>
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#8A8A8A"
                secureTextEntry
                textContentType="password"
                returnKeyType="done"
                onFocus={() => scrollToField("password")}
                onSubmitEditing={onSubmit}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <Pressable
                onPress={onSubmit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.button,
                  pressed && !submitting ? styles.buttonPressed : null,
                  submitting ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Submitting..." : "Submit"}
                </Text>
              </Pressable>

              {/* Extra bottom padding so the button can always scroll above the keyboard */}
              <View style={{ height: 24 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#B9B9C6",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: "#D8D8E6",
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 16,
  },
  error: {
    color: "#FF6B6B",
    marginTop: 2,
    marginBottom: 12,
    fontSize: 13,
  },
  actions: {
    marginTop: 6,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
