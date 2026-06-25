import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[24px] text-sm font-semibold cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-[0.98] active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--saj-green)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[var(--saj-green)]/95",
        primary: "bg-[var(--saj-green)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[var(--saj-green)]/95",
        secondary:
          "border border-[var(--saj-border)] bg-white text-[var(--saj-text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[var(--saj-bg)]",
        danger: "bg-[var(--saj-red)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        destructive: "bg-[var(--saj-red)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        outline:
          "border border-[var(--saj-border)] bg-white text-[var(--saj-text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[var(--saj-bg)]",
        ghost: "hover:bg-black/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[8px] px-3 text-xs",
        lg: "h-12 rounded-[24px] px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
