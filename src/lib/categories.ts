import {
  IconToolsKitchen2,
  IconBus,
  IconHome,
  IconShoppingBag,
  IconHeartbeat,
  IconDotsCircleHorizontal,
  IconArrowDown,
} from "@tabler/icons-react";

export const CATEGORY_CONFIG = {
  food: { label: "Food", icon: IconToolsKitchen2, color: "#0F6E56", bg: "#E1F5EE" },
  groceries: { label: "Groceries", icon: IconShoppingBag, color: "#0F6E56", bg: "#E1F5EE" },
  transport: { label: "Transport", icon: IconBus, color: "#BA7517", bg: "#FAEEDA" },
  rent: { label: "Rent", icon: IconHome, color: "#534AB7", bg: "#EEEDFE" },
  utilities: { label: "Utilities", icon: IconToolsKitchen2, color: "#185FA5", bg: "#E6F1FB" },
  entertainment: { label: "Entertainment", icon: IconShoppingBag, color: "#E24B4A", bg: "#FCEBEB" },
  shopping: { label: "Shopping", icon: IconShoppingBag, color: "#E24B4A", bg: "#FCEBEB" },
  health: { label: "Health", icon: IconHeartbeat, color: "#185FA5", bg: "#E6F1FB" },
  other: {
    label: "Other",
    icon: IconDotsCircleHorizontal,
    color: "#888780",
    bg: "#F1EFE8",
  },
  income: { label: "Income", icon: IconArrowDown, color: "#1D9E75", bg: "#EAF3DE" },
} as const;

export type CategoryKey = keyof typeof CATEGORY_CONFIG;
