import React from "react";
import { FlatList, View } from "react-native";

import MovieCard from "@/components/MovieCard";
import type { MovieSummary } from "@/types/movies";

type Props = {
  data: MovieSummary[] | null;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  onItemPress?: (movie: MovieSummary) => void;
};

export default function MovieGrid({
  data,
  ListHeaderComponent,
  ListEmptyComponent,
  onItemPress,
}: Props) {
  return (
    <FlatList
      data={data ?? []}
      renderItem={({ item }) => (
        <View style={{ flex: 1, maxWidth: "31%" }}>
          <MovieCard {...item} onPress={onItemPress ? () => onItemPress(item) : undefined} />
        </View>
      )}
      keyExtractor={(item) => item.id.toString()}
      numColumns={3}
      columnWrapperStyle={{
        justifyContent: "space-between",
        marginBottom: 16,
      }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
    />
  );
}
