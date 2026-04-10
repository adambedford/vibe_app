import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { creation } from '@/services/api';
import GenerationProgress from '@/components/creation/GenerationProgress';
import { PlanReview } from '@/components/creation/PlanReview';
import { CreationSuccess } from '@/components/creation/CreationSuccess';

export default function CreationProgressScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['creation-session', sessionId],
    queryFn: () => creation.get(Number(sessionId)),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (['completed', 'failed', 'under_review'].includes(status)) return false;
      return 2000;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (modifications?: string) => creation.approve(Number(sessionId), modifications),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creation-session', sessionId] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => creation.publish(Number(sessionId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creation-session', sessionId] }),
  });

  const status = session?.data?.status;
  const plan = session?.data?.plan;
  const appId = session?.data?.app_id;
  const published = session?.data?.published;
  const error = session?.data?.error;
  const formInputs = session?.data?.form_inputs;
  const fixPasses = session?.data?.fix_passes;
  const maxFixPasses = session?.data?.max_fix_passes;

  const handleApprove = (modifications?: string) => {
    approveMutation.mutate(modifications);
  };

  const handlePlay = () => {
    if (appId) {
      router.push(`/app/${appId}`);
    }
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  const handleStartOver = () => {
    // Navigate back to create with form inputs preserved
    router.replace({
      pathname: '/(tabs)/create',
      params: {
        category: formInputs?.category,
        visual_theme: formInputs?.visual_theme,
        content_theme: formInputs?.content_theme,
        details: formInputs?.details,
      },
    });
  };

  if (status === 'awaiting_approval' && plan) {
    return (
      <View className="flex-1 bg-void">
        <PlanReview
          plan={plan}
          onApprove={handleApprove}
          loading={approveMutation.isPending}
        />
      </View>
    );
  }

  if (status === 'completed' && appId) {
    return (
      <View className="flex-1 bg-void">
        <CreationSuccess
          appId={appId}
          sessionId={Number(sessionId)}
          onPlay={handlePlay}
          onPublish={handlePublish}
          published={published}
          publishLoading={publishMutation.isPending}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <GenerationProgress
        status={status || 'enhancing'}
        error={error}
        fixPasses={fixPasses}
        maxFixPasses={maxFixPasses}
        onViewApp={status === 'completed' ? handlePlay : undefined}
        onDismiss={status === 'failed' ? handleStartOver : undefined}
      />
    </View>
  );
}
