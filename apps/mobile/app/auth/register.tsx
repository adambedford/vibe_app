import { useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, H1 } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await auth.register({
        email,
        password,
        display_name: displayName,
        username,
        date_of_birth: dateOfBirth,
      });
      setAuth(res.data.user, res.data.tokens.access_token, res.data.tokens.refresh_token);
      router.replace('/auth/profile-setup');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-void dark:bg-void"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
        <H1 className="mb-6">Create your account</H1>

        {error ? (
          <Text className="text-error mb-3">{error}</Text>
        ) : null}

        <Input
          placeholder="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          className="mb-3"
        />
        <Input
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          className="mb-3"
        />
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
          className="mb-3"
        />
        <Input
          placeholder="Date of birth (YYYY-MM-DD)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          keyboardType="numbers-and-punctuation"
          className="mb-4"
        />

        <Button onPress={handleRegister} disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>

        <Pressable
          onPress={() => {
            router.back();
            router.push('/auth/login');
          }}
          className="mt-5"
        >
          <Text className="text-center text-plasma text-[14px]">
            Already have an account? Sign in
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
