import { Modal, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { Text, H2 } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { trackSignupWallShown, trackSignupDismissed } from '@/services/analytics';

type Props = {
  visible: boolean;
  trigger: string;
  onDismiss: () => void;
};

export default function SignUpWall({ visible, trigger, onDismiss }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (visible) trackSignupWallShown(trigger);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-surface dark:bg-surface rounded-t-3xl p-6 pb-10">
          <H2 className="text-center mb-2">Love what you've played?</H2>
          <Text className="text-text-secondary text-center mb-6">
            Create your own apps, follow creators, and more.
          </Text>

          <Button
            onPress={() => {
              onDismiss();
              router.push('/auth/register');
            }}
            className="mb-3"
          >
            Sign Up
          </Button>

          <Pressable
            onPress={() => {
              onDismiss();
              router.push('/auth/login');
            }}
            className="p-3 items-center mb-2"
          >
            <Text className="text-plasma text-[15px]">
              Already have an account? Sign In
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              trackSignupDismissed(trigger);
              onDismiss();
            }}
            className="p-3 items-center"
          >
            <Text className="text-text-muted text-[14px]">Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
