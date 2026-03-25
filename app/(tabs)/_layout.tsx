import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/providers/AuthProvider";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  ImageBackground,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconProps = {
  focused: boolean;
  icon: ImageSourcePropType;
  title: string;
};

const TabIcon = ({ focused, icon, title }: TabIconProps) => {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  if (focused) {
    return (
      <ImageBackground
        source={images.highlight}
        className={[
          "flex-row items-center justify-center rounded-full overflow-hidden",
          compact ? "px-2 py-2" : "px-4 py-2",
        ].join(" ")}
        style={{ alignSelf: "center", maxWidth: "100%" }}>
        <Image
          source={icon}
          style={{ tintColor: "#151312" }}
          className={compact ? "w-4 h-4" : "w-5 h-5"}
        />
        <Text
          className={[
            "text-secondary font-semibold",
            compact ? "text-xs ml-1.5" : "text-sm ml-2",
          ].join(" ")}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.9}>
          {title}
        </Text>
      </ImageBackground>
    );
  }

  return (
    <View
      className="w-10 h-10 items-center justify-center rounded-full"
      style={{ alignSelf: "center" }}>
      <Image
        source={icon}
        style={{ tintColor: "#A8B5DB" }}
        className="w-5 h-5"
      />
    </View>
  );
};

const TabsLayout = () => {
  const { state } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const barHeight = 66;

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace("/(auth)/login");
    }
  }, [router, state.status]);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarIconStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 12,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 34,
        },
        tabBarStyle: {
          backgroundColor: "#0e0d23",
          borderRadius: 50,
          marginHorizontal: 20,
          marginBottom: insets.bottom + 12,
          height: barHeight,
          paddingHorizontal: 10,
          position: "absolute",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#0f0d23",
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.home} title="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.search} title="Search" />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.save} title="Saved" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.person} title="Profile" />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
