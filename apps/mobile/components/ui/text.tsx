import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textVariants = cva('', {
  variants: {
    variant: {
      display: 'text-[48px] leading-tight font-clash-bold text-text-primary dark:text-text-primary',
      h1: 'text-[32px] leading-snug font-clash-semibold text-text-primary dark:text-text-primary',
      h2: 'text-[24px] leading-normal font-clash-semibold text-text-primary dark:text-text-primary',
      h3: 'text-[18px] leading-relaxed font-clash-semibold text-text-primary dark:text-text-primary',
      body: 'text-[16px] leading-relaxed font-satoshi text-text-secondary dark:text-text-secondary',
      'body-sm': 'text-[14px] leading-relaxed font-satoshi text-text-secondary dark:text-text-secondary',
      caption: 'text-[12px] leading-snug font-satoshi-medium text-text-muted dark:text-text-muted',
      mono: 'text-[14px] leading-relaxed font-geist text-text-secondary dark:text-text-secondary',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {}

export function Text({ variant, className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  );
}

// Named exports for convenience
export function DisplayText(props: Omit<TextProps, 'variant'>) {
  return <Text variant="display" {...props} />;
}

export function H1(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h1" {...props} />;
}

export function H2(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h2" {...props} />;
}

export function H3(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h3" {...props} />;
}

export function Caption(props: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" {...props} />;
}

export function Mono(props: Omit<TextProps, 'variant'>) {
  return <Text variant="mono" {...props} />;
}
