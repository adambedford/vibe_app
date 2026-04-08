import { useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, H1, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { me } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { trackProfileSetupCompleted } from '@/services/analytics';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await me.update({ display_name: displayName, username, bio: bio || undefined });
      setUser(res.data);
      trackProfileSetupCompleted();
      router.replace('/');
    } catch (e) {
      console.error(e);
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
        <H1 className="mb-1">Set up your profile</H1>
        <Text className="text-text-secondary mb-6">You can always change this later</Text>

        <Caption className="mb-1.5 mt-3">Display name</Caption>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          className="mb-1"
        />

        <Caption className="mb-1.5 mt-3">Username</Caption>
        <Input
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          autoCapitalize="none"
          className="mb-1"
        />

        <Caption className="mb-1.5 mt-3">Bio (optional)</Caption>
        <Input
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself"
          multiline
          maxLength={150}
          className="mb-6"
        />

        <Button onPress={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Continue'}
        </Button>

        <Pressable onPress={() => router.replace('/')} className="mt-4">
          <Text className="text-center text-text-muted text-[14px]">Skip for now</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
