import React from "react";
import { FlatList, View, useWindowDimensions } from "react-native";

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
  const { width } = useWindowDimensions();

  const numColumns = width < 360 ? 2 : width < 700 ? 3 : width < 900 ? 4 : 5;
  const paddingBottom = 92;
  const horizontalPadding = 20; // matches `px-5` used on screens
  const gutter = 12;
  const availableWidth = Math.max(0, width - horizontalPadding * 2);
  const itemWidth = Math.floor(
    (availableWidth - gutter * (numColumns - 1)) / numColumns,
  );

  return (
    <FlatList
      key={numColumns}
      data={data ?? []}
      renderItem={({ item }) => (
        <View style={{ width: itemWidth }}>
          <MovieCard {...item} onPress={onItemPress ? () => onItemPress(item) : undefined} />
        </View>
      )}
      keyExtractor={(item) => item.id.toString()}
      numColumns={numColumns}
      columnWrapperStyle={{
        justifyContent: "space-between",
        marginBottom: 16,
      }}
      contentContainerStyle={{ paddingBottom }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
    />
  );
}
