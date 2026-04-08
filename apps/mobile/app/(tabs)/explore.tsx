import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { View } from '@/components/Themed';
import { feed } from '@/services/api';
import FeedCard from '@/components/feed/FeedCard';

export default function ExploreScreen() {
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['explore'],
    queryFn: ({ pageParam }) => feed.explore(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) =>
      lastPage.pagination?.has_more ? lastPage.pagination.next_cursor : undefined,
  });

  const apps = data?.pages.flatMap((p: any) => p.data) ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedCard app={item} onPress={() => router.push(`/app/${item.id}`)} />
        )}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
});
