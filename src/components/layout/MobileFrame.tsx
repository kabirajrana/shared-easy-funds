import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[var(--color-bg)] shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_24px_80px_rgba(15,110,86,0.08)] sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[32px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
