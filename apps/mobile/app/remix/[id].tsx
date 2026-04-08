import { useState } from 'react';
import { TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Text, H2, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apps } from '@/services/api';

const REMIX_OPTIONS = [
  { label: 'Change the theme', icon: '🎨' },
  { label: 'Add new features', icon: '➕' },
  { label: 'Make it my own', icon: '🔄' },
];

export default function RemixScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const { data } = useQuery({
    queryKey: ['app', id],
    queryFn: () => apps.get(Number(id)),
  });

  const app = data?.data;

  const handleRemix = async () => {
    setLoading(true);
    try {
      await apps.remix(Number(id));
      router.replace('/');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-void dark:bg-void"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <H2>Remix: {app?.title ?? 'Loading...'}</H2>
        {app?.creator && (
          <Caption className="mt-1 mb-6">by @{app.creator.username}</Caption>
        )}

        <Text variant="h3" className="mb-3">
          What would you like to change?
        </Text>

        {REMIX_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => setDescription(opt.label.toLowerCase())}
          >
            <Card className="p-4 mb-2.5">
              <Text className="text-[16px]">
                {opt.icon} {opt.label}
              </Text>
            </Card>
          </Pressable>
        ))}

        <TextInput
          className="border border-elevated bg-elevated rounded-lg p-4 text-[16px] text-text-primary min-h-[80px] mt-4 mb-4"
          placeholder="Describe your changes..."
          placeholderTextColor="#6B6B6B"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />

        <Button onPress={handleRemix} disabled={loading}>
          {loading ? 'Remixing...' : 'Start Remix'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
