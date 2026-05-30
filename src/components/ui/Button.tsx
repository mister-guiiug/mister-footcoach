import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-hover shadow-sm',
  secondary:
    'border border-border-ui bg-surface text-fg hover:bg-surface-muted active:bg-surface-muted',
  ghost: 'text-fg hover:bg-surface-muted active:bg-surface-muted',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-700 shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
