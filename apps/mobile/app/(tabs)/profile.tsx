import { FlatList, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Text, H1, H2, Caption, Mono } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { users, me } from '@/services/api';
import FeedCard from '@/components/feed/FeedCard';
import { CreationTile } from '@/components/creation/CreationTile';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: appsData } = useQuery({
    queryKey: ['my-apps', user?.id],
    queryFn: () => users.apps(user!.id),
    enabled: !!user?.id,
  });

  const { data: creationsData } = useQuery({
    queryKey: ['my-creations'],
    queryFn: () => me.creations(),
    enabled: isAuthenticated,
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
  const myCreations = creationsData?.data ?? [];

  // Filter to show non-published creations (drafts, in-progress, failed)
  const activeCreations = myCreations.filter(
    (c: any) => c.status !== 'completed' || !c.app_id
  );

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

            {/* My Creations */}
            {activeCreations.length > 0 && (
              <View className="w-full mt-6">
                <Text className="text-text-muted text-[12px] uppercase tracking-wider mb-3">
                  My Creations
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {activeCreations.map((session: any) => (
                    <CreationTile
                      key={session.id}
                      session={session}
                      onPress={() => router.push(`/create/${session.id}`)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Published Apps Header */}
            {myApps.length > 0 && (
              <Text className="w-full text-text-muted text-[12px] uppercase tracking-wider mt-6 mb-3">
                Published Apps
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}
