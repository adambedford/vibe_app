import { TextInput, type TextInputProps, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const inputVariants = cva(
  'bg-elevated dark:bg-elevated rounded-md px-4 py-3 font-satoshi text-[16px] text-text-primary dark:text-text-primary',
  {
    variants: {
      variant: {
        default: 'border border-transparent focus:border-plasma',
        outline: 'border border-elevated focus:border-plasma',
        filled: 'bg-surface dark:bg-surface border border-transparent',
      },
      state: {
        default: '',
        error: 'border-error',
        success: 'border-success',
      },
    },
    defaultVariants: {
      variant: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends TextInputProps,
    VariantProps<typeof inputVariants> {
  className?: string;
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  variant,
  state,
  className,
  label,
  error,
  hint,
  ...props
}: InputProps) {
  const effectiveState = error ? 'error' : state;

  return (
    <View className="gap-1.5">
      {label && (
        <Text variant="caption" className="text-text-secondary dark:text-text-secondary">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(inputVariants({ variant, state: effectiveState }), className)}
        placeholderTextColor="#6B6B6B"
        {...props}
      />
      {error && (
        <Text variant="caption" className="text-error">
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text variant="caption" className="text-text-muted">
          {hint}
        </Text>
      )}
    </View>
  );
}
