import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { fetchMovies } from "@/services/api";
import useFetch from "@/services/useFetch";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  Text,
  View,
} from "react-native";
import "react-native-url-polyfill/auto";

export default function Index() {
  const router = useRouter();

  const {
    data: movies,
    loading: moviesLoading,
    error: moviesError,
  } = useFetch(() => fetchMovies({ query: "" }));

  return (
    <>
      <StatusBar barStyle={"light-content"} />
      <View className="flex-1 bg-primary">
        <Image source={images.bg} className="absolute w-full h-full z-0" />
        {moviesLoading ? (
          <View className="flex-1 px-5">
            <Image
              source={icons.logo}
              className="w-12 h-10 mt-20  mb-5 mx-auto"
            />
            <ActivityIndicator
              size="large"
              color="#0000ff"
              className="mt-10 self-center"
            />
          </View>
        ) : moviesError ? (
          <View className="flex-1 px-5">
            <Image
              source={icons.logo}
              className="w-12 h-10 mt-20  mb-5 mx-auto"
            />
            <Text>Error: {moviesError?.message}</Text>
          </View>
        ) : (
          <FlatList
            data={movies ?? []}
            renderItem={({ item }) => <MovieCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={{
              justifyContent: "flex-start",
              gap: 20,
              paddingRight: 5,
              marginBottom: 10,
            }}
            className="flex-1 px-5"
            contentContainerStyle={{ minHeight: "100%", paddingBottom: 42 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View className="mt-20">
                <Image source={icons.logo} className="w-12 h-10 mb-5 mx-auto" />
                <SearchBar
                  onPress={() => router.push("/search")}
                  placeholder="Search for a movies !"
                />
                <Text className="text-white text-lg font-bold mt-5 mb-3">
                  Latest Movies
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}
