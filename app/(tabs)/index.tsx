import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { fetchMovies } from "@/services/api";
import { getTrendingMovies } from "@/services/appwrite";
import useFetch from "@/services/useFetch";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: trendingMovies,
    loading: trendingLoading,
    error: trendingError,
  } = useFetch(getTrendingMovies);
  const {
    data: movies,
    loading,
    error,
    refetch: loadMovies,
  } = useFetch(() => fetchMovies({ query: searchQuery }), false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // if (searchQuery.trim()) {
      //   await loadMovies();
      // } else {
      //   reset();
      // }

      await loadMovies();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, loadMovies]);

  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="flex-1 absolute w-full h-full z-0 "
        resizeMode="cover"
      />

      <FlatList
        data={movies}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "31%" }}>
            <MovieCard {...item} />
          </View>
        )}
        className="px-5"
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        columnWrapperStyle={{
          justifyContent: "space-between",
          marginBottom: 16,
        }}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListHeaderComponent={
          <>
            <View className="w-full flex-row justify-center mt-20 ">
              <Image
                source={icons.logo}
                className="w-12 h-10 mb-5"
                resizeMode="contain"
              />
            </View>
            <View className="my-5 ">
              <SearchBar
                placeholder="Search movies..."
                value={searchQuery}
                onChangeText={(text: string) => setSearchQuery(text)}
              />
            </View>
            {!searchQuery.trim() && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg text-white font-bold">
                    Trending Searches
                  </Text>
                </View>
                {trendingLoading && (
                  <ActivityIndicator size="small" color="#0000ff" />
                )}
                {trendingError && (
                  <Text className="text-red-500">
                    Error: {trendingError.message}
                  </Text>
                )}
                {!trendingLoading &&
                  !trendingError &&
                  (trendingMovies?.length ?? 0) > 0 && (
                    <FlatList
                      data={trendingMovies ?? []}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(item) => item.movie_id.toString()}
                      renderItem={({ item }) => (
                        <View className="mr-4" style={{ width: 120 }}>
                          <Image
                            source={{ uri: item.poster_url }}
                            className="w-full h-40 rounded-lg"
                            resizeMode="cover"
                          />
                          <Text
                            className="text-white text-xs font-semibold mt-2"
                            numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text
                            className="text-light-300 text-xs"
                            numberOfLines={1}>
                            {item.search_term}
                          </Text>
                        </View>
                      )}
                    />
                  )}
              </View>
            )}
            {loading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                className="my-3 "
              />
            )}
            {error && (
              <Text className="text-red-500 px-5 my-3">
                Error: {error.message}
              </Text>
            )}
            {!loading && !error && searchQuery.trim() && movies?.length > 0 && (
              <Text className="text-xl text-white font-bold">
                Search Result for{" "}
                <Text className="text-accent">{searchQuery}</Text>
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="mt-10 px-5">
              <Text className="text-gray-500 text-center">
                {searchQuery.trim() ? "No movies found " : "Search for a movie"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default SearchScreen;
