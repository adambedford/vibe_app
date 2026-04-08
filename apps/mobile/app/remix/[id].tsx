import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Text, View } from '@/components/Themed';
import { apps, creation } from '@/services/api';

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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Remix: {app?.title ?? 'Loading...'}</Text>
        {app?.creator && <Text style={styles.subtitle}>by @{app.creator.username}</Text>}

        <Text style={styles.sectionTitle}>What would you like to change?</Text>

        {REMIX_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.label} style={styles.option}
            onPress={() => setDescription(opt.label.toLowerCase())}>
            <Text style={styles.optionText}>{opt.icon} {opt.label}</Text>
          </TouchableOpacity>
        ))}

        <TextInput
          style={styles.input}
          placeholder="Describe your changes..."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />

        <TouchableOpacity style={styles.button} onPress={handleRemix} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Remixing...' : 'Start Remix'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  option: { padding: 16, borderRadius: 12, backgroundColor: '#f0f0f0', marginBottom: 10 },
  optionText: { fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginTop: 16, marginBottom: 16 },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
