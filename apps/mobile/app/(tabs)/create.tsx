import { useState, useEffect } from 'react';
import { TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Text, H1, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { creation } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useAnonymousStore } from '@/stores/anonymousStore';
import SignUpWall from '@/components/social/SignUpWall';
import {
  trackCreationStarted,
  trackWalkthroughStarted,
  trackWalkthroughStepCompleted,
  trackWalkthroughSkipped,
  trackWalkthroughCompleted,
} from '@/services/analytics';
import { cn } from '@/lib/utils';

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
  const params = useLocalSearchParams<{
    category?: string;
    visual_theme?: string;
    content_theme?: string;
    details?: string;
  }>();
  const { isAuthenticated } = useAuthStore();
  const { showSignUpWall, signUpWallVisible, hideSignUpWall, signUpWallTrigger } = useAnonymousStore();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('');
  const [visualTheme, setVisualTheme] = useState('');
  const [contentTheme, setContentTheme] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill from params (for "Start Over" flow)
  useEffect(() => {
    if (params.category) {
      setCategory(params.category);
      setStep(1);
    }
    if (params.visual_theme) {
      setVisualTheme(params.visual_theme);
      setStep(2);
    }
    if (params.content_theme) {
      setContentTheme(params.content_theme);
      setStep(3);
    }
    if (params.details) {
      setDetails(params.details);
      setStep(3);
    }
  }, [params.category, params.visual_theme, params.content_theme, params.details]);

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-void dark:bg-void">
        <SignUpWall visible={signUpWallVisible} trigger={signUpWallTrigger} onDismiss={hideSignUpWall} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-[48px] mb-4">✨</Text>
          <H1 className="text-center mb-2">Create something amazing</H1>
          <Text className="text-center text-text-secondary mb-6">
            Sign in to start building apps with AI
          </Text>
          <Button onPress={() => showSignUpWall('create')}>Get Started</Button>
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

      const response = await creation.create({
        prompt,
        category: category || undefined,
        visual_theme: visualTheme || undefined,
        content_theme: contentTheme || undefined,
        details: details || undefined,
        wizard_version: 1,
      });
      const sessionId = response.data.id;
      router.push(`/create/${sessionId}`);
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
    <KeyboardAvoidingView
      className="flex-1 bg-void dark:bg-void"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Step 1: Category */}
        {step === 0 && (
          <>
            <H1 className="mb-4">What do you want to make?</H1>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat.label} onPress={() => selectCategory(cat.label)}>
                <Card className="flex-row items-center p-4 mb-2.5">
                  <Text className="text-[28px] mr-3.5">{cat.icon}</Text>
                  <View className="flex-1">
                    <Text variant="h3">{cat.label}</Text>
                    <Caption>{cat.subtitle}</Caption>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {/* Step 2: Visual Theme */}
        {step === 1 && (
          <>
            <H1 className="mb-4">Pick a vibe</H1>
            {(VISUAL_THEMES[category] || VISUAL_THEMES['Surprise Me']).map((t) => (
              <Pressable key={t} onPress={() => selectVisualTheme(t)}>
                <Card className="p-4 mb-2.5">
                  <Text variant="h3">{t}</Text>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {/* Step 3: Content Theme */}
        {step === 2 && (
          <>
            <H1 className="mb-4">What's it about?</H1>
            {(CONTENT_THEMES[category] || CONTENT_THEMES['Surprise Me']).map((t) => (
              <Pressable key={t} onPress={() => selectContentTheme(t)}>
                <Card className="p-4 mb-2.5">
                  <Text variant="h3">{t}</Text>
                </Card>
              </Pressable>
            ))}
            <Pressable onPress={() => { setContentTheme(''); setStep(3); }}>
              <Card className="p-4 mb-2.5">
                <Text variant="h3">Custom...</Text>
              </Card>
            </Pressable>
          </>
        )}

        {/* Step 4: Free Text */}
        {step === 3 && (
          <>
            <H1 className="mb-2">Anything else?</H1>
            <Text className="text-text-secondary mb-4 leading-relaxed">
              e.g., "make the enemies get faster each level" or "add a plot twist at the end"
            </Text>
            <TextInput
              className="border border-elevated bg-elevated rounded-lg p-4 text-[16px] text-text-primary min-h-[100px] mb-4"
              placeholder="Add extra details..."
              placeholderTextColor="#6B6B6B"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
            />
            <Button onPress={handleCreate} disabled={loading} className="mb-3">
              {loading ? 'Creating...' : 'Build!'}
            </Button>
            <Button variant="ghost" onPress={handleCreate} disabled={loading}>
              Skip — just build it
            </Button>
          </>
        )}

        {/* Navigation */}
        {step > 0 && (
          <Pressable className="p-3 items-center" onPress={() => setStep(step - 1)}>
            <Text className="text-plasma text-[16px]">Back</Text>
          </Pressable>
        )}

        <Pressable
          className="mt-5"
          onPress={() => {
            trackWalkthroughSkipped(step);
            setStep(3);
            setCategory('');
            setVisualTheme('');
            setContentTheme('');
          }}
        >
          <Text className="text-center text-text-muted text-[14px]">Just let me type</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
