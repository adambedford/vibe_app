import { useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, H1 } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      setAuth(res.data.user, res.data.tokens.access_token, res.data.tokens.refresh_token);
      router.back();
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center bg-void dark:bg-void"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="p-6">
        <H1 className="mb-6">Welcome back</H1>

        {error ? (
          <Text className="text-error mb-3">{error}</Text>
        ) : null}

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3"
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="mb-4"
        />

        <Button onPress={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        <Pressable
          onPress={() => {
            router.back();
            router.push('/auth/register');
          }}
          className="mt-5"
        >
          <Text className="text-center text-plasma text-[14px]">
            Don't have an account? Sign up
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
