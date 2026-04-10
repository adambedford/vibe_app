import { useState } from 'react';
import { View, TextInput, ScrollView } from 'react-native';

import { Text, H1, Caption } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = {
  plan: { title?: string; description?: string; features?: string[] };
  onApprove: (modifications?: string) => void;
  loading?: boolean;
};

export function PlanReview({ plan, onApprove, loading }: Props) {
  const [modifications, setModifications] = useState('');
  const [showModifications, setShowModifications] = useState(false);

  const handleApprove = () => {
    onApprove(showModifications && modifications ? modifications : undefined);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
    >
      <Text className="text-[48px] text-center mb-4">📋</Text>

      <H1 className="text-center mb-2">Review the plan</H1>
      <Caption className="text-center mb-6">
        Here's what we're going to build
      </Caption>

      <Card className="p-4 mb-4">
        {plan.title && (
          <Text variant="h3" className="mb-2">
            {plan.title}
          </Text>
        )}
        {plan.description && (
          <Text className="text-text-secondary mb-3">{plan.description}</Text>
        )}
        {plan.features && plan.features.length > 0 && (
          <View>
            <Text className="text-text-muted text-[12px] uppercase mb-2">
              Features
            </Text>
            {plan.features.map((feature, i) => (
              <View key={i} className="flex-row mb-1.5">
                <Text className="text-plasma mr-2">-</Text>
                <Text className="flex-1 text-text-primary">{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {showModifications && (
        <TextInput
          className="border border-elevated bg-elevated rounded-lg p-4 text-[16px] text-text-primary min-h-[80px] mb-4"
          placeholder="Describe any changes..."
          placeholderTextColor="#6B6B6B"
          value={modifications}
          onChangeText={setModifications}
          multiline
          maxLength={500}
        />
      )}

      <Button onPress={handleApprove} disabled={loading} className="mb-3">
        {loading ? 'Continuing...' : 'Looks good!'}
      </Button>

      {!showModifications && (
        <Button
          variant="ghost"
          onPress={() => setShowModifications(true)}
          disabled={loading}
        >
          Make changes first
        </Button>
      )}
    </ScrollView>
  );
}
