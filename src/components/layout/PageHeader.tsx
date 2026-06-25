import { useNavigate } from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  rightSlot,
  className,
  back = true,
}: {
  title: string;
  rightSlot?: ReactNode;
  className?: string;
  back?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <header className={cn("flex items-center gap-3 px-4 py-4", className)}>
      {back ? (
        <button
          type="button"
          onClick={() => navigate({ to: ".." })}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--saj-border)] bg-white text-[var(--saj-text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition active:scale-95"
          aria-label="Go back"
        >
          <IconArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--saj-green)]" />
      )}
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--saj-text)]">
        {title}
      </h1>
      {rightSlot}
    </header>
  );
}
