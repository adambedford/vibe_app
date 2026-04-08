import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/authStore';
import { initAnalytics, identify, trackAppOpened } from '@/services/analytics';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    initAnalytics();
    trackAppOpened('organic');
    useAuthStore.getState().loadFromStorage().then(() => {
      const user = useAuthStore.getState().user;
      if (user) identify(String(user.id), { username: user.username });
    });
  }, []);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="app/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="profile/[id]" options={{ title: 'Profile' }} />
          <Stack.Screen name="auth/login" options={{ presentation: 'modal', title: 'Sign In' }} />
          <Stack.Screen name="auth/register" options={{ presentation: 'modal', title: 'Sign Up' }} />
          <Stack.Screen name="auth/profile-setup" options={{ presentation: 'modal', title: 'Profile Setup' }} />
          <Stack.Screen name="remix/[id]" options={{ title: 'Remix' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
