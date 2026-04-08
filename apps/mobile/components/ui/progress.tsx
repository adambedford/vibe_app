import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva('w-full overflow-hidden rounded-full bg-elevated dark:bg-elevated', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const progressFillVariants = cva('h-full rounded-full', {
  variants: {
    variant: {
      default: 'bg-plasma',
      secondary: 'bg-violet',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface ProgressProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressFillVariants> {
  value: number; // 0-100
  className?: string;
  animated?: boolean;
}

export function Progress({
  value,
  size,
  variant,
  className,
  animated = true,
  ...props
}: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: animated
        ? withSpring(`${clampedValue}%`, { damping: 15, stiffness: 100 })
        : withTiming(`${clampedValue}%`, { duration: 200 }),
    };
  }, [clampedValue, animated]);

  return (
    <View className={cn(progressVariants({ size }), className)} {...props}>
      <Animated.View
        className={progressFillVariants({ variant })}
        style={animatedStyle}
      />
    </View>
  );
}
