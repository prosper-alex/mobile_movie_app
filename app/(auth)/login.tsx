import Button from "@/components/Button";
import Screen from "@/components/Screen";
import { icons } from "@/constants/icons";
import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function LoginScreen() {
  const { state, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const keyboardShift = useRef(new Animated.Value(0)).current;

  const canSubmit = useMemo(() => {
    const hasName = name.trim().length >= 2;
    const hasEmail = email.trim().length >= 3;
    return hasName || hasEmail;
  }, [email, name]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => {
      const keyboardHeight = e?.endCoordinates?.height ?? 0;
      const shift =
        Platform.OS === "android" ? -Math.min(110, keyboardHeight * 0.25) : 0;
      Animated.timing(keyboardShift, {
        toValue: shift,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const onHide = () => {
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const s1 = Keyboard.addListener(showEvent as any, onShow);
    const s2 = Keyboard.addListener(hideEvent as any, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [keyboardShift]);

  if (state.status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Screen className="px-5">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
            <Animated.View style={{ flex: 1, transform: [{ translateY: keyboardShift }] }}>
              <View className="w-full flex-row justify-center mt-6">
                <Image
                  source={icons.logo}
                  className="w-12 h-10 mb-5"
                  resizeMode="contain"
                />
              </View>

              <View className="flex-1 justify-center">
                <Text className="text-white text-2xl font-extrabold mb-2 text-center">
                  Welcome back
                </Text>
                <Text className="text-light-200 text-center mb-8">
                  Sign in to keep your saved movies across sessions.
                </Text>

                <View className="bg-dark-100 rounded-2xl p-4">
                  <Text className="text-white font-semibold mb-2">
                    Name (optional)
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Prosper"
                    placeholderTextColor="#9CA4AB"
                    autoCorrect={false}
                    className="bg-dark-200 rounded-xl px-4 py-3 text-white"
                  />

                  <Text className="text-white font-semibold mt-4 mb-2">
                    Email (optional)
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="e.g. you@email.com"
                    placeholderTextColor="#9CA4AB"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="bg-dark-200 rounded-xl px-4 py-3 text-white"
                  />

                  <View className="mt-6">
                    <Button
                      title={submitting ? "Signing in..." : "Sign in"}
                      disabled={!canSubmit || submitting}
                      onPress={() => {
                        setSubmitting(true);
                        void login({
                          name: name.trim() || undefined,
                          email: email.trim() || undefined,
                        }).finally(() => setSubmitting(false));
                      }}
                    />
                  </View>

                  <View className="mt-3">
                    <Button
                      title="Continue as guest"
                      variant="secondary"
                      onPress={() => {
                        setSubmitting(true);
                        void login({ name: "Guest" }).finally(() => setSubmitting(false));
                      }}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
