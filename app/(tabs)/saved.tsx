import Button from "@/components/Button";
import MovieGrid from "@/components/MovieGrid";
import RecoveryMessage from "@/components/RecoveryMessage";
import Screen from "@/components/Screen";
import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/providers/SavedMoviesProvider";
import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

const SavedScreen = () => {
  const { saved, hydrated, pending, error, clear, retry } = useSavedMovies();

  return (
    <Screen className="px-5">
      <MovieGrid
        data={saved}
        ListHeaderComponent={
          <>
            <View className="w-full flex-row justify-center mt-6">
              <Image
                source={icons.logo}
                className="w-12 h-10 mb-5"
                resizeMode="contain"
              />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl text-white font-bold">
                Saved ({saved.length})
              </Text>
              {saved.length > 0 && (
                <View style={{ width: 140 }}>
                  <Button
                    title="Clear all"
                    variant="danger"
                    disabled={pending || !hydrated}
                    onPress={() => void clear()}
                  />
                </View>
              )}
            </View>
            {pending ? <ActivityIndicator color="#AB8BFF" accessibilityLabel="Updating saved movies" /> : null}
            {error ? <RecoveryMessage message={error.message} busy={pending} onRetry={() => void retry()} /> : null}
          </>
        }
        ListEmptyComponent={
          hydrated && !error ? (
            <View className="mt-10">
              <Text className="text-gray-500 text-center">
                No saved movies yet.
              </Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
};

export default SavedScreen;
