import { FlatList, RefreshControl, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Text, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { notifications as notifApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifApi.list(),
    enabled: isAuthenticated,
  });

  const readAll = useMutation({
    mutationFn: () => notifApi.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-void dark:bg-void items-center justify-center p-6">
        <Text className="text-text-secondary text-center mb-4">
          Sign in to see your notifications
        </Text>
        <Button onPress={() => router.push('/auth/login')}>Sign In</Button>
      </View>
    );
  }

  const items = data?.data ?? [];

  return (
    <View className="flex-1 bg-void dark:bg-void">
      {items.length > 0 && (
        <Pressable
          className="p-3 items-end pr-4"
          onPress={() => readAll.mutate()}
        >
          <Text className="text-plasma text-[14px]">Mark all as read</Text>
        </Pressable>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View
            className={cn(
              'p-4 border-b border-elevated',
              !item.read && 'bg-info/10'
            )}
          >
            <Text className="text-[15px] text-text-primary">
              {item.actor?.display_name && (
                <Text className="font-satoshi-bold">{item.actor.display_name} </Text>
              )}
              {notifMessage(item)}
            </Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <Text className="text-text-secondary text-center mt-10">
            No notifications yet
          </Text>
        }
      />
    </View>
  );
}

function notifMessage(item: any): string {
  switch (item.type) {
    case 'follow':
      return 'followed you';
    case 'like':
      return `liked your ${item.app?.title ?? 'app'}`;
    case 'comment':
      return `commented on ${item.app?.title ?? 'your app'}`;
    case 'remix':
      return `remixed ${item.app?.title ?? 'your app'}`;
    default:
      return item.type;
  }
}
