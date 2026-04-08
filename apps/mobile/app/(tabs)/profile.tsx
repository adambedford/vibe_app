import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Text, H1, H2, Caption, Mono } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { users } from '@/services/api';
import FeedCard from '@/components/feed/FeedCard';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: appsData } = useQuery({
    queryKey: ['my-apps', user?.id],
    queryFn: () => users.apps(user!.id),
    enabled: !!user?.id,
  });

  if (!isAuthenticated || !user) {
    return (
      <View className="flex-1 bg-void dark:bg-void items-center justify-center p-6">
        <H1 className="text-center mb-2">Your Profile</H1>
        <Text className="text-text-secondary text-center mb-6">
          Sign in to see your apps and profile
        </Text>
        <Button onPress={() => router.push('/auth/login')}>Sign In</Button>
      </View>
    );
  }

  const myApps = appsData?.data ?? [];

  return (
    <View className="flex-1 bg-void dark:bg-void">
      <FlatList
        data={myApps}
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

            <Button variant="ghost" onPress={logout} className="mt-4">
              <Text className="text-error text-[14px]">Sign Out</Text>
            </Button>
          </View>
        }
      />
    </View>
  );
}
