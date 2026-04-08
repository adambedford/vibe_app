import { StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Text, View } from '@/components/Themed';
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
      <View style={styles.container}>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.subtitle}>Sign in to see your apps and profile</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const myApps = appsData?.data ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={myApps}
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
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
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
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 60 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 8 },
  primaryButton: { alignSelf: 'center', backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutButton: { marginTop: 16, padding: 12 },
  logoutText: { color: '#FF3B30', fontSize: 14 },
});
