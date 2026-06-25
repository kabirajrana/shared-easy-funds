import type { ReactNode } from "react";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";

export function App({ children }: { children: ReactNode }) {
  return (
    <MobileFrame>
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </MobileFrame>
  );
}

