import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { SessionProvider } from "@/lib/session";
import { Toaster } from "@/components/ui/sonner";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { applyTheme, getInitialTheme } from "@/lib/theme";
import { useEffect } from "react";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <p className="text-[14px] font-medium text-[var(--saj-text)]">Page not found</p>
        <p className="mt-1 text-[12px] text-[var(--saj-muted)]">The route you opened is not available.</p>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Sajha — Shared fund tracker" },
      { name: "description", content: "Track shared expenses and contributions for flatmates, families, and friend groups." },
      { name: "theme-color", content: "#1B4D3E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FlatTrack" },
      { property: "og:title", content: "Sajha — Shared fund tracker" },
      { name: "twitter:title", content: "Sajha — Shared fund tracker" },
      { property: "og:description", content: "Track shared expenses and contributions for flatmates, families, and friend groups." },
      { name: "twitter:description", content: "Track shared expenses and contributions for flatmates, families, and friend groups." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4e225142-33c4-4811-842d-51e31fdcda77/id-preview-2717ebb8--17c27da5-99cf-4997-b1d5-e1c1284ec7ac.lovable.app-1781418594309.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4e225142-33c4-4811-842d-51e31fdcda77/id-preview-2717ebb8--17c27da5-99cf-4997-b1d5-e1c1284ec7ac.lovable.app-1781418594309.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "icon", href: "/icons/icon-192.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MobileFrame>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
          <BottomNav />
        </MobileFrame>
        <Toaster position="top-center" />
      </SessionProvider>
    </QueryClientProvider>
  );
}
