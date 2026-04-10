import { View, Pressable, Image } from 'react-native';

import { Text, Caption } from '@/components/ui/text';

type Props = {
  session: {
    id: number;
    status: string;
    plan?: { title?: string };
    thumbnail_url?: string;
    form_inputs?: { category?: string };
    created_at: string;
  };
  onPress: () => void;
};

const STATUS_CONFIG: Record<string, { icon: string; bg: string }> = {
  active: { icon: '🔄', bg: 'bg-plasma/20' },
  enhancing: { icon: '🔄', bg: 'bg-plasma/20' },
  planning: { icon: '🔄', bg: 'bg-plasma/20' },
  awaiting_approval: { icon: '⏸️', bg: 'bg-yellow-500/20' },
  generating: { icon: '🔄', bg: 'bg-plasma/20' },
  validating: { icon: '🔄', bg: 'bg-plasma/20' },
  retrying: { icon: '🔄', bg: 'bg-yellow-500/20' },
  completed: { icon: '✓', bg: 'bg-green-500/20' },
  under_review: { icon: '👁️', bg: 'bg-yellow-500/20' },
  failed: { icon: '✕', bg: 'bg-red-500/20' },
};

export function CreationTile({ session, onPress }: Props) {
  const config = STATUS_CONFIG[session.status] || { icon: '?', bg: 'bg-elevated' };
  const { icon, bg: bgColor } = config;
  const title = session.plan?.title || session.form_inputs?.category || 'Untitled';
  const isInProgress = ['active', 'enhancing', 'planning', 'generating', 'validating', 'retrying'].includes(session.status);

  return (
    <Pressable onPress={onPress} className="w-[31%] mb-3">
      <View className={`aspect-square rounded-lg overflow-hidden ${bgColor}`}>
        {session.thumbnail_url ? (
          <Image
            source={{ uri: session.thumbnail_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-[32px]">{icon}</Text>
          </View>
        )}

        {/* Status badge overlay */}
        {(isInProgress || session.status === 'failed') && (
          <View className="absolute bottom-1 right-1 bg-void/80 rounded px-1.5 py-0.5">
            <Text className="text-[10px] text-white">
              {session.status === 'failed' ? 'Failed' : 'Building...'}
            </Text>
          </View>
        )}
      </View>
      <Caption numberOfLines={1} className="mt-1 text-center">
        {title}
      </Caption>
    </Pressable>
  );
}
