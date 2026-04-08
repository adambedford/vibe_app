import { View, Image, type ImageProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const avatarVariants = cva(
  'items-center justify-center overflow-hidden rounded-full bg-plasma',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const avatarTextVariants = cva('font-satoshi-medium text-white uppercase', {
  variants: {
    size: {
      xs: 'text-[10px]',
      sm: 'text-[12px]',
      md: 'text-[14px]',
      lg: 'text-[16px]',
      xl: 'text-[20px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  source?: ImageProps['source'];
  fallback?: string;
  className?: string;
}

export function Avatar({ size, source, fallback, className }: AvatarProps) {
  const initials = fallback
    ? fallback
        .split(' ')
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
    : '?';

  return (
    <View className={cn(avatarVariants({ size }), className)}>
      {source ? (
        <Image source={source} className="h-full w-full" resizeMode="cover" />
      ) : (
        <Text className={cn(avatarTextVariants({ size }))}>{initials}</Text>
      )}
    </View>
  );
}
