import { useEffect, useRef, useState, useCallback } from 'react';
import { Pressable, SafeAreaView, AppState, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { Text, Mono } from '@/components/ui/text';
import { apps } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { getInjectedSDK, stripCDNTags, injectCSP } from '@/services/webview';

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
          break;
        case 'platform:exit':
          router.back();
          break;
        case 'platform:share':
        case 'platform:haptic':
        case 'platform:play_sound':
          // TODO: implement native features
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
  if (!app) {
    return (
      <View className="flex-1 items-center justify-center bg-void">
        <Text className="text-text-primary">Loading...</Text>
      </View>
    );
  }

  const injectedJS = getInjectedSDK(user);

  return (
    <SafeAreaView className="flex-1 bg-void">
      {/* Header */}
      <View className="flex-row items-center px-3 py-2 bg-void/80">
        <Pressable onPress={() => router.back()} className="p-2">
          <Text className="text-white text-[16px]">Close</Text>
        </Pressable>
        <Text
          variant="h3"
          numberOfLines={1}
          className="flex-1 text-center text-white"
        >
          {app.title}
        </Text>
        <View className="w-[50px]" />
      </View>

      {/* WebView */}
      {htmlContent ? (
        <WebView
          ref={webviewRef}
          source={{ html: htmlContent }}
          className="flex-1"
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
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">Loading app...</Text>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-secondary">No published version yet.</Text>
        </View>
      )}

      {/* Action bar */}
      <View className="flex-row justify-around py-3 bg-void/80">
        <Pressable
          onPress={() => isAuthenticated && likeMutation.mutate()}
          className="p-2"
        >
          <Mono className="text-white text-[16px]">
            {app.is_liked ? '❤️' : '♡'} {app.like_count}
          </Mono>
        </Pressable>
        <Pressable className="p-2">
          <Mono className="text-white text-[16px]">💬 {app.comment_count}</Mono>
        </Pressable>
        <Pressable
          onPress={() => isAuthenticated && apps.remix(Number(id))}
          className="p-2"
        >
          <Mono className="text-white text-[16px]">🔀 {app.remix_count}</Mono>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
