import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';

import { Text, Caption, Mono } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type FeedCardProps = {
  app: {
    id: number;
    title: string;
    category?: string;
    thumbnail_url?: string;
    is_multiplayer?: boolean;
    play_count: number;
    like_count: number;
    remix_count: number;
    creator: { username: string; display_name: string; avatar_url?: string };
    is_liked?: boolean;
  };
  onPress: () => void;
};

export default function FeedCard({ app, onPress }: FeedCardProps) {
  const emoji =
    app.category === 'game'
      ? '🎮'
      : app.category === 'story'
      ? '📖'
      : app.category === 'art_tool'
      ? '🎨'
      : '✨';

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card
          variant="default"
          className={cn('mb-4 overflow-hidden', pressed && 'opacity-90')}
        >
          {app.thumbnail_url ? (
            <Image
              source={{ uri: app.thumbnail_url }}
              className="w-full h-[200px]"
              contentFit="cover"
            />
          ) : (
            <View className="w-full h-[200px] bg-elevated items-center justify-center">
              <Text className="text-[48px]">{emoji}</Text>
            </View>
          )}

          <View className="p-3">
            {/* Creator row */}
            <View className="flex-row items-center mb-1.5">
              <Avatar
                size="xs"
                source={app.creator.avatar_url ? { uri: app.creator.avatar_url } : undefined}
                fallback={app.creator.display_name}
              />
              <Caption className="ml-2 flex-1 text-text-secondary">
                {app.creator.display_name}
              </Caption>
              {app.is_multiplayer && <Badge variant="primary">Multiplayer</Badge>}
            </View>

            {/* Title */}
            <Text variant="h3" numberOfLines={1} className="mb-2">
              {app.title}
            </Text>

            {/* Stats row */}
            <View className="flex-row gap-4">
              <Mono className="text-text-muted">▶ {formatCount(app.play_count)}</Mono>
              <Mono className="text-text-muted">
                {app.is_liked ? '❤️' : '♡'} {formatCount(app.like_count)}
              </Mono>
              <Mono className="text-text-muted">🔀 {formatCount(app.remix_count)}</Mono>
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
