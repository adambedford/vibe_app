import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Text, H2 } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center p-5 bg-void dark:bg-void">
        <H2>This screen doesn't exist.</H2>

        <Link href="/" className="mt-4 py-4">
          <Text className="text-plasma text-[14px]">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
