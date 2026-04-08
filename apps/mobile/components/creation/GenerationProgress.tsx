import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';

const STAGE_LABELS: Record<string, string> = {
  enhancing: 'Designing your app...',
  planning: 'Planning the build...',
  awaiting_approval: 'Ready for your review!',
  generating: 'Building the core...',
  validating: 'Testing...',
  retrying: 'Fixing a small issue...',
  complete: 'Your app is ready!',
  failed: 'Something went wrong',
  under_review: 'Under review',
};

const STAGE_PROGRESS: Record<string, number> = {
  enhancing: 10,
  planning: 20,
  awaiting_approval: 25,
  generating: 55,
  validating: 80,
  retrying: 85,
  complete: 100,
  failed: 0,
};

const COMPLETED_STAGES = ['enhancing', 'planning', 'generating', 'validating'];

type Props = {
  status: string;
  progress?: number;
  onViewApp?: () => void;
  onDismiss?: () => void;
};

export default function GenerationProgress({ status, progress, onViewApp, onDismiss }: Props) {
  const displayProgress = progress ?? STAGE_PROGRESS[status] ?? 0;
  const label = STAGE_LABELS[status] || status;
  const isComplete = status === 'complete';
  const isFailed = status === 'failed';

  return (
    <View style={styles.container}>
      {!isComplete && !isFailed && (
        <Text style={styles.emoji}>🚀</Text>
      )}
      {isComplete && <Text style={styles.emoji}>🎉</Text>}
      {isFailed && <Text style={styles.emoji}>😔</Text>}

      <Text style={styles.title}>
        {isComplete ? 'Your app is ready!' : isFailed ? "We couldn't build that one" : 'Building your app...'}
      </Text>

      {!isComplete && !isFailed && (
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${displayProgress}%` }]} />
        </View>
      )}

      <Text style={styles.stageLabel}>{label}</Text>

      {!isComplete && !isFailed && (
        <View style={styles.stages}>
          {COMPLETED_STAGES.map((stage, i) => {
            const stageIdx = COMPLETED_STAGES.indexOf(status);
            const isDone = i < stageIdx || isComplete;
            const isCurrent = stage === status;
            return (
              <View key={stage} style={styles.stageRow}>
                <Text style={styles.stageIcon}>
                  {isDone ? '✅' : isCurrent ? '🔄' : '○'}
                </Text>
                <Text style={[styles.stageText, isDone && styles.stageDone]}>
                  {STAGE_LABELS[stage]}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {isComplete && onViewApp && (
        <TouchableOpacity style={styles.primaryButton} onPress={onViewApp}>
          <Text style={styles.buttonText}>Play your app</Text>
        </TouchableOpacity>
      )}

      {isFailed && onDismiss && (
        <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss}>
          <Text style={styles.secondaryText}>Try again</Text>
        </TouchableOpacity>
      )}

      {!isComplete && !isFailed && (
        <Text style={styles.hint}>You can leave this screen — we'll notify you when it's ready!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  progressBarOuter: { width: '100%', height: 8, backgroundColor: '#e8e8e8', borderRadius: 4, marginBottom: 12 },
  progressBarInner: { height: 8, backgroundColor: '#007AFF', borderRadius: 4 },
  stageLabel: { fontSize: 16, color: '#666', marginBottom: 24 },
  stages: { width: '100%', marginBottom: 24 },
  stageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stageIcon: { fontSize: 16, marginRight: 10, width: 24 },
  stageText: { fontSize: 14, color: '#888' },
  stageDone: { color: '#333', textDecorationLine: 'line-through' },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { padding: 16, alignItems: 'center' },
  secondaryText: { color: '#007AFF', fontSize: 16 },
  hint: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 16 },
});
