import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/group")({
  beforeLoad: () => {
    throw redirect({ to: "/groups" });
  },
});

