import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.form}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>You can always change this later</Text>

        <Text style={styles.label}>Display name</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName}
          placeholder="Your name" />

        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername}
          placeholder="username" autoCapitalize="none" />

        <Text style={styles.label}>Bio (optional)</Text>
        <TextInput style={styles.input} value={bio} onChangeText={setBio}
          placeholder="Tell us about yourself" multiline maxLength={150} />

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  form: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText: { textAlign: 'center', color: '#888', marginTop: 16, fontSize: 14 },
});
