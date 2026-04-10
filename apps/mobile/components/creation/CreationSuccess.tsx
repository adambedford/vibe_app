import { View } from 'react-native';

import { Text, H1, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

type Props = {
  appId: number;
  sessionId: number;
  onPlay: () => void;
  onPublish: () => void;
  published?: boolean;
  publishLoading?: boolean;
};

export function CreationSuccess({
  appId,
  sessionId,
  onPlay,
  onPublish,
  published,
  publishLoading,
}: Props) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-[48px] mb-4">
        {published ? '🚀' : '🎉'}
      </Text>

      <H1 className="text-center mb-2">
        {published ? 'Published!' : 'Your app is ready!'}
      </H1>

      <Caption className="text-center mb-8">
        {published
          ? 'Your app is now live in the explore feed'
          : 'Play it first, then share it with the world'}
      </Caption>

      <Button onPress={onPlay} className="w-full mb-3">
        {published ? 'Play again' : 'Play your app'}
      </Button>

      {!published && (
        <Button
          variant="secondary"
          onPress={onPublish}
          disabled={publishLoading}
          className="w-full"
        >
          {publishLoading ? 'Publishing...' : 'Publish'}
        </Button>
      )}

      {published && (
        <Caption className="text-center mt-4 text-plasma">
          Your app is now visible to everyone
        </Caption>
      )}
    </View>
  );
}
