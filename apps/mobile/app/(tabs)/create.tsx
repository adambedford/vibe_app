import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { creation } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const CATEGORIES = ['Game', 'Story', 'Art Tool', 'Utility', 'Surprise Me'];
const THEMES = ['Neon / Cyber', 'Cute / Kawaii', 'Retro / Pixel', 'Clean / Minimal', 'Nature / Earthy'];

export default function CreateScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('');
  const [theme, setTheme] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Create something amazing</Text>
        <Text style={styles.subtitle}>Sign in to start building apps with AI</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCreate = async () => {
    setLoading(true);
    try {
      const prompt = `Create a ${category.toLowerCase()} with a ${theme.toLowerCase()} style. ${details}`.trim();
      const res = await creation.create(prompt);
      // Navigate to creation session chat (future: dedicated creation studio screen)
      router.push('/');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 0 && (
          <>
            <Text style={styles.title}>What do you want to make?</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.option, category === cat && styles.selectedOption]}
                onPress={() => { setCategory(cat); setStep(1); }}>
                <Text style={[styles.optionText, category === cat && styles.selectedOptionText]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>Pick a vibe</Text>
            {THEMES.map((t) => (
              <TouchableOpacity key={t} style={[styles.option, theme === t && styles.selectedOption]}
                onPress={() => { setTheme(t); setStep(2); }}>
                <Text style={[styles.optionText, theme === t && styles.selectedOptionText]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Anything else?</Text>
            <TextInput style={styles.input} placeholder="Add extra details, or skip to start building!"
              value={details} onChangeText={setDetails} multiline maxLength={500} />
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Build!'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCreate} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}

        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => { setStep(2); setCategory(''); setTheme(''); }}>
          <Text style={styles.skipLink}>Just let me type</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 24 },
  option: { padding: 16, borderRadius: 12, backgroundColor: '#f0f0f0', marginBottom: 10 },
  selectedOption: { backgroundColor: '#007AFF' },
  optionText: { fontSize: 16, fontWeight: '500' },
  selectedOptionText: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  secondaryButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButtonText: { color: '#007AFF', fontSize: 16 },
  backButton: { padding: 12, alignItems: 'center' },
  skipLink: { textAlign: 'center', color: '#888', marginTop: 20, fontSize: 14 },
});
