import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, SafeAreaView, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebView } from 'react-native-webview';

import { Text, View } from '@/components/Themed';
import { apps } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function AppPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const timerRef = useRef({ start: Date.now(), accumulated: 0, active: true });
  const completedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ['app', id],
    queryFn: () => apps.get(Number(id)),
  });

  const likeMutation = useMutation({
    mutationFn: () => {
      const app = data?.data;
      return app?.is_liked ? apps.unlike(Number(id)) : apps.like(Number(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app', id] }),
  });

  // Track play duration
  useEffect(() => {
    timerRef.current = { start: Date.now(), accumulated: 0, active: true };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !timerRef.current.active) {
        timerRef.current.start = Date.now();
        timerRef.current.active = true;
      } else if (state !== 'active' && timerRef.current.active) {
        timerRef.current.accumulated += Date.now() - timerRef.current.start;
        timerRef.current.active = false;
      }
    });

    return () => {
      sub.remove();
      const total = getTotalSeconds();
      if (isAuthenticated && total > 0) {
        apps.play(Number(id), total).catch(() => {});
      }
    };
  }, [id]);

  function getTotalSeconds() {
    let total = timerRef.current.accumulated;
    if (timerRef.current.active) total += Date.now() - timerRef.current.start;
    return Math.round(total / 1000);
  }

  const handleMessage = (event: any) => {
    try {
      const { type } = JSON.parse(event.nativeEvent.data);
      if (type === 'platform:end_session') completedRef.current = true;
      if (type === 'platform:exit') router.back();
    } catch {}
  };

  const app = data?.data;
  if (!app) return <View style={styles.loading}><Text>Loading...</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{app.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {app.bundle_url ? (
        <WebView
          source={{ uri: app.bundle_url }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          onMessage={handleMessage}
        />
      ) : (
        <View style={styles.noBundle}>
          <Text>This app has no published version yet.</Text>
        </View>
      )}

      <View style={styles.actionBar}>
        <TouchableOpacity onPress={() => isAuthenticated && likeMutation.mutate()} style={styles.action}>
          <Text style={styles.actionText}>{app.is_liked ? '❤️' : '♡'} {app.like_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/app/${id}`)} style={styles.action}>
          <Text style={styles.actionText}>💬 {app.comment_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => isAuthenticated && apps.remix(Number(id))} style={styles.action}>
          <Text style={styles.actionText}>🔀 {app.remix_count}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.8)' },
  headerButton: { padding: 8 },
  headerButtonText: { color: '#fff', fontSize: 16 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { width: 50 },
  webview: { flex: 1 },
  noBundle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.8)' },
  action: { padding: 8 },
  actionText: { color: '#fff', fontSize: 16 },
});
