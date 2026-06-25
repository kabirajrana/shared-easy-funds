import type { ReactNode } from "react";

export function CategoryCard({
  icon,
  iconBg,
  iconColor,
  label,
  amount,
  barWidth,
  barColor,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  amount: string;
  barWidth: number;
  barColor: string;
}) {
  return (
    <div className="rounded-[var(--saj-radius-md)] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-3">
      <div
        className="mb-2 flex h-8 w-8 items-center justify-center rounded-[8px]"
        style={{ background: iconBg, color: iconColor }}
      >
        <span className="text-[18px] leading-none">{icon}</span>
      </div>
      <div className="text-[12px] text-[var(--saj-muted)]">{label}</div>
      <div className="text-[15px] font-medium text-[var(--saj-text)]">{amount}</div>
      <div className="mt-[6px] h-[3px] overflow-hidden rounded-[2px] bg-[#eee]">
        <div
          className="h-full rounded-[2px]"
          style={{ width: `${barWidth}%`, background: barColor, height: "100%" }}
        />
      </div>
    </div>
  );
}
