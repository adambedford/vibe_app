import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Text, H2, Caption, Mono } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { users } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import FeedCard from '@/components/feed/FeedCard';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data: userData } = useQuery({
    queryKey: ['user', id],
    queryFn: () => users.get(Number(id)),
  });

  const { data: appsData } = useQuery({
    queryKey: ['user-apps', id],
    queryFn: () => users.apps(Number(id)),
  });

  const followMutation = useMutation({
    mutationFn: () => {
      const user = userData?.data;
      return user?.is_following ? users.unfollow(Number(id)) : users.follow(Number(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
  });

  const user = userData?.data;
  const userApps = appsData?.data ?? [];

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-void">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void dark:bg-void">
      <FlatList
        data={userApps}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedCard app={item} onPress={() => router.push(`/app/${item.id}`)} />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="items-center py-6">
            <Avatar
              size="xl"
              source={user.avatar_url ? { uri: user.avatar_url } : undefined}
              fallback={user.display_name}
              className="mb-3"
            />
            <H2>{user.display_name}</H2>
            <Caption className="text-text-muted mt-0.5">@{user.username}</Caption>
            {user.bio && (
              <Text className="text-text-secondary text-center mt-2 px-8">
                {user.bio}
              </Text>
            )}

            {/* Stats */}
            <View className="flex-row mt-4 gap-8">
              <View className="items-center">
                <Mono className="text-[18px] font-satoshi-bold text-text-primary">
                  {user.follower_count}
                </Mono>
                <Caption className="mt-0.5">Followers</Caption>
              </View>
              <View className="items-center">
                <Mono className="text-[18px] font-satoshi-bold text-text-primary">
                  {user.following_count}
                </Mono>
                <Caption className="mt-0.5">Following</Caption>
              </View>
              <View className="items-center">
                <Mono className="text-[18px] font-satoshi-bold text-text-primary">
                  {user.app_count}
                </Mono>
                <Caption className="mt-0.5">Apps</Caption>
              </View>
            </View>

            {isAuthenticated && user.is_following !== null && (
              <Button
                variant={user.is_following ? 'outline' : 'default'}
                onPress={() => followMutation.mutate()}
                className="mt-4"
              >
                {user.is_following ? 'Following' : 'Follow'}
              </Button>
            )}
          </View>
        }
      />
    </View>
  );
}
