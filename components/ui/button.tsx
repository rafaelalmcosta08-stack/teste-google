import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline:
          'border border-border bg-background hover:bg-muted hover:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-muted hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 px-4 py-2 gap-1.5',
        xs: "h-6 rounded px-2 text-xs gap-1",
        sm: "h-8 rounded px-3 text-xs gap-1",
        lg: 'h-12 rounded px-8 text-base gap-1.5',
        icon: 'size-10',
        'icon-xs':
          "size-6 rounded",
        'icon-sm':
          'size-8 rounded',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const isLiquidGlass = variant === 'default' || variant === 'secondary' || variant === 'outline' || variant === 'destructive';

    if (isLiquidGlass) {
      const sizeClasses = {
        default: 'h-10 text-sm',
        xs: 'h-6 text-[0.8rem]',
        sm: 'h-8 text-xs',
        lg: 'h-12 text-sm',
        icon: 'size-10',
        'icon-xs': 'size-6',
        'icon-sm': 'size-8',
        'icon-lg': 'size-12',
      }[size as string] || 'h-10 text-sm';

      const shadowClass = 
        variant === 'destructive' ? 'shadow-lg shadow-red-600/30' :
        variant === 'secondary' ? 'shadow-md shadow-indigo-950/20' :
        variant === 'outline' ? 'shadow-sm hover:shadow-indigo-600/10' :
        'shadow-lg shadow-indigo-600/30';

      const bgClass = variant === 'default' ? 'bg-indigo-600 hover:bg-indigo-500 font-bold' : '';

      const paddingClass = 
        size === 'icon' || size === 'icon-xs' || size === 'icon-sm' || size === 'icon-lg' ? 'px-0' :
        size === 'xs' ? 'px-2' :
        size === 'sm' ? 'px-3' :
        size === 'lg' ? 'px-8' : 'px-4';

      return (
        <button
          ref={ref}
          className={cn(
            "liquid-glass-btn rounded-lg inline-flex items-center justify-center p-[1.5px] outline-none transition-all disabled:pointer-events-none disabled:opacity-50",
            sizeClasses,
            shadowClass,
            bgClass,
            className
          )}
          {...props}
        >
          <div className={cn("liquid-glass-inner rounded-lg w-full h-full flex items-center justify-center gap-1.5 text-white", paddingClass)}>
            {children}
          </div>
        </button>
      )
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
