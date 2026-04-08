import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const badgeVariants = cva('rounded-full px-2.5 py-0.5', {
  variants: {
    variant: {
      default: 'bg-elevated dark:bg-elevated',
      primary: 'bg-plasma/15',
      secondary: 'bg-violet/15',
      success: 'bg-success/15',
      warning: 'bg-warning/15',
      error: 'bg-error/15',
      info: 'bg-info/15',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const badgeTextVariants = cva('text-[11px] font-satoshi-medium', {
  variants: {
    variant: {
      default: 'text-text-secondary dark:text-text-secondary',
      primary: 'text-plasma',
      secondary: 'text-violet',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      info: 'text-info',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof badgeVariants> {
  children: string;
  className?: string;
}

export function Badge({ variant, children, className, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      <Text className={badgeTextVariants({ variant })}>{children}</Text>
    </View>
  );
}
