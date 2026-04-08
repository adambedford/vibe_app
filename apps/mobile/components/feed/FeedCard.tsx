import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, View } from '@/components/Themed';

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
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {app.thumbnail_url ? (
        <Image source={{ uri: app.thumbnail_url }} style={styles.thumbnail} />
      ) : (
        <View style={styles.placeholderThumb}>
          <Text style={styles.placeholderEmoji}>
            {app.category === 'game' ? '🎮' : app.category === 'story' ? '📖' : app.category === 'art_tool' ? '🎨' : '✨'}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.creatorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{app.creator.display_name[0]}</Text>
          </View>
          <Text style={styles.creatorName}>{app.creator.display_name}</Text>
          {app.is_multiplayer && <Text style={styles.badge}>Multiplayer</Text>}
        </View>

        <Text style={styles.title} numberOfLines={1}>{app.title}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>▶ {formatCount(app.play_count)}</Text>
          <Text style={styles.stat}>{app.is_liked ? '❤️' : '♡'} {formatCount(app.like_count)}</Text>
          <Text style={styles.stat}>🔀 {formatCount(app.remix_count)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#f8f8f8' },
  thumbnail: { width: '100%', height: 200 },
  placeholderThumb: { width: '100%', height: 200, backgroundColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 48 },
  info: { padding: 12 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarLetter: { color: '#fff', fontSize: 12, fontWeight: '600' },
  creatorName: { fontSize: 13, color: '#666', flex: 1 },
  badge: { fontSize: 11, color: '#007AFF', backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: 13, color: '#888' },
});
