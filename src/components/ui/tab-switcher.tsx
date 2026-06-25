import { cn } from "@/lib/utils";

export function TabSwitcher({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 rounded-full bg-black/5 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              active ? "bg-white text-[var(--color-text)] shadow-sm" : "text-[var(--color-muted)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
