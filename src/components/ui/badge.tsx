import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[var(--saj-green)] text-white",
        even: "bg-[#f2f2ef] text-[#2c2c2a]",
        owed: "bg-[var(--saj-green)] text-white",
        settled: "bg-transparent px-0 text-[var(--saj-green)]",
        success: "bg-[var(--saj-green)] text-white",
        warning: "bg-[var(--saj-amber)] text-white",
        danger: "bg-[var(--saj-red)] text-white",
        info: "bg-[#f2f2ef] text-[#2c2c2a]",
        neutral: "bg-[#f2f2ef] text-[#2c2c2a]",
        secondary: "bg-[#f2f2ef] text-[#2c2c2a]",
        destructive: "bg-[var(--saj-red)] text-white",
        outline: "border border-[var(--saj-border)] bg-transparent text-[var(--saj-text)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
