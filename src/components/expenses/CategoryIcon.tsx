import {
  IconBus,
  IconHeart,
  IconHome,
  IconShoppingBag,
  IconToolsKitchen2,
  IconDotsCircleHorizontal,
  IconBolt,
} from "@tabler/icons-react";
import type { ExpenseCategory } from "@/types";

const iconMap = {
  food: IconToolsKitchen2,
  transport: IconBus,
  rent: IconHome,
  utilities: IconBolt,
  entertainment: IconShoppingBag,
  groceries: IconShoppingBag,
  shopping: IconShoppingBag,
  health: IconHeart,
  other: IconDotsCircleHorizontal,
} as const;

export function CategoryIcon({
  category,
  className,
}: {
  category: ExpenseCategory;
  className?: string;
}) {
  const Icon = iconMap[category];
  return <Icon className={className ?? "h-4 w-4"} />;
}
