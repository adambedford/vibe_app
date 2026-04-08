import { View } from 'react-native';

import { Text, H1, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-[48px] mb-4">
        {isComplete ? '🎉' : isFailed ? '😔' : '🚀'}
      </Text>

      <H1 className="text-center mb-5">
        {isComplete
          ? 'Your app is ready!'
          : isFailed
          ? "We couldn't build that one"
          : 'Building your app...'}
      </H1>

      {!isComplete && !isFailed && (
        <Progress value={displayProgress} className="w-full mb-3" variant="default" />
      )}

      <Text className="text-text-secondary mb-6">{label}</Text>

      {!isComplete && !isFailed && (
        <View className="w-full mb-6">
          {COMPLETED_STAGES.map((stage, i) => {
            const stageIdx = COMPLETED_STAGES.indexOf(status);
            const isDone = i < stageIdx || isComplete;
            const isCurrent = stage === status;
            return (
              <View key={stage} className="flex-row items-center mb-2">
                <Text className="text-[16px] mr-2.5 w-6">
                  {isDone ? '✅' : isCurrent ? '🔄' : '○'}
                </Text>
                <Text
                  className={cn(
                    'text-[14px]',
                    isDone ? 'text-text-primary line-through' : 'text-text-muted'
                  )}
                >
                  {STAGE_LABELS[stage]}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {isComplete && onViewApp && (
        <Button onPress={onViewApp} className="w-full mb-3">
          Play your app
        </Button>
      )}

      {isFailed && onDismiss && (
        <Button variant="ghost" onPress={onDismiss}>
          Try again
        </Button>
      )}

      {!isComplete && !isFailed && (
        <Caption className="text-center mt-4">
          You can leave this screen — we'll notify you when it's ready!
        </Caption>
      )}
    </View>
  );
}
