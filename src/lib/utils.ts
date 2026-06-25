import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrency } from "@/utils/formatCurrency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNPR = formatCurrency;

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function createDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, clampDay(year, monthIndex, day));
}

export function getMonthlyCycleRange(targetDayOfMonth: number, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentMonthTarget = createDate(year, month, targetDayOfMonth);

  const start =
    referenceDate.getDate() >= currentMonthTarget.getDate()
      ? currentMonthTarget
      : createDate(year, month - 1, targetDayOfMonth);

  const end = createDate(start.getFullYear(), start.getMonth() + 1, targetDayOfMonth);

  return { start, end };
}

export function formatMonthDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMonthlyCycle(targetDayOfMonth?: number, referenceDate = new Date()): string {
  if (!targetDayOfMonth) return "No cycle set";
  const { start, end } = getMonthlyCycleRange(targetDayOfMonth, referenceDate);
  return `${formatMonthDay(start)} → ${formatMonthDay(end)}`;
}
