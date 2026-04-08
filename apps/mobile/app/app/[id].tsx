import { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, SafeAreaView, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { Text, View } from '@/components/Themed';
import { apps } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { getInjectedSDK, stripCDNTags, injectCSP } from '@/services/webview';
import { trackAppPlayed, trackAppPlayDuration } from '@/services/analytics';

export default function AppPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const timerRef = useRef({ start: Date.now(), accumulated: 0, active: true });
  const completedRef = useRef(false);
  const webviewRef = useRef<WebView>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

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

  // Fetch the HTML bundle and prepare it for WebView
  useEffect(() => {
    const app = data?.data;
    if (!app?.bundle_url) return;

    fetch(app.bundle_url)
      .then((res) => res.text())
      .then((html) => {
        const stripped = stripCDNTags(html);
        const withCSP = injectCSP(stripped);
        setHtmlContent(withCSP);
      })
      .catch(() => setHtmlContent(null));
  }, [data?.data?.bundle_url]);

  // Track play duration
  useEffect(() => {
    timerRef.current = { start: Date.now(), accumulated: 0, active: true };
    completedRef.current = false;

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

  // Handle SDK bridge messages from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const { type, payload, _reqId } = JSON.parse(event.nativeEvent.data);

      switch (type) {
        case 'platform:end_session':
          completedRef.current = true;
          if (payload?.score !== undefined) {
            // Score submission handled server-side via SDK
          }
          break;
        case 'platform:exit':
          router.back();
          break;
        case 'platform:share':
          // TODO: trigger native share sheet
          break;
        case 'platform:haptic':
          // TODO: trigger haptic feedback via expo-haptics
          break;
        case 'platform:play_sound':
          // TODO: play platform UI sound
          break;
        case 'lobby:create':
        case 'lobby:join':
        case 'lobby:leave':
        case 'lobby:start':
        case 'state:set':
        case 'state:set_batch':
        case 'turns:start':
        case 'turns:end':
        case 'turns:skip':
        case 'score:submit':
        case 'score:get_leaderboard':
        case 'score:get_my_best':
          // TODO: forward to Firebase/API and send response back
          if (_reqId) {
            sendToWebView(`${type}:response`, {}, _reqId);
          }
          break;
      }
    } catch {}
  }, []);

  function sendToWebView(type: string, payload: any, reqId?: string) {
    const msg = JSON.stringify({ type, payload, _reqId: reqId });
    webviewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: '${msg.replace(/'/g, "\\'")}' }));
      true;
    `);
  }

  const app = data?.data;
  if (!app) return <View style={styles.loading}><Text>Loading...</Text></View>;

  const injectedJS = getInjectedSDK(user);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{app.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {htmlContent ? (
        <WebView
          ref={webviewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          originWhitelist={['about:blank']}
          allowsLinkPreview={false}
          allowFileAccess={false}
          allowsBackForwardNavigationGestures={false}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          onMessage={handleMessage}
        />
      ) : app.bundle_url ? (
        <View style={styles.loading}><Text style={{ color: '#fff' }}>Loading app...</Text></View>
      ) : (
        <View style={styles.noBundle}><Text>No published version yet.</Text></View>
      )}

      <View style={styles.actionBar}>
        <TouchableOpacity onPress={() => isAuthenticated && likeMutation.mutate()} style={styles.action}>
          <Text style={styles.actionText}>{app.is_liked ? '❤️' : '♡'} {app.like_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
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
