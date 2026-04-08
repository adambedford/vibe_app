import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { creation } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useAnonymousStore } from '@/stores/anonymousStore';
import SignUpWall from '@/components/social/SignUpWall';
import {
  trackCreationStarted, trackWalkthroughStarted, trackWalkthroughStepCompleted,
  trackWalkthroughSkipped, trackWalkthroughCompleted,
} from '@/services/analytics';

const CATEGORIES = [
  { label: 'Game', icon: '🎮', subtitle: 'Arcade, puzzle, platformer...' },
  { label: 'Story', icon: '📖', subtitle: 'Adventure, mystery, sci-fi...' },
  { label: 'Art Tool', icon: '🎨', subtitle: 'Drawing, music, patterns...' },
  { label: 'Utility', icon: '🔧', subtitle: 'Timer, quiz, tracker...' },
  { label: 'Surprise Me', icon: '✨', subtitle: 'Let the AI decide!' },
];

const VISUAL_THEMES: Record<string, string[]> = {
  Game: ['Neon / Cyber', 'Retro / Pixel', 'Cute / Kawaii', 'Clean / Minimal', 'Nature / Earthy', 'Arcade'],
  Story: ['Illustrated / Warm', 'Dark / Moody', 'Neon / Cyber', 'Watercolor', 'Clean / Minimal', 'Retro'],
  'Art Tool': ['Clean / Minimal', 'Neon / Cyber', 'Cute / Kawaii', 'Nature / Earthy', 'Bold / Colorful'],
  Utility: ['Clean / Minimal', 'Dark Mode', 'Bold / Colorful', 'Nature / Earthy', 'Retro'],
  'Surprise Me': ['Neon / Cyber', 'Cute / Kawaii', 'Retro / Pixel', 'Clean / Minimal', 'Nature / Earthy'],
};

const CONTENT_THEMES: Record<string, string[]> = {
  Game: ['Space', 'Animals', 'Food', 'Sports', 'Fantasy', 'Mystery', 'Music'],
  Story: ['Romance', 'Horror', 'Sci-Fi', 'Comedy', 'Adventure', 'Mystery'],
  'Art Tool': ['Drawing', 'Music', 'Patterns', 'Photography'],
  Utility: ['Fitness', 'Productivity', 'Learning', 'Social'],
  'Surprise Me': ['Space', 'Animals', 'Fantasy', 'Music', 'Mystery'],
};

export default function CreateScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { showSignUpWall, signUpWallVisible, hideSignUpWall, signUpWallTrigger } = useAnonymousStore();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('');
  const [visualTheme, setVisualTheme] = useState('');
  const [contentTheme, setContentTheme] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <SignUpWall visible={signUpWallVisible} trigger={signUpWallTrigger} onDismiss={hideSignUpWall} />
        <View style={styles.centered}>
          <Text style={styles.heroIcon}>✨</Text>
          <Text style={styles.title}>Create something amazing</Text>
          <Text style={styles.subtitle}>Sign in to start building apps with AI</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => showSignUpWall('create')}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCreate = async () => {
    setLoading(true);
    try {
      const parts = [];
      if (category && category !== 'Surprise Me') parts.push(`Create a ${category.toLowerCase()}`);
      else parts.push('Create something fun');
      if (contentTheme) parts.push(`about ${contentTheme.toLowerCase()}`);
      if (visualTheme) parts.push(`with a ${visualTheme.toLowerCase()} visual style`);
      if (details) parts.push(`. ${details}`);

      const prompt = parts.join(' ').trim();
      trackWalkthroughCompleted({ category, visualTheme, contentTheme });
      trackCreationStarted('walkthrough');

      const res = await creation.create(prompt);
      router.push('/');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (cat: string) => {
    setCategory(cat);
    trackWalkthroughStepCompleted(1, cat);
    setStep(1);
  };

  const selectVisualTheme = (theme: string) => {
    setVisualTheme(theme);
    trackWalkthroughStepCompleted(2, theme);
    setStep(2);
  };

  const selectContentTheme = (theme: string) => {
    setContentTheme(theme);
    trackWalkthroughStepCompleted(3, theme);
    setStep(3);
  };

  if (step === 0) trackWalkthroughStarted();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step 1: Category */}
        {step === 0 && (
          <>
            <Text style={styles.title}>What do you want to make?</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.label} style={styles.option} onPress={() => selectCategory(cat.label)}>
                <Text style={styles.optionIcon}>{cat.icon}</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{cat.label}</Text>
                  <Text style={styles.optionSubtitle}>{cat.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Step 2: Visual Theme */}
        {step === 1 && (
          <>
            <Text style={styles.title}>Pick a vibe</Text>
            {(VISUAL_THEMES[category] || VISUAL_THEMES['Surprise Me']).map((t) => (
              <TouchableOpacity key={t} style={styles.optionSimple} onPress={() => selectVisualTheme(t)}>
                <Text style={styles.optionLabel}>{t}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Step 3: Content Theme (category-aware) */}
        {step === 2 && (
          <>
            <Text style={styles.title}>What's it about?</Text>
            {(CONTENT_THEMES[category] || CONTENT_THEMES['Surprise Me']).map((t) => (
              <TouchableOpacity key={t} style={styles.optionSimple} onPress={() => selectContentTheme(t)}>
                <Text style={styles.optionLabel}>{t}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.optionSimple} onPress={() => { setContentTheme(''); setStep(3); }}>
              <Text style={styles.optionLabel}>Custom...</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 4: Free Text (Optional) */}
        {step === 3 && (
          <>
            <Text style={styles.title}>Anything else?</Text>
            <Text style={styles.hint}>
              e.g., "make the enemies get faster each level" or "add a plot twist at the end"
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Add extra details..."
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Build!'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCreate} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Skip — just build it</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Navigation */}
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => {
          trackWalkthroughSkipped(step);
          setStep(3);
          setCategory('');
          setVisualTheme('');
          setContentTheme('');
        }}>
          <Text style={styles.skipLink}>Just let me type</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heroIcon: { fontSize: 48, marginBottom: 16 },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 24 },
  hint: { fontSize: 14, color: '#999', marginBottom: 16, lineHeight: 20 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#f5f5f5', marginBottom: 10 },
  optionIcon: { fontSize: 28, marginRight: 14 },
  optionContent: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '600' },
  optionSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  optionSimple: { padding: 16, borderRadius: 12, backgroundColor: '#f5f5f5', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  secondaryButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButtonText: { color: '#007AFF', fontSize: 16 },
  backButton: { padding: 12, alignItems: 'center' },
  skipLink: { textAlign: 'center', color: '#888', marginTop: 20, fontSize: 14 },
});
