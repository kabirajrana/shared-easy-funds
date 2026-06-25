import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

const categories: { value: Category; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "rent", label: "Rent" },
  { value: "shopping", label: "Shopping" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];

export function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (value: Category) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {categories.map((category) => {
        const active = category.value === value;
        return (
          <button
            key={category.value}
            type="button"
            onClick={() => onChange(category.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-transparent bg-[var(--color-primary)] text-white shadow-[var(--shadow-pop)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-text)]",
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
