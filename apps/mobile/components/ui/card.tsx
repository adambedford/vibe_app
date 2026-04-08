import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('overflow-hidden', {
  variants: {
    variant: {
      default: 'bg-surface dark:bg-surface rounded-xl',
      elevated: 'bg-elevated dark:bg-elevated rounded-xl shadow-sm',
      outline: 'bg-transparent border border-elevated dark:border-elevated rounded-xl',
    },
    padding: {
      none: '',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'none',
  },
});

export interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  className?: string;
}

export function Card({ variant, padding, className, ...props }: CardProps) {
  return (
    <View className={cn(cardVariants({ variant, padding }), className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('px-4 pt-4 pb-2', className)} {...props} />;
}

export function CardContent({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('px-4 py-2', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('px-4 pb-4 pt-2 flex-row items-center', className)} {...props} />;
}
