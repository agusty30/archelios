import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/my-wallet")({
  beforeLoad: () => { throw redirect({ to: "/app/wallet" }); },
  component: () => null,
});
