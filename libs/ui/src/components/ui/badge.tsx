import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default:
          'border-primary/25 bg-primary/10 text-primary dark:text-amber-200 hover:bg-primary/20',
        secondary:
          'border-border bg-secondary/80 text-secondary-foreground hover:bg-secondary',
        destructive:
          'border-destructive/25 bg-destructive/10 text-destructive dark:text-red-300 hover:bg-destructive/20',
        success:
          'border-success/25 bg-success/10 text-success dark:text-emerald-300 hover:bg-success/20',
        warning:
          'border-warning/25 bg-warning/10 text-amber-700 dark:text-amber-300 hover:bg-warning/20',
        outline:
          'border-border bg-background text-foreground hover:bg-accent/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
