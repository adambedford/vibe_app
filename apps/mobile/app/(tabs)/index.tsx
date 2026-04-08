import { FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Text, View } from '@/components/Themed';
import { feed } from '@/services/api';
import FeedCard from '@/components/feed/FeedCard';

type FeedTab = 'home' | 'following';

export default function FeedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('home');

  const { data, fetchNextPage, hasNextPage, isLoading, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam }) => {
      const fetcher = tab === 'home' ? feed.home : feed.following;
      return fetcher(pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) =>
      lastPage.pagination?.has_more ? lastPage.pagination.next_cursor : undefined,
  });

  const apps = data?.pages.flatMap((p: any) => p.data) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setTab('home')} style={[styles.tab, tab === 'home' && styles.activeTab]}>
          <Text style={[styles.tabText, tab === 'home' && styles.activeTabText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('following')} style={[styles.tab, tab === 'following' && styles.activeTab]}>
          <Text style={[styles.tabText, tab === 'following' && styles.activeTabText]}>Following</Text>
        </TouchableOpacity>
      </View>

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
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  activeTab: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 15, color: '#888' },
  activeTabText: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
});
