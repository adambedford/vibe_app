import { StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Text, View } from '@/components/Themed';
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

  if (!user) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={userApps}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedCard app={item} onPress={() => router.push(`/app/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user.display_name[0]}</Text>
            </View>
            <Text style={styles.displayName}>{user.display_name}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statCount}>{user.follower_count}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statCount}>{user.following_count}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statCount}>{user.app_count}</Text>
                <Text style={styles.statLabel}>Apps</Text>
              </View>
            </View>
            {isAuthenticated && user.is_following !== null && (
              <TouchableOpacity
                style={[styles.followButton, user.is_following && styles.followingButton]}
                onPress={() => followMutation.mutate()}>
                <Text style={[styles.followText, user.is_following && styles.followingText]}>
                  {user.is_following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  displayName: { fontSize: 22, fontWeight: 'bold' },
  username: { fontSize: 15, color: '#888', marginTop: 2 },
  bio: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  stats: { flexDirection: 'row', marginTop: 16, gap: 32 },
  stat: { alignItems: 'center' },
  statCount: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  followButton: { marginTop: 16, backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 32, borderRadius: 20 },
  followingButton: { backgroundColor: '#e8e8e8' },
  followText: { color: '#fff', fontWeight: '600' },
  followingText: { color: '#333' },
});
