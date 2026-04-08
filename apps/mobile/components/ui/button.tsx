import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-md active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-plasma active:bg-plasma-dim',
        secondary: 'bg-violet active:bg-violet-dim',
        outline: 'border border-elevated bg-transparent active:bg-elevated',
        ghost: 'bg-transparent active:bg-elevated',
        destructive: 'bg-error active:bg-error/80',
      },
      size: {
        sm: 'px-3 py-1.5',
        md: 'px-4 py-2.5',
        lg: 'px-6 py-3.5',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const buttonTextVariants = cva('font-satoshi-medium', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-white',
      outline: 'text-text-primary dark:text-text-primary',
      ghost: 'text-text-primary dark:text-text-primary',
      destructive: 'text-white',
    },
    size: {
      sm: 'text-[13px]',
      md: 'text-[15px]',
      lg: 'text-[17px]',
      icon: 'text-[15px]',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface ButtonProps
  extends Omit<PressableProps, 'style'>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  style?: ViewStyle;
}

export function Button({
  variant,
  size,
  className,
  textClassName,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        buttonVariants({ variant, size }),
        disabled && 'opacity-50',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text
          className={cn(buttonTextVariants({ variant, size }), textClassName)}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
