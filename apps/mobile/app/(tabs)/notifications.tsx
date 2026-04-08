import { FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Text, View } from '@/components/Themed';
import { notifications as notifApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

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
      <View style={styles.container}>
        <Text style={styles.emptyText}>Sign in to see your notifications</Text>
        <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = data?.data ?? [];

  return (
    <View style={styles.container}>
      {items.length > 0 && (
        <TouchableOpacity style={styles.readAllButton} onPress={() => readAll.mutate()}>
          <Text style={styles.readAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={[styles.notifRow, !item.read && styles.unread]}>
            <Text style={styles.notifText}>
              {item.actor?.display_name && <Text style={styles.bold}>{item.actor.display_name} </Text>}
              {notifMessage(item)}
            </Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet</Text>}
      />
    </View>
  );
}

function notifMessage(item: any): string {
  switch (item.type) {
    case 'follow': return 'followed you';
    case 'like': return `liked your ${item.app?.title ?? 'app'}`;
    case 'comment': return `commented on ${item.app?.title ?? 'your app'}`;
    case 'remix': return `remixed ${item.app?.title ?? 'your app'}`;
    default: return item.type;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notifRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unread: { backgroundColor: '#f0f7ff' },
  notifText: { fontSize: 15 },
  bold: { fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 16 },
  readAllButton: { padding: 12, alignItems: 'flex-end', paddingRight: 16 },
  readAllText: { color: '#007AFF', fontSize: 14 },
  signInButton: { alignSelf: 'center', backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, marginTop: 16 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
