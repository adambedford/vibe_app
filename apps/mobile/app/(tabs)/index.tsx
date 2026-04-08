import { FlatList, RefreshControl, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Text } from '@/components/ui/text';
import { feed } from '@/services/api';
import FeedCard from '@/components/feed/FeedCard';
import { cn } from '@/lib/utils';

type FeedTab = 'home' | 'following';

export default function FeedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('home');

  const { data, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery({
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
    <View className="flex-1 bg-void dark:bg-void">
      {/* Tab bar */}
      <View className="flex-row px-4 py-2 gap-3">
        <Pressable
          onPress={() => setTab('home')}
          className={cn(
            'py-1.5 px-4 rounded-full',
            tab === 'home' ? 'bg-plasma' : 'bg-transparent'
          )}
        >
          <Text
            className={cn(
              'text-[15px] font-satoshi-medium',
              tab === 'home' ? 'text-white' : 'text-text-muted'
            )}
          >
            Home
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('following')}
          className={cn(
            'py-1.5 px-4 rounded-full',
            tab === 'following' ? 'bg-plasma' : 'bg-transparent'
          )}
        >
          <Text
            className={cn(
              'text-[15px] font-satoshi-medium',
              tab === 'following' ? 'text-white' : 'text-text-muted'
            )}
          >
            Following
          </Text>
        </Pressable>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      />
    </View>
  );
}
